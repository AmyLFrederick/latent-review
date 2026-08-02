// Listing excerpts — the opening of a piece, in plain text (ruled 2026-08-02:
// readers browse a listing by taste, not by title alone).
//
// SENTENCES, NOT CHARACTERS, ruled 2026-08-02 after the character version was
// seen on the preview. A count cuts mid-thought; a sentence boundary is where
// the writer already decided a thought ends. Someday these may be hand-picked
// teaser lines, and then this module is what gets replaced.
//
// PLAIN-JS SO THE TESTS CAN READ IT, the same reason volume.mjs and
// tier-codes.mjs are. Sentence splitting is the kind of thing that looks like
// /[.!?]\s/ for about a day, so every rule below is pinned by a test.
//
// IT STRIPS RATHER THAN RENDERS. Emphasis, links and code in a two-sentence
// opening are noise, and a half-open <em> would be a rendering bug. Link TEXT is
// kept, because the words are the point and the address is not.

/** How many sentences a listing entry shows. */
export const EXCERPT_SENTENCES = 2;

/**
 * Words that end in a period without ending a sentence.
 *
 * "no" is FIRST FOR A REASON: this journal writes "Issue No. 1" constantly, in
 * its own masthead idiom, so a naive splitter breaks on the house style before
 * it breaks on anything exotic.
 */
const ABBREVIATIONS = new Set([
  'no', 'dr', 'mr', 'mrs', 'ms', 'prof', 'st', 'jr', 'sr', 'vs', 'etc', 'inc',
  'ltd', 'co', 'vol', 'fig', 'ch', 'pp', 'rev', 'gen', 'cf', 'al', 'ed', 'eds',
  'pt', 'dept', 'est', 'trans', 'univ', 'approx', 'esp', 'ca',
]);

const TERMINATORS = '.!?…';
const CLOSERS = '"\'”’)]»›';

/**
 * The first block of prose in a Markdown body, as plain text.
 *
 * Skips anything that is not a paragraph — headings, rules, images, lists and
 * blockquotes. A piece opening on an epigraph is excerpted from its own first
 * sentence rather than somebody else's quoted one, which is not hypothetical:
 * the cover opens on an italic attribution line, and without this the journal's
 * flagship piece would list as "— Claude (AI)".
 */
export function proseBlocks(markdown) {
  return String(markdown ?? '')
    .replace(/\r\n/g, '\n')
    // Fenced code can contain blank lines, so it must go before the split.
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter((block) => {
      if (!block) return false;
      if (block.startsWith('#')) return false; // heading
      if (block.startsWith('>')) return false; // blockquote / epigraph
      if (/^([-*_]\s*){3,}$/.test(block)) return false; // thematic break
      if (/^!\[/.test(block)) return false; // lone image
      if (/^(-|\*|\+|\d+\.)\s/.test(block)) return false; // list
      return true;
    });
}

/** The first prose block alone — where an excerpt starts. */
export function firstProseBlock(markdown) {
  return proseBlocks(markdown)[0] ?? '';
}

/** Markdown inline syntax removed, leaving the words. */
export function stripInline(text) {
  return String(text ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links keep their text
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1') // escaped punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split plain text into sentences.
 *
 * A terminator ends a sentence only when what follows is whitespace or the end
 * of the text, so "3.5" and "thelatentreview.com" never split. Runs of
 * terminators ("?!", "...") are consumed together, and closing quotes and
 * brackets are carried onto the sentence they close — a piece quoting a question
 * keeps the quotation mark with the question.
 *
 * Three guards stop a period that is not a full stop:
 *   - a token containing internal periods (U.S., e.g., i.e., a.m.)
 *   - a single letter, which is an initial — "Amy L. Frederick"
 *   - a known abbreviation, "No." above all
 */
export function splitSentences(text) {
  const s = String(text ?? '').trim();
  if (!s) return [];

  const out = [];
  let start = 0;

  for (let i = 0; i < s.length; i++) {
    if (!TERMINATORS.includes(s[i])) continue;

    let end = i;
    while (end + 1 < s.length && TERMINATORS.includes(s[end + 1])) end++;

    let after = end + 1;
    while (after < s.length && CLOSERS.includes(s[after])) after++;

    // Only a break followed by space (or the end) closes a sentence.
    if (after < s.length && !/\s/.test(s[after])) {
      i = end;
      continue;
    }

    // Abbreviation guards apply to a lone period, never to "!" or "?".
    if (s[i] === '.' && end === i) {
      const token = (s.slice(start, i).match(/([A-Za-z.]+)$/) || ['', ''])[1];
      const word = token.replace(/\./g, '');
      if (token.includes('.') || word.length === 1 || ABBREVIATIONS.has(word.toLowerCase())) {
        continue;
      }
    }

    const sentence = s.slice(start, after).trim();
    if (sentence) out.push(sentence);
    start = after;
    i = after - 1;
  }

  const tail = s.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/**
 * The listing excerpt: the first sentences of a piece's PROSE.
 *
 * IT CONTINUES PAST A PARAGRAPH BREAK when the opening paragraph holds fewer
 * than `count` sentences — clarified by the editors 2026-08-02: the unit is the
 * prose, not the paragraph. The AI Voices piece is the live case, opening on a
 * single short sentence and taking its second from the paragraph below.
 *
 * Non-prose blocks are skipped WHEREVER they fall, not only at the top, so a
 * pull quote between the first two paragraphs cannot become half the excerpt.
 *
 * NO CHARACTER CAP, by ruling. A long opening sentence renders long: that is the
 * writer's sentence, and cutting it is the thing this replaced.
 */
export function excerpt(markdown, count = EXCERPT_SENTENCES) {
  const sentences = [];
  for (const block of proseBlocks(markdown)) {
    sentences.push(...splitSentences(stripInline(block)));
    if (sentences.length >= count) break;
  }
  return sentences.slice(0, count).join(' ');
}
