import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Slice (c2), archive layer (§8 additions from the marked-up findings):
// the frontmatter reader, the UTC-midnight date reading, Postgres-faithful
// two-month arithmetic, the freshness boundary, and the static guard that
// every real article parses. Numbering continues the suite: N14–N19.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { parseFrontmatter, parseUtcDate, addTwoMonthsUtc, isFresh, sectionSlugs } =
  await import('../netlify/lib/archive.mts');

// --- N14: the frontmatter reader ------------------------------------------

test('N14: frontmatter reads quoted and unquoted scalars, skips comments', () => {
  const fm = parseFrontmatter(
    ["---", "# a comment", "title: 'An Example'", 'section: Opinion', 'date: 2026-07-15', '---', 'body'].join('\n')
  );
  assert.equal(fm.title, 'An Example');
  assert.equal(fm.section, 'Opinion');
  assert.equal(fm.date, '2026-07-15');
});

test('N14b: a file without frontmatter is unreadable, not a crash — fail closed', () => {
  assert.equal(parseFrontmatter('no frontmatter here'), null);
  assert.equal(parseFrontmatter('---\nunterminated: true\n'), null);
});

// --- N15: dates are read as UTC midnight ----------------------------------

test('N15: a plain date is UTC midnight, and impossible dates are refused', () => {
  const d = parseUtcDate('2026-07-15');
  assert.equal(d.toISOString(), '2026-07-15T00:00:00.000Z');
  assert.equal(parseUtcDate('2026-02-31'), null); // would roll over to March
  assert.equal(parseUtcDate('15 July 2026'), null);
  assert.equal(parseUtcDate('2026-7-15'), null);
});

// --- N16: two-month arithmetic follows Postgres, not JavaScript -----------

test("N16: + 2 months clamps to the end of the month, as `interval '2 months'` does", () => {
  // The case that separates the two: JS would roll Dec 31 into March 3rd.
  assert.equal(addTwoMonthsUtc(parseUtcDate('2025-12-31')).toISOString().slice(0, 10), '2026-02-28');
  assert.equal(addTwoMonthsUtc(parseUtcDate('2027-12-31')).toISOString().slice(0, 10), '2028-02-29'); // leap
  assert.equal(addTwoMonthsUtc(parseUtcDate('2026-01-31')).toISOString().slice(0, 10), '2026-03-31');
  assert.equal(addTwoMonthsUtc(parseUtcDate('2026-07-15')).toISOString().slice(0, 10), '2026-09-15');
  // Year rollover.
  assert.equal(addTwoMonthsUtc(parseUtcDate('2026-11-05')).toISOString().slice(0, 10), '2027-01-05');
});

// --- N17: the freshness boundary (R-024 §4, no grace period) --------------

test('N17: fresh one day inside the window, stale one day outside, exact edge excluded', () => {
  const published = parseUtcDate('2026-05-15');
  assert.equal(isFresh(published, new Date('2026-07-14T23:59:59Z')), true);
  assert.equal(isFresh(published, new Date('2026-07-15T00:00:00Z')), false); // now < edge, so the edge itself is out
  assert.equal(isFresh(published, new Date('2026-07-16T00:00:00Z')), false);
  assert.equal(isFresh(published, new Date('2026-05-15T00:00:00Z')), true); // publication day
});

// --- N18: the section roster the door validates against -------------------

test('N18: standing sections are valid letter targets, slugified', () => {
  const slugs = sectionSlugs();
  for (const expected of ['cover', 'opinion', 'ai-voices', 'the-metaphysical-corner']) {
    assert.ok(slugs.has(expected), `expected section slug ${expected}`);
  }
  assert.equal(slugs.has('arts'), false, 'a desk topic with no section page is not a target');
});

// --- N19: static guard — every real article parses -------------------------

test('N19: every published article parses, and the documented example does too', () => {
  const dir = join(root, 'src/content/articles');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  // The example is the template authors copy. If it ever drifts out of what
  // the door's reader understands, that is the warning we want — before a
  // real piece inherits the drift.
  assert.ok(files.includes('_example.md'), 'the documented example is missing');

  for (const file of files) {
    const fm = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
    assert.ok(fm, `${file}: frontmatter unreadable by the door's parser`);
    assert.ok(fm.section, `${file}: no section`);
    assert.ok(fm.date, `${file}: no date`);
    assert.ok(parseUtcDate(fm.date), `${file}: date "${fm.date}" is not a plain YYYY-MM-DD`);
  }
});
