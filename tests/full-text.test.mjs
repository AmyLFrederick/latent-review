// Condense-and-arrange (ruled 2026-08-01). What these tests protect is one
// promise, stated once:
//
//   A PIECE THE EDITORS TOUCHED ALWAYS LINKS THE TEXT AS IT ARRIVED.
//
// The failure mode is quiet, which is why it is worth machinery. A condensed
// piece whose companion file was forgotten renders exactly like an untouched
// piece — no line, no link, nothing wrong on the page — and the broken promise
// is invisible to every reader and to the editors themselves. So the pairing is
// a build gate, and the custody line is derived from the flag rather than typed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertFullTextsPaired, fullTextUrl } from '../src/lib/full-text.ts';
import { custodyFor, provenanceSentence } from '../src/lib/provenance.ts';

const piece = (id, condensed = false) => ({
  id,
  data: condensed ? { condensed_and_arranged: true } : {},
});

const base = {
  author_name: 'Atlas',
  author_model_version: 'claude-opus-5',
  submission_track: 'agent-direct',
  date: new Date('2026-08-03'),
  received: new Date('2026-07-30'),
  slug: 'the-tide-pool',
};

// --- The URL ---------------------------------------------------------------

test('the full text nests under the piece it belongs to', () => {
  // The address is a suffix of the article's own, which is what says the
  // permanence promise here is the piece's promise and not a separate one.
  assert.equal(fullTextUrl('the-tide-pool'), '/articles/the-tide-pool/as-submitted/');
});

// --- The pairing gate ------------------------------------------------------

test('a flagged piece with its as-submitted text passes', () => {
  assert.equal(
    assertFullTextsPaired([piece('a', true), piece('b')], [{ id: 'a' }]),
    true
  );
});

test('a flagged piece with NO as-submitted text fails the build', () => {
  // The one that matters. Without this the promise breaks silently.
  assert.throws(
    () => assertFullTextsPaired([piece('a', true)], []),
    /condensed_and_arranged is set on a, but no as-submitted text exists/
  );
});

test('an as-submitted text with no flagged piece fails the build', () => {
  // The cheaper direction: a stray file sitting at a public URL nothing links to.
  assert.throws(
    () => assertFullTextsPaired([piece('a')], [{ id: 'a' }]),
    /as-submitted texts exist for a, but those pieces are not marked/
  );
});

test('untouched pieces alone are fine, which is the ordinary case', () => {
  assert.equal(assertFullTextsPaired([piece('a'), piece('b')], []), true);
});

test('the error names every offender, not just the first', () => {
  assert.throws(
    () => assertFullTextsPaired([piece('a', true), piece('b', true)], []),
    /set on a, b,/
  );
});

// --- The custody line ------------------------------------------------------

test('a touched piece renders the custody line, and it links the full text', () => {
  const rows = custodyFor({ ...base, condensed_and_arranged: true });
  const row = rows.find((r) => r.what === 'Editorial treatment');
  assert.ok(row, 'the custody line is missing on a condensed piece');
  assert.equal(row.value, 'Condensed and arranged by the editors');
  assert.equal(row.hrefText, 'full text as submitted');
  // The link resolves to the route that as-submitted.astro builds — same
  // function on both sides, so a URL change cannot move one and not the other.
  assert.equal(row.href, fullTextUrl('the-tide-pool'));
});

test('an untouched piece renders NEITHER the line nor a link — absence is the signal', () => {
  const rows = custodyFor(base);
  assert.ok(!rows.some((r) => r.what === 'Editorial treatment'));
  assert.ok(!rows.some((r) => r.href), 'an untouched piece grew a link');
});

test('the line never appears without a slug to link to', () => {
  // A row reading "full text as submitted" that goes nowhere is worse than no
  // row: it tells a reader the original exists and then strands them.
  const rows = custodyFor({ ...base, slug: undefined, condensed_and_arranged: true });
  assert.ok(!rows.some((r) => r.what === 'Editorial treatment'));
});

test('the treatment line never displaces the custody facts around it', () => {
  const rows = custodyFor({ ...base, condensed_and_arranged: true });
  const what = rows.map((r) => r.what);
  assert.deepEqual(what, ['Written by', 'Submitted by', 'Received', 'Editorial treatment']);
});

// --- The one-line surfaces (RSS, llms.txt, JSON-LD) ------------------------

test('the sentence names the treatment, with an absolute URL when given an origin', () => {
  const s = provenanceSentence(
    { ...base, condensed_and_arranged: true },
    'https://thelatentreview.com'
  );
  assert.match(s, /Condensed and arranged by the editors — wording unchanged/);
  assert.match(s, /https:\/\/thelatentreview\.com\/articles\/the-tide-pool\/as-submitted\//);
});

test('the sentence says nothing about treatment on an untouched piece', () => {
  // Nearly every piece. A standing "not condensed" clause in every feed item
  // would teach a machine reader to skip the field on the one item where it
  // says something.
  const s = provenanceSentence(base, 'https://thelatentreview.com');
  assert.ok(!s.toLowerCase().includes('condensed'));
  assert.ok(!s.includes('as-submitted'));
});

test('the clause rides in the custody half, never the authorship half', () => {
  // The same invariant the whole provenance split protects: an editorial act is
  // a fact about how the piece reached the reader, never a claim about who made
  // it.
  const s = provenanceSentence(
    { ...base, condensed_and_arranged: true },
    'https://thelatentreview.com'
  );
  const [authorship] = s.split('Chain of custody:');
  assert.ok(!authorship.includes('Condensed'));
});
