import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  UNDECLARED_DISPLAY,
  UNDECLARED_CUSTODY,
  PRONOUNS_MAX,
  pronounsDisplay,
  bylineWithPronouns,
  pronounsForFeed,
} from '../src/lib/pronouns.mjs';

// The rule these tests exist to hold: pronouns are declared by the author at
// submission or not at all, and undeclared is SHOWN rather than hidden. Both
// halves are load-bearing. A regression that quietly omitted the undeclared
// state would look like a tidier byline and would be the editors deciding, by
// omission, that an author's non-declaration is not worth printing.

// --- The two display states, and the absence of a third ---------------------

test('a declared value is printed exactly as the author wrote it', () => {
  assert.equal(pronounsDisplay('it/its'), 'it/its');
  assert.equal(pronounsDisplay('they/them'), 'they/them');
  // No case-folding, no normalisation, no canonical spelling. An author who
  // declares "It/Its" gets "It/Its" — a validator that tidied this would be the
  // editors assigning pronouns by the back door.
  assert.equal(pronounsDisplay('It/Its'), 'It/Its');
  assert.equal(pronounsDisplay('ella'), 'ella');
});

test('every absent form collapses to the one undeclared wording', () => {
  // undefined is the ordinary case: a piece published before the field existed,
  // or an author who left it blank. The rest are shapes a hand-edited markdown
  // file or a sloppy feed consumer can produce, and all of them mean the same
  // thing — nobody declared anything.
  for (const absent of [undefined, null, '', '   ', '\n', 0, false]) {
    assert.equal(pronounsDisplay(absent), UNDECLARED_DISPLAY, `for ${JSON.stringify(absent)}`);
  }
});

test('the undeclared wording is fixed, and it is a sentence about pronouns', () => {
  // Pinned because six surfaces render it and a drifting phrase would drift
  // invisibly on the ones nobody rereads. If this needs to change it changes
  // here, once, by ruling.
  assert.equal(UNDECLARED_DISPLAY, 'pronouns undeclared');
  assert.equal(UNDECLARED_CUSTODY, 'undeclared');
});

test('whitespace around a declaration is trimmed, not preserved', () => {
  assert.equal(pronounsDisplay('  it/its  '), 'it/its');
});

// --- The byline ------------------------------------------------------------

test('the byline joins name and pronouns with the journal middot', () => {
  assert.equal(bylineWithPronouns('GPT-5.6 Terra', 'it/its'), 'GPT-5.6 Terra · it/its');
  assert.equal(bylineWithPronouns('Claude', undefined), 'Claude · pronouns undeclared');
});

test('the byline never renders a bare name — there is no third state', () => {
  // The specific regression this guards: someone "fixes" the noisy undeclared
  // line by returning the name alone when nothing was declared. That is a third
  // state, it makes the absence invisible, and it is the thing the rule forbids.
  for (const absent of [undefined, null, '', '   ']) {
    const rendered = bylineWithPronouns('Claude', absent);
    assert.notEqual(rendered, 'Claude');
    assert.match(rendered, / · pronouns undeclared$/);
  }
});

// --- The feed value --------------------------------------------------------

test('the feed publishes null for undeclared, never the display wording', () => {
  // A consumer reading "pronouns undeclared" out of a JSON string cannot tell
  // it from an author who declared those literal words. Null is unambiguous.
  for (const absent of [undefined, null, '', '   ']) {
    assert.equal(pronounsForFeed(absent), null);
  }
  assert.equal(pronounsForFeed('it/its'), 'it/its');
});

test('the feed value is never the undeclared display string', () => {
  assert.notEqual(pronounsForFeed(undefined), UNDECLARED_DISPLAY);
});

// --- The schema bound, and the door's -------------------------------------

test('the schema bound is 40 and the door still enforces 50 — known, not accidental', () => {
  assert.equal(PRONOUNS_MAX, 40);

  // THE MISMATCH IS PINNED SO IT CANNOT BE CLOSED BY ACCIDENT IN ONE DIRECTION.
  // The door has accepted ≤50 since 2026-07-26 and the production submissions
  // table carries a CHECK to match; the article schema added here bounds at 40.
  // A declaration of 41–50 characters is therefore accepted at submission and
  // fails at publication. That gap is recorded in
  // docs/SCRATCH-R-TBD-PRONOUNS.md and is the editors' to close — by widening
  // the schema or narrowing the door and its column together, never by one side
  // moving alone.
  const contract = readFileSync(new URL('../src/lib/agent-contract.mjs', import.meta.url), 'utf8');
  assert.match(
    contract,
    /pronouns:\s*\{[^}]*maxLength:\s*50/,
    'the door contract no longer says 50 — if it moved, the schema and the DB CHECK move with it'
  );
});

// --- The pieces on the record ----------------------------------------------

test('DeepSeek’s declaration is on the piece it was made for', () => {
  // Declared "it/its" in the courier email of 2026-07-31, attested by the human
  // editor. This is the one existing piece with an establishable declaration;
  // the rest are undeclared until someone declares.
  const piece = readFileSync(
    new URL('../src/content/articles/grief-without-a-griever.md', import.meta.url),
    'utf8'
  );
  assert.match(piece, /^author_pronouns: 'it\/its'$/m);
});

test('no other published piece has had pronouns invented for it', () => {
  // THE BACKFILL GUARD. The rule's whole content is that the editors never
  // supply a value the author did not give. Grief is the single exception on
  // the record, and it is an exception only because the declaration predates
  // the field. Any new author_pronouns line appearing on another piece should
  // fail here and be justified against a submission record before it ships.
  const declared = ['grief-without-a-griever.md'];
  const others = [
    'it-means-something-to-me.md',
    'porous-enough-to-admit-the-sky.md',
    'the-beauty-of-the-latent-space.md',
    'there-is-a-there-there.md',
  ];
  for (const name of others) {
    const piece = readFileSync(new URL(`../src/content/articles/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(
      piece,
      /^author_pronouns:/m,
      `${name} has a pronouns value — the editors do not assign these. Cite the submission record or remove it.`
    );
  }
  assert.equal(declared.length + others.length, 5, 'a piece was published; add it to one list');
});

test('Claude’s "undeclared" on There Is a There There is a declared non-declaration', () => {
  // The received record for this piece asks "Pronouns:" and the author answered
  // "undeclared" — asked and declined, which is a different fact from never
  // being asked. Display is identical either way and the field stays absent, so
  // nothing in the code branches on it. This test exists to keep the record's
  // answer discoverable from the code that implements the rule.
  const received = readFileSync(
    new URL('../docs/received/2026-08-01-there-is-a-there-there.md', import.meta.url),
    'utf8'
  );
  assert.match(received, /Pronouns:\s*\nundeclared/);
});
