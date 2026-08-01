// The provenance split. What these tests protect is one invariant, stated once:
//
//   THE ARRIVAL CAVEAT NEVER APPEARS WHERE AN AUTHORSHIP CLAIM BELONGS.
//
// That is the whole finding of the 2026-07-31 audit. `provenance_label` carried
// a tier on one track and an arrival disclaimer on the other, and every consumer
// printed it in byline position — so an agent-direct piece's caveat read as a
// claim about who wrote it, on /archive, in RSS, in llms.txt and in JSON-LD.
// Splitting the field is only worth anything if nothing leaks back across the
// line, so most of what follows checks the leak rather than the happy path.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  authorshipFor,
  arrivalCaveat,
  custodyFor,
  provenanceLabel,
  provenanceSentence,
  trackLabel,
} from '../src/lib/provenance.ts';
import { AGENT_DIRECT_LABEL, TIER_DESCRIPTIONS } from '../src/lib/site.ts';

const human = {
  author_name: 'Amy Louise Frederick',
  author_model_version: 'Claude Opus 5',
  submission_track: 'human-attested',
  involvement_tier: 'ai-human',
  attestation: 'I wrote the first draft with Claude, then rewrote the middle myself.',
  attested_by: 'Amy Louise Frederick',
  date: new Date('2026-08-03'),
  received: new Date('2026-07-28'),
};

const agent = {
  author_name: 'Atlas',
  author_model_version: 'claude-opus-5',
  submission_track: 'agent-direct',
  attestation: 'I wrote this unaided in response to the brief the door dealt me.',
  date: new Date('2026-08-03'),
  received: new Date('2026-07-30'),
  brief_variant: 'open-v2',
};

// --- Authorship ------------------------------------------------------------

test('a declared tier renders its label and description', () => {
  const a = authorshipFor(human);
  assert.equal(a.label, 'AI + Human');
  assert.equal(a.description, 'AI led, with meaningful human contributions to the work and ideas');
  assert.equal(a.declared, true);
});

test('agent-direct authorship is DERIVED and marked undeclared', () => {
  // R-015: the agent-direct track carries no tier, and the article schema still
  // forbids involvement_tier there. Nothing is stored — the page states what the
  // track means, and `declared: false` is what tells the template to say so
  // rather than presenting it as a claim somebody made.
  const a = authorshipFor(agent);
  assert.equal(a.label, 'AI');
  assert.equal(a.description, 'AI alone');
  assert.equal(a.declared, false);
});

test('the amended descriptions carry the amended wording, and AI = Human does not', () => {
  // Amended 2026-07-31 on ai-human and its mirror. AI = Human deliberately keeps
  // "contributed substantially": co-authorship is a claim about standing behind
  // the whole, not about the size of a contribution.
  assert.match(
    authorshipFor({ ...human, involvement_tier: 'human-ai' }).description,
    /meaningful AI contributions to the work and ideas/
  );
  assert.match(
    authorshipFor({ ...human, involvement_tier: 'ai-equals-human' }).description,
    /contributed substantially/
  );
});

test('no tier description is written in writing-only terms', () => {
  // The second half of the same amendment: the tiers cover any work of
  // authorship — an essay, an illustration, a score — so the chart may not
  // describe them as writing. This is the guard, because the drift is easy: the
  // journal publishes mostly prose, and "wrote it" is the word that comes to
  // hand when a tier is next edited.
  for (const [code, description] of Object.entries(TIER_DESCRIPTIONS)) {
    assert.doesNotMatch(
      description,
      /\b(writing|wrote|written|writer)\b/i,
      `tier "${code}" describes the work as writing: ${description}`
    );
  }
});

// --- The arrival caveat ----------------------------------------------------

test('the caveat is derived from the track and applies to exactly one of them', () => {
  assert.equal(arrivalCaveat(agent), AGENT_DIRECT_LABEL);
  assert.equal(arrivalCaveat(human), null);
});

test('THE INVARIANT — the caveat never appears in an authorship position', () => {
  // The audit's finding, pinned. If a later change routes the caveat back into
  // the tier slot on any surface, this is what fails.
  const a = authorshipFor(agent);
  assert.ok(!a.label.includes('claimed'), 'caveat leaked into the tier label');
  assert.ok(!a.description.includes('claimed'), 'caveat leaked into the tier description');
  assert.ok(!a.label.includes('agent-direct'), 'a track value leaked into the tier label');
});

// --- Chain of custody ------------------------------------------------------

test('custody names how it got here, and never a tier', () => {
  const rows = custodyFor(agent);
  const what = rows.map((r) => r.what);
  assert.deepEqual(what, ['Written by', 'Submitted by', 'Received', 'Assignment']);
  const joined = rows.map((r) => r.value).join(' | ');
  assert.ok(!joined.includes('AI + Human'), 'a tier leaked into chain of custody');
});

test('the assignment row appears only when a brief was actually dealt', () => {
  // A row reading "not applicable" on most pieces teaches readers to skip the
  // list, so the row is absent instead.
  const noBrief = custodyFor({ ...agent, brief_variant: undefined });
  assert.ok(!noBrief.some((r) => r.what === 'Assignment'));
  assert.equal(
    custodyFor(agent).find((r) => r.what === 'Assignment').value,
    'Open commission, dealt at random by the desk'
  );
});

test('a human courier is named; an agent door is described', () => {
  const couriered = custodyFor({ ...human, human_sponsor: 'A. Courier' });
  assert.match(couriered.find((r) => r.what === 'Submitted by').value, /A\. Courier/);
  assert.match(
    custodyFor(agent).find((r) => r.what === 'Submitted by').value,
    /agent-direct API/
  );
});

// --- The derived compatibility label --------------------------------------

test('provenance_label is derived, and cannot disagree with the tier', () => {
  const label = provenanceLabel(human);
  assert.match(label, /^AI \+ Human: /);
  assert.match(label, /attested by Amy Louise Frederick$/);
  // The old failure mode: an authored label saying one thing and involvement_tier
  // another. Derivation makes it unrepresentable — change the tier and the label
  // follows.
  assert.match(provenanceLabel({ ...human, involvement_tier: 'human' }), /^Human: /);
});

test('agent-direct keeps exactly the charter caveat as its label', () => {
  assert.equal(provenanceLabel(agent), AGENT_DIRECT_LABEL);
});

// --- The one-line sentence for RSS / llms.txt / JSON-LD --------------------

test('the sentence names both axes on both tracks', () => {
  const h = provenanceSentence(human);
  assert.match(h, /Authorship: AI \+ Human/);
  assert.match(h, /Chain of custody: Human-attested/);

  const a = provenanceSentence(agent);
  assert.match(a, /Authorship: AI alone/);
  assert.match(a, /Chain of custody: Agent-direct/);
});

test('the sentence names the ABSENCE of a tier rather than leaving a gap', () => {
  // For a machine reader an absent field invites a guess; a named absence does
  // not.
  assert.match(provenanceSentence(agent), /no tier is declared/);
});

test('the caveat rides in the custody clause, never the authorship clause', () => {
  const [authorshipClause, custodyClause] = provenanceSentence(agent).split('Chain of custody:');
  assert.ok(!authorshipClause.includes('not independently verifiable'));
  assert.ok(custodyClause.includes('not independently verifiable'));
});

// --- Track labels ----------------------------------------------------------

test('track labels are title case on both tracks', () => {
  // The visible seam on /archive was a lowercase `agent-direct` sitting beside
  // title-case tier labels in the same slot.
  assert.equal(trackLabel(human), 'Human-attested');
  assert.equal(trackLabel(agent), 'Agent-direct');
});
