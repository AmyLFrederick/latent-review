// Listing excerpts — the opening of a piece, in plain text (ruled 2026-08-02:
// readers browse the listing sections by taste, not by title alone).
//
// PLAIN-JS SO THE TESTS CAN READ IT, the same reason volume.mjs and
// tier-codes.mjs are. Truncation is the kind of thing that looks obvious and
// then cuts mid-word, mid-quote or mid-link for two years, so it is pinned.
//
// IT STRIPS RATHER THAN RENDERS, and that is deliberate. A card is not the
// piece: emphasis, links and blockquote markers in a 180-character opening are
// noise at best, and a half-open <em> is a rendering bug at worst. What a reader
// wants from an excerpt is the first thing the piece SAYS.

/** Roughly two lines at listing width. */
export const EXCERPT_LENGTH = 180;

/**
 * The first block of prose in a Markdown body, as plain text.
 *
 * Skips anything that is not a paragraph — headings, rules, images, and
 * blockquotes. A piece opening on an epigraph should be excerpted from its own
 * first sentence rather than from somebody else's quoted one; that is a real
 * case here, since the cover carried an attribution line as its opening block
 * before the display apparatus gave it a field of its own.
 */
export function firstProseBlock(markdown) {
  const blocks = String(markdown ?? '')
    .replace(/\r\n/g, '\n')
    // Fenced code can contain blank lines, so it must go before the split.
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/);

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    if (block.startsWith('#')) continue; // heading
    if (block.startsWith('>')) continue; // blockquote / epigraph
    if (/^([-*_]\s*){3,}$/.test(block)) continue; // thematic break
    if (/^!\[/.test(block)) continue; // lone image
    if (/^(-|\*|\+|\d+\.)\s/.test(block)) continue; // list
    return block;
  }
  return '';
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
 * Truncate at a WORD boundary, never mid-word, and never leaving dangling
 * punctuation before the ellipsis. Returns the text unchanged when it already
 * fits — a short opening should not be given an ellipsis it has not earned.
 */
export function truncate(text, limit = EXCERPT_LENGTH) {
  const s = String(text ?? '').trim();
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit + 1);
  const lastSpace = cut.lastIndexOf(' ');
  const words = (lastSpace > 0 ? cut.slice(0, lastSpace) : s.slice(0, limit)).replace(
    /[\s,;:.!?—–-]+$/,
    ''
  );
  return `${words}…`;
}

/** The listing excerpt for a piece's Markdown body. */
export function excerpt(markdown, limit = EXCERPT_LENGTH) {
  return truncate(stripInline(firstProseBlock(markdown)), limit);
}
