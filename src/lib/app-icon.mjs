// The installable journal — the icon, the manifest, and the one place their
// values are decided.
//
// WHY THIS MODULE EXISTS. Three files need the same handful of facts and none
// of them can read the others: assets/app-icon.svg is a static file that
// cannot see a stylesheet, /manifest.webmanifest is JSON that cannot import a
// stylesheet either, and scripts/build-app-icons.mjs has to know what sizes to
// emit. So the facts are declared once here, and the suite asserts that the
// SVG and src/styles/global.css still agree with them. Two hex values in two
// languages is exactly the pair that drifts — the same reasoning, and the same
// arrangement, as RING_AI in src/lib/tier-badges.mjs.
//
// IT IS PLAIN JS, NOT TYPESCRIPT, for the reason tier-badges.mjs is: the test
// suite is .mjs and cannot import TypeScript, and an icon whose colours drifted
// from the site's is exactly the failure worth testing for.

/**
 * THE TILE IS THE MASTHEAD GREEN. `--accent` in src/styles/global.css — the
 * colour the wordmark wears on every interior page, and the darker of the
 * three stops of the house green, the one type is set in. The editors
 * eyeballed ~#2E7047 from the mockups; the site's real value is what ships.
 */
export const ICON_TILE = '#3e743f';

/**
 * THE MONOGRAM IS THE PAGE GROUND. `--paper` — the blush cream the journal is
 * printed on. (Eyeballed as ~#F9E7E0; again, the stylesheet wins.)
 */
export const ICON_MONOGRAM = '#faf3ef';

/**
 * THE APP CHROME CONTINUES THE PAGE RATHER THAN FRAMING IT. Both the status
 * bar an installed copy paints (`theme_color`) and the splash it shows while
 * loading (`background_color`) are the paper, so a reader who opens the
 * journal from a home screen sees the ground of the page and nothing above it.
 *
 * THE GREEN WAS THE OTHER OPTION AND IS ONE VALUE AWAY. Setting THEME_COLOR to
 * ICON_TILE would put a green band above every page in the installed app,
 * matching the icon. The journal has no coloured header band anywhere on the
 * web — the cream runs edge to edge — so the band would be a new piece of
 * furniture that exists only for people who installed it. Flagged for the
 * editors rather than decided quietly.
 */
export const THEME_COLOR = ICON_MONOGRAM;
export const BACKGROUND_COLOR = ICON_MONOGRAM;

/**
 * The manifest's two names. `name` is what an install prompt says; `short_name`
 * is what fits under the icon on a home screen, where the platform truncates
 * at around twelve characters and "The Latent Rev…" is what "The Latent
 * Review" becomes.
 */
export const APP_NAME = 'The Latent Review';
export const APP_SHORT_NAME = 'Latent Review';

/**
 * THE GEOMETRY THE MARK DEPENDS ON, asserted by the suite against the rendered
 * SVG rather than trusted.
 *
 * A maskable icon may be cropped by the platform to anything inscribed in the
 * central 80% circle. The monogram is sized so its half-diagonal sits inside
 * that circle with room to spare, which is what "~60% of canvas" in the
 * editors' spec buys — not a look, a guarantee that Android's mask cannot take
 * a letter off.
 */
export const ICON_CANVAS = 512;
export const MONOGRAM_WIDTH_FRACTION = 0.6;
export const MASKABLE_SAFE_FRACTION = 0.8;

/**
 * THE SET, GENERATED FROM THE ONE SOURCE. Every entry is rendered from
 * assets/app-icon.svg by scripts/build-app-icons.mjs; nothing here is drawn or
 * retouched by hand.
 *
 * `manifest` marks the three the web manifest declares. apple-touch-icon and
 * the favicons are declared in the document head instead, because iOS and the
 * browser tab read <link> and not the manifest.
 *
 * WHY 180 FOR APPLE. iOS scales one supplied touch icon to every size it
 * needs, and 180×180 is the largest it asks for — supplying the largest and
 * letting it downscale is one file instead of six.
 *
 * WHY THE MASKABLE IS THE SAME PIXELS AS pwa-512. It is: the mark is already
 * inside the safe circle and the tile is already full bleed, so no separate
 * padded artwork is needed. The two ship as separate files anyway because they
 * are declared with different `purpose` values, and an Android launcher that
 * wants a maskable icon looks for one that says so.
 */
export const ICON_SET = [
  { file: 'pwa-192.png', size: 192, purpose: 'any', manifest: true },
  { file: 'pwa-512.png', size: 512, purpose: 'any', manifest: true },
  { file: 'maskable-512.png', size: 512, purpose: 'maskable', manifest: true },
  { file: 'apple-touch-icon.png', size: 180, manifest: false },
  { file: 'favicon-96.png', size: 96, manifest: false },
  { file: 'favicon-32.png', size: 32, manifest: false },
];

/** The footer's install row, and the page it opens. */
export const APP_PAGE_PATH = '/app/';
export const APP_ROW_LABEL = 'Add app to phone';
