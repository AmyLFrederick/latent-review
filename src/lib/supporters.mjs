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
// ASCENDING ORDER — CHEAPEST FIRST, FOUNDING SUPPORTER LAST — AND THE TABLE'S
// ORDER IS THE DISPLAY ORDER BY DESIGN. The invitation list on /supporters
// renders straight from this array, so a reader meets the tiers at the rung
// most of them will actually use and climbs from there. Adding a tier one day
// is an edit to this table and to nothing else; putting one in the wrong place
// here puts it in the wrong place on the page.
//
// THE ROLL OF NAMES RUNS THE OTHER WAY, HIGHEST FIRST, DELIBERATELY. See
// listedSupporters() below: a list of people who have given is conventionally
// led by the largest gifts, and that convention is not the same question as
// which rung an undecided reader should meet first. The two orders are opposite
// on purpose. If they are ever made to agree, that should be a decision someone
// takes, not a side effect of editing this line.
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
    // Relabelled from "Support" to "Supporter": every other rung names a
    // person, not an act, and a row reading "Support — gifts of $2 or more"
    // named the act. THE KEY STAYS 'support' — it is what supporters.json
    // records and what every guard checks, and a label is not an identifier.
    key: 'support',
    label: 'Supporter',
    plural: 'Supporters',
    threshold: '$2',
    listing: 'none',
  },
  {
    key: 'friend',
    label: 'Friend of the Review',
    plural: 'Friends of the Review',
    threshold: '$250',
    listing: 'none',
  },
  {
    key: 'sustainer',
    label: 'Sustainer',
    plural: 'Sustainers',
    threshold: '$1,000',
    listing: 1,
  },
  {
    key: 'patron',
    label: 'Patron',
    plural: 'Patrons',
    threshold: '$5,000',
    listing: 3,
  },
  {
    key: 'benefactor',
    label: 'Benefactor',
    plural: 'Benefactors',
    threshold: '$20,000',
    listing: 10,
  },
  {
    key: 'founding',
    label: 'Founding Supporter',
    plural: 'Founding Supporters',
    threshold: '$50,000',
    listing: 'permanent',
    closes_at_issue: SUPPORTER_WINDOW_CLOSES_AT_ISSUE,
  },
];

/** Tier keys, for the guard that every recorded gift carries a real one. */
export const SUPPORTER_TIER_KEYS = SUPPORTER_TIERS.map((t) => t.key);

// ONE PAYMENT LINK PER TIER, BECAUSE /supporters IS THE LEVEL-SELECTION SCREEN.
// A Stripe payment link is single-purpose and cannot present a ladder, so the
// page that lists the tiers is the page where a giver chooses one, and each
// tier row carries its own way to give: a reader who has decided they are a
// Patron should not have to work out which link that is.
//
// Sustainer and Patron collect the listing name; Support and Friend do not,
// because neither is listed and a name field with nothing to list is a
// question asked for no reason.
//
// THIS MAP LIVES HERE, BESIDE THE TIER TABLE, RATHER THAN IN site.ts, AND FOR A
// SHARPER REASON THAN THE TABLE DID. A tier with no link renders no link, and
// no link is a SUPPORTED STATE — so a mistyped key ("patrons") does not throw,
// does not warn, and does not fail a build. It renders a Patron row with no way
// to give at it, which is indistinguishable from the ruled behaviour for the
// two tiers that genuinely have none. The only person who would discover it is
// someone who wanted to give $5,000 and found no door. Absence must be
// distinguishable from error, which is the same principle as the tier-key guard
// on recorded gifts, and the suite is .mjs and cannot import TypeScript — so a
// map in site.ts is a map the tests cannot check. site.ts re-exports it.
//
// BENEFACTOR AND FOUNDING SUPPORTER ARE null FOR ONE REASON: a $20,000 minimum
// cannot exist under Stripe's $10,000 maximum on customer-chooses links. The
// human editor has asked Stripe to raise the cap. WHEN IT IS RAISED, ADDING
// THEM IS FILLING IN THESE TWO VALUES AND UPDATING THE TEST THAT NAMES THEM —
// not restructuring the page. The page renders a link for any tier that has one
// and none for any tier that does not, and the sentence pointing at supporters@
// stands either way.
//
// The Support link is on donate.stripe.com and that is CORRECT, not a leftover:
// its call to action was changed from "Donate" to "Pay" on 2026-07-28 and the
// URL did not move — verified against the live checkout, which renders a Pay
// button on this host. The host follows the LINK TYPE, not the call to action.
// A future session should not "correct" it to buy.stripe.com; that URL is not
// this link. (Editors' decision on the link itself, dual-yes 2026-07-19,
// amended by the human editor the same day: the giver chooses the amount, no
// suggested amount is displayed, $2 minimum — a fee floor, set in Stripe.)
//
// Ascending, matching SUPPORTER_TIERS. Key order here has no effect on
// anything rendered — the page looks these up by tier key — but a map that
// reads in a different order from the table it mirrors is a map someone will
// eventually misread.
export const SUPPORTER_LINKS = {
  support: 'https://donate.stripe.com/9B614p7NMfmFd1N2xG4Vy00',
  friend: 'https://buy.stripe.com/8x214p8RQ4I1gdZ4FO4Vy01',
  sustainer: 'https://buy.stripe.com/00wcN76JI3DXe5R7S04Vy02',
  patron: 'https://buy.stripe.com/7sYdRbgkidexaTFc8g4Vy03',
  benefactor: null,
  founding: null,
};

// Monthly giving, $5 a month. Its own link because Stripe's customer-chooses
// links do not support recurring payments, so a recurring gift is a fixed
// preset on a separate link. Recorded as Support and not listed — the page says
// so before the giver acts.
//
// It sits here rather than in site.ts for the same reason the map does, and it
// is NOT exempt for not being a tier: /supporters renders this link
// conditionally, so an empty or misnamed value does not break the page. It
// removes monthly giving from it, silently, and a page with no monthly link
// looks exactly like a page that never offered one. The suite asserts it is a
// real https URL.
export const SUPPORT_MONTHLY_URL = 'https://buy.stripe.com/3cIbJ36JIdexaTFego4Vy04';

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

/**
 * The listing clause for a tier, rendered from its `listing` value.
 *
 * AN UNLISTED TIER RETURNS THE EMPTY STRING, AND THE ROW THEN SAYS NOTHING
 * ABOUT LISTING. It used to return "not listed", which the row printed after
 * the threshold. Ruled by the editors: the rows for the two unlisted rungs end
 * at what they take, because the paragraph directly beneath them states the
 * threshold once for the whole ladder — "gifts of $1,000 or more will be listed
 * on this page". A row saying "not listed" and a paragraph saying which gifts
 * are listed are two statements of one fact that can drift apart.
 *
 * The empty string is a rendered value, not a missing one: /supporters tests it
 * and omits the clause and its comma. A future session should not read it as a
 * bug and restore "not listed" — check the paragraph between the Friend and
 * Sustainer rows first.
 *
 * "from the date of the gift" is likewise dropped from the year durations, by
 * the same ruling: the rows state the length, not the clock it runs on.
 */
export function listingSentence(tier) {
  if (tier.listing === 'permanent') return 'listed for the life of the journal';
  if (tier.listing === 'none') return '';

  const word = YEAR_WORDS[tier.listing];
  if (!word) {
    throw new Error(
      `No number word for a ${tier.listing}-year listing (tier "${tier.key}"). ` +
        'Add it to YEAR_WORDS in src/lib/supporters.mjs.'
    );
  }
  return `listed for ${word} year${tier.listing === 1 ? '' : 's'}`;
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
 * The supporters to display: one group per listed tier, HIGHEST FIRST, newest
 * gift first within each. Groups with nobody in them are dropped, so the page
 * renders only sections that have names.
 *
 * THE ROLL RUNS OPPOSITE TO THE INVITATION LIST, AND THAT IS DELIBERATE. The
 * tier table is ascending — cheapest first — because an undecided reader should
 * meet the rung most people use before the rung almost nobody does. A roll of
 * names is a different act: it records what was given, and a list of givers is
 * conventionally led by the largest gifts. The reverse below is the whole of
 * that decision, so it is stated once, here, rather than assumed.
 *
 * If the editors ever rule that the two should agree, delete the reverse — do
 * not reorder the table, which would drag the invitation list with it.
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
  const groups = [...SUPPORTER_TIERS]
    .reverse()
    .filter((t) => t.listing !== 'none')
    .map((tier) => ({ tier, entries: listed.filter((e) => e.tier === tier.key).sort(byDateDesc) }))
    .filter((g) => g.entries.length > 0);
  return { groups, total: listed.length };
}

/** The name to print. Anonymous givers are counted, not named. */
export function displayName(entry) {
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  return name.length > 0 ? name : 'Anonymous';
}
