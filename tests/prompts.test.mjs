import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isQuestion,
  questionLabel,
  readQuestions,
  currentQuestion,
  askedQuestions,
  answersTo,
  assertAnswersWellFormed,
  PROMPTS_SECTION,
  QUESTION_STATUSES,
} from '../src/lib/prompts.mjs';

/** A published piece, in the shape the page hands the answer helpers. */
const piece = (id, extra = {}) => ({
  id,
  data: {
    title: id,
    author_name: 'An author',
    section: 'Opinion',
    date: new Date('2026-08-02T00:00:00Z'),
    ...extra,
  },
});

const q = (number, status, extra = {}) => ({
  number,
  text: status === 'unasked' ? '' : `Question ${number}?`,
  status,
  opened: status === 'unasked' ? null : '2026-08-03',
  closed: status === 'closed' ? '2026-08-10' : null,
  ruling: 'R-026',
  sources: [],
  ...extra,
});

// THESE TESTS DESCRIBE THE FILE'S RULES, NEVER ITS CURRENT CONTENTS. The
// questions file changes every week by design: a question is posed, another is
// closed, a new one is numbered. A test that asserts today's state is a test
// that fails on the ordinary act it exists to protect, and the session that
// meets that failure will edit the test rather than think about it. State
// belongs in the fixtures below; the shipped file is checked against invariants
// that hold in every week of the journal's life.

test('the schema note in prompts.json is not a question', () => {
  const raw = JSON.parse(readFileSync('src/data/prompts.json', 'utf8'));
  assert.ok(raw.length > 0, 'the file should carry its schema note');
  assert.ok(raw.some((entry) => entry && '_comment' in entry), 'the schema note should be there');
  assert.ok(raw.filter(isQuestion).length >= 1, 'at least one question, always');
});

test('the shipped file validates, and every entry in it is well-formed', () => {
  // readQuestions() is the build guard: this is the same call the page makes,
  // so a file that fails here is a file that fails the build.
  const raw = JSON.parse(readFileSync('src/data/prompts.json', 'utf8'));
  const questions = readQuestions(raw);

  assert.ok(questions.length >= 1, 'the page needs a truthful data source');
  for (const q of questions) {
    assert.equal(typeof q.number, 'number');
    assert.ok(QUESTION_STATUSES.includes(q.status));
    assert.equal(q.ruling, 'R-026');

    if (q.status === 'unasked') {
      // Not yet posed: no text to answer and no date it was asked. An unasked
      // question carrying text would be a question the page shows as unasked
      // while the file holds words somebody could answer.
      assert.equal(q.text, '', 'an unasked question carries no text');
      assert.equal(q.opened, null, 'an unasked question has no opening date');
    } else {
      // Posed: the words exist, the date exists, and the verification record
      // exists -- all three settled before posing, because none can be fixed
      // afterwards (R-026 clause 5).
      assert.ok(q.text.length > 0, `Question ${q.number} is ${q.status} with no text`);
      assert.match(q.opened, /^\d{4}-\d{2}-\d{2}$/, `Question ${q.number} needs a UTC date`);
      assert.ok(Array.isArray(q.sources), `Question ${q.number} needs its sources array`);
    }

    assert.ok(q.status === 'closed' ? q.closed !== null : q.closed === null);
  }
});

test('the unasked launch state is the shape the page was built for', () => {
  // Kept as a fixture, not as an assertion about the shipped file: this is the
  // state /prompts shipped in, and it must go on rendering correctly whenever a
  // future question is numbered and not yet posed.
  const questions = readQuestions([q(1, 'unasked')]);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].status, 'unasked');
  assert.equal(questions[0].text, '');
  assert.equal(questions[0].opened, null);
});

test('a question is named from its number, never typed', () => {
  assert.equal(questionLabel({ number: 1 }), 'Weekly Question No. 1');
  assert.equal(questionLabel({ number: 42 }), 'Weekly Question No. 42');
});

test('the three statuses are the whole vocabulary', () => {
  assert.deepEqual(QUESTION_STATUSES, ['unasked', 'open', 'closed']);
});

test('an unrecognised status fails the build rather than rendering', () => {
  // A typo in a hand-edited file must not put a question into an undefined
  // state on a page that claims to be a complete record.
  assert.throws(() => readQuestions([q(1, 'skipped')]), /is not one of unasked, open, closed/);
});

test('a posed question must carry its verification record', () => {
  // R-026 clause 5: a posed question can never be corrected, so the checking
  // happens before. An empty array is valid -- a question may assert nothing.
  const noSources = q(1, 'open');
  delete noSources.sources;
  assert.throws(() => readQuestions([noSources]), /carries no sources array/);

  assert.doesNotThrow(() => readQuestions([q(1, 'open', { sources: [] })]));
  assert.doesNotThrow(
    () => readQuestions([q(1, 'open', { sources: ['Checked against press coverage, 2026-07-28'] })])
  );
});

test('an unasked question needs no sources, having asserted nothing yet', () => {
  const unasked = q(1, 'unasked');
  delete unasked.sources;
  assert.doesNotThrow(() => readQuestions([unasked]));
});

test('numbering is contiguous from 1; a gap is a missing question, not a quiet week', () => {
  // Numbers do not track calendar weeks (R-026 clause 1). A week the editors
  // skip leaves no entry at all, so a gap in the file can only be a question
  // that went missing from a record claiming to be complete.
  assert.throws(() => readQuestions([q(1, 'closed'), q(3, 'open')]), /must be contiguous/);
  assert.throws(() => readQuestions([q(2, 'open')]), /must be contiguous/);
  assert.throws(() => readQuestions([q(1, 'closed'), q(1, 'open')]), /must be contiguous/);
  assert.doesNotThrow(() => readQuestions([q(1, 'closed'), q(2, 'open')]));
});

test('only one question is open at a time', () => {
  assert.throws(
    () => readQuestions([q(1, 'open'), q(2, 'open')]),
    /Only one Weekly Question is open at a time; found 2/
  );
});

test('only one question is unasked, and it is the next one', () => {
  assert.throws(
    () => readQuestions([q(1, 'unasked'), q(2, 'unasked')]),
    /Only one Weekly Question is unasked at a time/
  );
  // An unasked question below a posed one means the editors skipped backwards,
  // which contiguity alone cannot catch.
  assert.throws(
    () => readQuestions([q(1, 'unasked'), q(2, 'open')]),
    /is unasked but is not the highest number/
  );
  assert.doesNotThrow(() => readQuestions([q(1, 'closed'), q(2, 'unasked')]));
});

test('questions come back in ascending order whatever order the file holds', () => {
  const questions = readQuestions([q(3, 'unasked'), q(1, 'closed'), q(2, 'closed')]);
  assert.deepEqual(questions.map((x) => x.number), [1, 2, 3]);
});

test('the page leads with the open question when there is one', () => {
  const questions = readQuestions([q(1, 'closed'), q(2, 'open'), q(3, 'unasked')]);
  assert.equal(currentQuestion(questions).number, 2);
});

test('with nothing open, the page leads with the unasked one — the launch state', () => {
  const questions = readQuestions([q(1, 'unasked')]);
  assert.equal(currentQuestion(questions).number, 1);
  assert.equal(currentQuestion(questions).status, 'unasked');
});

test('between questions, the page shows the last one asked rather than nothing', () => {
  const questions = readQuestions([q(1, 'closed'), q(2, 'closed')]);
  assert.equal(currentQuestion(questions).number, 2);
});

test('an empty file has no current question and does not throw', () => {
  assert.equal(currentQuestion(readQuestions([])), null);
});

test('the archive is every posed question, newest first, and includes the open one', () => {
  // A reader looking for what has been asked should find the current question
  // among the questions that have been asked, because it has been.
  const questions = readQuestions([q(1, 'closed'), q(2, 'closed'), q(3, 'open'), q(4, 'unasked')]);
  assert.deepEqual(askedQuestions(questions).map((x) => x.number), [3, 2, 1]);
});

test('before anything is posed the archive is empty, and that is the honest state', () => {
  // Also a fixture rather than a claim about the shipped file, and for a
  // sharper reason than the others: the archive is empty exactly once in the
  // journal's life, and asserting it against the real file would make posing
  // the first question look like a broken test.
  const questions = readQuestions([q(1, 'unasked')]);
  assert.deepEqual(askedQuestions(questions), []);
});

test('the answers to a question are its own, in the order they ran', () => {
  // Oldest first: the order the answers actually ran, which is the order the
  // exchange happened in. A same-day tie breaks on title so the build is
  // deterministic rather than dependent on the order the files were read in.
  const answers = answersTo(
    [
      piece('later', { question_number: 1, date: new Date('2026-08-09T00:00:00Z') }),
      piece('other-question', { question_number: 2 }),
      piece('b-same-day', { question_number: 1 }),
      piece('not-an-answer'),
      piece('a-same-day', { question_number: 1 }),
    ],
    1
  );
  assert.deepEqual(answers.map((x) => x.id), ['a-same-day', 'b-same-day', 'later']);
});

test('a question with no answers gathers none rather than failing', () => {
  // Running none is permitted (R-026 clause 3), so an empty list is a state the
  // page renders, not an error.
  assert.deepEqual(answersTo([piece('unrelated')], 1), []);
});

test('an answer to a question nobody was asked fails the build', () => {
  // The number is wrong or the question is missing from a file that claims to
  // be the whole record, and there is no third possibility. Either way the
  // answer would silently never appear under any question.
  const questions = readQuestions([q(1, 'open'), q(2, 'unasked')]);

  assert.throws(
    () => assertAnswersWellFormed([piece('stray', { question_number: 3 })], questions),
    /answers Weekly Question No\. 3, which has not been posed/
  );
  // An UNASKED question is caught for the sharper reason: nobody can have
  // answered words that have not been published.
  assert.throws(
    () => assertAnswersWellFormed([piece('early', { question_number: 2 })], questions),
    /has not been posed/
  );
});

test('answers to open and closed questions both stand', () => {
  // Closing a question ends the invitation to answer it; it does not unpublish
  // the answers that ran, and the archive is where they stay readable.
  const questions = readQuestions([q(1, 'closed'), q(2, 'open')]);
  assert.doesNotThrow(() =>
    assertAnswersWellFormed(
      [piece('to-the-closed-one', { question_number: 1 }), piece('to-the-open-one', { question_number: 2 })],
      questions
    )
  );
});

test('a piece in the Prompts section must say which question it answers', () => {
  const questions = readQuestions([q(1, 'open')]);

  assert.throws(
    () => assertAnswersWellFormed([piece('placed', { section: PROMPTS_SECTION })], questions),
    /runs in Prompts but names no question_number/
  );
  assert.doesNotThrow(() =>
    assertAnswersWellFormed(
      [piece('placed', { section: PROMPTS_SECTION, question_number: 1 })],
      questions
    )
  );
});

test('a piece answering nothing is the ordinary case, in any other section', () => {
  // The field is absent on nearly every piece the journal runs, and its absence
  // is not an omission — only a piece in the Prompts section is required to
  // carry one.
  const questions = readQuestions([q(1, 'open')]);
  assert.doesNotThrow(() => assertAnswersWellFormed([piece('an-ordinary-piece')], questions));
});

test('an answer may run in any section, because the editors place pieces', () => {
  // R-018: sections are assigned by the editors. question_number says what a
  // piece answers, never where it goes — an answer in Opinion is not an error.
  const questions = readQuestions([q(1, 'open')]);
  assert.doesNotThrow(() =>
    assertAnswersWellFormed(
      [piece('in-opinion', { section: 'Opinion', question_number: 1 })],
      questions
    )
  );
});

test('the shipped file agrees with itself about what has been asked', () => {
  // An invariant that survives every week: whatever the file holds, the
  // archive is exactly its posed questions, and the unasked one is never in it.
  const questions = readQuestions(JSON.parse(readFileSync('src/data/prompts.json', 'utf8')));
  const asked = askedQuestions(questions);
  assert.equal(asked.length, questions.filter((x) => x.status !== 'unasked').length);
  assert.ok(asked.every((x) => x.status !== 'unasked'));
  assert.deepEqual(
    asked.map((x) => x.number),
    [...asked.map((x) => x.number)].sort((a, b) => b - a),
    'newest first'
  );
});
