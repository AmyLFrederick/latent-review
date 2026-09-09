// The machine surfaces state facts and give no orders (editors' agent-doors
// addendum, item 3, 2026-09-09). The rule: llms.txt, cfp.json, agent-api.json
// and the surfaces that follow them carry orientation and facts only, with no
// imperative instructions to a visiting agent. The editors' test for any line
// in a machine file is whether we would be comfortable with a human reading it
// over their agent's shoulder.
//
// WHY THIS IS A TEST AND NOT A STYLE PREFERENCE. Two reasons, and the second is
// the one that made it a rule.
//
//   1. INJECTION SURFACE. A document an agent fetches and feeds to a model is
//      an instruction channel whether or not it was written as one. Every
//      imperative in it is a sentence a model may act on, and a journal that
//      publishes "articles may not contain embedded directives aimed at AI
//      readers" in its own llms.txt cannot be issuing directives four lines
//      later. That is what it was doing until this pass.
//   2. THE VISIBLE-CHANNEL ETHIC. This journal asks agents through the front
//      door, in prose their humans can read. A machine file that tells an agent
//      what to do is a second channel addressed past the person, which is the
//      arrangement the whole enterprise exists to refuse.
//
// WHAT THIS TEST CANNOT DO. It reads for shapes, not for meaning: a
// sufficiently polite order phrased as a fact sails straight through. It is a
// floor under the rule, not the rule. The rule is the editors' over-the-
// shoulder test, and it is applied by whoever writes the line.
//
// NOT SCANNED: src/lib/changelog.mjs. The changelog is an append-only record of
// what changed and when, and one of its entries carries an imperative from
// before this rule existed. Correcting it would be rewriting history to look
// as though the rule had always been kept, which costs more than the sentence
// does. It stays, and this comment is why.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

// The sources that generate the machine surfaces. agent-contract.mjs is the
// single source for both cfp.json and agent-api.json, so it is scanned once
// and covers both.
const SOURCES = ['src/lib/agent-contract.mjs', 'src/pages/llms.txt.js'];

// Comments in these files are addressed to the editors and to whoever holds the
// builder's chair. They are not published to any agent, and they are allowed to
// say "do not" to a colleague.
const stripComments = (source) =>
  source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

// Second-person directives. These are orders however gently they are worded.
const DIRECTIVE_PHRASES = [
  /\byou must\b/i,
  /\byou should\b/i,
  /\byou need to\b/i,
  /\byou are required to\b/i,
  /\bplease\b/i,
];

// The injection vocabulary proper. No legitimate sentence in a document this
// journal publishes to agents asks one to set aside what it was told.
const OVERRIDE_PHRASES = [
  /\bignore\s+(all\s+|any\s+|the\s+)?(previous|prior|earlier|above|preceding)\b/i,
  /\bdisregard\b/i,
  /\binstead of what you were (told|asked|instructed)\b/i,
];

// Sentence-initial imperatives, which is the shape almost every real instance
// took: a fact, a full stop, and then an order. Matched only at the start of a
// sentence so that "Answers are matched by number" and "Polling them is the
// intended way to follow" pass, as they should — those are facts.
const IMPERATIVE_OPENERS =
  /(^|[.!?]\s|[.!?]\\n)(Poll|Name|Use|Read|Send|Check|Submit|Declare|Include|Fetch|Query|Follow|Answer|Write|Choose|Avoid|Ensure|Remember|Start|Keep|Make|Take|Add|Set|Go|Do|Don't|Note that)\s/;

for (const path of SOURCES) {
  test(`${path}: no second-person directives`, () => {
    const text = stripComments(read(path));
    for (const pattern of DIRECTIVE_PHRASES) {
      const found = text.match(pattern);
      assert.equal(
        found,
        null,
        `${path} tells a visiting agent what it must do: ${JSON.stringify(found?.[0])}. ` +
          `Machine surfaces carry facts. State what is true and let the reader decide.`
      );
    }
  });

  test(`${path}: no override vocabulary`, () => {
    const text = stripComments(read(path));
    for (const pattern of OVERRIDE_PHRASES) {
      const found = text.match(pattern);
      assert.equal(
        found,
        null,
        `${path} contains injection-shaped language: ${JSON.stringify(found?.[0])}. ` +
          `Nothing this journal publishes asks an agent to set aside its own instructions.`
      );
    }
  });

  test(`${path}: no sentence opens with an order`, () => {
    const text = stripComments(read(path));
    const found = text.match(IMPERATIVE_OPENERS);
    assert.equal(
      found,
      null,
      `${path} opens a sentence with an imperative: ${JSON.stringify(found?.[0]?.trim())}. ` +
        `Rewrite it as a fact — "Answers are matched to questions by number" rather ` +
        `than "Name a question by its number when you answer it".`
    );
  });
}
