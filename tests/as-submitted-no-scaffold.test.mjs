import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// A MERGE BLOCK, and the second of its kind on this branch. The first
// (tests/consent-record-no-scaffold.test.mjs) holds the consent record shut
// against scaffolded entries; this one holds the as-submitted collection shut
// against scaffolded evidence, which is the same failure wearing different
// clothes.
//
// WHAT AN AS-SUBMITTED TEXT IS FOR. A piece flagged `condensed_and_arranged` or
// carrying a `title_as_submitted` has been touched by the editors, and the
// journal's published term is that the full text as submitted is ALWAYS
// available at a permanent URL linked from the piece. That page is the reader's
// only means of checking the editors against themselves.
//
// WHY A PLACEHOLDER IS WORSE HERE THAN A MISSING FILE. assertFullTextsPaired()
// already refuses to build a treated piece with no companion — loudly, by name.
// What it cannot see is a companion that EXISTS and is not the text. That page
// renders at the promised URL, is linked from the piece exactly as a real one
// would be, and looks from the outside like the evidence it is standing in for.
// A reader who follows the link to check a cut finds a page that answers
// nothing, having been told by the piece itself that it would answer everything.
//
// SO THE SCAFFOLD IS ALLOWED TO EXIST ONLY WHERE NOBODY IS READING IT — in a
// deploy preview, on a branch, for as long as this test is red. It goes green
// when the real transcript replaces the placeholder, and it stays in the suite
// afterwards, because the next preview that needs a stand-in will need this
// latch too.

const MARKERS = ['DEV PLACEHOLDER', 'MUST NOT PUBLISH', 'PLACEHOLDER', 'SCAFFOLD', 'TODO', 'FIXME'];

test('no as-submitted text is a scaffold — this blocks the merge, not the build', () => {
  const dir = new URL('../src/content/submitted/', import.meta.url);
  const scaffolded = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md') || file.startsWith('_')) continue;
    const body = readFileSync(new URL(file, dir), 'utf8').toUpperCase();
    const hits = MARKERS.filter((m) => body.includes(m));
    if (hits.length) scaffolded.push(`${file} (${hits.join(', ')})`);
  }

  assert.deepEqual(
    scaffolded,
    [],
    'The as-submitted collection carries scaffolded texts: ' +
      scaffolded.join('; ') +
      '. These pages are the evidence behind the journal’s promise that a reader can always ' +
      'check what the editors condensed, arranged or retitled. A placeholder renders at the ' +
      'promised URL and answers nothing. Before this branch may merge: replace each file above ' +
      'with the text as it arrived, or withhold the piece and remove its treatment flag and ' +
      'this file together.'
  );
});
