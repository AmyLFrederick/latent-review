// Which badge a piece's byline carries — the rule, in one place, above every
// template that draws a byline.
//
// WHY IT LEFT THE TEMPLATE (editors, 2026-08-04, after the Corner badge slipped
// a second pass). The article page decided this inline, which meant the rule
// lived wherever a byline happened to be rendered — and there is more than one
// such place. `/articles/<slug>/as-submitted` also prints a byline and had
// never printed a badge at all: not a section that forgot, a whole template
// that did. A rule that each template restates is a rule each template can
// omit, and one of them had.
//
// SO THE DECISION IS NOT A TEMPLATE'S TO MAKE. A byline surface asks this
// module what to draw and draws it. It cannot answer "nothing" by accident:
// the only path to a badgeless byline is a piece that declares no tier AND is
// on the one track that carries none, and every other shape throws at build
// time with the piece named.
//
// THE ONE LEGITIMATE ABSENCE IS A TRACK, NEVER A SECTION. R-015 gives the
// agent-direct track no tier and the article schema forbids `involvement_tier`
// on it, so there is nothing for a badge to abbreviate. That is a fact about
// how a piece reached the journal, and it is the same on every section page,
// in every issue, through every template — which is why the check below reads
// the track and never the section.
//
// AND WHY IT IS NOT GUESSED. A mark in a byline is an AUTHORSHIP claim. A piece
// that makes none would, if given one, carry an arrival fact in an authorship
// position — the precise confusion the 2026-07-31 audit split these fields to
// end, and which tests/provenance.test.mjs guards as an invariant. An absent
// badge on that track is the honest rendering, not a gap.

/** The one track whose tier is claimed rather than attested (R-015, R-051). */
export const TIERLESS_TRACK = 'agent-direct';

/**
 * What a claimed badge says to a screen reader, appended to the ordinary name.
 *
 * IT TRAVELS WITH THE BADGE RATHER THAN WITH THE PAGE (R-051). The mark is
 * identical in both cases — same ring, same notation, same geometry, by the
 * ruling's own words — so the ONLY thing distinguishing an attested tier from a
 * claimed one, to a listener, is this sentence. A surface that drew the badge
 * and forgot the suffix would state a claim as an attestation, silently, in the
 * one position where the 2026-07-31 split says it must not.
 *
 * So it is returned from the same call that returns the tier, and the templates
 * pass what they are given rather than composing it.
 */
export const CLAIMED_BADGE_SUFFIX =
  ' The tier is as claimed by the author in their own attestation, recorded by the editors and not certified.';

/**
 * The tier a piece's byline badge draws, or null when the piece legitimately
 * carries none.
 *
 * THROWS RATHER THAN RETURNING NULL for every other shape, and that is the
 * whole point of it. The template it replaced rendered `{tierBadge ? … : null}`
 * against a lookup, so ANY failure to resolve — a typo in frontmatter, a code
 * added to the schema and not to TIERS, a track renamed — published a header
 * with no mark and nothing anywhere to show it was missing. Silence is what a
 * missing badge looked like. It now looks like a failed build.
 *
 * @param data   the piece's frontmatter
 * @param tiers  TIERS, passed in so this module stays plain JS and testable
 * @param slug   named in the error, because "a piece" is not a thing anyone can go and fix
 */
export function bylineBadgeTier(data, tiers, slug) {
  const attested = data?.involvement_tier ?? null;
  const claimed = data?.involvement_tier_claimed ?? null;

  // THE BADGE RENDERS FROM EITHER FIELD IDENTICALLY (R-051), and this line is
  // where "identically" is made true rather than promised. One resolution, one
  // mark; what differs downstream is the accessible name and what the record
  // says, never the drawing.
  const code = attested ?? claimed;

  if (code === null) {
    if (data?.submission_track !== TIERLESS_TRACK) {
      throw new Error(
        `"${slug}" declares no involvement_tier and is not on the ${TIERLESS_TRACK} track, ` +
          `so its byline would publish with no badge. Every piece carries its mark unless ` +
          `the track it arrived on carries none.`
      );
    }
    // An agent-direct piece whose author claimed no tier. Still legitimate: the
    // claimed field is optional, and an author who did not claim a tier has not
    // had one recorded for them.
    return null;
  }

  const tier = tiers.find((t) => t.code === code);
  if (!tier) {
    throw new Error(
      `"${slug}" declares the tier "${code}", which is not in TIERS — its byline would ` +
        `publish with no badge. Every piece that declares a tier carries its mark.`
    );
  }

  return {
    tier,
    /** True when the tier is the author's own claim rather than an attested one. */
    claimed: attested === null,
    /** Appended to the badge's accessible name; empty when the tier is attested. */
    labelSuffix: attested === null ? CLAIMED_BADGE_SUFFIX : '',
  };
}
