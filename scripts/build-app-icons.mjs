// Render the app icon set: assets/app-icon.svg → the PNGs and favicons in
// public/.
//
// A one-off regeneration tool, NOT part of the build — the same arrangement as
// scripts/build-share-card.mjs, and for the same reason: the committed files in
// public/ are the artifacts the site serves, and this script exists so the mark
// can be edited as type rather than retouched as a picture.
//
//   node scripts/build-app-icons.mjs
//
// FONT PREREQUISITE. The monogram is set in EB Garamond, the journal's display
// face. The renderer resolves faces through fontconfig, i.e. from the system,
// and this repository ships the face only as the .woff2 @fontsource installs
// into node_modules, which fontconfig cannot read. The conversion recipe is at
// the top of scripts/build-share-card.mjs; it installs the same three faces and
// only the first is needed here.
//
// If the face is missing the renderer silently substitutes whatever serif it
// can find, and the icon comes out subtly wrong rather than failing — so this
// script checks first and refuses. No font binary is committed to this
// repository.
//
// WHAT IT ALSO CHECKS. Before writing anything it measures the rendered
// monogram and refuses if it has grown outside the maskable safe circle. That
// check is the reason the font size in the SVG is a geometry decision and not
// only a visual one; tests/app-icon.test.mjs asserts the same thing so a bad
// edit fails in CI whether or not anyone reruns this script.

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  ICON_SET,
  ICON_CANVAS,
  MASKABLE_SAFE_FRACTION,
  MONOGRAM_WIDTH_FRACTION,
} from '../src/lib/app-icon.mjs';

const SRC = 'assets/app-icon.svg';
const OUT_DIR = 'public';
const REQUIRED_FAMILY = 'EB Garamond';

function installedFamilies() {
  try {
    return execFileSync('fc-list', [':', 'family'], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

if (!installedFamilies().includes(REQUIRED_FAMILY)) {
  console.error(
    `Refusing to render: ${REQUIRED_FAMILY} is not installed on this system.\n` +
      'See the font prerequisite at the top of scripts/build-share-card.mjs.\n' +
      'Rendering without it would produce a substituted monogram that looks almost\n' +
      'right, which is worse than no icon.'
  );
  process.exit(1);
}

const svg = await readFile(SRC);

// THE GEOMETRY GATE. Trim the tile away and what is left is the monogram's ink
// box; if its half-diagonal escapes the central 80% circle, a platform mask can
// clip a letter.
//
// NO .resize() IN THIS CHAIN, AND IT IS NOT AN OMISSION. sharp applies its
// operations in a fixed pipeline order rather than in call order, and trim runs
// BEFORE resize — so a chain that resizes to 512 and then trims reports the
// resized 512×512, i.e. no trim at all, and the gate silently measures the
// whole canvas. The source is authored at 512 already, so there is nothing to
// resize; tests/app-icon.test.mjs measures the same way for the same reason.
const { info } = await sharp(svg).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
const halfDiagonal = Math.hypot(info.width / 2, info.height / 2);
const safeRadius = (ICON_CANVAS * MASKABLE_SAFE_FRACTION) / 2;
const widthFraction = info.width / ICON_CANVAS;

if (halfDiagonal > safeRadius) {
  console.error(
    `Refusing to render: the monogram escapes the maskable safe circle — ` +
      `half-diagonal ${halfDiagonal.toFixed(1)}px against a ${safeRadius}px radius.\n` +
      `Reduce the font-size in ${SRC}.`
  );
  process.exit(1);
}

console.log(
  `Monogram: ${info.width}×${info.height}px — ` +
    `${(widthFraction * 100).toFixed(1)}% of canvas (spec ~${MONOGRAM_WIDTH_FRACTION * 100}%), ` +
    `half-diagonal ${halfDiagonal.toFixed(1)}px inside the ${safeRadius}px safe radius.`
);

// NO ALPHA CHANNEL ON ANY OUTPUT. iOS composites transparency to black, so a
// stray transparent pixel is a black notch on a home screen. The artwork is
// full bleed already; flattening onto the tile makes that structural rather
// than something the SVG has to keep getting right.
async function render(size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: '#3e743f' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const rendered = new Map();
for (const { file, size } of ICON_SET) {
  const png = await render(size);
  rendered.set(file, png);
  await writeFile(`${OUT_DIR}/${file}`, png);
  console.log(`  ${OUT_DIR}/${file} — ${size}×${size}, ${(png.length / 1024).toFixed(1)} kB`);
}

// THE SERVED SVG FAVICON is this source with its commentary stripped. The
// comment is for whoever edits the mark and is a third of the file's bytes on
// a request that every page makes; the markup is otherwise identical, which is
// what keeps the tab and the home screen the same picture.
const servedSvg = svg.toString('utf8').replace(/<!--[\s\S]*?-->\s*/g, '');
await writeFile(`${OUT_DIR}/favicon.svg`, servedSvg);
console.log(`  ${OUT_DIR}/favicon.svg — ${(Buffer.byteLength(servedSvg) / 1024).toFixed(1)} kB`);

// THE .ICO IS WRITTEN BY HAND because sharp cannot emit one, and the format is
// small enough that a dependency would cost more than it saves: a 6-byte
// header, one 16-byte directory entry, and a PNG. PNG-compressed ICOs are read
// by every browser that still reads .ico at all (Vista onward), which is the
// entire remaining audience for the format.
function ico(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size < 256 ? size : 0, 0); // width  (0 means 256)
  entry.writeUInt8(size < 256 ? size : 0, 1); // height
  entry.writeUInt8(0, 2); // palette size — 0 for truecolour
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12); // offset of the data
  return Buffer.concat([header, entry, png]);
}

const icoBuffer = ico(rendered.get('favicon-32.png'), 32);
await writeFile(`${OUT_DIR}/favicon.ico`, icoBuffer);
console.log(`  ${OUT_DIR}/favicon.ico — 32×32, ${(icoBuffer.length / 1024).toFixed(1)} kB`);
