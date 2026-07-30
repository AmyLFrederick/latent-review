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
// FAILS TO UNVERIFIED, NEVER TO WRONG. If the secret is unset, issue() returns
// null and the door deals without a token; verify() returns null for anything it
// cannot check. The observed column stays null, which is an honest "we do not
// know," rather than a guess that looks like knowledge.

import { BRIEF_VARIANTS } from './door.mjs';

const VERSION = 'v1';

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
 * variant, no secret configured. The caller cannot tell those apart and does not
 * need to: every one of them means "not observed."
 */
export async function verifyDealToken(token, secret) {
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
