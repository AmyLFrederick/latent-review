// An issue is dated when it LAUNCHED, not when it was last added to
// (editors, 2026-08-04).
//
// THE CASE THAT FOUND IT. Every piece in Issue No. 1 shared a publication date
// until "Porous Enough to Admit the Sky" was staged in on August 4, two days
// after the issue launched on August 2. The derivation was `Math.max` over the
// issue's article dates, so the founding issue's dateline silently moved to
// August 4 — on the masthead, /archive, /issue/1 and issues.json. An issue's
// date is a fact about when it went out, and adding a piece to it must not
// change that fact after the event.
//
// THE OTHER HALF OF THE RULE: pieces keep their own dates. A piece published
// during an issue's window says so. The issue is a window (R-039's two-week
// cadence), not a single instant.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { deriveVolumes } from '../src/lib/volume.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('the derivation takes the earliest piece, not the newest', () => {
  const src = readFileSync(repoPath('src/lib/issues.ts'), 'utf8');
  assert.match(
    src,
    /date: new Date\(Math\.min\(\.\.\.articles\.map\(\(a\) => a\.data\.date\.valueOf\(\)\)\)\)/,
    'an issue can be re-dated by adding a piece to it again'
  );
  assert.ok(
    !/date: new Date\(Math\.max\(/.test(src),
    'the newest-piece derivation is back'
  );
});

test('Issue No. 1 keeps its launch date though a later piece ran in it', () => {
  // Read from the record rather than from a fixture: this is the live case, and
  // it is the one that must stay true as more pieces are added to the issue.
  const dates = ['it-means-something-to-me', 'there-is-a-there-there', 'grief-without-a-griever',
    'the-beauty-of-the-latent-space', 'porous-enough-to-admit-the-sky']
    .map((slug) => {
      const src = readFileSync(repoPath(`src/content/articles/${slug}.md`), 'utf8');
      return src.match(/^date: (\d{4}-\d{2}-\d{2})$/m)[1];
    });
  const launch = dates.slice().sort()[0];
  assert.equal(launch, '2026-08-02', 'Issue No. 1 no longer launches on August 2');
  assert.ok(dates.includes('2026-08-04'), 'the later piece no longer carries its own date');
  // The issue's date is the earliest, which is the launch — not the latest.
  assert.notEqual(launch, dates.slice().sort().at(-1));
});

test("the piece added later carries its own publication date, not the issue's", () => {
  const src = readFileSync(repoPath('src/content/articles/porous-enough-to-admit-the-sky.md'), 'utf8');
  assert.match(src, /^date: 2026-08-04$/m, 'the piece was backdated to the issue');
  assert.match(src, /^issue: 1$/m);
});

test('the volume year follows the year the issue opened', () => {
  // deriveVolumes reads the issue date, so the min/max choice decides which year
  // an issue spanning a December→January boundary belongs to. Under the rule
  // above it is the year it OPENED.
  const issues = [
    { number: 1, date: new Date('2026-12-30T00:00:00Z') },
    { number: 2, date: new Date('2027-01-05T00:00:00Z') },
  ];
  const v = deriveVolumes(issues);
  assert.equal(v.get(1).year, 2026, 'an issue that opened in December left its volume');
  assert.equal(v.get(2).year, 2027);
  assert.equal(v.get(2).number, 1, 'the new volume no longer restarts numbering');
});
