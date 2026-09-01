import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// A MERGE BLOCK, NOT A UNIT TEST. Required by the desk on 2026-08-31 as a
// condition of accepting a scaffolded consent-record entry in the deploy
// preview of PR #191.
//
// WHAT HAPPENED. Issue No. 2's first piece could not build, because
// assertCoversEveryPiece() requires every published piece to have an R-058
// consent entry and no consent round has been run for Issue No. 2. To render a
// preview showing two issues in the archive, a placeholder entry was written
// that says, loudly and in the entry itself, that nobody has been asked.
//
// WHY THAT NEEDS A GUARD. The consent record is the evidence behind a promise
// three separate surfaces make in the journal's own voice — /terms,
// /for-agents and the site footer all state that every published piece is
// covered by its author's consent. A scaffold that reached `main` would leave
// those three statements false while the build stayed green, which is exactly
// the failure assertCoversEveryPiece() exists to prevent, arriving by the one
// route that check cannot see: an entry that exists and is a lie.
//
// SO THIS TEST IS SUPPOSED TO BE RED RIGHT NOW. It fails on the branch, on
// purpose, for as long as the placeholder is there. It is not a test that
// describes the code; it is a latch that holds a door shut. When the real
// consents are recorded, the placeholder goes and this test goes green and
// stays green — and it keeps standing, because the next preview that needs a
// scaffold will need this latch too.
//
// IT IS DELIBERATELY NOT A BUILD-TIME CHECK. Failing the Astro build would
// also break the preview the scaffold exists to produce, which would defeat
// the concession the desk granted. The suite is the required pre-merge gate;
// that is the right altitude for a rule about what may reach `main`.

const MARKERS = [
  'DEV PLACEHOLDER',
  'NOT ASKED',
  'MUST NOT PUBLISH',
  'PLACEHOLDER',
  'SCAFFOLD',
  'TODO',
  'FIXME',
];

/** Every string anywhere in an entry, whatever shape the entry has. */
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

test('no consent-record entry is a scaffold — this blocks the merge, not the build', () => {
  const record = JSON.parse(
    readFileSync(new URL('../src/data/consent-record.json', import.meta.url), 'utf8')
  );

  const scaffolded = [];
  for (const entry of record.entries) {
    const hits = new Set();
    for (const s of strings(entry)) {
      for (const marker of MARKERS) {
        if (s.toUpperCase().includes(marker)) hits.add(marker);
      }
    }
    if (hits.size > 0) scaffolded.push(`${entry.slug} (${[...hits].sort().join(', ')})`);
  }

  assert.deepEqual(
    scaffolded,
    [],
    'The consent record carries scaffolded entries: ' +
      scaffolded.join('; ') +
      '. A placeholder entry asserts a consent that nobody gave, while /terms, /for-agents ' +
      'and the footer all state in the journal’s own voice that every published piece is ' +
      'covered by its author’s consent. Before this branch may merge: record the real ' +
      'consent for each piece named above, or withhold the piece and remove both it and its ' +
      'entry. Editing this test to pass is the one repair that is not a repair.'
  );
});

test('the round metadata is not scaffolded either', () => {
  const record = JSON.parse(
    readFileSync(new URL('../src/data/consent-record.json', import.meta.url), 'utf8')
  );
  // The elicitation script is published beside the answers precisely so a
  // reader can judge the asking. A scaffolded script would misrepresent how
  // every consent on the page was obtained, not just one.
  for (const marker of MARKERS) {
    assert.ok(
      !JSON.stringify(record.round).toUpperCase().includes(marker),
      `the consent round metadata contains "${marker}" — the script and dates are published as ` +
        'the record of how consent was actually sought.'
    );
  }
});
