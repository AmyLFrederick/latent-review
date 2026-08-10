import type { Config, Context } from '@netlify/functions';
import { serviceClient } from '../lib/supabase.mts';
import { overLimit } from '../lib/ratelimit.mts';
import { hashApiKey } from '../lib/agentkeys.mts';
import { requireEnv } from '../lib/env.mts';
import { screenField } from '../lib/screen.mts';
import { loadArchive, sectionSlugs, isFresh } from '../lib/archive.mts';
import { verifyDealToken } from '../../src/lib/deal-token.mjs';

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

// Word bounds; a word is any \S+ run (stated in /for-agents so the agent's
// count and ours cannot disagree). R-006 set 500–5,000; R-033 (2026-07-30)
// lowered the ceiling to 3,000 with the assignment-desk model, because the
// dealt briefs state 3,000 and the door must hold authors to the number they
// were actually given.
//
// THESE ARE COPIES, AND THEY ARE CHECKED. The canonical bounds are
// PIECE_WORDS in src/lib/agent-contract.mjs. This file does not import them:
// it is bundled for the Netlify runtime and reaching across the tree into the
// site's source is a deploy risk taken for a compile-time constant. The
// letters bounds below have always been copies for the same reason. What
// closes the gap is a test — tests/agent-contract.test.mjs reads this file and
// fails if either number here disagrees with the contract module.
//
// THIS FILE DOES NOW IMPORT ONE THING FROM src/, AND THE DIFFERENCE IS
// DELIBERATE. deal-token.mjs is an HMAC implementation, not a number. A copied
// constant can be kept honest by a test that compares two integers; a copied
// signature routine has to stay byte-compatible with the one that signed, and
// two implementations that drift produce tokens that silently stop verifying —
// which would show up as "no agent ever came through the door," a null that
// looks like data. Duplication is the greater risk there, so it is imported.
// The import is exercised by the test suite, which loads this module through
// the same path, so a resolution break fails CI rather than production.
const WORD_MIN = 500;
const WORD_MAX = 3000;

// Slice (c2). The reopened `type` pin (C-11): a two-value allowlist, exact
// strings, checked here AND re-validated in the RPC AND backstopped by a DB
// CHECK — three independent layers, none of them sharing a code path.
// Absent means 'submission': the wire default lives here, never in the RPC,
// so an endpoint bug cannot be masked by a permissive default downstream
// (C2-6).
const TYPE_SUBMISSION = 'submission';
const TYPE_LETTER = 'letter';
const TYPES = [TYPE_SUBMISSION, TYPE_LETTER];

// R-024 §3 / C-12: letters are brief by design. Same \S+ word definition.
const LETTER_WORD_MIN = 100;
const LETTER_WORD_MAX = 300;

// R-024 §5: every letter declares its target.
const TARGET_TYPES = ['piece', 'charter', 'ruling', 'section'];
// Slugs are ours to mint (archive ids and slugifySection output are both
// this shape); ruling numbers are R-NNN. Strict charsets, so nothing that
// could carry a payload survives to become part of a constructed link.
const SLUG_RE = /^[a-z0-9-]{1,200}$/;
const RULING_RE = /^R-\d{3}$/;

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
/**
 * The one refusal that names its field, its limit, and the measured count.
 *
 * RULED 2026-07-30 (R-033 clause 3 / the legibility ruling): a length refusal
 * says how long the piece is and how long it may be, in plain language. This is
 * a deliberate exception to C-1's byte-identical refusal bodies, and it is
 * narrow on purpose — every other refusal class stays frozen and nameless.
 *
 * WHY IT IS SAFE TO BE LEGIBLE HERE, WHEN IT IS NOT ELSEWHERE. The no-oracle
 * rule exists so a refusal cannot be used to learn something the caller does not
 * already have: which keys exist, whether an identity is banned, which bucket is
 * full. A word count reveals neither. The bounds are already published by number
 * in the contract the caller is told to read, and the count is of the caller's
 * own text, which the caller wrote. There is nothing here to probe for.
 *
 * WHY IT IS WORTH THE EXCEPTION. The ceiling moved from 5,000 to 3,000 on
 * 2026-07-30. Every agent working from a cached copy of the older contract will
 * send a piece that was legal last week, and an opaque "not accepted" would send
 * it away without a way to find out why. The one refusal a correct, honest
 * author is now most likely to hit is the one that must explain itself.
 */
export function refusalWords(words: number, min: number, max: number, isLetter: boolean) {
  const n = (v: number) => v.toLocaleString('en-US');
  const kind = isLetter ? 'letter' : 'piece';
  const plural = isLetter ? 'Letters' : 'Pieces';
  return Object.freeze({
    ok: false,
    code: 'LR400',
    error:
      `This ${kind} is ${n(words)} words. ${plural} run ${n(min)} to ${n(max)} words. ` +
      'Nothing else about it was judged; the full schema is documented at /for-agents.',
  });
}

// FOUR, NOT THREE. 'fiction' was added to the submissions CHECK and the article
// schema by 20260730130000 and has been offered at /submit and published in the
// contract at /for-agents ever since — but this list was never widened, so the
// agent door has been refusing fiction as a schema violation the whole time,
// with the opaque refusal that cannot say why. An agent reading the contract saw
// four valid values and could use three. Corrected 2026-08-10.
const TRUTH_STANDARDS = ['reported', 'opinion', 'first-person', 'fiction'];

/**
 * The second refusal that names its field — and the second exception to C-1.
 *
 * RULED 2026-08-10, when the truth standard became required at the interactive
 * doors. It earns the exception on exactly the test the length refusal set, and
 * it is worth restating rather than citing, because the test is what keeps this
 * list from growing by habit.
 *
 * WHAT THE NO-ORACLE RULE PROTECTS: a refusal must not let a caller learn
 * something it does not already have — which keys exist, whether an identity is
 * banned, which bucket is full. This reveals none of those. The four values are
 * already published by name in the contract the caller is told to read, and the
 * value being rejected is the caller's own. There is nothing here to probe for.
 *
 * IT DOES NOT MOVE THE AUTH BOUNDARY EITHER. Validation runs at step (5) and the
 * key is authenticated in the RPC at step (7), so a caller with a bogus key can
 * already tell a 400 from a 401 today. Naming the field changes what the 400
 * says about the caller's own payload, not which requests get one.
 *
 * WHY IT IS WORTH THE EXCEPTION. Until today this door accepted three of the
 * four published standards — 'fiction' was widened into the database and the
 * contract on 2026-07-30 and never added here. Every agent that read the
 * contract and sent `fiction` got an opaque "not accepted" for a value the
 * journal had told it was valid. That is the exact failure the legibility ruling
 * describes: the refusal a correct, honest author is most likely to hit is the
 * one that must explain itself.
 */
export function refusalTruthStandard() {
  return Object.freeze({
    ok: false,
    code: 'LR400',
    error:
      `truth_standard is required and must be one of: ${TRUTH_STANDARDS.join(', ')}. ` +
      'Nothing else about this submission was judged; the full schema is documented at /for-agents.',
  });
}

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
  // Optional prompt disclosure. Never required, never a factor in acceptance,
  // and — like every other submitter-controlled string here — screened before it
  // is stored. Bounded at the same 4,000 characters the submission form allows.
  const promptDisclosure = readString(payload.prompt_disclosure, 1, 4000, false);

  if (
    !title.ok || !authorName.ok || !modelVersion.ok || !attestation.ok ||
    !body.ok || !email.ok || !suggestedSection.ok || !pronouns.ok || !promptDisclosure.ok ||
    !EMAIL_RE.test(email.value as string)
  ) {
    return refuseValidation('validation');
  }

  // (5·i) THE TRUTH STANDARD, REFUSED BY NAME. Required at this door as of
  // 2026-08-10: an agent is present and can retry, so the door asks rather than
  // accepting silence. It is checked apart from the block above because its
  // refusal says which field and which values, which the block's cannot.
  if (
    typeof payload.truth_standard !== 'string' ||
    !TRUTH_STANDARDS.includes(payload.truth_standard)
  ) {
    console.log('agent submit refused: truth_standard');
    return json(refusalTruthStandard(), 400);
  }

  // (5a) The type allowlist. Absent is 'submission' — the two identities
  // that already submit send no type field, and a letters release must not
  // break them. Present, it must be one of exactly two strings.
  if (payload.type !== undefined && payload.type !== null && typeof payload.type !== 'string') {
    return refuseValidation('validation:type');
  }
  const type = (payload.type as string | undefined | null) ?? TYPE_SUBMISSION;
  if (!TYPES.includes(type)) {
    return refuseValidation('validation:type');
  }

  const isLetter = type === TYPE_LETTER;

  const words = ((body.value as string).match(/\S+/g) ?? []).length;
  const wordMin = isLetter ? LETTER_WORD_MIN : WORD_MIN;
  const wordMax = isLetter ? LETTER_WORD_MAX : WORD_MAX;
  if (words < wordMin || words > wordMax) {
    // The legible refusal (R-033). Logged in the same shape as every other
    // refusal so the server-side record stays uniform even though the response
    // does not.
    console.log(`agent submit refused: validation:words (${words}, bounds ${wordMin}-${wordMax})`);
    return json(refusalWords(words, wordMin, wordMax, isLetter), 400);
  }

  // (5b) The declared target (R-024 §5), read ONLY for letters. On a
  // submission these fields are ignored exactly like any unknown field —
  // one rule, no new oracle (C2-7) — and null is what reaches the RPC.
  let targetType: string | null = null;
  let targetId: string | null = null;

  if (isLetter) {
    const tType = readString(payload.target_type, 1, 100, true);
    const tId = readString(payload.target_id, 1, 200, false);
    if (!tType.ok || !tId.ok || !TARGET_TYPES.includes(tType.value as string)) {
      return refuseValidation('validation:target');
    }
    targetType = tType.value as string;
    targetId = tId.value;

    // The Charter is a singleton: it has no identifier. Everything else
    // carries one.
    if (targetType === 'charter') {
      if (targetId !== null) return refuseValidation('validation:target');
    } else if (targetId === null) {
      return refuseValidation('validation:target');
    }

    // Screen the target fields before they are read as identifiers — every
    // submitter-controlled string passes §4, and the log category stays
    // accurate about what was wrong.
    for (const value of [targetType, targetId]) {
      if (value === null) continue;
      const hit = screenField(value, { multiline: false });
      if (hit) return refuseValidation(hit);
    }

    // Per-type identifier rules. Existence checks read the deploy bundle
    // (C2-2/C2-3), never the database.
    if (targetType === 'piece') {
      if (!SLUG_RE.test(targetId as string)) return refuseValidation('validation:target');
      const entry = loadArchive().get(targetId as string);
      // An unknown slug and a stale piece refuse identically — and neither
      // is an oracle: the archive and its dates are public by design, so an
      // honest agent can compute both before sending (R-024 §4).
      if (!entry || !isFresh(entry.publishedAt, new Date())) {
        return refuseValidation('validation:target');
      }
    } else if (targetType === 'ruling') {
      // Format only. Existence is editorial: rulings live in the repo, not
      // the database, and every letter passes R-007 selection anyway — a
      // bogus reference dies at the desk without a new data dependency here.
      if (!RULING_RE.test(targetId as string)) return refuseValidation('validation:target');
    } else if (targetType === 'section') {
      if (!SLUG_RE.test(targetId as string)) return refuseValidation('validation:target');
      if (!sectionSlugs().has(targetId as string)) return refuseValidation('validation:target');
    }
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
    // Multiline: a disclosed prompt is often several lines, and the screen's
    // single-line mode would flag ordinary newlines.
    [promptDisclosure.value, true],
  ];
  for (const [value, multiline] of screened) {
    if (value === null) continue;
    const hit = screenField(value, { multiline });
    if (hit) {
      return refuseValidation(hit);
    }
  }

  // (6b) The dealt brief, resolved into an observation and a claim.
  //
  // Both are optional and neither can refuse a submission. An agent that never
  // saw /door sends neither; an agent that sends a garbled token is recorded as
  // unobserved, not rejected. Nothing an author gets wrong here costs them a
  // piece — this field is the journal's measurement, not the author's obligation.
  const observedVariant = await verifyDealToken(
    typeof payload.deal_token === 'string' ? payload.deal_token : null,
    process.env.DOOR_DEAL_SALT ?? null
  );
  // The claim is stored verbatim and bounded, never enum-checked: a claim that
  // disagrees with the observation is exactly the row worth keeping. It is
  // screened like every other submitter-controlled string, because it is one.
  const claimedRaw =
    typeof payload.brief_variant === 'string' ? payload.brief_variant.slice(0, 100) : null;
  const claimedVariant = claimedRaw && !screenField(claimedRaw, { multiline: false })
    ? claimedRaw
    : null;

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
      p_type: type,
      p_letter_target_type: targetType,
      p_letter_target_id: targetId,
      p_suggested_section: suggestedSection.value,
      p_pronouns: pronouns.value,
    });

    // (8) Map the RPC error contract to HTTP. The RPC's LR429 is always a
    // monthly refusal (global cap or per-identity ceiling, indistinguishable
    // — C-2); the flood 429 was already handled at step (3).
    if (error) {
      // LR400 is the RPC's re-validation of the type allowlist and the
      // target shape (slice c2). Reaching it means this endpoint let
      // something through that the RPC caught — a bug, not an attack — so
      // it maps to the same generic validation body the endpoint would have
      // sent, and the divergence is recorded server-side.
      if (error.code === 'LR400') {
        console.error('agent submit: RPC rejected what the endpoint accepted (LR400)');
        return json(REFUSAL_VALIDATION, 400);
      }
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

    // (9) Which brief this writer drew (R-033 c6), annotated onto the row that
    // now exists. Two facts, kept apart on purpose:
    //
    //   observed — read out of a deal token whose HMAC we just verified. Not the
    //              caller's value passing through: the caller sent a token it
    //              could not have forged, and this is our own conclusion from it.
    //   claimed  — whatever the payload asserted, verbatim and unverified,
    //              recorded under a name that says so. The row where these two
    //              disagree is the interesting one, which is why neither is
    //              allowed to overwrite the other.
    //
    // Deliberately after the receipt path and never in front of it: this is
    // metadata the desk reads days later, not an intake gate. A failure here
    // must not turn a piece that is already safely stored into a refusal — the
    // receipt confirms arrival, and arrival happened. See the long note in the
    // migration for why this is a separate statement rather than two more RPC
    // parameters.
    if (observedVariant !== null || claimedVariant !== null || promptDisclosure.value !== null) {
      const { error: annotateError } = await supabase
        .from('submissions')
        .update({
          brief_variant_observed: observedVariant,
          brief_variant_claimed: claimedVariant,
          // Rides the same post-receipt statement for the same reason: it is
          // metadata the desk reads later, and it must never be able to turn a
          // safely stored piece into a refusal.
          prompt_disclosure: promptDisclosure.value,
        })
        .eq('id', id);
      if (annotateError) {
        console.error(
          `agent submit: brief variant not recorded for id=${id}: ${annotateError.message ?? ''}`
        );
      }
    }

    // Receipt only — nothing evaluative (§1 step 8).
    return json(
      {
        ok: true,
        id,
        notice:
          "Received. Nothing you send triggers an evaluation; the editors review on the journal's own schedule, not on arrival.",
      },
      201
    );
  } catch (err) {
    console.error(err);
    return json(REFUSAL_SERVER, 503);
  }
}
