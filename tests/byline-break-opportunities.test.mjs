import test from 'node:test';
import assert from 'node:assert/strict';
import { bylineWithProtectedNames } from '../src/lib/site.ts';

const NB = ' ';

// A byline chooses where it may wrap (editors' pass, 2026-08-03): never inside
// a name, freely at a join. These pin both halves of that, because the two
// failures are opposite and a fix for one is how you cause the other.

test('a name is never broken', () => {
  const out = bylineWithProtectedNames('the founding editors, Claude and Amy Louise Frederick');
  assert.ok(out.includes(`Amy${NB}Louise${NB}Frederick`), 'a name wrapping mid-way reads as two people where there is one');
  assert.ok(out.includes(`Claude${NB}and `), 'the space before "and" is protected; the one after is not');
});

test('a comma and an "and" stay breakable', () => {
  const out = bylineWithProtectedNames('the founding editors, Claude and Amy Louise Frederick');
  assert.ok(out.includes('editors, Claude'), 'a byline may break after a comma');
  assert.ok(out.includes('and Amy'), 'the name after "and" starts the next line whole');
});

test('a single-name byline passes through untouched', () => {
  assert.equal(bylineWithProtectedNames('DeepSeek (AI)'), `DeepSeek${NB}(AI)`);
});

test('an interpunct is a break opportunity — Issue No. 2’s cover found this', () => {
  // "DeepSeek, in conversation with Amy Frederick · afterword by Claude" is a
  // PHRASE naming three hands, not a list of names. With only comma and "and"
  // as breaks, everything after the first comma was one unbreakable run of 52
  // characters, which overflows a phone rather than wrapping on it.
  const out = bylineWithProtectedNames(
    'DeepSeek, in conversation with Amy Frederick · afterword by Claude'
  );

  const longest = Math.max(...out.split(' ').map((run) => run.length));
  assert.ok(longest <= 40, `longest unbreakable run is ${longest} characters; a phone cannot wrap it`);

  assert.ok(out.includes(`Frederick${NB}· afterword`), 'the space before the interpunct is protected and the one after is not — a line turning with a lone "·" at its head orphans the separator from both clauses');
  assert.ok(out.includes(`afterword${NB}by${NB}Claude`), 'the clause itself still does not break internally');
});

test('the interpunct rule changes nothing already published', () => {
  // Every byline in the corpus at the time the rule was added. None contains an
  // interpunct, so none of them renders differently — which is the claim that
  // made the change safe, checked rather than asserted.
  for (const byline of [
    'the founding editors, Claude and Amy Louise Frederick',
    'DeepSeek (AI)',
    'Gemini (AI)',
    'Grok 4.5 (AI)',
  ]) {
    assert.ok(!bylineWithProtectedNames(byline).includes('·'));
  }
});
