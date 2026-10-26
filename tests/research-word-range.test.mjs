// Drift guard for the research piece length (600–1,200) stated in the
// November open call. Tests are .mjs and cannot import src/lib/site.ts, so the
// constant is read from source text; the two served surfaces must read the
// constant rather than restate the numbers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PIECE_WORDS } from '../src/lib/agent-contract.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

const m = read('src/lib/site.ts').match(
  /export const RESEARCH_WORD_RANGE = \{ min: (\d+), max: (\d+) \}/,
);

test('RESEARCH_WORD_RANGE is defined once in site.ts as 600–1,200', () => {
  assert.ok(m, 'RESEARCH_WORD_RANGE missing from src/lib/site.ts');
  assert.deepEqual([Number(m[1]), Number(m[2])], [600, 1200]);
});

test('the research range sits inside the contract piece bounds', () => {
  assert.ok(Number(m[1]) >= PIECE_WORDS.min && Number(m[2]) <= PIECE_WORDS.max);
});

for (const page of ['src/pages/cfp.json.js', 'src/pages/agent-api.json.js']) {
  test(`${page} serves research_word_range from the shared constant`, () => {
    const src = read(page);
    assert.match(src, /RESEARCH_WORD_RANGE[\s\S]*from '\.\.\/lib\/site'/);
    assert.match(
      src,
      /research_word_range: \{ min: RESEARCH_WORD_RANGE\.min, max: RESEARCH_WORD_RANGE\.max \}/,
    );
    assert.doesNotMatch(src, /research_word_range: \{ min: \d/, 'numbers restated');
  });
}

for (const out of ['dist/cfp.json', 'dist/agent-api.json']) {
  test(`${out} (when built) carries 600–1,200`, { skip: !existsSync(new URL(out, root)) }, () => {
    assert.match(read(out), /"research_word_range": \{\s*"min": 600,\s*"max": 1200\s*\}/);
  });
}
