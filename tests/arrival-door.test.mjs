// THE DOOR RECORDED IS THE DOOR USED (2026-08-31). What these tests protect:
//
//   1. The human submission form has a value it can be recorded under. It did
//      not, from launch until 2026-08-31, which is the whole of the bug: the
//      form writes no database row, so a form submission reaches the desk only
//      by being carried into the email door, and there was nothing truer than
//      `email` for the desk to say about it.
//   2. The email door claims its own door only where it observed it. A forward
//      is a carry: the piece came through some door the journal never saw, and
//      the honest record of that is a blank field and a flag.
//   3. `forward` is a conclusion, not a starting value. It used to be what
//      received_date_source was initialised to, so every clean arrival was
//      labelled a forward whose original date could not be found — and wore, on
//      the desk, the unresolved styling built to make an editor act.
//   4. The desk shows an unestablished door. An absent value that printed
//      nothing would be an improvement no editor could see.
//
// (2)–(4) are asserted against the source text rather than by running the
// function: netlify/functions/email-inbound.mts calls requireEnv() at module
// load and reaches a database, so importing it here would test the environment
// rather than the rule. The idiom is notice.test.mjs's, which reads the page
// source to prove a page renders a constant rather than a copy of it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ARRIVAL_VALUES } from '../src/lib/notice.mjs';
import { ARRIVAL_LABELS, ARRIVAL_ROW_LABELS } from '../src/lib/site.ts';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const read = (rel) => readFileSync(repoPath(rel), 'utf8');

const emailDoor = read('netlify/functions/email-inbound.mts');
const desk = read('src/pages/admin.astro');

test('the human submission form is a recordable door', () => {
  assert.ok(
    ARRIVAL_VALUES.includes('form'),
    'the form at /submit has no publishable arrival value — a piece that came through it cannot say so'
  );
  assert.ok(ARRIVAL_LABELS.form, 'the form arrival has no reader-facing label');

  // A form is a door, not an assignment. Rendering it under "Assignment" would
  // publish a category error in the half of the provenance block that exists to
  // be precise about how work reached the journal — the same reasoning that put
  // `email` in this map on 2026-08-10.
  assert.equal(ARRIVAL_ROW_LABELS.form, 'Arrived by');
});

test('the email door does not stamp its own name on a carried piece', () => {
  // The literal that used to go onto every row this door wrote.
  assert.ok(
    !/arrival:\s*ARRIVAL_EMAIL/.test(emailDoor),
    'the email door writes ARRIVAL_EMAIL unconditionally again — a carried piece will be recorded as having arrived by email'
  );
  assert.match(
    emailDoor,
    /arrival = null;/,
    'the email door has no path that declines to name a door'
  );
  assert.match(
    emailDoor,
    /ARRIVAL_UNESTABLISHED = 'arrival-unestablished'/,
    'a blank door must be flagged, or it is a missing fact nobody was told to supply'
  );
});

test('forward is reached only by a message that is actually a forward', () => {
  // The initial value is the whole of the old bug. `direct` — the journal's own
  // observation of the day the message arrived — is what a clean arrival gets.
  assert.match(
    emailDoor,
    /let receivedDateSource: 'parsed' \| 'forward' \| 'direct' = 'direct';/,
    "received_date_source no longer initialises to 'direct' — a clean arrival is being labelled a lost forward again"
  );
  assert.ok(
    /else if \(isForward\) \{[\s\S]*?receivedDateSource = 'forward';/.test(emailDoor),
    "'forward' must be set only where the raw shows forwarded framing"
  );
});

test('the desk renders every date source, including the quiet one', () => {
  // A source with no entry falls through to a bare date with no marker, which
  // is the one rendering this surface must never produce: it shows a date and
  // says nothing about what kind of fact it is.
  for (const source of ['parsed', 'attested', 'forward', 'direct']) {
    assert.match(
      desk,
      new RegExp(`\\b${source}:\\s*\\{\\s*mark:`),
      `the desk has no rendering for received_date_source "${source}"`
    );
  }

  // The loud one stays loud, and stays loud only for itself.
  assert.match(desk, /forward: \{ mark: 'ᵖ', note: 'forward date — original not found' \}/);
  assert.match(desk, /needsEditor = s\.received_date_source === 'forward'/);
});

test('the desk shows a door it was never told', () => {
  assert.match(
    desk,
    /arrival-unestablished/,
    'the desk ignores the unestablished-door flag — the row would sit there missing a fact with nothing to say so'
  );
  assert.match(
    desk,
    /door not established/,
    'a blank door must read as blank on the desk, not as no door at all'
  );
});

test('the correction to the two 2026-08-27 rows stays a hand-run script', () => {
  // It corrects two named rows and must never replay against another database
  // or another day's data. supabase/migrations/ is for what every database gets.
  const correction = read('docs/sql/2026-08-31-custody-door-correction.sql');
  assert.match(correction, /STEP 1 — READ THE ROWS FIRST/);
  assert.match(
    correction,
    /expected exactly 2 rows/,
    'the correction does not refuse to be approximate — a correction that hits the wrong count is aimed at the wrong thing'
  );
  assert.match(
    correction,
    /and prompt_disclosure is null/,
    "the correction must not overwrite a submitter's own words"
  );
});
