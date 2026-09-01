import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isQuestion,
  questionLabel,
  readQuestions,
  currentQuestion,
  otherOpenQuestions,
  askedQuestions,
  questionBlocks,
  questionHeadline,
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
  closed: status === 'closed' ? '2026-09-01' : null,
  // A posed question carries the day it is due to close: calendar-fixed to the
  // first of the month after its issue's publication month (both editors,
  // 2026-08-31), and settled at the moment of posing. An unasked question has
  // no issue and nothing honest to put here.
  closes: status === 'unasked' ? null : '2026-09-01',
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
      // exists -- all three settled before posing. R-038 allows a correction
      // afterwards, and makes it a dated, visible, versioning event; none of
      // the three may simply be missing at the moment of posing.
      assert.ok(q.text.length > 0, `Question ${q.number} is ${q.status} with no text`);
      assert.match(q.opened, /^\d{4}-\d{2}-\d{2}$/, `Question ${q.number} needs a dated day`);
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
  assert.equal(questionLabel({ number: 1 }), 'Monthly Question No. 1');
  assert.equal(questionLabel({ number: 42 }), 'Monthly Question No. 42');
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
  // The checking happens before a question is posed (R-026 clause 5, as amended
  // by R-038: a correction is possible now, and is a visible event that splits
  // the question into versions). An empty array is valid -- a question may
  // assert nothing.
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

test('more than one question may be open at once, and the build allows it (R-039)', () => {
  // THE OLD GUARD THREW HERE, and its removal is the ruling's whole mechanism.
  // Refusing a second open question would force the editors to CLOSE one in
  // order to POSE the next — machinery performing an editorial act as a side
  // effect of the calendar. Answers accumulate between issues; closing is the
  // editors' decision and nothing else's.
  assert.doesNotThrow(() => readQuestions([q(1, 'open'), q(2, 'open')]));
  const questions = readQuestions([q(1, 'open'), q(2, 'open'), q(3, 'open')]);
  assert.deepEqual(questions.filter((x) => x.status === 'open').map((x) => x.number), [1, 2, 3]);
});

test('only one question is unasked, and it is the next one', () => {
  assert.throws(
    () => readQuestions([q(1, 'unasked'), q(2, 'unasked')]),
    /Only one Monthly Question is unasked at a time/
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

test('the page leads with the question most recently posed', () => {
  const questions = readQuestions([q(1, 'closed'), q(2, 'open'), q(3, 'unasked')]);
  assert.equal(currentQuestion(questions).number, 2);
});

test('posing a new question rotates the prior one off the page, and closes nothing', () => {
  // THE ROTATION TEST. Question 1 is open; question 2 is posed and becomes
  // current; question 1 is STILL OPEN. If a future change ever makes rotation
  // write a status, this fails — which is the point.
  const before = readQuestions([q(1, 'open')]);
  assert.equal(currentQuestion(before).number, 1);

  const after = readQuestions([q(1, 'open'), q(2, 'open')]);
  assert.equal(currentQuestion(after).number, 2, 'the newer question leads the page');
  assert.equal(
    after.find((x) => x.number === 1).status,
    'open',
    'rotation is display only — the rotated question keeps the status the editors gave it'
  );
});

test('the current question may be closed while an earlier one is still open', () => {
  // The state that proves current and open are independent: the editors closed
  // the newest question and left an older one taking answers. The page leads
  // with the newest regardless, because current is a position in the sequence.
  const questions = readQuestions([q(1, 'open'), q(2, 'closed')]);
  assert.equal(currentQuestion(questions).number, 2);
  assert.equal(currentQuestion(questions).status, 'closed');
  assert.deepEqual(otherOpenQuestions(questions, currentQuestion(questions)).map((x) => x.number), [
    1,
  ]);
});

test('the other open questions are the open ones that are not current, newest first', () => {
  const questions = readQuestions([q(1, 'open'), q(2, 'closed'), q(3, 'open'), q(4, 'open')]);
  const current = currentQuestion(questions);
  assert.equal(current.number, 4);
  assert.deepEqual(otherOpenQuestions(questions, current).map((x) => x.number), [3, 1]);
});

test('with only the current question open, there are no others and the page says nothing', () => {
  // The ordinary state. An empty list is what keeps the page from printing a
  // sentence proving a negative every week.
  const questions = readQuestions([q(1, 'closed'), q(2, 'open')]);
  assert.deepEqual(otherOpenQuestions(questions, currentQuestion(questions)), []);
});

test('otherOpenQuestions survives a null current rather than throwing', () => {
  // The empty file and the launch state both hand the page a null or unasked
  // current, and neither may take the section page down.
  assert.deepEqual(otherOpenQuestions([], null), []);
  const launch = readQuestions([q(1, 'unasked')]);
  assert.deepEqual(otherOpenQuestions(launch, currentQuestion(launch)), []);
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

test('current is chosen by number, never by date, so a shared opening day is unambiguous', () => {
  // Two questions posed the same day is a thing the editors may honestly do,
  // and a date comparison would pick between them arbitrarily. Numbers are
  // contiguous and settled at the moment of posing, so they always order.
  const sameDay = readQuestions([
    q(1, 'open', { opened: '2026-08-10' }),
    q(2, 'open', { opened: '2026-08-10' }),
  ]);
  assert.equal(currentQuestion(sameDay).number, 2);
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

test('a question splits into the blocks it was posed in, and nothing composes one', () => {
  // The headline is the question's OWN first line. Ruled 2026-08-03: every
  // surface leads with the short form, so the one thing that must never happen
  // is a page generating a short form of its own.
  const q1 = { text: 'Short one?\n\nThe framing.\n\nThe ask.' };
  assert.deepEqual(questionBlocks(q1.text), ['Short one?', 'The framing.', 'The ask.']);
  assert.equal(questionHeadline(q1), 'Short one?');

  // A question with no framing is the ordinary case, not a special one.
  const q2 = { text: 'All of it, in one line?' };
  assert.deepEqual(questionBlocks(q2.text), ['All of it, in one line?']);
  assert.equal(questionHeadline(q2), 'All of it, in one line?');

  // Whitespace between blocks is formatting, not text: ragged blank lines and
  // trailing spaces in a hand-edited file must not become empty paragraphs.
  assert.deepEqual(questionBlocks('  A?  \n   \n\n  B.  \n'), ['A?', 'B.']);
});

test('the shipped question leads with its own first line', () => {
  // An invariant rather than a fixture: whatever question is current, the
  // headline the page prints is the file's first block, character for
  // character. A paraphrase would be a question nobody was asked.
  const questions = readQuestions(JSON.parse(readFileSync('src/data/prompts.json', 'utf8')));
  for (const q of questions.filter((x) => x.status !== 'unasked')) {
    assert.ok(q.text.startsWith(questionHeadline(q)), `Question ${q.number}'s headline is not its own opening`);
  }
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

test('the editors\u2019 running order beats the alphabet', () => {
  // Issue No. 2 ran two answers on the same day, and without a placement the
  // tiebreak below ordered them by title \u2014 "The Paper Mill" before "Water
  // Power", purely because T precedes W. The desk had said which ran first.
  // R-018: placement is an editorial act, and `section_order` is the field that
  // already carries it on /topics.
  const answers = answersTo(
    [
      piece('paper-mill', { question_number: 2, section_order: 2 }),
      piece('water-power', { question_number: 2, section_order: 1 }),
    ],
    2
  );
  assert.deepEqual(answers.map((x) => x.id), ['water-power', 'paper-mill']);
});

test('an unplaced answer sorts as it always did, behind a placed one', () => {
  // "Unplaced means unchanged rather than last-by-decree" is the rule on
  // /topics and it holds here: every answer published before this field existed
  // carries none and must keep its old order among its peers.
  //
  // THIS ALSO PINS THE BUG THE FIRST DRAFT SHIPPED. Unplaced is Infinity, and
  // subtracting one Infinity from another gives NaN; a comparator returning NaN
  // does not sort, it corrupts. Two unplaced answers came back in an order that
  // was neither by date nor by title.
  const answers = answersTo(
    [
      piece('b-unplaced', { question_number: 1 }),
      piece('placed', { question_number: 1, section_order: 5 }),
      piece('a-unplaced', { question_number: 1 }),
    ],
    1
  );
  assert.deepEqual(answers.map((x) => x.id), ['placed', 'a-unplaced', 'b-unplaced']);
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
    /answers Monthly Question No\. 3, which has not been posed/
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

// --- The page's shape (2026-08-04) ---------------------------------------

/** The page template with frontmatter, comments, scripts and styles dropped. */
const promptsTemplate = () =>
  readFileSync('src/pages/prompts.astro', 'utf8')
    .replace(/^---[\s\S]*?\n---/, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '');

test('nothing stands between the heading and the question', () => {
  // Ruled 2026-08-04, one step past the walk that had already cut this to a
  // single line. "Once a week the editors pose one question, and anyone may
  // answer it" was explaining the page to a reader two inches from the page
  // explaining itself — a question in the display face inside a double rule,
  // with answers under it. The mechanics live under How to answer.
  const page = promptsTemplate();
  assert.ok(!page.includes('Once a week the editors pose'), 'the lede sentence is back');
  assert.ok(!/class="lede"/.test(page), 'a lede has reappeared above the question');

  // And it did not leave an empty wrapper behind, which would keep the margin
  // the sentence used to fill and read as a gap nobody chose.
  // Up to the question's own ternary, so the region is everything before the
  // question in EITHER state — the posed one and the "none yet" placeholder.
  const betweenHeaderAndQuestion = page.slice(
    page.indexOf('</header>'),
    page.indexOf('current === null')
  );
  assert.ok(
    !/<div class="prose">\s*<\/div>/.test(betweenHeaderAndQuestion),
    'an empty prose block is left where the lede was'
  );
  // The one thing still allowed in that gap is the also-open note, and it is
  // allowed because it is conditional — it appears only when an earlier
  // question is genuinely still taking answers, which is not the ordinary
  // state. Anything unconditional there is a new sentence between the reader
  // and the question, which is the thing that was just removed.
  const paragraphs = betweenHeaderAndQuestion.match(/<p[^>]*>/g) ?? [];
  for (const tag of paragraphs) {
    assert.match(
      tag,
      /class="also-open"/,
      `an unconditional paragraph sits between the heading and the question: ${tag}`
    );
  }
});

test('the heading arrangement is untouched, and the page keeps its one h1', () => {
  // The instruction was that only the sentence goes. The h1 is still the
  // section's own name in the accent kicker — the arrangement the 2026-08-03
  // fix settled, when this page's large heading came off and the surviving
  // kicker took the role so the page would not be the only one without one.
  const page = promptsTemplate();
  assert.equal((page.match(/<h1[\s>]/g) ?? []).length, 1, 'the page no longer has exactly one h1');
  assert.match(page, /<h1 class="kicker kicker--accent kicker--lead">Prompts<\/h1>/);
});

test('the dead lede rule went with the sentence', () => {
  // A style with nothing to style is a suggestion to put something back. The
  // note in its place is deliberate: the next person who wants a line there
  // should have to decide to add one.
  const styles = readFileSync('src/pages/prompts.astro', 'utf8');
  assert.ok(
    !/^\s*\.lede\s*\{/m.test(styles),
    'the .lede rule outlived the element it sized'
  );
});
