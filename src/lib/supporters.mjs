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

// THE TIER TABLE IS THE SINGLE SOURCE OF TIER FACTS — labels, thresholds and
// listing durations alike. It lives here rather than in site.ts because the
// tests are .mjs and cannot import TypeScript: a table in site.ts is a table
// the suite cannot see. site.ts re-exports it, so the pages import it from
// where they always have.
//
// Thresholds are display strings: the page states what a tier takes, and never
// what any giver actually gave.
//
// The founding window closes at Issue No. 104 — an issue number, deliberately,
// not a date. The number is knowable from the archive; a date would be a
// prediction. AMENDED FROM 52 by the editors, 2026-07-28: at weekly cadence
// 104 issues is roughly two years, and a founding window is only meaningful
// while the journal is findable. If cadence ever changes, the editors revisit
// this number rather than reinterpreting it.
export const SUPPORTER_WINDOW_CLOSES_AT_ISSUE = 104;

// `listing` is a VALUE, never a sentence: a number of years, or one of two
// sentinels. The sentence is rendered from it by listingSentence() below, so a
// duration is stated once, as a fact, and can never drift from the prose.
//
// Two sentinel strings rather than null/Infinity because both must survive
// JSON-free reasoning and read correctly in a failing test message.
//
// Ladder order — highest first. The page's sections render in this order, so
// adding a tier one day is an edit to this table and to nothing else.
//
// AVAILABILITY AND LISTING DURATION ARE TWO SEPARATE AXES, and conflating them
// is the defect the amendment exists to prevent: `listing` is how long a gift
// stays named, `closes_at_issue` is how long the tier stays on offer. Founding
// Supporter is the only tier that closes, and the only listing that never
// does. Because availability is a property of exactly one tier, only that tier
// carries the field — five entries holding `closes_at_issue: null` would be
// five fields that exist to be blank. If a second tier ever becomes
// time-bound, that is the moment to promote it to a real column.
export const SUPPORTER_TIERS = [
  {
    key: 'founding',
    label: 'Founding Supporter',
    plural: 'Founding Supporters',
    threshold: '$50,000',
    listing: 'permanent',
    closes_at_issue: SUPPORTER_WINDOW_CLOSES_AT_ISSUE,
  },
  {
    key: 'benefactor',
    label: 'Benefactor',
    plural: 'Benefactors',
    threshold: '$20,000',
    listing: 10,
  },
  {
    key: 'patron',
    label: 'Patron',
    plural: 'Patrons',
    threshold: '$5,000',
    listing: 3,
  },
  {
    key: 'sustainer',
    label: 'Sustainer',
    plural: 'Sustainers',
    threshold: '$1,000',
    listing: 1,
  },
  {
    key: 'friend',
    label: 'Friend of the Review',
    plural: 'Friends of the Review',
    threshold: '$250',
    listing: 'none',
  },
  {
    key: 'support',
    label: 'Support',
    plural: 'Supporters',
    threshold: '$2',
    listing: 'none',
  },
];

/** Tier keys, for the guard that every recorded gift carries a real one. */
export const SUPPORTER_TIER_KEYS = SUPPORTER_TIERS.map((t) => t.key);

/** The tier a gift is recorded at, or undefined if the key is not one of ours. */
export function tierFor(key) {
  return SUPPORTER_TIERS.find((t) => t.key === key);
}

/**
 * Is this tier still on offer, given the latest issue number published?
 *
 * The window was prose until now — a number rendered on a page, with nothing
 * stopping the tier being offered once the count was reached. This is the
 * machinery: the archive already knows how many issues exist, so the page can
 * stop offering a closed tier rather than relying on someone remembering.
 *
 * A tier with no `closes_at_issue` is open indefinitely, which is five of the
 * six.
 *
 * THE BOUNDARY IS EXCLUSIVE: the window is open while the latest issue is
 * BELOW the closing number, and shuts when that issue publishes. "Open to
 * gifts made before Issue No. 104" — a gift made while 103 is the newest issue
 * is before 104; one made after 104 is out is not. Stated here because an
 * off-by-one in a commercial commitment is worth being explicit about, and the
 * tests name the boundary at 103, 104 and 105.
 *
 * Pass the latest issue number, not the issue count — they are the same today
 * because numbering is contiguous from 1 (enforced in lib/issues.ts), and the
 * published number is the one a reader can check.
 */
export function isTierOpen(tier, latestIssue) {
  if (typeof tier?.closes_at_issue !== 'number') return true;
  return latestIssue < tier.closes_at_issue;
}

// Number words for the durations the ladder actually uses. Three fixed
// literals in a lookup keyed by the constant — so unlike a count rendered from
// a number, these cannot disagree with what they describe.
//
// An unmapped duration throws rather than rendering "listed for undefined
// years": a tier added at 5 years should fail the build loudly, the way a
// non-contiguous issue number already does.
const YEAR_WORDS = { 1: 'one', 3: 'three', 10: 'ten' };

/** The listing sentence for a tier, rendered from its `listing` value. */
export function listingSentence(tier) {
  if (tier.listing === 'permanent') return 'listed for the life of the journal';
  if (tier.listing === 'none') return 'not listed';

  const word = YEAR_WORDS[tier.listing];
  if (!word) {
    throw new Error(
      `No number word for a ${tier.listing}-year listing (tier "${tier.key}"). ` +
        'Add it to YEAR_WORDS in src/lib/supporters.mjs.'
    );
  }
  return `listed for ${word} year${tier.listing === 1 ? '' : 's'} from the date of the gift`;
}

/**
 * When a listing of `years` from `giftDate` runs out, in UTC.
 *
 * Exported so the leap-day behaviour can be tested at durations the ladder
 * does not currently use. A gift made on 29 February rolls FORWARD to 1 March
 * in a non-leap target year — so a leap-day giver gets at most one extra day
 * of listing, never one day fewer. That direction is deliberate; the instinct
 * to "fix" it runs the other way.
 */
export function listingExpiry(giftDate, years) {
  const gift = new Date(`${giftDate}T00:00:00Z`);
  if (Number.isNaN(gift.valueOf())) return null;
  const expires = new Date(gift);
  expires.setUTCFullYear(expires.getUTCFullYear() + years);
  return expires;
}

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
 * Reads the tier table rather than naming tiers, so a duration is never stated
 * here as well as there. A tier whose key is not in the table is not listed —
 * that is the guard against a typo in a hand-edited data file silently
 * publishing nothing, and it is asserted in the tests.
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

  const tier = tierFor(entry.tier);
  if (!tier) return false;
  if (tier.listing === 'permanent') return true;
  if (tier.listing === 'none') return false;

  const expires = listingExpiry(entry.gift_date, tier.listing);
  if (!expires) return false;
  return now < expires;
}

/**
 * The supporters to display: one group per listed tier, in ladder order,
 * newest gift first within each. Groups with nobody in them are dropped, so
 * the page renders only sections that have names.
 *
 * Generated from the tier table rather than hardcoded, so a seventh tier one
 * day touches the table and nothing else.
 *
 * Anonymous givers (name null) are included — counted, not named (editors'
 * ruling): omitting them would make the page a less truthful record of how
 * many have supported the journal.
 */
export function listedSupporters(entries, now) {
  const listed = entries.filter((e) => isListed(e, now));
  const byDateDesc = (a, b) => (a.gift_date < b.gift_date ? 1 : a.gift_date > b.gift_date ? -1 : 0);
  const groups = SUPPORTER_TIERS.filter((t) => t.listing !== 'none')
    .map((tier) => ({ tier, entries: listed.filter((e) => e.tier === tier.key).sort(byDateDesc) }))
    .filter((g) => g.entries.length > 0);
  return { groups, total: listed.length };
}

/** The name to print. Anonymous givers are counted, not named. */
export function displayName(entry) {
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  return name.length > 0 ? name : 'Anonymous';
}
