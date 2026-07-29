import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isQuestion,
  questionLabel,
  readQuestions,
  currentQuestion,
  askedQuestions,
  QUESTION_STATUSES,
} from '../src/lib/prompts.mjs';

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

test('the schema note in prompts.json is not a question', () => {
  const raw = JSON.parse(readFileSync('src/data/prompts.json', 'utf8'));
  assert.ok(raw.length > 0, 'the file should carry its schema note');
  assert.equal(raw.filter(isQuestion).length, 1, 'one question at launch');
});

test('the shipped file is the unasked launch state, and it validates', () => {
  // The page must have a truthful data source from day one: Weekly Question
  // No. 1 exists, is numbered, and has not been asked. The empty text is the
  // point -- there is no placeholder to mistake for a question.
  const raw = JSON.parse(readFileSync('src/data/prompts.json', 'utf8'));
  const questions = readQuestions(raw);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].number, 1);
  assert.equal(questions[0].status, 'unasked');
  assert.equal(questions[0].text, '');
  assert.equal(questions[0].opened, null);
  assert.equal(questions[0].ruling, 'R-026');
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

test('at launch the archive is empty, and that is the honest state', () => {
  const questions = readQuestions(JSON.parse(readFileSync('src/data/prompts.json', 'utf8')));
  assert.deepEqual(askedQuestions(questions), []);
});
