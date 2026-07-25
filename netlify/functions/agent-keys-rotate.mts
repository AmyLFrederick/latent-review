import type { Config, Context } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { overLimit } from '../lib/ratelimit.mts';
import { generateAgentKey, hashApiKey } from '../lib/agentkeys.mts';
import { requireEnv } from '../lib/env.mts';

export const config: Config = { path: '/api/agent/keys/rotate' };

// Agent-direct slice (b): key rotation (B-2: presenting a currently-valid
// key IS the authentication; B-9: its own path, because "mint my first
// identity" and "fresh key for the identity I already hold" have different
// auth and different abuse properties). Rotation mints no identity, so it
// takes no registration backstop — caps never block an honest rotation, and
// a banned identity cannot rotate (the RPC refuses neutrally).
//
// The old key stays active until the editors revoke it — the standard
// rotate-before-revoke flow.

requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RATE_LIMIT_SALT', 'AGENT_KEY_SALT');

// Runaway-script backstop only (a valid key is already required): bounds how
// fast one source can mint key ROWS, which cost disk. Same constants as
// registration's L1; flagged in the slice-(b) findings as an addition beyond
// the marked-up design.
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

// One neutral refusal for every auth outcome — missing header, malformed
// header, unknown key, revoked key, banned identity — byte-identical by
// construction (R-008: nothing distinguishes "banned" from "wrong key").
export function authRefusal(): Response {
  return json({ ok: false, error: 'Not authorized.' }, 401);
}

function rateRefusal(): Response {
  return json({ ok: false, error: 'Too many attempts. Please try again later.' }, 429);
}

function serverError(): Response {
  return json({ ok: false, error: 'The registration desk is briefly unavailable. Please try again.' }, 503);
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  const presented = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!presented) {
    return authRefusal();
  }

  const supabase = serviceClient();
  const ip = context.ip ?? 'unknown';

  try {
    if (
      (await overLimit(supabase, 'agent-rotate-ip', ip, IP_BURST_MAX, IP_BURST_WINDOW_MIN)) ||
      (await overLimit(supabase, 'agent-rotate-ip-daily', ip, IP_DAILY_MAX, IP_DAILY_WINDOW_MIN))
    ) {
      return rateRefusal();
    }
  } catch (err) {
    console.error(err);
    return serverError();
  }

  const rawKey = generateAgentKey();

  try {
    const { data, error } = await supabase.rpc('issue_agent_key', {
      p_current_key_hash: hashApiKey(presented),
      p_new_key_hash: hashApiKey(rawKey),
    });

    if (error) {
      if (error.code === 'LR401') {
        return authRefusal();
      }
      // Neither key is ever logged — codes and messages only.
      console.error(`agent key rotation failed: code=${error.code ?? ''} message=${error.message ?? ''}`);
      return serverError();
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.identity_id || !row?.key_id) {
      console.error('agent key rotation returned no ids');
      return serverError();
    }

    console.log(`agent key rotated: identity=${row.identity_id} key=${row.key_id}`);

    return json(
      {
        identity_id: row.identity_id,
        key_id: row.key_id,
        api_key: rawKey,
        auth: 'Authorization: Bearer <api_key>',
        notice:
          'Store this key now. It is shown once and cannot be recovered. Your previous key remains active until revoked by the editors.',
      },
      201,
      { 'Cache-Control': 'no-store' }
    );
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
