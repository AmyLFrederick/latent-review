// The chained-code grammar (R-035 clause 4), and the gap R-035 clause 6 recorded.
//
// What these tests protect, in order of how much it would cost to lose:
//
//   1. ADD-ONLY. The seven base codes still produce exactly the labels TIERS
//      carries. If this breaks, every published piece's authorship line moves.
//   2. The numbering rules are ENFORCED, not merely expressible. A gate that
//      accepts a malformed chain publishes a label nobody checked.
//   3. An unknown code resolves to null, never to a confident "Not declared".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatTierCode,
  isChainedTierCode,
  parseTierCode,
  validateTierCode,
  splitLabelSuperscripts,
  MAX_PARTY_NUMBER,
} from '../src/lib/tier-codes.mjs';
import { TIERS, tierLabel, tierDescription } from '../src/lib/site.ts';

// --- 1. The add-only guarantee ---------------------------------------------

test('THE INVARIANT — every base code produces exactly the label TIERS carries', () => {
  // This is what makes the grammar an extension rather than a second system
  // standing beside the first. The seven are not special-cased anywhere in
  // tier-codes.mjs; they are what the grammar yields when nothing repeats.
  for (const tier of TIERS) {
    assert.equal(
      formatTierCode(tier.code),
      tier.label,
      `base code ${tier.code} no longer formats to its own label`
    );
  }
});

test('every base code is valid, and none of them chains', () => {
  for (const tier of TIERS) {
    assert.equal(validateTierCode(tier.code), null, `${tier.code} was refused`);
    assert.equal(isChainedTierCode(tier.code), false, `${tier.code} reads as chained`);
  }
});

test('no base code carries a number, so numbered forms cannot collide', () => {
  for (const tier of TIERS) {
    assert.ok(!/\d/.test(tier.code), `base code ${tier.code} acquired a digit`);
  }
});

// --- 2. Chained forms ------------------------------------------------------

test('the ruling worked example formats as the ruling writes it', () => {
  // R-035's own example, which is the one case the ruling spells out end to end.
  assert.equal(formatTierCode('ai-1-equals-human-ai-2-editor'), 'AI¹ = Human + AI² (editor)');
  assert.equal(isChainedTierCode('ai-1-equals-human-ai-2-editor'), true);
});

test('R-020 same-kind relations are expressible and take no numbers', () => {
  // A same-kind relation is parties at ONE moment, not a chain — so `AI = AI`
  // is valid unnumbered, and numbering it is an error (see the next test).
  assert.equal(formatTierCode('ai-equals-ai'), 'AI = AI');
  assert.equal(formatTierCode('human-human-editor'), 'Human + Human (editor)');
  assert.equal(isChainedTierCode('ai-equals-ai'), false);
});

test('longer chains compose without special-casing', () => {
  assert.equal(formatTierCode('ai-1-human-ai-2'), 'AI¹ + Human + AI²');
  assert.equal(formatTierCode('human-1-ai-human-2-editor'), 'Human¹ + AI + Human² (editor)');
});

// --- 3. The numbering rules of R-035 clause 2 ------------------------------

test('a number is refused where the label does not chain', () => {
  // "Numbers appear only in chained labels" — both halves of clause 2 are
  // conditions, and this is the first.
  assert.match(validateTierCode('ai-1-equals-human'), /does not chain/);
  assert.match(validateTierCode('ai-1-equals-ai-2'), /does not chain/);
});

test('a number is refused on a kind that appears only once', () => {
  // "...and only when a kind repeats" — the second half. AI chains here and is
  // numbered, but appears once. Chosen so THIS rule is the one that fires:
  // a case where the unnumbered-repeat rule also applies would pass the
  // assertion while proving something else.
  assert.match(validateTierCode('ai-1-human-human-2-editor'), /appears only once/);
});

test('a repeated kind in a chain MUST be numbered', () => {
  // The failure this prevents is the one the ruling names: a byline that cannot
  // say which AI is which.
  assert.match(validateTierCode('ai-equals-human-ai-editor'), /without numbering/);
});

test('numbers run in order of appearance', () => {
  assert.match(validateTierCode('ai-2-equals-human-ai-1-editor'), /out of order/);
});

test('party numbers are bounded rather than unbounded', () => {
  // A work that passed through eleven hands of one kind has outgrown a byline,
  // and a number with no ceiling would index past the superscript table and
  // format as "undefined" inside an authorship label.
  assert.match(validateTierCode('ai-99-equals-human-ai-2'), /out of range/);
  assert.match(
    validateTierCode(`ai-${MAX_PARTY_NUMBER + 1}-human-ai-2`),
    /out of range/,
    'the ceiling is not enforced at its own boundary'
  );
});

// --- 4. Malformed input is refused, never guessed at ------------------------

test('malformed codes are refused with a reason, not silently repaired', () => {
  const cases = [
    ['', /non-empty/],
    ['robot-human', /expected "ai" or "human"/],
    ['ai-editor-human', /must end the code/],
    ['AI-HUMAN', /lowercase/],
    ['ai--human', /malformed/],
    ['ai-equals', /no second party/],
    ['-ai-human', /malformed/],
  ];
  for (const [code, pattern] of cases) {
    const err = validateTierCode(code);
    assert.notEqual(err, null, `"${code}" was accepted and should not be`);
    assert.match(err, pattern);
  }
});

test('parse never throws on hostile input', () => {
  // The schema gate calls this on whatever a frontmatter file contains.
  for (const input of [null, undefined, 42, {}, [], '-', '---', 'a'.repeat(500)]) {
    const r = parseTierCode(input);
    assert.equal(typeof r.ok, 'boolean');
  }
});

// --- 5. The resolvers, which are what render paths actually call ------------

test('tierLabel resolves both the seven and a chain', () => {
  assert.equal(tierLabel('ai-human'), 'AI + Human');
  assert.equal(tierLabel('ai-1-equals-human-ai-2-editor'), 'AI¹ = Human + AI² (editor)');
});

test('THE FIX — an unknown code resolves to null, not to a confident label', () => {
  // The bug R-035 clause 6 recorded: `TIER_LABELS[code] ?? 'Not declared'` turned
  // anything outside the seven into a claim that no tier was declared. The
  // resolver returns null so the CALLER decides, once, visibly.
  assert.equal(tierLabel('ai-equals-human-ai-editor'), null); // parses, but unnumbered
  assert.equal(tierLabel('not-a-code'), null);
  assert.equal(tierLabel(undefined), null);
  assert.equal(tierLabel(''), null);
});

test('a chained label carries no description, and that is not an error', () => {
  assert.equal(tierDescription('ai-human'), 'AI led, with meaningful human contributions to the work and ideas');
  assert.equal(tierDescription('ai-1-equals-human-ai-2-editor'), '');
});

// --- 6. Splitting a label for markup (R-035 clause 3) ----------------------

test('an unnumbered label splits to a single text run and gains nothing', () => {
  // All seven base tiers take this path. If it ever produced markup for them,
  // every existing published label would change shape.
  for (const tier of TIERS) {
    assert.deepEqual(
      splitLabelSuperscripts(tier.label),
      [{ text: tier.label }],
      `base label "${tier.label}" was split`
    );
  }
});

test('a numbered label splits into text runs and party numbers', () => {
  assert.deepEqual(splitLabelSuperscripts('AI¹ = Human + AI² (editor)'), [
    { text: 'AI' },
    { sup: '1' },
    { text: ' = Human + AI' },
    { sup: '2' },
    { text: ' (editor)' },
  ]);
});

test('consecutive superscripts read as ONE number, not two', () => {
  // ¹⁰ is ten. Splitting it into a one beside a zero would render AI¹⁰ as two
  // parties that do not exist.
  assert.deepEqual(splitLabelSuperscripts('AI¹⁰'), [{ text: 'AI' }, { sup: '10' }]);
});

test('splitting a label round-trips its visible characters', () => {
  // Nothing is dropped and nothing is invented: the parts, reassembled, are the
  // label again. This is what keeps the markup path from quietly editing copy.
  const label = 'Human¹ + AI + Human² (editor)';
  const rebuilt = splitLabelSuperscripts(label)
    .map((p) => (p.sup ? { 1: '¹', 2: '²' }[Number(p.sup)] : p.text))
    .join('');
  assert.equal(rebuilt, label);
});

test('splitting is safe on empty and non-string input', () => {
  for (const input of ['', null, undefined, 7]) {
    assert.deepEqual(splitLabelSuperscripts(input), []);
  }
});
