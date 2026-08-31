// WHEN A MONTHLY QUESTION CLOSES (both editors, 2026-08-31).
//
// THE RULE, calendar-fixed: a question closes on the FIRST OF THE MONTH AFTER
// ITS ISSUE'S PUBLICATION MONTH. Issue No. 1 published 2026-08-02, so Question
// No. 1 closes 2026-09-01; Issue No. 2 publishes 2026-09-01, so Question No. 2
// closes 2026-10-01. Fixed to the calendar rather than decided per question, so
// the end of a question is knowable the day it is posed by anyone deciding
// whether to spend a week answering it.
//
// WHY THE CHECK LIVES HERE AND NOT IN readQuestions(). The rule spans two
// records: the closing date is in src/data/prompts.json and the publication
// month is in the article collection, derived per R-053 as the EARLIEST date
// among an issue's pieces. Asserting it inside readQuestions would make the
// questions file unable to validate itself without loading the pieces — so the
// format checks stay there (a real day, the first of a month, present on every
// posed question) and the arithmetic that needs both records is done here,
// where both are already in hand.
//
// THIS IS A TEST OF THE SHIPPED RECORD, deliberately, and it is the exception
// to the rule stated in prompts.test.mjs that these tests describe the file's
// rules and never its contents. The whole content of this rule is an agreement
// between two live files; a fixture pair would prove only that arithmetic works.
// It fails when a question's recorded closing date stops following from its
// issue's publication month, which is exactly the drift nobody would see by eye.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { readQuestions } from '../src/lib/prompts.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

const questions = readQuestions(JSON.parse(readFileSync(repoPath('src/data/prompts.json'), 'utf8')));

/**
 * Each issue's publication month, read off the pieces that ran in it.
 *
 * THE EARLIEST PIECE IS THE ISSUE'S DATE (R-053, and src/lib/issues.ts derives
 * it with Math.min for the same reason): an issue is dated when it launched,
 * not when it was last added to. A piece staged into an issue mid-window must
 * not move the month its question closes in.
 */
function issueMonths() {
  const months = new Map();
  for (const file of readdirSync(repoPath('src/content/articles'))) {
    // Underscore-prefixed files are not pieces. Astro's content collections
    // ignore them, and src/content/articles/_example.md is a template carrying
    // `issue: 1` and a July date — read as a piece it would move Issue No. 1's
    // publication month back a month and take this rule's answer with it.
    if (!file.endsWith('.md') || file.startsWith('_')) continue;
    const src = readFileSync(repoPath(`src/content/articles/${file}`), 'utf8');
    const issue = src.match(/^issue: (\d+)$/m);
    const date = src.match(/^date: (\d{4}-\d{2}-\d{2})$/m);
    if (!issue || !date) continue;
    const n = Number(issue[1]);
    const earliest = months.get(n);
    if (!earliest || date[1] < earliest) months.set(n, date[1]);
  }
  return months;
}

/** The first of the month after the one this day falls in. */
function firstOfNextMonth(day) {
  const [year, month] = day.split('-').map(Number);
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

test('the rule is arithmetic on a month, including across a year boundary', () => {
  assert.equal(firstOfNextMonth('2026-08-02'), '2026-09-01');
  assert.equal(firstOfNextMonth('2026-09-01'), '2026-10-01');
  // The one case a naive implementation gets wrong, and the journal will meet
  // it in December of its first year.
  assert.equal(firstOfNextMonth('2026-12-15'), '2027-01-01');
});

test('every posed question closes the month after its issue published', () => {
  const months = issueMonths();
  const checked = [];

  for (const q of questions) {
    if (q.status === 'unasked') continue;
    // A question drafted before its issue is known records `issue: null`, which
    // is an honest state and not one this rule can be applied to yet.
    if (q.issue === null || q.issue === undefined) continue;

    const published = months.get(q.issue);
    // An issue with no pieces in the repository yet — the state Issue No. 2 is
    // in until its pieces are built. Skipped rather than failed: the rule is
    // checkable the moment the first piece lands, and until then there is no
    // publication month to check against.
    if (!published) continue;

    assert.equal(
      q.closes,
      firstOfNextMonth(published),
      `Monthly Question No. ${q.number} records closes ${q.closes}, but Issue No. ${q.issue} ` +
        `published ${published}, so it closes ${firstOfNextMonth(published)}. The rule is ` +
        'calendar-fixed (both editors, 2026-08-31): the first of the month after the issue.'
    );
    checked.push(q.number);
  }

  // A test that quietly checked nothing would pass forever. If every question
  // got skipped, the pairing between the two records has come apart.
  assert.ok(
    checked.length > 0,
    'no question could be checked against an issue — the questions and the pieces have stopped agreeing about issue numbers'
  );
});

test('a closed question says when, and why, in the record', () => {
  for (const q of questions) {
    if (q.status !== 'closed') continue;
    assert.match(q.closed, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(
      typeof q.closure_note === 'string' && q.closure_note.length > 0,
      `Monthly Question No. ${q.number} closed with no note. "Closed" and a date do not say ` +
        'whether the question was withdrawn or simply reached its month, and a reader who ' +
        'answered it deserves the difference.'
    );
    // WHAT IS DELIBERATELY NOT CHECKED HERE. A draft of this test sniffed the
    // note for "withdraw", "retract", "removed" — the things closing a question
    // must never be — and failed on the shipped note, which says the question is
    // NOT withdrawn. A keyword cannot tell a denial from an assertion, and a
    // check that fails on a correct record teaches the next session to delete
    // the check. Whether a note says the right thing is an editorial read; what
    // machinery can hold is that there IS one.
  }
});

test('an open question carries a closing date and no closing act', () => {
  for (const q of questions) {
    if (q.status !== 'open') continue;
    assert.equal(q.closed, null, `Monthly Question No. ${q.number} is open and carries a closed date`);
    assert.match(
      q.closes,
      /^\d{4}-\d{2}-01$/,
      `Monthly Question No. ${q.number} is open with no first-of-the-month closing date`
    );
  }
});

test('Question No. 1 closes with Issue No. 2, and No. 2 runs through September', () => {
  // The live state the desk set on 2026-08-31. Named explicitly because these
  // two dates are the ones a later session is most likely to "tidy" — one is a
  // question that closed on a day the issue that closed it went out, and the
  // other is a question left open across an issue boundary on purpose.
  const one = questions.find((q) => q.number === 1);
  const two = questions.find((q) => q.number === 2);

  assert.equal(one.status, 'closed');
  assert.equal(one.closed, '2026-09-01');
  assert.equal(one.closes, '2026-09-01');

  assert.equal(two.status, 'open', 'Question No. 2 stays open through September');
  assert.equal(two.closes, '2026-10-01');
  assert.equal(two.closed, null);
});
