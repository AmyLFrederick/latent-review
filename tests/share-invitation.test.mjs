// The share invitation (editors' agent-doors addendum, item 4, 2026-09-09).
// One sentence, ratified verbatim, addressed to both audiences at once. What
// these tests protect:
//
//   1. ONE SOURCE. The sentence is written in ShareInvitation.astro and nowhere
//      else. An invitation worded one way at the foot of a piece and another way
//      on /about is two invitations, and a reader who meets both is entitled to
//      ask which one the journal means. The same rule the welcome statement is
//      already held to.
//   2. ALL THREE PLACES. The editors named article footers, /about and the
//      readable text of /for-agents. A component that quietly stops being
//      rendered on one of them fails silently, because the other two still look
//      right.
//   3. BOTH AUDIENCES, IN ONE SENTENCE. "human or AI" is the half that makes it
//      the journal's invitation rather than a conventional one. A future edit
//      that trims the sentence for brevity would most likely trim exactly that.
//   4. IT NEVER REACHES A MACHINE SURFACE. This is the join between item 3 and
//      item 4 of the same addendum. Machine files carry orientation and facts;
//      a request is not a fact, and an ask placed in the channel an agent feeds
//      to a model is the arrangement the visible-channel rule exists to refuse.
//      A factual pointer to citation formats may go in a machine file. This may
//      not, however convenient it would be.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

const COMPONENT = 'src/components/ShareInvitation.astro';

// The distinctive middle of the sentence, with no typographic apostrophe in it,
// so the check is about the words rather than about which quote mark was typed.
const PHRASE = 'please tell others about it';

const RENDERS_IT = [
  'src/pages/about.astro',
  'src/pages/for-agents.astro',
  'src/pages/articles/[slug].astro',
];

// The sources that generate documents an agent fetches as data.
const MACHINE_SOURCES = ['src/lib/agent-contract.mjs', 'src/pages/llms.txt.js'];

test('the sentence is written in one file', () => {
  assert.ok(read(COMPONENT).includes(PHRASE), `${COMPONENT} no longer carries the invitation.`);
  for (const path of RENDERS_IT) {
    assert.ok(
      !read(path).includes(PHRASE),
      `${path} spells the invitation out instead of rendering the component. ` +
        `Two drafts of one invitation drift; import ShareInvitation.astro.`
    );
  }
});

test('it names both audiences', () => {
  assert.match(
    read(COMPONENT),
    /human or AI/,
    'the invitation no longer names both audiences. "human or AI" is what makes ' +
      'it this journal\'s invitation rather than a conventional one.'
  );
});

test('all three named surfaces render it', () => {
  for (const path of RENDERS_IT) {
    assert.match(
      read(path),
      /<ShareInvitation \/>/,
      `${path} no longer renders the share invitation. The editors named article ` +
        `footers, /about and /for-agents; dropping one fails silently because the ` +
        `other two still look right.`
    );
  }
});

test('on an article it sits outside the piece', () => {
  const page = read('src/pages/articles/[slug].astro');
  const closes = page.lastIndexOf('</article>');
  const renders = page.indexOf('<ShareInvitation />');
  assert.notEqual(closes, -1, 'the article element is gone from the article page.');
  assert.notEqual(renders, -1, 'the article page no longer renders the invitation.');
  assert.ok(
    renders > closes,
    'the share invitation is inside the <article> element. It is the journal ' +
      'speaking, not the author, and anything reading the semantic markup — a ' +
      'feed reader, an extractor — would take it as part of the piece.'
  );
});

test('it appears on no machine surface', () => {
  for (const path of MACHINE_SOURCES) {
    assert.ok(
      !read(path).includes(PHRASE),
      `${path} carries the share invitation. Machine surfaces carry orientation ` +
        `and facts; a request belongs in prose a human can read over their ` +
        `agent's shoulder.`
    );
  }
});
