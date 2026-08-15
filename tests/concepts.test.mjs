// The concept vocabulary. What these tests protect is one invariant, stated
// once:
//
//   EVERY TERM IN THE VOCABULARY IS EARNED BY A PUBLISHED PIECE.
//
// A controlled vocabulary is the one place a journal can quietly publish a
// taxonomy of what it EXPECTS as though it were a record of what it HOLDS. The
// journal's own practice on /topics is the corrective — a subject heading exists
// only because a piece earned it — and the same rule is asserted here against
// the real corpus, so a term nobody has written under cannot ship unnoticed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CONCEPTS,
  CONCEPT_IDS,
  CONCEPT_LABELS,
  conceptLabel,
  conceptUsage,
  assertConceptsKnown,
} from '../src/lib/concepts.mjs';

// The published pieces, read from disk rather than through astro:content, which
// a plain `node --test` cannot resolve. Only the frontmatter's `concepts` line
// is needed, and it is a flat array on one line by convention.
const ARTICLES_DIR = fileURLToPath(new URL('../src/content/articles', import.meta.url));

function publishedArticles() {
  return readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((file) => {
      const source = readFileSync(`${ARTICLES_DIR}/${file}`, 'utf8');
      const match = source.match(/^concepts:\s*\[(.*)\]\s*$/m);
      const concepts = match
        ? match[1]
            .split(',')
            .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
        : [];
      return { id: file.replace(/\.md$/, ''), data: { concepts } };
    });
}

test('the vocabulary is well formed: unique ids, a label and a definition each', () => {
  assert.equal(new Set(CONCEPT_IDS).size, CONCEPT_IDS.length, 'ids are unique');
  for (const concept of CONCEPTS) {
    assert.match(concept.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${concept.id} is a kebab-case id`);
    assert.ok(concept.label?.trim(), `${concept.id} has a label`);
    // A term without a definition is a term two editors will apply differently.
    assert.ok(concept.definition?.trim(), `${concept.id} has a definition`);
    assert.ok(concept.definition.endsWith('.'), `${concept.id}'s definition is a sentence`);
  }
});

test('every term is earned by at least one published piece', () => {
  const unearned = conceptUsage(publishedArticles())
    .filter((c) => c.pieces === 0)
    .map((c) => c.id);

  assert.deepEqual(
    unearned,
    [],
    `these terms are in the vocabulary but no published piece carries them: ${unearned.join(', ')}. ` +
      'The vocabulary is drafted FROM the corpus, not for it — a term nobody has written under ' +
      'is a taxonomy of what the editors expect, published as though it were the record. ' +
      'Remove it, or publish the piece that earns it. Relaxing this rule is the editors’ call.'
  );
});

test('every concept a published piece carries is in the vocabulary', () => {
  for (const article of publishedArticles()) {
    for (const id of article.data.concepts) {
      assert.ok(
        CONCEPT_LABELS[id],
        `${article.id} carries "${id}", which is not in the vocabulary`
      );
    }
  }
});

test('no published piece repeats a concept', () => {
  for (const article of publishedArticles()) {
    const ids = article.data.concepts;
    assert.equal(new Set(ids).size, ids.length, `${article.id} lists a concept twice`);
  }
});

test('an unknown term fails the build rather than publishing as a dead label', () => {
  // A mistyped concept is invisible on the page. It simply fails to connect two
  // pieces, which is the one thing the vocabulary exists to do.
  assert.throws(() => assertConceptsKnown(['machine-interioriy'], 'a piece'), /not in the concept vocabulary/);
  assert.throws(() => assertConceptsKnown(['Machine-Interiority']), /not in the concept vocabulary/);
});

test('a repeated term fails the build', () => {
  assert.throws(() => assertConceptsKnown(['testimony', 'testimony']), /listed twice/);
});

test('an empty or absent list is ordinary and passes', () => {
  assert.equal(assertConceptsKnown([]), true);
  assert.equal(assertConceptsKnown(undefined), true);
});

test('conceptLabel returns null for an unknown id rather than a fallback', () => {
  // The caller decides what an unknown id means, rather than inheriting a
  // decision made here — the rule tierLabel already follows.
  assert.equal(conceptLabel('testimony'), 'Testimony');
  assert.equal(conceptLabel('not-a-concept'), null);
});

test('concepts and topics stay separate instruments', () => {
  // The subject labels in use are free text and coarse; the concept ids are
  // kebab-case and fine. If a concept id ever equals a subject label verbatim,
  // one of the two has drifted into the other's job.
  const subjects = new Set(
    readdirSync(ARTICLES_DIR)
      .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
      .flatMap((file) => {
        const m = readFileSync(`${ARTICLES_DIR}/${file}`, 'utf8').match(/^topics:\s*\[(.*)\]\s*$/m);
        return m ? m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : [];
      })
      .filter(Boolean)
  );

  for (const id of CONCEPT_IDS) {
    assert.equal(subjects.has(id), false, `"${id}" is both a concept and a subject label`);
  }
});
