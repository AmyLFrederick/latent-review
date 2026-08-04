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
  BADGE_SCALE_2026_08_04,
  BADGE_SIZE_CHART,
  BADGE_SIZE_ARTICLE,
  TIER_NOTATION,
  tierNotation,
  splitRingSides,
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
  // RING_AI settled 2026-08-04. Three preview walks against the eyeglass frames
  // the colour comes from moved it off the original sage #7d9153, through an
  // apple-olive and an olive-avocado, before the human editor held the frames to
  // a swatch chart and read the match off it. It is a true green — hue 79° →
  // 122° — where every intermediate candidate was a yellow-green.
  assert.equal(RING_AI, '#4b8e4d');
  assert.equal(RING_HUMAN, '#efa48f');
});

test('the ring green and the site accent are ONE colour', () => {
  // THE POINT OF THE SYSTEM, made mechanical (editors, 2026-08-04). The
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

// --- The mark is fixed geometry (editors, 2026-08-04) ----------------------

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
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.match(page, /<TierBadge tier=\{tierBadge\} size=\{BADGE_SIZE_ARTICLE\} \/>/);

  const chart = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  assert.ok(
    !/<TierBadge[^>]*size=\{?\d/.test(chart),
    'the chart hard-codes a badge size instead of taking the component default'
  );
});

test('the notation is pinned against everything it could inherit', () => {
  // THE FAILURE THIS EXISTS FOR, and it is not hypothetical — it is what was
  // shipping before 2026-08-04. An SVG <text> inherits every typographic
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
  assert.match(src, /--badge-sup-size:\$\{BADGE_SUP_SIZE\}px/);
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
  // Darkened 2026-08-04 for legibility. Modestly, and at the same hue: the
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
