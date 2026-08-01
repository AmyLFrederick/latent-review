// The deal token. What these tests protect: that a variant the journal records
// as "observed" is one it actually verified, and that every way of failing
// verification produces "unobserved" rather than a guess.
//
// EVERY verify call below passes an explicit `now`, and that is not decoration.
// When the maximum age landed on 2026-07-31, NOW here (≈2026-07-25) was still
// inside the fourteen-day window, so the suite went on passing — and would have
// begun failing on its own around 2026-08-08, with nothing in the repository
// having changed. Worse, the tests asserting null for a bad secret or a bad
// shape would have gone on passing for the WRONG REASON: expiry rather than the
// thing each one names. Threading the fixed clock through keeps each test
// testing what it says it tests, and honours this file's own rule that
// Date.now() must not decide a test.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  issueDealToken,
  verifyDealToken,
  dealTokenIssuedAt,
  DEAL_TOKEN_MAX_AGE_MS,
} from '../src/lib/deal-token.mjs';

const SECRET = 'test-salt-not-a-real-one';
const OTHER = 'a-different-salt';
const NOW = 1_785_000_000_000; // fixed: Date.now() must not decide a test

test('a token round-trips to the variant it was issued for', async () => {
  for (const variant of ['open-v2', 'topics-v2']) {
    const token = await issueDealToken(variant, SECRET, NOW);
    assert.equal(await verifyDealToken(token, SECRET, { now: NOW }), variant);
  }
});

test('the variant cannot be swapped without the secret', async () => {
  // The attack the whole mechanism exists to stop: an author who was dealt the
  // beat editing the token so the record says they chose freely.
  const token = await issueDealToken('topics-v2', SECRET, NOW);
  const forged = token.replace('topics-v2', 'open-v2');
  assert.notEqual(forged, token);
  assert.equal(await verifyDealToken(forged, SECRET, { now: NOW }), null);
});

test('a token signed with another secret does not verify', async () => {
  const token = await issueDealToken('open-v2', OTHER, NOW);
  assert.equal(await verifyDealToken(token, SECRET, { now: NOW }), null);
});

test('every malformed shape returns null rather than throwing', async () => {
  const cases = [
    null,
    undefined,
    '',
    'garbage',
    'v1.open-v2',                       // too few parts
    'v1.open-v2.1785000000.abc.mac.x',  // too many parts
    'v2.open-v2.1785000000.abc.mac',    // unknown version
    'v1.gospel-v2.1785000000.abc.mac',  // unknown variant
    'v1.open-v2.notanumber.abc.mac',    // bad timestamp
    `v1.open-v2.1785000000.abc.${'x'.repeat(600)}`, // oversized
    12345,
    {},
  ];
  for (const c of cases) {
    assert.equal(await verifyDealToken(c, SECRET, { now: NOW }), null, `case: ${String(c).slice(0, 30)}`);
  }
});

test('no secret means no token, and nothing verifies', async () => {
  // The unconfigured-production case. It must fail to "we do not know", never
  // to a variant that looks like knowledge.
  assert.equal(await issueDealToken('open-v2', null), null);
  assert.equal(await issueDealToken('open-v2', undefined), null);
  assert.equal(await issueDealToken('open-v2', ''), null);

  const real = await issueDealToken('open-v2', SECRET, NOW);
  assert.equal(await verifyDealToken(real, null, { now: NOW }), null);
  assert.equal(await verifyDealToken(real, '', { now: NOW }), null);
});

test('signing an unknown variant throws rather than minting a bad token', async () => {
  await assert.rejects(
    () => issueDealToken('open-v1', SECRET, NOW),
    /refusing to sign an unknown variant/
  );
});

test('two deals of the same variant are different strings', async () => {
  // Same variant, same millisecond — the nonce is what keeps them distinct, so
  // a token is never a stable identifier for "the open brief".
  const a = await issueDealToken('open-v2', SECRET, NOW);
  const b = await issueDealToken('open-v2', SECRET, NOW);
  assert.notEqual(a, b);
  assert.equal(await verifyDealToken(a, SECRET, { now: NOW }), 'open-v2');
  assert.equal(await verifyDealToken(b, SECRET, { now: NOW }), 'open-v2');
});

test('the token carries a readable issue time', async () => {
  const token = await issueDealToken('topics-v2', SECRET, NOW);
  const issued = dealTokenIssuedAt(token);
  assert.ok(issued instanceof Date);
  // Second precision, so compare at that resolution.
  assert.equal(Math.floor(issued.getTime() / 1000), Math.floor(NOW / 1000));
  assert.equal(dealTokenIssuedAt('garbage'), null);
});

test('a token is URL- and JSON-safe', async () => {
  // It travels in a JSON body and may be pasted by a human; base64url keeps it
  // free of characters that would need escaping in either.
  const token = await issueDealToken('open-v2', SECRET, NOW);
  assert.match(token, /^[A-Za-z0-9._-]+$/);
  assert.equal(JSON.parse(JSON.stringify({ token })).token, token);
});

// --- The maximum age, ruled by the editors 2026-07-31 ----------------------
// What these protect: that a stale token stops proving anything, that it stops
// QUIETLY rather than by refusing a submission, and that the check is on by
// default rather than something a call site has to remember to ask for.

const DAY = 24 * 60 * 60 * 1000;

test('a token inside the window still proves its variant', async () => {
  const token = await issueDealToken('open-v2', SECRET, NOW);
  const almost = NOW + DEAL_TOKEN_MAX_AGE_MS - 60_000; // one minute short of the edge
  assert.equal(await verifyDealToken(token, SECRET, { now: almost }), 'open-v2');
});

test('a token past the window proves nothing', async () => {
  const token = await issueDealToken('topics-v2', SECRET, NOW);
  const stale = NOW + DEAL_TOKEN_MAX_AGE_MS + 60_000;
  assert.equal(await verifyDealToken(token, SECRET, { now: stale }), null);
});

test('the boundary is inclusive — exactly fourteen days old still verifies', async () => {
  // Pinned deliberately. `age > maxAgeMs` is a strict comparison, and a later
  // refactor to `>=` would silently move the edge by a second.
  const token = await issueDealToken('open-v2', SECRET, NOW);
  const exactly = NOW + DEAL_TOKEN_MAX_AGE_MS;
  assert.equal(await verifyDealToken(token, SECRET, { now: exactly }), 'open-v2');
});

test('fourteen days is the ruled number, not an accident of arithmetic', async () => {
  assert.equal(DEAL_TOKEN_MAX_AGE_MS, 14 * DAY);
});

test('THE CHECK IS ON BY DEFAULT — a two-argument call expires a stale token', async () => {
  // The whole point of the fix. agent-submit.mts calls verifyDealToken with two
  // arguments; if the expiry were opt-in, that call site would be exactly as
  // exposed as it was before. Both directions are asserted against the real
  // clock, so this cannot rot the way a fixed NOW would.
  const fresh = await issueDealToken('open-v2', SECRET, Date.now());
  assert.equal(await verifyDealToken(fresh, SECRET), 'open-v2');

  const stale = await issueDealToken('open-v2', SECRET, Date.now() - 30 * DAY);
  assert.equal(await verifyDealToken(stale, SECRET), null);
});

test('a future-dated token is refused beyond the skew allowance', async () => {
  // Not reachable without the secret — the door never issues one. It exists so
  // the expiry cannot be defeated by a forged far-future date if DOOR_DEAL_SALT
  // ever leaks.
  const token = await issueDealToken('open-v2', SECRET, NOW);
  assert.equal(await verifyDealToken(token, SECRET, { now: NOW - 60 * 60 * 1000 }), null);
});

test('ordinary clock disagreement does not refuse a good token', async () => {
  const token = await issueDealToken('topics-v2', SECRET, NOW);
  // Two minutes of edge-vs-function drift, inside the five-minute allowance.
  assert.equal(await verifyDealToken(token, SECRET, { now: NOW - 2 * 60 * 1000 }), 'topics-v2');
});

test('an expired token is indistinguishable from a forged one', async () => {
  // The file's doctrine: every failure means "not observed", and no caller can
  // tell which kind of failure it was.
  const expired = await issueDealToken('open-v2', SECRET, NOW);
  const forged = (await issueDealToken('open-v2', OTHER, NOW));
  const stale = NOW + DEAL_TOKEN_MAX_AGE_MS + 1000;
  assert.equal(await verifyDealToken(expired, SECRET, { now: stale }), null);
  assert.equal(await verifyDealToken(forged, SECRET, { now: NOW }), null);
});

test('a caller that genuinely wants no expiry must ask for it', async () => {
  const token = await issueDealToken('open-v2', SECRET, NOW);
  const ancient = NOW + 400 * DAY;
  assert.equal(await verifyDealToken(token, SECRET, { now: ancient }), null);
  assert.equal(
    await verifyDealToken(token, SECRET, { now: ancient, maxAgeMs: Infinity }),
    'open-v2'
  );
});

test('the desk can still read the age of a token that no longer verifies', async () => {
  // dealTokenIssuedAt is inspection, not enforcement, and expiry does not blind
  // it — a desk looking at a refused deal can still see how old it was.
  const token = await issueDealToken('topics-v2', SECRET, NOW);
  const stale = NOW + DEAL_TOKEN_MAX_AGE_MS + 1000;
  assert.equal(await verifyDealToken(token, SECRET, { now: stale }), null);
  assert.equal(Math.floor(dealTokenIssuedAt(token).getTime() / 1000), Math.floor(NOW / 1000));
});

test('a token for a RETIRED brief still verifies', () => {
  // topics-v2 stopped being dealt on 2026-08-01, and tokens issued before that
  // are still in agents' hands until they age out. Voiding them would make a
  // piece's assignment unverifiable through no fault of its author — the one
  // thing the deal token exists to prevent.
  return issueDealToken('topics-v2', SECRET, NOW).then(async (token) => {
    assert.equal(await verifyDealToken(token, SECRET, { now: NOW }), 'topics-v2');
  });
});
