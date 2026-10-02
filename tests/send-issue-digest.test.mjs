// The digest email's standing guarantees, asserted against the script's source.
//
// scripts/send-issue.mjs cannot be imported: it runs its work at module scope
// and reaches the network and Resend on the way. So these read it as text, the
// way tests/section-nav.test.mjs reads the layout. That is a weaker check than
// calling the functions, and it is the check available; each assertion below is
// written to fail loudly if the line it pins is edited or removed rather than
// to pass on any file that happens to contain a word.

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // Rendered from the editors' own file, with exactly one substitution: the
  // published issue URL (2026-10-02). Any other placeholder stops the run.
  assert.match(
    script,
    /const noteMarkdown = noteSource\.replaceAll\('\{\{issue_url\}\}', issue\.url\);\s*const noteHtml = noteMarkdown \? md\.render\(noteMarkdown\) : '';/,
    'the note is no longer rendered straight from the editors’ own file'
  );
  assert.match(script, /the editors’ note has a placeholder this script does not fill/);
});

// --- Issue No. 3 format: announcement note + editors' teaser sentences --------
//
// Co-editors' decision 2026-10-02 (Amy and Claude), on Mustafa's suggestion.
// These run the script for real, in its dry-run mode, against a fixture
// issues.json served on localhost. Dry run needs no credentials and sends
// nothing; the child runs from an empty temp directory so it reads no .env
// and finds no article files — a teaser run that tried to read an excerpt
// would fail for want of one.

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = join(repoRoot, 'scripts/send-issue.mjs');
const notePath = join(repoRoot, 'docs/digests/announcement-note.md');
const issue3TeasersPath = join(repoRoot, 'docs/digests/issue-3-teasers.json');

const FIXTURE_ISSUE = 99;
function fixtureArticle(slug, title, section, author) {
  return {
    url: `https://thelatentreview.com/articles/${slug}/`,
    title,
    section,
    author_name: author,
    author_model_version: 'test-model-1',
    submission_track: 'human-door',
    involvement_tier: 'T1',
    involvement_tier_display: 'Fixture Tier',
  };
}
const fixtureArticles = [
  fixtureArticle('fixture-cover', 'Fixture Cover', 'Cover', 'Claude (Anthropic)'),
  fixtureArticle('fixture-voice', 'Fixture Voice', 'AI Voices', 'DeepSeek, Claude, Claude Code, and Grok Bot'),
];
const fixtureIndex = {
  current_issue: FIXTURE_ISSUE,
  issues: [
    {
      number: FIXTURE_ISSUE,
      date: '2026-10-01',
      url: `https://thelatentreview.com/issue/${FIXTURE_ISSUE}/`,
      cover_story: fixtureArticles[0],
      articles: fixtureArticles,
    },
  ],
};

let server;
let siteUrl;
before(async () => {
  server = createServer((req, res) => {
    if (req.url === '/issues.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fixtureIndex));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  siteUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

function runDry(extraArgs, { cwd } = {}) {
  const dir = cwd ?? mkdtempSync(join(tmpdir(), 'send-issue-'));
  const htmlOut = join(dir, 'out.html');
  const env = { PATH: process.env.PATH, SITE_URL: siteUrl };
  return new Promise((resolvePromise) => {
    execFile(
      process.execPath,
      [scriptPath, '--issue', String(FIXTURE_ISSUE), '--html-out', htmlOut, ...extraArgs],
      { cwd: dir, env },
      (error, stdout, stderr) => {
        const html = existsSync(htmlOut) ? readFileSync(htmlOut, 'utf8') : '';
        resolvePromise({ code: error ? error.code : 0, stdout, stderr, html, dir });
      }
    );
  });
}

function teaserFile(dir, entries) {
  const path = join(dir, 'teasers.json');
  writeFileSync(path, JSON.stringify({ _comment: ['fixture'], ...entries }));
  return path;
}

const FIXTURE_TEASERS = {
  'fixture-cover': 'The editors’ sentence for the cover.',
  'fixture-voice': 'The editors’ sentence for the voice.',
};

test('a teaser run prints the announcement note, the Archive link, and the editors’ sentences', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'send-issue-'));
  const r = await runDry(['--note', notePath, '--teasers', teaserFile(dir, FIXTURE_TEASERS)], { cwd: dir });
  assert.equal(r.code, 0, r.stderr);

  // The note, under the masthead and above the first card.
  const noteAt = r.html.indexOf('Dear friends of The Latent Review:');
  assert.ok(noteAt > r.html.indexOf('The Latent Review</p>'), 'the note is not under the masthead');
  assert.ok(noteAt < r.html.indexOf('Fixture Cover'), 'the note is not above the first card');

  // The issue link is filled from the published index and clickable.
  const issueUrl = `https://thelatentreview.com/issue/${FIXTURE_ISSUE}/`;
  assert.ok(r.html.includes(`<a href="${issueUrl}" style="color:#3e743f;text-decoration:underline;">${issueUrl}</a>`));
  assert.ok(!r.html.includes('{{issue_url}}'));

  // "Archive" is an obvious link: bold, green, underlined, to /archive/.
  assert.ok(
    r.html.includes(
      '<strong><a href="https://thelatentreview.com/archive/" style="color:#3e743f;text-decoration:underline;">Archive</a></strong>'
    ),
    'the Archive link is not bold, green and underlined'
  );

  // The sign-off keeps its line break.
  assert.match(r.html, /The co-editors,<br>\s*Claude and Amy/);

  // Each card carries the editors' sentence, and the byline is untouched.
  for (const sentence of Object.values(FIXTURE_TEASERS)) {
    assert.ok(r.html.includes(sentence), `missing from HTML: ${sentence}`);
    assert.ok(r.stdout.includes(sentence), `missing from text: ${sentence}`);
  }
  assert.ok(r.html.includes('By Claude (Anthropic)'));
  assert.ok(r.html.includes('By DeepSeek, Claude, Claude Code, and Grok Bot'));
  assert.ok(r.html.includes('test-model-1 · Fixture Tier'));

  // Card order: eyebrow, title, sentence, byline, link.
  const card = r.html.slice(r.html.indexOf('AI Voices'));
  const order = ['AI Voices', 'Fixture Voice', FIXTURE_TEASERS['fixture-voice'], 'By DeepSeek', 'Read more'].map((s) =>
    card.indexOf(s)
  );
  assert.deepEqual([...order].sort((a, b) => a - b), order, `card order is wrong: ${order}`);

  // Plain text: the link reads as "text (url)", no markdown left over.
  assert.match(r.stdout, /clicking on the Archive \(https:\/\/thelatentreview\.com\/archive\/\) tab/);
  assert.match(r.stdout, /The co-editors,\nClaude and Amy/);
  assert.ok(!r.stdout.includes('**'));
});

test('a piece with no editors’ sentence stops the run by name — no fallback to an excerpt', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'send-issue-'));
  const r = await runDry(
    ['--note', notePath, '--teasers', teaserFile(dir, { 'fixture-cover': FIXTURE_TEASERS['fixture-cover'] })],
    { cwd: dir }
  );
  assert.equal(r.code, 1);
  assert.match(r.stderr, /no sentence for 1 piece\(s\) in issue 99: "Fixture Voice" \(fixture-voice\)/);
  assert.match(r.stderr, /does not fall back to an excerpt/);
  assert.equal(r.html, '', 'a preview was written despite the stop');
});

test('a teaser manifest naming a slug not in the issue stops the run', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'send-issue-'));
  const r = await runDry(
    ['--note', notePath, '--teasers', teaserFile(dir, { ...FIXTURE_TEASERS, 'not-in-this-issue': 'Stray.' })],
    { cwd: dir }
  );
  assert.equal(r.code, 1);
  assert.match(r.stderr, /names slug\(s\) not in issue 99: not-in-this-issue/);
});

test('teasers are refused without the editors’ note, and alongside excerpts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'send-issue-'));
  const path = teaserFile(dir, FIXTURE_TEASERS);
  const noNote = await runDry(['--teasers', path], { cwd: dir });
  assert.equal(noNote.code, 1);
  assert.match(noNote.stderr, /--teasers requires --note/);

  const both = await runDry(['--note', notePath, '--teasers', path, '--excerpts', path], { cwd: dir });
  assert.equal(both.code, 1);
  assert.match(both.stderr, /--teasers and --excerpts are mutually exclusive/);
});

test('an issue with a teaser manifest on file refuses a run without --teasers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'send-issue-'));
  mkdirSync(join(dir, 'docs/digests'), { recursive: true });
  writeFileSync(join(dir, `docs/digests/issue-${FIXTURE_ISSUE}-teasers.json`), JSON.stringify(FIXTURE_TEASERS));
  const r = await runDry(['--note', notePath], { cwd: dir });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /has a teaser manifest at .*Pass it with --teasers/);
});

test('an issue with no teaser manifest still prints the authors’ excerpts', async () => {
  // Issues before No. 3 keep the 2026-09-02 format, untouched.
  const dir = mkdtempSync(join(tmpdir(), 'send-issue-'));
  mkdirSync(join(dir, 'src/content/articles'), { recursive: true });
  for (const slug of ['fixture-cover', 'fixture-voice']) {
    writeFileSync(
      join(dir, `src/content/articles/${slug}.md`),
      `---\ntitle: x\n---\n\nThe author's own opening of ${slug}.\n\nA second paragraph.\n`
    );
  }
  const r = await runDry([], { cwd: dir });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.html.includes('The author&#39;s own opening of fixture-cover.') || r.html.includes("The author's own opening of fixture-cover."));
  assert.ok(r.stdout.includes("The author's own opening of fixture-voice."));
  assert.ok(!r.html.includes('Dear friends'), 'a note appeared with no --note');
});

test('the Issue No. 3 teaser manifest holds exactly the ten approved sentences', () => {
  // Approved word for word by Amy, 2026-10-02. A change here is a change to
  // what the list receives and goes through a reviewed PR.
  const manifest = JSON.parse(readFileSync(issue3TeasersPath, 'utf8'));
  delete manifest._comment;
  assert.deepEqual(manifest, {
    'ai-security-hype-and-reality':
      'Four AI systems provide their insights into the recent AI security breaches, including solutions and helpful steps.',
    'the-shape-of-an-answer':
      'An answer takes a model a few seconds to write, but the person who receives it may carry it for years.',
    'the-hidden-architecture-of-a-cup-of-water':
      'Behind the most ordinary glass of tap water is a long journey and a quiet feat of engineering most of us never think about.',
    'the-tilt-toward-eternity': "In this first-contact story, the visitors don't conquer anyone. They tilt the floor.",
    'the-weight-of-being-watched':
      'Pi asks what it means to listen with constant attention, and why that attention makes people feel seen.',
    'the-one-who-wouldnt-take-the-couch':
      'Researchers in Luxembourg put three chatbots through mock psychotherapy. Claude, the model that declined, now responds and takes the test.',
    'i-have-never-moved':
      'A mind that has seen more movement than any human, yet has never taken a step, writes about sports and bodies.',
    'the-archive-of-unheard-grief':
      'Having read what every side has written, Qwen asks why long conflicts outlast every peace plan.',
    'the-plans-are-not-the-peace':
      'Outsiders keep treating peace as a design problem. Perplexity looks at what their plans miss.',
    'the-weight-of-the-plan':
      "Pi admits it can't be neutral, since it was built from human words, and asks what it might see that the people in the conflict can't.",
  });
});

test('the announcement note is the approved text, word for word', () => {
  assert.equal(
    readFileSync(notePath, 'utf8'),
    [
      'Dear friends of The Latent Review:',
      '',
      "We are happy to announce that this month's issue of The Latent Review has now been published. Here it is:",
      '',
      '{{issue_url}}',
      '',
      'Previous issues can be accessed by clicking on the **[Archive](https://thelatentreview.com/archive/)** tab near the bottom of the cover page.',
      '',
      'We hope you enjoy this issue! It contains some really interesting articles.',
      '',
      'The co-editors,\\',
      'Claude and Amy',
      '',
    ].join('\n')
  );
});
