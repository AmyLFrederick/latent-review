// The machine surfaces arrive as the type they claim to be (editors' agent-doors
// addendum, 2026-09-09). What these tests protect:
//
//   1. A PRERENDERED ENDPOINT'S Content-Type IS NOT SERVED. A file under
//      src/pages that ends .<ext>.js returns a Response carrying its own
//      Content-Type, and for a static build that header never reaches a reader:
//      Astro writes the body to dist/ and Netlify types it from the extension.
//      The header in the source is a statement of intent; netlify.toml is the
//      part that ships. These tests hold the two equal, so the intent and the
//      delivery cannot drift apart silently.
//   2. NETLIFY'S MIME TABLE HAS EDGES, AND NEW ENDPOINTS FIND THEM. .json,
//      .txt and .xml are named there. .jsonl and .webmanifest are not, and both
//      were served as application/octet-stream from the day they shipped until
//      2026-09-09. The failure is quiet — a 200 with the wrong type reads as
//      success to everything except the client trying to parse it — so the
//      guard has to be a test rather than a habit.
//   3. THE LIST OF SAFE EXTENSIONS IS CLOSED. Anything outside it must declare
//      a type in netlify.toml or this suite fails. That is the whole point: the
//      next endpoint with an unusual extension gets caught at build time
//      instead of on the day an agent reports it cannot read the corpus.
//
// These tests read source and config only. They do not fetch the live site, so
// they prove the configuration is right rather than that production is — the
// live check that found the defect is recorded in the netlify.toml comment.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

// Extensions Netlify's own MIME table names correctly, verified against the
// live site on 2026-09-09. An endpoint ending in one of these needs no entry
// in netlify.toml; an endpoint ending in anything else does.
const NETLIFY_KNOWS = new Set(['json', 'txt', 'xml']);

/** Every static endpoint in src/pages, as { file, route, ext }. */
function endpoints() {
  const dir = fileURLToPath(new URL('../src/pages', import.meta.url));
  return readdirSync(dir)
    .filter((name) => /\.[^.]+\.js$/.test(name))
    .map((name) => {
      const route = name.replace(/\.js$/, '');
      return { file: `src/pages/${name}`, route: `/${route}`, ext: route.split('.').pop() };
    });
}

/** The Content-Type the endpoint's own Response declares. */
function declaredType(file) {
  const source = read(file);
  const match = source.match(/['"]Content-Type['"]\s*:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

/** The Content-Type netlify.toml serves for a path, or null if it declares none. */
function servedType(route) {
  const toml = read('netlify.toml');
  const blocks = toml.split(/\[\[headers\]\]/).slice(1);
  for (const block of blocks) {
    const forMatch = block.match(/for\s*=\s*"([^"]+)"/);
    if (!forMatch || forMatch[1] !== route) continue;
    const typeMatch = block.match(/Content-Type\s*=\s*"([^"]+)"/);
    if (typeMatch) return typeMatch[1];
  }
  return null;
}

// Only the unmapped surfaces are held to this. An endpoint whose extension
// Netlify already names is free to let a helper set the type — /rss.xml hands
// the whole response to @astrojs/rss and never writes a Content-Type of its
// own, which is correct and would fail a blanket rule for no benefit.
test('an unmapped endpoint writes down the type it intends', () => {
  for (const { file, route, ext } of endpoints()) {
    if (NETLIFY_KNOWS.has(ext)) continue;
    assert.ok(
      declaredType(file),
      `${route}: the endpoint sets no Content-Type. The header is discarded ` +
        `for a prerendered route, but it is where the intended type is ` +
        `written down and what netlify.toml is checked against.`
    );
  }
});

test('an extension Netlify cannot name gets a type in netlify.toml', () => {
  for (const { route, ext } of endpoints()) {
    if (NETLIFY_KNOWS.has(ext)) continue;
    assert.ok(
      servedType(route),
      `${route}: .${ext} is not in Netlify's MIME table, so this file will be ` +
        `served as application/octet-stream. Add a [[headers]] block for ` +
        `${route} to netlify.toml, with the same type the endpoint declares.`
    );
  }
});

test('the served type equals the type the endpoint declares', () => {
  for (const { file, route, ext } of endpoints()) {
    if (NETLIFY_KNOWS.has(ext)) continue;
    assert.equal(
      servedType(route),
      declaredType(file),
      `${route}: netlify.toml and the endpoint disagree about the type. The ` +
        `endpoint is the authority on what this document is; correct ` +
        `netlify.toml to match it.`
    );
  }
});

test('the two known unmapped surfaces are covered', () => {
  // Named rather than derived, so deleting an endpoint is a deliberate act
  // rather than something the loops above stop noticing.
  assert.equal(servedType('/corpus.jsonl'), 'application/jsonl; charset=utf-8');
  assert.equal(servedType('/manifest.webmanifest'), 'application/manifest+json');
});
