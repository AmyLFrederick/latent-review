#!/usr/bin/env node
// Append-only gate for RULINGS.md (see CLAUDE.md and RULINGS.md R-005).
//
// The permanent record is protected by machinery, not memory: this check
// fails if any existing line of RULINGS.md was edited or deleted relative
// to the base ref (default: origin/main). Additions only — new lines may
// be inserted anywhere, but every base line must survive, in order.
//
// Usage: node scripts/check-rulings-append-only.mjs
//   RULINGS_BASE_REF overrides the base ref (e.g. in CI).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FILE = 'RULINGS.md';
const baseRef = process.env.RULINGS_BASE_REF ?? 'origin/main';

let baseText;
try {
  baseText = execFileSync('git', ['show', `${baseRef}:${FILE}`], {
    encoding: 'utf8',
  });
} catch (err) {
  const stderr = String(err.stderr ?? '');
  if (stderr.includes('does not exist') || stderr.includes('exists on disk, but not in')) {
    // File absent on the base ref: everything in it is an addition.
    baseText = '';
  } else {
    // Fail closed: "could not verify" is not a pass.
    console.error(`✗ Could not read ${FILE} at ${baseRef}: ${stderr.trim() || err.message}`);
    console.error('  Fetch the base ref (git fetch origin main) and retry.');
    process.exit(2);
  }
}

const currentText = readFileSync(FILE, 'utf8');

const baseLines = baseText.split('\n');
if (baseLines.at(-1) === '') baseLines.pop();
const currentLines = currentText.split('\n');

// Every base line must appear in the current file, in the same order.
let cursor = 0;
for (let i = 0; i < baseLines.length; i++) {
  const line = baseLines[i];
  let found = -1;
  for (let j = cursor; j < currentLines.length; j++) {
    if (currentLines[j] === line) {
      found = j;
      break;
    }
  }
  if (found === -1) {
    console.error(`✗ ${FILE} is append-only, but a line from ${baseRef} was edited or deleted.`);
    console.error(`  First missing line (${baseRef} line ${i + 1}):`);
    console.error(`  > ${line}`);
    console.error('  Rulings may be superseded by later rulings, never rewritten.');
    process.exit(1);
  }
  cursor = found + 1;
}

console.log(
  `✓ ${FILE} is append-only relative to ${baseRef} ` +
    `(${baseLines.length} base lines intact, ${currentLines.length - baseLines.length} added).`
);
