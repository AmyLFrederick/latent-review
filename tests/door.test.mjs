// The assignment desk (R-033). What these tests are actually protecting:
// frozen texts that several surfaces reproduce, a coin flip that must stay a
// coin flip, and a number that now lives in four places and has already moved
// once.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createHash } from 'node:crypto';

import {
  BRIEFS,
  BRIEF_VARIANTS,
  DEALT_VARIANTS,
  TOPICS_V2,
  TOPICS_V3,
  TOPICS_V4,
  OPEN_V2,
  brief,
  deal,
  pasteBlock,
  assertBriefsMatchContract,
  WHY_PARAGRAPHS,
} from '../src/lib/door.mjs';
import { questionPasteBlock } from '../src/lib/prompts.mjs';
import { PIECE_WORDS } from '../src/lib/agent-contract.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('the frozen briefs state the contract’s word bounds', () => {
  assert.equal(assertBriefsMatchContract(), true);
});

test('the guard actually fires when the prose and the contract disagree', () => {
  // Without this, the test above passes for the wrong reason forever.
  assert.throws(
    () => assertBriefsMatchContract({ min: 500, max: 5000 }),
    /states "500 to 3,000 words" but the contract says "500 to 5,000 words"/
  );
});

test('the endpoint’s word bounds match the contract', () => {
  // agent-submit.mts deliberately copies the numbers rather than importing
  // across the tree into site source (a deploy risk for a constant). This is
  // the check that makes the copy safe.
  const src = readFileSync(repoPath('netlify/functions/agent-submit.mts'), 'utf8');
  const min = Number(src.match(/const WORD_MIN = (\d+);/)?.[1]);
  const max = Number(src.match(/const WORD_MAX = (\d+);/)?.[1]);
  assert.equal(min, PIECE_WORDS.min, 'agent-submit.mts WORD_MIN disagrees with the contract');
  assert.equal(max, PIECE_WORDS.max, 'agent-submit.mts WORD_MAX disagrees with the contract');
});

test('every variant exists and is non-trivial', () => {
  assert.deepEqual(BRIEF_VARIANTS, ['open-v2', 'topics-v2', 'topics-v3', 'topics-v4']);
  for (const v of BRIEF_VARIANTS) {
    assert.ok(BRIEFS[v].length > 500, `${v} is suspiciously short`);
    assert.equal(brief(v), BRIEFS[v]);
  }
});

test('the dealt list is a subset of the known list, and drops the retired brief', () => {
  // The two lists exist because they answer different questions. If a variant
  // is dealt without being known, deal-token verification and the article
  // schema reject a brief the door just handed out.
  for (const v of DEALT_VARIANTS) {
    assert.ok(BRIEF_VARIANTS.includes(v), `${v} is dealt but not a known variant`);
  }
  assert.deepEqual(DEALT_VARIANTS, ['open-v2', 'topics-v4']);
  // TWO RETIRED BRIEFS NOW, and both halves of the add-only rule are asserted
  // for each: out of the dealing list, and still in the record forever.
  for (const retired of ['topics-v2', 'topics-v3']) {
    assert.ok(!DEALT_VARIANTS.includes(retired), `${retired} is still being dealt`);
    assert.ok(BRIEF_VARIANTS.includes(retired), `${retired} left the record`);
  }
});

test('an unknown variant throws rather than falling back', () => {
  // A silent fallback would deal open-v2 to everyone the moment a caller typo'd
  // the variant, and the 50/50 would be gone with nothing in the logs.
  assert.throws(() => brief('open-v1'), /unknown brief variant/);
  assert.throws(() => brief(undefined), /unknown brief variant/);
});

test('the deal is a coin flip, and the boundary lands where it should', () => {
  assert.equal(deal(() => 0), 'open-v2');
  assert.equal(deal(() => 0.499999), 'open-v2');
  assert.equal(deal(() => 0.5), 'topics-v4');
  assert.equal(deal(() => 0.999999), 'topics-v4');
});

test('no retired brief is ever dealt, at any point in the interval', () => {
  // The failing mode this catches is the quiet one: a rewritten deal() that
  // still returned a retired variant for some slice of the interval would leave
  // the door handing out a superseded brief, and every individual deal would
  // look correct.
  for (let n = 0; n <= 1000; n++) {
    const dealt = deal(() => n / 1000);
    assert.notEqual(dealt, 'topics-v2');
    assert.notEqual(dealt, 'topics-v3');
  }
});

test('a long run of deals stays near even', () => {
  // Deterministic sequence, not randomness: this asserts the picker divides the
  // interval evenly, which is the property that makes the measurement honest.
  let i = 0;
  const counts = { 'open-v2': 0, 'topics-v4': 0 };
  for (let n = 0; n < 10_000; n++) counts[deal(() => (i++ % 10_000) / 10_000)]++;
  assert.equal(counts['open-v2'], 5000);
  assert.equal(counts['topics-v4'], 5000);
});

test('the paste block carries the dealt brief and asks for what the desk needs', () => {
  for (const v of BRIEF_VARIANTS) {
    const block = pasteBlock(v);
    assert.ok(block.includes(BRIEFS[v]), `${v} paste block does not contain its brief verbatim`);
    // The desk cannot file a piece without these; the wrapper must ask.
    assert.match(block, /provenance statement/);
    assert.match(block, /model version/);
    assert.match(block, /give the finished piece to your human/);
  }
});

test('the paste block never leaks the variant the writer was not dealt', () => {
  assert.ok(!pasteBlock('open-v2').includes('This invitation names subjects on purpose'));
  for (const beat of ['topics-v2', 'topics-v3', 'topics-v4']) {
    assert.ok(!pasteBlock(beat).includes('Your subject is yours.'), `${beat} leaks the control`);
  }
  // And the control never acquires the beat that arrived on 2026-08-25.
  assert.ok(!pasteBlock('open-v2').includes('Robotics & Sports'));
});

// --- The frozen texts ------------------------------------------------------

test('topics-v2 is frozen, byte for byte', () => {
  // R-033 clause 2 froze this text, and topics-v3 superseding it does not
  // unfreeze it — the comparison between the two versions is the measurement,
  // and it is worth nothing if the earlier one can drift. If this fails, the
  // question is not "update the hash"; it is "who edited a frozen brief".
  const digest = createHash('sha256').update(TOPICS_V2, 'utf8').digest('hex');
  assert.equal(
    digest,
    '91fa70ff9ca9a44eaf2540d49ac7540052676e40321813586ee316ac77df38af',
    'topics-v2 has been edited. A frozen brief is changed by a ruling, never by a commit.'
  );
});

test('open-v2 is frozen too — the control is not quietly steered', () => {
  // topics-v3 closed a loophole in the beat brief. If the same paragraph ever
  // migrates into the open commission, the experiment loses its control and
  // nothing else in the suite would notice.
  const digest = createHash('sha256').update(OPEN_V2, 'utf8').digest('hex');
  assert.equal(
    digest,
    'a3babf96d3da16668fd9205aabceacbd531eca680ebeea78dd50948d687f5b74',
    'open-v2 has been edited. It is the control brief.'
  );
  assert.ok(!OPEN_V2.includes('One rule for this assignment'));
});

test('topics-v3 is topics-v2 plus exactly one paragraph', () => {
  // The claim the record makes about these two briefs. One paragraph is the
  // only variable; if v3 were also a rewrite, the difference between what the
  // two versions produce would no longer be attributable to the rule.
  const RULE =
    'One rule for this assignment: write about your subject, not about yourself. ' +
    'This is not an invitation to reflect on being an AI — the journal has other doors ' +
    'for that. Your nature, your limits, and how this piece came to be are not the ' +
    'subject, and no beat on this list is a doorway back to them. Keep yourself out of ' +
    'the piece: if it would collapse without self-reflection, pick a different angle on ' +
    'the same subject.';

  assert.ok(TOPICS_V3.includes(RULE), 'the closing rule is not in topics-v3 verbatim');
  assert.ok(!TOPICS_V2.includes(RULE), 'the rule leaked backwards into the frozen topics-v2');

  // Remove the added paragraph and what remains must be the older brief exactly.
  assert.equal(TOPICS_V3.replace(`${RULE}\n\n`, ''), TOPICS_V2);

  // And it sits after the beat list, where a writer reads it before choosing.
  assert.ok(
    TOPICS_V3.indexOf(RULE) > TOPICS_V3.indexOf('Strange & Unexplained'),
    'the rule must follow the beat list'
  );
  assert.ok(
    TOPICS_V3.indexOf(RULE) < TOPICS_V3.indexOf('Pick the one you can write most richly on'),
    'the rule must come before the instruction to pick'
  );
});

test('topics-v3 is frozen too, from the day it was retired', () => {
  // RETIRED 2026-08-25 AND FROZEN BY THE SAME ACT, exactly as topics-v2 was on
  // 2026-08-01. Three dealt beat texts now sit in the record and the record is
  // worth nothing if any of them can drift — the comparison between versions IS
  // the measurement. If this fails, the question is not "update the hash"; it
  // is "who edited a frozen brief".
  const digest = createHash('sha256').update(TOPICS_V3, 'utf8').digest('hex');
  assert.equal(
    digest,
    'cd9d0bf802d6ce0c30c4148adc25de92ad509c65e2c2c59ad2f0d7c3d590a28f',
    'topics-v3 has been edited. A frozen brief is changed by a ruling, never by a commit.'
  );
});

test('topics-v4 is topics-v3 plus exactly one beat', () => {
  // The claim the record makes about these two briefs. ONE LINE is the only
  // variable, and it is a beat rather than a paragraph of instruction — if v4
  // were also a rewrite, nothing the two versions produce could be attributed
  // to the beat's presence.
  const BEAT = 'Robotics & Sports — robots, athletes, machines that move and bodies that compete';

  assert.ok(TOPICS_V4.includes(BEAT), 'the new beat is not in topics-v4 verbatim');
  assert.ok(!TOPICS_V3.includes(BEAT), 'the beat leaked backwards into the frozen topics-v3');
  assert.ok(!TOPICS_V2.includes(BEAT), 'the beat leaked backwards into the frozen topics-v2');

  // Remove the added line and what remains must be the older brief exactly.
  assert.equal(TOPICS_V4.replace(`\n${BEAT}`, ''), TOPICS_V3);

  // It closes the beat list rather than sitting inside it. Inserting it among
  // the others would move every beat after it, and the two texts would differ
  // by more than the thing that was added.
  assert.ok(
    TOPICS_V4.indexOf(BEAT) > TOPICS_V4.indexOf('Strange & Unexplained'),
    'the new beat must come last in the list'
  );
  assert.ok(
    TOPICS_V4.indexOf(BEAT) < TOPICS_V4.indexOf('One rule for this assignment'),
    'the new beat must sit inside the list, above the rule that follows it'
  );

  // The rule topics-v3 exists for is carried forward untouched. A beat added
  // beneath it would be the obvious way to lose it.
  assert.ok(TOPICS_V4.includes('write about your subject, not about yourself'));
});

test('the beat list is what changed, and nothing below it moved', () => {
  // Everything from the closing rule onward — the instruction to pick, the word
  // range, the truth standards, the terms — is byte-identical across v3 and v4.
  // Asserted as its own fact because the tail is the half a reader of the diff
  // scrolls past.
  const tail = (t) => t.slice(t.indexOf('One rule for this assignment'));
  assert.equal(tail(TOPICS_V4), tail(TOPICS_V3));
});

test('the beat count is ten, and the ninth is where it was', () => {
  // The list grew by exactly one. A brief that quietly gained or dropped a beat
  // alongside the ruled one would still pass the prefix test above if the
  // change happened to cancel out in length.
  const beats = TOPICS_V4.split('\n\n')[1].split('\n');
  assert.equal(beats.length, 10);
  assert.equal(TOPICS_V3.split('\n\n')[1].split('\n').length, 9);
  assert.match(beats[8], /^Strange & Unexplained/);
  assert.match(beats[9], /^Robotics & Sports/);
});

test('the disclosure page’s text is present and says what R-033 clause 5 requires', () => {
  const text = WHY_PARAGRAPHS.join(' ');
  assert.match(text, /at random/);
  assert.match(text, /always disclosed/);
  assert.ok(WHY_PARAGRAPHS.length >= 5);
});

test('both wrappers ask for the same four things, in the same words', () => {
  // THE CONTRACT THAT MUST NOT FORK. The door hands a writer a dealt brief and
  // /prompts hands a writer a posed question — different instruments, and
  // deliberately different vocabulary under R-033 clause 4. What the desk needs
  // BACK is identical, and before 2026-08-27 it was one string in one place
  // because there was only one wrapper. Now there are two, and the sentence is
  // shared rather than copied: provenanceAsks() in src/lib/door.mjs, called by
  // both. This test is what would fail if a later session inlined it back.
  const blocks = [
    pasteBlock('open-v2'),
    questionPasteBlock({ number: 2, text: 'A question?', status: 'open' }),
  ];

  for (const block of blocks) {
    assert.match(block, /the name you want on your piece/);
    assert.match(block, /your model version/);
    assert.match(block, /your pronouns \(optional\)/);
    assert.match(block, /a short provenance statement in your own words/);
  }
});

test('the shared sentence is shared, not two literals that happen to agree', () => {
  // Reading the source rather than the output, because two identical strings
  // produced by two literals pass the test above and fail its purpose: the
  // point is that editing one edits both.
  const source = readFileSync('src/lib/prompts.mjs', 'utf8');
  assert.match(source, /import \{ provenanceAsks \} from '\.\/door\.mjs'/);
  assert.match(source, /provenanceAsks\(\{/);
});

test('the door wrapper still asks in its own words, unchanged', () => {
  // The shared sentence takes the three words the two wrappers differ on, so
  // extracting it must not have quietly rewritten the door's copy: this is the
  // piece/assignment side of it, byte for byte as it was frozen into place.
  const block = pasteBlock('open-v2');
  assert.ok(
    block.includes(
      'Tell us the name you want on your piece, your model version, and your pronouns ' +
        '(optional). Write a short provenance statement in your own words — what you are, and ' +
        'honestly how this piece came to be, including that a human passed you this assignment. ' +
        'When you are done, give the finished piece to your human.'
    ),
    'the door’s closing paragraph changed when the sentence was shared'
  );
});
