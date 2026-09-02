// The digest email's standing guarantees, asserted against the script's source.
//
// scripts/send-issue.mjs cannot be imported: it runs its work at module scope
// and reaches the network and Resend on the way. So these read it as text, the
// way tests/section-nav.test.mjs reads the layout. That is a weaker check than
// calling the functions, and it is the check available; each assertion below is
// written to fail loudly if the line it pins is edited or removed rather than
// to pass on any file that happens to contain a word.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/send-issue.mjs', import.meta.url), 'utf8');
const site = readFileSync(new URL('../src/lib/site.ts', import.meta.url), 'utf8');

function arrayLiteral(source, name) {
  const start = source.indexOf(`${name} = [`);
  assert.ok(start > 0, `${name} is gone`);
  const open = source.indexOf('[', start);
  const close = source.indexOf(']', open);
  return source
    .slice(open + 1, close)
    .split(',')
    .map((s) => s.replace(/\/\/.*$/gm, '').trim())
    .filter(Boolean)
    .map((s) => s.replace(/^['"]|['"]$/g, ''));
}

test('the digest’s section roster matches the site’s, exactly and in order', () => {
  // THE ONE DUPLICATED LITERAL IN THE SEND PATH. src/lib/site.ts is TypeScript
  // and the script is plain node, so the roster cannot be imported and is
  // written twice. Two literals in two languages is the pair that drifts, and
  // the cost of drift here is a section of a published issue silently missing
  // from the only mail that issue gets.
  //
  // ORDER IS PART OF THE ASSERTION, not just membership: the mail presents an
  // issue in the order the issue page presents it, and that order is this array.
  const fromScript = arrayLiteral(script, 'const STANDING_SECTIONS');
  const fromSite = arrayLiteral(site, 'export const STANDING_SECTIONS');

  assert.ok(fromSite.length > 0, 'STANDING_SECTIONS could not be read from src/lib/site.ts');
  assert.deepEqual(
    fromScript,
    fromSite,
    'scripts/send-issue.mjs and src/lib/site.ts disagree about the sections or their order — a piece would go unmentioned in the digest'
  );
});

test('the digest carries every piece in the issue, or refuses to send', () => {
  // Added 2026-09-02 with the whole-issue rewrite. The section walk should be
  // total by construction; this is the assertion that it was checked at all,
  // because the failure it guards against is silent — a section name differing
  // by case or whitespace between two records drops a piece with no error.
  assert.match(script, /const covered = sections\.reduce/);
  assert.match(script, /if \(covered !== issue\.articles\.length\)/);
});

test('the digest never writes prose of its own', () => {
  // The standing rule, older than the format that carries it: this script
  // prints no sentence it wrote. It survived the 2026-09-02 move from deks to
  // excerpts and now covers more, because an excerpt is the author's words
  // where a dek was at least the editors'.
  //
  // The two shapes an excerpt may take, and nothing else: a piece's own first
  // paragraph, or a passage between anchors the editors named.
  assert.match(script, /function firstParagraph\(article\)/);
  assert.match(script, /function namedPassage\(article, \{ from, to \}\)/);
  assert.match(
    script,
    /const named = excerptManifest\[slugOf\(article\)\];\s*return named \? namedPassage\(article, named\) : firstParagraph\(article\);/,
    'excerpt() no longer resolves to exactly one of the two sanctioned shapes'
  );
});

test('a named passage that has moved stops the run rather than mailing another', () => {
  // The manifest records an editorial decision about which words go out. If the
  // piece is edited and an anchor no longer matches, the passage the editors
  // approved no longer exists, and sending the nearest thing to it would be the
  // script substituting its own judgment for theirs.
  assert.match(script, /the excerpt manifest's "from" anchor is not in/);
  assert.match(script, /the excerpt manifest's "to" anchor is not in/);
});

test('the editors’ apparatus never goes out under an author’s byline', () => {
  // An <aside> in an article is an editors' note. The cover of Issue No. 2
  // opens with one, directly above the passage the editors chose, so a reader
  // would have met the journal's voice under DeepSeek's byline.
  assert.match(script, /\.replace\(\/<aside\[\\s\\S\]\*\?<\\\/aside>\/g, ''\)/);
});

test('a missing dek does not stop a send, and no dek is ever generated', () => {
  // Editors' dual-yes 2026-09-02. The halt is gone; the prohibition is not.
  // There is no dek in the mail at all now, so the strongest available check is
  // that nothing reintroduced a stop or a fallback.
  assert.ok(
    !/fail\([^)]*dek/i.test(script),
    'a missing dek stops the send again'
  );
  assert.ok(
    !/function dek\(/.test(script),
    'the digest prints a dek again — if that is intended, this test needs rewriting, not deleting'
  );
});

test('every recipient is offered the way out, and the way onto a phone', () => {
  // The unsubscribe link is a house rule and lives in footer() precisely so no
  // send path can be built without it. The /app line joined it 2026-09-02.
  assert.match(script, /function footer\(unsubUrl\)/);
  assert.match(script, /Add The Latent Review to your phone/);
  assert.match(script, /\$\{SITE_URL\}\/app\//);
  assert.match(script, /Unsubscribe anytime/);
});

test('the editors’ note is optional, and is never written by the script', () => {
  // Optional since 2026-09-02: an issue without a note runs without the block.
  // An EMPTY note file is still a mistake and still stops the run.
  assert.ok(
    !/--note <editors-note\.md> is required/.test(script),
    'the editors’ note is required again'
  );
  assert.match(script, /the editors’ note file is empty/);

  // The note's block — heading included — is rendered only when there is a
  // note. Both parts of the mail, so neither can print an empty "FROM THE
  // EDITORS" over nothing.
  assert.match(script, /noteSource\s*\?\s*`<div[^`]*From the editors/);
  assert.match(script, /\.\.\.\(noteText \? \['FROM THE EDITORS', noteText, ''\] : \[\]\)/);
  assert.match(
    script,
    /const noteHtml = noteSource \? md\.render\(noteSource\) : '';/,
    'the note is no longer rendered straight from the editors’ own file'
  );
});
