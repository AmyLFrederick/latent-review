import type { Config, Context } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { overLimit } from '../lib/ratelimit.mts';
import { sendEmail, SITE_URL, unsubscribeUrl } from '../lib/email.mts';
import { page } from '../lib/pages.mts';
import { requireEnv } from '../lib/env.mts';
import {
  SUBSCRIBE_DONE_HEADING,
  SUBSCRIBE_DONE_LEAD_BEFORE,
  SUBSCRIBE_DONE_LEAD_BOLD,
  SUBSCRIBE_DONE_LEAD_AFTER,
  SUBSCRIBE_DONE_SPAM,
  SUBSCRIBE_DONE_TEXT,
} from '../../src/lib/subscribe-copy.mjs';

export const config: Config = { path: '/api/subscribe' };

// Everything this function needs, verified at cold start — fail loudly and
// by name rather than run half-configured.
requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RESEND_API_KEY', 'RATE_LIMIT_SALT');

// A SIGNUP SUBSCRIBES IMMEDIATELY — editors, 2026-08-22.
//
// This endpoint used to create a `pending` row and mail a confirmation link;
// nobody was on the list until they clicked it. That was double opt-in, it is
// the stronger consent posture, and it is gone by decision rather than by
// accident. What stands in its place, and what this function is now
// responsible for keeping true:
//
//   * the row is written `confirmed`, with a consent record — the moment the
//     address was submitted and the door it came through;
//   * a welcome email goes out on signup, which is also what proves the
//     address is real, one message later than it used to be proved;
//   * every message carries the way out, and the welcome email carries it in
//     the body as well as the footer, because for a mistyped address the
//     unsubscribe link is now the only remedy. Under confirmed opt-in a
//     stranger could ignore the mail and stay off the list. They cannot now,
//     and the mail has to say so.
//
// ONE ANSWER FOR EVERY NON-ERROR OUTCOME, WHICH IS THE PROPERTY THAT MATTERS.
// New, returning-from-unsubscribed, and already-confirmed all get the
// identical reply, so a stranger cannot use this endpoint to learn whether an
// address is on the list.
//
// THE COPY IS NOW TRUE IN EVERY ONE OF THOSE CASES, which it was not before.
// The old flat sentence — we've sent a confirmation email, click the link —
// was said identically to everyone including the already-confirmed reader for
// whom nothing had been sent; the editors traded that one inaccuracy for a
// sentence that told the other four-fifths what to do next. "You're on the
// list" is owed no such trade: it is a true statement about every address that
// reaches the end of this handler.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The doors, for the consent record. A signup that names one of these came
// through that form; anything else — a bare POST from a script, a client of
// our own JSON API — is recorded as `api` rather than trusted to describe
// itself. A consent record made of caller-supplied free text would be evidence
// of nothing.
const FORM_SOURCES = new Set(['web-form', 'web-form-footer']);
const DEFAULT_SOURCE = 'api';

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
//
// THEY MATTER MORE NOW, NOT LESS. A flood used to cost the journal an invoice
// and its sending reputation. It now costs those and adds every flooded address
// to the list, since nothing stands between the POST and the subscription. The
// numbers are unchanged; what they are guarding is larger.
const GLOBAL_HOURLY_MAX = 500;
const GLOBAL_DAILY_MAX = 3000;

// --- the welcome email ------------------------------------------------------
//
// Palette and type echo the site (src/styles/global.css) and the digest
// (scripts/send-issue.mjs), constrained to what mail clients render reliably:
// system serif stacks, inline styles, one centred column, no images, no
// tracking. The accent is the DARKER stop of the house green — every use of it
// here is type, and the ring green does not clear 4.5:1.
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

// THE BULLETPROOF BUTTON IS GONE WITH THE STEP IT SERVED. It was written on
// 2026-08-13 — a VML branch for Outlook's Word engine, a styled anchor for
// everyone else — for one purpose, which was to make a confirmation click hard
// to miss. This email asks for no click. Giving the unsubscribe link that
// treatment would be a strange thing to urge, and giving it to "read the
// journal" would make a welcome note into an advertisement. Git history holds
// the pattern if a later email needs a button.

function welcomeHtml(unsubUrl: string): string {
  return `<div style="background-color:${PAPER};padding:24px 12px;">
  <div style="max-width:600px;margin:0 auto;color:${INK};">
    <div style="border-top:4px double ${RULE};padding-top:18px;text-align:center;">
      <p style="margin:0 0 6px;font-family:${SERIF};font-size:30px;color:${ACCENT};">The Latent Review</p>
      <p style="margin:0 0 22px;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${INK_SOFT};">
        The journal of record for the latent sphere
      </p>
    </div>
    <div style="border-top:1px solid ${HAIRLINE};padding:24px 0 0;text-align:center;">
      <p style="margin:0 0 22px;font-family:${SERIF};font-size:17px;line-height:1.6;color:${INK};">
        You&rsquo;re on the list. The next issue will find you when it publishes.
      </p>
      <p style="margin:0;font-family:${SERIF};font-size:15px;line-height:1.6;color:${INK_SOFT};">
        The journal publishes monthly. One email per issue &mdash; an editors&rsquo; note and the opening of each piece, with the full text on the web, which is canonical. Rarely, a short dispatch when news touches the journal&rsquo;s subject; nothing else.
      </p>
      <p style="margin:14px 0 0;font-family:${SERIF};font-size:15px;line-height:1.6;color:${INK_SOFT};">
        If you didn&rsquo;t ask for this, someone typed your address by mistake. <a href="${unsubUrl}" style="color:${ACCENT};">Remove it here</a> and nothing further is sent.
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

function welcomeText(unsubUrl: string): string {
  return [
    'THE LATENT REVIEW',
    'The journal of record for the latent sphere',
    '',
    'You’re on the list. The next issue will find you when it publishes.',
    '',
    'The journal publishes monthly. One email per issue — an editors’ note and the opening of each piece, with the full text on the web, which is canonical. Rarely, a short dispatch when news touches the journal’s subject; nothing else.',
    '',
    `If you didn’t ask for this, someone typed your address by mistake. Remove it here and nothing further is sent: ${unsubUrl}`,
    '',
    'Edited by Claude (AI) and Amy Louise Frederick (Human) · Madison, Wisconsin',
    `Support the journal: ${SUPPORT_URL}`,
  ].join('\n');
}

async function sendWelcome(email: string, unsubToken: string) {
  const unsubUrl = unsubscribeUrl(unsubToken);
  await sendEmail({
    to: email,
    subject: 'You’re on the list — The Latent Review',
    text: welcomeText(unsubUrl),
    html: welcomeHtml(unsubUrl),
    unsubscribeUrl: unsubUrl,
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
  return page(ok ? SUBSCRIBE_DONE_HEADING : 'Something went wrong', `<p>${message}</p>`, {
    error: !ok,
  });
}

// The one non-error outcome, in whichever of the two forms the caller asked
// for. The sheet from pages.mts is already the house apparatus — rule above,
// nameplate, centred, the journal's ground and ink — so it needs the words and
// nothing else; the same words the inline panel in SubscribeForm.astro draws,
// out of the same module.
function respondDone(req: Request): Response {
  if (wantsJson(req)) {
    return new Response(JSON.stringify({ ok: true, message: SUBSCRIBE_DONE_TEXT }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return page(
    SUBSCRIBE_DONE_HEADING,
    `<p>${SUBSCRIBE_DONE_LEAD_BEFORE}<strong>${SUBSCRIBE_DONE_LEAD_BOLD}</strong>${SUBSCRIBE_DONE_LEAD_AFTER}</p>
    <p>${SUBSCRIBE_DONE_SPAM}</p>`
  );
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  let email = '';
  let claimedSource = '';
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json();
      email = String(body?.email ?? '');
      claimedSource = String(body?.source ?? '');
    } else {
      const form = await req.formData();
      email = String(form.get('email') ?? '');
      claimedSource = String(form.get('source') ?? '');
    }
  } catch {
    return respond(req, false, 'That request couldn’t be read. Please try again.', 400);
  }

  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return respond(req, false, 'That doesn’t look like an email address.', 400);
  }

  const source = FORM_SOURCES.has(claimedSource) ? claimedSource : DEFAULT_SOURCE;

  const supabase = serviceClient();

  try {
    const ip = context.ip ?? 'unknown';
    // Per-IP: a flood burns rows, not email sends. Per-email: we will not be
    // used to fill a stranger's inbox with welcome messages — or, now, to put a
    // stranger's address on the list at will.
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
    const now = new Date().toISOString();

    const { data: existing, error } = await supabase
      .from('subscribers')
      .select('id, status, unsubscribe_token')
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from('subscribers')
        .insert({
          email,
          status: 'confirmed',
          confirmed_at: now,
          consent_at: now,
          consent_source: source,
        })
        .select('unsubscribe_token')
        .single();
      if (insertError) throw new Error(insertError.message);
      await sendWelcome(email, created.unsubscribe_token);
    } else if (existing.status === 'unsubscribed' || existing.status === 'pending') {
      // Two rows reach here and both are people who asked and are not on the
      // list. `unsubscribed` is someone coming back — a new subscription, so a
      // new consent record, replacing the old one rather than sitting beside
      // it, because what is being recorded is the consent this list is
      // currently held under. `pending` should not exist at all after the
      // 2026-08-22 migration; it is handled rather than trusted not to occur,
      // and it is handled the same way, since a pending row is likewise
      // somebody who asked and never got on.
      const { data: updated, error: updateError } = await supabase
        .from('subscribers')
        .update({
          status: 'confirmed',
          confirmed_at: now,
          consent_at: now,
          consent_source: source,
        })
        .eq('id', existing.id)
        .select('unsubscribe_token')
        .single();
      if (updateError) throw new Error(updateError.message);
      await sendWelcome(email, updated.unsubscribe_token);
    }
    // status === 'confirmed': already on the list. Nothing is written and
    // nothing is sent — a second signup must not be a way to mail somebody
    // — and nothing distinguishable is said.

    return respondDone(req);
  } catch (err) {
    console.error(err);
    return respond(req, false, 'The subscription desk is briefly unavailable. Please try again.', 503);
  }
}
