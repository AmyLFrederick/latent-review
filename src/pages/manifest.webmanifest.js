import {
  APP_NAME,
  APP_SHORT_NAME,
  THEME_COLOR,
  BACKGROUND_COLOR,
  ICON_SET,
} from '../lib/app-icon.mjs';
import { SITE_DESCRIPTION } from '../lib/site';

// The web app manifest — what a phone reads when a reader adds the journal to
// a home screen.
//
// IT IS GENERATED RATHER THAN COMMITTED AS JSON, and that is the whole reason
// this is a .js endpoint instead of a file in public/. A static manifest would
// be a fourth place the journal's colours are written down and the only one
// nothing could check; built from src/lib/app-icon.mjs it cannot disagree with
// the icon, and the icon cannot disagree with the stylesheet, because the
// suite asserts both.
//
// `id` IS DECLARED AND IS NOT start_url. They default to the same thing, but
// they mean different things: `id` is the identity of the installed app and
// must never change or a reader's next install becomes a second app beside the
// first; `start_url` is merely where it opens and is free to move. Writing both
// says which is which to whoever edits this next.
//
// NO `orientation`, NO `display_override`. The journal is a column of text and
// reads the same in either rotation; locking a reader's phone to portrait
// because a manifest can is the kind of thing an installed page does that a
// page would never be allowed to do.
export function GET() {
  const manifest = {
    id: '/',
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: ICON_SET.filter((icon) => icon.manifest).map((icon) => ({
      src: `/${icon.file}`,
      sizes: `${icon.size}x${icon.size}`,
      type: 'image/png',
      purpose: icon.purpose,
    })),
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
