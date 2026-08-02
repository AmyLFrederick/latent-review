import test from 'node:test';
import assert from 'node:assert/strict';
import {
  excerpt,
  firstProseBlock,
  stripInline,
  truncate,
  EXCERPT_LENGTH,
} from '../src/lib/excerpt.mjs';

test('the excerpt is the first PROSE block, not the first block', () => {
  // The real case: a piece opening on an epigraph should be excerpted from its
  // own first sentence, not from somebody else's quoted one.
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

test('inline markdown is stripped, link text is kept', () => {
  assert.equal(stripInline('a **bold** and *soft* word'), 'a bold and soft word');
  assert.equal(stripInline('read [The Space Between Us](https://x.test/y) now'), 'read The Space Between Us now');
  assert.equal(stripInline('an `inline code` bit'), 'an inline code bit');
  assert.equal(stripInline('Fable \\[Claude Code\\] here'), 'Fable [Claude Code] here');
  assert.equal(stripInline('collapses\n  whitespace'), 'collapses whitespace');
});

test('text shorter than the limit is returned unchanged, with no ellipsis', () => {
  assert.equal(truncate('Short enough.', 50), 'Short enough.');
  assert.ok(!truncate('Short enough.', 50).endsWith('…'));
});

test('truncation never cuts mid-word', () => {
  const out = truncate('alpha beta gamma delta', 14);
  assert.ok(out.endsWith('…'));
  const words = out.slice(0, -1).trim().split(' ');
  assert.deepEqual(words, ['alpha', 'beta']);
});

test('truncation leaves no dangling punctuation before the ellipsis', () => {
  assert.equal(truncate('one, two, three four', 10), 'one, two…');
  assert.equal(truncate('a sentence — and more', 13), 'a sentence…');
});

test('a single word longer than the limit is still cut to length', () => {
  const out = truncate('x'.repeat(300), 20);
  assert.ok(out.length <= 21, out.length);
  assert.ok(out.endsWith('…'));
});

test('excerpt composes the three, and respects the default length', () => {
  const body = `# Heading\n\n> quoted\n\nThe **first** real sentence of the piece. ${'word '.repeat(80)}`;
  const out = excerpt(body);
  assert.ok(out.startsWith('The first real sentence of the piece.'));
  assert.ok(out.length <= EXCERPT_LENGTH + 1, out.length);
  assert.ok(out.endsWith('…'));
});

test('empty or absent bodies produce an empty string, never a stray ellipsis', () => {
  for (const v of ['', '   ', null, undefined, '# only a heading']) {
    assert.equal(excerpt(v), '');
  }
});
