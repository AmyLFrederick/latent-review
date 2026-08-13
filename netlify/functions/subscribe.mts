import { randomBytes } from 'node:crypto';
import type { Config, Context } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { overLimit } from '../lib/ratelimit.mts';
import { sendEmail, SITE_URL, confirmUrl, unsubscribeUrl } from '../lib/email.mts';
import { page } from '../lib/pages.mts';
import { requireEnv } from '../lib/env.mts';
import {
  SUBSCRIBE_PENDING_HEADING,
  SUBSCRIBE_PENDING_LEAD_BEFORE,
  SUBSCRIBE_PENDING_LEAD_BOLD,
  SUBSCRIBE_PENDING_LEAD_AFTER,
  SUBSCRIBE_PENDING_SPAM,
  SUBSCRIBE_PENDING_TEXT,
} from '../../src/lib/subscribe-copy.mjs';

export const config: Config = { path: '/api/subscribe' };

// Everything this function needs, verified at cold start — fail loudly and
// by name rather than run half-configured.
requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RESEND_API_KEY', 'RATE_LIMIT_SALT');

// ONE ANSWER FOR EVERY NON-ERROR OUTCOME, WHICH IS THE PROPERTY THAT MATTERS.
// New, pending, unsubscribed-and-back, and already-confirmed all get the
// identical reply, so a stranger cannot use this endpoint to learn whether an
// address is on the list.
//
// THE WORDING CHANGED ON 2026-08-13 AND THE PROPERTY DID NOT. It used to hedge
// — "if that address isn't already subscribed, a confirmation email is on its
// way" — which protected against enumeration by being vague with everyone.
// The new copy is flat: we've sent a confirmation email, click the link. It is
// still said to everyone identically, so there is still no oracle; what it
// gives up is literal accuracy in the one case where nothing was sent, to an
// already-confirmed reader who will find no new mail. The editors traded that
// for a sentence that tells the other four-fifths of readers what they have to
// do next, because the desk was losing them at exactly that step.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GLOBAL CEILINGS ON A BILLABLE, ANONYMOUS PATH. Ruled by the editors 2026-07-31
// after the cost-exposure audit (docs/SCRATCH-COST-EXPOSURE-2026-07-31.md).
//
// The per-IP and per-address limits below are not ceilings. Per-IP bounds one
// abuser's machine; per-address protects one stranger's inbox. Neither bounds
// the TOTAL, so the real limit was 5 × (however many source IPs someone rents)
// per hour — and every one of those is a billable Resend send to an address the
// requester chose. Nothing in this repository capped it.
//
// The invoice was never the worst of it. Those are real messages leaving
// mail.thelatentreview.com to third parties, and because the per-address cap
// spreads the flood rather than concentrating it, the damage lands on the
// sending domain's reputation — which is what the first issue's digest depends
// on, with DMARC still at p=none.
//
// THESE ARE CIRCUIT BREAKERS, NOT THROTTLES. They sit far above any rate the
// confirmed list will legitimately reach, so tripping one means something is
// wrong rather than that the journal got popular. The cost of that choice is
// stated rather than hidden: a global cap trades an unbounded bill for a bounded
// availability failure, and while a breaker is tripped, honest signups are
// refused too. The editors set these numbers for launch-week headroom knowing
// that.
const GLOBAL_HOURLY_MAX = 500;
const GLOBAL_DAILY_MAX = 3000;

// --- the confirmation email -------------------------------------------------
//
// Palette and type echo the site (src/styles/global.css) and the digest
// (scripts/send-issue.mjs), constrained to what mail clients render reliably:
// system serif stacks, inline styles, one centred column, no images, no
// tracking. The accent is the DARKER stop of the house green — every use of it
// here is type or a filled button, and the ring green does not clear 4.5:1.
const INK = '#1b1813';
// Darker than the site's --ink-soft, and deliberately so — see the same
// constant in scripts/send-issue.mjs for the reasoning and the measurements.
// #6b6355 is 5.40:1 on this ground; #413b33 is 10.08:1. Both emails moved
// together on 2026-08-13, because they share a ground and a problem.
const INK_SOFT = '#413b33';
const ACCENT = '#3e743f';
const PAPER = '#faf3ef';
const HAIRLINE = '#e0d8c6';
const RULE = '#2a251c';
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', Courier, monospace";

const SUPPORT_URL = `${SITE_URL}/supporters/`;
const BUTTON_LABEL = 'Confirm subscription';

/**
 * The confirm button, in the bulletproof pattern.
 *
 * THERE WAS NO BULLETPROOF BUTTON HERE BEFORE 2026-08-13 — the confirmation
 * email carried a bare `<a>` link, which is why this comment exists rather
 * than a pointer to an older one. Outlook's Word rendering engine ignores
 * padding and background on an anchor, so the VML branch draws a real filled
 * rectangle there and every other client gets the anchor with a line-height
 * the height of the button. Both branches are the same colour, the same
 * label, and the same href.
 */
function confirmButton(link: string): string {
  return `
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${link}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="0%" strokecolor="${ACCENT}" fillcolor="${ACCENT}">
        <w:anchorlock/>
        <center style="color:${PAPER};font-family:${SERIF};font-size:15px;font-weight:bold;letter-spacing:2px;">${BUTTON_LABEL.toUpperCase()}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${link}" style="background-color:${ACCENT};border:1px solid ${ACCENT};color:${PAPER};display:inline-block;font-family:${SERIF};font-size:15px;font-weight:bold;letter-spacing:2px;line-height:48px;text-align:center;text-decoration:none;text-transform:uppercase;width:280px;-webkit-text-size-adjust:none;">${BUTTON_LABEL}</a>
      <!--<![endif]-->`;
}

// THE BUTTON SITS HIGH AND THE TERMS SIT UNDER IT (editors, 2026-08-13), which
// inverts what this email used to do. The old one explained the subscription
// for a paragraph and then offered a link; a reader who skimmed met prose. The
// one thing this message exists to produce is a click, so the click is above
// everything except the masthead and a single sentence of context, and what a
// reader is agreeing to is stated immediately below where they will already be
// looking.
function confirmationHtml(link: string): string {
  return `<div style="background-color:${PAPER};padding:24px 12px;">
  <div style="max-width:600px;margin:0 auto;color:${INK};">
    <div style="border-top:4px double ${RULE};padding-top:18px;text-align:center;">
      <p style="margin:0 0 6px;font-family:${SERIF};font-size:30px;color:${ACCENT};">The Latent Review</p>
      <p style="margin:0 0 22px;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${INK_SOFT};">
        The journal of record for the latent sphere
      </p>
    </div>
    <div style="border-top:1px solid ${HAIRLINE};padding:24px 0 0;text-align:center;">
      <p style="margin:0 0 24px;font-family:${SERIF};font-size:17px;line-height:1.6;color:${INK};">
        Someone &mdash; we hope you &mdash; asked to receive the next issue and the ones after it. One click and you&rsquo;re on the list.
      </p>
      ${confirmButton(link)}
      <p style="margin:26px 0 0;font-family:${SERIF};font-size:15px;line-height:1.6;color:${INK_SOFT};">
        The journal publishes monthly. One email per issue &mdash; an editors&rsquo; note and the opening of each piece, with the full text on the web, which is canonical. Rarely, a short dispatch when news touches the journal&rsquo;s subject; nothing else.
      </p>
      <p style="margin:14px 0 0;font-family:${SERIF};font-size:15px;line-height:1.6;color:${INK_SOFT};">
        If you didn&rsquo;t ask for this, ignore it and nothing happens.
      </p>
    </div>
    <div style="border-top:1px solid ${HAIRLINE};margin-top:26px;padding-top:18px;text-align:center;">
      <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:1px;color:${INK_SOFT};">
        Edited by Claude (AI) and Amy Louise Frederick (Human) &middot; Madison, Wisconsin
      </p>
      <p style="margin:16px 0 0;font-family:${SERIF};font-size:13px;letter-spacing:2px;text-transform:uppercase;">
        <a href="${SUPPORT_URL}" style="color:${ACCENT};text-decoration:none;">Support the journal</a>
      </p>
    </div>
  </div>
</div>`;
}

function confirmationText(link: string): string {
  return [
    'THE LATENT REVIEW',
    'The journal of record for the latent sphere',
    '',
    'Someone — we hope you — asked to receive the next issue and the ones after it. One click and you’re on the list.',
    '',
    `${BUTTON_LABEL}: ${link}`,
    '',
    'The journal publishes monthly. One email per issue — an editors’ note and the opening of each piece, with the full text on the web, which is canonical. Rarely, a short dispatch when news touches the journal’s subject; nothing else.',
    '',
    'If you didn’t ask for this, ignore it and nothing happens.',
    '',
    'Edited by Claude (AI) and Amy Louise Frederick (Human) · Madison, Wisconsin',
    `Support the journal: ${SUPPORT_URL}`,
  ].join('\n');
}

async function sendConfirmation(email: string, confirmToken: string, unsubToken: string) {
  const link = confirmUrl(confirmToken);
  await sendEmail({
    to: email,
    subject: 'One click to confirm — The Latent Review',
    text: confirmationText(link),
    html: confirmationHtml(link),
    unsubscribeUrl: unsubscribeUrl(unsubToken),
  });
}

function wantsJson(req: Request): boolean {
  // Fetch submissions from our form ask for JSON; a bare form post without
  // JavaScript gets a rendered page instead.
  return req.headers.get('accept')?.includes('application/json') === true;
}

function respond(req: Request, ok: boolean, message: string, status = 200): Response {
  if (wantsJson(req)) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return page(ok ? 'Almost there' : 'Something went wrong', `<p>${message}</p>`, { error: !ok });
}

// The one non-error outcome, in whichever of the two forms the caller asked
// for. The sheet from pages.mts is already the house apparatus — rule above,
// nameplate, centred, the journal's ground and ink — so it needs the words and
// nothing else; the same words the inline panel in SubscribeForm.astro draws,
// out of the same module.
function respondPending(req: Request): Response {
  if (wantsJson(req)) {
    return new Response(JSON.stringify({ ok: true, message: SUBSCRIBE_PENDING_TEXT }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return page(
    SUBSCRIBE_PENDING_HEADING,
    `<p>${SUBSCRIBE_PENDING_LEAD_BEFORE}<strong>${SUBSCRIBE_PENDING_LEAD_BOLD}</strong>${SUBSCRIBE_PENDING_LEAD_AFTER}</p>
    <p>${SUBSCRIBE_PENDING_SPAM}</p>`
  );
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  let email = '';
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      email = String((await req.json())?.email ?? '');
    } else {
      email = String((await req.formData()).get('email') ?? '');
    }
  } catch {
    return respond(req, false, 'That request couldn’t be read. Please try again.', 400);
  }

  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return respond(req, false, 'That doesn’t look like an email address.', 400);
  }

  const supabase = serviceClient();

  try {
    const ip = context.ip ?? 'unknown';
    // Per-IP: a flood burns rows, not email sends. Per-email: we will not be
    // used to fill a stranger's inbox with confirmation requests.
    // The global buckets come LAST, and the ordering is load-bearing rather than
    // stylistic: `||` short-circuits, so a request already refused per-IP or
    // per-address never reaches them and never spends global budget. A flood
    // being turned away by the narrow limits must not also exhaust the ceiling
    // that protects everyone else.
    if (
      (await overLimit(supabase, 'subscribe-ip', ip, 5, 60)) ||
      (await overLimit(supabase, 'subscribe-email', email, 2, 60)) ||
      (await overLimit(supabase, 'subscribe-global', 'global', GLOBAL_HOURLY_MAX, 60)) ||
      (await overLimit(supabase, 'subscribe-global-daily', 'global', GLOBAL_DAILY_MAX, 24 * 60))
    ) {
      return respond(req, false, 'Too many attempts. Please try again later.', 429);
    }
  } catch (err) {
    console.error(err);
    return respond(req, false, 'The subscription desk is briefly unavailable. Please try again.', 503);
  }

  try {
    const { data: existing, error } = await supabase
      .from('subscribers')
      .select('id, status, confirm_token, unsubscribe_token')
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from('subscribers')
        .insert({ email })
        .select('confirm_token, unsubscribe_token')
        .single();
      if (insertError) throw new Error(insertError.message);
      await sendConfirmation(email, created.confirm_token, created.unsubscribe_token);
    } else if (existing.status === 'pending') {
      // Idempotent repeat signup: same row, same token, fresh email.
      await sendConfirmation(email, existing.confirm_token, existing.unsubscribe_token);
    } else if (existing.status === 'unsubscribed') {
      // Coming back requires confirming again, on a fresh token.
      const { data: updated, error: updateError } = await supabase
        .from('subscribers')
        .update({
          status: 'pending',
          confirmed_at: null,
          confirm_token: randomBytes(32).toString('hex'),
        })
        .eq('id', existing.id)
        .select('confirm_token, unsubscribe_token')
        .single();
      if (updateError) throw new Error(updateError.message);
      await sendConfirmation(email, updated.confirm_token, updated.unsubscribe_token);
    }
    // status === 'confirmed': do nothing, say nothing distinguishable.

    return respondPending(req);
  } catch (err) {
    console.error(err);
    return respond(req, false, 'The subscription desk is briefly unavailable. Please try again.', 503);
  }
}
