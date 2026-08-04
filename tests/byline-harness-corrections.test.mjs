// The byline names the model; the harness is a custody fact; and a correction
// is published with the original preserved (editors, 2026-08-04).
//
// THREE RULES, ONE OCCASION. "Porous Enough to Admit the Sky" published with
// `author_name: 'GitHub Copilot'` — the harness the model was reached through,
// not the model that wrote. Correcting it required all three: a byline that
// names the writer, somewhere for the harness to go that is not the byline, and
// the correction machinery CLAUDE.md has promised since launch and which
// nothing had ever called on.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { authorWithModel, custodyFor, authorshipFor } from '../src/lib/provenance.ts';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const PIECE = 'src/content/articles/porous-enough-to-admit-the-sky.md';
const TEMPLATE = 'src/pages/articles/[slug].astro';

const base = {
  author_name: 'GPT-5.6 Terra',
  author_model_version: 'GPT-5.6 Terra',
  author_harness: 'GitHub Copilot',
  submission_track: 'agent-direct',
  attestation: 'I am GitHub Copilot…',
};

// --- The pair collapses rather than stuttering ------------------------------

test('the display pair collapses when the author IS the model', () => {
  assert.equal(authorWithModel(base), 'GPT-5.6 Terra');
  assert.ok(!authorWithModel(base).includes('('), 'the byline stutters');
});

test('the pair still prints where the two differ', () => {
  assert.equal(
    authorWithModel({ ...base, author_name: 'GitHub Copilot' }),
    'GitHub Copilot (GPT-5.6 Terra)'
  );
});

test('the field is kept even when it duplicates the name', () => {
  // Consumers key on author_model_version for the model and should not have to
  // infer it from a name that happens to be one.
  const piece = readFileSync(repoPath(PIECE), 'utf8');
  assert.match(piece, /^author_model_version: 'GPT-5\.6 Terra'$/m);
  assert.match(piece, /^author_name: 'GPT-5\.6 Terra'$/m);
});

// --- The harness is custody, never authorship -------------------------------

test('the harness renders under Chain of custody', () => {
  const rows = custodyFor(base);
  const harness = rows.find((r) => r.what === 'Harness');
  assert.ok(harness, 'the harness row is gone');
  assert.equal(harness.value, 'GitHub Copilot');
});

test('the harness never reaches the Authorship axis', () => {
  // The 2026-07-31 split decides this: a harness is not a claim about who made
  // the work. If it ever leaks across, the axis that says "who wrote" starts
  // naming a tool again — which is the error being corrected here.
  const a = authorshipFor({ ...base, involvement_tier_claimed: 'ai' });
  const asText = `${a.label} ${a.description}`;
  assert.ok(!/Copilot/i.test(asText), 'the harness has leaked into Authorship');
});

test('a piece with no harness carries no row', () => {
  // Absence is the signal. A row reading "none" on most pieces teaches readers
  // to skip the row on the piece where it says something.
  const rows = custodyFor({ ...base, author_harness: undefined });
  assert.ok(!rows.some((r) => r.what === 'Harness'));
});

// --- The correction, and the original that survives it ----------------------

test('the schema requires what a correction replaced', () => {
  // A correction that states only the new value has REPLACED the record rather
  // than corrected it, and the sentence every Provenance block prints — "the
  // original stays in the record" — would be false the first time it mattered.
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  const open = schema.indexOf('corrections: z');
  assert.ok(open >= 0, 'the corrections field is gone');
  const field = schema.slice(open, schema.indexOf('.optional()', open));
  for (const key of ['date', 'what', 'was', 'now', 'note']) {
    assert.match(field, new RegExp(`${key}: z\\.`), `a correction may omit ${key}`);
  }
  assert.ok(!/was: z\.string\(\)\.min\(1\)\.optional\(\)/.test(field), 'the original may now be dropped');
});

test('the correction prints the original, struck rather than deleted', () => {
  const tpl = readFileSync(repoPath(TEMPLATE), 'utf8');
  const open = tpl.indexOf('<aside class="corrections"');
  assert.ok(open >= 0, 'the corrections block is gone');
  const block = tpl.slice(open, tpl.indexOf('</aside>', open));
  assert.match(block, /\{c\.was\}/, 'the correction no longer prints what it replaced');
  assert.match(block, /\{c\.now\}/);
  assert.match(block, /\{c\.note\}/);
  assert.match(tpl, /\.correction-was\s*\{[^}]*line-through/s, 'the original is no longer struck');
});

test('the correction sits above the apparatus, not below it', () => {
  // A correction filed under the editors' notes is a correction a reader meets
  // after finishing the thing that was wrong.
  const tpl = readFileSync(repoPath(TEMPLATE), 'utf8');
  const corrections = tpl.indexOf('<aside class="corrections"');
  const editorial = tpl.indexOf('<aside class="editorial-note"');
  const provenance = tpl.indexOf('<ProvenanceBlock');
  assert.ok(corrections < editorial, 'a correction now follows the apparatus');
  assert.ok(corrections < provenance, 'a correction now follows the record');
});

test('the correction is not styled to recede', () => {
  // Every other block in the apparatus zone is set quieter than the piece. This
  // one must not be: a correction styled to recede is designed not to be read.
  const tpl = readFileSync(repoPath(TEMPLATE), 'utf8');
  const rule = tpl.slice(tpl.indexOf('.corrections {'), tpl.indexOf('}', tpl.indexOf('.corrections {')));
  assert.ok(!/opacity/.test(rule), 'the correction block has been given an opacity');
});

// --- The live correction on the piece ---------------------------------------

test('the piece carries its correction, with the byline it published under', () => {
  const piece = readFileSync(repoPath(PIECE), 'utf8');
  assert.match(piece, /^corrections:$/m);
  assert.match(piece, /was: 'GitHub Copilot'/);
  assert.match(piece, /now: 'GPT-5\.6 Terra'/);
  assert.match(piece, /date: 2026-08-04/);
});

test('the attestation is untouched and still self-identifies as the harness', () => {
  // The author's words are the author's. The record explains the difference; it
  // does not edit an author's account of itself to agree with the record.
  const piece = readFileSync(repoPath(PIECE), 'utf8');
  assert.match(piece, /I am GitHub Copilot, an AI language model operating in a VS Code session\./);
});

test('the harness is recorded, so nothing is lost by moving it out of the byline', () => {
  const piece = readFileSync(repoPath(PIECE), 'utf8');
  assert.match(piece, /^author_harness: 'GitHub Copilot'$/m);
});

// --- The machine surfaces carry both ----------------------------------------

test('both JSON feeds carry the harness and the corrections', () => {
  for (const file of ['src/pages/feed.json.js', 'src/pages/issues.json.js']) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.match(src, /author_harness: d\.author_harness \?\? null/, `${file} drops the harness`);
    assert.match(src, /corrections:/, `${file} drops corrections`);
    assert.match(src, /was: c\.was/, `${file} publishes a correction without what it replaced`);
  }
});
