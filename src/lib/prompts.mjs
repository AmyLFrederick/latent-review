// Prompts — the Weekly Question. The logic behind /prompts.
//
// Plain JS, not TypeScript, so the tests can import it directly — the same
// arrangement as src/lib/supporters.mjs and src/lib/volume.mjs. The rules here
// are editorial commitments made in R-026 and amended by R-038, several of
// which bind hard once a question is posed, so they are tested rather than
// trusted.
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

/** The section R-026 established. Named once, because two spellings would part. */
export const PROMPTS_SECTION = 'Prompts';

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
 * This file is hand-edited, it is the canonical text of something authors
 * answered word for word, and the page that renders it claims to be a complete
 * record. A silently-dropped question would be indistinguishable from a week
 * the editors skipped — and under R-038 a silent change to one is the single
 * thing the correction rule forbids, so nothing here may make either quietly.
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

    // The verification record exists before the question is posed. R-026
    // clause 5 made that unavoidable by making a posed question uncorrectable;
    // R-038 allows the correction and keeps the requirement, because the cost
    // moved rather than vanished — correcting a fact in a posed question is a
    // visible event that splits the question into versions, and the sources
    // are what make it unnecessary. Whether the entries are ENOUGH is an
    // editorial judgment no check can make; a question that asserts nothing
    // may honestly carry an empty list. What the build insists on is that the
    // editors passed through the question.
    if (POSED.includes(q.status) && !Array.isArray(q.sources)) {
      throw new Error(
        `Question ${q.number} is ${q.status} but carries no sources array. The checking ` +
          'happens before a question is posed (R-026 clause 5, as amended by R-038), so its ' +
          'verification record is recorded first. An empty array is valid; a missing one is not.'
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
 * The answers to one question, in the order they ran.
 *
 * THE LINK IS A FIELD ON THE PIECE, AND ONLY THE EDITORS WRITE IT. An answer is
 * an ordinary submission (R-026 clause 3) that names the Weekly Question in its
 * body; `question_number` is what the editors record at publication so the page
 * can gather the answers without reading prose for a reference. It is editorial
 * metadata in the same sense `topics` is — never sent by a submitter, and still
 * not part of the request schema the agent contract publishes.
 *
 * PLACEMENT IS UNTOUCHED BY IT. An answer runs in whatever section the editors
 * assign it under R-018; carrying this field does not move a piece, exactly as
 * carrying a topic does not (R-027 clause 1). What it does is make R-026 clause
 * 4 renderable: human and AI answers, side by side, under their own labels.
 *
 * Oldest first — the order the answers actually ran, which is the order the
 * conversation happened in. Ties break on title so the build is deterministic.
 */
export function answersTo(articles, number) {
  return articles
    .filter((a) => a?.data?.question_number === number)
    .sort((a, b) => {
      const byDate = new Date(a.data.date) - new Date(b.data.date);
      return byDate !== 0 ? byDate : String(a.data.title).localeCompare(String(b.data.title));
    });
}

/**
 * The build guard on the link between a piece and a question.
 *
 * Both failures below are silent ones: nothing crashes, the piece publishes,
 * and the answer simply never appears under the question it answers. On a page
 * whose whole claim is that the record shows what was asked and what came back,
 * a missing answer is indistinguishable from an answer that never ran — so they
 * fail the build instead, where an editor sees them.
 */
export function assertAnswersWellFormed(articles, questions) {
  const posed = new Set(questions.filter((q) => POSED.includes(q.status)).map((q) => q.number));

  for (const article of articles) {
    const { question_number: number, section } = article.data;

    // An answer to a question that was never posed is a typo in one of two
    // files, and no third possibility: either the number is wrong, or a
    // question is missing from a record that claims to be complete. An UNASKED
    // question is caught here too, and deliberately — nobody can have answered
    // words that have not been published.
    if (number !== undefined && !posed.has(number)) {
      throw new Error(
        `"${article.id}" answers Weekly Question No. ${number}, which has not been posed. ` +
          'An answer names a question in src/data/prompts.json with status open or closed.'
      );
    }

    // The Prompts section holds answers and nothing else (R-026). A piece
    // placed there without a question number is an answer the page cannot show
    // under any question, sitting in the one section that exists to show it.
    if (section === PROMPTS_SECTION && number === undefined) {
      throw new Error(
        `"${article.id}" runs in ${PROMPTS_SECTION} but names no question_number. ` +
          'A piece in this section is an answer to a Weekly Question; the number is what ' +
          'puts it under the question it answers.'
      );
    }
  }

  return articles;
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
