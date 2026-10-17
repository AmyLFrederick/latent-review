// THE CORRECTIONS RECORD (2026-10-17). What these tests protect:
//
//   1. ONE RENDERING. The piece and /corrections print each correction from
//      the same formatter, and the built pages carry byte-identical blocks. Two
//      renderings would be two accounts of one correction.
//   2. EVERY CORRECTION IN CONTENT IS ON THE INDEX — counted from the
//      frontmatter itself, so an index that dropped one cannot pass.
//   3. ANCHORS ARE BUILT FROM WHAT A CORRECTION SAYS, NEVER WHERE IT SITS, and
//      the anchors already published are pinned: an anchor that moves is a
//      citation that breaks.
//   4. NEWEST FIRST, NEVER PRUNED, AND RETRACTED OVERRIDES CORRECTED.
//   5. THE POLICY QUOTES THE PUBLISHED PROMISES VERBATIM.
//   6. THE NOTICE ON THE PIECE IS NOT DEMOTED: it stays first in the apparatus.
//
// Built-page checks run only after `npm run build`, as in notation.test.mjs;
// everything else reads source and runs without one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CORRECTION_TYPES,
  CORRECTION_TYPE_LABELS,
  CORRECTION_TYPE_MEANINGS,
  DEFAULT_CORRECTION_TYPE,
  INDEX_HEADER,
  PROMISE_PROVENANCE_BLOCK,
  PROMISE_TERMS,
  collectCorrections,
  correctionAnchor,
  correctionArticleHref,
  correctionEntryHtml,
  correctionMachineFields,
  pieceCorrectionStatus,
  retractionFields,
  statusLineText,
} from '../src/lib/corrections.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const read = (rel) => readFileSync(repoPath(rel), 'utf8');
const day = (iso) => new Date(`${iso}T00:00:00Z`);

const c = (iso, what, extra = {}) => ({
  date: day(iso),
  what,
  was: 'old',
  now: 'new',
  note: 'Because.',
  ...extra,
});

// --- Content, read straight from the frontmatter --------------------------

/**
 * Every correction in every published piece, as { slug, date, what }. A small
 * reader for the one shape the schema allows — a `corrections:` block of
 * `  - ` entries with scalar fields — so the suite counts what the content
 * holds without a YAML dependency.
 */
function contentCorrections() {
  const dir = repoPath('src/content/articles');
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md') || name.startsWith('_')) continue;
    const raw = readFileSync(`${dir}/${name}`, 'utf8');
    const front = raw.slice(0, raw.indexOf('\n---', 4));
    const lines = front.split('\n');
    const start = lines.findIndex((l) => /^corrections:\s*$/.test(l));
    if (start === -1) continue;
    let current = null;
    for (const line of lines.slice(start + 1)) {
      if (line !== '' && !/^\s/.test(line) && !line.startsWith('#')) break;
      const item = line.match(/^ {2}- (\w+):\s*(.*)$/);
      const field = line.match(/^ {4}(\w+):\s*(.*)$/);
      const [key, value] = item ? [item[1], item[2]] : field ? [field[1], field[2]] : [];
      if (item) out.push((current = { slug: name.replace(/\.md$/, '') }));
      if (key && current) current[key] = value.replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
    }
  }
  return out;
}

test('the content holds at least the journal’s first correction', () => {
  const found = contentCorrections();
  assert.ok(
    found.some((x) => x.slug === 'porous-enough-to-admit-the-sky' && x.what === 'The byline.'),
    'the frontmatter reader no longer finds the 2026-08-04 byline correction — the reader has drifted from the content.'
  );
});

// --- 3. Anchors -------------------------------------------------------------

test('an anchor is slug + date + slug of `what`', () => {
  assert.equal(
    correctionAnchor('a-piece', c('2026-08-04', 'The byline.')),
    'c-a-piece-2026-08-04-the-byline'
  );
  assert.equal(
    correctionAnchor('a-piece', c('2026-09-01', 'Café “quotes” & ampersands')),
    'c-a-piece-2026-09-01-cafe-quotes-ampersands'
  );
});

test('anchors do not move when a correction is inserted before them', () => {
  const later = c('2026-09-01', 'The date');
  const before = collectCorrections([{ slug: 'p', title: 'P', corrections: [later] }]);
  const after = collectCorrections([
    { slug: 'p', title: 'P', corrections: [c('2026-08-01', 'The title'), later] },
  ]);
  assert.equal(
    after.find((e) => e.correction === later).anchor,
    before[0].anchor,
    'an anchor changed with array position'
  );
});

test('the anchors already published never change', () => {
  // APPEND TO THIS LIST, NEVER EDIT IT. Each line is a citation somebody may
  // already hold. A failure here means a published correction's `what` or
  // date was edited, which the append-only doctrine forbids.
  const PUBLISHED = ['c-porous-enough-to-admit-the-sky-2026-08-04-the-byline'];
  const live = new Set(
    contentCorrections().map((x) => correctionAnchor(x.slug, { date: day(x.date), what: x.what }))
  );
  for (const anchor of PUBLISHED) {
    assert.ok(live.has(anchor), `published anchor ${anchor} no longer exists`);
  }
});

test('two corrections that would cite as one fail', () => {
  assert.throws(
    () =>
      collectCorrections([
        { slug: 'p', title: 'P', corrections: [c('2026-08-01', 'The byline'), c('2026-08-01', 'the byline.')] },
      ]),
    /share the anchor/
  );
  assert.throws(() => correctionAnchor('p', c('2026-08-01', '—')), /cannot be given a citable anchor/);
});

test('the schema refuses a duplicate anchor on one piece, by name', () => {
  const schema = read('src/content.config.ts');
  assert.match(schema, /TWO CORRECTIONS THAT WOULD CITE AS ONE/);
});

// --- 4. Order and status ----------------------------------------------------

test('the index runs newest first, and the order is total', () => {
  const entries = collectCorrections([
    { slug: 'b', title: 'B', corrections: [c('2026-08-04', 'One'), c('2026-08-04', 'Two')] },
    { slug: 'a', title: 'A', corrections: [c('2026-08-04', 'Three'), c('2026-09-01', 'Four')] },
    { slug: 'c', title: 'C', corrections: [c('2026-07-01', 'Five')] },
  ]);
  assert.deepEqual(
    entries.map((e) => e.correction.what),
    // Newest date first; on a tie, by slug, and within a piece the later-appended entry first.
    ['Four', 'Three', 'Two', 'One', 'Five']
  );
});

test('nothing is pruned', () => {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    slug: `p${i}`,
    title: `P${i}`,
    corrections: [c('2026-08-01', 'The thing')],
  }));
  assert.equal(collectCorrections(pieces).length, 40);
});

test('RETRACTED overrides Corrected wherever both apply', () => {
  const list = [
    c('2026-08-01', 'The byline'),
    c('2026-08-10', 'The piece', { type: 'retraction' }),
    c('2026-08-20', 'A later date'),
  ];
  const status = pieceCorrectionStatus('p', list);
  assert.equal(status.state, 'retracted');
  assert.equal(status.anchor, 'c-p-2026-08-10-the-piece', 'the status line points at the retraction');
  assert.equal(statusLineText(status), 'RETRACTED August 10, 2026');
  assert.deepEqual(retractionFields('p', list), { retracted: true, retracted_on: '2026-08-10' });

  const corrected = pieceCorrectionStatus('p', [c('2026-08-01', 'A'), c('2026-08-05', 'B')]);
  assert.equal(corrected.state, 'corrected');
  assert.equal(statusLineText(corrected), 'Corrected August 5, 2026');
  assert.equal(pieceCorrectionStatus('p', undefined), null);
  assert.deepEqual(retractionFields('p', undefined), { retracted: false, retracted_on: null });
});

// --- Types --------------------------------------------------------------------

test('the type vocabulary is closed, defaults to correction, and every type is a word', () => {
  assert.deepEqual(CORRECTION_TYPES, ['correction', 'clarification', 'provenance-disagreement', 'retraction']);
  assert.equal(DEFAULT_CORRECTION_TYPE, 'correction');
  for (const type of CORRECTION_TYPES) {
    assert.match(CORRECTION_TYPE_LABELS[type], /^[A-Z][a-z ]+$/, `${type} has no word label`);
    assert.ok(CORRECTION_TYPE_MEANINGS[type], `${type} has no meaning on /corrections`);
    assert.ok(
      correctionEntryHtml('p', c('2026-08-01', 'X', { type })).includes(`>${CORRECTION_TYPE_LABELS[type]}<`),
      `the ${type} label is not printed as a word in the entry`
    );
  }
  // An entry written before the field existed renders as a correction.
  assert.ok(correctionEntryHtml('p', c('2026-08-01', 'X')).includes('>Correction<'));
  const schema = read('src/content.config.ts');
  assert.match(schema, /\.default\(DEFAULT_CORRECTION_TYPE\)/, 'the schema no longer defaults the type');
});

test('the machine fields add to the published five and point at both pages', () => {
  const fields = correctionMachineFields('p', c('2026-08-04', 'The byline.'), 'https://example.org/');
  assert.deepEqual(fields, {
    type: 'correction',
    anchor: 'c-p-2026-08-04-the-byline',
    url: 'https://example.org/articles/p/#c-p-2026-08-04-the-byline',
    index_url: 'https://example.org/corrections/#c-p-2026-08-04-the-byline',
  });
  for (const surface of ['src/pages/issues.json.js', 'src/pages/feed.json.js', 'src/pages/spread.json.js']) {
    const source = read(surface);
    assert.match(source, /correctionMachineFields\(article\.id, c, site\)/, `${surface} omits the new correction fields`);
    assert.match(source, /retractionFields\(article\.id, d\.corrections\)/, `${surface} omits retraction status`);
    for (const field of ['date:', 'what:', 'was:', 'now:', 'note:']) {
      assert.ok(source.includes(field), `${surface} stopped emitting ${field}`);
    }
  }
});

// --- 1. One rendering ---------------------------------------------------------

test('the entry escapes what it prints and keeps the original sentence', () => {
  const html = correctionEntryHtml('p', c('2026-08-04', 'A <b> tag', { was: 'x & y', now: '"z"' }));
  assert.ok(!html.includes('<b>'), 'markup in a correction reached the page unescaped');
  assert.ok(html.includes('This piece was published reading'));
  assert.ok(html.includes('<span class="correction-was">x &amp; y</span>'));
  assert.ok(html.includes('it now reads <span class="correction-now">&quot;z&quot;</span>'));
  assert.ok(html.startsWith('<div class="correction" id="c-p-2026-08-04-a-b-tag"'));
});

test('both pages render entries through the shared formatter and nothing else', () => {
  const article = read('src/pages/articles/[slug].astro');
  const index = read('src/pages/corrections.astro');
  for (const [name, source] of [['article', article], ['index', index]]) {
    assert.match(source, /correctionEntryHtml\(/, `the ${name} page no longer uses the shared formatter`);
    assert.ok(!source.includes('class="correction-was"'), `the ${name} page renders a correction by hand`);
  }
});

/** Each correction block on a built page, keyed by anchor. */
function blocks(html) {
  const out = new Map();
  for (const m of html.matchAll(/<div class="correction" id="([^"]+)"[^>]*>[\s\S]*?<\/div>/g)) {
    out.set(m[1], m[0]);
  }
  return out;
}

test('every correction in content is on the index, rendered identically to the piece', () => {
  const indexFile = repoPath('dist/corrections/index.html');
  if (!existsSync(indexFile)) return; // `npm test` may run before a build; the source checks above always run.

  const onIndex = blocks(readFileSync(indexFile, 'utf8'));
  const expected = contentCorrections();
  assert.equal(onIndex.size, expected.length, 'the index does not list exactly the corrections the content holds');

  for (const x of expected) {
    const anchor = correctionAnchor(x.slug, { date: day(x.date), what: x.what });
    const articleFile = repoPath(`dist/articles/${x.slug}/index.html`);
    const onPiece = blocks(readFileSync(articleFile, 'utf8'));
    assert.ok(onPiece.has(anchor), `${anchor} is missing from its piece`);
    assert.ok(onIndex.has(anchor), `${anchor} is missing from the index`);
    assert.equal(onIndex.get(anchor), onPiece.get(anchor), `${anchor} renders differently on the index and the piece`);
    assert.ok(
      readFileSync(indexFile, 'utf8').includes(`href="${correctionArticleHref(x.slug, { date: day(x.date), what: x.what })}"`),
      `${anchor}: the index does not deep-link to the correction on the piece`
    );
  }
});

test('a corrected piece carries the status line, linked to its correction', () => {
  // Gated on the index existing, so a dist/ left over from before this page
  // existed is not read as the current build.
  if (!existsSync(repoPath('dist/corrections/index.html'))) return;
  for (const x of contentCorrections()) {
    const html = readFileSync(repoPath(`dist/articles/${x.slug}/index.html`), 'utf8');
    const anchor = correctionAnchor(x.slug, { date: day(x.date), what: x.what });
    const line = html.match(/<p class="article-correction-status[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    assert.ok(line, `${x.slug}: no status line above the title`);
    assert.match(line, /^<a href="#c-[^"]+"[^>]*>(Corrected|RETRACTED) [A-Z][a-z]+ \d{1,2}, \d{4}<\/a>$/);
    assert.ok(
      html.indexOf('article-correction-status') < html.indexOf('<h1 class="article-title"'),
      `${x.slug}: the status line is not above the title`
    );
    assert.ok(line.includes('#c-') && html.includes(`id="${anchor}"`), `${x.slug}: the status line points nowhere`);
  }
});

// --- 6. Not demoted -----------------------------------------------------------

test('the notice on the piece stays first in the apparatus', () => {
  const article = read('src/pages/articles/[slug].astro');
  const at = (needle) => {
    const i = article.indexOf(needle);
    assert.notEqual(i, -1, `${needle} not found in the article template`);
    return i;
  };
  const corrections = at('<aside class="corrections"');
  assert.ok(corrections > at('<Content />'), 'the corrections notice moved above the body');
  for (const later of ['<aside class="editorial-note"', '<aside class="editors-note"', '<aside class="personal-note"', '<ProvenanceBlock']) {
    assert.ok(corrections < at(later), `the corrections notice no longer precedes ${later}`);
  }
  // Its own styles are untouched: full opacity, the accent rule above it.
  assert.match(article, /\.corrections \{[^}]*border-top: 2px solid var\(--accent/);
  assert.ok(!/\.corrections \{[^}]*opacity/.test(article), 'the corrections notice was set to recede');
});

// --- 5. The promises, verbatim ------------------------------------------------

test('the policy quotes the published promises verbatim', () => {
  const terms = read('docs/TERMS.md');
  assert.ok(terms.includes(PROMISE_TERMS), 'the Terms no longer carry the sentence /corrections quotes from them');
  const block = read('src/components/ProvenanceBlock.astro');
  assert.match(block, /\{PROMISE_PROVENANCE_BLOCK\}/, 'the Provenance block no longer prints the shared promise');
  assert.equal(
    PROMISE_PROVENANCE_BLOCK,
    'Provenance is set at acceptance and never altered. Corrections run as visible corrections; the original stays in the record.',
    'the Provenance block promise was reworded — it has been printed on every piece since launch'
  );
  const index = read('src/pages/corrections.astro');
  for (const name of ['PROMISE_PROVENANCE_BLOCK', 'PROMISE_TERMS', 'INDEX_HEADER']) {
    assert.ok(index.includes(`{${name}}`), `/corrections no longer prints ${name}`);
  }
  assert.match(INDEX_HEADER, /^Corrections live on the piece\./);
});

test('errors are reported to an address the site already publishes', () => {
  const index = read('src/pages/corrections.astro');
  assert.match(index, /mailto:\$\{LETTERS_CONTACT\}/);
  assert.ok(!/@thelatentreview\.com/.test(index), 'a contact address was typed by hand rather than read from site.ts');
});
