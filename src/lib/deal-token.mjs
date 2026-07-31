// The deal token — how a brief dealt at /door is still provable at /submit.
//
// THE PROBLEM IT SOLVES. The deal happens in one request (the edge function at
// /door) and the submission arrives in another, minutes or days later. Nothing
// connects them. R-033 clause 1 says the dealt variant is the journal's own
// observation and never the author's claim about it, so "the agent tells us
// which brief it got" is precisely the thing that does not count.
//
// HOW. The door issues a token carrying the variant and an HMAC over it, keyed
// by a secret only the server holds. The endpoint verifies the HMAC and reads
// the variant out of the token IT JUST VERIFIED. What crosses the wire is a
// token; what gets recorded is the journal's own verification result. Forging a
// variant requires the secret.
//
// WHY NOT A LEDGER TABLE. A row per /door page load is an unbounded insert
// surface driven by unauthenticated traffic, on a journal that guards this class
// of thing everywhere else. It would need its own rate limiting, in an edge
// runtime that does not share ratelimit.mts, to buy a secondary measurement.
// This is stateless and adds no writable surface.
//
// WHAT IT DOES NOT DO. /door is unauthenticated by design — an agent has not
// registered when it is dealt to — so anyone may fetch the door repeatedly and
// keep whichever token they prefer. Deals ISSUED are 50/50 by construction;
// deals REDEEMED are not guaranteed to be. No mechanism at an anonymous door
// closes that, and a ledger would not either. It is written here so nobody later
// reads this field as a random sample.
//
// The same is true of REUSE, and this paragraph used to leave it out. Nothing
// marks a token as spent, so one token can back more than one submission — now
// bounded to the fourteen-day window below, where it was previously unbounded in
// time. That is a narrowing, not a closure, and it is stated here rather than
// only in the security review because this file is where the next person looks.
//
// FAILS TO UNVERIFIED, NEVER TO WRONG. If the secret is unset, issue() returns
// null and the door deals without a token; verify() returns null for anything it
// cannot check. The observed column stays null, which is an honest "we do not
// know," rather than a guess that looks like knowledge.

import { BRIEF_VARIANTS } from './door.mjs';

const VERSION = 'v1';

/**
 * How long a dealt brief stays provable. Ruled by the editors 2026-07-31, after
 * the cost-exposure audit found that this function read the issue timestamp's
 * SHAPE and never its AGE — so a token was valid from issue until forever, and
 * one token could back any number of submissions.
 *
 * WHAT FOURTEEN DAYS COSTS A WRITER: nothing. The clock covers deal → submission
 * only. /door deals on every fetch, so a writer starting a second piece gets a
 * fresh brief and a fresh token automatically; nothing accumulates against
 * anyone's history. The only person the window can touch is someone who fetched
 * the door, waited longer than a fortnight, and then submitted on the stale
 * token — and even they lose nothing that is theirs. The submission is accepted
 * exactly as before. What goes null is the JOURNAL'S OWN MEASUREMENT, which is
 * the honest outcome once the journal can no longer vouch for what it observed.
 *
 * WHAT IT DOES NOT BUY, so nobody reads more into it later: this narrows the
 * replay window, it does not close it. Before, one token backed unlimited
 * submissions forever; now it backs unlimited submissions within fourteen days.
 * The anonymous-door residual described below is untouched, and no TTL can touch
 * it — an author who can reroll for a preferred variant can also reroll fresh.
 * See C6 in docs/AGENT-DIRECT-SECURITY-REVIEW.md.
 */
export const DEAL_TOKEN_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Tolerance for a token dated slightly ahead of us.
 *
 * DEFENCE IN DEPTH, NOT A LIVE HOLE. The door never issues a future-dated token
 * and forging one requires DOOR_DEAL_SALT. But `issued` accepts up to twelve
 * digits, so without this a token claiming a date in the year 33000 would
 * satisfy any maximum-age check forever — which would make the expiry above
 * decorative on exactly the day it started to matter, the day the secret leaked.
 * Five minutes absorbs ordinary clock disagreement between the edge and the
 * function.
 */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Base64url without padding — safe in JSON, URLs, and a pasted block. */
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(mac));
}

/**
 * Issue a token for a dealt variant.
 *
 * @param variant one of BRIEF_VARIANTS
 * @param secret  DOOR_DEAL_SALT, or null/undefined when it is not configured
 * @param now     epoch millis, injected so the tests are not clock-dependent
 * @returns the token string, or null if there is no secret to sign with
 */
export async function issueDealToken(variant, secret, now = Date.now()) {
  if (!secret) return null;
  if (!BRIEF_VARIANTS.includes(variant)) {
    throw new Error(`refusing to sign an unknown variant "${variant}"`);
  }
  // A nonce so two deals of the same variant in the same millisecond are still
  // distinct strings. It carries no meaning and is not checked on the way back.
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(9)));
  const payload = `${VERSION}.${variant}.${Math.floor(now / 1000)}.${nonce}`;
  return `${payload}.${await sign(payload, secret)}`;
}

/**
 * Verify a token and return the variant it proves, or null.
 *
 * Null for every failure — malformed, unknown version, bad signature, unknown
 * variant, expired, future-dated, no secret configured. The caller cannot tell
 * those apart and does not need to: every one of them means "not observed."
 *
 * THE AGE CHECK IS ON BY DEFAULT, and that is the point. An opt-in parameter
 * would have left the one call site that matters — agent-submit.mts, which
 * passes two arguments — exactly as exposed as it was before, which is a fix in
 * name only. Callers that genuinely want no expiry pass `maxAgeMs: Infinity`
 * and say so at their call site.
 *
 * @param token   the token string, or anything at all
 * @param secret  DOOR_DEAL_SALT, or null/undefined when it is not configured
 * @param opts.now       epoch millis, injected so the tests are not clock-dependent
 * @param opts.maxAgeMs  how old a token may be; Infinity disables the check
 */
export async function verifyDealToken(
  token,
  secret,
  { now = Date.now(), maxAgeMs = DEAL_TOKEN_MAX_AGE_MS } = {}
) {
  if (!secret || typeof token !== 'string') return null;
  // Bound the work before doing any: an oversized string should cost a length
  // check, not an HMAC.
  if (token.length > 512) return null;

  const parts = token.split('.');
  if (parts.length !== 5) return null;

  const [version, variant, issued, nonce, mac] = parts;
  if (version !== VERSION) return null;
  if (!BRIEF_VARIANTS.includes(variant)) return null;
  if (!/^\d{1,12}$/.test(issued)) return null;

  // Age before HMAC — the cheap check first, matching the length bound above.
  // This is not a timing oracle: `issued` travels in the clear inside the token,
  // so anyone holding one can already read its date without measuring anything.
  const age = now - Number(issued) * 1000;
  if (age > maxAgeMs) return null;
  if (age < -CLOCK_SKEW_MS) return null;

  const expected = await sign(`${version}.${variant}.${issued}.${nonce}`, secret);
  if (!timingSafeEqual(expected, mac)) return null;

  return variant;
}

/**
 * Constant-time string comparison.
 *
 * A plain === on a MAC leaks how many leading characters matched through timing.
 * The window is small over a network and the prize here is only a metadata
 * field, but a signature check that compares in variable time is a bad habit to
 * leave in a repository where the next person will copy it into something that
 * matters more.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The issue time a token carries, for a desk that wants to see it. */
export function dealTokenIssuedAt(token) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 5 || !/^\d{1,12}$/.test(parts[2])) return null;
  return new Date(Number(parts[2]) * 1000);
}
