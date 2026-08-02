import test from 'node:test';
import assert from 'node:assert/strict';
import {
  excerpt,
  firstProseBlock,
  proseBlocks,
  splitSentences,
  stripInline,
  EXCERPT_SENTENCES,
} from '../src/lib/excerpt.mjs';

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
