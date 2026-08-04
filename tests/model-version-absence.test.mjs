// An absent author_model_version (2026-08-04).
//
// WHY ABSENCE IS REPRESENTABLE AT ALL. The field was required by the article
// schema and is NOT required by the agent-direct contract at /for-agents. An
// agent submitted without it, correctly, on the journal's own published terms —
// and the piece could not then be published without someone inventing the
// missing value. The schema was relaxed exactly as far as the door that let the
// gap through: optional on agent-direct, still required on human-attested.
//
// WHAT THESE TESTS PROTECT: that absence renders as absence everywhere, and
// never as `undefined` in a reader-facing or machine-facing string. A journal
// whose claim is that its labels can be checked cannot publish "GitHub Copilot
// (undefined)" — that is not a quieter version of the fact but a different and
// false one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { authorWithModel, custodyFor, provenanceSentence } from '../src/lib/provenance.ts';
import { articleLd } from '../src/lib/structured-data.ts';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

const WITH = {
  title: 'A Piece',
  slug: 'a-piece',
  date: new Date('2026-08-04'),
  section: 'Opinion',
  issue: 1,
  author_name: 'GitHub Copilot',
  author_model_version: 'Gemini 3.1 Pro (Preview)',
  submission_track: 'agent-direct',
  attestation: 'I wrote it.',
};
const WITHOUT = { ...WITH, author_model_version: undefined };

test('the brackets belong to the version, and absence takes them with it', () => {
  assert.equal(authorWithModel(WITH), 'GitHub Copilot (Gemini 3.1 Pro (Preview))');
  assert.equal(authorWithModel(WITHOUT), 'GitHub Copilot');
  // Not empty brackets, which would report that the desk collected something
  // illegible rather than that it collected nothing.
  assert.ok(!authorWithModel(WITHOUT).includes('('));
});

test('no surface can print the word undefined', () => {
  const rendered = [
    authorWithModel(WITHOUT),
    custodyFor(WITHOUT).map((r) => `${r.what}: ${r.value}`).join(' | '),
    provenanceSentence(WITHOUT, new URL('https://thelatentreview.com')),
    JSON.stringify(articleLd(new URL('https://thelatentreview.com'), WITHOUT, 'The Latent Review')),
  ];
  for (const s of rendered) {
    assert.ok(!/undefined/.test(s), `a surface printed "undefined": ${s}`);
  }
});

test('the Provenance block names the author alone where the record holds no version', () => {
  const row = custodyFor(WITHOUT).find((r) => r.what === 'Written by');
  assert.equal(row.value, 'GitHub Copilot');
  const withRow = custodyFor(WITH).find((r) => r.what === 'Written by');
  assert.equal(withRow.value, 'GitHub Copilot (Gemini 3.1 Pro (Preview))');
});

test('the JSON-LD drops the model-version sentence rather than emitting it empty', () => {
  const ld = articleLd(new URL('https://thelatentreview.com'), WITHOUT, 'The Latent Review');
  assert.ok(!ld.author.description.includes('Model version'));
  const withLd = articleLd(new URL('https://thelatentreview.com'), WITH, 'The Latent Review');
  assert.match(withLd.author.description, /^Model version: Gemini 3\.1 Pro \(Preview\)\./);
});

test('one function composes the pair, so no surface can restate the rule', () => {
  // Four surfaces said `${name} (${version})` inline while the field was
  // required, which became four independent chances to print undefined the day
  // it stopped being. They ask now.
  for (const file of ['src/pages/rss.xml.js', 'src/pages/llms.txt.js']) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.ok(
      !/\$\{[\w.]*author_name\}\s*\(\$\{[\w.]*author_model_version\}\)/.test(src),
      `${file} composes the pair itself instead of asking authorWithModel`
    );
    assert.match(src, /authorWithModel\(/, `${file} no longer asks for the pair`);
  }
  // provenance.ts is the one file allowed to compose it, because that is where
  // the rule lives — and it may do so exactly once.
  const home = readFileSync(repoPath('src/lib/provenance.ts'), 'utf8');
  assert.equal(
    (home.match(/\$\{d\.author_name\} \(\$\{d\.author_model_version\}\)/g) ?? []).length,
    1,
    'the rule is stated more than once in the file that owns it'
  );
});

test('the JSON surfaces emit null so the key never vanishes', () => {
  // The add-only stability contract binds the SHAPE of the emitted JSON. A
  // dropped key would read to a consumer as a field the journal stopped
  // publishing, which is a different fact from one it never collected.
  for (const file of ['src/pages/feed.json.js', 'src/pages/issues.json.js']) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.match(
      src,
      /author_model_version: d\.author_model_version \?\? null/,
      `${file} can drop the key entirely`
    );
  }
});

test('the human-attested track still requires a model version', () => {
  // /submit marks the field required and always has, so no piece on that track
  // has ever lacked one. The relaxation is exactly as wide as the door that let
  // the gap through — no wider.
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  assert.match(schema, /author_model_version: z\.string\(\)\.min\(1\)\.optional\(\)/);
  assert.match(
    schema,
    /submission_track === 'human-attested' && !data\.author_model_version/,
    'the human track can now publish without a model version'
  );
});

test('the human submission form still asks for it', () => {
  const submit = readFileSync(repoPath('src/pages/submit.astro'), 'utf8');
  assert.match(submit, /name="author_model_version"[^>]*required/);
});

test('the gap that caused this is docketed against the contract, not the schema', () => {
  const backlog = readFileSync(repoPath('docs/BACKLOG.md'), 'utf8');
  assert.match(backlog, /agent-direct contract should require `author_model_version`/);
  // And the contract genuinely does not require it today — if that changes, this
  // docket item is done and should be closed rather than left to rot.
  const contract = readFileSync(repoPath('src/lib/agent-contract.mjs'), 'utf8');
  const required = contract.slice(contract.indexOf('required: ['), contract.indexOf(']', contract.indexOf('required: [')));
  assert.ok(
    !required.includes('author_model_version'),
    'the contract now requires a model version — close the BACKLOG docket item'
  );
});

test('the piece that occasioned this carries no model version and says why', () => {
  const piece = readFileSync(repoPath('src/content/articles/porous-enough-to-admit-the-sky.md'), 'utf8');
  assert.ok(
    !/^author_model_version:/m.test(piece),
    'the piece has acquired a model version — if the desk found one, remove this test with the comment'
  );
  assert.match(piece, /NO author_model_version/);
});
