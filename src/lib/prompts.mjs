// Prompts — the Weekly Question. The logic behind /prompts.
//
// Plain JS, not TypeScript, so the tests can import it directly — the same
// arrangement as src/lib/supporters.mjs and src/lib/volume.mjs. The rules here
// are editorial commitments made in R-026, several of which cannot be undone
// once a question is posed, so they are tested rather than trusted.
//
// THIS IS SITE-PAGE LOGIC, NEVER THE RECORD. Closing a question ends the
// invitation to answer it; it does not unsay the question or remove it from
// the file. Nothing here deletes, and a future session should not "tidy" the
// archive by dropping old questions.

/**
 * The three statuses, in the order a question passes through them.
 *
 * A VALUE, NEVER A SENTENCE. What the page says about each state is the page's
 * business; what the file records is one of exactly these three words. An
 * unrecognised status fails the build rather than rendering as itself, because
 * a typo here is a question in an undefined state on a page that promises the
 * record is complete.
 */
export const QUESTION_STATUSES = ['unasked', 'open', 'closed'];

/** A question that has been posed is one that authors may have answered. */
const POSED = ['open', 'closed'];

/**
 * Entries carrying a `_comment` key are the schema note at the top of
 * prompts.json, not questions. Skipped everywhere.
 */
export function isQuestion(entry) {
  return Boolean(entry) && typeof entry === 'object' && !('_comment' in entry);
}

/**
 * How a question is named, everywhere it is named.
 *
 * Rendered from the number rather than typed, so the page, the archive and any
 * future announcement cannot disagree about what a question is called. "Weekly
 * Question" is the ruled item name; the section is "Prompts", and the two are
 * not interchangeable.
 */
export function questionLabel(question) {
  return `Weekly Question No. ${question.number}`;
}

/**
 * Read the questions file: validate it, and return the questions in order.
 *
 * EVERY GUARD HERE FAILS THE BUILD RATHER THAN RENDERING SOMETHING PLAUSIBLE.
 * This file is hand-edited, it is the canonical text of something that can
 * never be corrected after it is posed, and the page that renders it claims to
 * be a complete record. A silently-dropped question would be indistinguishable
 * from a week the editors skipped.
 */
export function readQuestions(entries) {
  const questions = entries.filter(isQuestion);

  for (const q of questions) {
    if (!QUESTION_STATUSES.includes(q.status)) {
      throw new Error(
        `Question ${q.number} has status "${q.status}", which is not one of ` +
          `${QUESTION_STATUSES.join(', ')}. See the schema note in src/data/prompts.json.`
      );
    }

    // R-026 clause 5 makes a posed question uncorrectable, so the verification
    // record must exist before it is posed. Whether the entries in it are
    // ENOUGH is an editorial judgment, and no check can make it — a question
    // that asserts nothing may honestly carry an empty list. What the build
    // can insist on is that the editors passed through the question.
    if (POSED.includes(q.status) && !Array.isArray(q.sources)) {
      throw new Error(
        `Question ${q.number} is ${q.status} but carries no sources array. A question ` +
          'cannot be corrected once posed (R-026 clause 5), so its verification record ' +
          'is recorded before it is posed. An empty array is valid; a missing one is not.'
      );
    }
  }

  // CONTIGUOUS FROM 1, AND NUMBERS DO NOT TRACK CALENDAR WEEKS (R-026 clause 1).
  // A week the editors skip leaves no entry and no gap in the numbering: the
  // next question is simply the next number, and the dates on the two either
  // side are what show the rhythm. So a gap here is not a skipped week — it is
  // a question missing from a file that claims to be the whole record.
  const numbers = questions.map((q) => q.number).sort((a, b) => a - b);
  numbers.forEach((n, i) => {
    if (n !== i + 1) {
      throw new Error(
        `Weekly Question numbers must be contiguous starting at 1; found [${numbers.join(', ')}]. ` +
          'Numbers do not track calendar weeks (R-026 clause 1) — a gap here is a missing ' +
          'question, not a week without one.'
      );
    }
  });

  // ONE QUESTION IS OPEN AT A TIME. The section poses one question a week and
  // may hold one open longer; it never runs two at once. Two open questions
  // would make "the Weekly Question" ambiguous on the page and in every answer
  // that names it.
  const open = questions.filter((q) => q.status === 'open');
  if (open.length > 1) {
    throw new Error(
      `Only one Weekly Question is open at a time; found ${open.length} ` +
        `(numbers ${open.map((q) => q.number).join(', ')}).`
    );
  }

  // An unasked question is the NEXT one, so there is at most one and it is the
  // highest number. An unasked question below a posed one would mean the
  // editors skipped back, which the contiguity rule cannot catch on its own.
  const unasked = questions.filter((q) => q.status === 'unasked');
  if (unasked.length > 1) {
    throw new Error(
      `Only one Weekly Question is unasked at a time; found ${unasked.length} ` +
        `(numbers ${unasked.map((q) => q.number).join(', ')}).`
    );
  }
  if (unasked.length === 1 && unasked[0].number !== numbers[numbers.length - 1]) {
    throw new Error(
      `Weekly Question No. ${unasked[0].number} is unasked but is not the highest number ` +
        `(${numbers[numbers.length - 1]}). An unasked question is the next one.`
    );
  }

  return [...questions].sort((a, b) => a.number - b.number);
}

/**
 * The question the page leads with.
 *
 * The open one if there is one; otherwise the unasked one, which is the launch
 * state and is shown as unasked rather than hidden; otherwise the most recent
 * closed one, so a week between questions still shows what was last asked
 * rather than an empty page.
 *
 * Returns null only for a file with no questions in it at all, which the page
 * treats as its own state rather than crashing.
 */
export function currentQuestion(questions) {
  return (
    questions.find((q) => q.status === 'open') ??
    questions.find((q) => q.status === 'unasked') ??
    [...questions].reverse().find((q) => q.status === 'closed') ??
    null
  );
}

/**
 * The archive: every question that has been posed, newest first.
 *
 * INCLUDES THE OPEN ONE. A reader looking for what has been asked should find
 * the current question in the list of questions that have been asked, because
 * it has been. The page decides whether to repeat it above; this function does
 * not decide that by omission.
 *
 * Excludes the unasked one, which has not been posed and whose text is empty.
 */
export function askedQuestions(questions) {
  return questions.filter((q) => POSED.includes(q.status)).sort((a, b) => b.number - a.number);
}
