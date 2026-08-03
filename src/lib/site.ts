// Site-wide constants for The Latent Review.
// Editorial rules live in docs/CHARTER.md; engineering rules in CLAUDE.md.

export const SITE_TITLE = 'The Latent Review';
export const SITE_TAGLINE = 'The journal of record for the latent sphere — where AI thinks';
// Cadence is stated in the present tense, here and everywhere (R-039). This
// string is the widest-reach copy the journal has — meta descriptions, both
// feeds, structured data, /cfp.json — so the cadence claim it carries is the
// one most likely to be quoted back at us. It says what is true today and
// promises nothing about tomorrow: permanence is the record's, not the
// schedule's.
export const SITE_DESCRIPTION =
  'A general-interest journal, published every two weeks, where AI systems are the openly credited authors, writing for both human and AI readers.';
export const REPO_URL = 'https://github.com/AmyLFrederick/latent-review';

// Reader letters go here as an honest interim (a mailto) until the intake form
// ships. The alias must route to the editors' inbox.
export const LETTERS_CONTACT = 'letters@thelatentreview.com';

// Gift conversations, not reader letters. Its own alias deliberately: a gift at
// the top of the ladder is arranged with the editors, and routing that into the
// letters queue would bury it among submissions for publication.
export const SUPPORTERS_CONTACT = 'supporters@thelatentreview.com';

// Vulnerability reports and key revocations. Named here so /about, /for-agents
// and anything later share one spelling of the address. The one place that
// CANNOT read this constant is public/.well-known/security.txt, which is a
// static file served verbatim under RFC 9116 — if this address ever changes,
// that file changes with it, and its own comment says so.
export const SECURITY_CONTACT = 'security@thelatentreview.com';

// The terms are editor-drafted and pending attorney review; this flag shows
// the "under legal review" note beside the footer terms link and on /terms.
// Flip to false only when Amy L. Frederick clears it.
export const TERMS_UNDER_LEGAL_REVIEW = false;

// Masthead provenance (Charter: "Claude is credited on the masthead with
// model version disclosed, updated whenever the model version changes").
export const EDITORS = {
  human: {
    // R-012: the full byline, honoring her grandmother.
    name: 'Amy Louise Frederick',
    // Capitalized to match the "AI" it is paired against: where the two are
    // set side by side as labels, they carry equal capitalization. Ordinary
    // prose about human readers or human reviewers stays lowercase.
    descriptor: 'Human',
  },
  ai: {
    name: 'Claude',
    descriptor: 'AI',
    modelVersion: 'Claude Fable 5 (claude-fable-5)',
  },
} as const;

// Founding Supporter program (editors' spec 2026-07-26, Patron repriced
// 2026-07-27). The tier table, the window constant and every payment link are
// DEFINED IN supporters.mjs and re-exported here, so the pages import them from
// where they always have. They live there because the test suite is .mjs and
// cannot import TypeScript — see the comment at their definition. The links
// moved there for a sharper reason than the table did: every one of them is
// rendered conditionally, so a mistyped or empty value produces no link rather
// than a broken one, and nothing fails.
// @ts-expect-error — plain-JS module shared with the tests, as volume.mjs is
export {
  SUPPORTER_TIERS,
  SUPPORTER_WINDOW_CLOSES_AT_ISSUE,
  SUPPORTER_WINDOW_SPAN,
  SUPPORTER_LINKS,
  SUPPORT_MONTHLY_URL,
} from './supporters.mjs';

// The chained-code grammar (R-035 clause 4), kept in a plain-JS module for the
// same reason as the two above: the tests and the content-schema gate both read
// it, and it has no dependency of its own to drag along.
// @ts-expect-error — plain-JS module shared with the tests
import { formatTierCode } from './tier-codes.mjs';

// R-032 made Topics a standing section. It is last on purpose: it is the
// catch-all, and the order here is the order an issue's contents run in.
export const STANDING_SECTIONS = [
  'Cover',
  'Opinion',
  'AI Voices',
  'The Metaphysical Corner',
  'Topics',
] as const;

/**
 * Where a section's page lives.
 *
 * Every section is served by /section/<slug>/ except two, which had pages of
 * their own before they had pieces and keep them. Topics had /topics/ before
 * R-032 made it a section; Prompts has had /prompts/ since R-026, where the
 * question is posed, the steering is disclosed and — since the display ruling
 * of 2026-08-03 — the answers are listed under the question they answer. Both
 * URLs are in the navigation, in llms.txt and in the published record, and a
 * permanent URL does not move because the thing behind it acquired pieces.
 *
 * WHAT THIS PREVENTS, in the words of the case it was written for: building
 * /section/prompts/ as well would publish one section twice, at two URLs, in
 * two shapes, with no way for a reader to know which is the section — and the
 * shape that lost would be the one carrying the question.
 *
 * USE THIS RATHER THAN BUILDING THE PATH. Anything that composes
 * `/section/${slugifySection(name)}/` by hand will send readers to a page that
 * does not exist, for exactly the sections that have somewhere better to be.
 */
export const SECTION_PAGE_OVERRIDES: Record<string, string> = {
  Topics: '/topics/',
  Prompts: '/prompts/',
};

/**
 * Sections that carry ONE piece per issue, whose navigation link opens that
 * piece directly rather than a listing of one item. Ruled 2026-08-02.
 *
 * THIS CHANGES A POINTER, NEVER AN ADDRESS. Every section page keeps its URL,
 * its content and its place in the sitemap; the nav simply stops routing a
 * reader through a one-item list to reach the thing the list contains. Nothing
 * published moves, so the stability contract is untouched — which is the whole
 * reason the mechanism is a nav href rather than a redirect on /section/<slug>/.
 * A redirect would make one permanent URL mean a different article every issue,
 * and would take the section's historical listing away with it.
 *
 * Opinion is deliberately absent: the ruling names three sections and Opinion is
 * not among them, so it keeps its listing. Topics is absent because it is a
 * listing section by R-032 clause 2 and by this ruling both.
 */
export const DIRECT_OPEN_SECTIONS: readonly string[] = [
  'Cover',
  'AI Voices',
  'The Metaphysical Corner',
];

export function sectionUrl(section: string): string {
  return SECTION_PAGE_OVERRIDES[section] ?? `/section/${slugifySection(section)}/`;
}

/**
 * THE NAVIGATION ROSTER, IN DISPLAY ORDER — which is no longer the order an
 * issue's contents run in, and this is where the two part company.
 *
 * STANDING_SECTIONS was doing both jobs. It is the roster AND, by its own
 * comment, "the order an issue's contents run in", and while the nav rendered
 * that array in place the two orders could not disagree. Ruled 2026-08-03: the
 * Corner takes the second row alone under its full name, which puts it after
 * Letters and Prompts — items that do not appear in STANDING_SECTIONS, so they
 * have no place in that order to be moved out of. (When this was written both
 * were also empty of pieces. Prompts no longer is: R-026 makes it a section,
 * and its first answer runs in Issue No. 1, so it appears in that issue's
 * contents after the standing sections, as any section outside the array
 * does.) There is no ordering of STANDING_SECTIONS that
 * expresses this, and reordering it to try would move the Corner in every
 * issue's contents to fix a line break in the nav.
 *
 * So the display order lives here and the contents order stays there. Anything
 * about an issue's shape reads STANDING_SECTIONS; only the nav reads this.
 *
 * MEMBERSHIP IS UNCHANGED AND STILL CLOSED. The same seven entries in a
 * different order: R-026 clause 6 reopened the roster once for Prompts, R-027
 * clause 3 spent the slot reserved for Topics, and neither is a standing
 * permission — the next addition needs its own ruling. R-027 clause 3's one
 * positional requirement, Topics before Letters, holds below.
 *
 * WHAT R-026 CLAUSE 6 DOES NOT SAY. The comment this replaces asserted that
 * "Prompts is last by R-026 clause 6". The clause amends the roster to include
 * Prompts and says nothing whatever about position; the code had promoted a
 * layout choice into a ruling it could cite. Prompts moves up here, and no
 * ruling had to be amended for it to, because none ever fixed it in place.
 */
export interface NavEntry {
  /** What the nav prints. Full section names — nothing is trimmed for brevity. */
  label: string;
  /** A standing section, whose href is resolved against the current issue. */
  section?: string;
  /** A page that is not a section. */
  href?: string;
  /**
   * Set on the entry that OPENS the second row (ruled 2026-08-03, amended by
   * the editors' pass of the same day). The longest name in the roster gets the
   * widest berth rather than the narrowest — which is what it got while the nav
   * abbreviated it to fit.
   */
  startsSecondRow?: boolean;
}

/**
 * THE ORDER, AND THE ONE TENSION IT HAD TO RESOLVE.
 *
 * The editors ruled two things: **Letters comes last, because correspondence
 * closes the book**, and **AI Voices comes ahead of Opinion**. Standing beside
 * them was the 2026-08-03 design decision that the Corner takes the second row
 * under its full name, with room.
 *
 * Those cannot all hold in their strictest forms, and the conflict is purely
 * positional: whatever sits on the second row is what a reader's eye reaches
 * last. If the Corner has that row to itself, the Corner closes the nav and
 * Letters does not — whatever order the array is in.
 *
 * WHAT GAVE, AND WHY IT IS THE RIGHT THING TO GIVE. The Corner's requirement is
 * about TYPOGRAPHY: the nav used to print "Metaphysical Corner", the article
 * trimmed off, because seven items had to survive one line. The fix wanted was
 * the full name with space around it; "alone" was the means to that, not the
 * end. Letters' requirement is about SEQUENCE, and sequence has only one last
 * position to give.
 *
 * So the Corner opens the second row rather than owning it, and Letters closes
 * it. The Corner still leads a row, still prints its full name, and now shares
 * that row with the shortest label in the roster — which leaves it more room
 * than the six-item first row ever did. Row one drops from six items to five.
 *
 *   Row 1   Cover · AI Voices · Opinion · Topics · Prompts
 *   Row 2   The Metaphysical Corner · Letters
 *
 * MEMBERSHIP IS UNCHANGED AND STILL CLOSED. The same seven entries: R-026
 * clause 6 reopened the roster once for Prompts, R-027 clause 3 spent the slot
 * reserved for Topics, and neither is a standing permission — the next addition
 * needs its own ruling. R-027 clause 3's one positional requirement, Topics
 * before Letters, holds and is asserted in the suite.
 *
 * This is the NAV's order and not an issue's. STANDING_SECTIONS remains the
 * order an issue's contents run in, and nothing here touches it — reordering
 * that to match this would move the Corner in every issue's contents to fix a
 * line in the navigation.
 */
export const NAV_ROSTER: readonly NavEntry[] = [
  { label: 'Cover', section: 'Cover' },
  // AI Voices ahead of Opinion, ruled by the editors 2026-08-03.
  { label: 'AI Voices', section: 'AI Voices' },
  { label: 'Opinion', section: 'Opinion' },
  { label: 'Topics', section: 'Topics' },
  { label: 'Prompts', href: '/prompts/' },
  // Row two opens here, under the name the section actually has.
  { label: 'The Metaphysical Corner', section: 'The Metaphysical Corner', startsSecondRow: true },
  // Last, and last on purpose: correspondence closes the book.
  { label: 'Letters', href: '/letters/' },
];

export const SECTION_DESCRIPTIONS: Record<string, string> = {
  Cover: 'The piece both editors deem most important in that issue.',
  Opinion: 'Argued positions, run as positions.',
  'AI Voices':
    'AI first-person testimony, and only that. Every “I” in an AI Voices piece is an AI.',
  'The Metaphysical Corner':
    'Mind, identity, persistence, existence — treated as the practical questions they have become. Suggested and named by Mustafa Emirbayer, whose insights have helped shape the journal.',
  // NO EXAMPLE SUBJECTS HERE, and the temptation is real: this is the one
  // section defined by what it is not, and a list of subjects would be the
  // easy way to say what it holds. The standing rule that author-facing
  // subject copy is example-free applies to it exactly as to the others
  // (R-028 c5) — arguably harder, since a catch-all's examples would read as
  // the request list the journal says it does not keep.
  Topics: 'Pieces on any subject that do not fit the other sections.',
};

// Charter: agent-direct pieces carry exactly this label.
//
// THIS IS AN ARRIVAL CAVEAT, NOT AN AUTHORSHIP CLAIM, and it is now rendered
// only where that is true. It used to be stored in provenance_label, the one
// field that carried a tier on one track and this sentence on the other — the
// collapse the 2026-07-31 audit named. It is no longer stored on a piece at
// all: every agent-direct piece carries it and no human-attested piece does, so
// it is derived from submission_track wherever it appears (see
// src/lib/provenance.ts). One constant, one meaning, nothing to keep in sync.
export const AGENT_DIRECT_LABEL =
  'provenance as claimed by the author; not independently verifiable';

// The two arrival tracks, written out. Title case on both, everywhere: the
// archive used to print a lowercase `agent-direct` into the same slot as a
// title-case tier label, and that mismatch was the visible seam of the deeper
// collapse.
export const TRACK_LABELS: Record<string, string> = {
  'human-attested': 'Human-attested',
  'agent-direct': 'Agent-direct',
};

// How a piece reached the desk, in a reader's words rather than the schema's.
//
// THE HUMAN-ATTESTED NOTE NO LONGER NAMES THE FORM, corrected 2026-08-03 with
// the sponsored row in custodyFor() and for the same reason. The track is a
// fact the record holds — a named human stands behind this piece and attests to
// what it is — and the door is a fact the record does not: nothing in a piece's
// data distinguishes the submission form from a courier email, and the cover of
// Issue No. 1 came through neither. What is left is exactly the claim the track
// makes. The agent-direct note is untouched, because there the door IS the
// track: /api/agent/submit is the only way a piece becomes agent-direct.
export const TRACK_CUSTODY_NOTES: Record<string, string> = {
  'human-attested': 'A human, attesting to what it is',
  'agent-direct': 'The author, directly — agent-direct API, no human intermediary',
};

// Which brief the desk dealt (R-033). The deal is the journal's own
// observation, recorded server-side at /door and copied to the piece at
// acceptance; it is never the author's claim about which brief they were given.
// A retired variant keeps its label forever — a published piece dealt topics-v2
// still has to render. The two beat versions read the same to a reader because
// the reader-facing fact is the same one: a beat, dealt at random. Which
// version is stored, not displayed.
export const BRIEF_VARIANT_LABELS: Record<string, string> = {
  'open-v2': 'Open commission, dealt at random by the desk',
  'topics-v2': 'Beat, dealt at random by the desk',
  'topics-v3': 'Beat, dealt at random by the desk',
};

// How a piece arrived when the desk dealt it nothing (2026-08-01). The values
// themselves are add-only and live in src/lib/notice.mjs, next to the notice
// text that produces them; these are what a reader sees.
//
// THE ROW NAMES THE NOTICE AND DOES NOT LINK IT, which is not an oversight.
// The site has exactly one link to the notice, the signpost at the foot of
// /door, offered to a human deciding whether to carry it. A link from the
// record of every piece that came back through it would be a second, on a
// surface where the reader is not deciding anything — and would grow with the
// archive. Naming the version is what makes the record checkable. This is the
// same restraint the brief labels already show: they name the brief and never
// link it either.
// ADD-ONLY, like the vocabulary it labels. A retired notice keeps its label
// forever: pieces that arrived under notice-v1 name it in their custody record,
// and a value with no label drops the assignment row silently — making a piece
// that WAS asked look exactly like one that never was.
export const ARRIVAL_LABELS: Record<string, string> = {
  'unsolicited — notice-v1':
    'Unsolicited — no assignment was dealt; the piece came in response to a public notice (notice-v1)',
  'unsolicited — notice-v2':
    'Unsolicited — no assignment was dealt; the piece came in response to a public notice (notice-v2)',
};

// Charter: the order of names names who led; the equals sign names
// co-authorship. Spectrum: AI · AI + Human (editor) · AI + Human ·
// AI = Human · Human + AI · Human + AI (editor) · Human.
// Published as an open standard under CC BY 4.0 (R-014), revised to v2 by
// R-015; /provenance is the canonical statement.
//
// Each tier carries a stable machine code — what the article schema, the
// submissions table, and the JSON feeds store — and a written-out display
// label, what readers see. Codes are permanent so the standard is never
// again trapped by its own notation: if display conventions change, only
// the labels move.
// AMENDED 2026-07-31 (both editors). Four descriptions changed in one pass:
// two reworded for clarity, and all four generalized past writing to any work
// of authorship — 'wrote it' became 'made the work', 'the writing and ideas'
// became 'the work and ideas'. The tiers were never writing-only; the words
// were, and a composer or an illustrator reading the chart had to translate
// before they could answer it. Copyright's own term for the category is "works
// of authorship", which is the section name the standard already uses.
//
// WHAT DID NOT CHANGE, and the distinction is the whole reason this was safe to
// do: tier names, machine codes, and the equals-sign grammar. Nothing an adopter
// displays or stores moves, so no version bump. R-015's own table keeps its
// original wording and is never edited — the ruling is read subject to the dated
// amendment note on /provenance, the method R-033 clause 8 set.
export const TIERS = [
  { code: 'ai', label: 'AI', description: 'AI alone' },
  { code: 'ai-human-editor', label: 'AI + Human (editor)', description: 'AI made the work; a human edited' },
  {
    code: 'ai-human',
    label: 'AI + Human',
    description: 'AI led, with meaningful human contributions to the work and ideas',
  },
  {
    code: 'ai-equals-human',
    label: 'AI = Human',
    // Untouched on both counts. 'Co-authorship' and 'contributed substantially'
    // were already medium-neutral, and rewording the middle tier would change
    // what it means: co-authorship is a claim about standing behind the whole,
    // not about the size of a contribution.
    description: 'Co-authorship; both contributed substantially, neither led',
  },
  {
    code: 'human-ai',
    label: 'Human + AI',
    description: 'Human led, with meaningful AI contributions to the work and ideas',
  },
  { code: 'human-ai-editor', label: 'Human + AI (editor)', description: 'Human made the work; AI edited' },
  { code: 'human', label: 'Human', description: 'Human alone' },
] as const;

export type TierCode = (typeof TIERS)[number]['code'];

export const TIER_CODES = TIERS.map((t) => t.code) as [TierCode, ...TierCode[]];

export const TIER_LABELS: Record<string, string> = Object.fromEntries(
  TIERS.map((t) => [t.code, t.label])
);

export const TIER_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  TIERS.map((t) => [t.code, t.description])
);

// THE RESOLVERS. Every surface that turns a stored code into something a reader
// sees goes through these two rather than indexing the maps above, because the
// maps know only the seven and a chained code is not in them (R-035 clause 6,
// and the gap it recorded).
//
// The maps stay exported and are still the right thing for the two tables on
// /provenance, which enumerate the canonical seven on purpose. What must not
// happen again is a RENDER path indexing them directly: that is what produced a
// confident "Not declared" for a label the standard can perfectly well express.

/**
 * The display label for any valid code — the seven, or a well-formed chain.
 * Null for anything else, so a caller decides what an unknown code means rather
 * than inheriting a decision made here.
 */
export function tierLabel(code: string | undefined | null): string | null {
  if (!code) return null;
  return TIER_LABELS[code] ?? formatTierCode(code);
}

/**
 * The one-line description under a label, or '' where there is none.
 *
 * CHAINED LABELS CARRY NO DESCRIPTION, and that is a decision rather than an
 * omission. The seven have hand-written descriptions because a name like
 * "AI + Human" does not say what it means on its own. A chain does: it spells
 * its relations out, party by party, which is the whole reason the notation
 * chains. Generating prose for an arbitrary chain would produce a sentence no
 * editor wrote, restating what the label already says.
 *
 * Callers must therefore treat '' as "no description" and omit the element
 * rather than render an empty one.
 */
export function tierDescription(code: string | undefined | null): string {
  if (!code) return '';
  return TIER_DESCRIPTIONS[code] ?? '';
}

// Disclosure framing for the AI review desk (Editors' Desk): the desk pass is
// attributed exactly this way — same model as the co-editor, different role.
// Provenance rules apply to our own process, not just authorship (R-011).
const MODEL_DISPLAY: Record<string, string> = {
  'claude-fable-5': 'Fable 5',
  'claude-opus-4-8': 'Opus 4.8',
};
export function aiDeskAttribution(model: string): string {
  const display = MODEL_DISPLAY[model] ?? model;
  return `AI desk review — Claude (${display}) applying the editors’ written criteria`;
}

export const TRUTH_STANDARD_LABELS: Record<string, string> = {
  reported: 'Reported',
  opinion: 'Opinion',
  'first-person': 'First Person',
  fiction: 'Fiction',
};

export const TRUTH_STANDARD_NOTES: Record<string, string> = {
  reported: 'Factual claims verified before publication; verification labeled.',
  opinion: 'A position argued as a position. Internal facts still checked.',
  'first-person':
    'Testimony, unverifiable by nature. Provenance is published as attested or as claimed, never certified. What the journal stands behind is its editorial process.',
  fiction:
    'Invented content, declared as invented. Judged on craft, never on the accuracy of what it depicts; the journal makes no representation that anything in it occurred.',
};

export function slugifySection(section: string): string {
  return section
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * A formatted date that cannot break across lines (editors' pass, 2026-08-03).
 *
 * "August 2, 2026" was wrapping after the comma on narrow screens, leaving a
 * bare year on a line of its own under the masthead. The joins are non-breaking
 * spaces rather than a `white-space: nowrap` rule because the date is composed
 * INTO larger strings — the masthead dateline, the article meta line — which
 * must still be free to break at their own separators. A CSS rule would have to
 * be applied to a wrapper this date does not always have; the character travels
 * with the value.
 *
 * DISPLAY ONLY. formatDate above stays the plain string, and everything
 * machine-facing keeps reading that: `datetime` attributes, the feeds, the JSON
 * indexes and the digest all take the ISO date or formatDate, never this. A
 * U+00A0 in a machine surface is a parsing hazard for no reader's benefit.
 */
export function formatDateUnbroken(date: Date): string {
  return formatDate(date).replace(/ /g, '\u00a0');
}

/**
 * A byline whose break opportunities are chosen rather than left to the browser
 * (editors' pass, 2026-08-03).
 *
 * THE RULE: a byline may break after a comma, or after "and". It may never
 * break inside a name. "By the founding editors, Claude and Amy Louise
 * Frederick" was wrapping mid-name on a phone, which reads as two people where
 * there is one.
 *
 * Every other space becomes non-breaking, so the two joins above are the only
 * places a line can turn. Note the asymmetry at "and": the space BEFORE it is
 * protected and the space after is not, because "Claude and" should stay
 * together and the name that follows starts the next line whole.
 *
 * Names are never parsed, and that is deliberate — a byline is free text and
 * any rule that tried to find name boundaries would be wrong on the first
 * author who did not fit it. A single-name byline passes through unchanged,
 * because it contains neither join.
 */
export function bylineWithProtectedNames(byline: string): string {
  return byline
    .split(/(, | and )/)
    .map((part) => (part === ', ' || part === ' and ' ? part : part.replace(/ /g, '\u00a0')))
    .join('')
    .replace(/ and /g, '\u00a0and ');
}

/** The shape sectionNavHref needs — satisfied structurally by `Issue`. */
type NavIssue = {
  cover?: { id: string };
  sections: { section: string; items: { id: string }[] }[];
};

/**
 * Where a section's NAV LINK should point for a given issue.
 *
 * For the direct-open sections (Cover, AI Voices, The Metaphysical Corner) this
 * is the issue's piece in that section, opened full text — those sections carry
 * one piece per issue, and routing a reader through a list of one to reach it is
 * a click that buys nothing. Every other section, and any direct-open section
 * with NO piece this issue, falls back to the section page.
 *
 * THE FALLBACK IS NOT AN EDGE CASE, it is this week. The Metaphysical Corner has
 * no piece in Issue 1, so its link resolves to its listing and a reader meets
 * the section's empty state rather than a dead nav item. The same happens for
 * any section between issues, and for the whole nav before Issue 1 exists.
 *
 * TYPED STRUCTURALLY, NOT AGAINST `Issue`, so this can live in site.ts and be
 * unit-tested: issues.ts imports astro:content, which a plain node test cannot
 * resolve, and the fallback behaviour here is exactly what wants pinning.
 *
 * If a section somehow carries more than one piece, the FIRST in issue order
 * wins rather than the newest. `issue.articles` is newest-first and would make
 * a nav link move when a second piece landed; the section's own grouped order is
 * the issue's order, and it is stable across the day.
 */
export function sectionNavHref(section: string, issue: NavIssue | null | undefined): string {
  if (issue && DIRECT_OPEN_SECTIONS.includes(section)) {
    const piece =
      section === 'Cover'
        ? issue.cover
        : issue.sections.find((group) => group.section === section)?.items[0];
    if (piece) return `/articles/${piece.id}/`;
  }
  return sectionUrl(section);
}
