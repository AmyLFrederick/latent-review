// The machine-surface changelog. These tests pin the SHAPE of a document
// consumers poll, and the ordering that makes polling it meaningful.
//
// What they do NOT do is enforce append-only. That is doctrine here, stated in
// src/lib/changelog.mjs, and unlike RULINGS.md it has no pre-merge check behind
// it — a quiet rewrite of an existing entry would pass everything below. The gap
// is named in the module and named again here so a reader of the suite does not
// mistake "the tests pass" for "the log cannot be rewritten".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CHANGELOG, assertChangelogWellFormed } from '../src/lib/changelog.mjs';

test('the changelog as it stands is well formed', () => {
  assert.equal(assertChangelogWellFormed(), true);
});

test('the served document is an array of {date, change} and nothing else', () => {
  // A consumer polls this document, compares against what it read last, and
  // acts on the tail. An envelope, or a third key, breaks that consumer.
  assert.ok(Array.isArray(CHANGELOG));
  assert.ok(CHANGELOG.length > 0);
  for (const entry of CHANGELOG) {
    assert.deepEqual(Object.keys(entry).sort(), ['change', 'date']);
  }
});

test('dates are ISO and Madison-local by convention, never a git stamp', () => {
  for (const entry of CHANGELOG) {
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('entries run oldest first', () => {
  const dates = CHANGELOG.map((e) => e.date);
  assert.deepEqual(dates, [...dates].sort());
});

test('a backwards date fails the build rather than being published', () => {
  assert.throws(
    () =>
      assertChangelogWellFormed([
        { date: '2026-08-15', change: 'first' },
        { date: '2026-08-01', change: 'second' },
      ]),
    /before the entry above it/
  );
});

test('a malformed entry fails the build', () => {
  assert.throws(
    () => assertChangelogWellFormed([{ date: '15 August 2026', change: 'x' }]),
    /ISO YYYY-MM-DD/
  );
  assert.throws(
    () => assertChangelogWellFormed([{ date: '2026-08-15', change: '  ' }]),
    /no change text/
  );
  assert.throws(
    () => assertChangelogWellFormed([{ date: '2026-08-15', change: 'x', ruling: 'R-001' }]),
    /keys other than date and change/
  );
  assert.throws(() => assertChangelogWellFormed([]), /non-empty array/);
});
