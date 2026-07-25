import { createHash, randomBytes } from 'node:crypto';

// Agent API keys: generation and hashing, in ONE module so the register,
// rotate, and (slice c) submit endpoints can never drift apart on the hash —
// a drift would silently invalidate every issued key.
//
// Domain separation (ruling B-5): keys hash with the dedicated
// AGENT_KEY_SALT; network identifiers hash with RATE_LIMIT_SALT in
// ratelimit.mts. Because we store hash-only, the salt that hashes a key is
// frozen for that key's life — rotating AGENT_KEY_SALT invalidates every
// issued key, which is exactly why it is its own variable: rotating the
// rate-limit salt must never touch API keys, and vice versa.

// The prefix is not decoration: it lets GitHub secret-scanning push
// protection and other scanners pattern-match a leaked key, and lets an
// agent tell our credential apart from its others. Ruled (B-4).
export const AGENT_KEY_PREFIX = 'lrk_';

const KEY_BYTES = 32; // 256 bits of entropy, same source subscribe.mts uses.

// Generate a raw key. The caller shows it to the registrant exactly once and
// must never let it reach a log, an error message, or the database.
export function generateAgentKey(): string {
  return AGENT_KEY_PREFIX + randomBytes(KEY_BYTES).toString('base64url');
}

// Salted SHA-256 of a raw key — the only form of a key that ever leaves the
// function. Fails loud on a missing salt (a silent '' salt would issue keys
// that a correctly-configured process can never validate).
export function hashApiKey(raw: string): string {
  const salt = process.env.AGENT_KEY_SALT;
  if (!salt) {
    throw new Error('AGENT_KEY_SALT is not set');
  }
  return createHash('sha256').update(`${salt}:${raw}`).digest('hex');
}
