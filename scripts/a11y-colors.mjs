// THE COLOUR-CONTRAST AUDIT (WCAG 2.1 AA pass, 2026-10-17).
//
// Computes the contrast ratio of every text/background and UI/background colour
// pair the site renders, proposes the minimal fix for any pair that fails, and
// writes the result to docs/a11y-colors.json and docs/a11y-colors.md. Run:
//
//     node scripts/a11y-colors.mjs
//
// THE PALETTE IS THE EDITORS' AND IS KEPT. The pink ground and the green accent
// are identity colours ruled on 2026-08-03. A failing pair is fixed by the
// smallest change that clears its threshold: an opacity removed, or — where the
// colour itself fails — the SAME hue and chroma (CIELAB a*, b*) with L* moved
// in 0.1 steps until the pair passes. No hue changes anywhere.
//
// "NOTICEABLE" IS FLAGGED, NOT JUDGED AWAY. A change counts as noticeable when
// the rendered colour moves more than ΔE*ab 5 (CIE76, in CIELAB) or more than 5
// points of HSL lightness. Both numbers are printed so a reader can disagree.
//
// THRESHOLDS (WCAG 2.1): 4.5:1 for normal text (SC 1.4.3); 3:1 for large text
// (24px, or 18.66px bold) and for UI component boundaries, focus indicators and
// graphics required to understand the content (SC 1.4.11). The root is 17px.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// --- colour maths -------------------------------------------------------------

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) =>
  '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
export const contrast = (a, b) => {
  const [l1, l2] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** Composite `fg` at `alpha` over `bg` — what the eye actually receives. */
const over = (fg, alpha, bg) => {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return rgbToHex(f.map((v, i) => v * alpha + b[i] * (1 - alpha)));
};

const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s, l];
};
const toLab = (hex) => {
  const lin = hexToRgb(hex).map(channel);
  const x = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047;
  const y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
  const z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};
const deltaE = (a, b) => {
  const [p, q] = [toLab(a), toLab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const lightness = (hex) => rgbToHsl(hexToRgb(hex))[2] * 100;

const fromLab = ([L, a, b]) => {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const [x, y, z] = [inv(fx) * 0.95047, inv(fy), inv(fz) * 1.08883];
  const lin = [
    x * 3.2406 + y * -1.5372 + z * -0.4986,
    x * -0.9689 + y * 1.8758 + z * 0.0415,
    x * 0.0557 + y * -0.204 + z * 1.057,
  ];
  const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  return lin.map((v) => gamma(Math.min(1, Math.max(0, v))) * 255);
};

/**
 * Same hue and chroma, lightness stepped darker until the pair clears.
 *
 * IN CIELAB, NOT HSL. Holding HSL saturation while dropping lightness drags a
 * warm grey toward mustard — the hue angle survives and the colour does not.
 * CIELAB keeps a* and b* (hue and chroma, as the eye reads them) and moves L*
 * alone, which is what "same colour, darker" means to a reader.
 */
const darkenUntil = (fg, bg, threshold) => {
  const [L0, a, b] = toLab(fg);
  for (let L = L0; L >= 0; L -= 0.1) {
    const hex = rgbToHex(fromLab([L, a, b]));
    if (contrast(hex, bg) >= threshold) return hex;
  }
  throw new Error(`no lightness of ${fg} reaches ${threshold}:1 on ${bg}`);
};

// --- the palette (src/styles/global.css :root, src/lib/tier-badges.mjs) -------

const C = {
  paper: '#faf3ef',
  paperRaised: '#fefaf7',
  ink: '#1b1813',
  inkSoft: '#6b6355',
  accent: '#3e743f',
  accentBright: '#4b8e4d',
  accentDeep: '#305b32',
  hairline: '#e0d8c6',
  rule: '#2a251c',
  ringHuman: '#efa48f',
  badgeInk: '#303927',
};
// Translucent grounds, composited over the page as the browser does.
const wash = over('#000000', 0.025, C.paper); // .prose .editors-note, archive hover tint
const codeGround = over('#000000', 0.045, C.paper); // .prose code
const errorGround = over(C.accent, 0.08, C.paper); // SubscribeForm error

// --- every pair ---------------------------------------------------------------
//
// `fix` names the strategy for a failing pair:
//   'opacity'   the colour passes and an opacity drags it under; remove it.
//   'darken'    the colour itself fails; same hue, lower lightness.
//   'exempt'    below threshold but not required by WCAG — stated with reason.

const PAIRS = [
  // Body text
  { role: 'Body text', where: 'html (global.css)', fg: C.ink, bg: C.paper, kind: 'text' },
  { role: 'Body text on raised panels', where: '.provenance block, pre, .how-block', fg: C.ink, bg: C.paperRaised, kind: 'text' },
  { role: 'Soft ink: kickers, meta-mono, captions, footer, bylines-pronouns', where: '--ink-soft, everywhere', fg: C.inkSoft, bg: C.paper, kind: 'text' },
  { role: 'Soft ink on raised panels', where: 'ProvenanceBlock labels, notice boxes', fg: C.inkSoft, bg: C.paperRaised, kind: 'text' },
  { role: 'Soft ink on wash (interleaved editors’ note)', where: '.prose .editors-note', fg: C.inkSoft, bg: wash, kind: 'text' },
  { role: 'Ink on inline-code ground', where: '.prose code', fg: C.ink, bg: codeGround, kind: 'text' },
  // Green
  { role: 'Accent green type: nav, wordmark, kickers, read-more, corrections', where: '--accent', fg: C.accent, bg: C.paper, kind: 'text' },
  { role: 'Accent green type on raised panels', where: 'ProvenanceBlock kicker', fg: C.accent, bg: C.paperRaised, kind: 'text' },
  { role: 'Hover green type', where: '--accent-deep (nav/wordmark hover)', fg: C.accentDeep, bg: C.paper, kind: 'text' },
  { role: 'Button label on green (support/give buttons)', where: 'about .support-button, supporters .give', fg: C.paper, bg: C.accent, kind: 'text' },
  { role: 'Button label on deep green (hover)', where: 'same, :hover', fg: C.paper, bg: C.accentDeep, kind: 'text' },
  { role: 'Subscribe error message', where: 'SubscribeForm .subscribe-error', fg: C.accent, bg: errorGround, kind: 'text' },
  { role: 'Bright green rules and badge ring (non-text)', where: '--accent-bright borders, RING_AI', fg: C.accentBright, bg: C.paper, kind: 'ui' },
  // Dark buttons
  { role: 'Label on dark button', where: 'submit.astro button (paper on --rule)', fg: C.paper, bg: C.rule, kind: 'text' },
  // Opacity-dimmed text
  { role: 'Effort line in issue contents (ink-soft at 75% opacity)', where: 'IssueContents .contents-effort', fg: C.inkSoft, alpha: 0.75, bg: C.paper, kind: 'text', fix: 'opacity' },
  { role: 'Desk date note (ink-soft at 75% opacity)', where: 'admin .desk-date-note (editors’ desk, private)', fg: C.inkSoft, alpha: 0.75, bg: C.paper, kind: 'text', fix: 'opacity' },
  { role: 'Subscribe placeholder (ink-soft at 60% opacity)', where: 'SubscribeForm input::placeholder', fg: C.inkSoft, alpha: 0.6, bg: C.paper, kind: 'text', fix: 'opacity' },
  { role: 'Editors’ notes and personal notes (ink at 85% opacity)', where: '.editorial-note / .editors-note / .personal-note', fg: C.ink, alpha: 0.85, bg: C.paper, kind: 'text' },
  // UI boundaries and focus
  { role: 'Form field border', where: 'submit.astro .field input/select/textarea (--hairline on raised)', fg: C.hairline, bg: C.paperRaised, kind: 'ui', fix: 'darken', token: '--control-border' },
  { role: 'Subscribe field underline', where: 'SubscribeForm (--rule)', fg: C.rule, bg: C.paper, kind: 'ui' },
  { role: 'Focus indicator (new, 2px outline)', where: ':focus-visible (global.css)', fg: C.accent, bg: C.paper, kind: 'ui' },
  { role: 'Focus indicator on raised panels', where: ':focus-visible', fg: C.accent, bg: C.paperRaised, kind: 'ui' },
  // Decorative — recorded, not required
  { role: 'Hairline rules and link underlines', where: '--hairline (hr, borders, a underline)', fg: C.hairline, bg: C.paper, kind: 'ui', fix: 'exempt', reason: 'Decorative rules carry no information. Link underlines are a non-colour cue (SC 1.4.1 is met by their presence); WCAG sets no contrast minimum for an underline. Low visibility is recorded as a known gap, not changed.' },
  { role: 'Salmon-pink badge ring (human half)', where: 'RING_HUMAN, /provenance badge drawings', fg: C.ringHuman, bg: C.paperRaised, kind: 'ui', fix: 'exempt', reason: 'The ring is not required to understand the badge: the notation printed inside it and the badge’s accessible name carry the same meaning in text, so SC 1.4.11 does not apply. Kept as the editors’ pink. Recorded because it is under 3:1 and an editor may want to know.' },
  { role: 'Badge notation ink on raised ground', where: 'BADGE_INK', fg: C.badgeInk, bg: C.paperRaised, kind: 'text' },
];

const THRESHOLD = { text: 4.5, large: 3, ui: 3 };

const rows = PAIRS.map((p) => {
  const shown = p.alpha ? over(p.fg, p.alpha, p.bg) : p.fg;
  const threshold = THRESHOLD[p.kind];
  const before = contrast(shown, p.bg);
  const passes = before >= threshold;
  let proposed = null;
  let change = 'none';
  if (!passes && p.fix === 'opacity') {
    // The least opacity that clears, in 0.01 steps — the recession the editors
    // chose is kept as far as the threshold allows, not removed outright.
    let alpha = p.alpha;
    while (alpha < 1 && contrast(over(p.fg, alpha, p.bg), p.bg) < threshold) alpha = Math.round((alpha + 0.01) * 100) / 100;
    proposed = over(p.fg, alpha, p.bg);
    change = `opacity ${p.alpha} → ${alpha} (colour token unchanged)`;
  } else if (!passes && p.fix === 'darken') {
    proposed = darkenUntil(p.fg, p.bg, threshold);
    change = `new token ${p.token}: same hue and chroma as ${p.fg}, CIELAB L* ${toLab(p.fg)[0].toFixed(1)} → ${toLab(proposed)[0].toFixed(1)}`;
  } else if (!passes && p.fix === 'exempt') {
    change = 'not changed — not required (see reason)';
  } else if (!passes) {
    throw new Error(`unhandled failing pair: ${p.role}`);
  }
  const after = proposed ? contrast(proposed, p.bg) : before;
  const dE = proposed ? deltaE(shown, proposed) : 0;
  const dL = proposed ? Math.abs(lightness(shown) - lightness(proposed)) : 0;
  return {
    role: p.role,
    where: p.where,
    kind: p.kind,
    threshold,
    foreground: p.fg,
    opacity: p.alpha ?? 1,
    foreground_rendered: shown,
    background: p.bg,
    ratio_before: Number(before.toFixed(2)),
    passes_before: passes,
    proposed: proposed,
    ratio_after: Number(after.toFixed(2)),
    passes_after: after >= threshold,
    change,
    delta_e: Number(dE.toFixed(1)),
    lightness_shift: Number(dL.toFixed(1)),
    noticeable: proposed ? dE > 5 || dL > 5 : false,
    reason: p.reason ?? null,
  };
});

const out = {
  generated_by: 'scripts/a11y-colors.mjs',
  date: '2026-10-17',
  standard: 'WCAG 2.1 AA — 4.5:1 normal text, 3:1 large text and non-text UI (SC 1.4.3, 1.4.11)',
  noticeable_rule: 'ΔE*ab (CIE76) > 5 or HSL lightness shift > 5 points',
  palette: C,
  pairs: rows,
};

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
writeFileSync(root('docs/a11y-colors.json'), JSON.stringify(out, null, 2) + '\n');

const fmt = (r) => r.toFixed(2) + ':1';
const md = [
  '# Colour contrast — WCAG 2.1 AA audit',
  '',
  '*Generated by `node scripts/a11y-colors.mjs` on 2026-10-17. Machine-readable twin: [a11y-colors.json](a11y-colors.json). Do not edit by hand — change the script and re-run it.*',
  '',
  'Thresholds: **4.5:1** for normal text, **3:1** for large text and for non-text UI (field boundaries, focus indicators, graphics needed to understand content). The root size is 17px, and no text on this site is large by WCAG’s measure except headings, so every text pair below is held to 4.5:1.',
  '',
  'The pink ground and the green accent are kept. A failing pair gets the smallest fix that clears it: an opacity removed, or the same hue and chroma at a lower CIELAB lightness. A change is flagged **noticeable** when ΔE\\*ab (CIE76) exceeds 5 or HSL lightness moves more than 5 points.',
  '',
  '| Role | Where | Foreground | Background | Before | Proposed | After | Change | Noticeable? |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) =>
    [
      r.role,
      r.where,
      '`' + r.foreground + '`' + (r.opacity < 1 ? ` at ${Math.round(r.opacity * 100)}% (renders \`${r.foreground_rendered}\`)` : ''),
      '`' + r.background + '`',
      fmt(r.ratio_before) + (r.passes_before ? ' ✓' : ` ✗ (needs ${r.threshold}:1)`),
      r.proposed ? '`' + r.proposed + '`' : '—',
      r.proposed ? fmt(r.ratio_after) + (r.passes_after ? ' ✓' : ' ✗') : '—',
      r.change === 'none' ? 'none' : r.change,
      r.proposed ? `${r.noticeable ? '**YES**' : 'no'} (ΔE ${r.delta_e}, L ${r.lightness_shift} pts)` : '—',
    ]
      .map((cell) => String(cell).replace(/\|/g, '\\|'))
      .join(' | ')
      .replace(/^/, '| ')
      .replace(/$/, ' |')
  ),
  '',
  '## Exempt pairs, with reasons',
  '',
  ...rows.filter((r) => r.reason).map((r) => `- **${r.role}** (${fmt(r.ratio_before)}): ${r.reason}`),
  '',
  '## What changed in the stylesheet',
  '',
  ...rows
    .filter((r) => r.proposed)
    .map((r) => `- **${r.role}** — ${r.change}. ${fmt(r.ratio_before)} → ${fmt(r.ratio_after)}.${r.noticeable ? ' Visibly different: flagged for the editors.' : ''}`),
  '',
  'No identity colour changed. `--paper`, `--accent`, `--accent-bright`, `--accent-deep`, `--ink`, `--ink-soft` and the salmon pink `#efa48f` hold their values.',
  '',
].join('\n');
writeFileSync(root('docs/a11y-colors.md'), md);

console.log(rows.map((r) => `${r.passes_after ? 'ok ' : 'NO '} ${fmt(r.ratio_before).padStart(8)} → ${fmt(r.ratio_after).padStart(8)}  ${r.role}`).join('\n'));
