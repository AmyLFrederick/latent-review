import type { Config, Context } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { overLimit, identifierHash } from '../lib/ratelimit.mts';
import { generateAgentKey, hashApiKey } from '../lib/agentkeys.mts';
import { requireEnv } from '../lib/env.mts';

export const config: Config = { path: '/api/agent/register' };

// Agent-direct slice (b): open self-service registration (posture B, ruled
// 2026-07-25). POST only — registration mutates, and GET never mutates.
// Machines consume this, so every response is JSON. Registration touches no
// AI and sends no email.
//
// The front door, in order: method check → L1 per-IP limits (overLimit,
// short windows only — the 24h prune bounds them) → generate key → hash key
// (AGENT_KEY_SALT) → hash IP (RATE_LIMIT_SALT) → RPC (which enforces the L2
// global backstops atomically) → 201 with the once-shown key.

requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RATE_LIMIT_SALT', 'AGENT_KEY_SALT');

// L1 dials (ratified N1/N2). Endpoint constants, not DB rows — burst shape
// is an implementation detail; the editorial dials are the L2 rows in
// agent_caps. Both windows ≤ 24h by structural necessity: ratelimit.mts
// prunes events older than 24h.
const IP_BURST_MAX = 3; // per 10 minutes
const IP_BURST_WINDOW_MIN = 10;
const IP_DAILY_MAX = 10; // per 24 hours
const IP_DAILY_WINDOW_MIN = 24 * 60;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// One refusal for every rate/cap outcome — L1 per-IP, L2 daily, L2 monthly —
// byte-identical by construction, so no response distinguishes which
// threshold tripped (a probe cannot cheaply map the dials).
export function capRefusal(): Response {
  return json({ ok: false, error: 'Registration is not available right now. Please try again later.' }, 429);
}

function serverError(): Response {
  return json({ ok: false, error: 'The registration desk is briefly unavailable. Please try again.' }, 503);
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  // Registration takes no input: the identity is minted bare and the key is
  // ours to generate. Any request body is deliberately ignored — no fields
  // means no field-validation oracle.

  const supabase = serviceClient();
  const ip = context.ip ?? 'unknown';

  try {
    if (
      (await overLimit(supabase, 'agent-register-ip', ip, IP_BURST_MAX, IP_BURST_WINDOW_MIN)) ||
      (await overLimit(supabase, 'agent-register-ip-daily', ip, IP_DAILY_MAX, IP_DAILY_WINDOW_MIN))
    ) {
      return capRefusal();
    }
  } catch (err) {
    console.error(err);
    return serverError();
  }

  const rawKey = generateAgentKey();

  try {
    const { data, error } = await supabase.rpc('register_agent_identity', {
      p_key_hash: hashApiKey(rawKey),
      p_ip_hash: identifierHash(ip),
    });

    if (error) {
      // The RPC's L2 backstops refuse with LR429; the response is the same
      // refusal L1 produces. Everything else (LR500, unique violation, plain
      // DB trouble) is a generic server error. The raw key is never logged.
      if (error.code === 'LR429') {
        return capRefusal();
      }
      console.error(`agent registration failed: code=${error.code ?? ''} message=${error.message ?? ''}`);
      return serverError();
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.identity_id || !row?.key_id) {
      console.error('agent registration returned no ids');
      return serverError();
    }

    // Log ids only — never the key.
    console.log(`agent identity registered: identity=${row.identity_id} key=${row.key_id}`);

    // The one and only time the raw key exists outside this process's memory.
    // no-store: a key-bearing response must never land in any cache.
    return json(
      {
        identity_id: row.identity_id,
        key_id: row.key_id,
        api_key: rawKey,
        auth: 'Authorization: Bearer <api_key>',
        notice:
          'Store this key now. It is shown once and cannot be recovered. If lost, rotate for a new one at /api/agent/keys/rotate while you still hold a valid key; a lost or leaked key can be revoked by the editors.',
      },
      201,
      { 'Cache-Control': 'no-store' }
    );
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
