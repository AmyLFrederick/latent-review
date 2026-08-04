// What a signed personal note carries beside its signature — the rule, in one
// place, above every template that renders apparatus.
//
// THE RULING (R-052, 2026-08-04): "Signed personal notes carry the badge of
// their own making, adjacent to the signature; unsigned joint apparatus carries
// none." The line it draws is SIGNATURE, not importance and not length. A note
// one editor signs is a piece of work with an author and a making of its own, so
// the standard applies to it exactly as it applies to an article. Apparatus the
// editors issue jointly and unsigned — the editorial note, the editors' note —
// speaks for the desk rather than for a person, and there is no single making
// for a mark to describe.
//
// WHY IT IS NOT DECIDED IN THE TEMPLATE. The byline badge was, until 2026-08-04,
// and the cost was a whole surface that had never drawn one — see
// src/lib/byline-badge.mjs, whose reasoning is the same reasoning. A rule each
// apparatus surface restates is a rule each of them can omit.
//
// AND WHY THE BADGE IS SCOPED IN WORDS. A signed note sits inside a piece that
// has a tier of its own, and the two are routinely different: the cover story is
// AI = Human, and the note appended to it is Human – AI (editor). Two marks on
// one page describing two different makings is exactly the confusion the
// 2026-07-31 split was made to end, so the note's mark says in its accessible
// name what it is the mark OF. The sighted reader gets the same fact from
// position — the badge sits in the signature line, under a rule, inside the
// note's own box — and a listener has only the name.

/**
 * Appended to the accessible name of a signed note's badge.
 *
 * IT TRAVELS WITH THE BADGE RATHER THAN WITH THE PAGE, for the reason R-051's
 * claim marker does: the mark is identical to the one an article byline carries,
 * so this sentence is the only thing distinguishing what it describes. A surface
 * that drew the badge and dropped the suffix would tell a listener the piece was
 * made the way the note was.
 */
export const NOTE_BADGE_SUFFIX =
  ' This is the tier of the note above, not of the article it appears in.';

/**
 * The tier a signed personal note's badge draws.
 *
 * THROWS RATHER THAN RETURNING NULL, and that is the point of it. The schema
 * already requires a tier and a signature on every personal note, so the only
 * way to reach this with an unresolvable code is a code added to the schema and
 * not to TIERS — the precise failure that published a badgeless byline for
 * months. A note whose tier cannot be resolved fails the build with the piece
 * named; it does not publish a signature with no mark beside it.
 *
 * @param note   the piece's personal_note, or null/undefined when it has none
 * @param tiers  TIERS, passed in so this module stays plain JS and testable
 * @param slug   named in the error, because "a piece" is not a thing anyone can fix
 */
export function personalNoteBadge(note, tiers, slug) {
  if (!note) return null;

  const tier = tiers.find((t) => t.code === note.tier);
  if (!tier) {
    throw new Error(
      `"${slug}" carries a personal note with the tier "${note.tier}", which is not in TIERS — ` +
        `its signature would publish with no badge. A signed note carries the badge of its own making.`
    );
  }

  return { tier, labelSuffix: NOTE_BADGE_SUFFIX };
}

/**
 * The note's prose as paragraphs.
 *
 * SPLIT ON BLANK LINES, NOT RENDERED AS MARKDOWN — the same treatment the
 * editors' note gets, and for the same reason: this is apparatus in a
 * frontmatter string, and running it through the body renderer would let
 * apparatus grow headings, images and links that the article's own safe-subset
 * rules (R-025) exist to govern. Blank lines are the only structure it needs.
 *
 * The signature is NOT in here. It is its own field, because the badge is
 * adjacent to it by ruling and a rule about adjacency cannot depend on the last
 * paragraph of a free-text block happening to be the signature.
 */
export function noteParagraphs(body) {
  return body
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean);
}
