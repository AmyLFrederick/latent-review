// The app icon and the web manifest (editors' spec, 2026-09-02). What these
// tests protect:
//
//   1. THE JOURNAL HAS ONE GREEN AND ONE CREAM, and the icon uses those and not
//      approximations of them. The colours are written down in three places
//      that cannot read each other — a stylesheet, a static SVG, and a JS
//      module — so the suite is the only thing that can hold them equal.
//   2. The mark is FULL BLEED with no transparency, because iOS composites a
//      transparent area to black and would put a black square on a home screen.
//   3. The monogram stays inside the MASKABLE SAFE CIRCLE, so an Android
//      launcher's crop takes tile and never a letter. This is the assertion
//      that makes the font-size in the SVG a geometry decision rather than a
//      taste one.
//   4. The icon set is COMPLETE and its declarations are consistent: the
//      maskable file says maskable, the manifest declares only files the set
//      actually renders, and Apple's single tag gets the largest size iOS asks
//      for.
//
// THE GEOMETRY TEST RENDERS, AND SO IT DEPENDS ON A FONT. EB Garamond is
// resolved from the system, not from node_modules (see the prerequisite at the
// top of scripts/build-share-card.mjs). Where it is absent the geometry test
// skips rather than failing, because a missing face on a contributor's machine
// is not a defect in the icon; every other test here is pure and always runs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ICON_TILE,
  ICON_MONOGRAM,
  THEME_COLOR,
  BACKGROUND_COLOR,
  ICON_SET,
  ICON_CANVAS,
  MONOGRAM_WIDTH_FRACTION,
  MASKABLE_SAFE_FRACTION,
  APP_NAME,
  APP_SHORT_NAME,
  APP_PAGE_PATH,
} from '../src/lib/app-icon.mjs';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

const css = read('src/styles/global.css');
const svg = read('assets/app-icon.svg');

/** The value of a custom property declared on :root, exactly. */
function cssToken(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  assert.ok(match, `global.css declares --${name}`);
  return match[1].toLowerCase();
}

test('the tile is the masthead green and the monogram is the page ground', () => {
  // The two colours the editors named, read out of the stylesheet that owns
  // them. If either moves, this fails and the icon is regenerated — which is
  // the intended outcome, not an inconvenience.
  assert.equal(ICON_TILE, cssToken('accent'));
  assert.equal(ICON_MONOGRAM, cssToken('paper'));
});

test('the icon source paints those exact colours and nothing else', () => {
  const fills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{3,8})"/g)].map((m) => m[1].toLowerCase());
  assert.deepEqual(new Set(fills), new Set([ICON_TILE, ICON_MONOGRAM]));
});

test('the tile is full bleed, drawn first, with no transparency anywhere', () => {
  // A rect the full size of the canvas, before any other paint. Both halves
  // matter: an undersized rect leaves transparent margin, and a rect drawn
  // after the text hides the monogram.
  const rect = svg.match(/<rect\s+width="(\d+)"\s+height="(\d+)"\s+fill="([^"]+)"\s*\/>/);
  assert.ok(rect, 'the source opens with a single full-canvas rect');
  assert.equal(Number(rect[1]), ICON_CANVAS);
  assert.equal(Number(rect[2]), ICON_CANVAS);
  assert.equal(rect[3].toLowerCase(), ICON_TILE);
  assert.ok(svg.indexOf('<rect') < svg.indexOf('<text'), 'the tile is painted before the mark');

  // Nothing may declare itself transparent, at any opacity. iOS turns all of
  // it black.
  assert.doesNotMatch(svg, /fill="none"/);
  assert.doesNotMatch(svg, /opacity=/);
  assert.doesNotMatch(svg, /fill="transparent"/);
});

test('the app chrome takes colours the site actually uses', () => {
  // Not an assertion about WHICH token — that is the editors' call, and the
  // module records the alternative. It is an assertion that neither value is a
  // hex somebody typed: both must be a colour the stylesheet declares.
  const declared = new Set([cssToken('paper'), cssToken('accent'), cssToken('paper-raised')]);
  assert.ok(declared.has(THEME_COLOR), 'theme_color is one of the site’s own colours');
  assert.ok(declared.has(BACKGROUND_COLOR), 'background_color is one of the site’s own colours');
});

test('the icon set is complete and consistently declared', () => {
  const byFile = new Map(ICON_SET.map((icon) => [icon.file, icon]));

  // The three the editors specified, at the sizes they specified.
  assert.equal(byFile.get('pwa-192.png')?.size, 192);
  assert.equal(byFile.get('pwa-512.png')?.size, 512);
  assert.equal(byFile.get('maskable-512.png')?.size, 512);

  // iOS scales one file to everything it needs, and 180 is the largest it
  // asks for. Supplying anything smaller means a soft icon on a modern phone.
  assert.equal(byFile.get('apple-touch-icon.png')?.size, 180);

  // Exactly one file is offered to a launcher as maskable, and it says so.
  const maskable = ICON_SET.filter((icon) => icon.purpose === 'maskable');
  assert.equal(maskable.length, 1);
  assert.equal(maskable[0].file, 'maskable-512.png');

  // Every icon the manifest will declare carries a purpose; every icon it will
  // not declare is reached from a <link> instead and needs none.
  for (const icon of ICON_SET) {
    assert.equal(typeof icon.file, 'string');
    assert.ok(Number.isInteger(icon.size) && icon.size > 0);
    if (icon.manifest) assert.ok(icon.purpose, `${icon.file} declares a purpose`);
  }
  assert.equal(ICON_SET.filter((icon) => icon.manifest).length, 3);
});

test('the app has a name that fits under an icon, and a page to explain itself', () => {
  assert.equal(APP_NAME, 'The Latent Review');
  // A home screen truncates around twelve characters; the short name is what
  // survives that, and it must still name the journal.
  assert.ok(APP_SHORT_NAME.length <= 14, 'short_name survives a home screen');
  assert.match(APP_SHORT_NAME, /Latent Review/);
  assert.match(APP_PAGE_PATH, /^\/[a-z-]+\/$/, 'the install page has a trailing-slash path');
});

test('the monogram stays inside the maskable safe circle', async (t) => {
  let families = '';
  try {
    families = execFileSync('fc-list', [':', 'family'], { encoding: 'utf8' });
  } catch {
    /* fontconfig absent; handled below */
  }
  if (!families.includes('EB Garamond')) {
    t.skip('EB Garamond is not installed on this system — see build-share-card.mjs');
    return;
  }

  const { default: sharp } = await import('sharp');
  const source = readFileSync(fileURLToPath(new URL('../assets/app-icon.svg', import.meta.url)));

  // Trim the tile away; what is left is the monogram's ink box. No .resize()
  // in this chain: sharp runs trim BEFORE resize whatever the call order, so
  // resizing first would report the full canvas and this test would pass on
  // anything. The source is authored at ICON_CANVAS already.
  const { info } = await sharp(source).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });

  const safeRadius = (ICON_CANVAS * MASKABLE_SAFE_FRACTION) / 2;
  const halfDiagonal = Math.hypot(info.width / 2, info.height / 2);
  assert.ok(
    halfDiagonal < safeRadius,
    `monogram half-diagonal ${halfDiagonal.toFixed(1)}px must stay inside ${safeRadius}px`
  );

  // The editors' spec is ~60% of the canvas at the widest. Held to a point
  // either side, which is tight enough to catch an edit to the font size and
  // loose enough not to fail on a fontconfig hinting difference.
  const widthFraction = info.width / ICON_CANVAS;
  assert.ok(
    Math.abs(widthFraction - MONOGRAM_WIDTH_FRACTION) < 0.01,
    `monogram is ${(widthFraction * 100).toFixed(1)}% of canvas, spec is ${MONOGRAM_WIDTH_FRACTION * 100}%`
  );

  // And it is centred: an off-centre mark survives the mask and still looks
  // like a mistake on a home screen.
  const centreX = -info.trimOffsetLeft + info.width / 2;
  const centreY = -info.trimOffsetTop + info.height / 2;
  assert.ok(Math.abs(centreX - ICON_CANVAS / 2) < 3, `horizontally centred (${centreX})`);
  assert.ok(Math.abs(centreY - ICON_CANVAS / 2) < 3, `vertically centred (${centreY})`);
});
