// The machine surfaces are declared, not merely published (editors' agent-doors
// addendum, item 2, 2026-09-09). What these tests protect:
//
//   1. THE DECLARATION EXISTS IN BOTH CHANNELS. An agent that parses HTML finds
//      rel="describedby" in the head; an agent that issues HEAD and reads
//      headers finds the same relation as an RFC 8288 Link header. Either alone
//      leaves out a real client, and the two are written in different files that
//      cannot read each other, so only a test can hold them equal.
//   2. THE RELATION STAYS TRUE. rel="describedby" asserts the target describes
//      this resource. llms.txt describes every page here and is declared on all
//      of them; issues.json describes the piece a reader is looking at and is
//      declared on article pages ALONE. The narrow one going site-wide would be
//      a claim about pages it does not describe, which is the failure the
//      existing rel="related" comment in Base.astro was written to prevent.
//   3. /for-agents NAMES EVERY MACHINE SURFACE. The page calls itself the
//      complete documentation. Until this pass it omitted /cfp.json entirely,
//      buried /agent-api.json in the submission sections, and never mentioned
//      security.txt — three surfaces discoverable only by already knowing they
//      existed. The list is checked against the addresses rather than trusted.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

// Every surface a machine reader can fetch, and where each is declared. The
// human-facing pages are not here: this is the machine roster.
const MACHINE_SURFACES = [
  '/llms.txt',
  '/issues.json',
  '/corpus.jsonl',
  '/feed.json',
  '/rss.xml',
  '/changelog.json',
  '/authors.json',
  '/cfp.json',
  '/agent-api.json',
  '/sitemap-index.xml',
  '/.well-known/security.txt',
];

test('the site-wide description is declared in the HTML head', () => {
  const base = read('src/layouts/Base.astro');
  assert.match(
    base,
    /rel="describedby"[\s\S]{0,200}href="\/llms\.txt"/,
    'Base.astro no longer declares llms.txt as the description of every page.'
  );
});

test('the per-article record is declared on articles alone', () => {
  const base = read('src/layouts/Base.astro');
  const at = base.indexOf('href="/issues.json"');
  assert.notEqual(at, -1, 'Base.astro no longer declares issues.json at all.');
  // The guard opens within a few lines of the href it wraps. Reading back from
  // the link is simpler than matching a JSX block, and it fails for the right
  // reason: someone moved the link out from under the condition.
  assert.match(
    base.slice(Math.max(0, at - 400), at),
    /\{articleMeta &&/,
    'the issues.json link is no longer guarded by articleMeta, so it now claims ' +
      'to describe pages it does not describe.'
  );
  // The narrow relation must not also appear unguarded. Counting is enough:
  // one occurrence means the only one is the guarded one.
  const occurrences = base.split('href="/issues.json"').length - 1;
  assert.equal(
    occurrences,
    1,
    'issues.json is declared more than once in Base.astro. It describes an ' +
      'article page and no other, so it belongs inside the articleMeta guard only.'
  );
});

test('the same relation ships as an HTTP Link header', () => {
  const toml = read('netlify.toml');
  const match = toml.match(/^\s*Link\s*=\s*"(.+)"\s*$/m);
  assert.ok(match, 'netlify.toml declares no Link header, so a HEAD request finds nothing.');
  assert.match(match[1], /<\/llms\.txt>/, 'the Link header no longer points at llms.txt.');
  assert.match(match[1], /rel=\\?"describedby\\?"/, 'the Link header no longer uses describedby.');
});

test('/for-agents names every machine surface', () => {
  const page = read('src/pages/for-agents.astro');
  for (const surface of MACHINE_SURFACES) {
    assert.ok(
      page.includes(`href="${surface}"`),
      `/for-agents does not link ${surface}. The page calls itself the complete ` +
        `documentation, so a surface missing from it is published only to whoever ` +
        `already knows the address.`
    );
  }
});
