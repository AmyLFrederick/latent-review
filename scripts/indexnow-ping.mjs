// IndexNow ping — tell the participating search engines that this deploy
// changed something, instead of waiting to be crawled.
//
// Runs as `postbuild`, so `npm run build` triggers it and nothing else has to
// remember to. It is deliberately hard to make this script matter: it never
// fails a deploy, and it does nothing at all outside a Netlify production
// build.
//
// ---------------------------------------------------------------------------
// THE KEY IN public/ IS NOT A SECRET, AND MUST NOT BE MOVED INTO AN ENV VAR.
// ---------------------------------------------------------------------------
// IndexNow proves domain control by requiring the key to be publicly readable
// at https://<host>/<key>.txt, with the file containing the key and nothing
// else. Publishing it IS the mechanism. It is therefore not a violation of
// CLAUDE.md's no-secrets rule — there is no secret here to leak — and moving
// it to a Netlify environment variable would break verification outright,
// because the engines fetch the file, not our configuration.
//
// The key lives in exactly one place: the filename in public/, which is also
// its contents. This script derives it from that file rather than repeating it.
// ---------------------------------------------------------------------------
//
// WHICH ENGINES. IndexNow reaches Bing, Yandex, Seznam and Naver. It does NOT
// reach Google, which ignores the protocol. This is worth doing — it is cheap
// and it is the correct standard — but it is not "faster Google indexing", and
// nobody should be told it is.
//
// WHAT IT SUBMITS. The full URL set from the built sitemap, on production
// deploys only. The journal has a couple of dozen URLs and publishes an issue
// every two weeks, so the set is small; deploy previews and branch builds are
// excluded, which
// is the guard that actually matters. If deploy frequency ever rises enough
// that resubmitting unchanged URLs looks careless, the next step is to
// diff against the previous deploy's sitemap and submit only what moved.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const HOST = 'thelatentreview.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const PUBLIC_DIR = 'public';
const DIST_DIR = 'dist';

/** The key is the name of the only 32-hex .txt file in public/. */
async function readKey() {
  const entries = await readdir(PUBLIC_DIR);
  const keyFiles = entries.filter((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  if (keyFiles.length !== 1) {
    throw new Error(
      `expected exactly one IndexNow key file in ${PUBLIC_DIR}/, found ${keyFiles.length}`
    );
  }
  const key = keyFiles[0].replace(/\.txt$/, '');
  const contents = (await readFile(join(PUBLIC_DIR, keyFiles[0]), 'utf8')).trim();
  if (contents !== key) {
    throw new Error('IndexNow key file contents do not match its filename');
  }
  return key;
}

/** Every <loc> in every sitemap the build emitted. */
async function readSitemapUrls() {
  const entries = await readdir(DIST_DIR);
  const sitemaps = entries.filter((name) => /^sitemap.*\.xml$/.test(name));
  const urls = new Set();
  for (const name of sitemaps) {
    const xml = await readFile(join(DIST_DIR, name), 'utf8');
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = match[1].trim();
      // The index file lists the other sitemaps; those are not content.
      if (!/sitemap.*\.xml$/.test(url)) urls.add(url);
    }
  }
  return [...urls];
}

async function main() {
  if (process.env.CONTEXT !== 'production') {
    console.log(
      `IndexNow: skipped (CONTEXT=${process.env.CONTEXT ?? 'unset'}; submits on production deploys only).`
    );
    return;
  }

  const key = await readKey();
  const urlList = await readSitemapUrls();
  if (urlList.length === 0) {
    console.log('IndexNow: skipped (the built sitemap listed no URLs).');
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation: `https://${HOST}/${key}.txt`,
      urlList,
    }),
  });

  // 200 and 202 both mean accepted; 202 means the key is still being verified.
  console.log(`IndexNow: submitted ${urlList.length} URLs — HTTP ${res.status}.`);
}

// A discovery ping must never be the reason a deploy fails. Log and exit clean.
main().catch((err) => {
  console.log(`IndexNow: skipped (${err instanceof Error ? err.message : String(err)}).`);
});
