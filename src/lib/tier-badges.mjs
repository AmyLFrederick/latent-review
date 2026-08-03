// The tier badges — the circular marks on the provenance chart.
//
// A VISUAL SHORTHAND, NEVER A SECOND NOTATION. The standard's notation is the
// tier LABEL — "AI + Human (editor)" — ruled by R-015 and extended by R-020 and
// R-035; the machine code is what surfaces store. What is below is a third
// thing: initials and glyphs sized to fit inside a 58px circle. It says the
// same seven things in a form that reads at a glance, and it is authoritative
// for nothing. A piece is never labelled "A>H" anywhere in the record.
//
// This is why every badge carries its tier's real label and description as an
// accessible name: the badge is the abbreviation, and the abbreviation must
// always be able to say what it abbreviates.
//
// IT LIVES IN A PLAIN-JS MODULE for the reason the tier table does — the suite
// is .mjs and cannot import TypeScript, and a badge whose ring colour or
// notation drifted from the tier it marks is exactly the failure worth testing
// for.

/** The ring encodes whose words, and only that. */
export const RING_AI = '#7d9153'; // sage green
export const RING_HUMAN = '#efa48f'; // salmon pink

/** Notation ink — dark olive-green, as ratified with the mockup. */
export const BADGE_INK = '#3f4a33';

/**
 * The badge for each tier, keyed by the tier code the record actually stores.
 *
 * `ring`: 'ai' | 'human' | 'split'. A split ring is half sage, half salmon, and
 * belongs to co-authorship alone — where neither party led, so neither colour
 * may take the whole circle.
 *
 * `parts`: the notation, as an ordered list of runs so the renderer can size
 * them independently. `sup: true` marks the editor superscript.
 *
 * `size`: the notation's type size in px. The solo tiers get the largest,
 * because one letter in a circle can afford it; every relational badge — the
 * led forms AND the edited forms — is set at ONE size, deliberately. The edited
 * variants carry more glyphs and the temptation is to shrink them, which would
 * rank them below the led forms in a chart whose whole claim is that the tiers
 * are a spectrum and not a hierarchy.
 */
export const TIER_BADGES = {
  ai: { ring: 'ai', size: 23, parts: [{ text: 'A' }] },
  'ai-human-editor': {
    ring: 'ai',
    size: 19,
    parts: [{ text: 'A–H' }, { text: 'e', sup: true }],
  },
  'ai-human': { ring: 'ai', size: 19, parts: [{ text: 'A>H' }] },
  'ai-equals-human': { ring: 'split', size: 19, parts: [{ text: 'A=H' }] },
  'human-ai': { ring: 'human', size: 19, parts: [{ text: 'H>A' }] },
  'human-ai-editor': {
    ring: 'human',
    size: 19,
    parts: [{ text: 'H–A' }, { text: 'e', sup: true }],
  },
  human: { ring: 'human', size: 23, parts: [{ text: 'H' }] },
};

/** The superscript's size. Proportionally large, and never below a legibility floor. */
export const BADGE_SUP_SIZE = 13;

/**
 * CO-AUTHORSHIP IS ONE TIER SHOWN TWICE, and this constant is where that is
 * said once rather than inferred at a call site.
 *
 * The chart displays `A=H` and `H=A` side by side because the order of names
 * around `=` carries no meaning — `+` is the relation whose order names who
 * led, and co-authorship is the tier where nobody did. Showing both makes the
 * absence of significance visible, where showing one silently suggests a
 * precedence the standard does not assert.
 *
 * THERE IS STILL EXACTLY ONE CO-AUTHORSHIP TIER AND ONE CODE. `ai-equals-human`
 * is what the record stores for both orderings; `human-equals-ai` is not a
 * code, has never been a code, and must not become one because a chart printed
 * two circles. The accessible name on each badge says so in words.
 */
export const CO_AUTHORSHIP_CODE = 'ai-equals-human';
export const CO_AUTHORSHIP_ORDERINGS = ['A=H', 'H=A'];

/** The badge for a tier code, or undefined — never a silent default. */
export function badgeFor(code) {
  return TIER_BADGES[code];
}

/**
 * The accessible name a badge carries.
 *
 * NAMES THE TIER, NOT THE PICTURE. A screen reader or an agent reading this
 * page needs "AI + Human (editor) — AI made the work; a human edited", which is
 * the record's own language; "circle with A dash H" describes the ink and tells
 * a reader nothing. The notation is included last, so a reader who has met the
 * glyph elsewhere can connect the two.
 */
export function badgeLabel(tier, notation) {
  return `${tier.label} — ${tier.description}. Shown as ${notation}.`;
}

/**
 * THE COMPACT DISPLAY NOTATION (R-044) — what a tier looks like in a label
 * position now, everywhere tiers render to readers.
 *
 * DISPLAY ONLY, AND THE DISTINCTION IS THE RULING'S. The machine code is what
 * the record stores and what every feed field carries; those did not move. This
 * is the reader-facing form, and a surface that stored it would be storing an
 * abbreviation of the thing it means to store.
 *
 * THE SUPERSCRIPT IS A CHARACTER HERE, not markup, because this string also
 * reaches surfaces with no HTML — the digest, JSON, a plain-text mail body.
 * U+1D49 is a letter rather than a numeral, so it does not hit the failure
 * R-035 clause 3 records for U+00B2, which some screen readers voice as
 * "squared"; and every badge spells the superscript out in its accessible name
 * regardless, so nothing depends on how a reader's software pronounces it.
 */
export const TIER_NOTATION = {
  ai: 'A',
  'ai-human-editor': 'A–Hᵉ',
  'ai-human': 'A>H',
  'ai-equals-human': 'A=H',
  'human-ai': 'H>A',
  'human-ai-editor': 'H–Aᵉ',
  human: 'H',
};

/**
 * The notation for a code, or null.
 *
 * NULL IS THE CHAINED CASE, AND IT IS NOT A BUG. R-035's grammar composes
 * labels across moments — `AI¹ = Human + AI² (editor)` — and R-044 enumerates
 * exactly seven notations, so a chained label has no compact form. Callers fall
 * back to the full label, which is the honest thing to print: an invented
 * shorthand for a chain would be a notation the standard does not define.
 *
 * Nothing can carry a chained code today — the schema's enum is the seven
 * (R-035 clause 6) — so this returns null for a case the record cannot yet
 * hold, and the fallback exists for the day it can.
 */
export function tierNotation(code) {
  return TIER_NOTATION[code] ?? null;
}
