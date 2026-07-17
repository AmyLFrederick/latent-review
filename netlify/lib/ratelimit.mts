import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describeDbError } from './supabase.mts';

// Sliding-window rate limiter backed by the rate_limit_events table.
// Keys are salted hashes — raw IPs and emails never touch the database.
// Fails closed: if the check itself errors, the caller gets a throw and
// should return an error response rather than proceeding unmetered.

function keyHash(value: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? '';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export async function overLimit(
  supabase: SupabaseClient,
  bucket: string,
  key: string,
  max: number,
  windowMinutes: number
): Promise<boolean> {
  const hashed = keyHash(key);
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  // limit(0), not head:true — a failed HEAD carries no response body, so
  // PostgREST's error (code, message, hint) arrives blank and the log can't
  // name the cause. A zero-row GET counts identically and fails legibly.
  const { count, error, status, statusText } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact' })
    .eq('bucket', bucket)
    .eq('key_hash', hashed)
    .gte('created_at', since)
    .limit(0);
  if (error) {
    throw new Error(`rate limit check failed: ${describeDbError(error, status, statusText)}`);
  }
  if ((count ?? 0) >= max) return true;

  const {
    error: insertError,
    status: insertStatus,
    statusText: insertStatusText,
  } = await supabase.from('rate_limit_events').insert({ bucket, key_hash: hashed });
  if (insertError) {
    throw new Error(
      `rate limit record failed: ${describeDbError(insertError, insertStatus, insertStatusText)}`
    );
  }

  // Opportunistic prune of events past every window we use.
  if (Math.random() < 0.05) {
    await supabase
      .from('rate_limit_events')
      .delete()
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString());
  }
  return false;
}
