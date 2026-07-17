import type { Config } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { page, actionPage } from '../lib/pages.mts';
import { requireEnv } from '../lib/env.mts';

export const config: Config = { path: '/api/confirm' };

// Verified at cold start — fail loudly and by name, never run half-configured.
requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY');

// GET never mutates (house rule): the emailed link renders a page whose
// button POSTs the token back here. Mail scanners that prefetch links
// therefore cannot confirm a subscription on the reader's behalf.

// A function, not a const: a Response body can be sent once, and a warm
// function instance may serve this outcome more than once.
const invalid = () =>
  page(
    'That link isn’t valid',
    '<p>This confirmation link doesn’t match any pending subscription. It may have already been used, or a newer confirmation link may have replaced it.</p>',
    { error: true }
  );

export default async function handler(req: Request): Promise<Response> {
  const supabase = serviceClient();

  if (req.method === 'GET') {
    const token = new URL(req.url).searchParams.get('token') ?? '';
    if (!/^[a-f0-9]{64}$/.test(token)) return invalid();

    const { data: sub, error } = await supabase
      .from('subscribers')
      .select('status')
      .eq('confirm_token', token)
      .maybeSingle();
    if (error) {
      console.error(error.message);
      return page('Briefly unavailable', '<p>Please try this link again in a moment.</p>', { error: true });
    }
    if (!sub) return invalid();

    if (sub.status === 'confirmed') {
      return page('Already confirmed', '<p>This subscription is already confirmed. Issue No. 1 will find you when it exists.</p>');
    }
    if (sub.status === 'unsubscribed') {
      return page('This address unsubscribed', '<p>This address has since unsubscribed. To come back, sign up again at the journal and a fresh confirmation will be sent.</p>');
    }
    return actionPage(
      'One press to confirm',
      'Confirm this address for The Latent Review — Issue No. 1, delivered when it exists. Confirmed opt-in, no tracking, unsubscribe anytime.',
      '/api/confirm',
      token,
      'Confirm subscription'
    );
  }

  if (req.method === 'POST') {
    let token = '';
    try {
      token = String((await req.formData()).get('token') ?? '');
    } catch {
      return invalid();
    }
    if (!/^[a-f0-9]{64}$/.test(token)) return invalid();

    const { data: updated, error } = await supabase
      .from('subscribers')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('confirm_token', token)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (error) {
      console.error(error.message);
      return page('Briefly unavailable', '<p>Please try again in a moment.</p>', { error: true });
    }

    if (!updated) {
      // Nothing was pending under this token — either already confirmed
      // (fine, idempotent) or invalid/unsubscribed.
      const { data: sub } = await supabase
        .from('subscribers')
        .select('status')
        .eq('confirm_token', token)
        .maybeSingle();
      if (sub?.status === 'confirmed') {
        return page('Confirmed', '<p>You’re on the list. Issue No. 1 will find you when it exists.</p>');
      }
      return invalid();
    }

    return page('Confirmed', '<p>You’re on the list. Issue No. 1 will find you when it exists — no tracking, unsubscribe anytime, and every email we send carries the way out.</p>');
  }

  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST' } });
}
