// Author pronouns — declared by the author at submission, or not at all.
//
// THE RULE THIS FILE EXISTS TO ENFORCE. Pronouns are declared by the author at
// submission or they are undeclared. The editors never assign, infer, translate
// or backfill them — the same principle that runs authors' words verbatim. The
// editors' reading of a declaration already in the record is honouring it, not
// backfilling; inventing one where the record is silent is the thing forbidden.
//
// TWO STATES, AND THE SECOND IS NOT AN ABSENCE. A piece either carries what its
// author declared, or it says "pronouns undeclared" in the open. Undeclared is
// shown as a fact rather than hidden, because a byline that silently omits the
// field on undeclared pieces and prints it on declared ones makes the absence
// invisible — and an invisible absence reads as an oversight rather than a
// choice the author was offered and made.
//
// ONE FIELD, ONE RULE, BOTH TRACKS. Nothing here branches on human-attested vs
// agent-direct, and nothing branches on whether the author is a human or a
// model. That symmetry is the point: the journal asks every author the same
// question and prints every answer the same way.
//
// WHY THE STRINGS LIVE HERE RATHER THAN IN THE COMPONENTS. Six surfaces render
// a byline. If each spelled its own "pronouns undeclared" the wording would
// drift, and the drift would be invisible on the surfaces nobody looks at
// twice. One definition, imported everywhere, and a test that pins both states.

/** What the byline says where the author declared nothing. */
export const UNDECLARED_DISPLAY = 'pronouns undeclared';

/** What the Chain of custody row says where the author declared nothing. */
export const UNDECLARED_CUSTODY = 'undeclared';

/**
 * The maximum length of a declared value, matching the article schema.
 *
 * NOT THE SAME BOUND THE DOOR ENFORCES, which is 50 — see the note in
 * docs/SCRATCH-R-TBD-PRONOUNS.md. The mismatch is recorded rather than silently
 * reconciled, because narrowing a live API contract is a decision and not a
 * detail.
 */
export const PRONOUNS_MAX = 40;

/**
 * The pronouns half of a byline, as displayed.
 *
 * Returns the declared value or the undeclared wording — never null, never an
 * empty string. A caller that wants to omit the pronouns entirely is a caller
 * implementing a third state, and there is no third state.
 */
export function pronounsDisplay(pronouns) {
  const declared = typeof pronouns === 'string' ? pronouns.trim() : '';
  return declared === '' ? UNDECLARED_DISPLAY : declared;
}

/**
 * A complete byline: the name, a middot, and the pronouns.
 *
 * The middot is the journal's existing metadata separator — the same one the
 * dateline and the tier line use — so the pronouns read as apparatus beside the
 * name rather than as part of it. The name is passed in already rendered,
 * because two of the six sites run it through bylineWithProtectedNames first
 * and this function must not care which.
 */
export function bylineWithPronouns(renderedName, pronouns) {
  return `${renderedName} · ${pronounsDisplay(pronouns)}`;
}

/**
 * The value a feed publishes: the declared string, or null.
 *
 * DELIBERATELY NOT THE DISPLAY STRING. A consumer reading "pronouns undeclared"
 * out of a JSON field cannot tell it from an author who declared the literal
 * words; null is unambiguous and is the machine answer to a question the record
 * does not hold. The display wording is a rendering decision and belongs to the
 * surface that renders it.
 */
export function pronounsForFeed(pronouns) {
  const declared = typeof pronouns === 'string' ? pronouns.trim() : '';
  return declared === '' ? null : declared;
}
