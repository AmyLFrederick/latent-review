// Render the house share card: assets/share-card.svg → public/share-card.png.
//
// This is a one-off regeneration tool, NOT part of the build. The committed
// PNG in public/ is the artifact the site serves; this script exists so the
// lockup can be edited as type rather than retouched as a picture.
//
// FONT PREREQUISITE. The card is set in the journal's own faces — EB Garamond,
// Source Serif 4, IBM Plex Mono. The renderer resolves them through
// fontconfig, i.e. from the system, and the repository ships them only as the
// .woff2 files @fontsource installs into node_modules, which fontconfig cannot
// read. Before running this, convert and install them:
//
//   pip3 install fonttools brotli
//   python3 - <<'PY'
//   from fontTools.ttLib import TTFont
//   for src, out in [
//     ('node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2',
//      '~/.fonts/EBGaramondVariable.ttf'),
//     ('node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
//      '~/.fonts/SourceSerif4Variable.ttf'),
//     ('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
//      '~/.fonts/IBMPlexMono-Regular.ttf'),
//   ]:
//       f = TTFont(src); f.flavor = None; f.save(os.path.expanduser(out))
//   PY
//   fc-cache -f
//
// If the faces are missing, the renderer silently substitutes whatever serif
// it can find and the card comes out wrong rather than failing — so this
// script checks for them first and refuses, which is the failure mode you
// want. No font binary is committed to this repository.

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'assets/share-card.svg';
const OUT = 'public/share-card.png';
const REQUIRED = ['EB Garamond', 'Source Serif 4', 'IBM Plex Mono'];

function installedFamilies() {
  try {
    return execFileSync('fc-list', [':', 'family'], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

const available = installedFamilies();
const missing = REQUIRED.filter((family) => !available.includes(family));
if (missing.length > 0) {
  console.error(
    `Refusing to render: the journal's faces are not installed — missing ${missing.join(', ')}.\n` +
      'See the font prerequisite at the top of this file. Rendering without them would\n' +
      'produce a substituted card that looks almost right, which is worse than no card.'
  );
  process.exit(1);
}

const svg = await readFile(SRC);
const png = await sharp(svg, { density: 144 }).resize(1200, 630).png().toBuffer();
await writeFile(OUT, png);

const { width, height } = await sharp(png).metadata();
console.log(`Rendered ${OUT} — ${width}×${height}, ${(png.length / 1024).toFixed(1)} kB.`);
