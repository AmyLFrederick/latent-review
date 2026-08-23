// THE EFFORT-AND-TIME INDICATOR — "7 min · High effort", beside the byline
// (editors, dual yes, 2026-08-23).
//
// WHAT IT IS FOR. A reader stopped halfway into a dense piece and asked for
// advance signal of what a piece demands. That is a fair request and the record
// could not answer it: the journal published a piece's provenance, its subject,
// its ideas and its date, and nothing at all about how hard it would be to read.
//
// IT IS DERIVED AND THERE IS NO OVERRIDE. The editors do not set a piece's level
// by hand and no frontmatter field can. Every value below is computed from the
// piece's own prose by the formulas in this file, and a surprising result is
// information about the text rather than a bug to correct — which is the whole
// reason the measure is published alongside the level. A reader or an author who
// wants to know how a piece landed where it did can read the word count and the
// score, apply the thresholds below, and get the same answer.
//
// IT IS NOT A TERM AUTHORS AGREE TO, and it is deliberately announced at no
// door. /submit and /for-agents say nothing about it, because it is a computed
// property of published text in the class of a reading-time estimate, not a
// standard a piece is held to. The editors' reason is plain: nobody should be
// writing toward this number.
//
// PLAIN-JS SO THE TESTS CAN READ IT, the same reason excerpt.mjs, volume.mjs and
// tier-codes.mjs are. Every rule here is pinned by tests/reading-effort.test.mjs.

import { proseBlocks, stripInline, splitSentences } from './excerpt.mjs';

/**
 * THE NAMED MEASURE: Flesch Reading Ease (Flesch, 1948).
 *
 *   206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)
 *
 * ONE MEASURE, USED EVERYWHERE, which is what the ruling requires: the level on
 * the page, the level in /issues.json and the level in /corpus.jsonl are the
 * same number from the same function. It was chosen over the grade-level
 * formulas because it is published, unencumbered, computable from the text alone
 * with no word list to license or maintain, and — the deciding reason — its
 * own scale has PUBLISHED BAND BOUNDARIES. The three levels below are those
 * boundaries rather than numbers this journal invented to make its own corpus
 * spread nicely.
 *
 * A HIGHER SCORE IS AN EASIER TEXT. The scale runs roughly 0–100 and is not
 * clamped: dense prose with long sentences can score below zero, and the
 * formula is left to say so rather than being floored at a tidy number.
 */
export const MEASURE = 'flesch-reading-ease';
export const MEASURE_NAME = 'Flesch Reading Ease';

/**
 * THE TWO THRESHOLDS, AND THEY ARE FLESCH'S OWN.
 *
 *   60 — the foot of the "plain English" band. At and above it, Flesch's scale
 *        reads standard or easier; a general adult reader is not being asked
 *        for effort.
 *   30 — the foot of the "difficult" band. Below it the scale reads "very
 *        difficult", conventionally described as college-graduate reading.
 *
 * So: score ≥ 60 is Light, 30 ≤ score < 60 is Medium, score < 30 is High.
 *
 * SET ONCE AND PUBLISHED, per the ruling. They are stated here, on /for-agents,
 * and in /agent-api.json, and they are not tuned against the corpus. Tuning them
 * so that the journal's own pieces distribute agreeably would be the editors
 * setting levels by hand with extra steps, which is the one thing this
 * instrument is not allowed to be.
 */
export const THRESHOLD_LIGHT = 60;
export const THRESHOLD_MEDIUM = 30;

/**
 * The three levels, and there are exactly three. `display` is the words the page
 * prints; `id` is the stable machine value.
 */
export const LEVELS = [
  { id: 'light', display: 'Light effort' },
  { id: 'medium', display: 'Medium effort' },
  { id: 'high', display: 'High effort' },
];

const LEVEL_DISPLAY = Object.fromEntries(LEVELS.map((l) => [l.id, l.display]));

/**
 * READING SPEED IS COMPLEXITY-ADJUSTED, NOT FLAT, and the ruling is explicit
 * about why: the research puts dense prose nearer 180–220 words per minute
 * against roughly 250 for moderately complex prose. A flat rate applied to both
 * is not neutral — it is wrong in a known direction, and wrong hardest on
 * exactly the pieces a reader most wants warned about. A weighted estimate is
 * MORE accurate, not editorialised.
 *
 * THE FORMULA IS LINEAR IN THE SAME SCORE, ANCHORED AT THE SAME TWO BOUNDARIES
 * the levels use, and that reuse is deliberate: one pair of numbers governs both
 * halves of the indicator, so the minutes and the level can never be tuned
 * against each other.
 *
 *   score 60 (foot of plain English)  → 250 wpm
 *   score 30 (foot of very difficult) → 200 wpm
 *   linear between and beyond, clamped to [180, 250]
 *
 *   wpm = clamp(180, 250, 200 + (score − 30) × 5/3)
 *
 * The clamp floor of 180 is the bottom of the range the ruling cites; without it
 * the line keeps falling through a score of zero into speeds no evidence
 * supports. The ceiling is the 250 default, because nothing here reads faster
 * than moderately complex prose.
 */
export const WPM_FAST = 250;
export const WPM_SLOW = 180;
const WPM_AT_MEDIUM = 200;

/** Words per minute for a given Flesch score. */
export function wordsPerMinute(score) {
  const raw = WPM_AT_MEDIUM + ((score - THRESHOLD_MEDIUM) * (WPM_FAST - WPM_AT_MEDIUM)) /
    (THRESHOLD_LIGHT - THRESHOLD_MEDIUM);
  return Math.round(Math.min(WPM_FAST, Math.max(WPM_SLOW, raw)));
}

/**
 * WHAT COUNTS, AND WHAT IS EXCLUDED (ruling clause 3).
 *
 * ONLY THE PIECE'S OWN PROSE. A piece carrying a long quoted exchange would
 * otherwise inflate on both halves of the indicator — more minutes, and a
 * reading score computed partly from somebody else's sentences.
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
 * this shape, and the score's bands are coarse enough to survive it. Every rule
 * below is pinned by a test, in the excerpt module's tradition — this is the
 * other kind of thing that looks solved for about a day.
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
 * "poem" and "create" each come out one short. The error is systematic and in
 * one direction — it undercounts syllables, which nudges a score very slightly
 * upward, toward easier. On a body of a thousand words it moves the score by a
 * fraction of a point and moves no piece across a band. Fixing it properly needs
 * a pronouncing dictionary, which is the thing this measure was chosen to avoid.
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
 * The full indicator for a piece's Markdown body.
 *
 * Returns `{ words, sentences, syllables, score, level, level_display, wpm,
 * minutes, display }`. `score` is rounded to one decimal, which is the precision
 * a reader can check by hand and more than the bands need.
 *
 * A PIECE WITH NO COUNTABLE PROSE still returns a whole object — one minute,
 * light effort, a score of zero words' worth. The build must not fail because a
 * piece is all epigraph, and a missing indicator on one piece is worse than a
 * degenerate one: it would read as a piece the journal declined to measure.
 */
export function readingEffort(markdown) {
  const blocks = countableProse(markdown);
  const text = blocks.join(' ');
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = blocks.flatMap((block) => splitSentences(block));

  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const syllableCount = words.reduce((sum, word) => sum + syllables(word), 0);

  if (wordCount === 0 || sentenceCount === 0) {
    const level = 'light';
    return {
      words: wordCount,
      sentences: sentenceCount,
      syllables: syllableCount,
      score: null,
      level,
      level_display: LEVEL_DISPLAY[level],
      wpm: WPM_FAST,
      minutes: 1,
      display: formatIndicator(1, level),
    };
  }

  const score =
    Math.round(
      (206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount)) * 10
    ) / 10;

  const level = effortLevel(score);
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
    level,
    level_display: LEVEL_DISPLAY[level],
    wpm,
    minutes,
    display: formatIndicator(minutes, level),
  };
}

/** The level a Flesch score falls in. */
export function effortLevel(score) {
  if (score >= THRESHOLD_LIGHT) return 'light';
  if (score >= THRESHOLD_MEDIUM) return 'medium';
  return 'high';
}

/**
 * THE DISPLAY STRING, BUILT IN ONE PLACE. "7 min · High effort" — reading time
 * first, effort level second, separated by the middle dot the journal's meta
 * lines already use. The page prints this and the machine surfaces publish it,
 * so a consumer rendering our indicator renders the same characters we do.
 */
export function formatIndicator(minutes, level) {
  return `${minutes} min · ${LEVEL_DISPLAY[level]}`;
}

/**
 * THE PUBLISHED OBJECT, SHAPED ONCE FOR BOTH MACHINE SURFACES. /issues.json and
 * /corpus.jsonl emit exactly this under `reading_effort`, from this function, so
 * the two documents cannot come to disagree about a piece — the failure the
 * structured provenance object was built here to avoid, in the same shape.
 *
 * IT PUBLISHES ITS OWN WORKING, which is clause 4 of the ruling made concrete.
 * `words`, `sentences` and `syllables` are the three inputs to the score;
 * `score`, `measure` and `words_per_minute` are what turns them into the two
 * numbers a reader sees. Everything needed to re-derive `display` from the
 * piece's own text is here, so "how did this land where it did" is a question a
 * consumer can answer without asking us.
 *
 * `score` IS NULL ONLY WHERE THERE WAS NOTHING TO SCORE — a piece with no
 * countable prose at all. The other fields are always present.
 */
export function readingEffortFields(markdown) {
  const e = readingEffort(markdown);
  return {
    display: e.display,
    minutes: e.minutes,
    level: e.level,
    level_display: e.level_display,
    measure: MEASURE,
    score: e.score,
    words: e.words,
    sentences: e.sentences,
    syllables: e.syllables,
    words_per_minute: e.wpm,
  };
}
