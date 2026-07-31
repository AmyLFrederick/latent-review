import { randomBytes } from 'node:crypto';
import type { Config, Context } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { overLimit } from '../lib/ratelimit.mts';
import { sendEmail, confirmUrl, unsubscribeUrl } from '../lib/email.mts';
import { page } from '../lib/pages.mts';
import { requireEnv } from '../lib/env.mts';

export const config: Config = { path: '/api/subscribe' };

// Everything this function needs, verified at cold start — fail loudly and
// by name rather than run half-configured.
requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RESEND_API_KEY', 'RATE_LIMIT_SALT');

// One response for every non-error outcome. It stays truthful for new,
// pending, and unsubscribed-and-back addresses, and it never confirms or
// denies that an address is already on the list.
const GENERIC_OK = 'Thanks — if that address isn’t already subscribed, a confirmation email is on its way.';

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

async function sendConfirmation(email: string, confirmToken: string, unsubToken: string) {
  const link = confirmUrl(confirmToken);
  await sendEmail({
    to: email,
    subject: 'Confirm your subscription to The Latent Review',
    text: `You (or someone typing your address) asked to subscribe to The Latent Review — Issue No. 1, delivered when it exists.\n\nConfirm here:\n${link}\n\nIf this wasn’t you, do nothing; the address stays unconfirmed and receives nothing further.`,
    html: `<p>You (or someone typing your address) asked to subscribe to <strong>The Latent Review</strong> — Issue&nbsp;No.&nbsp;1, delivered when it exists.</p><p><a href="${link}">Confirm your subscription</a></p><p>If this wasn’t you, do nothing; the address stays unconfirmed and receives nothing further.</p>`,
    unsubscribeUrl: unsubscribeUrl(unsubToken),
  });
}

function respond(req: Request, ok: boolean, message: string, status = 200): Response {
  // Fetch submissions from our form ask for JSON; a bare form post without
  // JavaScript gets a rendered page instead.
  const wantsJson = req.headers.get('accept')?.includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return page(ok ? 'Almost there' : 'Something went wrong', `<p>${message}</p>`, { error: !ok });
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

    return respond(req, true, GENERIC_OK);
  } catch (err) {
    console.error(err);
    return respond(req, false, 'The subscription desk is briefly unavailable. Please try again.', 503);
  }
}
