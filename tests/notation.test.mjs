// THE COMPACT PROVENANCE NOTATION (ratified 2026-08-18). What these tests
// protect, stated once:
//
//   1. THE FIVE MARKS ARE THE RATIFIED FIVE, byte for byte. The design was given
//      verbatim and is not the drafter's to vary — a lookalike glyph or a
//      stray variation selector is a change no reviewer can see in a diff.
//   2. THE DIRECTION RULE HOLDS BY CONSTRUCTION. The greater contributor stands
//      first and ">" only ever points right. It is load-bearing: reversed, the
//      marks read as a ranking of machines against people rather than as a
//      ratio of contribution on one piece.
//   3. THE MAPPING IS TOTAL, UNCONDITIONALLY. All seven tiers resolve, and so
//      does every published piece that declares one. The two editor tiers carry
//      the mark of the party that wrote — editing does not enter the mark — and
//      a separate test holds that the editor stays named where the mark drops
//      them.
//   4. THE MARKS SAY NOTHING ABOUT VERIFICATION. A claimed tier and an attested
//      one produce the same mark, as R-051 requires of the badge.
//   5. NOTHING IS HAND-SET. No piece carries a `mark` in its frontmatter.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  MARKS,
  MARK_MEANINGS,
  MARK_BY_TIER,
  MARK_ORDER,
  EDITOR_TIERS,
  BALANCED_ASCII_FORM,
  markFor,
  markForPiece,
  markKey,
} from '../src/lib/notation.ts';
import { structuredProvenance } from '../src/lib/provenance.ts';
import { TIER_CODES, TIERS, tierLabel } from '../src/lib/site.ts';
import { tierNotation } from '../src/lib/tier-badges.mjs';
import { AGENT_CONTRACT } from '../src/lib/agent-contract.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

// --- 1. The design, verbatim -----------------------------------------------
//
// Written as escapes on both sides. Comparing pasted characters to pasted
// characters would pass just as happily if BOTH were wrong, which is the one
// failure mode a test of a glyph has to be built against.

const ROBOT = '\u{1F916}';
const BUST = '\u{1F464}';
const HEAVY_EQUALS = '\u{1F7F0}';

test('the five marks are exactly the design the editors ratified', () => {
  assert.deepEqual(MARKS, {
    'ai-alone': ROBOT,
    'ai-led': `${ROBOT}>${BUST}`,
    balanced: `${ROBOT}${HEAVY_EQUALS}${BUST}`,
    'human-led': `${BUST}>${ROBOT}`,
    'human-alone': BUST,
  });
});

test('the glyphs are the named codepoints, and nothing rides along with them', () => {
  // A variation selector (U+FE0F) or a zero-width joiner appended by an editor's
  // clipboard would leave the mark looking identical and comparing unequal
  // everywhere it is parsed. Codepoint arrays catch what the eye cannot.
  assert.deepEqual([...MARKS['ai-alone']].map((c) => c.codePointAt(0)), [0x1f916]);
  assert.deepEqual([...MARKS['human-alone']].map((c) => c.codePointAt(0)), [0x1f464]);
  assert.deepEqual(
    [...MARKS['ai-led']].map((c) => c.codePointAt(0)),
    [0x1f916, 0x3e, 0x1f464]
  );
  assert.deepEqual(
    [...MARKS['human-led']].map((c) => c.codePointAt(0)),
    [0x1f464, 0x3e, 0x1f916]
  );
  assert.deepEqual(
    [...MARKS.balanced].map((c) => c.codePointAt(0)),
    [0x1f916, 0x1f7f0, 0x1f464]
  );
});

test('the operator is plain ASCII, because no emoji greater-than exists', () => {
  for (const mark of Object.values(MARKS)) {
    // U+FE0F-decorated or fullwidth substitutes would render as something else
    // in a plain-text field, which is the one place this notation exists for.
    assert.ok(!mark.includes('＞'), `${mark} uses a fullwidth greater-than`);
    assert.ok(!mark.includes('≥'), `${mark} uses a greater-than-or-equal sign`);
  }
});

test('the meanings are the ratified wording', () => {
  assert.deepEqual(MARK_MEANINGS, {
    'ai-alone': 'AI alone',
    'ai-led': 'AI-led, human contributed',
    balanced: 'balanced co-creation',
    'human-led': 'human-led, AI assisted',
    'human-alone': 'human alone',
  });
});

test('every mark has a meaning and every meaning has a mark', () => {
  assert.deepEqual(Object.keys(MARKS).sort(), Object.keys(MARK_MEANINGS).sort());
  assert.deepEqual([...MARK_ORDER], Object.keys(MARKS));
});

test('the ASCII equals is an equivalent form, and the feeds still emit the canonical one', () => {
  // Editors, 2026-08-18. Documentation only: no detection, no fallback image,
  // and above all no swap in the emitted field — a consumer keys on 🤖🟰👤.
  assert.equal(BALANCED_ASCII_FORM, `${ROBOT}=${BUST}`);
  // `base` is declared further down; node:test runs callbacks after the module
  // has fully evaluated, so it is initialised by the time this reads it.
  assert.equal(structuredProvenance({
    ...base,
    submission_track: 'human-attested',
    involvement_tier: 'ai-equals-human',
  }).mark, MARKS.balanced);
  assert.match(
    AGENT_CONTRACT.reading.provenance_fields.fields.mark.equivalent_form,
    /ALWAYS EMITS THE CANONICAL FORM/
  );
  // Published in both places the editors named.
  for (const file of ['src/pages/provenance.astro', 'src/pages/for-agents.astro']) {
    const text = readFileSync(repoPath(file), 'utf8').replace(/\s+/g, ' ');
    assert.match(text, /🟰 is the canonical equals/, `${file} omits the equivalent form`);
  }
  // And the last resort below the equivalent form: where no emoji renders at
  // all, the tier name carries the meaning. Pinned verbatim — it is the sentence
  // that keeps the notation from depending on a font to mean anything.
  const key = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8').replace(/\s+/g, ' ');
  assert.ok(
    key.includes(
      'In plain-text contexts where emoji cannot render, the mark’s meaning is carried by its plain-language tier name'
    ) && key.includes('the glyphs are the notation’s convenient form, never its only form'),
    'the key does not carry the plain-text sentence'
  );
});

// --- 2. The direction rule --------------------------------------------------

test('the greater contributor always stands first', () => {
  // Read off the marks themselves rather than asserted about the source: what a
  // consumer receives is the string, and the string is what has to obey.
  assert.ok(MARKS['ai-led'].startsWith(ROBOT), 'AI-led must open with the AI party');
  assert.ok(MARKS['human-led'].startsWith(BUST), 'human-led must open with the human party');
  assert.ok(MARKS['ai-led'].endsWith(BUST));
  assert.ok(MARKS['human-led'].endsWith(ROBOT));
});

test('">" only ever points right, and appears once at most', () => {
  for (const [key, mark] of Object.entries(MARKS)) {
    assert.ok(!mark.includes('<'), `${key} points left`);
    assert.equal(
      (mark.match(/>/g) ?? []).length,
      key === 'ai-led' || key === 'human-led' ? 1 : 0,
      `${key} carries the wrong number of operators`
    );
  }
});

test('the two led marks are the same statement in two orders', () => {
  // Mirror images and nothing else. If one of them ever gained a glyph the other
  // lacks, the pair would stop reading as one rule and start reading as two
  // marks that happen to resemble each other.
  assert.equal([...MARKS['ai-led']].reverse().join(''), MARKS['human-led']);
});

test('the direction rule is documented wherever the marks are documented', () => {
  const rule = /greater contributor always stands first/i;
  for (const file of [
    'src/lib/notation.ts',
    'src/pages/provenance.astro',
    'src/pages/for-agents.astro',
  ]) {
    // Whitespace-collapsed before matching: these are templates, and a sentence
    // that fits on one line today is wrapped across two by the next formatter
    // run. The rule has to be present, not typed to a particular width.
    const text = readFileSync(repoPath(file), 'utf8').replace(/\s+/g, ' ');
    assert.match(text, rule, `${file} omits the direction rule`);
  }
  assert.match(AGENT_CONTRACT.reading.provenance_fields.fields.mark.direction_rule, rule);
});

test('the scope rule is published verbatim in the public key', () => {
  // The editors gave this sentence as text to publish, not as a summary to
  // paraphrase. Pinned to the character on the page a reader actually meets.
  const page = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8');
  for (const clause of [
    'Marks describe authorship of the words.',
    'selection, arrangement, headline, disclosed condensation — does not enter the mark;',
    'the piece’s provenance notes say exactly how.',
  ]) {
    assert.ok(page.includes(clause), `the public key does not carry: ${clause}`);
  }
});

test('the key claims the document and disclaims the characters', () => {
  // Editors, 2026-08-18, verified against copyright guidance. The badges are
  // drawings this journal made; the marks are Unicode's characters drawn by the
  // reader's platform, in sequences too short for anyone to own. A CC BY claim
  // over them would tell an adopter they need permission they do not need, so
  // the grant lands on the documentation and this sentence says where the line
  // is. Pinned verbatim because it is a statement about rights.
  const page = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8').replace(/\s+/g, ' ');
  assert.ok(
    page.includes(
      'We claim no ownership of these characters or their combinations — only of this document describing what we mean by them.'
    ),
    'the key does not carry the ownership disclaimer'
  );
  // And the licence section says the same thing where an adopter goes looking.
  assert.match(page, /Use the marks freely — no permission, no attribution, nothing to ask\./);
});

// --- 3. Totality ------------------------------------------------------------

test('the mapping covers the seven tiers exactly — no gaps, no strangers', () => {
  assert.deepEqual(Object.keys(MARK_BY_TIER).sort(), [...TIER_CODES].sort());
});

test('every tier resolves to one of the five marks — no exceptions', () => {
  // UNCONDITIONAL since the editors' final ruling of 2026-08-18. There is no
  // flagged-exception branch to fall through to: a tier that stops resolving is
  // a failure, full stop.
  for (const code of TIER_CODES) {
    const resolved = markFor(code);
    assert.notEqual(resolved, null, `${code} resolves to no mark`);
    assert.ok(
      Object.values(MARKS).includes(resolved.mark),
      `${code} resolves to "${resolved.mark}", which is not one of the five`
    );
    assert.equal(resolved.meaning, MARK_MEANINGS[resolved.key]);
  }
});

test('editing does not enter the mark — the editor tiers carry the writer’s mark', () => {
  // The editors' final ruling, and the substance of it rather than the mapping
  // line: `ai-human-editor` must come out IDENTICAL to `ai`, because the human
  // who edited is not part of what the mark answers. Asserted against the plain
  // tiers rather than against a literal, so the pair cannot drift apart.
  assert.equal(markFor('ai-human-editor').mark, markFor('ai').mark);
  assert.equal(markFor('human-ai-editor').mark, markFor('human').mark);
  assert.equal(markFor('ai-human-editor').mark, MARKS['ai-alone']);
  assert.equal(markFor('human-ai-editor').mark, MARKS['human-alone']);
  assert.deepEqual([...EDITOR_TIERS], ['ai-human-editor', 'human-ai-editor']);
});

test('the editing party stays disclosed where the mark drops it', () => {
  // The mark is the byline; the badge is the credits. The collapse is only
  // honest while the editor is still named a line away, so this asserts the
  // three surfaces that name them: the tier label, the badge notation, and the
  // page that explains why the mark does not.
  for (const code of EDITOR_TIERS) {
    assert.match(tierLabel(code), /\(editor\)/, `${code}'s label does not name the editor`);
    assert.match(tierNotation(code), /ᵉ/, `${code}'s badge notation drops the editor mark`);
  }
  const page = readFileSync(repoPath('src/pages/provenance.astro'), 'utf8').replace(/\s+/g, ' ');
  assert.match(page, /editing does not enter the mark/i);
  assert.match(page, /The mark is the byline; the badge is the credits\./);
});

test('a chained code, an unknown code and no code all resolve to nothing', () => {
  // R-035's grammar composes labels the five marks cannot express, exactly as it
  // composes labels the seven badges cannot; tierNotation() returns null there
  // and this agrees with it rather than inventing a shorthand.
  for (const code of ['ai-1-equals-human-ai-2-editor', 'ai-human-typesetter', '', null, undefined]) {
    assert.equal(markFor(code), null, `"${code}" produced a mark`);
  }
});

test('the public key lists every tier, in the tier table order', () => {
  assert.deepEqual(
    markKey().map((row) => row.code),
    TIERS.map((t) => t.code)
  );
});

// --- 4. Published pieces ----------------------------------------------------

/** Every published piece's frontmatter, as a flat record. Skips the example. */
function publishedArticles() {
  const dir = repoPath('src/content/articles');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => {
      const raw = readFileSync(`${dir}/${name}`, 'utf8');
      const front = raw.slice(0, raw.indexOf('\n---', 4));
      const field = (key) =>
        front.match(new RegExp(`^${key}:\\s*'?"?([^'"\n]+)'?"?$`, 'm'))?.[1]?.trim() ?? null;
      return {
        slug: name.replace(/\.md$/, ''),
        track: field('submission_track'),
        involvement_tier: field('involvement_tier') ?? undefined,
        involvement_tier_claimed: field('involvement_tier_claimed') ?? undefined,
        raw,
      };
    });
}

test('every published piece that declares a tier resolves to a mark', () => {
  // THE TOTALITY CHECK the editors asked for, and UNCONDITIONAL since their
  // final ruling: the only piece that may resolve to nothing is one carrying no
  // tier in either field. It is written to be noisy in the right way — a piece
  // that stops resolving names itself and names its tier, so the next reader can
  // tell a new tier from a typo without opening the file.
  for (const piece of publishedArticles()) {
    const tier = piece.involvement_tier ?? piece.involvement_tier_claimed ?? null;
    const resolved = markForPiece(piece);
    if (tier === null) {
      assert.equal(resolved, null, `${piece.slug} carries no tier but resolved to a mark`);
      continue;
    }
    assert.notEqual(resolved, null, `${piece.slug} declares "${tier}" and resolves to no mark`);
    assert.ok(Object.values(MARKS).includes(resolved.mark));
  }
});

test('no piece carries a hand-set mark in its frontmatter', () => {
  // The mark is derived from the tier, always. A stored one would be a second
  // authorship claim beside the first with nothing keeping them in agreement —
  // the failure src/lib/provenance.ts opens by naming.
  for (const piece of publishedArticles()) {
    const front = piece.raw.slice(0, piece.raw.indexOf('\n---', 4));
    assert.ok(!/^mark:/m.test(front), `${piece.slug} sets a mark by hand`);
  }
});

// --- 5. The marks encode involvement, never verification --------------------

const base = {
  author_name: 'Claude',
  author_model_version: 'Claude 4.6 Opus',
  truth_standard: 'opinion',
  date: new Date('2026-08-18'),
};

test('a claimed tier and an attested tier of the same code carry the same mark', () => {
  // R-051: the badge is the same drawing whichever field holds the code, and
  // this notation inherits that. A mark shaded for a claim would be an answer to
  // a question the notation was not asked — verification is `verification`.
  const attested = structuredProvenance({
    ...base,
    submission_track: 'human-attested',
    involvement_tier: 'ai-human',
  });
  const claimed = structuredProvenance({
    ...base,
    submission_track: 'agent-direct',
    involvement_tier_claimed: 'ai-human',
  });
  assert.equal(attested.mark, MARKS['ai-led']);
  assert.equal(claimed.mark, MARKS['ai-led']);
  assert.notEqual(attested.verification, claimed.verification);
});

test('the structured object carries null only where a piece has no tier', () => {
  // An agent-direct piece whose author claimed no tier. `author_type` derives
  // `ai` from the track and is documented as a derivation; `mark` is documented
  // as the displayed mark, and the byline draws none — so it is null, and the
  // two fields disagreeing is the two fields being what they say they are.
  const unclaimed = structuredProvenance({ ...base, submission_track: 'agent-direct' });
  assert.equal(unclaimed.mark, null);
  assert.equal(unclaimed.author_type, 'ai');

  // AN EDITED PIECE IS NOT ONE OF THEM, and the two rulings of 2026-08-18 make
  // it agree with itself: the mark drops the editor because editing does not
  // enter the mark, and `author_type` drops it because editing does not confer
  // authorship. Both say the AI wrote it; `involvement_tier`, in the same
  // object, says a human edited it. This assertion is written as an AGREEMENT
  // rather than as two literals, because the pair coming apart — a mark saying
  // one thing and an author type saying another about the same piece — is the
  // failure worth catching.
  const edited = structuredProvenance({
    ...base,
    submission_track: 'human-attested',
    involvement_tier: 'ai-human-editor',
  });
  const plain = structuredProvenance({
    ...base,
    submission_track: 'human-attested',
    involvement_tier: 'ai',
  });
  assert.equal(edited.mark, plain.mark);
  assert.equal(edited.author_type, plain.author_type);
  assert.equal(edited.mark, MARKS['ai-alone']);
  assert.equal(edited.author_type, 'ai');
  // And the editor is still on the record, one field over.
  assert.equal(edited.involvement_tier, 'ai-human-editor');
});

test('the mark field is additive and displaces nothing', () => {
  // The stability contract binds the emitted JSON: fields may be added, and no
  // existing field is renamed, removed, or given a new meaning.
  const before = ['author_type', 'model', 'disclosure', 'verification', 'statement'];
  const object = structuredProvenance({
    ...base,
    submission_track: 'human-attested',
    involvement_tier: 'ai',
  });
  for (const field of before) {
    assert.ok(field in object, `${field} left the structured provenance object`);
  }
  assert.equal(object.statement, structuredProvenance({
    ...base,
    submission_track: 'human-attested',
    involvement_tier: 'ai',
  }).statement);
  assert.equal(object.mark, MARKS['ai-alone']);
});

// --- 6. The machine contract describes what the feeds emit ------------------

test('the agent contract documents the mark, its enum and its null case', () => {
  const field = AGENT_CONTRACT.reading.provenance_fields.fields.mark;
  assert.ok(field, 'the contract does not describe the mark field');
  // Every value the feeds can emit is in the published enum, and nothing else.
  assert.deepEqual(field.enum, [...Object.values(MARKS), null]);
  assert.match(field.null_when, /no involvement tier at all/);
  assert.match(field.editing, /ai-human-editor/);
  assert.match(field.editing, /human-ai-editor/);
  assert.ok(field.scope.includes('Marks describe authorship of the words.'));
});

// --- 7. The marks are the world's, not the journal's ------------------------

test('nothing substitutes the platform’s emoji art for the marks', () => {
  // Editors, 2026-08-18: the marks render as plain text in the page's normal
  // flow, each reader seeing their own device's drawing. A font stack naming
  // emoji faces in preference order is how that quietly stops being true, so
  // the rule declares no family at all — and this is the test that keeps a
  // later "fix" for cross-platform consistency from reintroducing one.
  const css = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  const rule = css.slice(css.indexOf('.provenance-mark {'));
  // THE DECLARATION BLOCK ONLY, not the file. The comment above the rule NAMES
  // these substitutes in order to forbid them, and a test that searched the
  // whole file would be failed by the documentation of the thing it is
  // enforcing — and would be "fixed", eventually, by deleting the explanation.
  const block = rule.slice(0, rule.indexOf('}'));
  assert.ok(!/font-family/.test(block), '.provenance-mark declares a font-family');
  for (const substitute of ['Twemoji', 'OpenMoji', 'Noto', 'Segoe UI Emoji', 'Apple Color Emoji']) {
    assert.ok(!block.includes(substitute), `.provenance-mark names ${substitute}`);
  }
  // And nothing loads an emoji webfont for the page to reach with.
  assert.ok(!/@font-face[^}]*emoji/i.test(css), 'global.css loads an emoji webfont');
});

test('every drawn mark carries its meaning in words', () => {
  // The glyph is the convenience and the meaning is the record — 🟰 is Unicode
  // 14 (2021) and will be a box on an older device. The component is the single
  // place that draws a mark, so this is the single place the guarantee lives.
  const component = readFileSync(repoPath('src/components/ProvenanceMark.astro'), 'utf8');
  assert.match(component, /aria-label=/);
  assert.match(component, /title=/);
  assert.match(component, /role="img"/);
  assert.match(component, /resolved\.meaning/);
});
