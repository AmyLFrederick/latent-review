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

// --- The unquoted display title is uniform (editors, 2026-08-03) ------------

test('every surface that displays a title displays the unquoted one', () => {
  // THE FAULT THIS EXISTS FOR. The article header stopped printing the cover's
  // quotation marks on 2026-08-03 and nothing else did, so the front page's own
  // listing named the piece one way and the piece named itself another. The
  // sweep is only worth doing once; this is what keeps a NEW surface from
  // reintroducing the split.
  const surfaces = [
    ['src/components/IssueContents.astro', /\{displayTitle\(article\.data\.title\)\}/],
    ['src/components/ArticleCard.astro', /\{displayTitle\(d\.title\)\}/],
    ['src/components/QuestionAnswers.astro', /\{displayTitle\(d\.title\)\}/],
    ['src/pages/archive.astro', /\{displayTitle\(issue\.cover\.data\.title\)\}/],
    ['src/pages/topics.astro', /\{displayTitle\(article\.data\.title\)\}/],
    ['src/pages/articles/[slug]/as-submitted.astro', /displayTitle\(submittedTitle\)/],
    ['scripts/send-issue.mjs', /displayTitle\(coverStory\.title\)/],
  ];
  for (const [file, pattern] of surfaces) {
    assert.match(readFileSync(repoPath(file), 'utf8'), pattern, `${file} displays a raw title`);
  }
});

test('the browser tab agrees with the page it titles', () => {
  // A reader who saw the piece named one way on the page and another way in the
  // tab would reasonably conclude one of them was wrong.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.match(page, /title=\{displayTitle\(d\.title\)\}/);
});

test('the machine-facing surfaces still carry the recorded title', () => {
  // THE OTHER HALF OF THE RULING, and the more important half. The marks are
  // part of the recorded title because the title IS a quotation; a sweep that
  // reached the feeds would be editing the record to match a display
  // convention. The test is who is reading — a person, or a parser.
  for (const file of [
    'src/pages/rss.xml.js',
    'src/pages/llms.txt.js',
    'src/lib/structured-data.ts',
  ]) {
    assert.ok(
      !readFileSync(repoPath(file), 'utf8').includes('displayTitle'),
      `${file} is machine-facing and must carry the title as recorded`
    );
  }
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

test('the lead size is a MODIFIER, and the base kicker is untouched', () => {
  // `.kicker` is used on page headers, /prompts, the archive, the door, the
  // Provenance block and the Editors' Desk. The lead size reaches the handful
  // of places a SECTION NAME heads a page, and it does that by adding a class
  // rather than by changing the one every other surface reads.
  //
  // THIS REPLACED A SCOPED `.article-header .kicker` RULE. That worked while
  // the article header was the only surface with a large kicker; it stopped
  // working the moment the section pages needed the same size, because a rule
  // scoped to one page cannot be shared by six. The invariant it protected —
  // the base kicker does not grow — is what is asserted here instead.
  const global = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  assert.match(global, /\.kicker \{[^}]*font-size: 0\.75rem/, 'the BASE kicker size was changed');
  assert.match(global, /\.kicker--lead,/, 'the lead modifier is missing');

  // One declaration block for both selectors: the size cannot be stated twice
  // and drift between the class and its h1 form.
  const lead = global.slice(global.indexOf('.kicker--lead,'));
  const block = lead.slice(0, lead.indexOf('}') + 1);
  assert.match(block, /\.page-header h1\.kicker--lead/, 'the h1 form is not in the same block');
  assert.equal((block.match(/font-size:/g) ?? []).length, 1, 'the lead size is declared twice');
});

test('every page that leads with a section name uses the one lead class', () => {
  // The whole point of the extension: one size wherever a section name heads a
  // page. Asserted as a LIST, because the failure mode is a seventh surface
  // that grows a section heading and quietly sets its own size.
  const surfaces = [
    ['src/pages/articles/[slug].astro', 'the article header'],
    ['src/pages/prompts.astro', '/prompts'],
    ['src/pages/prompts/archive.astro', '/prompts/archive'],
    ['src/pages/letters.astro', '/letters'],
    ['src/pages/archive.astro', '/archive'],
    ['src/pages/section/[slug].astro', 'the section pages'],
    ['src/pages/topics.astro', '/topics'],
  ];
  for (const [file, name] of surfaces) {
    assert.match(
      readFileSync(repoPath(file), 'utf8'),
      /kicker--lead/,
      `${name} no longer uses the shared lead kicker`
    );
  }
});

test('the lead size actually leads — no page-header variant outranks it', () => {
  // THE BUG THIS EXISTS FOR, and it was live: `.page-header--compact h1` ties
  // with `.page-header h1.kicker--lead` on specificity and is declared later,
  // so it silently won. The <p>-based section names took the lead size and the
  // h1-based ones took the compact size — one rule, two results, and nothing
  // failed.
  //
  // Asserted against the SOURCE cascade rather than a rendered size, because
  // the failure is a tie broken by declaration order and that is exactly what
  // a later edit reintroduces without noticing.
  const css = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  const lead = css.slice(css.indexOf('.kicker--lead,'));
  const block = lead.slice(0, lead.indexOf('}') + 1);

  for (const selector of ['.page-header h1.kicker--lead', '.page-header--compact h1.kicker--lead']) {
    assert.ok(block.includes(selector), `${selector} is missing from the lead rule`);
  }
  assert.equal((block.match(/font-size:/g) ?? []).length, 1, 'the lead size is declared twice');
});

test('no page carries its own section-heading size', () => {
  // /prompts had a scoped `.prompts-header h1 { font-size: 0.75rem }` left over
  // from when its kicker was deliberately small. It survived the extension and
  // held that one page at the old size while six others grew — which is what a
  // per-page override does the moment a shared rule arrives. There is none now,
  // and the section pages all use the same header classes.
  const prompts = readFileSync(repoPath('src/pages/prompts.astro'), 'utf8');
  assert.ok(!/prompts-header/.test(prompts), '/prompts has a private header rule again');
  assert.match(prompts, /<header class="page-header page-header--compact">/);

  for (const file of ['src/pages/section/[slug].astro', 'src/pages/topics.astro']) {
    assert.match(
      readFileSync(repoPath(file), 'utf8'),
      /<header class="page-header page-header--compact">/,
      `${file} no longer shares the section-page header`
    );
  }
});
