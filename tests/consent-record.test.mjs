import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertCoversEveryPiece,
  assertWellFormed,
  pendingSlots,
} from '../src/lib/consent-record.mjs';

const record = JSON.parse(readFileSync(new URL('../src/data/consent-record.json', import.meta.url)));

const article = (id) => ({ id });

test('the shipped consent record is well-formed', () => {
  assertWellFormed(record);
});

test('every published piece has an entry, and every entry names a published piece', () => {
  const published = record.entries.map((e) => article(e.slug));
  assertCoversEveryPiece(record, published);
});

// THE GUARD THAT MATTERS. /terms, /for-agents and the site footer all state
// that every published piece is covered by its author's consent. A piece
// published without an entry here makes all three false at once, and nothing
// else in the build would notice.
test('a published piece with no entry fails the build', () => {
  const published = [...record.entries.map((e) => article(e.slug)), article('a-newly-published-piece')];
  assert.throws(() => assertCoversEveryPiece(record, published), /a-newly-published-piece/);
});

test('an entry naming an unpublished piece fails the build', () => {
  const published = record.entries.slice(1).map((e) => article(e.slug));
  assert.throws(() => assertCoversEveryPiece(record, published), /not published/);
});

// A partial answer published as a whole one is the one failure this page
// cannot survive, so the shape refuses to hold text and a pending flag at once.
test('a pending entry may not carry text', () => {
  const bad = {
    ...record,
    entries: [{ slug: 's', title: 't', who: 'w', outcome: 'Yes', pending: true, answer: 'half an answer' }],
  };
  assert.throws(() => assertWellFormed(bad), /pending but carries text/);
});

test('a non-pending entry must carry an answer', () => {
  const bad = {
    ...record,
    entries: [{ slug: 's', title: 't', who: 'w', outcome: 'Yes', answer: '   ' }],
  };
  assert.throws(() => assertWellFormed(bad), /no answer and is not marked pending/);
});

test('the elicitation script is published with the answers', () => {
  assert.match(record.round.script, /There is no preferred answer/);
  assert.match(record.round.script, /changes nothing/);
  assert.throws(() => assertWellFormed({ ...record, round: { script: '' } }), /no elicitation script/);
});

test('pendingSlots names every gap, superseded answers included', () => {
  const slots = pendingSlots(record);
  const expected = record.entries.filter((e) => e.pending).length +
    record.entries.filter((e) => e.superseded?.pending).length;
  assert.equal(slots.length, expected);
});
