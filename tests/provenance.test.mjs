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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  authorshipFor,
  arrivalCaveat,
  custodyFor,
  provenanceLabel,
  provenanceSentence,
  trackLabel,
} from '../src/lib/provenance.ts';
import { AGENT_DIRECT_LABEL, TIER_DESCRIPTIONS, TIERS } from '../src/lib/site.ts';

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

// --- Chained labels (ruled 2026-08-01) --------------------------------------
//
// The published standard is what adopters copy under CC BY 4.0, so its ruled
// text is treated the way this repository treats every other ratified string:
// pinned, and changed by a ruling rather than by a commit.

/**
 * A local copy of the helper in notice.test.mjs — an .astro file with
 * everything a reader never sees removed. Duplicated rather than shared
 * because two copies is cheaper than a test-utils module; if a third test file
 * needs it, that is the point at which it should be extracted.
 */
function renderedTemplate(rel) {
  return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8')
    .replace(/^---[\s\S]*?\n---/, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '');
}

/**
 * The visible copy of /provenance, reduced to comparable text: markup dropped,
 * JSX string-literal spacers resolved, whitespace collapsed — and
 * `<sup>N</sup>` folded back to the Unicode superscript the ruling was written
 * in. That last step is the point of the helper. The page renders the numerals
 * as markup because the display rule demands a size and weight the Unicode
 * characters cannot be given, so a byte-for-byte check against the ratified
 * sentence has to undo exactly that one substitution and nothing else.
 */
const SUPERSCRIPTS = { 1: '¹', 2: '²' };

function visibleText(rel) {
  return renderedTemplate(rel)
    .replace(/<sup class="tier-num">([12])<\/sup>/g, (_, d) => SUPERSCRIPTS[d])
    .replace(/\{'\s*'\}/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

test('the ruled chaining paragraph appears on /provenance, word for word', () => {
  // Ratified by both editors 2026-08-01. If this fails, the question is not
  // "update the string" — it is who edited ratified text, and under which
  // ruling.
  const ruled =
    'Tiers may chain, read left to right, when a work passes through more hands. ' +
    'When the same kind of party appears more than once in a chained label, number ' +
    'them in order of appearance — AI¹, AI², or Human¹, Human² — so the byline can ' +
    'say which is which. For example, AI¹ = Human + AI² (editor) means co-authored ' +
    'by one AI and a human, then edited by a second AI, and the byline names them: ' +
    'Claude (AI¹) = Amy Louise Frederick (Human), edited by Copilot (AI²). Numbers ' +
    'appear only in chained labels and only when a kind repeats; the seven base ' +
    'tiers are unchanged and never numbered. The label follows the work\'s actual ' +
    'history, however many hands that took.';

  assert.ok(
    visibleText('src/pages/provenance.astro').includes(ruled),
    'the ratified chaining paragraph is not on /provenance verbatim'
  );
});

test('every numeral in a chained label is superscript markup, never a raw character', () => {
  // The display rule is enforceable only on markup: .tier-num is what carries
  // the weight and the size floor, and a bare ¹ in the source would render at
  // whatever the fallback font chose and answer to no CSS at all. It would also
  // pass the verbatim test above while failing the ruling — which is why this
  // check reads the SOURCE rather than the normalized text.
  const source = renderedTemplate('src/pages/provenance.astro');
  assert.ok(!/[¹²³]/.test(source), 'a raw Unicode superscript reached the page copy');
  assert.ok(
    source.includes('<sup class="tier-num">1</sup>'),
    'the numbered notation is missing its styled superscript markup'
  );
});

test('the seven base tiers stay unnumbered, on the page and in the codes', () => {
  // The add-only promise, checked where it could actually break: the ruling
  // says the base tiers are "unchanged and never numbered", so no digit may
  // appear in any of the seven codes and no base label may acquire one.
  for (const tier of TIERS) {
    assert.ok(!/\d/.test(tier.code), `base code ${tier.code} acquired a number`);
    assert.ok(!/\d/.test(tier.label), `base label ${tier.label} acquired a number`);
  }
});

// --- Chained codes reaching the display path (R-035 clause 6) ---------------

test('a chained tier is DECLARED and renders its label, not "Not declared"', () => {
  // The exact failure R-035 clause 6 recorded. Before the resolver, this piece
  // rendered as an absence in the authorship slot while carrying a perfectly
  // valid label in its record.
  const a = authorshipFor({ ...human, involvement_tier: 'ai-1-equals-human-ai-2-editor' });
  assert.equal(a.label, 'AI¹ = Human + AI² (editor)');
  assert.equal(a.declared, true);
  assert.equal(a.description, '', 'a chained label carries no canned description');
});

test('an unrecognised tier still reads as undeclared', () => {
  // The resolver widened what counts as valid; it must not have made everything
  // valid. A code that breaks R-035's numbering is still not a label.
  const a = authorshipFor({ ...human, involvement_tier: 'ai-equals-human-ai-editor' });
  assert.equal(a.label, 'Not declared');
  assert.equal(a.declared, false);
});

test('the derived label does not promise a clause it cannot deliver', () => {
  // provenance_label is emitted by both feeds under a stability contract. With
  // no description, the colon has to go — "AI¹ = Human + AI² (editor): " is a
  // punctuation mark advertising a phrase that never arrives.
  const label = provenanceLabel({ ...human, involvement_tier: 'ai-1-equals-human-ai-2-editor' });
  assert.equal(label, 'AI¹ = Human + AI² (editor); attested by Amy Louise Frederick');
  assert.ok(!label.includes(': '), 'an empty description left its colon behind');
});

test('the one-line sentence drops its dash when there is no description', () => {
  const s = provenanceSentence({
    ...human,
    involvement_tier: 'ai-1-equals-human-ai-2-editor',
    attested_by: undefined,
  });
  assert.match(s, /Authorship: AI¹ = Human \+ AI² \(editor\)\. Chain of custody:/);
  assert.ok(!s.includes('— .'), 'a dangling em dash survived an empty description');
});
