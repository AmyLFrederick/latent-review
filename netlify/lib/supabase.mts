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
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
