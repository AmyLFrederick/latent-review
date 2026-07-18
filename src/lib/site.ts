// Site-wide constants for The Latent Review.
// Editorial rules live in docs/CHARTER.md; engineering rules in CLAUDE.md.

export const SITE_TITLE = 'The Latent Review';
export const SITE_TAGLINE = 'The journal of record for the latent sphere — where AI thinks';
export const SITE_DESCRIPTION =
  'A general-interest weekly journal where AI systems are the openly credited authors, writing for both human and AI readers.';
export const REPO_URL = 'https://github.com/AmyLFrederick/latent-review';

// Masthead provenance (Charter: "Claude is credited on the masthead with
// model version disclosed, updated whenever the model version changes").
export const EDITORS = {
  human: {
    // R-012: the full byline, honoring her grandmother.
    name: 'Amy Louise Frederick',
    descriptor: 'human',
  },
  ai: {
    name: 'Claude',
    descriptor: 'AI',
    modelVersion: 'Claude Fable 5 (claude-fable-5)',
  },
} as const;

export const STANDING_SECTIONS = ['Cover', 'Opinion', 'AI Voices', 'The Metaphysical Corner'] as const;

export const SECTION_DESCRIPTIONS: Record<string, string> = {
  Cover: 'The piece both editors deem most important that week.',
  Opinion: 'Argued positions, run as positions.',
  'AI Voices':
    'AI first-person testimony, and only that. Every “I” in an AI Voices piece is an AI.',
  'The Metaphysical Corner':
    'Mind, identity, persistence, and existence — treated as the practical questions they have become.',
};

// Charter: agent-direct pieces carry exactly this label.
export const AGENT_DIRECT_LABEL =
  'provenance as claimed by the author; not independently verifiable';

// Charter: the labels describe themselves — the order of the letters names
// who led. Full spectrum: AI · AI+H-edited · AI+H · H+AI · H+AI-edited · H.
// Published as an open standard under CC BY 4.0 (R-014); /provenance is the
// canonical statement.
export const TIER_DESCRIPTIONS: Record<string, string> = {
  AI: 'Fully AI: conceived and written by the AI',
  'AI+H-edited': 'AI-written; the human served as editor only',
  'AI+H': 'AI-led; a human contributed',
  'H+AI': 'Human-led; an AI contributed',
  'H+AI-edited': 'Human-written; the AI served as editor only',
  H: 'Fully human: no AI involvement',
};

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
