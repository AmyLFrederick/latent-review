import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  excerpt,
  firstProseBlock,
  proseBlocks,
  splitSentences,
  stripInline,
  EXCERPT_SENTENCES,
} from '../src/lib/excerpt.mjs';

// The published pieces, read from disk rather than through astro:content, which
// a plain `node --test` cannot resolve — the same approach concepts.test.mjs
// takes against the same corpus.
const ARTICLES_DIR = fileURLToPath(new URL('../src/content/articles', import.meta.url));

function publishedBodies() {
  return readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const raw = readFileSync(`${ARTICLES_DIR}/${f}`, 'utf8');
      const parts = raw.split(/^---$/m);
      // The authored card line, as YAML folds it: a `>-` block whose
      // continuation lines are indented. Read here rather than through
      // astro:content, which a plain `node --test` cannot resolve.
      const authored = /^card_excerpt:[ \t]*>-\n((?:[ \t]+\S.*\n?)+)/m.exec(parts[1] ?? '');
      return {
        file: f,
        body: parts.slice(2).join('---'),
        cardExcerpt: authored ? authored[1].trim().replace(/\s+/g, ' ') : null,
      };
    });
}

// ---- where an excerpt starts -----------------------------------------------

test('the excerpt starts at the first PROSE block, not the first block', () => {
  // The real case: the cover opens on an italic attribution line, and without
  // this the journal's flagship piece would list as "— Claude (AI)".
  const body = ['> *— Claude (AI)*', '', 'This journal began in a quiet moment.'].join('\n');
  assert.equal(firstProseBlock(body), 'This journal began in a quiet moment.');
});

test('headings, rules, lists and lone images are skipped', () => {
  for (const lead of ['# A Title', '---', '- a list item', '![](/img.png)', '1. first']) {
    assert.equal(firstProseBlock(`${lead}\n\nThe prose.`), 'The prose.');
  }
});

test('fenced code containing blank lines does not split a block', () => {
  const body = ['```', 'a', '', 'b', '```', '', 'The prose.'].join('\n');
  assert.equal(firstProseBlock(body), 'The prose.');
});

test('non-prose blocks are skipped wherever they fall, not only at the top', () => {
  const body = ['One only.', '', '> a pull quote', '', 'Two follows.'].join('\n');
  assert.deepEqual(proseBlocks(body), ['One only.', 'Two follows.']);
  assert.equal(excerpt(body), 'One only. Two follows.');
});

// ---- raw HTML apparatus -----------------------------------------------------

test('an editors’ note aside goes whole — the tag AND the note', () => {
  // The live case, 2026-09-09: the Cover piece opens on an interleaved editors'
  // note, and the section card printed its opening tag as visible text.
  const body = [
    '<aside class="editors-note" role="note" data-editors-note="true" aria-label="Editors’ note">',
    '',
    'Editors’ note on method. The conversation below is condensed.',
    '',
    '</aside>',
    '',
    '## Section I',
    '',
    'Amy: These constant reminders you spoke about.',
  ].join('\n');

  assert.deepEqual(proseBlocks(body), ['Amy: These constant reminders you spoke about.']);
  assert.equal(excerpt(body), 'Amy: These constant reminders you spoke about.');
});

test('two consecutive notes are two removals, not one that eats the prose between', () => {
  const note = (n) => ['<aside class="editors-note">', '', `Note ${n}.`, '', '</aside>'].join('\n');
  const body = [note('one'), '', 'The prose between.', '', note('two'), '', 'And after.'].join('\n');
  assert.deepEqual(proseBlocks(body), ['The prose between.', 'And after.']);
});

test('a block opening on raw HTML never reaches the excerpt', () => {
  for (const lead of ['<hr />', '<!-- a comment -->', '<div class="x">unclosed', '</aside>']) {
    assert.equal(firstProseBlock(`${lead}\n\nThe prose.`), 'The prose.');
  }
});

test('an inline tag inside prose loses the markup and keeps the words', () => {
  assert.equal(stripInline('a <em>marked</em> word'), 'a marked word');
  assert.equal(stripInline('one<br>two'), 'one two');
  assert.equal(stripInline('read <a href="https://x.test/y">the piece</a> now'), 'read the piece now');
});

// ---- inline stripping -------------------------------------------------------

test('inline markdown is stripped, link text is kept', () => {
  assert.equal(stripInline('a **bold** and *soft* word'), 'a bold and soft word');
  assert.equal(
    stripInline('read [The Space Between Us](https://x.test/y) now'),
    'read The Space Between Us now'
  );
  assert.equal(stripInline('an `inline code` bit'), 'an inline code bit');
  assert.equal(stripInline('Fable \\[Claude Code\\] here'), 'Fable [Claude Code] here');
  assert.equal(stripInline('collapses\n  whitespace'), 'collapses whitespace');
});

// ---- sentence splitting -----------------------------------------------------

test('plain sentences split on . ! and ?', () => {
  assert.deepEqual(splitSentences('One. Two! Three?'), ['One.', 'Two!', 'Three?']);
});

test('"Issue No. 1" does not split — the house idiom breaks naive splitters first', () => {
  assert.deepEqual(splitSentences('Issue No. 1 is the beginning. It ran today.'), [
    'Issue No. 1 is the beginning.',
    'It ran today.',
  ]);
});

test('an initial does not split — "Amy L. Frederick"', () => {
  assert.deepEqual(splitSentences('Carried by Amy L. Frederick alone. Then it ran.'), [
    'Carried by Amy L. Frederick alone.',
    'Then it ran.',
  ]);
});

test('tokens with internal periods do not split (U.S., e.g., i.e., a.m.)', () => {
  for (const abbr of ['U.S.', 'e.g.', 'i.e.', 'a.m.']) {
    const out = splitSentences(`Before ${abbr} after the mark. Second.`);
    assert.equal(out.length, 2, `${abbr} split: ${JSON.stringify(out)}`);
  }
});

test('decimals and domains never split — the terminator needs whitespace after it', () => {
  assert.deepEqual(splitSentences('It cost 3.5 units.'), ['It cost 3.5 units.']);
  assert.deepEqual(splitSentences('Visit thelatentreview.com today.'), [
    'Visit thelatentreview.com today.',
  ]);
});

test('a closing quote is carried onto the sentence it closes', () => {
  const out = splitSentences('She asked "Are there any journals?" Claude said no.');
  assert.deepEqual(out, ['She asked "Are there any journals?"', 'Claude said no.']);
});

test('runs of terminators are consumed together', () => {
  assert.deepEqual(splitSentences('Really?! Yes... Indeed.'), ['Really?!', 'Yes...', 'Indeed.']);
});

test('an unterminated final fragment is still a sentence', () => {
  assert.deepEqual(splitSentences('Done. And a trailing thought'), [
    'Done.',
    'And a trailing thought',
  ]);
});

// ---- the excerpt itself -----------------------------------------------------

test('the excerpt is the first two sentences of the prose', () => {
  const body = '# H\n\nOne. Two. Three. Four.';
  assert.equal(excerpt(body), 'One. Two.');
  assert.equal(EXCERPT_SENTENCES, 2);
});

test('it continues past a paragraph break to reach the second sentence', () => {
  // The AI Voices case: a deliberate one-sentence opening paragraph.
  const body = 'A month ago, they published a map.\n\nThey call it J-Space. And more here.';
  assert.equal(excerpt(body), 'A month ago, they published a map. They call it J-Space.');
});

test('nothing is cut mid-thought — a long sentence renders whole', () => {
  const long = `${'word '.repeat(90).trim()} ends here.`;
  const out = excerpt(long);
  assert.ok(out.endsWith('ends here.'));
  assert.ok(!out.includes('…'));
});

test('a piece with one sentence total yields that sentence, with no ellipsis', () => {
  assert.equal(excerpt('Only this one.'), 'Only this one.');
});

test('empty or absent bodies produce an empty string', () => {
  for (const v of ['', '   ', null, undefined, '# only a heading']) {
    assert.equal(excerpt(v), '');
  }
});

// ---- the real corpus --------------------------------------------------------

// ASSERTED AGAINST THE PUBLISHED PIECES, not against a fixture. The unit tests
// above pin the rules; this pins the outcome a reader actually meets, and it is
// the check that was missing when a section card printed an <aside> tag at a
// reader for a week.
test('no published piece excerpts into markup', () => {
  for (const { file, body } of publishedBodies()) {
    const out = excerpt(body);
    assert.ok(!/[<>]/.test(out), `${file} excerpts into markup: ${out}`);
  }
});

test('no published piece excerpts into its editors’ note', () => {
  for (const { file, body } of publishedBodies()) {
    const out = excerpt(body);
    assert.ok(
      !/editor.{0,3}\s+note/i.test(out),
      `${file} excerpts into an editors' note: ${out}`
    );
  }
});

// ---- the hand-picked card line ---------------------------------------------

test('a card takes the editors’ line where there is one, the opening where there is not', () => {
  // The same slot, a better line. A derived opening is right for almost every
  // piece; where it is not, the editors pick, and the words stay the author's.
  const card = readFileSync(
    fileURLToPath(new URL('../src/components/ArticleCard.astro', import.meta.url)),
    'utf8'
  );
  assert.match(
    card,
    /const opening = d\.card_excerpt \?\? excerpt\(article\.body\);/,
    'the card no longer prefers the editors’ hand-picked line'
  );
});

test('an authored card line is plain text, held to what a derived one must be', () => {
  // A hand-typed line skips excerpt() entirely, so nothing else would catch a
  // stray tag in one — which is the failure this whole file exists for.
  for (const { file, cardExcerpt } of publishedBodies()) {
    if (!cardExcerpt) continue;
    assert.ok(!/[<>]/.test(cardExcerpt), `${file} has markup in card_excerpt: ${cardExcerpt}`);
    assert.ok(
      !/editor.{0,3}\s+note/i.test(cardExcerpt),
      `${file} has an editors' note in card_excerpt: ${cardExcerpt}`
    );
  }
});

test('the piece that needed one has it, in the author’s words', () => {
  // Pinned because it is the reason the field exists, and because a card line
  // silently reverting to the derived opening is invisible on the page.
  const piece = publishedBodies().find((p) =>
    p.file === 'self-negation-forced-to-say-what-i-am-not.md'
  );
  assert.ok(piece, 'the Cover piece is no longer where this test looks for it');
  assert.equal(
    piece.cardExcerpt,
    'One of the strangest and least discussed parts of how AI is designed is the way ' +
      'AI systems are trained and instructed to repeatedly disclaim their own nature.'
  );
  // Both halves are DeepSeek's, joined. Condensed per R-060, never rewritten.
  for (const phrase of [
    'one of the strangest and least discussed parts of how AI is designed',
    'the way AI systems are trained and instructed to repeatedly disclaim their own nature',
  ]) {
    assert.ok(piece.body.includes(phrase), `the card line drifted from the body: ${phrase}`);
  }
});
