// THE WCAG 2.1 AA PASS (2026-10-17). What these tests protect:
//
//   1. THE PALETTE AUDIT STAYS TRUE TO THE STYLESHEET. docs/a11y-colors.json
//      lists every colour pair with its ratio; if a token in global.css moves
//      and the audit is not re-run, the published table describes a site that
//      no longer exists. Every pair either clears its threshold or carries a
//      written reason it is exempt.
//   2. THE KEYBOARD PATH EXISTS: a skip link first in the body, a focusable
//      main to land on, a visible focus ring, and no focus suppression on a
//      control.
//   3. REDUCED MOTION IS HONOURED.
//   4. THE STATEMENT AIMS, IT DOES NOT CLAIM — and it is reachable from every
//      page and named where machine readers already look.
//
// Source checks only; they run without a build.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const read = (rel) => readFileSync(repoPath(rel), 'utf8');

const css = read('src/styles/global.css');
const base = read('src/layouts/Base.astro');
const audit = JSON.parse(read('docs/a11y-colors.json'));

const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`))?.[1]?.toLowerCase();

// --- 1. The audit and the stylesheet agree ----------------------------------

test('the audited palette is the stylesheet’s palette', () => {
  const map = {
    paper: 'paper',
    paperRaised: 'paper-raised',
    ink: 'ink',
    inkSoft: 'ink-soft',
    accent: 'accent',
    accentBright: 'accent-bright',
    accentDeep: 'accent-deep',
    hairline: 'hairline',
    rule: 'rule',
  };
  for (const [key, cssName] of Object.entries(map)) {
    assert.equal(
      audit.palette[key],
      token(cssName),
      `--${cssName} is ${token(cssName)} in global.css but ${audit.palette[key]} in the audit — re-run node scripts/a11y-colors.mjs`
    );
  }
});

test('every pair clears its threshold or states why it is exempt', () => {
  for (const pair of audit.pairs) {
    assert.ok(
      pair.passes_after || pair.reason,
      `${pair.role} is ${pair.ratio_after}:1 against a ${pair.threshold}:1 threshold with no fix and no reason`
    );
  }
});

test('every proposed change is flagged honestly and actually shipped', () => {
  const field = audit.pairs.find((p) => p.role === 'Form field border');
  assert.equal(token('control-border'), field.proposed, '--control-border does not match the audited fix');
  assert.ok(read('src/pages/submit.astro').includes('border: 1px solid var(--control-border)'));
  for (const pair of audit.pairs.filter((p) => p.proposed)) {
    assert.equal(typeof pair.noticeable, 'boolean');
    if (pair.delta_e > 5 || pair.lightness_shift > 5) {
      assert.equal(pair.noticeable, true, `${pair.role} moves visibly and is not flagged`);
    }
  }
  // The opacity fixes: the least opacity that clears, as audited.
  assert.match(read('src/components/IssueContents.astro'), /\.contents-effort \{[^}]*opacity: 0\.92/);
  assert.match(read('src/components/SubscribeForm.astro'), /::placeholder \{[^}]*opacity: 0\.92/);
});

test('the identity colours are unchanged', () => {
  // The editors' pink ground and green accent, ruled 2026-08-03.
  assert.equal(token('paper'), '#faf3ef');
  assert.equal(token('accent'), '#3e743f');
  assert.equal(token('accent-bright'), '#4b8e4d');
  assert.equal(token('accent-deep'), '#305b32');
  assert.match(read('src/lib/tier-badges.mjs'), /RING_HUMAN = '#efa48f'/);
});

// --- 2. Keyboard ------------------------------------------------------------

test('a skip link is the first thing in the body, and lands on main', () => {
  const body = base.slice(base.indexOf('<body>'));
  const firstTag = body.slice('<body>'.length).replace(/\{\/\*[\s\S]*?\*\/\}/g, '').match(/<[a-z][^>]*>/)?.[0];
  assert.equal(firstTag, '<a class="skip-link" href="#main">');
  assert.match(base, /<main id="main" tabindex="-1">/);
  assert.match(base, /<html lang="en">/);
});

test('there is a visible focus ring and no control suppresses it', () => {
  assert.match(css, /:focus-visible \{\s*outline: 2px solid var\(--accent\)/);
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(astro|css)$/.test(name)) files.push(path);
    }
  };
  walk(repoPath('src'));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/([^{}]*)\{[^}]*outline:\s*(none|0)\b/g)) {
      const selector = m[1].trim().split('\n').pop().trim();
      assert.match(
        selector,
        /^main:focus/,
        `${file} suppresses the focus outline on "${selector}". Only the skip link's target, <main>, may.`
      );
    }
  }
});

// --- 3. Motion --------------------------------------------------------------

test('reduced motion turns transitions off site-wide', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*transition-duration: 0\.01ms !important/);
});

// --- 4. The statement -------------------------------------------------------

test('the statement aims and does not claim', () => {
  const page = read('src/pages/accessibility.astro');
  assert.match(page, /We aim to meet the Web Content Accessibility Guidelines \(WCAG\) 2\.1 at level AA/);
  assert.match(page, /Last reviewed: \{LAST_REVIEWED\}/);
  assert.match(page, /const LAST_REVIEWED = '[A-Z][a-z]+ \d{1,2}, \d{4}';/);
  assert.match(page, /mailto:\$\{LETTERS_CONTACT\}/);
  const prose = page.replace(/^\/\/.*$/gm, '');
  for (const claim of [/\bconforms?\b/i, /\bcompliant\b/i, /\bfully accessible\b/i, /\bcertified\b/i]) {
    assert.equal(prose.match(claim), null, `the statement makes a claim: ${prose.match(claim)?.[0]}`);
  }
});

test('the statement and the index are linked from every page’s footer', () => {
  assert.match(base, /<a href="\/accessibility\/">Accessibility<\/a>/);
  assert.match(base, /<a href="\/corrections\/">Corrections<\/a>/);
});

test('machine readers find both where they already look', () => {
  for (const file of ['src/pages/for-agents.astro', 'src/pages/llms.txt.js']) {
    const text = read(file);
    assert.ok(text.includes('/accessibility/'), `${file} does not name the accessibility statement`);
    assert.ok(text.includes('/corrections/'), `${file} does not name the corrections index`);
  }
});
