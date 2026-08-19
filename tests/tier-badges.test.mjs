// The tier badges (editors' spec, 2026-08-03). What these tests protect:
//
//   1. Every tier has a badge, and no badge names a tier that does not exist.
//   2. The ring encodes whose words — and encodes it symmetrically, because the
//      chart's claim is that the spectrum is a mirror.
//   3. Co-authorship stays ONE tier with ONE code, however many circles the
//      chart prints for it.
//   4. The edited variants are never set smaller than the relational ones.
//   5. The badge's internal composition is PINNED — nothing an ancestor
//      stylesheet declares can move the notation inside its ring.
//
// Extended 2026-08-04 for R-050, which gave the marks a second display style.
// What the second half additionally protects:
//
//   6. The AI form differs from the letter form in ONE TOKEN and nothing else —
//      same rings, same shapes, same order rule, same closed set of seven.
//      Everything asserted of the letter form above is asserted of it too.
//   7. The circle grows a quarter and the type does not, which is what "larger
//      to seat the wider token" means and is asserted as the cancellation.
//   8. Two styles are two spellings of seven badges, never fourteen badges —
//      one set of machine codes underneath, R-045 still closed.
//   9. This journal's own pages follow ONE house form — the AI form since the
//      2026-08-04 amendment — and the chart at /provenance does not, because it
//      teaches both. The surfaces follow the constant rather than naming a form.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  TIER_BADGES,
  badgeFor,
  badgeLabel,
  CO_AUTHORSHIP_CODE,
  CO_AUTHORSHIP_ORDERINGS,
  RING_AI,
  RING_HUMAN,
  BADGE_SUP_SIZE,
  BADGE_INK,
  BADGE_BOX,
  BADGE_RING_STROKE,
  HOUSE_BADGE_FORM,
  badgeArticleSize,
  BADGE_SCALE_2026_08_04,
  BADGE_SIZE_CHART,
  BADGE_SIZE_ARTICLE,
  TIER_NOTATION,
  tierNotation,
  splitRingSides,
  // R-050 — the AI form
  TIER_BADGES_AI,
  TIER_NOTATION_AI,
  BADGE_STYLES,
  BADGE_STYLE_NAMES,
  AI_FORM_SCALE,
  AI_FORM_TOKEN,
  toAiForm,
  BADGE_SIZE_CHART_AI,
  BADGE_SIZE_ARTICLE_AI,
  BADGE_SUP_SIZE_AI,
  CO_AUTHORSHIP_ORDERINGS_AI,
  coAuthorshipOrderings,
  badgeSupSize,
  badgeChartSize,
  // The chart's own exception to the two sizes (editors, 2026-08-11)
  BADGE_SIZE_CHART_TABLE,
} from '../src/lib/tier-badges.mjs';
import { TIERS, TIER_CODES } from '../src/lib/site.ts';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('every tier has a badge, and every badge has a tier', () => {
  // Both directions. A tier with no badge renders an empty circle in a chart
  // about what marks mean; a badge with no tier is a mark for something the
  // record cannot store.
  assert.deepEqual(Object.keys(TIER_BADGES).sort(), [...TIER_CODES].sort());
  for (const tier of TIERS) {
    assert.ok(badgeFor(tier.code), `${tier.code} has no badge`);
  }
});

test('the ring encodes whose words, and the spectrum is a mirror', () => {
  // The AI half green, the human half salmon, co-authorship split. Asserted as
  // the whole mapping rather than tier by tier: the property that matters is
  // the symmetry, and a single tier flipped to the wrong side still leaves six
  // correct ones.
  const rings = TIERS.map((t) => badgeFor(t.code).ring);
  assert.deepEqual(rings, ['ai', 'ai', 'ai', 'split', 'human', 'human', 'human']);
});

test('exactly one tier takes a split ring, and it is co-authorship', () => {
  const split = Object.entries(TIER_BADGES).filter(([, b]) => b.ring === 'split');
  assert.equal(split.length, 1);
  assert.equal(split[0][0], CO_AUTHORSHIP_CODE);
});

test('the two co-authorship orderings are one tier and one code', () => {
  // THE FAILURE THIS EXISTS FOR: the chart prints two circles, and a later
  // session reads two circles as two tiers and adds a `human-equals-ai` code.
  // There is one co-authorship tier, it is `ai-equals-human`, and both
  // orderings belong to it.
  assert.equal(CO_AUTHORSHIP_ORDERINGS.length, 2);
  assert.deepEqual(CO_AUTHORSHIP_ORDERINGS, ['A=H', 'H=A']);
  assert.ok(TIER_CODES.includes(CO_AUTHORSHIP_CODE));
  assert.ok(
    !TIER_CODES.includes('human-equals-ai'),
    'a second co-authorship code has appeared; the chart shows one tier twice, not two tiers'
  );
  assert.equal(
    TIERS.filter((t) => t.label.includes('=')).length,
    1,
    'co-authorship is one row in the tier table'
  );
});

test('the edited variants are never set smaller than the relational ones', () => {
  // Ruled explicitly: the edited badges carry more glyphs and the temptation is
  // to shrink them to fit, which would rank them below the led forms in a chart
  // whose whole claim is that the tiers are a spectrum and not a hierarchy.
  const edited = ['ai-human-editor', 'human-ai-editor'].map((c) => badgeFor(c).size);
  const relational = ['ai-human', 'human-ai'].map((c) => badgeFor(c).size);
  for (const e of edited) {
    for (const r of relational) {
      assert.ok(e >= r, `an edited badge is set at ${e} against a relational ${r}`);
    }
  }
  assert.deepEqual(edited, relational, 'the ruling is that they are the SAME size');

  // The superscript is proportionally large, with a legibility floor — the same
  // reasoning R-035 clause 3 applies to the tier notation's own superscripts.
  assert.ok(BADGE_SUP_SIZE >= 12, 'the superscript has fallen below the legibility floor');
});

test('the solo tiers are the largest, and only they are', () => {
  const solo = [badgeFor('ai').size, badgeFor('human').size];
  const rest = TIERS.filter((t) => !['ai', 'human'].includes(t.code)).map(
    (t) => badgeFor(t.code).size
  );
  assert.deepEqual(solo, [solo[0], solo[0]], 'the two solo badges are set alike');
  for (const size of rest) assert.ok(size < solo[0]);
});

test('a badge names its tier, never its picture', () => {
  // The accessible name is what a machine reader and a screen reader get. It
  // has to carry the record's own language — "circle with A dash H" describes
  // ink and tells a reader nothing about the piece.
  const tier = TIERS.find((t) => t.code === 'ai-human-editor');
  const name = badgeLabel(tier, 'A–H with a superscript e');
  assert.match(name, /AI – Human \(editor\)/);
  assert.match(name, /a human edited/);
  assert.match(name, /A–H with a superscript e/);
});

test('the badge renders as SVG with real text, not as an image', () => {
  // The house requirement: this journal is read by machines, and iconography a
  // machine cannot read withholds from half the readership. Checked against the
  // component source, because the property is structural — an <img> or a
  // background-image would satisfy any visual review and fail this one.
  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  assert.match(src, /<svg/, 'the badge is not an SVG');
  assert.match(src, /<text/, 'the notation is not real text');
  assert.match(src, /role="img"/);
  assert.match(src, /aria-label=\{accessibleName\}/);
  assert.ok(!/<img/.test(src), 'the badge renders an image');
  assert.ok(!/background-image/.test(src), 'the badge is drawn with a background image');
});

test('the ring colours are the ratified ones', () => {
  // RING_AI settled 2026-08-03. Three preview walks against the eyeglass frames
  // the colour comes from moved it off the original sage #7d9153, through an
  // apple-olive and an olive-avocado, before the human editor held the frames to
  // a swatch chart and read the match off it. It is a true green — hue 79° →
  // 122° — where every intermediate candidate was a yellow-green.
  assert.equal(RING_AI, '#4b8e4d');
  assert.equal(RING_HUMAN, '#efa48f');
});

test('the ring green and the site accent are ONE colour', () => {
  // THE POINT OF THE SYSTEM, made mechanical (editors, 2026-08-03). The
  // journal's identity colour and its provenance colour are the same colour, so
  // the ring around a tier and the name of a section are visibly the same
  // statement. It cannot be shared as a literal across a stylesheet and a JS
  // module — which is precisely why it is asserted. Two hex values in two
  // languages, meaning one thing, is the pair that drifts.
  const css = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  const bright = css.match(/--accent-bright:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.equal(
    bright,
    RING_AI,
    'the accent and the badge ring have come apart; they are one colour by ruling'
  );
});

test('the accent stops are one green at three lightnesses', () => {
  // "A darker stop of the same green" is the rule, and the failure it guards
  // against is someone reaching for a different green that merely looks darker.
  // Hue and saturation are what make three values read as one colour used three
  // ways, so those are what is asserted — the lightnesses are free to be tuned.
  const css = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  const stops = ['--accent', '--accent-bright', '--accent-deep'].map((name) => {
    const hex = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
    assert.ok(hex, `${name} is missing from :root`);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (d !== 0) {
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { name, hex, h, s, l };
  });

  const [h0, s0] = [stops[0].h, stops[0].s];
  for (const stop of stops) {
    assert.ok(
      Math.abs(stop.h - h0) <= 2,
      `${stop.name} (${stop.hex}) is hue ${stop.h.toFixed(1)}°, ${Math.abs(stop.h - h0).toFixed(1)}° off the family — a different green, not a darker stop of this one`
    );
    assert.ok(
      Math.abs(stop.s - s0) <= 0.03,
      `${stop.name} (${stop.hex}) differs in saturation by ${(Math.abs(stop.s - s0) * 100).toFixed(1)} points`
    );
  }

  // The ordering is the whole reason there are three: bright is the colour,
  // and each stop below it exists to buy contrast that the one above cannot.
  const [accent, bright, deep] = stops;
  assert.ok(bright.l > accent.l, 'the bright stop is no longer the lightest');
  assert.ok(accent.l > deep.l, 'the deep stop is no longer the darkest');
});

test('the accent stops clear the contrast they are used at', () => {
  // Re-derived from the new hue rather than carried over from the sage: a
  // brighter green buys less contrast, so the stops below it had to move too.
  // These are the thresholds each stop is USED at, which is the only question
  // that matters — the bright stop is deliberately not held to a text ratio,
  // because it is deliberately never set as text.
  const css = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  const value = (name) => css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  const paper = value('--paper');
  // Type, at every size the site sets it — the 12.75px kicker and the 19.5px
  // floor of the section-name clamp are both ordinary text, not large text.
  assert.ok(
    ratio(value('--accent'), paper) >= 4.5,
    `--accent is ${ratio(value('--accent'), paper).toFixed(2)}:1 on the ground; kickers and section names need 4.5:1`
  );
  // A filled button's hover, with cream set on it.
  assert.ok(
    ratio(paper, value('--accent-deep')) >= 4.5,
    'cream no longer reads on the deep stop'
  );
});

// --- The mark is fixed geometry (editors, 2026-08-03) ----------------------

test('every placement grew by exactly a quarter, and the box did not', () => {
  // The ruling was a SCALE, not a redraw. The rendered diameters go up 25% and
  // the viewBox stays at 58, which is what makes ring weight, type size and the
  // superscript's offset come along unchanged — every placement is the same
  // composition at a different magnification.
  assert.equal(BADGE_SCALE_2026_08_04, 1.25);
  assert.equal(BADGE_SIZE_CHART, 58 * BADGE_SCALE_2026_08_04);
  assert.equal(BADGE_SIZE_ARTICLE, 28 * BADGE_SCALE_2026_08_04);
  assert.equal(BADGE_BOX, 58, 'the drawing units moved; the mark has been redrawn, not scaled');

  // THE FRACTION IS THE POINT. Rounding 72.5 to 72 or 73 would grow the two
  // placements by different amounts, which is the one thing "keeping
  // proportions" rules out.
  assert.equal(
    BADGE_SIZE_CHART / 58,
    BADGE_SIZE_ARTICLE / 28,
    'the two placements no longer scale by the same factor'
  );
});

test('the placements are named, never typed in at the call site', () => {
  // A literal size on a call site is how one placement gets left behind the
  // next time the editors resize the mark — which is exactly what "at every
  // placement" was written to prevent.
  // THE ARTICLE TEMPLATE NO LONGER DRAWS A BADGE AT ALL (editors, 2026-08-18):
  // the compact mark replaced it on every journal page. The rule this test was
  // written for survives with one placement left to enforce it on — the chart —
  // and the article template is now asserted the other way, that it names no
  // badge size because it draws no badge.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.ok(!/<TierBadge/.test(page), 'a journal page draws a badge again');
  assert.ok(
    !/BADGE_SIZE_ARTICLE\b|badgeArticleSize\(/.test(page),
    'the article template still reaches for a badge size'
  );

  // THE CHART IS THE ONE PLACEMENT THAT NAMES A SIZE, and it still does not TYPE
  // one. Since 2026-08-11 both of its columns draw at BADGE_SIZE_CHART_TABLE, so
  // the two forms sit at one diameter in the illustration; the constant is asked
  // for by name for the same reason every other placement asks by name, which is
  // that a literal is how a placement gets left behind at the next resize.
  const chart = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  assert.ok(
    !/<TierBadge[^>]*size=\{?\d/.test(chart),
    'the chart hard-codes a badge size instead of naming the table constant'
  );
});

test('the notation is pinned against everything it could inherit', () => {
  // THE FAILURE THIS EXISTS FOR, and it is not hypothetical — it is what was
  // shipping before 2026-08-03. An SVG <text> inherits every typographic
  // property from the HTML around it unless it declares its own, so the
  // notation was set by whatever container it landed in: italic inside
  // `.article-byline`, and one inherited `text-transform` away from rendering
  // the editor superscript as a capital E.
  //
  // It recurs the moment someone wraps a badge in a styled container, which is
  // an ordinary thing to do to a component used in four places. So each
  // property that can move a glyph is asserted DECLARED — the whole list, not a
  // sample, because the one that gets dropped is the one that bites.
  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  const style = src.slice(src.indexOf('<style>'));
  const pinned = style.slice(style.indexOf('.tier-badge text'));

  for (const property of [
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'font-variant',
    'font-stretch',
    'letter-spacing',
    'word-spacing',
    'text-transform',
    'text-anchor',
    'dominant-baseline',
    'direction',
    'writing-mode',
    'fill',
  ]) {
    assert.match(
      pinned,
      new RegExp(`^\\s*${property}:`, 'm'),
      `${property} is not declared on .tier-badge text, so the notation inherits it`
    );
  }
});

test('the pinned values are the ones the mark has always drawn at', () => {
  // Pinning the wrong numbers would be worse than not pinning: it would freeze
  // a mark nobody approved. The two per-badge values travel as custom
  // properties, so the assertion is that the rules consume them rather than
  // restating a size that could drift from tier-badges.mjs.
  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  assert.match(src, /font-size: var\(--badge-notation-size\)/);
  assert.match(src, /font-size: var\(--badge-sup-size\)/);
  assert.match(src, /--badge-notation-size:\$\{badge\.size\}px/);
  // The superscript's size is the FORM's since R-050, for the same reason the
  // notation's is the badge's: both are a quarter smaller in the AI form so
  // that both land at the same size on the page. A constant restated here
  // would pin the letter form's number onto both.
  assert.match(src, /--badge-sup-size:\$\{supSize\}px/);
  assert.match(src, /const supSize = badgeSupSize\(form\)/);
  assert.match(src, /font-family: var\(--font-mono\)/);
  assert.match(src, /text-anchor: middle/);
  assert.match(src, /dominant-baseline: central/);
});

test('no typography is left in a presentation attribute', () => {
  // A presentation attribute is the WEAKEST declaration in the cascade: any
  // author rule matching `.tier-badge text` beats it. Leaving one behind means
  // two places state the same property and the loser is invisible — so the
  // markup carries geometry only, and the stylesheet carries type.
  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  // `<text x=` rather than `<text`: the file's own header comment names the
  // element in prose, and slicing from there would sweep in the ring's fills.
  const text = src.slice(src.indexOf('<text x='), src.indexOf('</text>'));
  for (const attribute of [
    'font-family=',
    'font-size=',
    'letter-spacing=',
    'text-anchor=',
    'dominant-baseline=',
    'fill=',
  ]) {
    assert.ok(
      !text.includes(attribute),
      `${attribute} is still a presentation attribute, where any stylesheet outranks it`
    );
  }
  // The dy stays: it is the superscript's offset in box units — geometry, not
  // typography — and it is derived from the badge's own size.
  assert.match(text, /dy=\{-badge\.size \* 0\.34\}/);
});

test('the box is square and cannot be made a rectangle', () => {
  // `svg { max-width: 100% }` is a rule people write for the same reason they
  // write it for images, and one of them in any ancestor stylesheet would
  // squeeze the width while the height held — letterboxing the mark inside its
  // own line. Both dimensions are stated three ways so no later rule can win.
  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  for (const property of [
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
  ]) {
    assert.match(
      src,
      new RegExp(`^\\s*${property}: var\\(--badge-size`, 'm'),
      `${property} is not pinned to the badge size`
    );
  }
  assert.match(src, /preserveAspectRatio="xMidYMid meet"/);
});

test('the notation ink is the darker stop, and still the same colour', () => {
  // Darkened 2026-08-03 for legibility. Modestly, and at the same hue: the
  // instruction anticipated that the 25% enlargement would do most of the work.
  assert.equal(BADGE_INK, '#303927');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(BADGE_INK.slice(i, i + 2), 16));
  assert.ok(g > r && r > b, 'the ink has stopped being a green');
});

// --- R-045: the set is closed -------------------------------------------

test('the set is exactly seven, and the schema refuses anything else', () => {
  // THE MECHANICAL ENFORCEMENT R-045 ASKED FOR. The article schema's
  // involvement_tier is z.enum(TIER_CODES) — the seven and nothing else — so a
  // piece carrying a tier no badge and no notation can render fails the BUILD,
  // where an editor sees it, rather than publishing as a label nobody checked.
  //
  // THIS NARROWED THE GATE. It previously accepted a well-formed chained code
  // under R-035's grammar; the assertion below is what stops a future session
  // widening it back on the reasonable-sounding ground that the standard can
  // express more than the seven. It can. This journal publishes seven.
  assert.equal(TIER_CODES.length, 7, 'the closed set has changed size without a ruling');
  assert.equal(Object.keys(TIER_NOTATION).length, 7);
  assert.deepEqual(Object.keys(TIER_NOTATION).sort(), [...TIER_CODES].sort());

  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  assert.match(
    schema,
    /involvement_tier: z\.enum\(TIER_CODES\)/,
    'the tier gate no longer closes the set at the seven codes'
  );
});

test('no compound or combined notation is ever minted', () => {
  // R-045: complexity beyond the seven goes in the Chain of Custody and the
  // Provenance block, not into new marks. A notation carrying BOTH a relation
  // and an editor mark on the same side — or two relations — would be the
  // compound form the ruling forbids.
  for (const [code, notation] of Object.entries(TIER_NOTATION)) {
    const relations = (notation.match(/[>=]/g) ?? []).length;
    assert.ok(relations <= 1, `${code} carries ${relations} relations; the seven carry at most one`);
    const editorMarks = (notation.match(/ᵉ/g) ?? []).length;
    assert.ok(editorMarks <= 1, `${code} carries more than one editor mark`);
    assert.ok(
      !(notation.includes('=') && notation.includes('ᵉ')),
      `${code} chains an editor mark onto co-authorship — the ruling's named example of what is never minted`
    );
  }
});

test('a chained code has no notation, and does not silently get one', () => {
  // R-044 enumerates seven forms; R-035's grammar composes more. The fallback
  // is the full label, which is honest — an invented shorthand for a chain
  // would be a notation the standard does not define.
  assert.equal(tierNotation('ai-1-equals-human-ai-2-editor'), null);
  assert.equal(tierNotation('not-a-code'), null);
});

test('the notation matches the badge each tier draws', () => {
  // The two representations of one tier, which must not drift: the badge's
  // parts flattened are the notation, with the superscript realised as the
  // character the string form uses.
  for (const [code, badge] of Object.entries(TIER_BADGES)) {
    const flat = badge.parts.map((p) => (p.sup ? 'ᵉ' : p.text)).join('');
    assert.equal(flat, TIER_NOTATION[code], `${code}'s badge and notation disagree`);
  }
});

test('the split ring mirrors the notation — left colour, left letter', () => {
  // Ruled 2026-08-03. Co-authorship is the one tier whose notation an author may
  // order either way, and the ring is that same statement drawn instead of
  // written. Fixed halves under moving letters would make the badge say one
  // thing in ink and the other in colour.
  assert.deepEqual(splitRingSides('A=H'), { left: RING_AI, right: RING_HUMAN });
  assert.deepEqual(splitRingSides('H=A'), { left: RING_HUMAN, right: RING_AI });

  // THE PROPERTY, not the two cases: the orderings are mirror images. Asserted
  // this way because a change that broke the mirroring while leaving one case
  // correct would pass a pair of equality checks.
  const [a, b] = CO_AUTHORSHIP_ORDERINGS.map(splitRingSides);
  assert.equal(a.left, b.right, 'the two orderings are not mirror images');
  assert.equal(a.right, b.left, 'the two orderings are not mirror images');
});

test('an unrecognised notation falls back to the canonical orientation', () => {
  // The caller has already drawn a circle by this point; a half-coloured ring
  // is worse than one oriented the ordinary way.
  for (const input of ['', null, undefined, '?=?']) {
    assert.deepEqual(splitRingSides(input), { left: RING_AI, right: RING_HUMAN });
  }
});

test('the split orientation is derived by every surface, not hardcoded by one', () => {
  // The spec has to be inherited rather than remembered: any surface rendering
  // a split badge calls splitRingSides. A component that reached for the ring
  // constants directly for its arcs would drift the day a second surface
  // rendered H=A.
  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  assert.match(src, /splitRingSides/, 'the badge no longer derives its split orientation');
  assert.match(src, /stroke=\{split\.left\}/);
  assert.match(src, /stroke=\{split\.right\}/);
});

// --- R-050: two badge styles, one standard -------------------------------
//
// What this half protects, over and above everything above it: that the second
// style is the SAME standard and not a second one. Every property the letter
// form is held to is re-asserted against the AI form, and the two are asserted
// to differ in exactly one token — which is the whole content of the ruling.

/** A box-unit measurement as it actually renders, at a given diameter. */
const renderedAt = (boxUnits, diameter) => boxUnits * (diameter / BADGE_BOX);

/**
 * Rendered sizes compared to within a millionth of a pixel.
 *
 * FLOATING POINT, NOT DRIFT, and worth saying so where the tolerance is rather
 * than in a commit message nobody will find. The AI form's box-unit sizes are a
 * division by 1.25 and its diameters a multiplication by it; the two cancel
 * exactly in arithmetic and land a few parts in 10^15 apart in binary — 23/1.25
 * is not representable. The tolerance is far below anything a renderer rounds
 * to or a reader could see, and many orders of magnitude above the error, so a
 * real change to either number still fails this.
 */
const sameRendered = (a, b, message) =>
  assert.ok(Math.abs(a - b) < 1e-6, `${message} — ${a} against ${b}`);

test('there are two styles, and neither is a fallback for the other', () => {
  assert.deepEqual(BADGE_STYLES, ['letter', 'ai']);
  assert.equal(BADGE_STYLE_NAMES.letter, 'letter form');
  assert.equal(BADGE_STYLE_NAMES.ai, 'AI form');
  // Every style is named. A style the module can draw but cannot say the name
  // of is one a page would have to name for it, which is where a column headed
  // as one form and drawn in the other comes from.
  for (const style of BADGE_STYLES) {
    assert.ok(BADGE_STYLE_NAMES[style], `${style} has no display name`);
  }
});

test('every tier has a badge in both forms, and the forms share the codes', () => {
  // The codes are the standard's stable half. Two display styles over one set
  // of codes is the ruling; two sets of codes would be two standards.
  assert.deepEqual(Object.keys(TIER_BADGES_AI).sort(), [...TIER_CODES].sort());
  assert.deepEqual(Object.keys(TIER_BADGES_AI).sort(), Object.keys(TIER_BADGES).sort());
  for (const tier of TIERS) {
    for (const style of BADGE_STYLES) {
      assert.ok(badgeFor(tier.code, style), `${tier.code} has no ${style}-form badge`);
    }
  }
});

test('the AI form differs from the letter form in one token and nothing else', () => {
  // THE RULING, ASSERTED DIRECTLY. Ring, part structure and superscript are
  // carried across untouched; the only thing that may differ is the AI-side
  // token, and it must differ by exactly the substitution.
  for (const code of TIER_CODES) {
    const letter = badgeFor(code, 'letter');
    const ai = badgeFor(code, 'ai');

    assert.equal(ai.ring, letter.ring, `${code} changed rings between forms`);
    assert.equal(ai.parts.length, letter.parts.length, `${code} changed shape between forms`);

    for (const [index, letterPart] of letter.parts.entries()) {
      const aiPart = ai.parts[index];
      assert.equal(!!aiPart.sup, !!letterPart.sup, `${code} part ${index} changed its role`);
      assert.equal(
        aiPart.text,
        letterPart.sup ? letterPart.text : toAiForm(letterPart.text),
        `${code} part ${index} is not the letter form with the token substituted`
      );
    }
  }
});

test('the human side is untouched, in every tier, in both forms', () => {
  // Stated as its own property because it is half the ruling and it is the half
  // a substitution bug would break silently: replace too greedily and `H` picks
  // up a token too, and the chart claims the human side is called something new.
  for (const code of TIER_CODES) {
    const letter = TIER_NOTATION[code];
    const ai = TIER_NOTATION_AI[code];
    assert.equal(
      letter.replaceAll('A', ''),
      ai.replaceAll(AI_FORM_TOKEN, ''),
      `${code}: something other than the AI token moved between the forms`
    );
  }
  // The one tier with no AI side at all is the control: it is the same string.
  assert.equal(TIER_NOTATION_AI.human, TIER_NOTATION.human);
  assert.equal(TIER_NOTATION_AI.human, 'H');
});

test('the AI-form notations are the seven the editors specified', () => {
  // The ruling names them. Written out once, against derived values, so a
  // change to the derivation has to face the list rather than regenerate it.
  assert.deepEqual(TIER_NOTATION_AI, {
    ai: 'AI',
    'ai-human-editor': 'AI–Hᵉ',
    'ai-human': 'AI>H',
    'ai-equals-human': 'AI=H',
    'human-ai': 'H>AI',
    'human-ai-editor': 'H–AIᵉ',
    human: 'H',
  });
});

test('the substitution survives being applied twice', () => {
  // The failure it guards is silent: `AII>H` draws, and reads as a typo nobody
  // catches in a diff. Idempotence means a form applied to an already-converted
  // string is a no-op rather than a corruption.
  for (const notation of Object.values(TIER_NOTATION)) {
    assert.equal(toAiForm(toAiForm(notation)), toAiForm(notation));
  }
  assert.equal(toAiForm('AI>H'), 'AI>H');
  assert.equal(toAiForm(''), '');
  assert.equal(toAiForm(null), '');
});

test('an unknown style throws rather than drawing the wrong form silently', () => {
  // The asymmetry with an unknown CODE is deliberate and is documented at
  // assertStyle: a bad code is a record the module has no badge for, a bad
  // style is a typo that would otherwise render the letter form inside a
  // column headed as the AI one — correct-looking and wrong.
  // `undefined` is deliberately not in this list: in JavaScript it is what an
  // omitted argument IS, so it takes the default rather than being a bad value.
  // `null` is not, and does not.
  for (const bad of ['AI', 'Letter', 'ai-form', '', null, 0]) {
    assert.throws(() => badgeFor('ai', bad), /Unknown badge style/);
    assert.throws(() => badgeSupSize(bad), /Unknown badge style/);
    assert.throws(() => badgeChartSize(bad), /Unknown badge style/);
    assert.throws(() => coAuthorshipOrderings(bad), /Unknown badge style/);
    assert.throws(() => tierNotation('ai', bad), /Unknown badge style/);
  }
  // Called with no style at all, every one of them is the HOUSE form — which is
  // the AI form since 2026-08-04, and which each of these follows rather than
  // restates. That is the property worth pinning: omitting the argument must
  // give whatever the editors have set, so a later amendment moves all of them
  // at once and none of them is left behind holding a word.
  assert.equal(badgeFor('ai'), badgeFor('ai', HOUSE_BADGE_FORM));
  assert.equal(badgeSupSize(), badgeSupSize(HOUSE_BADGE_FORM));
  assert.equal(badgeChartSize(), badgeChartSize(HOUSE_BADGE_FORM));
  assert.equal(badgeArticleSize(), badgeArticleSize(HOUSE_BADGE_FORM));
  assert.equal(tierNotation('ai'), tierNotation('ai', HOUSE_BADGE_FORM));
  assert.deepEqual(coAuthorshipOrderings(), coAuthorshipOrderings(HOUSE_BADGE_FORM));
});

test('the circle grows a quarter and the type does not', () => {
  // THE SEATING INVARIANT, and the reason the AI form is larger at all. The
  // editors asked for circles a quarter larger "to seat the wider token" — a
  // plain scale would not do that, because it magnifies the letters with the
  // ring and leaves the token occupying the same proportion of the arc. So the
  // notation is divided by the scale in box units and the diameter multiplied
  // by it, and the two cancel.
  //
  // ASSERTED AS THE CANCELLATION, not as the two numbers. Either number can be
  // edited into something plausible on its own; only the product is the ruling.
  assert.equal(AI_FORM_SCALE, 1.25);
  assert.equal(BADGE_SIZE_CHART_AI, BADGE_SIZE_CHART * AI_FORM_SCALE);
  assert.equal(BADGE_SIZE_ARTICLE_AI, BADGE_SIZE_ARTICLE * AI_FORM_SCALE);

  for (const code of TIER_CODES) {
    sameRendered(
      renderedAt(badgeFor(code, 'ai').size, BADGE_SIZE_CHART_AI),
      renderedAt(badgeFor(code, 'letter').size, BADGE_SIZE_CHART),
      `${code}'s notation does not render at the same size in both forms`
    );
  }
  sameRendered(
    renderedAt(BADGE_SUP_SIZE_AI, BADGE_SIZE_CHART_AI),
    renderedAt(BADGE_SUP_SIZE, BADGE_SIZE_CHART),
    'the editor superscript does not render at the same size in both forms'
  );

  // THE LEGIBILITY FLOOR IS A RENDERED FLOOR, and this is where that gets said.
  // BADGE_SUP_SIZE_AI is 10.4 against the letter form's 13 and would fail the
  // box-unit floor asserted earlier in this file — because the AI form's box
  // units are a quarter smaller. On the page the two are the same 16.25px, and
  // the page is what a reader has to read.
  assert.ok(renderedAt(BADGE_SUP_SIZE_AI, BADGE_SIZE_CHART_AI) >= 12);

  // AND IT IS A SCALE, NOT A REDRAW. One box, both forms — which is what makes
  // the ring weight, the arcs and the superscript's offset come along unchanged.
  assert.equal(BADGE_BOX, 58);
});

test('the AI form obeys every size rule the letter form does', () => {
  // The rules are the chart's claims about the spectrum, not facts about a
  // particular set of numbers: the edited variants are never ranked below the
  // relational ones, and only the solo tiers are the largest. A form that broke
  // either would be making a different claim in the same table.
  const size = (code) => badgeFor(code, 'ai').size;
  const edited = ['ai-human-editor', 'human-ai-editor'].map(size);
  const relational = ['ai-human', 'human-ai'].map(size);
  assert.deepEqual(edited, relational, 'the edited and relational AI badges are not one size');

  const solo = ['ai', 'human'].map(size);
  assert.deepEqual(solo, [solo[0], solo[0]], 'the two solo AI badges are not set alike');
  for (const code of TIER_CODES) {
    if (['ai', 'human'].includes(code)) continue;
    assert.ok(size(code) < solo[0], `${code} is set as large as a solo tier`);
  }
});

test('the ring encodes whose words in both forms', () => {
  // The colours are the semantics, and the semantics did not change with the
  // token. Asserted as the whole mapping for the reason the letter form's is:
  // the property that matters is the symmetry of the spectrum.
  const rings = (style) => TIERS.map((t) => badgeFor(t.code, style).ring);
  assert.deepEqual(rings('ai'), ['ai', 'ai', 'ai', 'split', 'human', 'human', 'human']);
  assert.deepEqual(rings('ai'), rings('letter'));
});

test('the split ring mirrors the AI-form notation too', () => {
  // The order rule is stated once and derived everywhere, so it should hold for
  // a token it has never seen. `AI=H` leads with the AI side and `H=AI` with
  // the human side, exactly as `A=H` and `H=A` do.
  assert.deepEqual(CO_AUTHORSHIP_ORDERINGS_AI, ['AI=H', 'H=AI']);
  assert.deepEqual(splitRingSides('AI=H'), { left: RING_AI, right: RING_HUMAN });
  assert.deepEqual(splitRingSides('H=AI'), { left: RING_HUMAN, right: RING_AI });

  // The property rather than the two cases: the orderings are mirror images in
  // this form as in the other.
  const [a, b] = CO_AUTHORSHIP_ORDERINGS_AI.map(splitRingSides);
  assert.equal(a.left, b.right, 'the AI-form orderings are not mirror images');
  assert.equal(a.right, b.left, 'the AI-form orderings are not mirror images');

  // And the two forms agree with each other, ordering for ordering: the ring is
  // the notation drawn, so a form that coloured its halves differently would be
  // saying something the same tier's other form does not.
  for (const [index, letter] of CO_AUTHORSHIP_ORDERINGS.entries()) {
    assert.deepEqual(
      splitRingSides(CO_AUTHORSHIP_ORDERINGS_AI[index]),
      splitRingSides(letter),
      `the forms disagree about which side leads in ${letter}`
    );
  }
});

test('co-authorship is still one tier and one code, across both forms', () => {
  // THE FAILURE THIS EXISTS FOR, now with four circles instead of two: a later
  // session reads the chart's co-authorship row as several tiers. It is one,
  // its code is `ai-equals-human`, and both forms of both orderings belong to
  // it.
  assert.equal(CO_AUTHORSHIP_ORDERINGS_AI.length, 2);
  assert.deepEqual(CO_AUTHORSHIP_ORDERINGS_AI, CO_AUTHORSHIP_ORDERINGS.map(toAiForm));
  assert.ok(
    !TIER_CODES.includes('human-equals-ai'),
    'a second co-authorship code has appeared; the chart shows one tier four times, not four tiers'
  );
  assert.equal(TIER_CODES.length, 7, 'the closed set has changed size without a ruling');
});

test('the AI-form notation matches the AI-form badge each tier draws', () => {
  // The two representations of one tier in one form, which must not drift —
  // the same assertion the letter form carries, and the same failure.
  for (const [code, badge] of Object.entries(TIER_BADGES_AI)) {
    const flat = badge.parts.map((p) => (p.sup ? 'ᵉ' : p.text)).join('');
    assert.equal(flat, TIER_NOTATION_AI[code], `${code}'s AI badge and AI notation disagree`);
    assert.equal(tierNotation(code, 'ai'), TIER_NOTATION_AI[code]);
  }
  // A chained code has no notation in either form. R-045 closed the set; a
  // second style is not a way in for an eighth mark.
  assert.equal(tierNotation('ai-1-equals-human-ai-2-editor', 'ai'), null);
  assert.equal(tierNotation('not-a-code', 'ai'), null);
});

test('no compound or combined notation is minted in the AI form either', () => {
  // R-045 applies to the marks, not to one spelling of them. A form that could
  // carry a compound would be a way around a closed set.
  for (const [code, notation] of Object.entries(TIER_NOTATION_AI)) {
    assert.ok((notation.match(/[>=]/g) ?? []).length <= 1, `${code} carries more than one relation`);
    assert.ok((notation.match(/ᵉ/g) ?? []).length <= 1, `${code} carries more than one editor mark`);
    assert.ok(
      !(notation.includes('=') && notation.includes('ᵉ')),
      `${code} chains an editor mark onto co-authorship`
    );
  }
});

test('the chart generates its two columns rather than typing them out', () => {
  // A column typed by hand is a column that can be headed as one form and drawn
  // in the other — a mark that says the wrong thing while looking entirely
  // correct. The columns come from BADGE_STYLES for the same reason the rows
  // come from TIERS.
  const chart = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  assert.match(chart, /BADGE_STYLES\.map\(/, 'the badge columns are no longer generated');
  assert.match(chart, /<th>\{column\.heading\}<\/th>/);
  assert.match(chart, /form=\{column\.form\}/);
  assert.match(chart, /coAuthorshipOrderings\(column\.form\)/);
  assert.ok(
    !/<TierBadge[^>]*size=\{?\d/.test(chart),
    'the chart hard-codes a badge size instead of naming the table constant'
  );
  // Each badge says which form it is, in words, because two circles side by
  // side differ in their spoken names only by a notation a listener may not
  // have met yet.
  assert.match(chart, /labelSuffix=\{column\.labelSuffix\}/);
  assert.match(chart, /BADGE_STYLE_NAMES\[form\]/);
});

test('every badge in the chart is drawn at one diameter', () => {
  // THE LEVELLING (editors, 2026-08-11). Two columns of circles at two sizes
  // read as a mistake in a table whose subject is that these are the same seven
  // marks — so the illustration draws them equal and lets the notation be the
  // only visible difference, which is the only difference the standard claims.
  //
  // ASSERTED AT EVERY CALL SITE, not once. The chart draws badges in two places
  // — co-authorship's pair and the single mark every other tier takes — and a
  // levelling that reached one of them would leave the pair a quarter larger
  // than the row above it, which is the fault this was written to remove.
  assert.equal(BADGE_SIZE_CHART_TABLE, BADGE_SIZE_CHART, 'the table left the letter form’s size');

  const chart = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  const badges = chart.match(/<TierBadge\b[\s\S]*?\/>/g) ?? [];
  assert.ok(badges.length >= 2, 'the chart no longer draws the pair and the single separately');
  for (const badge of badges) {
    assert.match(
      badge,
      /size=\{BADGE_SIZE_CHART_TABLE\}/,
      'a badge in the chart takes the form’s own size instead of the table’s'
    );
  }

  // AND THE EXCEPTION STOPS AT THIS TABLE. The spec is untouched: a badge that
  // stands alone is still a quarter larger in the AI form, and the component
  // still draws that when a caller names no size.
  assert.equal(badgeChartSize('ai'), BADGE_SIZE_CHART_AI);
  assert.equal(badgeArticleSize('ai'), BADGE_SIZE_ARTICLE_AI);
  for (const page of ['src/pages/articles/[slug].astro', 'src/pages/articles/[slug]/as-submitted.astro']) {
    assert.ok(
      !readFileSync(repoPath(page), 'utf8').includes('BADGE_SIZE_CHART_TABLE'),
      `${page} took the chart table's size for a badge that stands alone`
    );
  }

  // THE SUPERSCRIPT STILL CLEARS THE RENDERED FLOOR at the smaller diameter.
  // The AI form's box units are a quarter smaller, so this is the number that
  // moves when the diameter does — 16.25px in the spec, 13px here, and 12px is
  // the floor asserted for both.
  assert.ok(
    renderedAt(BADGE_SUP_SIZE_AI, BADGE_SIZE_CHART_TABLE) >= 12,
    'the AI form’s editor superscript falls below the legibility floor in the chart'
  );
});

test('the page grants both styles under the one licence, and still counts seven', () => {
  // "Either free to adopt under the same CC BY 4.0, machine codes identical
  // underneath" is the ruling's own clause about this page, and the sentence
  // about fourteen is what stops a reader counting circles and concluding R-045
  // was reopened.
  const chart = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  assert.match(chart, /Both display styles are covered, on identical terms/);
  assert.match(chart, /Two styles are not fourteen badges/);
  assert.match(chart, /machine codes are the same underneath both/);
  assert.match(chart, /adopters may display either, or both/);
});

test("this journal's own pages set the house form, and the chart does not", () => {
  // AMENDED 2026-08-04. R-050 reserved this choice to the editors and they have
  // exercised it: the house form is the AI form. What is asserted is that the
  // surfaces FOLLOW the constant rather than that they say "ai" — a house form
  // written out at six call sites is six places to forget.
  assert.equal(HOUSE_BADGE_FORM, 'ai');
  assert.ok(BADGE_STYLES.includes(HOUSE_BADGE_FORM), 'the house form is not one of the styles');

  // The article byline is the journal's one badge placement. It names no form,
  // so it takes the house default — which is what makes an amendment reach it.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.ok(
    !/form=/.test(page),
    'the article header pins a badge form instead of following the house one'
  );

  // The compact-notation surfaces do the same. They are the string rendering of
  // the same tier the badge draws, and an article page carries BOTH — the mark
  // in the byline and the notation in the Provenance block a screen below. A
  // surface that pinned a form here would have one piece calling itself two
  // things on one page.
  for (const surface of [
    'src/pages/archive.astro',
    'src/components/ProvenanceBlock.astro',
    'src/components/QuestionAnswers.astro',
  ]) {
    const src = readFileSync(repoPath(surface), 'utf8');
    assert.match(src, /tierNotation\(/, `${surface} no longer renders a tier notation`);
    assert.ok(
      !/tierNotation\([^)]*,\s*['"]/.test(src),
      `${surface} pins a notation form instead of following the house one`
    );
  }

  // AND THE CHART IS THE EXCEPTION. It teaches both styles, so it names them —
  // a page showing two columns must not be a page that quietly prints one.
  const chart = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  assert.match(chart, /form=\{column\.form\}/);
  assert.ok(
    !/HOUSE_BADGE_FORM/.test(chart),
    'the chart has started following the house form instead of naming both'
  );
  assert.match(chart, /house choice and not a ranking/);
  assert.match(chart, /This journal sets the AI\s+form on its own pages/);
});

test('the chart may leave the text measure but may never scroll the page', () => {
  // The second column does not fit in 42rem — the arithmetic is in the rule's
  // own comment — so the chart breaks out of the measure. The breakout is
  // clamped to the viewport at both the width and the pull, and a later edit to
  // a bare `52rem` would overflow a phone silently, which is the one failure
  // mode a breakout has.
  const chart = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  const rule = chart.slice(chart.indexOf('.chart-wide {'), chart.indexOf('.tier-badge-cell {'));
  const width = rule.match(/width: (min\([^;]+\));/)?.[1];
  const pull = rule.match(/margin-inline: calc\(\((min\([^)]+\)) - 100%\) \/ -2\);/)?.[1];
  assert.ok(width, 'the chart no longer clamps its width');
  assert.match(width, /100vw/, 'the breakout width is not clamped to the viewport');
  // The cap appears twice and the two must be the same expression: they are the
  // width and the pull that centres it, and a cap edited in one alone would
  // leave the chart off-centre by half the difference.
  assert.equal(pull, width, 'the breakout width and its pull-out use different caps');
});

test('the ring sits inside the box, and the stroke is why', () => {
  // BADGE_RING_STROKE was exported on 2026-08-04 because /provenance stated the
  // geometry to adopters in words, and a number someone is told to build to must
  // be the number the mark is drawn with. THAT REASON LAPSED ON 2026-08-11, when
  // the standard stopped prescribing proportions and the page stopped printing
  // the ratio — but the constant did not, and neither did this test. It is the
  // house implementation's ring weight now, which is a thing the component draws
  // and the suite therefore still holds against the radius.
  //
  // THE RELATION IS THE ASSERTION, not the value. The radius is
  // (box - stroke) / 2, which is what makes a stroke centred on it stop exactly
  // at the box's edges instead of being clipped by them. The component still
  // draws the radius as a literal — in the circle and in both arc paths — so
  // this is where the three literals and the constant are held together.
  assert.equal(BADGE_RING_STROKE, 3);
  const radius = (BADGE_BOX - BADGE_RING_STROKE) / 2;
  assert.equal(radius, 27.5);

  const src = readFileSync(repoPath('src/components/TierBadge.astro'), 'utf8');
  assert.match(src, new RegExp(`r="${radius}"`), 'the drawn radius no longer fits the ring inside the box');
  assert.match(src, new RegExp(`A ${radius} ${radius} 0 0 0`), 'the split arcs left the ring');
  assert.match(src, new RegExp(`A ${radius} ${radius} 0 0 1`));
  assert.ok(
    !/stroke-width="\d/.test(src),
    'the ring weight is typed into the markup instead of taken from the constant'
  );
});
