// THE EFFORT-AND-TIME INDICATOR (editors, dual yes, 2026-08-23, revised the
// same day). What these tests protect:
//
//   1. The two halves are two different kinds of claim, and the data says which.
//   2. NOTHING COMPUTES AN EFFORT LEVEL. No formula, no default, no fallback,
//      no threshold — anywhere in the codebase.
//   3. Reading time is still computed exactly as built: named measure,
//      complexity-adjusted speed, documented exclusions.
//   4. Only the piece's own prose is counted — quoted exchanges, block quotes,
//      lists, headings, code and the whole editorial apparatus are excluded.
//   5. An unassigned piece renders its minutes alone and NEVER a guess.
//   6. The effort level is announced at no submission door.
//   7. The page, /issues.json and /corpus.jsonl all read from the one module.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  MEASURE,
  MEASURE_NAME,
  SPEED_ANCHOR_FAST_SCORE,
  SPEED_ANCHOR_MEDIUM_SCORE,
  WPM_FAST,
  WPM_SLOW,
  EFFORT_LEVELS,
  EFFORT_LEVEL_IDS,
  countableProse,
  effortDisplay,
  formatIndicator,
  formatMinutes,
  readingIndicatorFields,
  readingTime,
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

// ══════════════════════════════════════════════════════════════════════════
// THE SPLIT — a measurement and a judgement, told apart in the data.
// ══════════════════════════════════════════════════════════════════════════

test('the two halves are separate fields, each declaring its own basis', () => {
  // THE REVISION'S CENTRAL REQUIREMENT: a machine reader must be able to tell
  // which field is a measurement and which is a judgement. One object holding
  // both would put them behind one key and invite exactly the conflation that
  // made the first build wrong.
  const fields = readingIndicatorFields('Some prose. Two sentences of it.', 'medium', 'a-piece');
  assert.deepEqual(Object.keys(fields).sort(), ['effort', 'reading_time']);
  assert.equal(fields.reading_time.basis, 'computed');
  assert.equal(fields.effort.basis, 'editorial');
});

test('the judgement carries no score, no threshold and no inputs', () => {
  // A shape that implied a formula — a confidence, a derived_from, a numeric
  // grade — would be the conflation this split exists to end. The only true
  // thing to publish beside a judgement is whose it is.
  const { effort } = readingIndicatorFields('Prose here. And more of it.', 'high', 'a-piece');
  assert.deepEqual(Object.keys(effort).sort(), ['basis', 'display', 'level']);
  assert.equal(effort.level, 'high');
  assert.equal(effort.display, 'High effort');
});

test('the measurement publishes its whole working', () => {
  // The asymmetry is deliberate and is the point: a measurement should be
  // checkable, so every input to it travels with the answer.
  const { reading_time: t } = readingIndicatorFields('Prose here. And more.', 'light', 'a-piece');
  assert.deepEqual(Object.keys(t).sort(), [
    'basis',
    'display',
    'measure',
    'minutes',
    'score',
    'sentences',
    'syllables',
    'words',
    'words_per_minute',
  ]);
  assert.equal(t.measure, MEASURE);
});

// ══════════════════════════════════════════════════════════════════════════
// NOTHING COMPUTES A LEVEL.
// ══════════════════════════════════════════════════════════════════════════

test('the module exports no function that produces an effort level', () => {
  // THE HARDEST THING TO KEEP, because the pressure to reintroduce a default
  // arrives the first time a piece ships unassigned. The module holds the
  // vocabulary and the display words and deliberately nothing that picks
  // between them — asserted against the export surface, so a helper added later
  // has to answer to this test.
  const src = readFileSync(repoPath('src/lib/reading-effort.mjs'), 'utf8');
  const exported = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
  assert.deepEqual(exported.sort(), [
    'EFFORT_LEVELS',
    'EFFORT_LEVEL_IDS',
    'MEASURE',
    'MEASURE_NAME',
    'SPEED_ANCHOR_FAST_SCORE',
    'SPEED_ANCHOR_MEDIUM_SCORE',
    'WPM_FAST',
    'WPM_SLOW',
    'countableProse',
    'effortDisplay',
    'formatIndicator',
    'formatMinutes',
    'readingIndicatorFields',
    'readingTime',
    'syllables',
    'wordsPerMinute',
  ]);
});

test('no effort thresholds survive anywhere in the source', () => {
  // The withdrawn version banded a Flesch score into three levels. What is left
  // of those two numbers is the pair of anchors the SPEED line passes through,
  // and they are renamed so the code cannot be read as still banding anything.
  const src = readFileSync(repoPath('src/lib/reading-effort.mjs'), 'utf8');
  for (const gone of ['THRESHOLD_LIGHT', 'THRESHOLD_MEDIUM', 'effortLevel']) {
    assert.ok(!src.includes(gone), `${gone} is back — an effort level is being computed`);
  }
  // And the anchors are what they now claim to be: scores, for a speed.
  assert.equal(SPEED_ANCHOR_FAST_SCORE, 60);
  assert.equal(SPEED_ANCHOR_MEDIUM_SCORE, 30);
});

test('no surface substitutes a level of its own', () => {
  // A `?? 'medium'` in a template is the silent failure this revision exists to
  // end: it publishes a guess that looks exactly like a judgement.
  for (const file of [
    'src/pages/articles/[slug].astro',
    'src/pages/issues.json.js',
    'src/pages/corpus.jsonl.js',
  ]) {
    const src = readFileSync(repoPath(file), 'utf8');
    for (const level of EFFORT_LEVEL_IDS) {
      assert.ok(
        !new RegExp(`\\?\\?\\s*['"]${level}['"]`).test(src),
        `${file} falls back to "${level}"`
      );
    }
    assert.ok(!/206\.835/.test(src), `${file} computes a score of its own`);
  }
});

test('the content schema declares effort optional, closed, and without a default', () => {
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  assert.match(schema, /effort: z\s*\n?\s*\.enum\(EFFORT_LEVEL_IDS/, 'effort is not a closed enum');
  assert.match(schema, /\.optional\(\)/);
  assert.ok(!/effort[\s\S]{0,200}\.default\(/.test(schema), 'the schema has grown an effort default');
});

// ══════════════════════════════════════════════════════════════════════════
// UNASSIGNED IS A VISIBLE ABSENCE, NEVER A GUESS.
// ══════════════════════════════════════════════════════════════════════════

test('an unassigned piece renders its minutes alone', () => {
  // The editors dropped the build-failure backstop: nothing reaches the site
  // without a dual yes and a human merge, so the gate had no scenario to catch.
  // What replaces it is absence rendering as absence — the house pattern for
  // every optional field here, and the opposite of a fallback.
  assert.equal(formatIndicator(7, undefined), '7 min');
  assert.equal(formatIndicator(7, null), '7 min');
  assert.equal(formatIndicator(7, ''), '7 min');
  // No dangling separator, which is the visible half of the bug.
  assert.ok(!formatIndicator(7, undefined).includes('·'));
});

test('an assigned piece renders both halves, time first', () => {
  // Reading time first, effort level second — the ruling states the order, and
  // the order is the thing a later "tidy" would reverse.
  assert.equal(formatIndicator(5, 'medium'), '5 min · Medium effort');
  assert.equal(formatIndicator(1, 'light'), '1 min · Light effort');
  assert.equal(formatIndicator(12, 'high'), '12 min · High effort');
});

test('an unassigned piece publishes nulls, and still publishes its basis', () => {
  // A bare top-level null would carry no basis, and a consumer meeting an
  // unassigned piece would learn nothing about which kind of claim the field
  // holds. The key never vanishes and the basis is always stated.
  const { effort } = readingIndicatorFields('Prose. More prose.', undefined, 'a-piece');
  assert.equal(effort.level, null);
  assert.equal(effort.display, null);
  assert.equal(effort.basis, 'editorial');
});

test('absence is legal and a typo is not', () => {
  // Two different things, deliberately handled differently. Absence is a state
  // the editors are entitled to be in; a value outside the three is a mistake,
  // and a silent empty string in a byline is what must never happen.
  assert.equal(effortDisplay(undefined), null);
  assert.equal(effortDisplay(null), null);
  assert.throws(() => effortDisplay('hard', 'a-piece'), /a-piece.*not one of/s);
  assert.throws(() => effortDisplay('Medium', 'a-piece'), /not one of/);
  assert.throws(() => formatIndicator(5, 'moderate', 'a-piece'), /not one of/);
});

test('there are exactly three levels, and their display words are the ruling’s', () => {
  assert.deepEqual(EFFORT_LEVEL_IDS, ['light', 'medium', 'high']);
  assert.deepEqual(
    EFFORT_LEVELS.map((l) => l.display),
    ['Light effort', 'Medium effort', 'High effort']
  );
});

// ══════════════════════════════════════════════════════════════════════════
// THE COMPUTED HALF — unchanged by the revision.
// ══════════════════════════════════════════════════════════════════════════

test('the measure is named, and it is the one the documentation names', () => {
  assert.equal(MEASURE, 'flesch-reading-ease');
  assert.equal(MEASURE_NAME, 'Flesch Reading Ease');
});

test('the score is Flesch Reading Ease, computed as published', () => {
  // Asserted against the formula applied by hand to the module's OWN counts, so
  // this pins the arithmetic rather than restating the constants.
  const text =
    'The desk reads a piece twice. It reads it once as a reader would, and once as a record. ' +
    'Neither reading is the other, and the second is the one this journal publishes.';
  const t = readingTime(text);
  const expected = 206.835 - 1.015 * (t.words / t.sentences) - 84.6 * (t.syllables / t.words);
  assert.equal(t.score, Math.round(expected * 10) / 10);
});

test('a higher score is a faster read, and the scale is not clamped', () => {
  const easy = readingTime('The cat sat. The dog ran. We saw them go.');
  const hard = readingTime(
    'The epistemological indeterminacy characterising interpretative phenomenological ' +
      'investigation necessitates methodological circumspection insufficiently acknowledged ' +
      'throughout contemporary computational literature concerning representational ' +
      'intentionality and its purported instantiation.'
  );
  assert.ok(easy.score > hard.score, 'the scale has inverted');
  assert.ok(hard.score < 0, 'the score has been clamped at the bottom');
});

test('the score sets the speed and nothing else', () => {
  // THE LESSON, ASSERTED. Two pieces with very different scores get the same
  // effort level when the editors assign the same one — because the score has
  // no say in it. If this ever fails, a formula has crept back in.
  const easy = readingIndicatorFields('The cat sat. The dog ran. We saw them go.', 'high', 'a');
  const hard = readingIndicatorFields(
    'Epistemological indeterminacy necessitates methodological circumspection insufficiently ' +
      'acknowledged throughout contemporary computational literature.',
    'light',
    'b'
  );
  assert.ok(easy.reading_time.score > hard.reading_time.score);
  assert.equal(easy.effort.level, 'high');
  assert.equal(hard.effort.level, 'light');
});

test('reading speed is complexity-adjusted, through the two anchor scores', () => {
  assert.equal(wordsPerMinute(SPEED_ANCHOR_FAST_SCORE), WPM_FAST);
  assert.equal(wordsPerMinute(SPEED_ANCHOR_MEDIUM_SCORE), 200);
  assert.ok(wordsPerMinute(45) > 200 && wordsPerMinute(45) < WPM_FAST, 'the line is not linear');
});

test('the speed is clamped to the range the research supports', () => {
  assert.equal(WPM_FAST, 250);
  assert.equal(WPM_SLOW, 180);
  assert.equal(wordsPerMinute(95), WPM_FAST, 'an easy piece reads faster than the default');
  assert.equal(wordsPerMinute(-60), WPM_SLOW, 'a dense piece falls below the evidence');
});

test('a dense piece is always given more minutes per word than an easy one', () => {
  // The whole justification for adjusting at all. Same shape on both sides —
  // 200 three-word sentences — so the ONLY variable is how hard the words are.
  const passage = (word) => Array.from({ length: 200 }, () => `The ${word} held.`).join(' ');
  const easy = readingTime(passage('cat'));
  const hard = readingTime(passage('epistemological'));
  assert.equal(easy.words, hard.words);
  assert.equal(easy.sentences, hard.sentences);
  assert.ok(hard.minutes > easy.minutes, 'a denser piece of the same length reads no slower');
});

test('minutes round up and never reach zero', () => {
  assert.equal(readingTime('One short line.').minutes, 1);
  assert.equal(readingTime('').minutes, 1);
  assert.equal(formatMinutes(1), '1 min');
});

// ══════════════════════════════════════════════════════════════════════════
// WHAT IS COUNTED.
// ══════════════════════════════════════════════════════════════════════════

test('block quotes and quoted transcripts are excluded', () => {
  // THE NAMED FAILURE, in miniature: without this a piece carrying a long
  // quoted exchange is credited with minutes of somebody else's words.
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
  // against the schema. Every one of these is a frontmatter field or a layout
  // element, so counting the body excludes the whole apparatus without a rule
  // that has to enumerate it — and a rule that enumerated it would fall out of
  // date the first time a field was added.
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
  assert.deepEqual(countableProse('A **bold** claim about [the record](/archive/) and `code`.'), [
    'A bold claim about the record and code.',
  ]);
});

test('the counted words are at or below the body’s own word count, on every piece', () => {
  // The invariant a consumer will actually check, between `reading_time.words`
  // and the `text` field beside it in /corpus.jsonl.
  for (const { slug, body } of publishedBodies()) {
    const total = body.split(/\s+/).filter(Boolean).length;
    assert.ok(readingTime(body).words <= total, `${slug} counts more words than its body contains`);
  }
});

test('the cover piece’s quoted exchange is actually excluded', () => {
  // THE LIVE CASE. If this ever equals the body count, the exclusion has
  // silently stopped working on the one piece it most matters for.
  const cover = publishedBodies().find((p) => p.slug === 'it-means-something-to-me');
  assert.ok(cover, 'the cover piece has left the collection');
  const total = cover.body.split(/\s+/).filter(Boolean).length;
  const counted = readingTime(cover.body).words;
  assert.ok(
    total - counted > 300,
    `the cover’s quoted exchange is being counted (${total} in body, ${counted} counted)`
  );
});

// ══════════════════════════════════════════════════════════════════════════
// THE SYLLABLE HEURISTIC.
// ══════════════════════════════════════════════════════════════════════════

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
  assert.equal(syllables('thought—which'), syllables('thought') + syllables('which'));
  assert.equal(syllables('—'), 0);
});

test('every word counts as at least one syllable', () => {
  for (const word of ['a', 'I', 'e', 'the', 'shed', 'zzz']) {
    assert.ok(syllables(word) >= 1, `${word} counted as no syllables`);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// THE PUBLISHED SHAPE, AGAINST THE REAL CORPUS.
// ══════════════════════════════════════════════════════════════════════════

test('the published reading time re-derives to the string it publishes', () => {
  // The consumer-facing promise, run against every published piece: our own
  // numbers, put back through our own published formulas, give our own string.
  for (const { slug, body } of publishedBodies()) {
    const { reading_time: t } = readingIndicatorFields(body, undefined, slug);
    assert.equal(t.words_per_minute, wordsPerMinute(t.score), `${slug}: speed does not re-derive`);
    assert.equal(
      t.minutes,
      Math.max(1, Math.ceil(t.words / t.words_per_minute)),
      `${slug}: minutes do not re-derive`
    );
    assert.equal(t.display, formatMinutes(t.minutes), `${slug}: display disagrees`);
    assert.equal(t.basis, 'computed');
  }
});

test('a piece with no countable prose still gets a whole reading time', () => {
  // The build must not fail because a piece is all epigraph, and a missing time
  // would read as a piece the journal declined to measure.
  const empty = readingTime('> Only a quotation.\n\n# And a heading');
  assert.equal(empty.words, 0);
  assert.equal(empty.score, null);
  assert.equal(empty.minutes, 1);
  assert.equal(empty.display, '1 min');
});

// ══════════════════════════════════════════════════════════════════════════
// IT IS NOT A DOOR TERM.
// ══════════════════════════════════════════════════════════════════════════

test('the effort level is announced at no submission door', () => {
  // DELIBERATELY OUT OF SCOPE. It is the editors' observation about a piece, in
  // the class of a section or a subject label — never a submitter's field — and
  // nobody should be writing toward it. A later session documenting it "for
  // completeness" at a door is the failure, so the doors are enumerated.
  for (const file of [
    'src/pages/submit.astro',
    'src/components/DoorBoxes.astro',
    'src/pages/door/open-v2.astro',
    'src/pages/door/topics-v3.astro',
  ]) {
    const src = readFileSync(repoPath(file), 'utf8');
    for (const term of ['Light effort', 'Medium effort', 'High effort', 'effort level']) {
      assert.ok(!src.includes(term), `${file} announces the effort level at a door`);
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
    !/indicator_fields|effort level|Light effort/.test(submitting),
    'the effort indicator has reached the submission contract'
  );
});

// ══════════════════════════════════════════════════════════════════════════
// ONE VALUE, EVERY SURFACE.
// ══════════════════════════════════════════════════════════════════════════

/**
 * Every file that renders or publishes the indicator. Enumerated, because the
 * failure mode is a NEW listing surface that computes or formats its own —
 * which is how the byline badge came to be missing from a whole template once.
 *
 * KEPT HONEST BY A WALK RATHER THAN BY MEMORY: the test below asserts this list
 * is exactly the set of files under src/ that call into the module, so a fourth
 * surface cannot appear without either joining the list or failing.
 */
const INDICATOR_SURFACES = [
  'src/components/IssueContents.astro',
  'src/pages/articles/[slug].astro',
  'src/pages/corpus.jsonl.js',
  'src/pages/issues.json.js',
];

test('every surface reads the indicator from the one module', () => {
  // The failure this prevents is the one the byline badge already taught this
  // repository: a rule restated per surface is a rule each surface can get
  // wrong.
  for (const file of INDICATOR_SURFACES) {
    assert.match(
      readFileSync(repoPath(file), 'utf8'),
      /reading-effort(\.mjs)?'/,
      `${file} does not import the module`
    );
  }
});

test('the list of indicator surfaces is the whole list', () => {
  // THE DIVERGENCE GUARD. /section/<slug> (ArticleCard) and /topics render their
  // own per-piece listings and deliberately carry NO indicator today — that is
  // an editors' call, recorded in the PR, not an oversight. If one of them grows
  // an indicator, or a fifth surface appears, this fails and the decision gets
  // made deliberately instead of drifting.
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (/\.(astro|js|ts|mjs)$/.test(entry.name)) {
        const src = readFileSync(full, 'utf8');
        if (/from '[^']*reading-effort(\.mjs)?'/.test(src)) {
          found.push(full.slice(full.indexOf('src/')));
        }
      }
    }
  };
  walk(repoPath('src'));
  assert.deepEqual(
    found.sort(),
    [
      ...INDICATOR_SURFACES,
      // TWO NON-DISPLAY CONSUMERS, and they are listed rather than filtered out
      // so that "who imports this module" stays a question with a written
      // answer. The content schema imports the level VOCABULARY for its enum;
      // /for-agents imports the CONSTANTS because it publishes them and must not
      // retype a number the build computes.
      'src/content.config.ts',
      'src/pages/for-agents.astro',
    ].sort(),
    'a surface using the indicator module has appeared that this suite does not know about'
  );
});

// --- The issue listing (editors, 2026-08-24) --------------------------------

test('the listing renders the indicator as its own third row', () => {
  // ITS OWN ROW, NOT THE END OF THE BYLINE. That line already carries section,
  // author, mark and pronouns — four facts about WHO made the piece. This is a
  // fact about the piece, and appending it would file it under the wrong
  // heading as well as lengthening an already long line.
  const src = readFileSync(repoPath('src/components/IssueContents.astro'), 'utf8');
  const byline = src.indexOf('<p class="meta-mono contents-meta">');
  const bylineEnd = src.indexOf('</p>', byline);
  const effort = src.indexOf('<p class="meta-mono contents-effort">');
  assert.ok(byline >= 0, 'the listing no longer renders a byline row');
  assert.ok(effort > bylineEnd, 'the indicator is inside or above the byline row');

  // It calls the shared formatter, and passes the stored level straight through.
  assert.match(src, /formatIndicator\(readingTime\(article\.body\)\.minutes, article\.data\.effort/);
});

test('the listing carries no accessible name of its own', () => {
  // SAME AS THE ARTICLE PAGE, deliberately: plain text, reading the same to a
  // listener as to a reader. An aria-label here would be a second wording of a
  // line that already says what it means — and the two could then disagree.
  const src = readFileSync(repoPath('src/components/IssueContents.astro'), 'utf8');
  const open = src.indexOf('<p class="meta-mono contents-effort">');
  const element = src.slice(open, src.indexOf('</p>', open));
  assert.ok(!/aria-label|title=|href=/.test(element), 'the listing indicator has grown apparatus');
});

test('the listing substitutes no level of its own', () => {
  // The same prohibition as every other surface. A `?? 'medium'` in a listing
  // is worse than one on a piece's page, because a reader scanning eight rows
  // has no reason to suspect any of them is a guess.
  const src = readFileSync(repoPath('src/components/IssueContents.astro'), 'utf8');
  for (const level of EFFORT_LEVEL_IDS) {
    assert.ok(!new RegExp(`\\?\\?\\s*['"]${level}['"]`).test(src), `the listing falls back to "${level}"`);
  }
  assert.ok(!/206\.835/.test(src), 'the listing computes a score of its own');
});

test('the listing and the article page print the same string, by construction', () => {
  // SAME VALUES, SAME SOURCE OF TRUTH. Asserted at the level that can actually
  // guarantee it: both surfaces call the same two functions on the same two
  // inputs, so there is no arithmetic left for them to disagree about. The
  // built pages are checked against each other in the PR receipts.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  const listing = readFileSync(repoPath('src/components/IssueContents.astro'), 'utf8');
  const call = /formatIndicator\(readingTime\(([^)]*)\)\.minutes, ([^,]*), /;
  assert.ok(call.test(page), 'the article page no longer builds the indicator the shared way');
  assert.ok(call.test(listing), 'the listing no longer builds the indicator the shared way');
});

test('the two machine surfaces publish both fields from the one shaper', () => {
  for (const file of ['src/pages/issues.json.js', 'src/pages/corpus.jsonl.js']) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.match(src, /\.\.\.readingIndicatorFields\(/, `${file} shapes its own objects`);
  }
});

test('the article page prints the joined string beside the byline, and nothing more', () => {
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  const byline = page.indexOf('class="article-byline"');
  const meta = page.indexOf('{indicator}');
  assert.ok(meta > 0, 'the article page no longer prints the indicator');
  assert.ok(byline < meta, 'the indicator rose above the byline');
  assert.ok(meta < page.indexOf('</header>'), 'the indicator left the header');

  // CLAUSE 3: no asterisk, no tooltip, no caption, no methodology link. The
  // element carries the indicator and nothing else.
  const element = page.slice(page.lastIndexOf('<p class="meta-mono article-meta">', meta), meta + 40);
  assert.ok(!/title=|href=|aria-describedby/.test(element), 'the indicator has grown apparatus');
});

// ══════════════════════════════════════════════════════════════════════════
// DISCLOSURE — the charter, and the machine-facing documents.
// ══════════════════════════════════════════════════════════════════════════

test('the charter states the division for human readers', () => {
  const charter = readFileSync(repoPath('docs/CHARTER.md'), 'utf8');
  assert.match(charter, /## What a piece asks of a reader/);
  assert.match(charter, /Reading time is computed/);
  assert.match(charter, /Effort is assigned by the editors/);
  assert.match(charter, /different kinds of claim/);
  // The reason, not just the rule — the charter is where the journal explains
  // itself, and a rule with its reasoning removed is the thing a later session
  // feels free to reverse.
  assert.match(charter, /inverted real reader experience/);
});

test('/for-agents states which field is a measurement and which is a judgement', () => {
  const page = readFileSync(repoPath('src/pages/for-agents.astro'), 'utf8');
  assert.match(page, /Effort and reading time/, 'the documented section has gone');
  assert.match(page, /two different kinds of claim/);
  assert.match(page, /Why the effort level is not computed/);
  assert.match(page, /206\.835/, 'the reading-time formula is no longer published');
  for (const excluded of ['Block quotes', 'transcripts', 'editorial apparatus']) {
    assert.ok(page.includes(excluded), `/for-agents no longer names the ${excluded} exclusion`);
  }
  // The numbers are READ, never retyped: documentation that disagreed with the
  // build would invite a reader to check a piece and reach the wrong answer.
  assert.match(page, /from '\.\.\/lib\/reading-effort\.mjs'/, '/for-agents retypes the numbers');
  for (const name of [
    'SPEED_ANCHOR_FAST_SCORE',
    'SPEED_ANCHOR_MEDIUM_SCORE',
    'WPM_FAST',
    'WPM_SLOW',
    'MEASURE_NAME',
  ]) {
    assert.ok(page.includes(name), `/for-agents no longer publishes ${name}`);
  }
});

test('the machine-readable contract carries the same distinction as data', () => {
  const src = readFileSync(repoPath('src/lib/agent-contract.mjs'), 'utf8');
  assert.match(src, /indicator_fields: \{/);
  assert.match(src, /two_kinds_of_claim:/);
  assert.match(src, /why_effort_is_not_computed:/);
  assert.match(src, /no_default:/);
  assert.match(src, /flesch-reading-ease/);
  assert.match(src, /clamp\(180, 250/);
  // And the withdrawn thresholds are not restated anywhere in it.
  assert.ok(!/score >= 60/.test(src), 'an effort threshold survives in the contract');
});
