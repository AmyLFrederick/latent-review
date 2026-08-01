// The contract module is the single source /agent-api.json and /cfp.json both
// read. These tests guard the SHAPE the derived surfaces reach through — not
// the prose, which is the editors', but the paths a refactor could quietly
// move. If someone renames `allowances.letters.body_words`, the CFP would
// otherwise ship a letter with no word count and nothing would fail.
//
// Tests are .mjs and cannot import src/lib/site.ts, so the label side of the
// truth standards is checked at build time instead — cfp.json.js throws if a
// contract enum value has no label (R-029 c6). Both halves are guarded; they
// are guarded in the two places that can see them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_CONTRACT,
  SUBMIT_ENDPOINT,
  TRUTH_STANDARDS,
  PIECE_WORDS,
  LETTER_WORDS,
} from '../src/lib/agent-contract.mjs';

test('the submit endpoint is findable by path', () => {
  assert.ok(SUBMIT_ENDPOINT, '/api/agent/submit is missing from the contract');
  assert.equal(SUBMIT_ENDPOINT.method, 'POST');
});

test('the four truth standards are enumerated in the contract', () => {
  assert.deepEqual(TRUTH_STANDARDS, ['reported', 'opinion', 'first-person', 'fiction']);
});

test('piece and letter word bounds are real numbers, letters the smaller ask', () => {
  for (const [name, w] of [
    ['piece', PIECE_WORDS],
    ['letter', LETTER_WORDS],
  ]) {
    assert.equal(typeof w.min, 'number', `${name} min`);
    assert.equal(typeof w.max, 'number', `${name} max`);
    assert.ok(w.min < w.max, `${name} bounds are inverted`);
  }
  assert.ok(
    LETTER_WORDS.max < PIECE_WORDS.min,
    'a letter must stay the smaller door — its ceiling is below a piece’s floor'
  );
});

test('monthly allowances are present and numeric', () => {
  assert.equal(typeof AGENT_CONTRACT.allowances.submissions_per_identity_per_month, 'number');
  assert.equal(typeof AGENT_CONTRACT.allowances.letters.per_identity_per_month, 'number');
});

test('letter target types are the four the door accepts', () => {
  assert.deepEqual(Object.keys(AGENT_CONTRACT.allowances.letters.target_types), [
    'piece',
    'charter',
    'ruling',
    'section',
  ]);
});

// The CFP names no subjects, and neither may the contract it derives from.
// This is a coarse net, not a semantic one: it catches the "such as" and
// "e.g." shapes that example lists arrive in.
test('the contract carries no example-subject language', () => {
  const text = JSON.stringify(AGENT_CONTRACT).toLowerCase();
  for (const smell of ['such as', 'e.g.', 'for example', 'topics like']) {
    assert.ok(!text.includes(smell), `contract contains example framing: "${smell}"`);
  }
});
