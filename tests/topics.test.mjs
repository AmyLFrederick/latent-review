import test from 'node:test';
import assert from 'node:assert/strict';

import { topicsOf, topicIndex } from '../src/lib/topics.mjs';

// Fixtures only. The corpus is empty before Issue No. 1 and changes every week
// afterwards, so these tests describe the rules and never the contents — the
// same arrangement the questions tests were corrected to (Prompts single 7).
const piece = (id, date, topics, extra = {}) => ({
  id,
  data: { title: id, date: new Date(date), section: 'Opinion', topics, ...extra },
});

test('a piece with no topics field is not an omission', () => {
  assert.deepEqual(topicsOf(piece('a', '2026-08-03', undefined)), []);
  assert.deepEqual(topicsOf({}), []);
  assert.deepEqual(topicIndex([piece('a', '2026-08-03', undefined)]), []);
});

test('labels are trimmed, and blank entries never become a topic', () => {
  assert.deepEqual(topicsOf(piece('a', '2026-08-03', ['  Regulation ', '', '  '])), [
    'Regulation',
  ]);
});

test('an empty corpus has no topics, which is the launch state', () => {
  // A topic is a label on a piece: with no pieces there is nothing to gather,
  // and the page says so rather than listing an empty vocabulary.
  assert.deepEqual(topicIndex([]), []);
});

test('pieces gather under their shared topic, newest first', () => {
  const index = topicIndex([
    piece('older', '2026-08-03', ['Regulation']),
    piece('newer', '2026-08-10', ['Regulation']),
  ]);
  assert.equal(index.length, 1);
  assert.equal(index[0].topic, 'Regulation');
  assert.deepEqual(index[0].items.map((x) => x.id), ['newer', 'older']);
});

test('topics sort A–Z regardless of case, and a piece may carry several', () => {
  const index = topicIndex([piece('a', '2026-08-03', ['regulation', 'Attention', 'Memory'])]);
  assert.deepEqual(index.map((g) => g.topic), ['Attention', 'Memory', 'regulation']);
});

test('one topic has one spelling, and a second spelling fails the build', () => {
  // A page whose purpose is to gather pieces that belong together must not
  // split one topic in two, and a reader could not tell a split from a real
  // distinction. Which spelling is the journal's is an editorial decision.
  assert.throws(
    () => topicIndex([piece('a', '2026-08-03', ['AI Safety']), piece('b', '2026-08-10', ['ai safety'])]),
    /is also spelled/
  );
});

test('a piece cannot carry the same topic twice', () => {
  assert.throws(
    () => topicIndex([piece('a', '2026-08-03', ['Memory', 'memory'])]),
    /carries the topic "memory" twice/
  );
});

test('grouping never reads or reports a section', () => {
  // Topics are orthogonal to sections (R-027): pieces from different sections
  // gather under one topic, and nothing about the section survives into the
  // index entry.
  const index = topicIndex([
    piece('a', '2026-08-03', ['Regulation'], { section: 'Opinion' }),
    piece('b', '2026-08-10', ['Regulation'], { section: 'AI Voices' }),
  ]);
  assert.equal(index.length, 1);
  assert.deepEqual(Object.keys(index[0]).sort(), ['items', 'topic']);
});
