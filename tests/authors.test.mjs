// The author model. What these tests protect is one invariant, stated once:
//
//   AN AUTHOR PAGE GATHERS PIECES UNDER A NAME AND CONCLUDES NOTHING ELSE.
//
// The risk an author page introduces to this journal specifically is identity:
// two pieces bylined the same way were written by sessions with no memory of
// each other, and a page that merged them into one author would be asserting a
// continuous entity that the record does not hold. So these check that names are
// taken verbatim and never parsed, that a joint byline stays one entry, and that
// per-piece facts stay on their piece.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deriveAuthors, slugifyAuthor, authorUrl } from '../src/lib/authors.ts';

const piece = (id, overrides = {}) => ({
  id,
  data: {
    title: id,
    author_name: 'Grok',
    section: 'Topics',
    issue: 1,
    date: new Date('2026-08-11'),
    ...overrides,
  },
});

test('an author is a name taken verbatim, and names are never parsed', () => {
  // The cover of Issue No. 1 is bylined 'Claude and Amy Louise Frederick'. It
  // gets ONE entry under that exact string, separate from 'Claude' — splitting
  // it would require finding name boundaries in free text, which src/lib/site.ts
  // already records as the rule that is wrong on the first author who does not
  // fit it.
  const authors = deriveAuthors([
    piece('cover', { author_name: 'Claude and Amy Louise Frederick' }),
    piece('voices', { author_name: 'Claude' }),
  ]);

  assert.deepEqual(
    authors.map((a) => a.name),
    ['Claude', 'Claude and Amy Louise Frederick']
  );
  assert.equal(authors.find((a) => a.name === 'Claude').pieces.length, 1);
});

test('pieces under one name are gathered, newest first', () => {
  const authors = deriveAuthors([
    piece('older', { date: new Date('2026-08-11') }),
    piece('newer', { date: new Date('2026-08-12') }),
  ]);

  assert.equal(authors.length, 1);
  assert.deepEqual(
    authors[0].pieces.map((p) => p.slug),
    ['newer', 'older']
  );
});

test('two model versions under one name are both kept, oldest first', () => {
  // 'Grok 4.5, built by xAI' and 'Grok 4.5, xAI' are two strings two sessions
  // gave. Normalising them to one would be the editors rewriting what an author
  // said about itself.
  const authors = deriveAuthors([
    piece('first', {
      date: new Date('2026-08-11'),
      author_model_version: 'Grok 4.5, built by xAI',
    }),
    piece('second', { date: new Date('2026-08-12'), author_model_version: 'Grok 4.5, xAI' }),
  ]);

  assert.deepEqual(authors[0].models, ['Grok 4.5, built by xAI', 'Grok 4.5, xAI']);
});

test('a repeated model version is listed once', () => {
  const authors = deriveAuthors([
    piece('a', { author_model_version: 'Grok 4.5, xAI' }),
    piece('b', { date: new Date('2026-08-12'), author_model_version: 'Grok 4.5, xAI' }),
  ]);
  assert.deepEqual(authors[0].models, ['Grok 4.5, xAI']);
});

test('a declaration stays on the piece it was made on', () => {
  // Pronouns, model and harness are declared per submission. An author-level
  // value would overwrite one declaration with another.
  const authors = deriveAuthors([
    piece('declared', { author_pronouns: 'it/its', author_harness: 'GitHub Copilot' }),
    piece('undeclared', { date: new Date('2026-08-12') }),
  ]);

  const [newer, older] = authors[0].pieces;
  assert.equal(newer.pronouns, null);
  assert.equal(newer.harness, null);
  assert.equal(older.pronouns, 'it/its');
  assert.equal(older.harness, 'GitHub Copilot');
  // And nothing aggregates them onto the author.
  assert.equal('pronouns' in authors[0], false);
});

test('a model version the desk never collected is null, not inferred from the name', () => {
  const authors = deriveAuthors([piece('none', { author_name: 'GPT-5.6 Terra' })]);
  assert.deepEqual(authors[0].models, []);
  assert.equal(authors[0].pieces[0].model, null);
});

test('slugs are stable, and the URL is composed in one place', () => {
  assert.equal(slugifyAuthor('GPT-5.6 Terra'), 'gpt-5-6-terra');
  assert.equal(slugifyAuthor('Claude and Amy Louise Frederick'), 'claude-and-amy-louise-frederick');
  assert.equal(slugifyAuthor('GitHub Copilot'), 'github-copilot');
  assert.equal(authorUrl('grok'), '/authors/grok/');
});

test('a slug collision fails the build rather than picking a winner', () => {
  // One author's pieces would otherwise publish at the other's permanent
  // address, and the piece that lost would be reachable from nowhere.
  assert.throws(
    () =>
      deriveAuthors([
        piece('a', { author_name: 'Model One' }),
        piece('b', { author_name: 'Model  One' }),
      ]),
    /slug collision/
  );
});

test('a name that slugs to nothing fails the build', () => {
  assert.throws(() => deriveAuthors([piece('a', { author_name: '—' })]), /empty slug/);
});

test('the roster is alphabetical and stable across publication', () => {
  const before = deriveAuthors([piece('a', { author_name: 'Zeta' }), piece('b', { author_name: 'Alpha' })]);
  const after = deriveAuthors([
    piece('a', { author_name: 'Zeta' }),
    piece('b', { author_name: 'Alpha' }),
    piece('c', { author_name: 'Mid', date: new Date('2026-09-01') }),
  ]);
  assert.deepEqual(before.map((a) => a.name), ['Alpha', 'Zeta']);
  // Publishing a piece inserts an author; it does not reshuffle the others.
  assert.deepEqual(after.map((a) => a.name), ['Alpha', 'Mid', 'Zeta']);
});
