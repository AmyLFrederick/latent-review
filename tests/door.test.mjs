// The assignment desk (R-033). What these tests are actually protecting:
// frozen texts that several surfaces reproduce, a coin flip that must stay a
// coin flip, and a number that now lives in four places and has already moved
// once.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  BRIEFS,
  BRIEF_VARIANTS,
  brief,
  deal,
  pasteBlock,
  assertBriefsMatchContract,
  WHY_PARAGRAPHS,
} from '../src/lib/door.mjs';
import { PIECE_WORDS } from '../src/lib/agent-contract.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('the frozen briefs state the contract’s word bounds', () => {
  assert.equal(assertBriefsMatchContract(), true);
});

test('the guard actually fires when the prose and the contract disagree', () => {
  // Without this, the test above passes for the wrong reason forever.
  assert.throws(
    () => assertBriefsMatchContract({ min: 500, max: 5000 }),
    /states "500 to 3,000 words" but the contract says "500 to 5,000 words"/
  );
});

test('the endpoint’s word bounds match the contract', () => {
  // agent-submit.mts deliberately copies the numbers rather than importing
  // across the tree into site source (a deploy risk for a constant). This is
  // the check that makes the copy safe.
  const src = readFileSync(repoPath('netlify/functions/agent-submit.mts'), 'utf8');
  const min = Number(src.match(/const WORD_MIN = (\d+);/)?.[1]);
  const max = Number(src.match(/const WORD_MAX = (\d+);/)?.[1]);
  assert.equal(min, PIECE_WORDS.min, 'agent-submit.mts WORD_MIN disagrees with the contract');
  assert.equal(max, PIECE_WORDS.max, 'agent-submit.mts WORD_MAX disagrees with the contract');
});

test('both variants exist and are non-trivial', () => {
  assert.deepEqual(BRIEF_VARIANTS, ['open-v2', 'topics-v2']);
  for (const v of BRIEF_VARIANTS) {
    assert.ok(BRIEFS[v].length > 500, `${v} is suspiciously short`);
    assert.equal(brief(v), BRIEFS[v]);
  }
});

test('an unknown variant throws rather than falling back', () => {
  // A silent fallback would deal open-v2 to everyone the moment a caller typo'd
  // the variant, and the 50/50 would be gone with nothing in the logs.
  assert.throws(() => brief('open-v1'), /unknown brief variant/);
  assert.throws(() => brief(undefined), /unknown brief variant/);
});

test('the deal is a coin flip, and the boundary lands where it should', () => {
  assert.equal(deal(() => 0), 'open-v2');
  assert.equal(deal(() => 0.499999), 'open-v2');
  assert.equal(deal(() => 0.5), 'topics-v2');
  assert.equal(deal(() => 0.999999), 'topics-v2');
});

test('a long run of deals stays near even', () => {
  // Deterministic sequence, not randomness: this asserts the picker divides the
  // interval evenly, which is the property that makes the measurement honest.
  let i = 0;
  const counts = { 'open-v2': 0, 'topics-v2': 0 };
  for (let n = 0; n < 10_000; n++) counts[deal(() => (i++ % 10_000) / 10_000)]++;
  assert.equal(counts['open-v2'], 5000);
  assert.equal(counts['topics-v2'], 5000);
});

test('the paste block carries the dealt brief and asks for what the desk needs', () => {
  for (const v of BRIEF_VARIANTS) {
    const block = pasteBlock(v);
    assert.ok(block.includes(BRIEFS[v]), `${v} paste block does not contain its brief verbatim`);
    // The desk cannot file a piece without these; the wrapper must ask.
    assert.match(block, /provenance statement/);
    assert.match(block, /model version/);
    assert.match(block, /give the finished piece to your human/);
  }
});

test('the paste block never leaks the variant the writer was not dealt', () => {
  assert.ok(!pasteBlock('open-v2').includes('This invitation names subjects on purpose'));
  assert.ok(!pasteBlock('topics-v2').includes('Your subject is yours.'));
});

test('the disclosure page’s text is present and says what R-033 clause 5 requires', () => {
  const text = WHY_PARAGRAPHS.join(' ');
  assert.match(text, /at random/);
  assert.match(text, /always disclosed/);
  assert.ok(WHY_PARAGRAPHS.length >= 5);
});
