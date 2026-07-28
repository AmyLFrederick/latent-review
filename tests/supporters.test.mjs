import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isGift,
  isListed,
  listedSupporters,
  displayName,
  listingSentence,
  listingExpiry,
  tierFor,
  isTierOpen,
  SUPPORTER_TIERS,
  SUPPORTER_TIER_KEYS,
  SUPPORTER_WINDOW_CLOSES_AT_ISSUE,
  SUPPORTER_LINKS,
} from '../src/lib/supporters.mjs';

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

test('every recorded gift in supporters.json carries a tier we know', () => {
  // The guard above proves an unknown tier is not LISTED. This proves no gift
  // in the file CARRIES one — the failure that would otherwise be found by the
  // giver rather than by the suite.
  const raw = JSON.parse(readFileSync('src/data/supporters.json', 'utf8'));
  for (const entry of raw.filter(isGift)) {
    assert.ok(
      SUPPORTER_TIER_KEYS.includes(entry.tier),
      `supporters.json carries tier "${entry.tier}", which is not one of ${SUPPORTER_TIER_KEYS.join('/')}`
    );
  }
});

test('the ladder is the six ruled tiers, in order, at the ruled durations', () => {
  // The commercial commitment itself. If this fails, someone changed what the
  // journal promised people who gave it money.
  assert.deepEqual(
    SUPPORTER_TIERS.map((t) => [t.key, t.threshold, t.listing]),
    [
      ['founding', '$50,000', 'permanent'],
      ['benefactor', '$20,000', 10],
      ['patron', '$5,000', 3],
      ['sustainer', '$1,000', 1],
      ['friend', '$250', 'none'],
      ['support', '$2', 'none'],
    ]
  );
});

test('every key in SUPPORTER_LINKS is a tier we know', () => {
  // Catches the unrecognised key. A link filed under "patrons" is a link nobody
  // can reach, and it fails nothing on its own: the page looks up by real tier
  // key, finds nothing, and renders a Patron row with no way to give at it.
  for (const key of Object.keys(SUPPORTER_LINKS)) {
    assert.ok(
      SUPPORTER_TIER_KEYS.includes(key),
      `SUPPORTER_LINKS has "${key}", which is not a tier — a link under an ` +
        'unrecognised key is a link no row will ever render'
    );
  }
});

test('the tiers with no link are exactly Benefactor and Founding Supporter', () => {
  // The half that costs money, stated in the language of the actual harm: this
  // fails when a tier that should be givable has no door.
  //
  // IT NAMES THESE TWO FOR ONE REASON — a $20,000 minimum cannot exist under
  // Stripe's $10,000 maximum on customer-chooses links, so Benefactor and
  // Founding Supporter are arranged by conversation instead. That is a fact
  // about today's commercial state, not a permanent property of those tiers.
  // WHEN THE CAP IS RAISED AND THE LINKS ARE ADDED, THIS TEST IS UPDATED, NOT
  // DELETED — it encodes what the journal currently offers, the same way the
  // ladder test encodes what it currently promises.
  const withoutLink = SUPPORTER_TIERS.filter((t) => !SUPPORTER_LINKS[t.key]).map((t) => t.key);
  assert.deepEqual(
    withoutLink,
    ['founding', 'benefactor'],
    'a tier with no link is a tier a giver cannot give at — if that is now ' +
      'intended for a different set of tiers, update this list and say why'
  );
});

test('each listed tier runs for its own duration, to the day, in UTC', () => {
  const cases = [
    { tier: 'sustainer', lastDay: '2027-07-31T23:59:59Z', over: '2027-08-01T00:00:00Z' },
    { tier: 'patron', lastDay: '2029-07-31T23:59:59Z', over: '2029-08-01T00:00:00Z' },
    { tier: 'benefactor', lastDay: '2036-07-31T23:59:59Z', over: '2036-08-01T00:00:00Z' },
  ];
  for (const c of cases) {
    const gift = { name: 'A', tier: c.tier, gift_date: '2026-08-01' };
    assert.equal(isListed(gift, at('2026-08-01T00:00:00Z')), true, `${c.tier}: listed on the day`);
    assert.equal(isListed(gift, at(c.lastDay)), true, `${c.tier}: listed the day before it is up`);
    assert.equal(isListed(gift, at(c.over)), false, `${c.tier}: not listed once it is up`);
  }
});

test('a Founding Supporter is listed for the life of the journal', () => {
  // A permanent commitment: this must never come back false, however far out
  // the clock is wound. Every other listing rotates; this one does not.
  const f = { name: 'B', tier: 'founding', gift_date: '2026-08-01' };
  assert.equal(isListed(f, at('2026-08-01T00:00:00Z')), true);
  assert.equal(isListed(f, at('2126-08-01T00:00:00Z')), true, 'still listed a century on');
});

test('the unlisted tiers are never listed, however recent the gift', () => {
  // Support and Friend are not listed at all — and per the schema note they
  // are never recorded in this file either. Both guards, because the first is
  // what the page relies on if the second is ever broken by hand.
  for (const tier of ['support', 'friend']) {
    const g = { name: 'C', tier, gift_date: '2026-08-01' };
    assert.equal(isListed(g, at('2026-08-01T00:00:00Z')), false, `${tier} is not listed`);
    assert.equal(isListed(g, at('2026-08-02T00:00:00Z')), false, `${tier} is not listed the next day`);
  }
});

test('a leap-day gift rolls forward at every duration, never back', () => {
  // 29 February does not exist in a non-leap target year. It rolls FORWARD to
  // 1 March, so a leap-day giver gets at most one extra day of listing and
  // never one day fewer. The direction is deliberate.
  assert.equal(listingExpiry('2028-02-29', 1).toISOString(), '2029-03-01T00:00:00.000Z');
  assert.equal(listingExpiry('2028-02-29', 3).toISOString(), '2031-03-01T00:00:00.000Z');
  assert.equal(listingExpiry('2028-02-29', 10).toISOString(), '2038-03-01T00:00:00.000Z');

  // The exact case, unreachable under this ladder because none of 1/3/10 is
  // divisible by four — tested anyway, because a future tier at 4 or 20 years
  // would reach it and it is a different path through the same line.
  assert.equal(listingExpiry('2028-02-29', 4).toISOString(), '2032-02-29T00:00:00.000Z');

  // And through isListed, at the one duration a leap-day gift can hit today.
  const p = { name: 'D', tier: 'patron', gift_date: '2028-02-29' };
  assert.equal(isListed(p, at('2031-02-28T00:00:00Z')), true);
  assert.equal(isListed(p, at('2031-03-02T00:00:00Z')), false);
});

test('a listing sentence is rendered from the duration, never typed', () => {
  assert.equal(listingSentence(tierFor('founding')), 'listed for the life of the journal');
  assert.equal(listingSentence(tierFor('benefactor')), 'listed for ten years from the date of the gift');
  assert.equal(listingSentence(tierFor('patron')), 'listed for three years from the date of the gift');
  // Singular, not "one years".
  assert.equal(listingSentence(tierFor('sustainer')), 'listed for one year from the date of the gift');
  assert.equal(listingSentence(tierFor('friend')), 'not listed');
  assert.equal(listingSentence(tierFor('support')), 'not listed');
});

test('a duration with no number word fails loudly rather than rendering nonsense', () => {
  // A tier added at five years should break the build, not publish "listed for
  // undefined years" to someone who gave $5,000.
  assert.throws(
    () => listingSentence({ key: 'invented', listing: 5 }),
    /No number word for a 5-year listing/
  );
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

test('listing groups in ladder order, newest first, dropping expired and empty', () => {
  const now = at('2027-01-01T00:00:00Z');
  const listed = listedSupporters(
    [
      { _comment: ['schema note'] },
      { name: 'Lapsed Sustainer', tier: 'sustainer', gift_date: '2025-06-01' },
      { name: 'New Patron', tier: 'patron', gift_date: '2026-12-01' },
      { name: 'Mid Patron', tier: 'patron', gift_date: '2026-06-01' },
      { name: 'Current Sustainer', tier: 'sustainer', gift_date: '2026-11-01' },
      { name: 'Founder', tier: 'founding', gift_date: '2024-01-01' },
    ],
    now
  );

  // Ladder order, highest tier first — and Benefactor, which nobody holds,
  // does not render as an empty section.
  assert.deepEqual(listed.groups.map((g) => g.tier.key), ['founding', 'patron', 'sustainer']);
  assert.deepEqual(listed.groups[0].entries.map((e) => e.name), ['Founder']);
  assert.deepEqual(listed.groups[1].entries.map((e) => e.name), ['New Patron', 'Mid Patron']);
  assert.deepEqual(listed.groups[2].entries.map((e) => e.name), ['Current Sustainer']);
  assert.equal(listed.total, 4, 'the lapsed Sustainer is not counted');
});

test('one giver who gave twice appears in both sections, by design', () => {
  // SA-7: each gift is its own entry and there is no dedup machinery. An
  // upgraded giver's earlier listing runs out on its own clock while the later
  // one continues, and showing them in two sections meanwhile is accurate.
  const now = at('2027-01-01T00:00:00Z');
  const listed = listedSupporters(
    [
      { name: 'Ada Lovelace', tier: 'sustainer', gift_date: '2026-09-01' },
      { name: 'Ada Lovelace', tier: 'patron', gift_date: '2026-12-01' },
    ],
    now
  );
  assert.deepEqual(listed.groups.map((g) => g.tier.key), ['patron', 'sustainer']);
  assert.equal(listed.total, 2, 'two gifts, counted twice — the file is gifts, not givers');
});

test('the founding window closes at Issue No. 104, and only that tier closes', () => {
  // A commercial commitment with a date on it, so the number is asserted
  // rather than trusted. Amended from 52 by the editors, 2026-07-28.
  assert.equal(SUPPORTER_WINDOW_CLOSES_AT_ISSUE, 104);
  assert.equal(tierFor('founding').closes_at_issue, 104);

  // Five of six carry no closing issue at all — availability and listing
  // duration are separate axes, and only one tier is time-bound.
  const timeBound = SUPPORTER_TIERS.filter((t) => typeof t.closes_at_issue === 'number');
  assert.deepEqual(timeBound.map((t) => t.key), ['founding']);
});

test('the window boundary is exclusive, named at 103 / 104 / 105', () => {
  // "Open to gifts made before Issue No. 104": a gift made while 103 is the
  // newest issue is before 104; one made once 104 is out is not. The boundary
  // is spelled out here because an off-by-one in a $50,000 commitment is worth
  // asserting rather than inferring from a comparison operator.
  const founding = tierFor('founding');
  assert.equal(isTierOpen(founding, 0), true, 'open before any issue exists');
  assert.equal(isTierOpen(founding, 103), true, 'open while 103 is the newest issue');
  assert.equal(isTierOpen(founding, 104), false, 'closed once Issue 104 publishes');
  assert.equal(isTierOpen(founding, 105), false, 'and stays closed');
});

test('the tiers with no closing issue are open indefinitely', () => {
  for (const key of ['benefactor', 'patron', 'sustainer', 'friend', 'support']) {
    assert.equal(isTierOpen(tierFor(key), 0), true, `${key} open at issue 0`);
    assert.equal(isTierOpen(tierFor(key), 10_000), true, `${key} still open at issue 10,000`);
  }
});

test('an unrecognised tier is not listed', () => {
  // Repointed from "benefactor", which the amendment made a real tier. The
  // case matters more now, not less: with six keys, a typo in a hand-edited
  // data file would silently unlist a giver who paid $20,000 to be listed.
  assert.equal(isListed({ name: 'X', tier: 'sponsor', gift_date: '2026-08-01' }, at('2026-08-02T00:00:00Z')), false);
});
