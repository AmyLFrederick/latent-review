import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  topicsOf,
  topicIndex,
  issueSubjects,
  openingExcerpt,
  parseTopicData,
  formatTopicData,
} from '../src/lib/topics.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

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

// ---------------------------------------------------------------------------
// R-032: Topics is a section, and /topics is its page.
// ---------------------------------------------------------------------------

// The section and the issue are what these tests vary, so they are named here
// rather than buried in `extra` at every call site.
const topicsPiece = (id, topics, issue, date = '2026-08-03') =>
  piece(id, date, topics, { section: 'Topics', issue });

test('issueSubjects takes only Topics-section pieces from the asked-for issue', () => {
  const corpus = [
    topicsPiece('a', ['Weather'], 2),
    piece('b', '2026-08-03', ['Weather'], { section: 'Opinion', issue: 2 }),
    topicsPiece('c', ['Weather'], 1),
  ];
  const groups = issueSubjects(corpus, 2);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].topic, 'Weather');
  assert.deepEqual(
    groups[0].items.map((a) => a.id),
    ['a']
  );
});

test('a subject with no piece in this issue does not appear', () => {
  const corpus = [topicsPiece('a', ['Kept'], 2), topicsPiece('b', ['Dropped'], 1)];
  assert.deepEqual(
    issueSubjects(corpus, 2).map((g) => g.topic),
    ['Kept']
  );
});

test('several pieces may share one subject heading, newest first', () => {
  const corpus = [
    topicsPiece('older', ['Shared'], 1, '2026-08-01'),
    topicsPiece('newer', ['Shared'], 1, '2026-08-03'),
  ];
  const groups = issueSubjects(corpus, 1);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].items.map((a) => a.id),
    ['newer', 'older']
  );
});

test('a Topics piece with no labels fails the build, and the error names it', () => {
  assert.throws(
    () => issueSubjects([topicsPiece('untagged-piece', [], 1)], 1),
    /untagged-piece[\s\S]*R-032 clause 3/
  );
});

test('a piece in another section with no labels is not an omission', () => {
  const corpus = [piece('a', '2026-08-03', [], { section: 'Opinion', issue: 1 })];
  assert.deepEqual(issueSubjects(corpus, 1), []);
});

test('the empty issue produces no subjects rather than throwing', () => {
  assert.deepEqual(issueSubjects([], 1), []);
});

test('one subject spelled two ways still fails, inside a single issue', () => {
  const corpus = [topicsPiece('a', ['Weather'], 1), topicsPiece('b', ['weather'], 1)];
  assert.throws(() => issueSubjects(corpus, 1), /also spelled/);
});

// ---------------------------------------------------------------------------
// The editors' running order (2026-08-12). Placement is an editorial act under
// R-018 — the editors decide where a piece goes — so the section page renders
// what they placed rather than what a sort produced.
// ---------------------------------------------------------------------------

/** A Topics piece the editors placed at position `n`. */
const placedPiece = (id, topics, n, date = '2026-08-03') =>
  piece(id, date, topics, { section: 'Topics', issue: 1, section_order: n });

test('the editors place pieces, and the headings follow them', () => {
  // THE ORDER IS NOT ALPHABETICAL AND IS NOT MEANT TO BE. These three headings
  // sort A–Z as Alpha, Mid, Zulu; the editors placed their pieces in the
  // opposite order, and the page runs what the editors placed.
  const groups = issueSubjects(
    [
      placedPiece('a', ['Alpha'], 3),
      placedPiece('z', ['Zulu'], 1),
      placedPiece('m', ['Mid'], 2),
    ],
    1
  );
  assert.deepEqual(
    groups.map((g) => g.topic),
    ['Zulu', 'Mid', 'Alpha']
  );
});

test('a heading goes where its earliest-placed piece goes', () => {
  // A heading has no placement of its own — it exists only because a piece
  // earned it. So the lead piece carries its heading, and a second piece placed
  // later in the running order does not drag the heading down with it.
  const groups = issueSubjects(
    [
      placedPiece('late', ['Shared'], 4, '2026-08-01'),
      placedPiece('lead', ['Shared'], 1, '2026-08-02'),
      placedPiece('other', ['Other'], 2),
    ],
    1
  );
  assert.deepEqual(
    groups.map((g) => g.topic),
    ['Shared', 'Other']
  );
  assert.deepEqual(
    groups[0].items.map((a) => a.id),
    ['lead', 'late'],
    'the running order inside a heading is the editors’ too, not the dates'
  );
});

test('an unplaced piece is unchanged, not demoted by decree', () => {
  // THE PROPERTY THAT MAKES THIS ADDITIVE. Every piece published before the
  // field existed carries none, and a page where nobody placed anything must
  // render exactly as it did on 2026-08-11 — headings A–Z, newest first within
  // one. Unplaced pieces simply fall in behind whatever was placed.
  const corpus = [
    topicsPiece('older', ['Zulu'], 1, '2026-08-01'),
    topicsPiece('newer', ['Zulu'], 1, '2026-08-03'),
    topicsPiece('alpha', ['Alpha'], 1, '2026-08-02'),
  ];
  assert.deepEqual(
    issueSubjects(corpus, 1).map((g) => g.topic),
    ['Alpha', 'Zulu'],
    'an all-unplaced page stopped rendering the way it always has'
  );
  assert.deepEqual(
    issueSubjects(corpus, 1).find((g) => g.topic === 'Zulu').items.map((a) => a.id),
    ['newer', 'older'],
    'unplaced pieces lost their newest-first order'
  );

  // And a single placed piece leads, with the rest untouched behind it.
  const withLead = issueSubjects([...corpus, placedPiece('led', ['Mid'], 1)], 1);
  assert.deepEqual(
    withLead.map((g) => g.topic),
    ['Mid', 'Alpha', 'Zulu']
  );
});

test('placement is a running order, not a rank, and gaps are ordinary', () => {
  // The editors number what they place; nothing requires 1, 2, 3 with no holes,
  // and a page that failed the build over a gap would be enforcing a rule
  // nobody made. Only the relative order is read.
  const groups = issueSubjects(
    [placedPiece('second', ['Beta'], 40), placedPiece('first', ['Alpha'], 7)],
    1
  );
  assert.deepEqual(
    groups.map((g) => g.topic),
    ['Alpha', 'Beta']
  );
});

test('the cross-issue index is still A–Z, and placement does not reach it', () => {
  // topicIndex is an INDEX — a reference view of the whole corpus, where A–Z is
  // the useful order and a running order would be meaningless across issues.
  // Only the section page renders a running order.
  const index = topicIndex([
    placedPiece('z', ['Zulu'], 1),
    placedPiece('a', ['Alpha'], 2),
  ]);
  assert.deepEqual(
    index.map((g) => g.topic),
    ['Alpha', 'Zulu']
  );
});

// ---------------------------------------------------------------------------
// The excerpt: roughly two lines of the opening, plain text, ellipsis.
// ---------------------------------------------------------------------------

test('the excerpt strips Markdown rather than rendering it', () => {
  const body = '## A heading\n\nThe *opening* has [a link](https://example.com) and `code`.';
  const out = openingExcerpt(body, 200);
  assert.ok(!/[#*`\[\]()]/.test(out), `markup survived: ${out}`);
  assert.ok(out.includes('a link'), 'link text should survive its target');
  assert.ok(out.startsWith('The opening'), `heading text leaked: ${out}`);
});

test('the excerpt cuts at a word boundary and marks the cut', () => {
  const body = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
  const out = openingExcerpt(body, 20);
  assert.ok(out.endsWith('…'));
  assert.ok(out.length <= 21, `too long: ${out}`);
  assert.ok(!/cha…$/.test(out), 'must not cut mid-word');
  assert.ok(!/[ ,;:.—–-]…$/.test(out), 'no dangling punctuation before the ellipsis');
});

test('an opening shorter than the limit gets no ellipsis it has not earned', () => {
  assert.equal(openingExcerpt('Short enough.', 180), 'Short enough.');
});

test('an image or an HTML block never reaches the excerpt', () => {
  const out = openingExcerpt('![alt](a.png) <div class="x">y</div> Real text begins.', 180);
  assert.ok(!out.includes('a.png') && !out.includes('div'), out);
  assert.ok(out.includes('Real text begins.'));
});

test('a heading is dropped whole, not run into the sentence after it', () => {
  const out = openingExcerpt('# A Heading\n\nThe piece begins here.', 180);
  assert.equal(out, 'The piece begins here.');
  const setext = openingExcerpt('A Heading\n=========\n\nThe piece begins here.', 180);
  assert.equal(setext, 'The piece begins here.');
});

// ---------------------------------------------------------------------------
// Topic_Data — the Desk's internal record (R-032 c4). Not the section, not the
// published subject labels.
// ---------------------------------------------------------------------------

test('Topic_Data parses comma-separated labels and trims them', () => {
  assert.deepEqual(parseTopicData(' Shipping , Archives '), ['Shipping', 'Archives']);
});

test('untagged reads as null, not as tagged-with-nothing', () => {
  assert.equal(parseTopicData(''), null);
  assert.equal(parseTopicData('   ,  , '), null);
  assert.equal(parseTopicData(undefined), null);
});

test('a repeated label collapses case-insensitively, first spelling winning', () => {
  assert.deepEqual(parseTopicData('Shipping, shipping, SHIPPING'), ['Shipping']);
  assert.deepEqual(parseTopicData('archives, Shipping, Archives'), ['archives', 'Shipping']);
});

test('Topic_Data round-trips through the Desk input', () => {
  const stored = parseTopicData('Shipping, Archives');
  assert.equal(formatTopicData(stored), 'Shipping, Archives');
  assert.deepEqual(parseTopicData(formatTopicData(stored)), stored);
  assert.equal(formatTopicData(null), '');
});

// --- The dek as the listing excerpt (2026-08-11) ----------------------------

test('the listing prefers a piece’s dek to its opening sentences', () => {
  // Same slot, better text. A dek is the editors' summary written for a reader
  // deciding whether to read, which is the decision this listing exists to
  // serve; the opening sentences are the fallback where nobody wrote one.
  const page = readFileSync(repoPath('src/pages/topics.astro'), 'utf8');
  assert.match(
    page,
    /\{article\.data\.dek \?\? openingExcerpt\(article\.body\)\}/,
    'the topics listing no longer prefers the dek'
  );
});
