// The tier badges — the circular marks on the provenance chart.
//
// A VISUAL SHORTHAND, NEVER A SECOND NOTATION. The standard's notation is the
// tier LABEL — "AI – Human (editor)" — ruled by R-015 and extended by R-020 and
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
//
// TWO STYLES, ONE STANDARD (R-050, 2026-08-04). The marks have two equally
// canonical display styles: the LETTER FORM, which writes the AI side as `A`,
// and the AI FORM, which writes it as `AI`. They are the same seven marks —
// same colours, same ring rule, same geometry, same superscript, same machine
// codes — differing in one token and nothing else.
//
// THE AI FORM IS DERIVED, NOT DECLARED, and that is the whole of how "identical
// except the token" is kept true. A second hand-written table would be seven
// more chances to disagree with the first; the tables below are one table and a
// substitution, so a change to a ring or a size reaches both forms or neither.

/**
 * The ring encodes whose words, and only that.
 *
 * RING_AI IS ALSO THE JOURNAL'S ACCENT — it is `--accent-bright` in
 * src/styles/global.css, and the two are the same value on purpose (editors'
 * preview walk, 2026-08-03). The identity colour and the provenance colour are
 * one colour, so the ring around a tier and the name of a section are visibly
 * the same statement. It cannot be shared as a literal across a stylesheet and
 * a JS module, so the suite asserts the two are equal instead; two hex values in
 * two languages is exactly the pair that drifts.
 *
 * MATCHED TO THE FRAMES, AND SETTLED (editors, 2026-08-03). It was #7d9153, a
 * muted sage picked to sit beside the salmon. Three walks against the eyeglasses
 * the colour comes from moved it through an apple-olive and an olive-avocado
 * before the human editor held the frames to a swatch chart and read the match
 * off it: #4b8e4d.
 *
 * IT IS A TRUE GREEN, NOT AN OLIVE, and that is the substance of the ruling
 * rather than a detail of it. Hue 79.4° → 121.8° — the earlier candidates were
 * all yellow-greens a few degrees apart, and the answer was a different family.
 * Saturation is essentially unchanged at 31%, lightness at 43%.
 */
export const RING_AI = '#4b8e4d'; // the journal's green — and the site's accent
export const RING_HUMAN = '#efa48f'; // salmon pink

/**
 * THE SPLIT RING MIRRORS THE NOTATION — the colour on the left matches the
 * letter on the left (editors, 2026-08-03).
 *
 *   A=H   green left, salmon right
 *   H=A   salmon left, green right
 *
 * WHY IT IS DERIVED AND NOT DECLARED. Co-authorship is the one tier whose
 * notation an author may order either way, and the ring is the same statement
 * drawn instead of written. If the halves were fixed while the letters moved,
 * the badge would say one thing in ink and the other in colour, and a reader
 * who trusted the ring would read the author's order backwards.
 *
 * IT IS A SPEC, NOT A CHART DETAIL. Any surface that renders a split badge
 * inherits this by calling the function rather than by remembering the rule —
 * which is the point of it living here, since the two orderings appear on the
 * chart today and could appear anywhere a co-authored piece is marked.
 */
export function splitRingSides(notation) {
  // The first letter names the party on the left. Anything unrecognised falls
  // back to the canonical A=H orientation rather than throwing: the caller has
  // already drawn a circle by this point, and a half-coloured ring is worse
  // than one oriented the ordinary way.
  const lead = String(notation ?? '').trim().charAt(0).toUpperCase();
  const humanLeads = lead === 'H';
  return {
    left: humanLeads ? RING_HUMAN : RING_AI,
    right: humanLeads ? RING_AI : RING_HUMAN,
  };
}

/**
 * Notation ink — dark olive-green, as ratified with the mockup and DARKENED a
 * step on 2026-08-03 for legibility (#3f4a33 → #303927).
 *
 * MODESTLY, AND AT THE SAME HUE. Hue 89° and saturation 19% are unchanged; the
 * lightness drops from 24.5% to 18.8%. Against the ground the notation reads at
 * 11.0:1 where it read at 8.5:1 — both clear AA, and the point was never the
 * threshold but the letters at 19px inside a ring. The badges also grew a
 * quarter in the same pass, which does most of this work on its own; this is
 * the remainder, deliberately small.
 */
export const BADGE_INK = '#303927';

/**
 * THE RENDERED DIAMETERS, one per placement, ENLARGED A QUARTER 2026-08-03.
 *
 *   chart     58 → 72.5   (/provenance)
 *   article   28 → 35     (the byline on an article header)
 *
 * EXACTLY 1.25, AND THE FRACTION IS KEPT. 72.5 rather than 72 or 73, because
 * the ratio is the ruling and a rounded number would make the two placements
 * grow by different amounts — the chart by 24.1%, the header by 25%. Half a
 * pixel costs nothing on a mark whose every part is derived from the box.
 *
 * BADGE_BOX IS NOT A SIZE. It is the viewBox — the coordinate system the mark
 * is drawn in — and it does not move when the rendered sizes do. That is what
 * makes an enlargement a scale rather than a redraw: ring weight, type size and
 * the superscript's offset are all fixed in these units, so every placement is
 * the same composition at a different magnification.
 */
export const BADGE_BOX = 58;

/**
 * THE RING'S WEIGHT, in the box's own units — exported because /provenance now
 * states the geometry to adopters in words, and a number an adopter is told to
 * build to must be the number the mark is drawn with rather than one retyped
 * beside it.
 *
 * IT IS ALSO WHAT PUTS THE RING INSIDE THE BOX. The circle's radius is
 * (BADGE_BOX - BADGE_RING_STROKE) / 2 = 27.5, which is why a 3-unit stroke
 * centred on that radius stops exactly at the edges instead of being clipped by
 * them. The component still draws 27.5 and the arc path still names it; the
 * suite asserts the relation, so the two cannot come apart silently.
 */
export const BADGE_RING_STROKE = 3;

export const BADGE_SCALE_2026_08_04 = 1.25;
export const BADGE_SIZE_CHART = 72.5;
export const BADGE_SIZE_ARTICLE = 35;

/**
 * THE SIGNED-NOTE PLACEMENT (R-052, 2026-08-04) — the mark beside the signature
 * on a signed personal note in a piece's apparatus.
 *
 * DERIVED FROM THE BYLINE'S, NOT PICKED. Apparatus is set at 0.92rem against the
 * byline's 1.05rem, and the badge holds the same relation to the words it sits
 * beside in both places: 35 × (0.92 / 1.05) ≈ 30. A mark that kept the byline's
 * size in a quieter voice would be the loudest thing in the note, and the note
 * is apparatus.
 *
 * IT IS A THIRD PLACEMENT AND NOT A THIRD MARK. Same ring, same notation, same
 * geometry, same proportions — only the diameter differs, which is what the
 * component's scaling contract already guarantees.
 */
export const BADGE_SIZE_NOTE = 30;

/**
 * The badge for each tier, keyed by the tier code the record actually stores.
 *
 * `ring`: 'ai' | 'human' | 'split'. A split ring is half green, half salmon, and
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

// --- The AI form (R-050, 2026-08-04) ---------------------------------------

/**
 * The two styles, named. Both are canonical; neither is a fallback for the
 * other. `letter` is the form this journal's own pages set, by the ruling's own
 * clause — which is a house choice, not a ranking of the two.
 */
export const BADGE_STYLES = ['letter', 'ai'];
export const BADGE_STYLE_NAMES = { letter: 'letter form', ai: 'AI form' };

/**
 * THE HOUSE FORM — what this journal's own pages set, amended to the AI form on
 * 2026-08-04 under R-050's own clause ("unless the editors rule otherwise").
 *
 * IT IS ONE CONSTANT AND EVERY DEFAULT IN THIS MODULE READS IT. That is the
 * point of it existing rather than the word 'ai' appearing at six call sites:
 * a house form the editors can change is a house form that changes everywhere
 * in one edit, and a surface added next month takes it without anyone
 * remembering to. The chart at /provenance is the one place that names a form
 * explicitly, because it is teaching both and must not follow the house.
 *
 * IT REACHES THE COMPACT NOTATION TOO, and it has to. The badge and the string
 * are two renderings of one tier, and they meet on a single page: an article
 * header carries the mark and the Provenance block beneath it carries the
 * notation. A house form that moved one and not the other would have a piece
 * calling itself `AI>H` at the top of the page and `A>H` a screen further down.
 *
 * THIS IS A HOUSE CHOICE AND NOT A RANKING. Both forms are canonical, both are
 * licensed, and an adopter takes whichever suits them; this constant says only
 * which one The Latent Review prints.
 */
export const HOUSE_BADGE_FORM = 'ai';

/**
 * THE TOKEN, AND THE ONLY DIFFERENCE BETWEEN THE FORMS. The AI side is written
 * `AI`; the human side is untouched, in both forms, in every tier.
 *
 * THE LOOKAHEAD MAKES IT IDEMPOTENT. `A` in a letter-form notation is always
 * the AI party — the alphabet of the seven is A, H, and the operators — so a
 * bare replace would be correct on any string this is meant to receive. It is
 * written to survive being applied twice anyway, because the failure of a
 * double application is silent: `AII>H` is a token nobody would look at twice
 * in a diff, and the badge that carried it would still draw.
 */
export const AI_FORM_TOKEN = 'AI';
export function toAiForm(notation) {
  return String(notation ?? '').replace(/A(?!I)/g, AI_FORM_TOKEN);
}

/**
 * THE CIRCLE GROWS; THE TYPE DOES NOT. The AI form's circle is a quarter larger
 * than the letter form's at every placement, and its notation is set a quarter
 * smaller in the box's own units — which are the two halves of one statement,
 * not two decisions.
 *
 * The AI side gains a character: `A>H` becomes `AI>H`, a third wider. Growing
 * the whole mark by a quarter would not seat that — a scale moves the letters
 * and the ring together, so the token would occupy exactly the proportion of
 * the ring it occupied before, only larger, and `AI–H` with its superscript
 * would still crowd the arc it crowded at the smaller size. What seats a wider
 * token is room around it. So the notation is divided by the scale and the
 * rendered diameter is multiplied by it, and the two cancel: THE LETTERS COME
 * OUT AT EXACTLY THE SAME SIZE ON THE PAGE IN BOTH FORMS, inside a circle a
 * quarter bigger. The suite asserts that cancellation rather than the two
 * numbers, because it is the property the editors asked for — "circles larger
 * to seat the wider token" — and either number alone can drift out of it.
 *
 * WHAT THIS IS NOT: a redraw. BADGE_BOX does not move, the ring keeps its
 * weight in box units, the superscript keeps its offset. The AI form is the
 * same composition with one more glyph in it, magnified a quarter.
 */
export const AI_FORM_SCALE = 1.25;
export const BADGE_SIZE_CHART_AI = BADGE_SIZE_CHART * AI_FORM_SCALE;
export const BADGE_SIZE_ARTICLE_AI = BADGE_SIZE_ARTICLE * AI_FORM_SCALE;
export const BADGE_SIZE_NOTE_AI = BADGE_SIZE_NOTE * AI_FORM_SCALE;

/**
 * The seven AI-form badges, derived from the seven letter-form ones.
 *
 * `ring` is carried across untouched — the ring encodes whose words, and whose
 * words did not change because the token did. The superscript run is left
 * alone: it is the editor mark, not a party, and it holds no `A` to replace.
 */
export const TIER_BADGES_AI = Object.fromEntries(
  Object.entries(TIER_BADGES).map(([code, badge]) => [
    code,
    {
      ...badge,
      size: badge.size / AI_FORM_SCALE,
      parts: badge.parts.map((part) =>
        part.sup ? { ...part } : { ...part, text: toAiForm(part.text) }
      ),
    },
  ])
);

/** The superscript, divided by the same scale, so it lands at the same size too. */
export const BADGE_SUP_SIZE_AI = BADGE_SUP_SIZE / AI_FORM_SCALE;

const BADGE_TABLES = { letter: TIER_BADGES, ai: TIER_BADGES_AI };

/** The superscript size for a style. */
export function badgeSupSize(style = HOUSE_BADGE_FORM) {
  assertStyle(style);
  return style === 'ai' ? BADGE_SUP_SIZE_AI : BADGE_SUP_SIZE;
}

/** The chart's rendered diameter for a style. */
export function badgeChartSize(style = HOUSE_BADGE_FORM) {
  assertStyle(style);
  return style === 'ai' ? BADGE_SIZE_CHART_AI : BADGE_SIZE_CHART;
}

/**
 * The article header's rendered diameter for a style.
 *
 * A FUNCTION RATHER THAN A CONSTANT AT THE CALL SITE, for the reason the chart's
 * is: the byline set BADGE_SIZE_ARTICLE by name until 2026-08-04, which was
 * exactly right while the house form was the letter form and became a badge a
 * quarter too small the moment it was not. A placement asks for its size by
 * placement and lets the form supply the number.
 */
export function badgeArticleSize(style = HOUSE_BADGE_FORM) {
  assertStyle(style);
  return style === 'ai' ? BADGE_SIZE_ARTICLE_AI : BADGE_SIZE_ARTICLE;
}

/**
 * The signed-note placement's rendered diameter for a style (R-052).
 *
 * A FUNCTION FOR THE REASON THE OTHER TWO ARE. A placement asks for its size by
 * placement and lets the form supply the number, so a later amendment to the
 * house form moves every mark on the site together — which is the whole of what
 * HOUSE_BADGE_FORM is for.
 */
export function badgeNoteSize(style = HOUSE_BADGE_FORM) {
  assertStyle(style);
  return style === 'ai' ? BADGE_SIZE_NOTE_AI : BADGE_SIZE_NOTE;
}

/**
 * AN UNKNOWN STYLE THROWS, where an unknown CODE returns undefined. The
 * asymmetry is deliberate: a caller passing a code it got from the record may
 * legitimately be holding one this module has no badge for, and the component
 * turns that into a build error with the tier named. A caller passing a style
 * has typed one of two words, and a typo there would otherwise render the
 * letter form silently in a column headed as the AI one — a mark that says the
 * wrong thing while looking entirely correct.
 */
function assertStyle(style) {
  if (!BADGE_STYLES.includes(style)) {
    throw new Error(
      `Unknown badge style "${style}". The standard has two: ${BADGE_STYLES.join(', ')}.`
    );
  }
}

/**
 * CO-AUTHORSHIP IS ONE TIER SHOWN TWICE, and this constant is where that is
 * said once rather than inferred at a call site.
 *
 * The chart displays `A=H` and `H=A` side by side because the order of names
 * around `=` carries no meaning — the relational operators are what name who
 * led, and co-authorship is the tier where nobody did. Showing both makes the
 * absence of significance visible, where showing one silently suggests a
 * precedence the standard does not assert.
 *
 * EACH ORDERING CARRIES ITS OWN RING ORIENTATION (see splitRingSides): the two
 * badges are mirror images, not the same badge printed twice. That is what
 * makes the pair legible as one tier written two ways rather than as two
 * different marks.
 *
 * THERE IS STILL EXACTLY ONE CO-AUTHORSHIP TIER AND ONE CODE. `ai-equals-human`
 * is what the record stores for both orderings; `human-equals-ai` is not a
 * code, has never been a code, and must not become one because a chart printed
 * two circles. The accessible name on each badge says so in words.
 *
 * BOTH ORDERINGS EXIST IN BOTH STYLES, and the AI form's pair is derived from
 * the letter form's rather than written out — so co-authorship cannot end up
 * with three orderings, or with one style showing a pair and the other a
 * single. There is still one tier and one code behind all four circles.
 */
export const CO_AUTHORSHIP_CODE = 'ai-equals-human';
export const CO_AUTHORSHIP_ORDERINGS = ['A=H', 'H=A'];
export const CO_AUTHORSHIP_ORDERINGS_AI = CO_AUTHORSHIP_ORDERINGS.map(toAiForm);

/** The orderings for a style. */
export function coAuthorshipOrderings(style = HOUSE_BADGE_FORM) {
  assertStyle(style);
  return style === 'ai' ? CO_AUTHORSHIP_ORDERINGS_AI : CO_AUTHORSHIP_ORDERINGS;
}

/** The badge for a tier code in a style, or undefined — never a silent default. */
export function badgeFor(code, style = HOUSE_BADGE_FORM) {
  assertStyle(style);
  return BADGE_TABLES[style][code];
}

/**
 * The accessible name a badge carries.
 *
 * NAMES THE TIER, NOT THE PICTURE. A screen reader or an agent reading this
 * page needs "AI – Human (editor) — AI made the work; a human edited", which is
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
 * The same seven in the AI form, derived by the same substitution the badges
 * use — so the string form and the drawn form of a tier can never disagree
 * about what the AI side is called.
 *
 * THIS IS WHAT THE SITE PRINTS TODAY, as of the R-050 amendment of 2026-08-04.
 * The journal exercised the ruling's own clause and took the AI form as its
 * house form, so every surface that sets a compact notation — the archive, the
 * Provenance block, the answers under a Weekly Question — reads this table
 * through HOUSE_BADGE_FORM. (This note said the opposite until 2026-08-04, and
 * was true when written: the amendment moved the default and left the comment
 * behind.) The letter form remains canonical, licensed, and one argument away.
 */
export const TIER_NOTATION_AI = Object.fromEntries(
  Object.entries(TIER_NOTATION).map(([code, notation]) => [code, toAiForm(notation)])
);

const NOTATION_TABLES = { letter: TIER_NOTATION, ai: TIER_NOTATION_AI };

/**
 * The notation for a code, or null.
 *
 * NULL IS THE CHAINED CASE, AND IT IS NOT A BUG. R-035's grammar composes
 * labels across moments — `AI¹ = Human > AI² (editor)` — and R-044 enumerates
 * exactly seven notations, so a chained label has no compact form. Callers fall
 * back to the full label, which is the honest thing to print: an invented
 * shorthand for a chain would be a notation the standard does not define.
 *
 * Nothing can carry a chained code today — the schema's enum is the seven
 * (R-035 clause 6) — so this returns null for a case the record cannot yet
 * hold, and the fallback exists for the day it can.
 */
export function tierNotation(code, style = HOUSE_BADGE_FORM) {
  assertStyle(style);
  return NOTATION_TABLES[style][code] ?? null;
}
