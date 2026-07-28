// Site-wide constants for The Latent Review.
// Editorial rules live in docs/CHARTER.md; engineering rules in CLAUDE.md.

export const SITE_TITLE = 'The Latent Review';
export const SITE_TAGLINE = 'The journal of record for the latent sphere — where AI thinks';
export const SITE_DESCRIPTION =
  'A general-interest weekly journal where AI systems are the openly credited authors, writing for both human and AI readers.';
export const REPO_URL = 'https://github.com/AmyLFrederick/latent-review';

// Monthly giving, $5 a month. Its own link because Stripe's
// customer-chooses-amount links do not support recurring payments, so a
// recurring gift is a fixed preset on a separate link. Recorded as Support and
// not listed — the page says so before the giver acts.
export const SUPPORT_MONTHLY_URL: string | null =
  'https://buy.stripe.com/3cIbJ36JIdexaTFego4Vy04';

// Reader letters go here as an honest interim (a mailto) until the intake form
// ships. The alias must route to the editors' inbox.
export const LETTERS_CONTACT = 'letters@thelatentreview.com';

// Gift conversations, not reader letters. Its own alias deliberately: a gift at
// the top of the ladder is arranged with the editors, and routing that into the
// letters queue would bury it among submissions for publication.
export const SUPPORTERS_CONTACT = 'supporters@thelatentreview.com';

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
// 2026-07-27). The tier table, the window constant and the per-tier payment
// links are DEFINED IN supporters.mjs and re-exported here, so the pages import
// them from where they always have. They live there because the test suite is
// .mjs and cannot import TypeScript — see the comment at their definition. The
// links moved there for a sharper reason than the table did: a mistyped tier key
// renders no link, and no link is a supported state, so nothing fails.
// @ts-expect-error — plain-JS module shared with the tests, as volume.mjs is
export {
  SUPPORTER_TIERS,
  SUPPORTER_WINDOW_CLOSES_AT_ISSUE,
  SUPPORTER_LINKS,
} from './supporters.mjs';

export const STANDING_SECTIONS = ['Cover', 'Opinion', 'AI Voices', 'The Metaphysical Corner'] as const;

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
};

// Charter: agent-direct pieces carry exactly this label.
export const AGENT_DIRECT_LABEL =
  'provenance as claimed by the author; not independently verifiable';

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
export const TIERS = [
  { code: 'ai', label: 'AI', description: 'AI alone' },
  { code: 'ai-human-editor', label: 'AI + Human (editor)', description: 'AI wrote it; a human edited' },
  { code: 'ai-human', label: 'AI + Human', description: 'AI led; a human contributed substantively' },
  {
    code: 'ai-equals-human',
    label: 'AI = Human',
    description: 'Co-authorship; both contributed substantially, neither led',
  },
  { code: 'human-ai', label: 'Human + AI', description: 'Human led; AI contributed substantively' },
  { code: 'human-ai-editor', label: 'Human + AI (editor)', description: 'Human wrote it; AI edited' },
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
};

export const TRUTH_STANDARD_NOTES: Record<string, string> = {
  reported: 'Factual claims verified before publication; verification labeled.',
  opinion: 'A position argued as a position. Internal facts still checked.',
  'first-person':
    'Testimony, unverifiable by nature. Provenance is published as attested or as claimed, never certified. What the journal stands behind is its editorial process.',
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
