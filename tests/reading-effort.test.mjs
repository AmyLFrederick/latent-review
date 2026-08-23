// THE EFFORT-AND-TIME INDICATOR (editors, dual yes, 2026-08-23). What these
// tests protect:
//
//   1. The measure is Flesch Reading Ease, computed as published, everywhere.
//   2. The thresholds are Flesch's own band boundaries and are not tuned.
//   3. Reading time is complexity-adjusted, anchored to the SAME thresholds.
//   4. Only the piece's own prose is counted — quoted exchanges, block quotes,
//      lists, headings, code and the whole editorial apparatus are excluded.
//   5. It is DERIVED: no frontmatter field feeds it, and none may be added.
//   6. It is announced at no submission door.
//   7. The page, /issues.json and /corpus.jsonl all print the same string.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  MEASURE,
  MEASURE_NAME,
  THRESHOLD_LIGHT,
  THRESHOLD_MEDIUM,
  WPM_FAST,
  WPM_SLOW,
  LEVELS,
  countableProse,
  effortLevel,
  formatIndicator,
  readingEffort,
  readingEffortFields,
  syllables,
  wordsPerMinute,
} from '../src/lib/reading-effort.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

/** Every published piece's body, keyed by slug. Skips the documented example. */
function publishedBodies() {
  const dir = repoPath('src/content/articles');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => {
      const raw = readFileSync(`${dir}/${name}`, 'utf8');
      return { slug: name.replace(/\.md$/, ''), body: raw.slice(raw.indexOf('\n---', 4) + 4) };
    });
}

// --- The measure ------------------------------------------------------------

test('the measure is named, and it is the one the documentation names', () => {
  // "Pick one, name it, and use it everywhere" is the ruling's own wording. A
  // measure that had to be inferred from the numbers would fail clause 1 even
  // if the numbers were right.
  assert.equal(MEASURE, 'flesch-reading-ease');
  assert.equal(MEASURE_NAME, 'Flesch Reading Ease');
});

test('the score is Flesch Reading Ease, computed as published', () => {
  // Asserted against the formula applied by hand to the module's OWN counts, so
  // this pins the arithmetic rather than restating the constants. If the
  // coefficients drift, this fails; if the counting changes, the counting tests
  // below fail and this one still holds.
  const text =
    'The desk reads a piece twice. It reads it once as a reader would, and once as a record. ' +
    'Neither reading is the other, and the second is the one this journal publishes.';
  const e = readingEffort(text);
  const expected =
    206.835 - 1.015 * (e.words / e.sentences) - 84.6 * (e.syllables / e.words);
  assert.equal(e.score, Math.round(expected * 10) / 10);
});

test('a higher score is an easier text, and the scale is not clamped', () => {
  const easy = readingEffort('The cat sat. The dog ran. We saw them go.');
  const hard = readingEffort(
    'The epistemological indeterminacy characterising interpretative phenomenological ' +
      'investigation necessitates methodological circumspection insufficiently acknowledged ' +
      'throughout contemporary computational literature concerning representational ' +
      'intentionality and its purported instantiation.'
  );
  assert.ok(easy.score > hard.score, 'the scale has inverted');
  // NOT FLOORED AT A TIDY NUMBER. Dense prose scores below zero on Flesch's
  // scale, and the formula is left to say so — a clamp would quietly compress
  // exactly the pieces this indicator exists to warn about.
  assert.ok(hard.score < 0, 'the score has been clamped at the bottom');
});

// --- The thresholds ---------------------------------------------------------

test('there are exactly three levels, and their display words are the ruling’s', () => {
  assert.deepEqual(
    LEVELS.map((l) => l.id),
    ['light', 'medium', 'high']
  );
  assert.deepEqual(
    LEVELS.map((l) => l.display),
    ['Light effort', 'Medium effort', 'High effort']
  );
});

test('the thresholds are Flesch’s own band boundaries', () => {
  // THE POINT OF ASSERTING LITERALS HERE. Everywhere else in this suite the
  // constants are read rather than retyped, deliberately. These two are typed
  // out, because the failure they guard is not a typo — it is a later session
  // nudging a boundary so the corpus distributes more agreeably, which is the
  // editors setting levels by hand with extra steps. A test that read the
  // constant would pass through that change without a word.
  assert.equal(THRESHOLD_LIGHT, 60);
  assert.equal(THRESHOLD_MEDIUM, 30);
});

test('the bands are half-open at the top and closed at the bottom', () => {
  assert.equal(effortLevel(100), 'light');
  assert.equal(effortLevel(THRESHOLD_LIGHT), 'light');
  assert.equal(effortLevel(THRESHOLD_LIGHT - 0.1), 'medium');
  assert.equal(effortLevel(THRESHOLD_MEDIUM), 'medium');
  assert.equal(effortLevel(THRESHOLD_MEDIUM - 0.1), 'high');
  assert.equal(effortLevel(-40), 'high');
});

// --- Reading time -----------------------------------------------------------

test('reading time is complexity-adjusted, anchored at the same two thresholds', () => {
  // THE ANCHORING IS THE INVARIANT, not the slope. One pair of numbers governs
  // both halves of the indicator; if the speeds ever get their own boundaries,
  // the minutes and the level can be tuned against each other and the ruling's
  // "MORE accurate, not editorialised" stops being checkable.
  assert.equal(wordsPerMinute(THRESHOLD_LIGHT), WPM_FAST);
  assert.equal(wordsPerMinute(THRESHOLD_MEDIUM), 200);
  assert.ok(wordsPerMinute(45) > 200 && wordsPerMinute(45) < WPM_FAST, 'the line is not linear');
});

test('the speed is clamped to the range the research supports', () => {
  assert.equal(WPM_FAST, 250);
  assert.equal(WPM_SLOW, 180);
  assert.equal(wordsPerMinute(95), WPM_FAST, 'an easy piece reads faster than the default');
  assert.equal(wordsPerMinute(-60), WPM_SLOW, 'a dense piece falls below the evidence');
});

test('a dense piece is always given more minutes per word than an easy one', () => {
  // The whole justification for adjusting at all. Same word count, different
  // prose: the harder one must take longer, or the adjustment is decoration.
  // Same shape on both sides — 200 three-word sentences — so the ONLY variable
  // is how hard the words are. Sentence length is the formula's other term, and
  // letting it drift would make this test prove nothing.
  const passage = (word) => Array.from({ length: 200 }, () => `The ${word} held.`).join(' ');
  const easy = readingEffort(passage('cat'));
  const hard = readingEffort(passage('epistemological'));
  assert.equal(easy.words, hard.words);
  assert.equal(easy.sentences, hard.sentences);
  assert.ok(hard.minutes > easy.minutes, 'a denser piece of the same length reads no slower');
});

test('minutes round up and never reach zero', () => {
  assert.equal(readingEffort('One short line.').minutes, 1);
  assert.equal(readingEffort('').minutes, 1);
});

// --- What is counted --------------------------------------------------------

test('block quotes and quoted transcripts are excluded', () => {
  // CLAUSE 3'S NAMED FAILURE, in miniature: without this a piece carrying a
  // long quoted exchange inflates on both halves of the indicator — more
  // minutes, and a score computed partly from somebody else's sentences.
  const markdown = [
    'The desk asked what the piece was for.',
    '',
    '> I wanted to know whether the thing I had written was mine.',
    '> The answer took longer than the writing did.',
    '',
    'It answered its own question in the end.',
  ].join('\n');
  const prose = countableProse(markdown).join(' ');
  assert.ok(prose.includes('The desk asked'), 'the author’s own prose was dropped');
  assert.ok(prose.includes('answered its own question'), 'prose after a quote was dropped');
  assert.ok(!prose.includes('wanted to know'), 'a quoted exchange is being counted');
});

test('headings, lists, images, rules and code are excluded', () => {
  const markdown = [
    '# A heading',
    '',
    'The only sentence that counts.',
    '',
    '- a list item',
    '- another',
    '',
    '---',
    '',
    '![an image](/somewhere.png)',
    '',
    '```',
    'const notProse = true;',
    '```',
  ].join('\n');
  assert.deepEqual(countableProse(markdown), ['The only sentence that counts.']);
});

test('the editorial apparatus is excluded by living outside the body', () => {
  // THE ARGUMENT FOR COUNTING `body` RATHER THAN THE RENDERED PAGE, asserted
  // against the schema rather than against prose. Every one of these is a
  // frontmatter field or a layout element, so counting the body excludes the
  // whole apparatus without a rule that has to enumerate it — and a rule that
  // enumerated it would fall out of date the first time a field was added.
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  for (const field of [
    'dek',
    'editorial_note',
    'editors_note',
    'personal_note',
    'attestation',
    'corrections',
    'prompt_disclosure',
    'title_attribution',
  ]) {
    assert.match(
      schema,
      new RegExp(`^\\s*${field}:`, 'm'),
      `${field} is no longer frontmatter — check it is still outside the counted prose`
    );
  }
});

test('inline markup is stripped, and link text is kept', () => {
  const prose = countableProse('A **bold** claim about [the record](/archive/) and `code`.');
  assert.deepEqual(prose, ['A bold claim about the record and code.']);
});

test('the counted words are at or below the body’s own word count, on every piece', () => {
  // Asserted across the real corpus rather than a fixture, because the
  // invariant a consumer will actually check is between `reading_effort.words`
  // and the `text` field beside it in /corpus.jsonl.
  for (const { slug, body } of publishedBodies()) {
    const total = body.split(/\s+/).filter(Boolean).length;
    assert.ok(
      readingEffort(body).words <= total,
      `${slug} counts more words than its body contains`
    );
  }
});

test('the cover piece’s quoted exchange is actually excluded', () => {
  // THE LIVE CASE THE RULING WAS WRITTEN AGAINST. The cover carries a long
  // quoted exchange; if this ever equals the body count, the exclusion has
  // silently stopped working on the one piece it most matters for.
  const cover = publishedBodies().find((p) => p.slug === 'it-means-something-to-me');
  assert.ok(cover, 'the cover piece has left the collection');
  const total = cover.body.split(/\s+/).filter(Boolean).length;
  const counted = readingEffort(cover.body).words;
  assert.ok(
    total - counted > 300,
    `the cover’s quoted exchange is being counted (${total} in body, ${counted} counted)`
  );
});

// --- The syllable heuristic -------------------------------------------------

test('the syllable heuristic handles the endings it claims to', () => {
  assert.equal(syllables('the'), 1);
  assert.equal(syllables('fire'), 1, 'a silent terminal e');
  assert.equal(syllables('candle'), 2, '-le carries a syllable');
  assert.equal(syllables('simple'), 2);
  assert.equal(syllables('cared'), 1, 'a silent -ed');
  assert.equal(syllables('wanted'), 2, '-ed after t is pronounced');
  assert.equal(syllables('houses'), 2, '-es after a sibilant is pronounced');
  assert.equal(syllables('boxes'), 2);
  assert.equal(syllables('young'), 1, 'a leading y is a consonant');
  assert.equal(syllables('rhythm'), 1, 'y is the only vowel');
  assert.equal(syllables('provenance'), 3);
  assert.equal(syllables('ephemerality'), 6);
});

test('a token splits on non-letters before it is counted', () => {
  // An em-dashed compound is two words' worth of syllables, not one impossible
  // one. The house \S+ word count still treats it as a single word; the two
  // disagree deliberately, because they are counting different things.
  assert.equal(syllables('thought—which'), syllables('thought') + syllables('which'));
  assert.equal(syllables('—'), 0);
});

test('every word counts as at least one syllable', () => {
  for (const word of ['a', 'I', 'e', 'the', 'shed', 'zzz']) {
    assert.ok(syllables(word) >= 1, `${word} counted as no syllables`);
  }
});

// --- The published shape ----------------------------------------------------

test('the display string is the ruling’s format, built in one place', () => {
  // Reading time first, effort level second — the ruling states the order, and
  // the order is the thing a later "tidy" would reverse.
  assert.equal(formatIndicator(7, 'high'), '7 min · High effort');
  assert.equal(formatIndicator(1, 'light'), '1 min · Light effort');
  assert.match(readingEffort('A short piece of prose, plainly written.').display, /^\d+ min · /);
});

test('the published object carries the whole working', () => {
  // CLAUSE 4 MADE CHECKABLE. The journal cannot explain a level by judgment,
  // because no judgment was involved — so the only honest answer to "why did my
  // piece land here" is the arithmetic, and the arithmetic has to be in the
  // data. A field dropped from this list is a level a reader cannot check.
  const fields = readingEffortFields('Some prose. Two sentences of it, in fact.');
  assert.deepEqual(Object.keys(fields).sort(), [
    'display',
    'level',
    'level_display',
    'measure',
    'minutes',
    'score',
    'sentences',
    'syllables',
    'words',
    'words_per_minute',
  ]);
  assert.equal(fields.measure, MEASURE);
});

test('the published object re-derives to the string it publishes', () => {
  // The consumer-facing promise, run against every published piece: our own
  // numbers, put back through our own published formulas, give our own string.
  for (const { slug, body } of publishedBodies()) {
    const f = readingEffortFields(body);
    assert.equal(f.words_per_minute, wordsPerMinute(f.score), `${slug}: speed does not re-derive`);
    assert.equal(
      f.minutes,
      Math.max(1, Math.ceil(f.words / f.words_per_minute)),
      `${slug}: minutes do not re-derive`
    );
    assert.equal(f.level, effortLevel(f.score), `${slug}: level does not re-derive`);
    assert.equal(f.display, formatIndicator(f.minutes, f.level), `${slug}: display disagrees`);
  }
});

test('a piece with no countable prose still gets a whole indicator', () => {
  // A missing indicator would read as a piece the journal declined to measure,
  // which is worse than a degenerate one — and the build must not fail because
  // a piece is all epigraph.
  const empty = readingEffort('> Only a quotation.\n\n# And a heading');
  assert.equal(empty.words, 0);
  assert.equal(empty.score, null);
  assert.equal(empty.minutes, 1);
  assert.equal(empty.level, 'light');
  assert.equal(empty.display, '1 min · Light effort');
});

// --- It is derived, and it is not a door term -------------------------------

test('no frontmatter field can set or override a level', () => {
  // THE RULING'S HARDEST CLAUSE TO KEEP, because the pressure to add an
  // override arrives the first time a piece lands somewhere the editors dislike
  // — and the ruling answers that case in advance: it is information about the
  // text, not a bug to correct. Asserted against the schema, where an override
  // would have to be declared.
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  for (const pattern of [/reading_effort/, /effort_level/, /reading_time/, /\beffort:/]) {
    assert.ok(!pattern.test(schema), `the schema has grown an effort field: ${pattern}`);
  }
  for (const { slug, body } of publishedBodies()) {
    assert.ok(body.length > 0, `${slug} has no body to measure`);
  }
});

test('the indicator is announced at no submission door', () => {
  // DELIBERATELY OUT OF SCOPE (the ruling's own words). It is a computed
  // property of published text, not a term authors agree to in advance — and
  // the editors' reason is that nobody should be writing toward the metric. A
  // later session documenting it "for completeness" at a door is exactly the
  // failure, so the doors are enumerated.
  for (const file of [
    'src/pages/submit.astro',
    'src/components/DoorBoxes.astro',
    'src/pages/door/open-v2.astro',
    'src/pages/door/topics-v3.astro',
  ]) {
    const src = readFileSync(repoPath(file), 'utf8');
    for (const term of ['reading-effort', 'reading_effort', 'Light effort', 'Medium effort', 'High effort']) {
      assert.ok(!src.includes(term), `${file} announces the effort indicator at a door`);
    }
  }
});

test('the submission half of the agent contract says nothing about it', () => {
  // The contract documents both reading AND submitting. The indicator belongs
  // in the reading half only; this asserts the split rather than the absence,
  // because the file legitimately names it once.
  const src = readFileSync(repoPath('src/lib/agent-contract.mjs'), 'utf8');
  const submitting = src.slice(src.indexOf('endpoints:'));
  assert.ok(
    !/reading_effort|effort level|Light effort/.test(submitting),
    'the effort indicator has reached the submission contract'
  );
});

// --- One value, every surface ----------------------------------------------

test('every surface reads the indicator from the one module', () => {
  // The failure this prevents is the one the byline badge already taught this
  // repository: a rule restated per surface is a rule each surface can get
  // wrong. Three surfaces publish this, and none of them may compute it.
  for (const file of [
    'src/pages/articles/[slug].astro',
    'src/pages/issues.json.js',
    'src/pages/corpus.jsonl.js',
  ]) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.match(src, /reading-effort(\.mjs)?'/, `${file} does not import the module`);
    assert.ok(!/206\.835/.test(src), `${file} computes a score of its own`);
  }
});

test('the two machine surfaces publish the object under the same key', () => {
  for (const file of ['src/pages/issues.json.js', 'src/pages/corpus.jsonl.js']) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.match(src, /reading_effort: readingEffortFields\(/, `${file} shapes its own object`);
  }
});

test('the article page prints the built string beside the byline', () => {
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  const byline = page.indexOf('class="article-byline"');
  const meta = page.indexOf('{effort.display}');
  assert.ok(meta > 0, 'the article page no longer prints the indicator');
  assert.ok(byline < meta, 'the indicator rose above the byline');
  assert.ok(meta < page.indexOf('</header>'), 'the indicator left the header');
});

test('the documentation states the numbers the build uses', () => {
  // CLAUSE 4: the measure, the WPM assumptions, the exclusions and the
  // thresholds are published so a reader can check a piece. Documentation that
  // disagreed with the build would be worse than none — it would invite a
  // reader to check a piece and reach the wrong answer — so /for-agents READS
  // the constants rather than retyping them, and this asserts that it does.
  const page = readFileSync(repoPath('src/pages/for-agents.astro'), 'utf8');
  assert.match(page, /from '\.\.\/lib\/reading-effort\.mjs'/, '/for-agents retypes the numbers');
  for (const name of ['THRESHOLD_LIGHT', 'THRESHOLD_MEDIUM', 'WPM_FAST', 'WPM_SLOW', 'MEASURE_NAME']) {
    assert.ok(page.includes(name), `/for-agents no longer publishes ${name}`);
  }
  assert.match(page, /206\.835/, 'the formula is no longer published');
  assert.match(page, /Effort and reading time/, 'the documented section has gone');
  for (const excluded of ['Block quotes', 'transcripts', 'editorial apparatus']) {
    assert.ok(page.includes(excluded), `/for-agents no longer names the ${excluded} exclusion`);
  }
});

test('the machine-readable contract carries the same description as data', () => {
  const src = readFileSync(repoPath('src/lib/agent-contract.mjs'), 'utf8');
  assert.match(src, /reading_effort_fields: \{/);
  assert.match(src, /flesch-reading-ease/);
  assert.match(src, /score >= 60/);
  assert.match(src, /score < 30/);
  assert.match(src, /clamp\(180, 250/);
});
