// The article header (editors' redesign, 2026-08-03). What these tests protect:
//
//   1. displayTitle unwraps a MATCHED pair and never edits a title otherwise.
//   2. The unwrapping is display-only — the data keeps its marks.
//   3. The date is gone from the header and still present in the record.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { displayTitle } from '../src/lib/site.ts';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('displayTitle unwraps a matched pair of quotation marks', () => {
  assert.equal(displayTitle('"It Means Something to Me"'), 'It Means Something to Me');
  assert.equal(displayTitle('“It Means Something to Me”'), 'It Means Something to Me');
});

test('displayTitle never edits a title that merely CONTAINS a quotation', () => {
  // The failure this prevents is the one that would look like a fix: stripping
  // a lone mark, or the marks around an inner quotation, edits an author's
  // title rather than unwrapping it.
  assert.equal(displayTitle('What "Provenance" Means'), 'What "Provenance" Means');
  assert.equal(displayTitle('"An unclosed quotation'), '"An unclosed quotation');
  assert.equal(displayTitle('An unopened quotation"'), 'An unopened quotation"');
  assert.equal(displayTitle('Grief Without a Griever'), 'Grief Without a Griever');
  assert.equal(displayTitle('"'), '"'); // a lone mark is not a pair
});

test('the unwrapping is display-only — the stored title keeps its marks', () => {
  // The ruling is explicit that title data is unchanged. If a later session
  // "tidies" the frontmatter to match what the header shows, the permalink,
  // the feeds and the JSON indexes all quietly lose the quotation that IS the
  // title, and this is the assertion that stops it.
  const src = readFileSync(repoPath('src/content/articles/it-means-something-to-me.md'), 'utf8');
  assert.match(src, /title: '"It Means Something to Me"'/);
});

test('the header renders the title through displayTitle, not raw', () => {
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.match(page, /<h1 class="article-title">\{displayTitle\(d\.title\)\}<\/h1>/);
});

test('the header carries no date line, and no title attribution', () => {
  // R-048: pieces belong to issues and the issue carries the date. The date
  // itself is asserted present in the Provenance block below, so this is a
  // move rather than a deletion.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  const header = page.slice(page.indexOf('<header class="article-header"'), page.indexOf('</header>'));
  assert.ok(!/<time/.test(header), 'a date is still rendered in the article header');
  assert.ok(!/formatDate/.test(header), 'the header still formats a date');
  assert.ok(
    !/title_attribution/.test(header),
    'the title attribution line is still rendered in the header'
  );
});

test('the piece keeps its date where the ruling says it stays', () => {
  // The Provenance block's Published row, and the frontmatter. R-048 moves a
  // display, not a fact.
  const block = readFileSync(repoPath('src/components/ProvenanceBlock.astro'), 'utf8');
  assert.match(block, /Published/, 'the Provenance block no longer carries the publication date');
  const piece = readFileSync(repoPath('src/content/articles/it-means-something-to-me.md'), 'utf8');
  assert.match(piece, /^date: 2026-08-02$/m);
});

test('the section kicker is scoped to the article header, never global', () => {
  // `.kicker` is used on page headers, /prompts, the archive and the door.
  // Enlarging it globally would resize the whole site to fix one header.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.match(page, /\.article-header \.kicker \{/, 'the kicker override is not scoped');
  const global = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  assert.match(global, /\.kicker \{[^}]*font-size: 0\.75rem/, 'the GLOBAL kicker size was changed');
});
