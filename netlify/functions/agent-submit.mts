import type { Config, Context } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { overLimit } from '../lib/ratelimit.mts';
import { hashApiKey } from '../lib/agentkeys.mts';
import { requireEnv } from '../lib/env.mts';
import { screenField } from '../lib/screen.mts';

export const config: Config = { path: '/api/agent/submit' };

// Agent-direct slice (c): POST /api/agent/submit, per the marked-up design
// doc (docs/AGENT-DIRECT-SLICE-C.md, both editors' mark-up of 2026-07-26).
// The front door runs cheapest-first (§1) and nothing downstream is
// reachable unmetered. Auth is the RPC's first act (F5: this function never
// reads key or identity tables); the raw key is hashed before it leaves the
// function and never logged (B-5). Submit touches no AI and sends no email —
// review is the (e) nightly batch (DoW rule).

requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RATE_LIMIT_SALT', 'AGENT_KEY_SALT');

// Flood dials — RULED at mark-up (C-3, 2026-07-26). Endpoint constants by
// precedent (N1/N2): burst shape is implementation, but the NUMBERS were
// ratified and changing one is an editorial act.
const IP_BURST_MAX = 10; // F1: per IP, per 10 minutes
const IP_BURST_WINDOW_MIN = 10;
const IP_DAILY_MAX = 40; // F2: per IP, per 24 hours
const IP_DAILY_WINDOW_MIN = 24 * 60;
const KEY_BURST_MAX = 3; // F3: per key, per 10 minutes
const KEY_BURST_WINDOW_MIN = 10;

// Implementation guard, not an editorial dial (§1): the DB's 40,000-char
// body cap makes anything larger junk by construction.
const MAX_REQUEST_BYTES = 256 * 1024;

// R-006 word bounds; a word is any \S+ run (stated in /for-agents so the
// agent's count and ours cannot disagree).
const WORD_MIN = 500;
const WORD_MAX = 5000;

// The five ruled refusal sentences (C-1, adopted 2026-07-26). One frozen
// body per refusal class, serialized from the same constant every time, so
// every refusal in a class is byte-identical by construction — no response
// distinguishes unknown key from ban (R-008) or names a field, limit, or
// bucket. Exported for the §8 no-oracle tests.
export const REFUSAL_VALIDATION = Object.freeze({
  ok: false,
  code: 'LR400',
  error: 'This submission was not accepted. The submission schema is documented at /for-agents.',
});
export const REFUSAL_AUTH = Object.freeze({
  ok: false,
  code: 'LR401',
  error: 'This submission could not be accepted.',
});
export const REFUSAL_RATE = Object.freeze({
  ok: false,
  code: 'LR429',
  error: 'Too many attempts. Please try again shortly.',
});
export const REFUSAL_MONTH = Object.freeze({
  ok: false,
  code: 'LR429',
  error: "This month's window is full; it reopens on the 1st.",
});
export const REFUSAL_SERVER = Object.freeze({
  ok: false,
  code: 'LR500',
  error: 'The desk is briefly unavailable. Please try again.',
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Refusal log line: timestamp (the platform's), category, nothing else —
// never the content, never a field excerpt (§4: a refused text leaves no
// copy of itself here).
function refuseValidation(category: string): Response {
  console.log(`agent submit refused: ${category}`);
  return json(REFUSAL_VALIDATION, 400);
}

// Postgres char_length counts code points; JS .length counts UTF-16 units.
// Counting code points here keeps intake and the DB CHECKs in exact
// agreement on astral characters.
function cpLength(value: string): number {
  let n = 0;
  for (const _ of value) n++;
  return n;
}

// A required string field within [min, max] code points; optional fields
// treat null/undefined as absent. Anything non-string refuses.
function readString(
  value: unknown,
  min: number,
  max: number,
  required: boolean
): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) {
    return required ? { ok: false } : { ok: true, value: null };
  }
  if (typeof value !== 'string') return { ok: false };
  const len = cpLength(value);
  if (len < min || len > max) return { ok: false };
  return { ok: true, value };
}

const TRUTH_STANDARDS = ['reported', 'opinion', 'first-person'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // the DB's own regex

export default async function handler(req: Request, context: Context): Promise<Response> {
  // (1) Method.
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  // (2) Bearer parse — parse-before-flood, matching rotate exactly. Missing
  // or malformed header gets the neutral 401 immediately.
  const presented = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!presented) {
    return json(REFUSAL_AUTH, 401);
  }

  const supabase = serviceClient();
  const ip = context.ip ?? 'unknown';

  // The key-domain hash, computed once: the F3 bucket key AND the RPC auth
  // parameter. overLimit applies its own RATE_LIMIT_SALT identifierHash on
  // top for storage, so what lands in rate_limit_events is a network-salt
  // hash OF the key-domain hash — the raw key never meets the network salt
  // (B-5 domain separation by construction).
  const keyHash = hashApiKey(presented);

  // (3) Flood limits (§3) — per-IP first, then per-key; ruled dials C-3.
  // Meter failure → 503, fail closed, never an unmetered pass.
  try {
    if (
      (await overLimit(supabase, 'agent-submit-ip', ip, IP_BURST_MAX, IP_BURST_WINDOW_MIN)) ||
      (await overLimit(supabase, 'agent-submit-ip-daily', ip, IP_DAILY_MAX, IP_DAILY_WINDOW_MIN)) ||
      (await overLimit(supabase, 'agent-submit-key', keyHash, KEY_BURST_MAX, KEY_BURST_WINDOW_MIN))
    ) {
      return json(REFUSAL_RATE, 429);
    }
  } catch (err) {
    console.error(err);
    return json(REFUSAL_SERVER, 503);
  }

  // (4) Body parse + size bound.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return refuseValidation('validation:body');
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_REQUEST_BYTES) {
    return refuseValidation('validation:size');
  }
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return refuseValidation('validation:shape');
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return refuseValidation('validation:json');
  }

  // (5) App-layer validation (§1 schema, mirroring the DB constraints).
  // Unknown fields are ignored, not errors. On ANY failure: one generic
  // refusal — no field named, no limit echoed, no measured count.
  const title = readString(payload.title, 1, 300, true);
  const authorName = readString(payload.author_name, 1, 200, true);
  const modelVersion = readString(payload.author_model_version, 1, 200, false);
  const attestation = readString(payload.provenance_attestation, 1, 2000, true);
  const body = readString(payload.body, 1, 40000, true);
  const email = readString(payload.contact_email, 1, 254, true);
  const suggestedSection = readString(payload.suggested_section, 1, 100, false);
  const pronouns = readString(payload.pronouns, 1, 50, false);

  if (
    !title.ok || !authorName.ok || !modelVersion.ok || !attestation.ok ||
    !body.ok || !email.ok || !suggestedSection.ok || !pronouns.ok ||
    typeof payload.truth_standard !== 'string' ||
    !TRUTH_STANDARDS.includes(payload.truth_standard) ||
    !EMAIL_RE.test(email.value as string)
  ) {
    return refuseValidation('validation');
  }

  const words = ((body.value as string).match(/\S+/g) ?? []).length;
  if (words < WORD_MIN || words > WORD_MAX) {
    return refuseValidation('validation');
  }

  // (6) Deterministic injection screen (§4) — every submitter-controlled
  // field, contact_email included: its regex excludes only whitespace and
  // '@', so bidi and zero-width characters would pass it (AI editor's
  // review of 7ce8d8f). Multiline whitespace is allowed only in body and
  // provenance_attestation.
  const screened: Array<[string | null, boolean]> = [
    [title.value, false],
    [authorName.value, false],
    [modelVersion.value, false],
    [attestation.value, true],
    [body.value, true],
    [email.value, false],
    [suggestedSection.value, false],
    [pronouns.value, false],
  ];
  for (const [value, multiline] of screened) {
    if (value === null) continue;
    const hit = screenField(value, { multiline });
    if (hit) {
      return refuseValidation(hit);
    }
  }

  // (7) The RPC — auth, ceiling, cap, insert, all atomic in the DB.
  try {
    const { data, error } = await supabase.rpc('submit_agent_direct', {
      p_key_hash: keyHash,
      p_title: title.value,
      p_author_name: authorName.value,
      p_author_model_version: modelVersion.value,
      p_truth_standard: payload.truth_standard,
      p_provenance_attestation: attestation.value,
      p_body: body.value,
      p_contact_email: email.value,
      p_suggested_section: suggestedSection.value,
      p_pronouns: pronouns.value,
    });

    // (8) Map the RPC error contract to HTTP. The RPC's LR429 is always a
    // monthly refusal (global cap or per-identity ceiling, indistinguishable
    // — C-2); the flood 429 was already handled at step (3).
    if (error) {
      if (error.code === 'LR401') {
        return json(REFUSAL_AUTH, 401);
      }
      if (error.code === 'LR429') {
        return json(REFUSAL_MONTH, 429);
      }
      // The key is never logged — codes and messages only.
      console.error(`agent submit failed: code=${error.code ?? ''} message=${error.message ?? ''}`);
      return json(REFUSAL_SERVER, 503);
    }

    const id = Array.isArray(data) ? data[0] : data;
    if (typeof id !== 'string' || id.length === 0) {
      console.error('agent submit returned no id');
      return json(REFUSAL_SERVER, 503);
    }

    console.log(`agent submission received: id=${id}`);

    // Receipt only — nothing evaluative (§1 step 8).
    return json(
      {
        ok: true,
        id,
        notice:
          'Received. Submissions are reviewed in a scheduled nightly batch with a hard cap, then by the editors — nothing you send triggers an instant evaluation.',
      },
      201
    );
  } catch (err) {
    console.error(err);
    return json(REFUSAL_SERVER, 503);
  }
}
