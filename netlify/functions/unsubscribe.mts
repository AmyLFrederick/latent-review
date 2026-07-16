import type { Config } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { page, actionPage } from '../lib/pages.mts';
import { requireEnv } from '../lib/env.mts';

export const config: Config = { path: '/api/unsubscribe' };

// Verified at cold start — fail loudly and by name, never run half-configured.
requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY');

// Same GET-shows / POST-mutates pattern as confirm (GET never mutates).
// The unsubscribe token is stable for the life of the row, so this link
// works from any email we have ever sent.

// A function, not a const: a Response body can be sent once, and a warm
// function instance may serve this outcome more than once.
const invalid = () =>
  page(
    'That link isn’t valid',
    '<p>This unsubscribe link doesn’t match any subscription. If you keep receiving mail you don’t want, write to the editors and a human will fix it.</p>',
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
      .eq('unsubscribe_token', token)
      .maybeSingle();
    if (error) {
      console.error(error.message);
      return page('Briefly unavailable', '<p>Please try this link again in a moment.</p>', { error: true });
    }
    if (!sub) return invalid();

    if (sub.status === 'unsubscribed') {
      return page('Already unsubscribed', '<p>This address is already off the list and receives nothing further.</p>');
    }
    return actionPage(
      'Leave the list?',
      'One press and this address receives nothing further from The Latent Review. No guilt, no “are you sure,” no survey.',
      '/api/unsubscribe',
      token,
      'Unsubscribe'
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
      .update({ status: 'unsubscribed' })
      .eq('unsubscribe_token', token)
      .neq('status', 'unsubscribed')
      .select('id')
      .maybeSingle();
    if (error) {
      console.error(error.message);
      return page('Briefly unavailable', '<p>Please try again in a moment.</p>', { error: true });
    }

    if (!updated) {
      const { data: sub } = await supabase
        .from('subscribers')
        .select('status')
        .eq('unsubscribe_token', token)
        .maybeSingle();
      if (sub?.status === 'unsubscribed') {
        return page('Unsubscribed', '<p>Done — this address receives nothing further.</p>');
      }
      return invalid();
    }

    return page('Unsubscribed', '<p>Done — this address receives nothing further. The record of your consent choices stays put, so this link keeps working.</p>');
  }

  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST' } });
}
