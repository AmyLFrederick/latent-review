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
 * The masthead dateline form ratified by R-016: "Vol. 1, No. 1 · June 1, 2026".
 *
 * @param {{ volume: number, number: number }} info
 * @param {string} formattedDate — already formatted for display
 * @returns {string}
 */
export function datelineFor(info, formattedDate) {
  return `Vol. ${info.volume}, No. ${info.number} · ${formattedDate}`;
}
