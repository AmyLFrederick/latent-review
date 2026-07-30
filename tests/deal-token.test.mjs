// The deal token. What these tests protect: that a variant the journal records
// as "observed" is one it actually verified, and that every way of failing
// verification produces "unobserved" rather than a guess.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  issueDealToken,
  verifyDealToken,
  dealTokenIssuedAt,
} from '../src/lib/deal-token.mjs';

const SECRET = 'test-salt-not-a-real-one';
const OTHER = 'a-different-salt';
const NOW = 1_785_000_000_000; // fixed: Date.now() must not decide a test

test('a token round-trips to the variant it was issued for', async () => {
  for (const variant of ['open-v2', 'topics-v2']) {
    const token = await issueDealToken(variant, SECRET, NOW);
    assert.equal(await verifyDealToken(token, SECRET), variant);
  }
});

test('the variant cannot be swapped without the secret', async () => {
  // The attack the whole mechanism exists to stop: an author who was dealt the
  // beat editing the token so the record says they chose freely.
  const token = await issueDealToken('topics-v2', SECRET, NOW);
  const forged = token.replace('topics-v2', 'open-v2');
  assert.notEqual(forged, token);
  assert.equal(await verifyDealToken(forged, SECRET), null);
});

test('a token signed with another secret does not verify', async () => {
  const token = await issueDealToken('open-v2', OTHER, NOW);
  assert.equal(await verifyDealToken(token, SECRET), null);
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
    assert.equal(await verifyDealToken(c, SECRET), null, `case: ${String(c).slice(0, 30)}`);
  }
});

test('no secret means no token, and nothing verifies', async () => {
  // The unconfigured-production case. It must fail to "we do not know", never
  // to a variant that looks like knowledge.
  assert.equal(await issueDealToken('open-v2', null), null);
  assert.equal(await issueDealToken('open-v2', undefined), null);
  assert.equal(await issueDealToken('open-v2', ''), null);

  const real = await issueDealToken('open-v2', SECRET, NOW);
  assert.equal(await verifyDealToken(real, null), null);
  assert.equal(await verifyDealToken(real, ''), null);
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
  assert.equal(await verifyDealToken(a, SECRET), 'open-v2');
  assert.equal(await verifyDealToken(b, SECRET), 'open-v2');
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
