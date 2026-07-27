import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isGift, isListed, listedSupporters, displayName } from '../src/lib/supporters.mjs';

const at = (iso) => new Date(iso);

test('the schema note in supporters.json is not a gift', () => {
  const raw = JSON.parse(readFileSync('src/data/supporters.json', 'utf8'));
  assert.ok(raw.length > 0, 'the file should carry its schema note');
  assert.equal(raw.filter(isGift).length, 0, 'no gifts recorded yet');
});

test('supporters.json never carries a giver’s private details', () => {
  // The file is public and permanent. This test is the guard that a future
  // hand does not paste in what the Stripe dashboard displays.
  const text = readFileSync('src/data/supporters.json', 'utf8');
  const raw = JSON.parse(text);
  const forbidden = ['email', 'amount', 'stripe', 'customer', 'payment_id', 'total'];
  for (const entry of raw.filter(isGift)) {
    for (const key of Object.keys(entry)) {
      assert.ok(
        ['name', 'tier', 'gift_date'].includes(key),
        `supporters.json may carry only name/tier/gift_date; found "${key}"`
      );
    }
  }
  for (const word of forbidden) {
    assert.ok(
      !text.toLowerCase().includes(`"${word}"`),
      `supporters.json must not carry a "${word}" field`
    );
  }
});

test('a Patron is listed for one year from the gift date, in UTC', () => {
  const p = { name: 'A', tier: 'patron', gift_date: '2026-08-01' };
  assert.equal(isListed(p, at('2026-08-01T00:00:00Z')), true, 'listed on the day');
  assert.equal(isListed(p, at('2027-07-31T23:59:59Z')), true, 'listed the day before the year is up');
  assert.equal(isListed(p, at('2027-08-01T00:00:00Z')), false, 'not listed once the year is up');
});

test('a Founding Supporter is listed for the life of the journal', () => {
  // A permanent commitment: this must never come back false, however far out
  // the clock is wound. The rotation applies to Patron entries only.
  const f = { name: 'B', tier: 'founding', gift_date: '2026-08-01' };
  assert.equal(isListed(f, at('2026-08-01T00:00:00Z')), true);
  assert.equal(isListed(f, at('2126-08-01T00:00:00Z')), true, 'still listed a century on');
});

test('a leap-day gift does not fall out early or linger', () => {
  const p = { name: 'C', tier: 'patron', gift_date: '2028-02-29' };
  assert.equal(isListed(p, at('2029-02-27T00:00:00Z')), true);
  assert.equal(isListed(p, at('2029-03-02T00:00:00Z')), false);
});

test('anonymous givers are counted, not named', () => {
  assert.equal(displayName({ name: null }), 'Anonymous');
  assert.equal(displayName({ name: '   ' }), 'Anonymous');
  assert.equal(displayName({ name: 'Ada' }), 'Ada');

  const now = at('2026-09-01T00:00:00Z');
  const listed = listedSupporters(
    [{ name: null, tier: 'patron', gift_date: '2026-08-01' }],
    now
  );
  assert.equal(listed.total, 1, 'an anonymous gift still counts');
});

test('listing groups by tier, newest first, and drops expired Patrons', () => {
  const now = at('2027-01-01T00:00:00Z');
  const listed = listedSupporters(
    [
      { _comment: ['schema note'] },
      { name: 'Old Patron', tier: 'patron', gift_date: '2025-06-01' },
      { name: 'New Patron', tier: 'patron', gift_date: '2026-12-01' },
      { name: 'Mid Patron', tier: 'patron', gift_date: '2026-06-01' },
      { name: 'Founder', tier: 'founding', gift_date: '2024-01-01' },
    ],
    now
  );
  assert.deepEqual(listed.patron.map((e) => e.name), ['New Patron', 'Mid Patron']);
  assert.deepEqual(listed.founding.map((e) => e.name), ['Founder']);
  assert.equal(listed.total, 3);
});

test('an unrecognised tier is not listed', () => {
  assert.equal(isListed({ name: 'X', tier: 'benefactor', gift_date: '2026-08-01' }, at('2026-08-02T00:00:00Z')), false);
});
