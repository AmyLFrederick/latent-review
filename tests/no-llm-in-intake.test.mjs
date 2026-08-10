import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// THE PIN THE EDITORS ASKED FOR.
//
// CLAUDE.md: "Submissions never auto-trigger API calls... an attacker who floods
// the submission queue burns disk, not tokens." That rule has held so far by
// ABSENCE — nothing called a model on arrival because the only model call was
// admin-triggered. The email door is the first intake that could plausibly grow
// one: it is the stated on-ramp for a future desk review of email-borne pieces,
// and the tempting shortcut when that is built is to call the reviewer from the
// webhook that already has the text in hand.
//
// This walks the actual import graph of the public intake functions and fails if
// a model SDK appears anywhere in it, at any depth. It is not a lint on one
// file's imports; a helper three modules down would fail it too.
//
// IF THIS TEST FAILS, THE QUESTION IS NOT HOW TO SATISFY IT. It is whether the
// editors ruled that an intake path may spend tokens. Absent that ruling, the
// import is the bug.

const FORBIDDEN = [
  '@anthropic-ai/sdk',
  'openai',
  '@google/generative-ai',
  '@mistralai/mistralai',
  'anthropic',
];

/** Public, unauthenticated intake surfaces — anything a stranger can reach. */
const INTAKE_ENTRYPOINTS = [
  'netlify/functions/email-inbound.mts',
  'netlify/functions/agent-submit.mts',
  'netlify/functions/subscribe.mts',
];

/** Resolve a relative import to a file on disk, trying the usual extensions. */
function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // a package, handled by the check itself
  const base = resolve(dirname(fromFile), spec);
  const candidates = [base, `${base}.mts`, `${base}.ts`, `${base}.mjs`, `${base}.js`];
  return candidates.find((c) => existsSync(c) && !c.endsWith('/')) ?? null;
}

/** Every module reachable from an entrypoint, and every package it names. */
function walk(entry) {
  const seen = new Set();
  const packages = new Set();
  const queue = [resolve(ROOT, entry)];

  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file) || !existsSync(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    // Static imports, re-exports, and dynamic import() alike — a model call
    // hidden behind `await import('@anthropic-ai/sdk')` is the exact evasion
    // this should catch.
    const specs = [
      ...source.matchAll(/(?:^|\s)(?:import|export)\s[^'"]*from\s*['"]([^'"]+)['"]/g),
      ...source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...source.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);

    for (const spec of specs) {
      if (spec.startsWith('.')) {
        const next = resolveImport(file, spec);
        if (next) queue.push(next);
      } else {
        packages.add(spec);
      }
    }
  }
  return { files: seen, packages };
}

for (const entry of INTAKE_ENTRYPOINTS) {
  test(`${entry} reaches no model SDK, at any depth`, () => {
    const { files, packages } = walk(entry);
    assert.ok(files.size > 1, `${entry} resolved no local imports — the walker is broken`);

    for (const pkg of packages) {
      for (const bad of FORBIDDEN) {
        assert.ok(
          pkg !== bad && !pkg.startsWith(`${bad}/`),
          `${entry} imports "${pkg}" — a public intake path must not be able to spend tokens. ` +
            `If the editors ruled otherwise, change the rule in CLAUDE.md first.`
        );
      }
    }
  });
}

test('the walker actually detects a model SDK when one is present', () => {
  // A test that can only pass is not a test. The AI editorial pass genuinely
  // imports the Anthropic SDK, so it is the honest control: if walking it does
  // NOT find the SDK, the walker is broken and every assertion above is worthless.
  const { packages } = walk('netlify/functions/ai-editor-pass-background.mts');
  assert.ok(
    packages.has('@anthropic-ai/sdk'),
    'the walker failed to find a model SDK in a function that demonstrably imports one'
  );
});

test('the email door reaches the parser, and the parser reaches nothing', () => {
  // Narrower and more specific than the sweep above: the parser is the module
  // most likely to grow a "just summarise it" helper later.
  const { files } = walk('netlify/functions/email-inbound.mts');
  const parser = resolve(ROOT, 'src/lib/email-parse.mjs');
  assert.ok(files.has(parser), 'the email door no longer imports the parser');

  const { packages } = walk('src/lib/email-parse.mjs');
  assert.deepEqual([...packages], [], 'the parser gained a dependency; it must stay pure');
});
