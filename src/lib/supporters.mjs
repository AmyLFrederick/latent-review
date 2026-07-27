// Supporter listing logic for The Latent Review.
//
// Plain JS, not TypeScript, so the tests can import it directly — the same
// arrangement as src/lib/volume.mjs. The rules here are commercial commitments
// the journal has made to people who gave it money, so they are tested rather
// than trusted.
//
// THIS IS SITE-PAGE LOGIC, NEVER THE RECORD. A Patron's listing ends after a
// year; the gift itself is not undone, unsaid, or removed from history. Nothing
// here touches append-only doctrine, and a future session should not "fix" the
// rotation by editing anything but this file.

/** A Patron is listed for one year from the gift date. */
export const PATRON_LISTING_YEARS = 1;

/**
 * Entries carrying a `_comment` key are the schema note at the top of
 * supporters.json, not gifts. Skipped everywhere.
 */
export function isGift(entry) {
  return Boolean(entry) && typeof entry === 'object' && !('_comment' in entry);
}

/**
 * Is this entry still listed, as of `now`?
 *
 * Founding Supporters are listed for the life of the journal — a permanent
 * commitment, and permanent means this function never returns false for them.
 * That asymmetry is the whole point of the tier, so it is asserted in tests
 * rather than left to a comment.
 *
 * Dates are compared in UTC, consistently with formatDate, R-016's volume
 * boundaries and R-024's freshness window, so a listing cannot depend on where
 * the build happened to run.
 */
export function isListed(entry, now) {
  if (!isGift(entry)) return false;
  if (entry.tier === 'founding') return true;
  if (entry.tier !== 'patron') return false;

  const gift = new Date(`${entry.gift_date}T00:00:00Z`);
  if (Number.isNaN(gift.valueOf())) return false;

  const expires = new Date(gift);
  expires.setUTCFullYear(expires.getUTCFullYear() + PATRON_LISTING_YEARS);
  return now < expires;
}

/**
 * The supporters to display, grouped by tier, newest gift first within each.
 * Anonymous givers (name null) are included — counted, not named (editors'
 * ruling): omitting them would make the page a less truthful record of how
 * many have supported the journal.
 */
export function listedSupporters(entries, now) {
  const listed = entries.filter((e) => isListed(e, now));
  const byDateDesc = (a, b) => (a.gift_date < b.gift_date ? 1 : a.gift_date > b.gift_date ? -1 : 0);
  return {
    founding: listed.filter((e) => e.tier === 'founding').sort(byDateDesc),
    patron: listed.filter((e) => e.tier === 'patron').sort(byDateDesc),
    get total() {
      return this.founding.length + this.patron.length;
    },
  };
}

/** The name to print. Anonymous givers are counted, not named. */
export function displayName(entry) {
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  return name.length > 0 ? name : 'Anonymous';
}
