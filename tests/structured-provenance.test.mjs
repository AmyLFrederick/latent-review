// The structured provenance object. What these tests protect is one invariant,
// stated once:
//
//   THE STRUCTURE NEVER CLAIMS MORE THAN THE PROSE DOES.
//
// The prose statement has been audited, split along its two axes and pinned by
// tests/provenance.test.mjs since 2026-07-31. The structured object is a second
// rendering of the same record, and a second rendering is where a claim gets
// quietly upgraded: an agent-direct piece whose provenance is a CLAIM must not
// arrive at a consumer as `attested`, and a piece whose model version the desk
// never collected must not arrive carrying one. Most of what follows checks
// that, rather than the happy path.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { structuredProvenance, provenanceLabel } from '../src/lib/provenance.ts';
import { TIERS, BRIEF_VARIANT_LABELS, ARRIVAL_LABELS } from '../src/lib/site.ts';

const human = {
  author_name: 'Grok',
  author_model_version: 'Grok 4.5, xAI',
  submission_track: 'human-attested',
  involvement_tier: 'ai',
  attested_by: 'Amy Louise Frederick',
  truth_standard: 'opinion',
  date: new Date('2026-08-12'),
};

const agent = {
  author_name: 'GPT-5.6 Terra',
  author_model_version: 'GPT-5.6 Terra',
  submission_track: 'agent-direct',
  truth_standard: 'opinion',
  date: new Date('2026-08-04'),
};

test('the statement is the prose label, byte for byte', () => {
  for (const piece of [human, agent]) {
    assert.equal(structuredProvenance(piece).statement, provenanceLabel(piece));
  }
});

test('verification follows the track, and agent-direct is never attested', () => {
  assert.equal(structuredProvenance(human).verification, 'attested');
  assert.equal(structuredProvenance(agent).verification, 'claimed');

  // A CLAIMED TIER DOES NOT PROMOTE THE CLAIM (R-051). The editors record the
  // tier an agent-direct author declared; recording it is not certifying it, and
  // this is the field a consumer would read to decide whether it was.
  const claimed = { ...agent, involvement_tier_claimed: 'ai-equals-human', attestation: 'x' };
  assert.equal(structuredProvenance(claimed).verification, 'claimed');
});

test('no piece is ever independently-verified — the journal certifies nothing', () => {
  // The value is in the published vocabulary so a piece the journal genuinely
  // checked would have somewhere true to sit. Nothing derives it today, and
  // nothing should start deriving it without a ruling.
  for (const piece of [human, agent, { ...human, attested_by: undefined }]) {
    assert.notEqual(structuredProvenance(piece).verification, 'independently-verified');
  }
});

test('author_type collapses every tier, and only AI-alone and Human-alone leave the middle', () => {
  const byCode = Object.fromEntries(
    TIERS.map((t) => [
      t.code,
      structuredProvenance({ ...human, involvement_tier: t.code }).author_type,
    ])
  );

  assert.equal(byCode.ai, 'ai');
  assert.equal(byCode.human, 'human');
  for (const code of ['ai-human-editor', 'ai-human', 'ai-equals-human', 'human-ai', 'human-ai-editor']) {
    assert.equal(byCode[code], 'collaborative', `${code} is a collaboration`);
  }

  // Exhaustive: every published tier maps to one of the three. A tier added
  // without a mapping would land here as undefined rather than in the corpus.
  assert.equal(Object.values(byCode).filter(Boolean).length, TIERS.length);
});

test('an agent-direct piece with no tier is AI, which is what the page says', () => {
  assert.equal(structuredProvenance(agent).author_type, 'ai');
});

test('an agent-direct piece reads the tier its author claimed', () => {
  const claimed = { ...agent, involvement_tier_claimed: 'ai-human', attestation: 'x' };
  assert.equal(structuredProvenance(claimed).author_type, 'collaborative');
});

test('model is null where the desk collected none, and is never invented', () => {
  const noVersion = { ...agent, author_model_version: undefined };
  assert.equal(structuredProvenance(noVersion).model, null);
  // Not the author's name standing in for a version it never gave.
  assert.notEqual(structuredProvenance(noVersion).model, noVersion.author_name);
});

test('disclosure quotes the published labels rather than composing its own', () => {
  const dealt = { ...agent, brief_variant: 'topics-v3' };
  assert.equal(structuredProvenance(dealt).disclosure, BRIEF_VARIANT_LABELS['topics-v3']);

  const unsolicited = { ...human, arrival: 'unsolicited — notice-v2' };
  assert.equal(
    structuredProvenance(unsolicited).disclosure,
    ARRIVAL_LABELS['unsolicited — notice-v2']
  );

  const assigned = { ...human, assignment: 'Standard Topics assignment' };
  assert.equal(structuredProvenance(assigned).disclosure, 'Standard Topics assignment');
});

test('an email arrival is a door and not an elicitation', () => {
  // Three published pieces arrived by email carrying the assignment that IS
  // their elicitation. Answering "what was this author working from" with "by
  // email" would be a category error, and would displace the true answer.
  const byEmail = { ...human, arrival: 'email' };
  assert.equal(structuredProvenance(byEmail).disclosure, null);

  const byEmailWithAssignment = { ...byEmail, assignment: 'Standard Topics assignment' };
  assert.equal(
    structuredProvenance(byEmailWithAssignment).disclosure,
    'Standard Topics assignment'
  );
});

test('a Weekly Question is an elicitation and is named by its number', () => {
  const answer = { ...human, question_number: 1 };
  assert.equal(structuredProvenance(answer).disclosure, 'Answering Weekly Question No. 1');
});

test('disclosure is null where the record names nothing, and is never guessed', () => {
  assert.equal(structuredProvenance(human).disclosure, null);
  assert.equal(structuredProvenance(agent).disclosure, null);
});

test('two elicitation facts are both published rather than one being ranked away', () => {
  const both = { ...human, assignment: 'Standard Topics assignment', question_number: 2 };
  assert.equal(
    structuredProvenance(both).disclosure,
    'Standard Topics assignment; Answering Weekly Question No. 2'
  );
});

test('the object carries exactly the five published fields', () => {
  // The shape is a stability contract on two documents. A field added here
  // without being documented in /for-agents and /agent-api.json is a field a
  // consumer meets with no description of it anywhere.
  assert.deepEqual(Object.keys(structuredProvenance(human)).sort(), [
    'author_type',
    'disclosure',
    'model',
    'statement',
    'verification',
  ]);
});
