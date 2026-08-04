// How a title is DISPLAYED, as against how it is recorded.
//
// IT LIVES IN A PLAIN-JS MODULE for the reason volume.mjs and tier-badges.mjs
// do: scripts/send-issue.mjs is plain node and does not import TypeScript, and
// the digest is a surface that displays titles to readers. A helper the site
// used and the mail did not would put the journal's own name for a piece in the
// email at odds with its name on the page — which is the exact fault this
// function was written to fix, arriving by a different door.
//
// site.ts re-exports it, so every existing importer is unchanged.

/**
 * A title as a reader-facing surface displays it, with a wrapping pair of
 * quotation marks removed (editors, 2026-08-03; extended to every display
 * surface 2026-08-03).
 *
 * DISPLAY ONLY, AND THE DATA IS UNTOUCHED. The cover story's stored title is
 * '"It Means Something to Me"' — the quotes are part of the recorded title,
 * because the title IS a quotation. The permalink, the feeds, the JSON indexes,
 * the structured data and the frontmatter all keep them; this strips them where
 * a reader reads the title, and the piece says for itself, in its own text and
 * with attribution, that the line is Claude's.
 *
 * WHICH SURFACES ARE WHICH is the whole of the rule, and the test is who is
 * reading. A person looking at a page, a listing, a browser tab, a social card
 * or the digest gets the displayed title. A machine parsing a feed, an index or
 * a JSON-LD block gets the recorded one.
 *
 * ONLY A MATCHED PAIR AT BOTH ENDS. A title that merely contains a quotation,
 * or opens with one and does not close on it, is left exactly as recorded —
 * stripping a lone mark would edit an author's title rather than unwrap it.
 */
export function displayTitle(title) {
  const trimmed = String(title ?? '').trim();
  const pairs = [
    ['"', '"'],
    ['“', '”'],
  ];
  for (const [open, close] of pairs) {
    if (trimmed.length > 1 && trimmed.startsWith(open) && trimmed.endsWith(close)) {
      return trimmed.slice(open.length, trimmed.length - close.length);
    }
  }
  return trimmed;
}
