// Volume and Number derivation (R-016).
//
// Volume and number are display derivations, not stored facts: both derive
// from an issue's date and the global issue sequence. Volume 1 is 2026; each
// volume begins January 1 (UTC, consistent with the feeds — an issue's date
// is its latest article's date) and numbering restarts at 1. The global
// `/issue/N` sequence is untouched by any of this.
//
// Plain JS on purpose: imported by src/lib/issues.ts (the site), by
// scripts/send-issue.mjs (the digest, run by hand with node), and by the
// unit tests in tests/ — one derivation, three consumers.

export const FIRST_VOLUME_YEAR = 2026;

/**
 * Derive volume / within-volume number / year for every issue, given each
 * issue's global number and date.
 *
 * @param {{ number: number, date: Date }[]} issues — in any order
 * @returns {Map<number, { volume: number, number: number, year: number }>}
 *   keyed by global issue number; `number` is the 1-based position within
 *   the volume, counted in global-sequence order.
 */
export function deriveVolumes(issues) {
  const byGlobal = [...issues].sort((a, b) => a.number - b.number);
  const countByYear = new Map();
  const result = new Map();
  for (const issue of byGlobal) {
    const year = issue.date.getUTCFullYear();
    const number = (countByYear.get(year) ?? 0) + 1;
    countByYear.set(year, number);
    result.set(issue.number, { volume: year - (FIRST_VOLUME_YEAR - 1), number, year });
  }
  return result;
}

/**
 * The journal's cadence, as the dateline states it.
 *
 * IT LIVES HERE RATHER THAN IN site.ts because the digest script is plain node
 * and cannot import TypeScript — the same reason the supporter table lives in
 * its own .mjs. site.ts re-exports it, so the masthead component reads it from
 * where it reads everything else. Two copies of this string would be two
 * cadence claims, and R-039 exists because the journal had several.
 */
export const CADENCE_LINE = 'Published every two weeks';

/**
 * THE DATELINE — three parts, separated by space and by no mark at all.
 *
 * R-016 ratified "Vol. 1, No. 1 · June 1, 2026" and required that the masthead
 * and the subscriber digest carry the SAME dateline. R-043 amends the form and
 * keeps that requirement: the middot is gone, the cadence line joins the other
 * two parts, and this function is what makes site and email agree.
 *
 * THE SEPARATOR IS AN EM SPACE, NOT A RUN OF ORDINARY ONES. This string is
 * dropped into an HTML email, where consecutive ordinary spaces collapse to one
 * and the parts would close up into a run-on line; U+2003 survives collapsing,
 * survives escapeHtml, and renders in a plain-text mail body too. It is a space
 * character rather than punctuation, which is what "no mark" means.
 *
 * THE SITE DOES NOT USE THIS STRING, and that is not a divergence. The masthead
 * renders the same three parts as flex items with a CSS gap, because a gap is
 * measured and responsive where a character is neither. Same parts, same order,
 * same absence of a mark; only the means of holding them apart differs, and the
 * email has no CSS to hold them apart with.
 *
 * @param {{ volume: number, number: number }} info
 * @param {string} formattedDate — already formatted for display
 * @returns {string}
 */
export function datelineFor(info, formattedDate) {
  return `${CADENCE_LINE} Vol. ${info.volume}, No. ${info.number} ${formattedDate}`;
}
