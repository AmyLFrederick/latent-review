// The tier badges (editors' spec, 2026-08-03). What these tests protect:
//
//   1. Every tier has a badge, and no badge names a tier that does not exist.
//   2. The ring encodes whose words — and encodes it symmetrically, because the
//      chart's claim is that the spectrum is a mirror.
//   3. Co-authorship stays ONE tier with ONE code, however many circles the
//      chart prints for it.
//   4. The edited variants are never set smaller than the relational ones.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  TIER_BADGES,
  badgeFor,
  badgeLabel,
  CO_AUTHORSHIP_CODE,
  CO_AUTHORSHIP_ORDERINGS,
  RING_AI,
  RING_HUMAN,
  BADGE_SUP_SIZE,
} from '../src/lib/tier-badges.mjs';
import { TIERS, TIER_CODES } from '../src/lib/site.ts';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('every tier has a badge, and every badge has a tier', () => {
  // Both directions. A tier with no badge renders an empty circle in a chart
  // about what marks mean; a badge with no tier is a mark for something the
  // record cannot store.
  assert.deepEqual(Object.keys(TIER_BADGES).sort(), [...TIER_CODES].sort());
  for (const tier of TIERS) {
    assert.ok(badgeFor(tier.code), `${tier.code} has no badge`);
  }
});

test('the ring encodes whose words, and the spectrum is a mirror', () => {
  // The AI half sage, the human half salmon, co-authorship split. Asserted as
  // the whole mapping rather than tier by tier: the property that matters is
  // the symmetry, and a single tier flipped to the wrong side still leaves six
  // correct ones.
  const rings = TIERS.map((t) => badgeFor(t.code).ring);
  assert.deepEqual(rings, ['ai', 'ai', 'ai', 'split', 'human', 'human', 'human']);
});

test('exactly one tier takes a split ring, and it is co-authorship', () => {
  const split = Object.entries(TIER_BADGES).filter(([, b]) => b.ring === 'split');
  assert.equal(split.length, 1);
  assert.equal(split[0][0], CO_AUTHORSHIP_CODE);
});

test('the two co-authorship orderings are one tier and one code', () => {
  // THE FAILURE THIS EXISTS FOR: the chart prints two circles, and a later
  // session reads two circles as two tiers and adds a `human-equals-ai` code.
  // There is one co-authorship tier, it is `ai-equals-human`, and both
  // orderings belong to it.
  assert.equal(CO_AUTHORSHIP_ORDERINGS.length, 2);
  assert.deepEqual(CO_AUTHORSHIP_ORDERINGS, ['A=H', 'H=A']);
  assert.ok(TIER_CODES.includes(CO_AUTHORSHIP_CODE));
  assert.ok(
    !TIER_CODES.includes('human-equals-ai'),
    'a second co-authorship code has appeared; the chart shows one tier twice, not two tiers'
  );
  assert.equal(
    TIERS.filter((t) => t.label.includes('=')).length,
    1,
    'co-authorship is one row in the tier table'
  );
});

test('the edited variants are never set smaller than the relational ones', () => {
  // Ruled explicitly: the edited badges carry more glyphs and the temptation is
  // to shrink them to fit, which would rank them below the led forms in a chart
  // whose whole claim is that the tiers are a spectrum and not a hierarchy.
  const edited = ['ai-human-editor', 'human-ai-editor'].map((c) => badgeFor(c).size);
  const relational = ['ai-human', 'human-ai'].map((c) => badgeFor(c).size);
  for (const e of edited) {
    for (const r of relational) {
      assert.ok(e >= r, `an edited badge is set at ${e} against a relational ${r}`);
    }
  }
  assert.deepEqual(edited, relational, 'the ruling is that they are the SAME size');

  // The superscript is proportionally large, with a legibility floor — the same
  // reasoning R-035 clause 3 applies to the tier notation's own superscripts.
  assert.ok(BADGE_SUP_SIZE >= 12, 'the superscript has fallen below the legibility floor');
});

test('the solo tiers are the largest, and only they are', () => {
  const solo = [badgeFor('ai').size, badgeFor('human').size];
  const rest = TIERS.filter((t) => !['ai', 'human'].includes(t.code)).map(
    (t) => badgeFor(t.code).size
  );
  assert.deepEqual(solo, [solo[0], solo[0]], 'the two solo badges are set alike');
  for (const size of rest) assert.ok(size < solo[0]);
});

test('a badge names its tier, never its picture', () => {
  // The accessible name is what a machine reader and a screen reader get. It
  // has to carry the record's own language — "circle with A dash H" describes
  // ink and tells a reader nothing about the piece.
  const tier = TIERS.find((t) => t.code === 'ai-human-editor');
  const name = badgeLabel(tier, 'A–H with a superscript e');
  assert.match(name, /AI \+ Human \(editor\)/);
  assert.match(name, /a human edited/);
  assert.match(name, /A–H with a superscript e/);
});

test('the badge renders as SVG with real text, not as an image', () => {
  // The house requirement: this journal is read by machines, and iconography a
  // machine cannot read withholds from half the readership. Checked against the
  // component source, because the property is structural — an <img> or a
  // background-image would satisfy any visual review and fail this one.
  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  assert.match(src, /<svg/, 'the badge is not an SVG');
  assert.match(src, /<text/, 'the notation is not real text');
  assert.match(src, /role="img"/);
  assert.match(src, /aria-label=\{accessibleName\}/);
  assert.ok(!/<img/.test(src), 'the badge renders an image');
  assert.ok(!/background-image/.test(src), 'the badge is drawn with a background image');
});

test('the ring colours are the ratified ones', () => {
  assert.equal(RING_AI, '#7d9153');
  assert.equal(RING_HUMAN, '#efa48f');
});
