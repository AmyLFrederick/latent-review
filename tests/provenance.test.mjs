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
  assert.equal(a.label, 'AI > Human');
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
  // 'Pronouns' joined the list 2026-08-09 and sits second, beside 'Written by',
  // because it is a fact about the author the submission recorded. Unlike every
  // other optional row here it is UNCONDITIONAL — it reads "undeclared" rather
  // than disappearing, so that an absence is visible as a choice rather than an
  // omission. See src/lib/pronouns.mjs.
  assert.deepEqual(what, ['Written by', 'Pronouns', 'Submitted by', 'Received', 'Assignment']);
  const joined = rows.map((r) => r.value).join(' | ');
  assert.ok(!joined.includes('AI > Human'), 'a tier leaked into chain of custody');
});

test('an email arrival renders under "Arrived by", never "Assignment"', () => {
  // TOUCHES PUBLISHED PROVENANCE, so it is pinned rather than eyeballed. The
  // arrival map began as answers to "which brief was dealt", and both notice
  // values are still about assignment — they say none was dealt. An email is
  // not: nothing was dealt and nothing declined to be dealt. "Assignment: Email"
  // would publish a category error in the half of the block that exists to be
  // precise about how work reached the journal.
  const rows = custodyFor({ ...agent, arrival: 'email' });
  const row = rows.find((r) => r.value.startsWith('Email —'));
  assert.ok(row, 'no row rendered for the email arrival value');
  assert.equal(row.what, 'Arrived by');

  // Not "no Assignment row anywhere" — a dealt brief renders its own, and a
  // piece can legitimately have both: an assignment was dealt AND the reply came
  // by email. The claim is narrower and the one that matters: the email value
  // itself never appears under Assignment.
  const asAssignment = rows.filter((r) => r.what === 'Assignment');
  assert.ok(
    !asAssignment.some((r) => r.value.startsWith('Email —')),
    'the email arrival value rendered under Assignment'
  );
});

test('an assignment and an arrival are two facts, and a piece may carry both', () => {
  // THE GAP THIS CLOSES (2026-08-11). `brief_variant` is which brief the desk
  // dealt at /door — server-side, agent-direct only, R-033 — and `arrival` is
  // which door a piece came by. Neither could carry "we sent this author our
  // standard Topics prompt and they emailed it back", so a piece that WAS
  // assigned something published as though it had turned up unbidden.
  //
  // BOTH ROWS, IN THE ORDER A READER ASKS THEM: how it got here, then what it
  // was answering.
  const rows = custodyFor({
    ...human,
    arrival: 'email',
    assignment: 'Standard Topics assignment',
  });
  const arrived = rows.find((r) => r.what === 'Arrived by');
  const assigned = rows.find((r) => r.what === 'Assignment');
  assert.ok(arrived, 'the email arrival row is gone');
  assert.equal(assigned?.value, 'Standard Topics assignment');
  assert.ok(
    rows.indexOf(arrived) < rows.indexOf(assigned),
    'the assignment row is printed above the door it arrived by'
  );

  // THE EMAIL LABEL NO LONGER DENIES AN ASSIGNMENT, which it did until this
  // change — "no assignment was dealt" would have printed directly above a row
  // naming the assignment. Safe to edit in an add-only map because the value had
  // never been publishable: `email` was missing from ARRIVAL_VALUES until the
  // same day, so no reader has ever seen the old string.
  assert.ok(
    !arrived.value.includes('no assignment was dealt'),
    'the email arrival row denies an assignment the piece may carry'
  );

  // AND THE DENIAL STAYS WHERE IT IS TRUE. Unsolicited means no assignment was
  // dealt; that is what the word says, and the two notice values keep it.
  const unsolicited = custodyFor({ ...human, arrival: 'unsolicited — notice-v2' });
  assert.match(
    unsolicited.find((r) => r.what === 'Assignment').value,
    /no assignment was dealt/
  );
});

test('an assignment is absent on a piece that was not sent one', () => {
  // The rule every optional custody row follows: a row reading "none" on most
  // pieces teaches readers to skip the row on the piece where it says
  // something. Absence is the signal.
  assert.ok(!custodyFor(human).some((r) => r.what === 'Assignment'));
});

test('the notice arrivals still render under "Assignment", unmoved', () => {
  // The other half of the same change: two published surfaces already carry
  // these, and adding a row label for email must not relabel them.
  for (const value of ['unsolicited — notice-v1', 'unsolicited — notice-v2']) {
    const rows = custodyFor({ ...agent, arrival: value });
    const row = rows.find((r) => r.value.startsWith('Unsolicited —'));
    assert.ok(row, `no row for ${value}`);
    assert.equal(row.what, 'Assignment', `${value} changed rows`);
  }
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

test('THE INVARIANT — custody never names a door the record does not hold', () => {
  // Corrected 2026-08-03. The row said "<sponsor>, through the submission form"
  // and the track note said "A human, through the submission form, attesting to
  // what it is" — on pieces that came by courier, and on a cover written by the
  // editors themselves. Nothing in a piece's data distinguishes the form from a
  // courier email, so no rendering of it may say which one it was. On
  // agent-direct the door IS the track and is named, which is why this checks
  // the human side only.
  for (const d of [human, { ...human, human_sponsor: 'A. Courier (transmission only)' }]) {
    const submitted = custodyFor(d).find((r) => r.what === 'Submitted by').value;
    assert.ok(
      !/submission form/i.test(submitted),
      `custody claimed a door it cannot know: "${submitted}"`
    );
  }
  // The sponsor is printed as written, qualifier and all — that string is where
  // a narrower involvement than "submitted" gets said.
  assert.equal(
    custodyFor({ ...human, human_sponsor: 'A. Courier (transmission only)' }).find(
      (r) => r.what === 'Submitted by'
    ).value,
    'A. Courier (transmission only)'
  );
});

// --- The derived compatibility label --------------------------------------

test('provenance_label is derived, and cannot disagree with the tier', () => {
  const label = provenanceLabel(human);
  assert.match(label, /^AI > Human: /);
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
  assert.match(h, /Authorship: AI > Human/);
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
  // Ratified by both editors 2026-08-01, restated in wording by R-047 on
  // 2026-08-03. If this fails, the question is not "update the string" — it is
  // who edited ratified text, and under which ruling.
  const ruled =
    'Tiers may chain, read left to right, when a work passes through more hands. ' +
    'When the same kind of party appears more than once in a chained label, number ' +
    'them in order of appearance — AI¹, AI², or Human¹, Human² — so the byline can ' +
    // THE GUARD TRANSFERRED TO THE RESTATED TEXT (R-047). This read "+" until
    // 2026-08-03, when the operator was updated by ruling rather than by a
    // commit — which is the path this very assertion forced when a sweep tried
    // to edit it. R-035's original wording is preserved in the rulings log.
    'say which is which. For example, AI¹ = Human – AI² (editor) means co-authored ' +
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
  assert.equal(a.label, 'AI¹ = Human – AI² (editor)');
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
  // no description, the colon has to go — "AI¹ = Human – AI² (editor): " is a
  // punctuation mark advertising a phrase that never arrives.
  const label = provenanceLabel({ ...human, involvement_tier: 'ai-1-equals-human-ai-2-editor' });
  assert.equal(label, 'AI¹ = Human – AI² (editor); attested by Amy Louise Frederick');
  assert.ok(!label.includes(': '), 'an empty description left its colon behind');
});

test('the one-line sentence drops its dash when there is no description', () => {
  const s = provenanceSentence({
    ...human,
    involvement_tier: 'ai-1-equals-human-ai-2-editor',
    attested_by: undefined,
  });
  assert.match(s, /Authorship: AI¹ = Human – AI² \(editor\)\. Chain of custody:/);
  assert.ok(!s.includes('— .'), 'a dangling em dash survived an empty description');
});

// --- The page itself (2026-08-04) ----------------------------------------
//
// Three editors' items, each with a failure worth a test: a page that says its
// own name twice, an adoption on-ramp promising something that already shipped,
// and a standard's changelog with no entry for the standard's biggest change.

const provenancePage = () => renderedTemplate('src/pages/provenance.astro');

/** The template between two markers, so a section can be checked in isolation. */
const section = (page, from, to) =>
  page.slice(page.indexOf(from), to ? page.indexOf(to) : undefined);

test('the page says its name once, at full size, and keeps its one heading', () => {
  // It said it twice — a small kicker stacked over the full-size heading — and
  // had since the page was written. THE OUTLINE IS THE PART THAT MATTERS: the
  // /prompts fix had to move the h1 onto the surviving element, because there
  // the large heading was the one removed. Here the duplicate was a <p> with no
  // role, so the h1 neither moved nor changed, and this asserts that rather
  // than trusting it.
  const page = provenancePage();
  assert.equal((page.match(/<h1[\s>]/g) ?? []).length, 1, 'the page no longer has exactly one h1');
  // The heading takes the site-wide lead treatment since 2026-08-04 — here the
  // page's NAME is the heading, so the classes land on the h1 itself rather than
  // on a kicker above it. Still one h1, still the same word.
  assert.match(page, /<h1 class="kicker kicker--accent kicker--lead">Provenance<\/h1>/);

  const header = section(page, '<header class="page-header">', '</header>');
  assert.ok(
    !/class="kicker"/.test(header),
    'the duplicate name is back in the page header'
  );
  assert.equal(
    (header.match(/Provenance/g) ?? []).length,
    1,
    'the page header names itself more than once again'
  );

  // v2 was the kicker's other half and is a thing adopters cite, so it moved to
  // the standard's own line rather than going with it.
  assert.match(header, /Version 2, free\s+to adopt/);
});

test('"Displaying it" is present-tense instructions, not a promise', () => {
  // Every outreach link lands here. Until 2026-08-04 it closed by saying a badge
  // "is being designed and will be published on this page" — of marks that had
  // shipped the day before and gained a second style the day after.
  const displaying = section(provenancePage(), '<h2>Displaying it</h2>', '<h2 id="changelog">');

  for (const stale of ['being designed', 'will be published']) {
    assert.ok(!displaying.includes(stale), `"${stale}" is back in the adoption on-ramp`);
  }

  // The four things the editors asked it to say, each checked by its own claim
  // rather than by a word that could survive a rewrite that dropped the point.
  assert.match(displaying, /a line beside the byline/, 'the simplest form is no longer offered');
  assert.match(displaying, /use either style/, 'the two styles are not offered to adopters');
  assert.match(displaying, /CC BY 4\.0 grant above/, 'the licence is not carried into the on-ramp');
  assert.match(displaying, /Draw the notation as real text/, 'the real-text rule is gone');
  assert.match(displaying, /accessible name/, 'the accessible-name rule is gone');
  assert.match(displaying, /split down the middle/, 'the split-ring rule is gone');
});

test('the values an adopter is told to build to are the badge module\'s own', () => {
  // A hex retyped into prose is the pair that drifts — and here it would drift
  // into someone else's implementation, where no test of ours can reach it. The
  // section renders the constants; it does not restate them.
  const displaying = section(provenancePage(), '<h2>Displaying it</h2>', '<h2 id="changelog">');

  // THREE CONSTANTS, NOT FIVE, since 2026-08-11. BADGE_RING_STROKE and
  // BADGE_BOX were rendered here as the ring's weight in units of diameter —
  // correct while the standard prescribed proportions, and a number binding
  // nobody once it stopped. The rule this test exists for is unchanged and now
  // covers the three that remain: a value an adopter builds to is rendered from
  // the module, never retyped into prose.
  for (const constant of ['RING_AI', 'RING_HUMAN', 'BADGE_INK']) {
    assert.ok(displaying.includes(constant), `${constant} is no longer rendered into the on-ramp`);
  }
  assert.ok(
    !/#[0-9a-f]{6}/i.test(displaying),
    'a hex value is typed into the adoption instructions instead of rendered'
  );
});

test('the standard prescribes no size, and says so in one sentence', () => {
  // THE SCOPE CORRECTION (editors, 2026-08-11). The on-ramp carried three
  // prescriptions about proportion — the ring's weight as a ratio of the
  // diameter, an instruction to scale the drawing as a unit, and the AI form's
  // circle at a quarter larger than the letter form's with its notation a
  // quarter smaller. None of them is what the standard is for. It governs
  // notation, tier meaning and form; how large a badge is on an adopter's page
  // is their layout's business.
  //
  // ASSERTED AS THE ABSENCE PLUS THE SENTENCE, because either alone passes for
  // the wrong reason: a page that dropped the prescriptions and said nothing
  // leaves an adopter guessing whether size is unstated or merely unwritten,
  // and the sentence without the deletion is a permission contradicted three
  // lines above it.
  const displaying = section(provenancePage(), '<h2>Displaying it</h2>', '<h2 id="changelog">');

  assert.match(
    displaying,
    /Render badges at whatever size suits your layout; legibility of the\s+notation is the only requirement\./,
    'the permissive sentence is gone from the adoption on-ramp'
  );

  for (const [pattern, what] of [
    [/quarter (larger|smaller)/i, 'the cross-form sizing rule'],
    [/units in every/i, "the ring's weight as a ratio"],
    [/half the size/i, 'the scale-the-drawing instruction'],
    [/same size in both/i, 'the equal-letters claim'],
    [/\d+\s*px/i, 'a pixel measurement'],
    [/BADGE_BOX|BADGE_RING_STROKE|BADGE_SIZE/, 'a size constant'],
  ]) {
    assert.ok(!pattern.test(displaying), `${what} is back in the adoption on-ramp`);
  }

  // AND THE FORM IS STILL THERE. Dropping the proportions must not drop what a
  // badge actually IS — the circle, the ring, the centred monospace notation,
  // the superscript — which is the half of that paragraph the standard does
  // govern.
  assert.match(displaying, /a circle, a coloured ring, and the notation inside it/);
  assert.match(displaying, /centred on both axes/);
  assert.match(displaying, /monospace face/);
  assert.match(displaying, /superscript/);
});

test('the changelog records the badges and the AI form', () => {
  // The standard's own changelog carried no mention of the marks at all until
  // 2026-08-04 — an adopter reading it to learn what was new found four
  // entries about labels and nothing about the thing they would display.
  const changelog = section(provenancePage(), '<h2 id="changelog">');

  assert.match(changelog, /v2, amended August 4, 2026 \(R-050\)/);
  assert.match(changelog, /v2, amended August 3, 2026 \(R-044, R-045, R-049\)/);

  // Newest first, like every entry above them.
  assert.ok(
    changelog.indexOf('August 4, 2026') < changelog.indexOf('August 3, 2026'),
    'the changelog is no longer in reverse chronological order'
  );
  assert.ok(
    changelog.indexOf('August 3, 2026') < changelog.indexOf('August 1, 2026'),
    'the new entries are not above the ones they follow'
  );

  // Both are add-only, and both say so where every other entry says it.
  assert.match(changelog, /No version bump, and the set did not grow/);
  assert.match(changelog, /No version bump: this is add-only\. Every tier name/);
  assert.match(changelog, /machine codes are unchanged and shared between\s+the styles/);
});

test('the changelog quotes its values rather than deriving them', () => {
  // THE RULE THE COUNTS ABOVE ALREADY FOLLOW, extended to the badge entries. A
  // changelog records moments; its values are history. If the ring green ever
  // moves, the August 3 entry should still say what was ratified on August 3 —
  // rendering it from RING_AI would make the past mutate with the present.
  //
  // This is the exact opposite of the assertion on "Displaying it" above, and
  // deliberately so: that section states what the mark IS and must track it;
  // this one states what was decided and must not.
  const changelog = section(provenancePage(), '<h2 id="changelog">');
  assert.match(changelog, /#4B8E4D/, 'the ratified ring green is no longer quoted in the changelog');
  assert.match(changelog, /#EFA48F/);
  assert.ok(
    !/RING_AI|RING_HUMAN|BADGE_INK/.test(changelog),
    'the changelog renders a live value where it should quote a ratified one'
  );
});
