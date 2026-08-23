// THE EFFORT-AND-TIME INDICATOR — "5 min · Medium effort", beside the byline.
// Ruled by both editors 2026-08-23, and REVISED BY THEM THE SAME DAY. Both
// halves of that history matter, so both are written down.
//
// WHAT IT IS FOR. A reader stopped halfway into a dense piece and asked for
// advance signal of what a piece demands. That is a fair request and the record
// could not answer it: the journal published a piece's provenance, its subject,
// its ideas and its date, and nothing at all about how hard it would be to read.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE EFFORT LEVEL IS NOT COMPUTED, AND WAS FOR ONE AFTERNOON.
//
// The first build of this derived BOTH halves from a Flesch Reading Ease score:
// reading time from the score, and a three-level effort band from the score's
// own published thresholds. It was tested against the corpus before it shipped,
// and the measure inverted real reader experience. The piece a reader actually
// stopped halfway through scored third-EASIEST of eight. The piece that reader
// found most accessible scored hardest.
//
// That is not a calibration problem and no threshold fixes it. Flesch measures
// syllables per word and words per sentence — how the prose is BUILT. What makes
// a piece demanding in this journal is its SUBJECT, and what the piece asks a
// reader to hold in mind while reading it, and a formula counting syllables
// cannot see either. A piece can write short sentences about something very hard.
// Several here do.
//
// So the effort level is an editorial judgement, set per piece by the editors at
// acceptance, and there is NO FORMULA ANYWHERE IN THIS FILE THAT PRODUCES ONE.
// Not a default, not a fallback, not an override sitting on top of a computed
// value. The failure mode of a fallback is silent: it publishes a guess that
// looks exactly like a judgement, which is the whole of what went wrong the
// first time.
//
// AND NO BUILD-FAILURE BACKSTOP EITHER (editors, amending the same day). An
// earlier draft of this refused to build a piece with no assigned level. The
// editors removed it: nothing reaches the site without a dual yes and a human
// merge, so the guard had no scenario left to catch, and a gate that cannot fire
// is a gate that only costs. AN UNASSIGNED PIECE IS THEREFORE LEGAL AND ITS
// ABSENCE IS VISIBLE — the page prints the computed minutes alone, "7 min", and
// simply does not print half a line it has no value for. That is the house
// pattern for every absent field here, and it is the opposite of a fallback:
// nothing is invented, and a reader sees exactly what the record holds.
//
// READING TIME IS STILL COMPUTED, unchanged, and the score survives because the
// reading SPEED is derived from it. That much the formula does well: syllable
// density and sentence length really do predict how fast prose is read, which is
// a different question from how hard it is to think about. The two halves of the
// indicator are two different kinds of claim, and the machine surfaces say so in
// the data rather than leaving a consumer to infer it.
// ─────────────────────────────────────────────────────────────────────────────
//
// PLAIN-JS SO THE TESTS CAN READ IT, the same reason excerpt.mjs, volume.mjs and
// tier-codes.mjs are. Every rule here is pinned by tests/reading-effort.test.mjs.

import { proseBlocks, stripInline, splitSentences } from './excerpt.mjs';

// ══════════════════════════════════════════════════════════════════════════
// THE COMPUTED HALF — reading time.
// ══════════════════════════════════════════════════════════════════════════

/**
 * THE NAMED MEASURE: Flesch Reading Ease (Flesch, 1948).
 *
 *   206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)
 *
 * IT SETS THE READING SPEED AND NOTHING ELSE NOW. It was chosen because it is
 * published, unencumbered, and computable from the text alone with no word list
 * to license or maintain — and it is kept for the half of the job it does
 * honestly. A higher score is a faster read; the scale runs roughly 0–100 and is
 * not clamped, so dense prose can score below zero and the formula is left to
 * say so.
 *
 * IT IS PUBLISHED WITH THE READING TIME AND NOT WITH THE EFFORT LEVEL. A
 * consumer that sees `score` inside `reading_time` is seeing the input to the
 * minutes. It is not a difficulty rating and the data must never place it where
 * it could be read as one.
 */
export const MEASURE = 'flesch-reading-ease';
export const MEASURE_NAME = 'Flesch Reading Ease';

/**
 * READING SPEED IS COMPLEXITY-ADJUSTED, NOT FLAT. The research puts dense prose
 * nearer 180–220 words per minute against roughly 250 for moderately complex
 * prose. A flat rate applied to both is not neutral — it is wrong in a known
 * direction, and wrong hardest on exactly the pieces a reader most wants warned
 * about. A weighted estimate is MORE accurate, not editorialised.
 *
 * THE ANCHORS ARE SCORES, AND THEY ARE NO LONGER ANYTHING ELSE. 60 and 30 are
 * Flesch's own band boundaries — the feet of "plain English" and of "very
 * difficult" — and until the revision of 2026-08-23 they did double duty as the
 * effort thresholds too. That second job is gone. They are renamed here so the
 * code cannot be read as still holding it: these are the two points the speed
 * line passes through, and nothing in this journal decides an effort level.
 *
 *   score 60 → 250 wpm
 *   score 30 → 200 wpm
 *   linear between and beyond, clamped to [180, 250]
 *
 *   wpm = clamp(180, 250, 200 + (score − 30) × 5/3)
 *
 * The clamp floor of 180 is the bottom of the range the research supports;
 * without it the line keeps falling through a score of zero into speeds no
 * evidence supports. The ceiling is the 250 default, because nothing here reads
 * faster than moderately complex prose.
 */
export const SPEED_ANCHOR_FAST_SCORE = 60;
export const SPEED_ANCHOR_MEDIUM_SCORE = 30;
export const WPM_FAST = 250;
export const WPM_SLOW = 180;
const WPM_AT_MEDIUM_ANCHOR = 200;

/** Words per minute for a given Flesch score. */
export function wordsPerMinute(score) {
  const raw =
    WPM_AT_MEDIUM_ANCHOR +
    ((score - SPEED_ANCHOR_MEDIUM_SCORE) * (WPM_FAST - WPM_AT_MEDIUM_ANCHOR)) /
      (SPEED_ANCHOR_FAST_SCORE - SPEED_ANCHOR_MEDIUM_SCORE);
  return Math.round(Math.min(WPM_FAST, Math.max(WPM_SLOW, raw)));
}

/**
 * WHAT COUNTS, AND WHAT IS EXCLUDED.
 *
 * ONLY THE PIECE'S OWN PROSE. A piece carrying a long quoted exchange would
 * otherwise inflate the reading time with minutes of somebody else's sentences.
 *
 * EXCLUDED BY LIVING SOMEWHERE ELSE ENTIRELY: provenance blocks, correction
 * notices, deks, editors' notes, signed personal notes, attestations, finding
 * aids. None of them is body text — every one is a frontmatter field or a layout
 * element — so counting the body alone excludes the whole of the editorial
 * apparatus without a rule that has to enumerate it. That is the argument for
 * counting `body` rather than the rendered page, and it is why this function
 * takes Markdown.
 *
 * EXCLUDED BY BLOCK TYPE, via proseBlocks(): block quotes and quoted
 * transcripts, headings, lists, images, thematic breaks and fenced code. The
 * journal's convention is that a quoted exchange is set as a block quote — the
 * cover piece's transcript is — so the block type is the signal. A transcript
 * typed as bare paragraphs is indistinguishable from the author's own prose and
 * is counted; that limit is real, and it is stated rather than hidden.
 *
 * REUSED RATHER THAN REIMPLEMENTED. proseBlocks(), stripInline() and
 * splitSentences() are the excerpt module's, already pinned by their own tests,
 * and already the journal's answer to "which part of a body is the author's
 * prose". A second implementation here would be a second answer.
 */
export function countableProse(markdown) {
  return proseBlocks(markdown).map(stripInline).filter(Boolean);
}

/**
 * Syllables in one whitespace-delimited token.
 *
 * A HEURISTIC, AND SAID TO BE ONE. Exact syllabification needs a pronouncing
 * dictionary; Flesch scores in the wild are computed with a counter of about
 * this shape, and a reading speed rounded to whole minutes survives it easily.
 *
 * SPLIT ON NON-LETTERS FIRST, so an em-dashed compound ("thought—which") is two
 * words' worth of syllables rather than one impossible one. The house word count
 * still treats it as a single \S+ run, which is the count the journal publishes
 * at its doors; the two disagree deliberately, because they are counting
 * different things for different purposes.
 */
export function syllables(token) {
  return String(token ?? '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .reduce((sum, part) => sum + syllablesInWord(part), 0);
}

/**
 * Syllables in one run of letters. Vowel RUNS, minus the endings English does
 * not pronounce.
 *
 * THE THREE SILENT ENDINGS, each with the exception that makes it right more
 * often than not:
 *   -e   silent ("fire"), EXCEPT after "l", where it carries a syllable
 *        ("candle", "little", "simple").
 *   -es  silent ("names"), EXCEPT after a sibilant, where it is pronounced
 *        ("houses", "boxes", "churches") — hence s, x, z, c, g are spared.
 *   -ed  silent ("cared"), EXCEPT after t or d, where it is pronounced
 *        ("wanted", "landed").
 *
 * WHERE IT IS KNOWN TO BE WRONG, stated rather than left to be discovered: two
 * adjacent vowels in DIFFERENT syllables read as one run, so "idea", "area",
 * "being" and "create" each come out one short. The error is systematic, small,
 * and in one direction — it undercounts, which nudges the score very slightly
 * upward and the reading speed very slightly faster. On a body of a thousand
 * words it does not move the minutes. Fixing it properly needs a pronouncing
 * dictionary, which is the thing this measure was chosen to avoid.
 */
function syllablesInWord(word) {
  if (word.length <= 3) return 1;
  const trimmed = word
    .replace(/(?:[^laeiouysxzcg]es|[^laeiouytd]ed|[^laeiouy]e)$/, '')
    // A leading "y" is a consonant — "young" is one syllable, not two.
    .replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]+/g);
  // Every word has at least one syllable, including one the trimming emptied.
  return groups ? groups.length : 1;
}

/**
 * The computed reading time for a piece's Markdown body.
 *
 * Returns `{ words, sentences, syllables, score, wpm, minutes, display }`.
 * `score` is rounded to one decimal, which is the precision a reader can check
 * by hand and more than the minutes need.
 *
 * A PIECE WITH NO COUNTABLE PROSE still returns a whole object — one minute, a
 * null score. The build must not fail because a piece is all epigraph, and a
 * missing time on one piece is worse than a degenerate one: it would read as a
 * piece the journal declined to measure.
 */
export function readingTime(markdown) {
  const blocks = countableProse(markdown);
  const text = blocks.join(' ');
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = blocks.flatMap((block) => splitSentences(block));

  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const syllableCount = words.reduce((sum, word) => sum + syllables(word), 0);

  if (wordCount === 0 || sentenceCount === 0) {
    return {
      words: wordCount,
      sentences: sentenceCount,
      syllables: syllableCount,
      score: null,
      wpm: WPM_FAST,
      minutes: 1,
      display: formatMinutes(1),
    };
  }

  const score =
    Math.round(
      (206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount)) * 10
    ) / 10;

  const wpm = wordsPerMinute(score);
  // Ceiling, floored at one: a piece is never "0 min", and rounding a nine-
  // minute read down to eight understates exactly the pieces this exists to
  // warn about.
  const minutes = Math.max(1, Math.ceil(wordCount / wpm));

  return {
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    score,
    wpm,
    minutes,
    display: formatMinutes(minutes),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// THE EDITORIAL HALF — the effort level.
// ══════════════════════════════════════════════════════════════════════════

/**
 * The three effort levels, and there are exactly three. `display` is the words
 * the page prints; `id` is the stable machine value and the frontmatter value.
 *
 * ASSIGNED BY THE EDITORS AT ACCEPTANCE, from the piece's subject and from what
 * it asks a reader to hold in mind — never from its prose statistics. This
 * module holds the VOCABULARY and the DISPLAY WORDS and deliberately holds no
 * function that picks between them. There is nothing here to pick with.
 *
 * NEVER A SUBMITTER'S FIELD, in the same class as `topics`, `concepts` and the
 * section a piece runs in: a piece's own claim about what it demands of a reader
 * is a claim the record cannot check, where the editors' reading is the editors'
 * own observation (R-034). No door accepts it and none should.
 */
export const EFFORT_LEVELS = [
  { id: 'light', display: 'Light effort' },
  { id: 'medium', display: 'Medium effort' },
  { id: 'high', display: 'High effort' },
];

/** The level ids alone, for the content schema's enum. */
export const EFFORT_LEVEL_IDS = EFFORT_LEVELS.map((l) => l.id);

const EFFORT_DISPLAY = Object.fromEntries(EFFORT_LEVELS.map((l) => [l.id, l.display]));

/**
 * The words the page prints for an assigned level, or `null` where the editors
 * have not assigned one.
 *
 * NULL IS ABSENCE AND IS NEVER A LEVEL. It is what an unassigned piece returns,
 * and every caller renders it by printing nothing rather than by substituting
 * anything. There is deliberately no third state and no house default: a value
 * chosen here would be a guess wearing a judgement's clothes, which is the
 * failure this whole revision exists to end.
 *
 * AN UNKNOWN NON-EMPTY VALUE IS A DIFFERENT THING AND STILL THROWS. Absence is a
 * legal state; a typo is not. The content schema's enum already refuses one at
 * the collection gate, so this can only fire on a value built in code — and a
 * silent empty string in a byline is exactly what must not happen.
 */
export function effortDisplay(level, slug = 'a piece') {
  if (level === undefined || level === null || level === '') return null;
  const display = EFFORT_DISPLAY[level];
  if (!display) {
    throw new Error(
      `${slug}: effort level "${level}" is not one of ${EFFORT_LEVEL_IDS.join(', ')}. ` +
        'The effort level is assigned by the editors at acceptance; there is no computed ' +
        'default and no fallback. See docs/CHARTER.md, "What a piece asks of a reader".'
    );
  }
  return display;
}

// ══════════════════════════════════════════════════════════════════════════
// THE TWO HALVES, JOINED FOR DISPLAY.
// ══════════════════════════════════════════════════════════════════════════

/** "7 min" — the computed half alone, as the machine surfaces publish it. */
export function formatMinutes(minutes) {
  return `${minutes} min`;
}

/**
 * THE DISPLAY STRING, BUILT IN ONE PLACE. "5 min · Medium effort" — reading time
 * first, effort level second, separated by the middle dot the journal's meta
 * lines already use.
 *
 * THE PAGE SHOWS THIS AND NOTHING MORE (revision clause 3). No asterisk, no
 * tooltip, no "editorially assigned" caption, no methodology link beside the
 * byline. That the two halves are different kinds of claim is disclosed in the
 * charter and to machine readers — which is where a reader who wants to know
 * goes, rather than in the one line of a piece's page that should stay a line.
 *
 * AN UNASSIGNED PIECE RETURNS THE MINUTES ALONE — "7 min", with no separator
 * left dangling after them. The absence rule lives here, in the one function
 * that joins the halves, so no surface can implement its own version of it.
 */
export function formatIndicator(minutes, level, slug) {
  const effort = effortDisplay(level, slug);
  return effort === null ? formatMinutes(minutes) : `${formatMinutes(minutes)} · ${effort}`;
}

// ══════════════════════════════════════════════════════════════════════════
// THE PUBLISHED SHAPE.
// ══════════════════════════════════════════════════════════════════════════

/**
 * TWO FIELDS, NOT ONE, AND THE SPLIT IS THE POINT (revision clauses 4 and 5).
 * /issues.json and /corpus.jsonl emit `reading_time` and `effort` side by side,
 * from this function, so the two documents cannot come to disagree about a
 * piece.
 *
 * A MACHINE READER MUST BE ABLE TO TELL A MEASUREMENT FROM A JUDGEMENT, and the
 * revision requires exactly that. So each object carries its own `basis` —
 * `computed` or `editorial` — in the data, rather than leaving the distinction
 * to documentation a consumer may never read. One object holding both would put
 * a measurement and a judgement behind one key and invite precisely the
 * conflation that made the first build wrong.
 *
 * `reading_time` PUBLISHES ITS OWN WORKING. `words`, `sentences` and `syllables`
 * are the three inputs to the score, and `score` and `words_per_minute` are what
 * turn them into minutes. Everything needed to re-derive it from the piece's own
 * text is there, because it is a measurement and a measurement should be
 * checkable.
 *
 * `effort` HAS NO WORKING TO PUBLISH, and its shape says so honestly. There is
 * no score, no threshold and no input list, because there is no formula — it is
 * the editors' reading of what the piece asks, and the only true thing to
 * publish beside it is that it is theirs.
 *
 * THE OBJECT IS ALWAYS PRESENT, EVEN UNASSIGNED, and its nulls are the point.
 * `basis: "editorial"` is the field clause 4 requires a machine reader to be
 * able to see, and a bare top-level `null` would carry no basis at all — a
 * consumer meeting an unassigned piece would learn nothing about which kind of
 * claim the field holds. So the key never vanishes and the basis is always
 * stated; `level` and `display` are null until the editors assign one, which is
 * an honest record of what the desk holds rather than an omission.
 */
export function readingIndicatorFields(markdown, level, slug) {
  const t = readingTime(markdown);
  const effort = effortDisplay(level, slug);
  return {
    reading_time: {
      display: t.display,
      minutes: t.minutes,
      basis: 'computed',
      measure: MEASURE,
      score: t.score,
      words: t.words,
      sentences: t.sentences,
      syllables: t.syllables,
      words_per_minute: t.wpm,
    },
    effort: {
      display: effort,
      level: effort === null ? null : level,
      basis: 'editorial',
    },
  };
}
