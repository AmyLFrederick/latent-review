// The as-submitted text of a condensed or arranged piece, and the pairing rule
// that keeps the promise honest.
//
// THE TERM, ruled by both editors 2026-08-01. The editors may CONDENSE (omit
// whole paragraphs) and ARRANGE (reorder them, choose which opens the piece).
// They may not change a word inside a paragraph they keep, and neither act may
// change what the piece claims. It is withhold-never-rewrite — the rule already
// governing a disclosed prompt — applied at the scale of a paragraph.
//
// WHY THE LINK IS THE LOAD-BEARING PART. Every clause above is a claim the
// journal makes about its own conduct, and a reader has no way to check any of
// it against a piece they never saw. Publishing the text as submitted turns the
// promise into something falsifiable: anyone can diff the two and see whether a
// word moved. A term like this without the full text beside it is an assurance;
// with it, it is a record.
//
// ABSENCE IS THE SIGNAL. An untouched piece carries no line and no link. A
// standing "not condensed" row on every other piece would train readers to skip
// the row on the one piece where it says something.

/** Where a piece's as-submitted text lives. One statement, so nothing composes it by hand. */
export function fullTextUrl(slug: string): string {
  return `/articles/${slug}/as-submitted/`;
}

type ArticleLike = { id: string; data: { condensed_and_arranged?: boolean } };
type FullTextLike = { id: string };

/**
 * Fails the build unless every flagged piece has an as-submitted text and every
 * as-submitted text has a flagged piece.
 *
 * BOTH DIRECTIONS, AND THE FIRST ONE IS WHY THIS EXISTS. The rule says the full
 * text is ALWAYS linked. If the flag alone drove the custody line, an editor who
 * condensed a piece and forgot the companion file would publish a condensed
 * piece with no link and no line — a broken promise that looks, on the page,
 * exactly like an untouched piece. Nobody would ever find it. So the flag is an
 * assertion the build checks rather than a value the build trusts.
 *
 * The reverse direction is the cheaper half: a stray as-submitted file with no
 * flag would sit at a public URL nothing links to, which is how a draft gets
 * published by accident.
 */
export function assertFullTextsPaired(
  articles: ArticleLike[],
  fullTexts: FullTextLike[]
): true {
  const withText = new Set(fullTexts.map((f) => f.id));
  const flagged = new Set(
    articles.filter((a) => a.data.condensed_and_arranged).map((a) => a.id)
  );

  const missing = [...flagged].filter((id) => !withText.has(id)).sort();
  const orphaned = [...withText].filter((id) => !flagged.has(id)).sort();

  if (missing.length) {
    throw new Error(
      `condensed_and_arranged is set on ${missing.join(', ')}, but no as-submitted text exists. ` +
        `Add src/content/submitted/<slug>.md with the text exactly as it arrived. ` +
        'The term the journal publishes is that the full text is ALWAYS linked; a piece ' +
        'condensed without one breaks that promise silently, because the page looks ' +
        'identical to an untouched piece.'
    );
  }

  if (orphaned.length) {
    throw new Error(
      `as-submitted texts exist for ${orphaned.join(', ')}, but those pieces are not marked ` +
        'condensed_and_arranged. Either set the flag or remove the file — an unlinked ' +
        'as-submitted text sits at a public URL nothing points to.'
    );
  }

  return true;
}
