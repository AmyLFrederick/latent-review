import { createHash, timingSafeEqual } from 'node:crypto';
import type { Config, Context } from '@netlify/functions';
import { serviceClient, describeDbError } from '../lib/supabase.mts';
import { overLimit } from '../lib/ratelimit.mts';
import { requireEnv } from '../lib/env.mts';

// Editors' Desk, Option C: a read-only endpoint returning one submission (and
// its AI desk passes) as JSON, so the AI co-editor can fetch a piece by URL in
// the chat interface for full editorial review of borderline cases.
//
// Gated by REVIEW_DESK_TOKEN — a dedicated low-privilege credential, separate
// from the Supabase service key: it grants exactly this read and nothing
// else, and is revoked by rotating one Netlify env var. Setup is documented
// in docs/EDITORS-DESK.md.
//
// GET never mutates (house rule): this function only ever SELECTs.

export const config: Config = { path: '/api/review/submission' };

requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'REVIEW_DESK_TOKEN', 'RATE_LIMIT_SALT');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Editorial material behind a token — never cache it anywhere shared.
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function tokenMatches(presented: string): boolean {
  const expected = process.env.REVIEW_DESK_TOKEN ?? '';
  // The env check at cold start guarantees presence; also refuse short tokens
  // outright so a weak value never silently becomes the gate.
  if (expected.length < 32 || presented.length === 0) return false;
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET' } });
  }

  const url = new URL(req.url);
  // Prefer the Authorization header; accept ?token= because the consuming
  // surface is a chat interface fetching by URL. The tradeoff (URLs can land
  // in logs) is documented in docs/EDITORS-DESK.md with the rotation drill.
  const auth = req.headers.get('authorization') ?? '';
  const presented = auth.startsWith('Bearer ')
    ? auth.slice('Bearer '.length).trim()
    : (url.searchParams.get('token') ?? '');

  if (!tokenMatches(presented)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = serviceClient();

  try {
    const ip = context.ip ?? 'unknown';
    if (await overLimit(supabase, 'review-read-ip', ip, 60, 60)) {
      return json({ error: 'too many requests' }, 429);
    }
  } catch (err) {
    console.error(err);
    return json({ error: 'the desk is briefly unavailable' }, 503);
  }

  const id = url.searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) {
    return json({ error: 'id must be a submission UUID' }, 400);
  }

  const { data: submission, error, status, statusText } = await supabase
    .from('submissions')
    .select(
      'id, type, title, author_name, author_model_version, submission_track, involvement_tier, truth_standard, provenance_attestation, body, contact_email, status, amy_decision, coeditor_decision, coeditor_review, decided_at, created_at'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error(`review-read: ${describeDbError(error, status, statusText)}`);
    return json({ error: 'the desk is briefly unavailable' }, 503);
  }
  if (!submission) {
    return json({ error: 'not found' }, 404);
  }

  const { data: passes, error: passError } = await supabase
    .from('ai_editor_passes')
    .select('id, status, model, criteria_sha256, pass, error, input_tokens, output_tokens, created_at, completed_at')
    .eq('submission_id', id)
    .order('created_at', { ascending: false });
  if (passError) {
    console.error(`review-read passes: ${passError.message}`);
  }

  return json({
    submission,
    ai_editor_passes: passes ?? [],
    note: 'Each entry in ai_editor_passes is an AI desk review — Claude (model as recorded) applying the editors’ written criteria. Advisory only, distinct from the founding co-editor’s judgment; the dual-yes decision belongs to the two founding editors.',
  });
}
