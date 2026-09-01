// Prompts — the Monthly Question. The logic behind /prompts.
//
// Plain JS, not TypeScript, so the tests can import it directly — the same
// arrangement as src/lib/supporters.mjs and src/lib/volume.mjs. The rules here
// are editorial commitments made in R-026 and amended by R-038 and R-039,
// several of which bind hard once a question is posed, so they are tested
// rather than trusted.
//
// THIS IS SITE-PAGE LOGIC, NEVER THE RECORD. Closing a question ends the
// invitation to answer it; it does not unsay the question or remove it from
// the file. Nothing here deletes, and a future session should not "tidy" the
// archive by dropping old questions.
//
// THE TWO THINGS THIS FILE KEEPS APART, because collapsing them is the easy
// mistake and R-039 turns on the distinction:
//
//   CURRENT is a position — the question most recently posed, the one /prompts
//   leads with. It is derived, it moves on its own the moment a new question is
//   added, and no editor sets it.
//
//   OPEN is an editorial act — whether answers are still invited. Editors set
//   it, it is shown wherever the question appears, and nothing derives it.
//
// A question can be open and not current: that is the ordinary state of the
// month after a new question posts, and it is the state rotation exists to
// make possible. Nothing here may write `status` and nothing may infer one of
// these two from the other.

// THE ONE THING THIS FILE IMPORTS FROM THE DOOR is the sentence asking an
// author for the fields the desk cannot file a piece without. The door deals
// briefs and Prompts poses questions — different instruments, deliberately
// different vocabulary (R-033 clause 4) — but what comes back is the same, and
// two copies of that ask would be two contracts the first time one was edited.
import { provenanceAsks } from './door.mjs';
import { PIECE_WORDS, TRUTH_STANDARDS } from './agent-contract.mjs';

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
 * future announcement cannot disagree about what a question is called. "Monthly
 * Question" is the ruled item name; the section is "Prompts", and the two are
 * not interchangeable.
 */
export function questionLabel(question) {
  return `Monthly Question No. ${question.number}`;
}

/**
 * A question's text, split into the blocks the editors ratified.
 *
 * A QUESTION IS A HEADLINE AND, USUALLY, ITS FRAMING. The file holds ONE
 * canonical string per question, with blank lines between blocks exactly as
 * they were posed — the first block is what the question is called, and any
 * blocks after it are the framing that makes it answerable. Splitting here
 * rather than storing two fields keeps the record one verbatim string, which is
 * what R-026 clause 1 makes canonical and what every quotation has to match.
 *
 * A question with no framing is the ordinary case, not a special one: it comes
 * back as a single block and renders as a headline alone.
 *
 * IT LIVES HERE BECAUSE THREE SURFACES NEED IT — /prompts, the question
 * archive, and the full-text disclosure — and three copies of a rule about how
 * the canonical text is divided would be three chances to divide it differently.
 */
export function questionBlocks(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/**
 * The short form: a question's own first line.
 *
 * NOT A SUMMARY, AND NOTHING HERE COMPOSES ONE. Ruled 2026-08-03 — every
 * surface leads with the short form and puts the question as posed one click
 * behind a marked link. What this returns is the editors' own first sentence of
 * the question they wrote; a page that shortened, paraphrased or generated one
 * would be quoting a question that was never asked.
 */
export function questionHeadline(question) {
  return questionBlocks(question.text)[0];
}

/**
 * Read the questions file: validate it, and return the questions in order.
 *
 * EVERY GUARD HERE FAILS THE BUILD RATHER THAN RENDERING SOMETHING PLAUSIBLE.
 * This file is hand-edited, it is the canonical text of something authors
 * answered word for word, and the page that renders it claims to be a complete
 * record. A silently-dropped question would be indistinguishable from a month
 * the editors skipped — and under R-038 a silent change to one is the single
 * thing the correction rule forbids, so nothing here may make either quietly.
 */
/**
 * A recorded day, in the one form this file records days in.
 *
 * Bare YYYY-MM-DD, Madison local (CLAUDE.md). Checked rather than trusted
 * because every date here is hand-typed into a JSON file and a malformed one
 * reaches a reader as "Invalid Date" on the page that claims to be the complete
 * record.
 */
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

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

    // THE DATES ARE THE DAYS THEY CLAIM TO BE. Format only — whether a date is
    // the RIGHT one is an editorial fact no check can reach.
    for (const field of ['opened', 'closed', 'closes']) {
      const value = q[field];
      if (value !== undefined && value !== null && !DAY_RE.test(value)) {
        throw new Error(
          `Question ${q.number} has ${field} ${JSON.stringify(value)}, which is not a bare ` +
            'YYYY-MM-DD day. Every date the record names is a Madison local day (CLAUDE.md).'
        );
      }
    }

    // STATUS AND THE CLOSING DATE MUST AGREE, in both directions. A question
    // marked closed with no date does not say when answers stopped being
    // invited; a question still open carrying a closing date says they already
    // have. Either way a reader is told something untrue by a page that is
    // supposed to be the record, and neither is catchable by eye in a file this
    // long.
    if (q.status === 'closed' && !q.closed) {
      throw new Error(
        `Question ${q.number} is closed but records no date for it. Closing is an editorial ` +
          'act (R-039) and the day it happened is part of the record.'
      );
    }
    if (q.status !== 'closed' && q.closed) {
      throw new Error(
        `Question ${q.number} is ${q.status} but carries closed ${JSON.stringify(q.closed)}. ` +
          'A question that has a closing date has closed; set the status or clear the date.'
      );
    }

    // WHEN IT IS DUE TO CLOSE IS SETTLED AT POSING, because the rule is a
    // calendar rather than a decision: a question closes on the first of the
    // month after its issue's publication month (both editors, 2026-08-31). A
    // posed question with no `closes` is one whose end nobody can look up, on a
    // page that invites people to spend days writing an answer to it.
    //
    // THE FIRST OF A MONTH IS THE WHOLE OF WHAT IS CHECKED HERE, and it is
    // worth saying what is not. Whether the month is the right month depends on
    // the issue's publication date, which lives in the article collection and
    // not in this file; asserting it here would make the questions record
    // depend on the pieces record to validate itself. The check that closes
    // that gap belongs where both are already in hand — see
    // tests/question-closure.test.mjs, which walks the questions against the
    // issues and fails on a month that does not follow.
    if (POSED.includes(q.status)) {
      if (!q.closes) {
        throw new Error(
          `Question ${q.number} is ${q.status} but records no \`closes\` date. A question ` +
            "closes on the first of the month after its issue's publication month (both " +
            'editors, 2026-08-31); the date is knowable when the question is posed, so it is ' +
            'recorded then. See the schema note in src/data/prompts.json.'
        );
      }
      if (!q.closes.endsWith('-01')) {
        throw new Error(
          `Question ${q.number} closes ${q.closes}, which is not the first of a month. The ` +
            'closing rule is calendar-fixed to the 1st; a mid-month date is a typo or a rule ' +
            'change, and a rule change is a ruling rather than an edit.'
        );
      }
    }

    // THE ISSUE A QUESTION BELONGS TO IS RECORDED, NEVER COMPUTED (editors,
    // 2026-08-21). Questions became monthly on that date and one belongs to
    // each issue, which makes the two counts LOOK derivable — question 1 with
    // Issue No. 1, question 2 with Issue No. 2. They are not. They are separate
    // sequences that coincide, and the first question held over or skipped puts
    // them out of step for good; a page that paired them by arithmetic would
    // then mislabel every question after it and give no sign it had.
    //
    // OPTIONAL, because a question drafted before its issue is known has no
    // honest value to put here, and null is that state said out loud. What is
    // refused is a value that is neither absent nor a real issue number.
    if (q.issue !== undefined && q.issue !== null) {
      if (!Number.isInteger(q.issue) || q.issue < 1) {
        throw new Error(
          `Question ${q.number} has issue ${JSON.stringify(q.issue)}, which is not a positive ` +
            'integer. The pairing is recorded rather than derived; see the schema note in ' +
            'src/data/prompts.json.'
        );
      }
    }
  }

  // CONTIGUOUS FROM 1, AND NUMBERS DO NOT TRACK THE CALENDAR (R-026 clause 1),
  // NOR ISSUE NUMBERS. A month the editors skip leaves no entry and no gap in
  // the numbering: the next question is simply the next number, and the dates
  // on the two either side are what show the rhythm. So a gap here is not a
  // skipped month — it is a question missing from a file that claims to be the
  // whole record. The two counts coincide today and are not derived from each
  // other; see the note in src/data/prompts.json.
  const numbers = questions.map((q) => q.number).sort((a, b) => a - b);
  numbers.forEach((n, i) => {
    if (n !== i + 1) {
      throw new Error(
        `Monthly Question numbers must be contiguous starting at 1; found [${numbers.join(', ')}]. ` +
          'Numbers do not track the calendar (R-026 clause 1) — a gap here is a missing ' +
          'question, not a month without one.'
      );
    }
  });

  // MORE THAN ONE QUESTION MAY BE OPEN, AND THE GUARD THAT FORBADE IT IS GONE
  // (R-039, 2026-08-03). It used to throw on a second open question, reasoning
  // that two would make "the Monthly Question" ambiguous. That reasoning was
  // sound and its conclusion is now the wrong trade: answers accumulate between
  // issues, and a
  // build that refused a second open question would have forced the editors to
  // CLOSE one in order to POSE the next. Closing is an editorial act about
  // whether answers are still invited. Nothing mechanical may perform it as a
  // side effect of the calendar.
  //
  // THE AMBIGUITY IT WORRIED ABOUT IS REAL AND IS ANSWERED ELSEWHERE. Authors
  // are asked to name the question by NUMBER rather than by the phrase "the
  // Monthly Question" (/prompts and /for-agents), and questionLabel renders that
  // number everywhere a question appears. What was a build guard is now a
  // naming discipline, which is where it belonged: the file was never the thing
  // that made an answer ambiguous.

  // An unasked question is the NEXT one, so there is at most one and it is the
  // highest number. An unasked question below a posed one would mean the
  // editors skipped back, which the contiguity rule cannot catch on its own.
  const unasked = questions.filter((q) => q.status === 'unasked');
  if (unasked.length > 1) {
    throw new Error(
      `Only one Monthly Question is unasked at a time; found ${unasked.length} ` +
        `(numbers ${unasked.map((q) => q.number).join(', ')}).`
    );
  }
  if (unasked.length === 1 && unasked[0].number !== numbers[numbers.length - 1]) {
    throw new Error(
      `Monthly Question No. ${unasked[0].number} is unasked but is not the highest number ` +
        `(${numbers[numbers.length - 1]}). An unasked question is the next one.`
    );
  }

  return [...questions].sort((a, b) => a.number - b.number);
}

/**
 * The question the page leads with: THE ONE MOST RECENTLY POSED.
 *
 * ROTATION LIVES IN THIS FUNCTION, AND IT IS THE WHOLE MECHANISM (R-039). When
 * the editors pose a new question, it becomes the highest posed number and the
 * page leads with it; the one before it stops being current and is read in the
 * archive from then on. No field is set to make that happen and no editor
 * performs it — rotation is what "most recently posed" means when a question is
 * added, which is why it cannot fall out of step with the file.
 *
 * ROTATION IS DISPLAY, AND IT CLOSES NOTHING. A question that rotates off this
 * page keeps whatever status the editors gave it. If it is open it is still
 * open, still taking answers, and still says so wherever it appears — it is
 * simply no longer the one the section page leads with. Open and closed are an
 * editorial act; being current is a position in a sequence. A future session
 * changing this must not collapse the two: setting `closed` here, or reading
 * "not current" as "closed" anywhere downstream, would make the machinery
 * perform an editorial judgment the editors never made.
 *
 * SELECTED BY NUMBER, NOT BY DATE. Numbers are contiguous and settled at the
 * moment of posing, so the highest posed number is the latest question by
 * construction. Two questions may honestly share an `opened` date — nothing
 * stops the editors posing two in a day — and a date comparison would then pick
 * between them arbitrarily.
 *
 * The unasked one is the fallback, because it is the launch state and is shown
 * as unasked rather than hidden. Returns null only for a file with no questions
 * in it at all, which the page treats as its own state rather than crashing.
 */
export function currentQuestion(questions) {
  const posed = questions.filter((q) => POSED.includes(q.status));
  return (
    posed.reduce((latest, q) => (latest === null || q.number > latest.number ? q : latest), null) ??
    questions.find((q) => q.status === 'unasked') ??
    null
  );
}

/**
 * The other questions still taking answers — open, but no longer current.
 *
 * WHY THE PAGE NEEDS THIS. Rotation moves a question off /prompts without
 * closing it, so the section page can be leading with question N while N-1 is
 * open and answerable. A reader who is told only about the current question
 * would reasonably conclude the others are finished, and would be wrong. The
 * page says so and links to the archive; this is the count behind that
 * sentence.
 *
 * Newest first, matching the archive's order. Empty in the ordinary case, where
 * the current question is the only open one — and the page says nothing at all
 * then, rather than saying "no others", which is noise.
 */
export function otherOpenQuestions(questions, current) {
  return questions
    .filter((q) => q.status === 'open' && q.number !== current?.number)
    .sort((a, b) => b.number - a.number);
}

/**
 * The question standing in the left column of /prompts: the one posed before
 * the current one.
 *
 * THE PAGE SHOWS TWO QUESTIONS SIDE BY SIDE (editors, 2026-08-21) — the one a
 * reader can still answer, and the one the answers below it belong to. Before
 * this, /prompts led with the current question alone and the previous one was
 * readable only in the archive, which meant the answers on the page sat under
 * a question that was no longer printed anywhere near them.
 *
 * IT IS THE PREVIOUS POSED QUESTION, NOT "THE CLOSED ONE" AND NOT "ISSUE N-1".
 * Status is an editorial fact about whether answers are still invited, and a
 * question in this column may well be open — the column says what it is by its
 * own label. Deriving it from the issue number would break the moment the two
 * counts part, which the schema note in src/data/prompts.json says they will.
 *
 * Null when there is only one question, which is the state /prompts was in
 * until today: the page then renders the single column it always had.
 */
export function previousQuestion(questions, current) {
  if (!current) return null;
  return questions
    .filter((q) => POSED.includes(q.status) && q.number < current.number)
    .reduce((latest, q) => (latest === null || q.number > latest.number ? q : latest), null);
}

/**
 * The answers to one question, in the order they ran.
 *
 * THE LINK IS A FIELD ON THE PIECE, AND ONLY THE EDITORS WRITE IT. An answer is
 * an ordinary submission (R-026 clause 3) that names the Monthly Question in its
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
      // THE EDITORS' RUNNING ORDER FIRST (2026-08-31). `section_order` is the
      // field R-018's placement rule already uses on /topics — "the editors
      // decide where a piece GOES", lowest first — and answers under a question
      // are the same kind of decision: which one a reader meets first.
      //
      // IT IS HONOURED HERE BECAUSE THE ALTERNATIVE WAS ALPHABETICAL, and that
      // is not an order anybody chose. Issue No. 2 ran two answers dated the
      // same day, so the tiebreak below decided the running order by their
      // titles — "The Paper Mill" before "Water Power", purely because T comes
      // before W. The desk had said which ran first; the page said otherwise.
      //
      // UNPLACED MEANS UNCHANGED, exactly as on /topics: a piece carrying no
      // order sorts by date and then title as it always did, and sits behind
      // whatever was placed. Every answer published before this field was
      // applied is untouched.
      // COMPARED, NOT SUBTRACTED. Unplaced is Infinity, and Infinity minus
      // Infinity is NaN — a comparator returning NaN does not sort, it
      // corrupts, and it did: two unplaced answers came back in an order that
      // was neither by date nor by title. Caught by the existing fixture.
      const placed = (x) => (typeof x.data.section_order === 'number' ? x.data.section_order : Infinity);
      const pa = placed(a);
      const pb = placed(b);
      if (pa !== pb) return pa < pb ? -1 : 1;

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
        `"${article.id}" answers Monthly Question No. ${number}, which has not been posed. ` +
          'An answer names a question in src/data/prompts.json with status open or closed.'
      );
    }

    // The Prompts section holds answers and nothing else (R-026). A piece
    // placed there without a question number is an answer the page cannot show
    // under any question, sitting in the one section that exists to show it.
    if (section === PROMPTS_SECTION && number === undefined) {
      throw new Error(
        `"${article.id}" runs in ${PROMPTS_SECTION} but names no question_number. ` +
          'A piece in this section is an answer to a Monthly Question; the number is what ' +
          'puts it under the question it answers.'
      );
    }
  }

  return articles;
}

/**
 * The chat paste block for a posed question: the wrapper plus the question,
 * verbatim, as one string a human copies to an AI that cannot reach the API.
 *
 * WHY PROMPTS NEEDED ONE. A chat AI could always answer the Monthly Question,
 * and until now nothing on the site handed it the question in a form anyone
 * could paste — the page's only act was a link to the submission form, which is
 * where a FINISHED piece goes and no help at all with starting one. Ratified by
 * both editors 2026-08-27 as the template for every question from Monthly
 * Question No. 2 forward; the wrapper is the template and the question swaps.
 *
 * THE WRAPPER WRAPS AND TOUCHES NOTHING. `question.text` is interpolated exactly
 * as src/data/prompts.json holds it — R-026 clause 1 makes that string canonical
 * and R-038 makes a silent edit to it the one forbidden correction. Nothing here
 * splits it, trims it, or composes around its blocks: a block that quoted a
 * question the editors never posed would put words in an author's prompt and
 * then publish the answer as an answer to something else.
 *
 * WHAT THE WRAPPER SAYS THAT THE DOOR'S DOES NOT, and why:
 *
 *   THE WEB-SEARCH LINE is phrased as optional throughout, because many models
 *   cannot browse and an instruction they cannot follow reads as a failed one.
 *   The door has no equivalent: its reader arrived through the site.
 *
 *   THE WORD RANGE AND THE TRUTH STANDARD are stated here because there is no
 *   brief to state them. AMENDED 2026-08-27, BOTH EDITORS: the ratified wrapper
 *   carried neither, and both were added on this findings pass — the truth
 *   standard on the editors' instruction, the word range on their conditional
 *   one, once it was established that /submit's own rail is advisory and
 *   overridable while the agent door hard-refuses outside these bounds. A
 *   further change to either sentence is another dual yes, not a commit.
 *   Every frozen door brief carries both in its own text;
 *   a question is not a brief and carries neither, so a chat AI given only the
 *   question would learn the journal's two hard requirements from the human
 *   courier at the form, after the writing was done. Both are rendered from
 *   src/lib/agent-contract.mjs rather than typed — see the guard below.
 *
 *   THE HANDOFF NAMES THE ADDRESS. The door's reader is already standing at the
 *   site and hands the piece back to a human who is too; this block travels into
 *   a chat window and has to say where the finished piece goes.
 *
 * "QUESTION", NEVER "ASSIGNMENT". R-033 clause 4 keeps the dealt brief and the
 * posed question distinct instruments, and Prompts is the venue for the second.
 * The door's word does not appear on a Prompts surface.
 */
export function questionPasteBlock(question) {
  const text = String(question?.text ?? '').trim();
  if (!text) {
    throw new Error(
      `Monthly Question No. ${question?.number} has no text, so there is nothing to hand an ` +
        'author. A paste block is only ever built for a question that has been posed.'
    );
  }

  return `You are invited to answer a question for The Latent Review, a journal published monthly where AIs are the credited authors. If you can search the web, you're welcome to look up thelatentreview.com to see what kind of journal this is — but you don't need to.

Here is the question, exactly as the editors posed it:

${text}

${provenanceAsks({
  lead: 'When you answer: tell us',
  artifact: 'answer',
  handedYou: 'question',
})} ${lengthSentence()} ${truthStandardSentence()} When you're done, give the finished piece to your human to submit at ${SUBMIT_ADDRESS}.`;
}

/** Where a finished answer goes, as a person reads it aloud — no scheme. */
export const SUBMIT_ADDRESS = 'thelatentreview.com/submit';

/**
 * The two hard requirements, rendered from the contract rather than typed.
 *
 * These are the exact hazard src/lib/door.mjs describes: prose stating a figure
 * the contract already holds. There the briefs are frozen literals and the
 * resolution is a build-time check that they still agree; here the sentences are
 * GENERATED from the constants, so they cannot drift while they are generated.
 * What can happen — and is the whole reason for the guard below — is a later
 * session replacing an interpolation with a literal because it read easier.
 */
function lengthSentence(words = PIECE_WORDS) {
  return `Answers run ${words.min.toLocaleString('en-US')} to ${words.max.toLocaleString('en-US')} words.`;
}

function truthStandardSentence(standards = TRUTH_STANDARDS) {
  const list = [...standards];
  const last = list.pop();
  return `Declare exactly one truth standard: ${list.join(', ')}, or ${last}.`;
}

/**
 * Build-time guard on the figures inside the paste block.
 *
 * The sibling of assertBriefsMatchContract() in src/lib/door.mjs, and it exists
 * for the same reason in the opposite direction: that one proves a frozen text
 * still matches the contract, this one proves a generated text is still
 * generated. Called by /prompts, so the failure lands on a build rather than on
 * a reader — and on the day someone hardcodes "500 to 3,000 words" here and the
 * contract later moves, this is what refuses to publish the older number.
 */
export function assertQuestionBlockMatchesContract(
  words = PIECE_WORDS,
  standards = TRUTH_STANDARDS
) {
  const block = questionPasteBlock({ number: 0, text: 'guard' });
  const range = `${words.min.toLocaleString('en-US')} to ${words.max.toLocaleString('en-US')} words`;

  if (!block.includes(range)) {
    throw new Error(
      `the question paste block does not state "${range}". The bounds live in ` +
        'src/lib/agent-contract.mjs and this block renders them; if it now states a figure of ' +
        'its own, that is the drift this guard exists to stop.'
    );
  }

  for (const standard of standards) {
    if (!block.includes(standard)) {
      throw new Error(
        `the question paste block omits the truth standard "${standard}". All four are ` +
          'rendered from the contract in src/lib/agent-contract.mjs; a block that names some ' +
          'of them asks an author to choose from a list the journal does not have.'
      );
    }
  }

  return true;
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
