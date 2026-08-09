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

/** A piece the editors retitled and did nothing else to (R-037). */
const retitled = (id) => ({ id, data: { title_as_submitted: 'The Tide Pool at Dusk' } });

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
    /an editorial treatment is declared on a .* but no as-submitted text exists/s
  );
});

test('an as-submitted text with no flagged piece fails the build', () => {
  // The cheaper direction: a stray file sitting at a public URL nothing links to.
  assert.throws(
    () => assertFullTextsPaired([piece('a')], [{ id: 'a' }]),
    /as-submitted texts exist for a, but those pieces declare no/
  );
});

test('untouched pieces alone are fine, which is the ordinary case', () => {
  assert.equal(assertFullTextsPaired([piece('a'), piece('b')], []), true);
});

test('the error names every offender, not just the first', () => {
  assert.throws(
    () => assertFullTextsPaired([piece('a', true), piece('b', true)], []),
    /declared on a, b /
  );
});

// --- The custody line ------------------------------------------------------

test('a touched piece renders the custody line, and it links the full text', () => {
  const rows = custodyFor({ ...base, condensed_and_arranged: true });
  const row = rows.find((r) => r.what === 'Editorial treatment');
  assert.ok(row, 'the custody line is missing on a condensed piece');
  assert.equal(row.value, 'Condensed and arranged by the editors — wording unchanged');
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
  // 'Pronouns' joined the list 2026-08-09, second and unconditional — see
  // src/lib/pronouns.mjs. The point this test makes is unchanged: the treatment
  // line still comes last and displaces nothing.
  assert.deepEqual(what, [
    'Written by',
    'Pronouns',
    'Submitted by',
    'Received',
    'Editorial treatment',
  ]);
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

// --- Retitling, the third act (R-037, 2026-08-03) --------------------------
//
// A retitle can happen to a piece nothing else was done to, so it is the case
// where the promise and the flag come apart: the body is untouched, the term
// still owes the reader the text as it arrived, and a boolean about paragraphs
// cannot say so.

test('a retitled piece owes an as-submitted text exactly as a condensed one does', () => {
  assert.equal(assertFullTextsPaired([retitled('a')], [{ id: 'a' }]), true);
  assert.throws(
    () => assertFullTextsPaired([retitled('a')], []),
    /an editorial treatment is declared on a/
  );
});

test('the retitle custody row says wording is unchanged, because nothing was touched', () => {
  const rows = custodyFor({ ...base, title_as_submitted: 'The Tide Pool at Dusk' });
  const row = rows.find((r) => r.what === 'Editorial treatment');
  assert.equal(row.value, 'Retitled by the editors — wording unchanged');
  assert.equal(row.hrefText, 'full text as submitted, under its original title');
  assert.equal(row.href, fullTextUrl('the-tide-pool'));
});

test('the submitted title is disclosed on the page, not only behind the link', () => {
  // R-037: preserved in the record AND disclosed when changed. A disclosure a
  // reader must follow a link to read is the first without the second.
  const rows = custodyFor({ ...base, title_as_submitted: 'The Tide Pool at Dusk' });
  const row = rows.find((r) => r.what === 'Submitted as');
  assert.equal(row.value, '“The Tide Pool at Dusk”');
  assert.ok(!row.href, 'the title is a fact, not a link');
});

test('a piece that keeps its title carries no "Submitted as" row', () => {
  assert.ok(!custodyFor({ ...base, condensed_and_arranged: true }).some((r) => r.what === 'Submitted as'));
  assert.ok(!custodyFor(base).some((r) => r.what === 'Submitted as'));
});

test('both treatments at once read as one editorial pass, not two events', () => {
  const rows = custodyFor({
    ...base,
    condensed_and_arranged: true,
    title_as_submitted: 'The Tide Pool at Dusk',
  });
  const treatment = rows.filter((r) => r.what === 'Editorial treatment');
  assert.equal(treatment.length, 1);
  assert.equal(treatment[0].value, 'Condensed, arranged and retitled by the editors — wording unchanged');
});

test('the row order still puts what the editors did after how the piece arrived', () => {
  const rows = custodyFor({ ...base, title_as_submitted: 'The Tide Pool at Dusk' });
  assert.deepEqual(rows.map((r) => r.what), [
    'Written by',
    // Unconditional, added 2026-08-09 — see src/lib/pronouns.mjs.
    'Pronouns',
    'Submitted by',
    'Received',
    'Submitted as',
    'Editorial treatment',
  ]);
});

test('the one-line surfaces name the submitted title, where a link cannot be followed', () => {
  const s = provenanceSentence(
    { ...base, title_as_submitted: 'The Tide Pool at Dusk' },
    'https://thelatentreview.com'
  );
  assert.match(s, /Retitled by the editors — wording unchanged, submitted as “The Tide Pool at Dusk”/);
  assert.match(s, /https:\/\/thelatentreview\.com\/articles\/the-tide-pool\/as-submitted\//);
});

test('a retitle with no slug prints nothing rather than a promise it cannot keep', () => {
  const rows = custodyFor({ ...base, slug: undefined, title_as_submitted: 'The Tide Pool at Dusk' });
  assert.ok(!rows.some((r) => r.what === 'Editorial treatment'));
  assert.equal(provenanceSentence({ ...base, slug: undefined, title_as_submitted: 'x' }).includes('as-submitted'), false);
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
