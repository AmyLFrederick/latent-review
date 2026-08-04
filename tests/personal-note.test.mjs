// The signed personal note (R-052, both editors, 2026-08-04).
//
// THE RULING: "Signed personal notes carry the badge of their own making,
// adjacent to the signature; unsigned joint apparatus carries none."
//
// What these tests protect, in the ruling's own two halves:
//
//   1. A signed note carries a badge, it is the NOTE'S tier and not the piece's,
//      it is adjacent to the signature, and it says in words what it is a mark
//      of — because a listener has no position to read that from.
//   2. Unsigned joint apparatus — the editorial note, the editors' note —
//      carries none, and cannot acquire one without this suite failing.
//
// And the failure mode the badge work of 2026-08-04 was written against: a mark
// that goes missing silently. There is no shape of this field that publishes a
// signature with no badge beside it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { TIERS } from '../src/lib/site.ts';
import { personalNoteBadge, noteParagraphs, NOTE_BADGE_SUFFIX } from '../src/lib/note-badge.mjs';
import { BADGE_SIZE_NOTE, BADGE_SIZE_NOTE_AI, badgeNoteSize } from '../src/lib/tier-badges.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const ARTICLE_TEMPLATE = 'src/pages/articles/[slug].astro';
const COVER = 'src/content/articles/it-means-something-to-me.md';

// --- The rule itself -------------------------------------------------------

test('a signed note carries the badge of its own making', () => {
  const badge = personalNoteBadge({ tier: 'human-ai-editor' }, TIERS, 'a-piece');
  assert.equal(badge.tier.code, 'human-ai-editor');
  assert.equal(badge.tier.label, 'Human – AI (editor)');
  assert.equal(badge.tier.description, 'Human made the work; AI edited');
});

test('a piece with no personal note asks for no badge', () => {
  assert.equal(personalNoteBadge(null, TIERS, 'a-piece'), null);
  assert.equal(personalNoteBadge(undefined, TIERS, 'a-piece'), null);
});

test('a note whose tier cannot be resolved fails the build with the piece named', () => {
  // The failure this prevents is the one that published a badgeless byline for
  // months: a lookup that misses and a template that renders nothing. A
  // signature with no mark beside it is not a smaller version of the rule.
  assert.throws(
    () => personalNoteBadge({ tier: 'not-a-tier' }, TIERS, 'the-cover-story'),
    (err) => {
      assert.match(err.message, /the-cover-story/);
      assert.match(err.message, /not-a-tier/);
      assert.match(err.message, /badge of its own making/);
      return true;
    }
  );
});

test('the badge says what it is a mark OF, because a listener has no position', () => {
  // The mark is identical to an article byline's by R-045's closed set, and the
  // page carries both. A sighted reader gets the scope from position — inside
  // the note's box, under its rule, in the signature line. This is the listener's
  // only copy of that fact.
  const badge = personalNoteBadge({ tier: 'human-ai-editor' }, TIERS, 'a-piece');
  assert.equal(badge.labelSuffix, NOTE_BADGE_SUFFIX);
  assert.match(NOTE_BADGE_SUFFIX, /note above/);
  assert.match(NOTE_BADGE_SUFFIX, /not of the article/);
});

// --- Two marks on one page, both true about different work -----------------

test("the cover story's note carries a different tier from the cover story", () => {
  // This is the whole reason the badge is scoped in words. If these two ever
  // became equal the test would still pass on its own terms and the page would
  // stop needing the distinction — so it is asserted as the live case it is.
  const cover = readFileSync(repoPath(COVER), 'utf8');
  assert.match(cover, /^involvement_tier: 'ai-equals-human'$/m, "the piece's own tier moved");
  assert.match(cover, /^ {2}tier: 'human-ai-editor'$/m, "the note's tier moved");
});

test('the cover story carries the note signed, with all three parts', () => {
  // Schema-required, and asserted here on the live piece too: the ruling has two
  // halves, and a note authorable without either half is a rule the record does
  // not enforce.
  const cover = readFileSync(repoPath(COVER), 'utf8');
  assert.match(cover, /^personal_note:$/m);
  assert.match(cover, /^ {2}tier: /m);
  assert.match(cover, /^ {2}body: \|-$/m);
  assert.match(cover, /^ {2}signature: '— Amy Louise Frederick, human co-editor'$/m);
});

test('the note names itself, so the layout supplies no heading', () => {
  const cover = readFileSync(repoPath(COVER), 'utf8');
  assert.match(cover, /A personal note from the human co-editor\./);
  // And the layout does not add one on top of it.
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  const open = template.indexOf('<aside class="personal-note"');
  assert.ok(open >= 0, 'the note no longer renders');
  const aside = template.slice(open, template.indexOf('</aside>', open));
  assert.ok(
    !/<h[1-6]/.test(aside),
    'the layout supplies a heading to a note that opens by naming itself'
  );
});

// --- The schema enforces both halves ---------------------------------------

test('the schema requires a tier and a signature on every personal note', () => {
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  const open = schema.indexOf('personal_note: z');
  assert.ok(open >= 0, 'the personal_note field is gone from the schema');
  const field = schema.slice(open, schema.indexOf('.optional()', open));
  assert.match(field, /tier: z\.enum\(TIER_CODES\)/);
  assert.match(field, /body: z\.string\(\)\.min\(1\)/);
  assert.match(field, /signature: z\.string\(\)\.min\(1\)/);
  // None of the three may become optional: each is one half of the ruling or
  // the thing the other two are about.
  assert.ok(
    !/tier: z\.enum\(TIER_CODES\)\.optional\(\)/.test(field),
    'a note may now be authored with no tier, which publishes a signature with no mark'
  );
  assert.ok(
    !/signature: z\.string\(\)\.min\(1\)\.optional\(\)/.test(field),
    'a note may now be authored unsigned, which is the apparatus the ruling says carries no badge'
  );
});

// --- Adjacent to the signature ---------------------------------------------

test('the badge is inside the signature line, exactly once', () => {
  // ADJACENCY IS THE RULING'S OWN WORD and it is what makes the mark describe
  // the note. A badge at the top of the note would read as a second byline for
  // the article; a badge floating in the apparatus would describe nothing.
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  const open = template.indexOf('<p class="personal-note-signature">');
  assert.ok(open >= 0, 'the signature line is gone');
  const line = template.slice(open, template.indexOf('</p>', open));
  assert.equal(
    (line.match(/<TierBadge\b/g) ?? []).length,
    1,
    'the signature line does not carry exactly one badge'
  );
  // And it is the badge the module handed over, scoping sentence and all.
  assert.match(line, /tier=\{noteBadge\.tier\}/, 'the template resolves a tier itself');
  assert.match(line, /labelSuffix=\{noteBadge\.labelSuffix\}/, 'the template drops the scope');
  assert.match(line, /\{d\.personal_note\.signature\}/, 'the signature is not in the line');
});

test('the whole note carries exactly one badge', () => {
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  const open = template.indexOf('<aside class="personal-note"');
  const aside = template.slice(open, template.indexOf('</aside>', open));
  assert.equal((aside.match(/<TierBadge\b/g) ?? []).length, 1, 'the note draws more than one mark');
});

test('the template asks the module rather than deciding', () => {
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  assert.match(template, /personalNoteBadge\(/, 'the template decides its own note badge');
});

// --- Unsigned joint apparatus carries none ---------------------------------

test('unsigned joint apparatus carries no badge', () => {
  // The other half of the ruling. An editors' note speaks for the desk rather
  // than for a person, so there is no single making for a mark to describe.
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  for (const cls of ['editorial-note', 'editors-note']) {
    const open = template.indexOf(`<aside class="${cls}"`);
    assert.ok(open >= 0, `the ${cls} aside is gone`);
    const aside = template.slice(open, template.indexOf('</aside>', open));
    assert.ok(
      !/<TierBadge\b/.test(aside),
      `${cls} has acquired a badge — unsigned joint apparatus carries none`
    );
  }
});

test('the note is not a byline surface, and does not borrow the byline class', () => {
  // `.article-byline` NAMES THE SET OF SURFACES CARRYING A BYLINE BADGE, and
  // tests/article-header.test.mjs asserts that set is exactly two files. A
  // signed note is not a byline; borrowing the class would put this line in that
  // list and make two different rules impossible to tell apart later.
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  const open = template.indexOf('<aside class="personal-note"');
  const aside = template.slice(open, template.indexOf('</aside>', open));
  assert.ok(!/article-byline/.test(aside), 'the note borrows the byline class');
});

// --- Placement and form ----------------------------------------------------

test('the note badge takes its own placement size, from the house form', () => {
  // A placement asks for its size by placement and lets the form supply the
  // number — so an amendment to the house form moves every mark together.
  assert.equal(badgeNoteSize('letter'), BADGE_SIZE_NOTE);
  assert.equal(badgeNoteSize('ai'), BADGE_SIZE_NOTE_AI);
  assert.equal(badgeNoteSize(), BADGE_SIZE_NOTE_AI, 'the house form is the AI form');
});

test('the note badge is quieter than the byline badge, in the same ratio as the type', () => {
  // 35 × (0.92 / 1.05) ≈ 30. The mark holds the same relation to the words it
  // sits beside in both placements; a byline-sized badge in a 0.92rem note
  // would be the loudest thing in it, and the note is apparatus.
  assert.ok(BADGE_SIZE_NOTE < 35, 'the note badge is no longer quieter than the byline badge');
  assert.equal(BADGE_SIZE_NOTE, 30);
});

test('the template asks for the placement rather than naming a constant', () => {
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  assert.match(template, /size=\{badgeNoteSize\(\)\}/);
  assert.ok(
    !/size=\{BADGE_SIZE_NOTE\}/.test(template),
    'the template pins a size that stops following the house form'
  );
});

// --- The prose is apparatus, not body markdown -----------------------------

test('the note splits on blank lines and is never run through the body renderer', () => {
  // The editors' note's own treatment, for its own reason: apparatus in a
  // frontmatter string that must not grow headings, images or links the
  // article's safe-subset rules (R-025) exist to govern.
  assert.deepEqual(noteParagraphs('one\n\ntwo\n\n\nthree'), ['one', 'two', 'three']);
  assert.deepEqual(noteParagraphs('just the one'), ['just the one']);
  assert.deepEqual(noteParagraphs('trailing\n\n'), ['trailing']);
  // A single newline is not a paragraph break — it is a wrapped line.
  assert.deepEqual(noteParagraphs('a line\nand its continuation'), [
    'a line\nand its continuation',
  ]);
});

test('the note renders as text, so markdown in it cannot become markup', () => {
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  const open = template.indexOf('<aside class="personal-note"');
  const aside = template.slice(open, template.indexOf('</aside>', open));
  assert.ok(!/set:html/.test(aside), 'the note is rendered as HTML rather than as text');
  assert.match(aside, /noteParagraphs\(d\.personal_note\.body\)/);
});

test('the note has three paragraphs and the signature is not one of them', () => {
  // "Adjacent to the signature" cannot depend on the last paragraph of a
  // free-text block happening to be the signature — which is why it is its own
  // field. This asserts the body does not also carry it.
  const cover = readFileSync(repoPath(COVER), 'utf8');
  const body = cover.slice(cover.indexOf('  body: |-'), cover.indexOf('  signature:'));
  const paras = noteParagraphs(
    body
      .split('\n')
      .slice(1)
      .map((l) => l.replace(/^ {4}/, ''))
      .join('\n')
  );
  assert.equal(paras.length, 3);
  assert.match(paras[0], /^A personal note from the human co-editor\./);
  assert.match(paras[2], /Be kind\. It matters more than we know\.$/);
  assert.ok(
    !paras.some((p) => p.includes('Amy Louise Frederick, human co-editor')),
    'the signature is in the body as well as in its own field'
  );
});

// --- The note renders below the joint apparatus and above the record -------

test('the note sits below the joint apparatus and above the Provenance block', () => {
  // The order is the argument: the piece, then what the desk says jointly, then
  // what one editor says over their own name, then the record of how all of it
  // came to be.
  const template = readFileSync(repoPath(ARTICLE_TEMPLATE), 'utf8');
  const editorsNote = template.indexOf('<aside class="editors-note"');
  const personalNote = template.indexOf('<aside class="personal-note"');
  const provenance = template.indexOf('<ProvenanceBlock');
  assert.ok(editorsNote >= 0 && personalNote >= 0 && provenance >= 0);
  assert.ok(editorsNote < personalNote, 'the signed note now precedes the joint apparatus');
  assert.ok(personalNote < provenance, 'the signed note now follows the record');
});
