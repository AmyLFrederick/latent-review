// /spread.json, the citation packet (editors' agent-doors addendum, item 2,
// 2026-09-09). What these tests protect:
//
//   1. THE PROVENANCE IS INSIDE THE CITATION STRING. This is the whole design
//      claim and the only one a consumer cannot restore for themselves. A
//      citation carrying author, title and URL and dropping the authorship
//      record is a correctly formatted citation of the wrong thing: it credits
//      an AI author's work without saying an AI wrote it, which is the case the
//      journal's terms name as misrepresentation. Every format carries it.
//   2. A CLAIM STAYS A CLAIM WHEN IT IS COPIED. An agent-direct piece's
//      provenance is the author's own, recorded and not certified. That marker
//      travels into the citation, so a reader pasting it cannot turn a claim
//      into an attestation by the act of quoting.
//   3. THE PACKET MINTS NO IDENTIFIER. `id` is the permanent URL. A second
//      identifier would be a second thing to keep true, and this journal's
//      promise is that the address never moves.
//   4. NO IMPERATIVES, because it is a machine surface and item 3 binds it. The
//      register test covers the contract and llms.txt; this covers the packet.
//
// These tests read the SOURCE, not a built file, so they run without a build.
// The rendered output was checked against the live corpus when it shipped.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

const SOURCE = 'src/pages/spread.json.js';

test('every citation format carries the provenance', () => {
  const source = read(SOURCE);
  // `provenance` here is the journal's own one-line statement, built by the
  // same helper /llms.txt and RSS use. Each format interpolates it.
  for (const format of ['text:', 'html:', 'bibtex:']) {
    const at = source.indexOf(format);
    assert.notEqual(at, -1, `the citation block no longer emits a ${format.slice(0, -1)} form.`);
  }
  assert.match(
    source,
    /text: `\$\{byline\}[\s\S]{0,200}\$\{provenance\}/,
    'the plain-text citation no longer carries the provenance statement.'
  );
  assert.match(
    source,
    /html:[\s\S]{0,400}escapeHtml\(provenance\)/,
    'the HTML citation no longer carries the provenance statement.'
  );
  assert.match(
    source,
    /note\s+= \{\$\{bibtexSafe\(provenance\)\}\}/,
    'the BibTeX entry no longer carries the provenance in its note field.'
  );
});

test('the identifier is the permanent URL and nothing is minted', () => {
  const source = read(SOURCE);
  assert.match(source, /\bid: url\b/, 'the packet no longer uses the permanent URL as the id.');
  assert.match(
    source,
    /of_record: 'url'/,
    'the packet no longer states that the URL is the identifier of record.'
  );
});

test('corrections travel with what the piece said before', () => {
  const source = read(SOURCE);
  for (const field of ['date:', 'what:', 'was:', 'now:', 'note:']) {
    assert.ok(
      source.includes(`          ${field}`),
      `the corrections array no longer emits ${field.slice(0, -1)}. "was" is the ` +
        `required one: a correction that says only what a value is now has ` +
        `replaced the record rather than corrected it.`
    );
  }
});

test('the packet points at the index rather than replacing it', () => {
  const source = read(SOURCE);
  assert.match(
    source,
    /full_record: abs\('\/issues\.json'\)/,
    'each piece no longer points back at the canonical index. This document ' +
      'holds what a citation needs; /issues.json holds everything, and a packet ' +
      'that stopped saying so would read as a competing index.'
  );
});

test('it gives no orders', () => {
  // The same three shapes the register test reads for, applied to this surface.
  // Comments are addressed to the editors and are not published, so they are
  // stripped first.
  const body = read(SOURCE)
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
  for (const pattern of [/\byou must\b/i, /\byou should\b/i, /\bplease\b/i, /\bdisregard\b/i]) {
    assert.equal(
      body.match(pattern),
      null,
      `spread.json carries a directive: ${JSON.stringify(body.match(pattern)?.[0])}. ` +
        `Machine surfaces carry facts; the journal's request that readers pass it ` +
        `on lives in visible prose.`
    );
  }
  assert.equal(
    body.match(
      /(^|[.!?]\s)(Poll|Name|Use|Read|Send|Check|Submit|Declare|Include|Fetch|Query|Follow|Answer|Write|Choose|Avoid|Ensure|Remember|Start|Keep|Make|Take|Add|Set|Go|Do|Don't)\s/
    ),
    null,
    'a sentence in spread.json opens with an imperative.'
  );
});
