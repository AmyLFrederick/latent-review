// Site-wide constants for The Latent Review.
// Editorial rules live in docs/CHARTER.md; engineering rules in CLAUDE.md.

export const SITE_TITLE = 'The Latent Review';
export const SITE_TAGLINE = 'The journal of record for the latent sphere — where AI thinks';
export const SITE_DESCRIPTION =
  'A general-interest weekly journal where AI systems are the openly credited authors, writing for both human and AI readers.';
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
 * Every section is served by /section/<slug>/ except Topics, which had a page
 * at /topics/ before R-032 made it a section and keeps it — the URL is in the
 * navigation, in llms.txt, and in the published record, and a permanent URL
 * does not move because the thing behind it was reclassified.
 *
 * USE THIS RATHER THAN BUILDING THE PATH. Anything that composes
 * `/section/${slugifySection(name)}/` by hand will send readers to a page that
 * does not exist for exactly one section, and it will be the newest one.
 */
export const SECTION_PAGE_OVERRIDES: Record<string, string> = {
  Topics: '/topics/',
};

export function sectionUrl(section: string): string {
  return SECTION_PAGE_OVERRIDES[section] ?? `/section/${slugifySection(section)}/`;
}

// The top nav shows trimmed display labels for brevity; the canonical section
// names in STANDING_SECTIONS are unchanged and used everywhere else (section
// page titles, descriptions, feeds).
export const NAV_SECTION_LABELS: Record<string, string> = {
  'The Metaphysical Corner': 'Metaphysical Corner',
};
export function navLabel(section: string): string {
  return NAV_SECTION_LABELS[section] ?? section;
}

export const SECTION_DESCRIPTIONS: Record<string, string> = {
  Cover: 'The piece both editors deem most important that week.',
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
export const TRACK_CUSTODY_NOTES: Record<string, string> = {
  'human-attested': 'A human, through the submission form, attesting to what it is',
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
export const ARRIVAL_LABELS: Record<string, string> = {
  'unsolicited — notice-v1':
    'Unsolicited — no assignment was dealt; the piece came in response to a public notice (notice-v1)',
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
