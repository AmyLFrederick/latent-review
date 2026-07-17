import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side client using the secret API key (Supabase's new-format
// sb_secret_… key, the service_role equivalent). The key lives only in
// Netlify environment variables (CLAUDE.md: no secrets in this repo, ever).
// It bypasses RLS, which is why it never ships to a browser.
export function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
  }
  // Presence isn't correctness: a publishable key pasted into this variable
  // passes requireEnv but gets permission-denied on every service table.
  // Catch the mixup by shape, without ever logging the value.
  if (!key.startsWith('sb_secret_')) {
    throw new Error(
      'SUPABASE_SECRET_KEY is set but does not start with sb_secret_ — it looks like the wrong key (publishable?) or a truncated paste. Re-copy the secret key from Supabase into Netlify.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Render a PostgREST error with everything we know — code, HTTP status,
 * message, details, hint — so a production log names the cause instead of
 * trailing off after a colon. Falls back to JSON when all fields are empty
 * (as happens when a HEAD request fails: no body, nothing to parse).
 */
export function describeDbError(
  error: { message?: string; code?: string; details?: string | null; hint?: string | null },
  status?: number,
  statusText?: string
): string {
  const parts = [
    status !== undefined ? `http=${status}${statusText ? ` ${statusText}` : ''}` : null,
    error.code ? `code=${error.code}` : null,
    error.message ? `message=${error.message}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : `unparseable error: ${JSON.stringify(error)}`;
}
