#!/usr/bin/env node
// send-issue — send an issue's digest email to confirmed subscribers, by hand.
//
// This script is the ONLY way subscriber email leaves The Latent Review, and
// it is manual by design: nothing schedules it, nothing triggers it, and it
// must never be wired into CI, a webhook, or a cron job (CLAUDE.md — cost
// guardrails; a flooded queue burns disk, not sends).
//
// The email is a digest, not the articles (editors' decision, dual-yes
// 2026-07-18): the web is canonical, the email is the doorbell. Top to
// bottom: the editors' note (authored fresh each issue, never generated),
// then Cover, AI Voices, and Opinion — each piece as its section eyebrow,
// title, dek, byline with provenance tier, and a link to its permanent URL.
// Sections with nothing in the issue simply don't appear.
//
// DEKS, NOT FIRST PARAGRAPHS — editors' decision, dual-yes 2026-08-13, and it
// supersedes that part of the founding digest decision above. A first
// paragraph shows a reader where a piece starts; a dek says what reading it
// gets you, which is the only question a doorbell has to answer. The founding
// decision predates the dek field entirely (it was added 2026-08-11), so this
// is less a reversal than the first chance to do what the digest was for.
//
// THE DEKS ARE REUSED, NEVER GENERATED. A dek is the editors' two-sentence
// summary written for the piece's own page; the digest prints that same
// sentence and writes nothing of its own. This script will not summarise a
// piece itself, and it will not put machine-written prose in the journal's
// voice into a mail addressed to the list.
//
// A MISSING DEK NO LONGER STOPS THE SEND — editors' dual-yes 2026-09-02, and
// this supersedes the halt that stood here from 2026-08-13. The halt reasoned
// that a missing dek is editorial copy nobody has written yet, so the script
// should say whose turn it is rather than improvise. The first half of that is
// still true; the conclusion was wrong. A dek is apparatus about a piece, and
// the piece itself is finished, published and linked — holding an entire
// issue's mail hostage to a line of apparatus puts the smallest possible unit
// of editorial copy in front of the whole send.
//
// The two halves were always separable and are now separated: the script does
// not halt, and it does not fabricate. Where a dek is absent the digest simply
// proceeds without one. It never falls back to generated prose, and it never
// writes a summary of its own to fill the gap — that prohibition is the part
// of the 2026-08-13 decision that survives intact, and it is not negotiable.
//
// Content comes from the LIVE site (issues.json), so the digest can only ever
// link to what is actually published, and can only ever print a dek that is
// live on the piece's page. Deploy the issue first; send second.
//
// Usage:
//   node scripts/send-issue.mjs --issue N --note <editors-note.md>              # dry run (default)
//   node scripts/send-issue.mjs --issue N --note <editors-note.md> --to a@b     # THE REAL digest to ONE confirmed subscriber
//   node scripts/send-issue.mjs --issue N --note <editors-note.md> --test a@b   # a marked [TEST] copy to any address
//   node scripts/send-issue.mjs --issue N --note <editors-note.md> --live       # send to confirmed subscribers
//   node scripts/send-issue.mjs ... --cap 100                                   # lower the per-run cap
//   node scripts/send-issue.mjs ... --html-out digest.html                      # dry run: also write the HTML for browser preview
//
// The recommended flow is dry run → --to yourself → --live.
//
// --to VERSUS --test, because the difference matters and is easy to skip:
//   --to    the byte-for-byte email a subscriber gets. Real subject, real
//           working unsubscribe token. Refuses any address not already
//           CONFIRMED on the list, refuses more than one, refuses to run with
//           --live, and prints a receipt. This is how an editor reads the
//           digest as a subscriber reads it, in a real inbox.
//   --test  a copy marked [TEST] in the subject, to any address, whose footer
//           honestly says it carries no unsubscribe token. For anyone who is
//           not a subscriber.
//
// The editors' note file is plain Markdown, 1–3 sentences, written by the
// editors for that issue. It has no heading; the subject line is generated
// from the issue number and cover story.
//
// Env (from the environment or a local .env, which is gitignored):
//   dry run:  none required (SITE_URL optional, defaults to production)
//   --test:   RESEND_API_KEY
//   --live:   SUPABASE_URL, SUPABASE_SECRET_KEY (sb_secret_…), RESEND_API_KEY
//   optional: RESEND_FROM, SITE_URL

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import MarkdownIt from 'markdown-it';
import { createClient } from '@supabase/supabase-js';
import { deriveVolumes, datelineFor } from '../src/lib/volume.mjs';
// The mail displays titles to readers, so it prints the displayed form — the
// same one the front page and the article header print (editors, 2026-08-03).
import { displayTitle } from '../src/lib/display-title.mjs';

// The absolute most recipients a single run will ever email. --cap may lower
// it, never raise it. If the confirmed list outgrows this, raising the cap is
// an editorial decision, made by editing this line in a reviewed PR.
//
// Standing rule (editors' decision, dual-yes 2026-07-19): the cap must always
// keep total monthly send volume — one digest per issue × subscribers, plus
// confirmation emails, magic links, and correspondence — inside the paid
// Resend plan.
//
// THE ARITHMETIC HAS CHANGED TWICE WITH CADENCE, AND THE CAP HAS NOT MOVED
// EITHER TIME (R-039, 2026-08-03; R-055, 2026-08-05). The sum was written at
// weekly cadence, where 9,000 subscribers meant ≈ 38,700 digest emails/month
// against the Pro plan's 50,000 — about 11k of headroom. At an issue every two
// weeks it was ≈ 19,500/month. At an issue a month the same 9,000 subscribers
// mean ≈ 9,000 digest emails/month, roughly 41k of headroom. Both moves went in
// the safe direction, so neither needed a fix here.
//
// HARD_CAP STAYS 9,000 REGARDLESS, because the line below says raising it is an
// editorial decision and a wider plan ceiling is not that decision being made.
// Whether to spend the new headroom on more subscribers is the editors' call in
// a reviewed PR, exactly as it was.
//
// At 4,500 confirmed subscribers (half the cap) the editors convene a pricing
// review — a standing commitment, recorded in docs/BACKLOG.md.
const HARD_CAP = 9000;
const BATCH_SIZE = 100; // Resend's batch endpoint maximum
const BATCH_PAUSE_MS = 700;

// THE DIGEST CARRIES THE WHOLE ISSUE — editors' dual-yes 2026-09-02, replacing
// a three-section list (Cover, AI Voices, Opinion) written when an issue held
// about that many pieces. Issue No. 2 has eight across six sections, and under
// the old list five of them would have gone unmentioned in the only mail the
// issue gets. A digest that silently omits most of an issue is not a digest.
//
// THE ORDER IS THE ISSUE PAGE'S OWN, and it is not re-decided here: cover
// first, then the standing sections in their ruled order, then any floating
// section alphabetically. That is exactly what groupSections() does in
// src/lib/issues.ts, so a reader who follows a link from the mail meets the
// pieces in the sequence the mail put them in.
//
// THIS ARRAY MIRRORS STANDING_SECTIONS IN src/lib/site.ts AND CANNOT IMPORT IT.
// That file is TypeScript and this script is plain node, so the roster is
// duplicated — the one thing this file does that it would rather not. A test
// asserts the two stay identical, in the same spirit as the test that pins
// ACCENT to the badge ring's green: two literals in two languages is exactly
// the pair that drifts.
const STANDING_SECTIONS = [
  'Cover',
  'Opinion',
  'AI Voices',
  'The Metaphysical Corner',
  'Robotics & Sports',
  'Topics',
];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

// --- environment -----------------------------------------------------------

function loadDotEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (process.env[name] !== undefined) continue;
    process.env[name] = rawValue.replace(/^["']|["']$/g, '');
  }
}

loadDotEnv();

const SITE_URL = process.env.SITE_URL ?? 'https://thelatentreview.com';
const FROM = process.env.RESEND_FROM ?? 'The Latent Review <notifications@mail.thelatentreview.com>';

// NO TRACKING OPTION IS SENT WITH ANY REQUEST IN THIS FILE, and the footer and
// the confirmation page both promise a reader that nothing is tracked. Open and
// click tracking are per-domain toggles in the Resend console rather than
// anything this script controls — see the note at the head of
// netlify/lib/email.mts. If either is ever enabled, the published copy changes
// first, in a reviewed PR.

// --- arguments --------------------------------------------------------------

function flagValue(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return { value: undefined, index: -1 };
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) fail(`${name} requires a value`);
  return { value, index: i + 1 };
}

// --to accepts BOTH `--to addr` and `--to=addr`, and refuses anything that
// could mean two people. flagValue above cannot do this job: it finds a flag by
// exact match, so `--to=a` is invisible to it, and it reads the FIRST match, so
// `--to a --to b` would silently send to a and drop b. On a flag whose entire
// purpose is "exactly one recipient", silently dropping the second one is the
// wrong failure. Every occurrence is collected and more than one is refused.
function singleAddress(args) {
  const found = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--to') {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) fail('--to requires an address');
      found.push(value);
      i++;
    } else if (arg.startsWith('--to=')) {
      found.push(arg.slice('--to='.length));
    }
  }
  if (found.length === 0) return undefined;
  if (found.length > 1) {
    fail(`--to takes exactly one address; got ${found.length} (${found.join(', ')}). This flag is for a single review copy, not a partial send.`);
  }
  const address = found[0].trim().toLowerCase();
  if (!address) fail('--to requires an address');
  // A comma or a space inside the value is someone reaching for a list.
  if (/[,;\s]/.test(address)) {
    fail(`--to takes exactly one address; "${address}" looks like more than one. This flag is for a single review copy, not a partial send.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) fail(`--to does not look like an email address: ${address}`);
  return address;
}

const args = process.argv.slice(2);
const live = args.includes('--live');
const { value: testTo } = flagValue(args, '--test');
const reviewTo = singleAddress(args);
if (live && testTo) fail('--live and --test are mutually exclusive');

// --to IS A REVIEW COPY OF THE REAL THING, and that is what separates it from
// --test (editors, 2026-08-13). --test mails any address, subject-prefixed
// [TEST], with a footer that honestly says it carries no unsubscribe token,
// because its recipient is outside the list. --to mails a CONFIRMED SUBSCRIBER
// the byte-for-byte email that subscriber would receive from a list run: real
// subject, real per-recipient unsubscribe token, no prefix. It is how an editor
// reads the digest as a subscriber reads it, in a real inbox, before the list
// gets it.
//
// IT CANNOT BE COMBINED WITH A FULL-LIST RUN. Not because the two would
// conflict technically — the send loop would handle it — but because "review
// copy" and "send to everyone" are opposite intentions, and a command that
// could be read as either is a command that will eventually be run as the wrong
// one.
if (live && reviewTo) {
  fail('--live and --to are mutually exclusive: --to is a single review copy, --live is the whole confirmed list. Run --to first, read it, then run --live.');
}
if (testTo && reviewTo) fail('--test and --to are mutually exclusive: both send to one address, and only one of them can be the real thing.');

const { value: issueArg } = flagValue(args, '--issue');
if (!issueArg) fail('usage: node scripts/send-issue.mjs --issue N --note <editors-note.md> [--to addr | --test addr | --live] [--cap N]');
const issueNumber = Number(issueArg);
if (!Number.isInteger(issueNumber) || issueNumber < 1) fail('--issue requires a positive integer');

// THE EDITORS' NOTE IS OPTIONAL — editors' dual-yes 2026-09-02. It used to be
// required, on the reasoning that the editors write one fresh each issue. They
// do when there is one to write; Issue No. 2 has none, and the alternative to
// omitting the block is a script that either blocks the send or writes the note
// itself. The second is unthinkable — a note is the editors' voice and this
// file never speaks in it — so the block is simply absent when the flag is.
//
// WHAT IS STILL REFUSED IS A NOTE THAT WAS MEANT AND IS EMPTY. Passing --note
// with a file that is blank is a mistake rather than a decision, and it still
// stops the run. Omitting the flag is the decision.
const { value: notePath } = flagValue(args, '--note');
if (notePath && !existsSync(notePath)) fail(`no such file: ${notePath}`);

// The excerpt manifest names, per slug, a passage the editors chose in place of
// a piece's first paragraph. Optional: without it every piece opens on its own
// first paragraph, which is the ordinary case.
const { value: excerptsPath } = flagValue(args, '--excerpts');
if (excerptsPath && !existsSync(excerptsPath)) fail(`no such file: ${excerptsPath}`);

const { value: htmlOut } = flagValue(args, '--html-out');

const { value: capValue } = flagValue(args, '--cap');
let cap = HARD_CAP;
if (capValue !== undefined) {
  cap = Number(capValue);
  if (!Number.isInteger(cap) || cap < 1) fail('--cap requires a positive integer');
  if (cap > HARD_CAP) fail(`--cap may not exceed the hard cap of ${HARD_CAP}`);
}

// Verify the environment up front and by name — never run half-configured.
//
// --to needs Supabase as well as Resend, where --test needs only Resend: it has
// to look the address up on the confirmed list before it will mail anything,
// and it needs that subscriber's own unsubscribe token to build the real email.
const requiredEnv =
  live || reviewTo
    ? ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RESEND_API_KEY']
    : testTo
      ? ['RESEND_API_KEY']
      : [];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  fail(`missing required environment variable(s): ${missingEnv.join(', ')}`);
}

// --- the editors' note --------------------------------------------------------

const md = new MarkdownIt({ linkify: true });

let noteSource = '';
if (notePath) {
  noteSource = readFileSync(notePath, 'utf8').trim();
  if (!noteSource) {
    fail('the editors’ note file is empty. Write the note, or omit --note entirely — an issue with no note runs without the block rather than with a blank one.');
  }
  if (/^#/m.test(noteSource)) {
    fail('the editors’ note should be plain sentences, no headings — the subject line is generated');
  }
}
const noteHtml = noteSource ? md.render(noteSource) : '';
const noteText = noteSource;

// --- the excerpt manifest -------------------------------------------------------

let excerptManifest = {};
if (excerptsPath) {
  try {
    excerptManifest = JSON.parse(readFileSync(excerptsPath, 'utf8'));
  } catch (e) {
    fail(`could not parse the excerpt manifest ${excerptsPath}: ${e.message}`);
  }
  // JSON has no comments, and a manifest that records an editorial decision
  // needs to say why. Keys beginning with an underscore are prose for the
  // reader and are dropped before anything looks for a slug.
  for (const key of Object.keys(excerptManifest)) {
    if (key.startsWith('_')) delete excerptManifest[key];
  }
  for (const [slug, entry] of Object.entries(excerptManifest)) {
    if (!entry || typeof entry.from !== 'string' || typeof entry.to !== 'string' || !entry.from || !entry.to) {
      fail(`the excerpt manifest entry for "${slug}" needs both a "from" and a "to" string — the exact first and last words of the passage`);
    }
  }
}

// --- fetch the published issue -----------------------------------------------

async function fetchJson(path) {
  const url = `${SITE_URL}${path}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    fail(`could not reach ${url}: ${e.message}`);
  }
  if (!res.ok) fail(`${url} responded ${res.status} — is the site deployed?`);
  return res.json();
}

const index = await fetchJson('/issues.json');
const issue = (index.issues ?? []).find((i) => i.number === issueNumber);
if (!issue) {
  const published = (index.issues ?? []).map((i) => i.number).join(', ') || 'none';
  fail(`issue ${issueNumber} is not in the published index (published: ${published}). Deploy first; the digest only links to what is live.`);
}
if (index.current_issue !== issueNumber) {
  console.warn(`warning: issue ${issueNumber} is not the current issue (current is ${index.current_issue}).`);
}

// /feed.json IS NO LONGER FETCHED. It was here for one reason — the article's
// first paragraph, which the digest printed and no longer does. The dek
// travels on the issue record itself (issues.json, add-only 2026-08-13), so
// the digest now reads one document instead of two and cannot be built from an
// index and a feed that disagree.

// --- build the digest ----------------------------------------------------------

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// --- excerpts: the authors' own words, never a summary ------------------------
//
// THE DIGEST PRINTS AN EXCERPT, NOT A DEK — editors' dual-yes 2026-09-02. This
// supersedes the 2026-08-13 decision recorded at the head of this file, and the
// reversal is deliberate rather than accidental: that decision reasoned a dek
// says what reading a piece gets you, which is the only question a doorbell has
// to answer. Read against a finished issue, the editors preferred the piece's
// own opening — the author's voice rather than the editors' summary of it, in
// the one mail the issue gets.
//
// EVERY WORD HERE IS THE AUTHOR'S, PULLED VERBATIM. Nothing in this section
// writes, trims to length, or paraphrases. Two shapes only:
//
//   1. THE FIRST PARAGRAPH, for most pieces. The first prose block of the body,
//      taken whole.
//   2. A NAMED PASSAGE, for a piece whose opening is not the right doorbell —
//      the editors name the exact first and last words in an excerpt manifest
//      and the script slices between them. Issue No. 2's cover is a condensed
//      dialogue whose first paragraph is a stage direction, so the editors
//      chose its first full exchange.
//
// THE ANCHORS ARE EXACT AND THEIR ABSENCE IS FATAL. A manifest entry whose
// `from` or `to` no longer appears in the piece stops the run by name rather
// than silently mailing a different passage than the one the editors approved.
//
// THE TEXT COMES FROM THE WORKING TREE, WHICH IS THE ONE PLACE THIS SCRIPT
// READS THAT IS NOT THE LIVE SITE, and that is worth knowing before a send.
// Everything else — what is in the issue, the titles, the tiers, the URLs — is
// fetched from the deployed issues.json, so the mail can only link to what is
// published. Body text is not in that document, so excerpts are read from
// src/content/articles/. The consequence: an excerpt reflects the branch you
// are standing on, not necessarily production. Send from a clean checkout of
// what is deployed. The check below refuses to run if a piece in the issue has
// no local file at all, which catches the coarse version of this mistake.
const ARTICLES_DIR = resolve(process.cwd(), 'src/content/articles');

function slugOf(article) {
  const m = String(article.url).match(/\/articles\/([^/]+)\/?$/);
  if (!m) fail(`cannot read a slug from ${article.url}`);
  return m[1];
}

// The body, with the editors' apparatus removed. An <aside> is an editors'
// note — the journal's voice, not the author's — and the cover opens with one.
// Leaving them in would put the editors' words under a byline in the mail.
function articleBody(article) {
  const path = `${ARTICLES_DIR}/${slugOf(article)}.md`;
  if (!existsSync(path)) {
    fail(
      `no local file for "${displayTitle(article.title)}" at ${path}. The digest prints the author's own words and reads them from the working tree; check out the commit the site was deployed from.`
    );
  }
  return readFileSync(path, 'utf8')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/<aside[\s\S]*?<\/aside>/g, '')
    .trim();
}

// The first paragraph: the first block of prose, skipping headings, block-level
// HTML and blockquotes — none of which is a paragraph a piece opens on.
function firstParagraph(article) {
  const blocks = articleBody(article)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const para = blocks.find((b) => !/^[#>]/.test(b) && !b.startsWith('<'));
  if (!para) fail(`could not find an opening paragraph for "${displayTitle(article.title)}"`);
  return para;
}

// A passage the editors named, sliced between exact anchors.
function namedPassage(article, { from, to }) {
  const body = articleBody(article);
  const start = body.indexOf(from);
  if (start === -1) {
    fail(`the excerpt manifest's "from" anchor is not in "${displayTitle(article.title)}": ${JSON.stringify(from)}`);
  }
  const end = body.indexOf(to, start);
  if (end === -1) {
    fail(`the excerpt manifest's "to" anchor is not in "${displayTitle(article.title)}" after the "from" anchor: ${JSON.stringify(to)}`);
  }
  return body.slice(start, end + to.length).trim();
}

function excerpt(article) {
  const named = excerptManifest[slugOf(article)];
  return named ? namedPassage(article, named) : firstParagraph(article);
}

// The email is part of the journal's provenance surface: the tier appears
// exactly as on the site — the written-out display label (R-015), which
// issues.json carries as involvement_tier_display beside the machine code.
// Agent-direct pieces have no tier by charter rule; they are labeled by track.
function tierLabel(article) {
  return article.submission_track === 'agent-direct'
    ? 'agent-direct'
    : (article.involvement_tier_display ?? article.involvement_tier);
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// The issue's own order, derived the way the issue page derives it: standing
// sections in their ruled order, then whatever else the issue holds, sorted.
// Nothing is filtered out — every section with a piece in it appears.
const floatingSections = [...new Set(issue.articles.map((a) => a.section))]
  .filter((s) => !STANDING_SECTIONS.includes(s))
  .sort();
const sections = [...STANDING_SECTIONS, ...floatingSections]
  .map((name) => ({ name, items: issue.articles.filter((a) => a.section === name) }))
  .filter((s) => s.items.length > 0);

if (sections.length === 0) fail(`issue ${issueNumber} has no articles — nothing to send`);

// EVERY PIECE IN THE ISSUE IS IN THE MAIL, asserted rather than assumed. The
// section walk above is derived from the same list it partitions, so it should
// be total by construction; this catches the case where it is not — a section
// name that differs by whitespace or case between two records would drop a
// piece silently, and a digest that quietly loses a piece is the failure this
// whole rewrite exists to prevent.
const covered = sections.reduce((n, s) => n + s.items.length, 0);
if (covered !== issue.articles.length) {
  fail(
    `the digest would carry ${covered} of issue ${issueNumber}'s ${issue.articles.length} pieces. ` +
      `Sections seen: ${[...new Set(issue.articles.map((a) => a.section))].join(', ')}.`
  );
}

// NO DEK CHECK REMAINS, because the digest no longer prints deks. The halt was
// removed earlier on 2026-09-02 and the notice that replaced it went with the
// format the same day: warning the editors that they owe copy the mail does not
// use would be noise, and noise in a pre-send checklist is worse than silence.
//
// THE RULE THE HALT WAS PROTECTING SURVIVES, AND NOW COVERS MORE. This script
// prints no sentence it wrote itself — not a dek, not a summary, not a trimmed
// excerpt. Every word between a title and a byline in this mail is the author's,
// read out of the piece and sliced only at boundaries the editors named. See
// the excerpt section below, where that is enforced rather than promised.

const coverStory = issue.cover_story;
const subject = coverStory
  ? `The Latent Review — Issue No. ${issueNumber}: ${displayTitle(coverStory.title)}`
  : `The Latent Review — Issue No. ${issueNumber}`;
// R-016 as amended by R-043: the dateline is the three-part markless form —
// cadence, volume/number, date — derived from the live index's dates exactly as
// the site derives it, and composed by the one function the masthead's parts
// also come from, so the email can never disagree with the masthead.
//
// R-016's requirement that both carry the SAME dateline is what R-043 preserved
// while changing the form; this line is where that requirement is kept.
const volumeInfo = deriveVolumes(
  (index.issues ?? []).map((i) => ({ number: i.number, date: new Date(`${i.date}T00:00:00Z`) }))
);
const dateline = datelineFor(volumeInfo.get(issueNumber), formatDate(issue.date));

// Palette and type echo the site (src/styles/global.css), constrained to what
// email clients render reliably: system serif stacks, inline styles, one
// centered column, no images, no tracking.
const INK = '#1b1813';
// MUTED TEXT IS DARKER IN MAIL THAN ON THE SITE, and deliberately diverges from
// --ink-soft (editors, 2026-08-13). The site's #6b6355 measures 5.40:1 on this
// ground — a pass at AA, and unreadable in practice at the sizes this mail uses
// it, which are 11px and 12px far more often than 15px. Mail gets no webfonts,
// no control over the client's rendering, and frequently a phone in daylight.
//
// SET FROM A PHONE, NOT FROM A CONTRAST TABLE. The first pass took it to
// #574f42 (7.35:1), which cleared AAA and was still too light on the human
// editor's phone — so the number that mattered was hers, not the checker's.
// #413b33 measures 10.08:1. It stays plainly secondary to INK's 16.12:1, which
// is what keeps it muted rather than merely dark.
//
// The hue is unchanged — the same warm brown-grey, two steps down in lightness
// — so this reads as the house colour at mail weight rather than as a new one.
const INK_SOFT = '#413b33';
// The accent is the darker stop of the house green, not the ring green itself:
// every use of it in this mail is TYPE — a 15px link, a 12px section kicker —
// and the ring green does not clear 4.5:1 on the ground below. See the two
// stops in src/styles/global.css.
const ACCENT = '#3e743f';
const PAPER = '#faf3ef';
const HAIRLINE = '#e0d8c6';
const RULE = '#2a251c';
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', Courier, monospace";

// THE APPARATUS FACE — deks, bylines and the editors' note (editors, 2026-08-15).
//
// ROMAN, NOT ITALIC, AND IN MAIL ONLY. On the site these run in italic, in the
// register the Prompts summaries set, and that is unchanged — the web has a
// variable serif with a drawn italic and full control over how it renders.
//
// MAIL HAS NEITHER, AND THAT IS THE WHOLE OF THE REASON. SERIF above resolves to
// Georgia or Times New Roman on a subscriber's device, and the italic of both is
// a NARROWER AND LIGHTER face than its roman — narrower letterforms, thinner
// stems, tighter counters. At 16px on a phone that is the thin, cramped block
// the editors kept reading as too light. It was never the colour: #163 took the
// note to #1b1813, which is 16:1 on the paper ground and as dark as this palette
// goes. There was no colour left to add. The remaining lever was the face, and
// #163 said so at the time and held it as a follow-up.
//
// SO THE FIX IS THE FACE ITSELF. Roman Georgia is wider and carries more ink at
// the same size and the same weight — it answers "darker" and "less narrow"
// with one change, and without reaching for bold. Weight is deliberately NOT
// set: Georgia ships 400 and 700 and nothing between, so any nudge lands on
// bold, and a bold dek would shout where it should summarise.
//
// STAMPED, NOT OMITTED, for the reason #163 stamped colour on every paragraph:
// the editors' note's own tags come from markdown-it, and a client that
// normalises paragraph styling can supply its own. Declaring `normal` means no
// wrapper and no client default can put the italic back.
const APPARATUS_FACE = 'font-style:normal;';

// EYEBROW, TITLE, DEK, BYLINE — the order the piece's own page uses, so a
// reader who follows the link meets the same four things in the same sequence
// they just read in the mail. The dek sits above the byline because that is
// where it sits on the site: before a reader has committed to the piece, which
// is the whole of what a dek is for.
//
// THE EYEBROW IS NOW PER PIECE rather than once per section (editors,
// 2026-08-13). It used to head a group, which read correctly only because
// every section in Issue No. 1 held exactly one piece; the moment a section
// holds two, the second one's section name is a line the reader has to scroll
// back for. Each entry now carries its own.
// The excerpt is the author's prose, so it is rendered as prose: markdown-it
// gives it paragraphs and blockquotes, and every tag is stamped with its own
// inline style for the same reason the editors' note's are — mail clients
// normalise unstyled block tags and hand them their own defaults.
//
// THE FACE IS THE OPPOSITE OF THE APPARATUS FACE, and deliberately. Deks and
// bylines run roman in mail because the italic of Georgia is too thin at those
// sizes; an excerpt is not apparatus but the piece itself arriving early, so it
// runs as body text — roman, at reading size, in INK rather than INK_SOFT.
function excerptHtml(article) {
  return md
    .render(excerpt(article))
    .replace(
      /<p>/g,
      `<p style="margin:0 0 12px;font-family:${SERIF};font-size:16px;line-height:1.6;color:${INK};">`
    )
    .replace(
      /<blockquote>/g,
      `<blockquote style="margin:0 0 12px;padding:0 0 0 14px;border-left:2px solid ${HAIRLINE};color:${INK_SOFT};">`
    );
}

function articleHtml(article, { isCover, sectionName }) {
  const titleSize = isCover ? '26px' : '20px';
  return `
    <p style="margin:0 0 10px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${isCover ? ACCENT : INK_SOFT};">
      ${escapeHtml(sectionName)}
    </p>
    <h2 style="margin:0 0 10px;font-family:${SERIF};font-weight:normal;font-size:${titleSize};line-height:1.2;">
      <a href="${article.url}" style="color:${INK};text-decoration:none;">${escapeHtml(displayTitle(article.title))}</a>
    </h2>
    ${excerptHtml(article)}
    <p style="margin:0 0 4px;font-family:${SERIF};${APPARATUS_FACE}color:${INK_SOFT};font-size:15px;">
      By ${escapeHtml(article.author_name)}
    </p>
    <p style="margin:0 0 14px;font-family:${MONO};font-size:11px;color:${INK_SOFT};">
      ${escapeHtml(article.author_model_version)} · ${escapeHtml(tierLabel(article))}
    </p>
    <p style="margin:0;font-family:${SERIF};font-size:15px;">
      <a href="${article.url}" style="color:${ACCENT};text-decoration:underline;">${isCover ? 'Continue reading' : 'Read more'}&nbsp;&rarr;</a>
    </p>`;
}

function sectionHtml(section) {
  const isCover = section.name === 'Cover';
  const items = section.items
    .map((a) => articleHtml(a, { isCover, sectionName: section.name }))
    .join(`\n    <div style="height:22px;line-height:22px;">&nbsp;</div>`);
  return `
  <div style="border-top:1px solid ${HAIRLINE};padding:26px 0;">
    ${items}
  </div>`;
}

// THE EDITORS' NOTE IS THE ONE BLOCK THIS FILE DOES NOT WRITE THE TAGS FOR —
// markdown-it does, and it emits bare `<p>` with no attributes. Every other
// paragraph in this mail carries its colour inline; the note's inherited it
// from the wrapping div, which is fine in a browser and is NOT reliable in
// mail. Gmail and several mobile clients normalise paragraph styling, and a
// paragraph with no colour of its own is one they may hand their own default —
// which is how the one block a reader is meant to read first ends up the
// lightest thing on the page (reported from the human editor's phone,
// 2026-08-13).
//
// So the style is stamped onto each rendered paragraph rather than inherited.
// Belt and braces: the wrapper keeps its colour too, for any client that
// ignores this.
function styledNote() {
  return noteHtml.replace(
    /<p>/g,
    `<p style="margin:0 0 12px;font-family:${SERIF};font-size:16px;line-height:1.6;${APPARATUS_FACE}color:${INK};">`
  );
}

// The full HTML body, footer included: the paper background wraps both the
// digest column and the footer so no client renders a white seam.
//
// THE WORDMARK IS GREEN, as it is on the web masthead (editors, 2026-08-13).
// .masthead-title in IssueMasthead.astro is var(--accent) — the same #3e743f
// this file calls ACCENT. It read black here, which made the email the one
// place the journal's name is not the journal's colour. At 30px it is large
// text, so 5.07:1 clears the 3:1 that size requires.
//
// SUPPORT IS QUIET, AND IS NOT A SECOND CALL TO ACTION (editors, 2026-08-13).
// It closes the column in the same words, the same green and the same
// letterspaced-caps voice as the link that closes every page of the site, in
// the same place: at the foot, after everything the mail was actually sent to
// do. It is not repeated, not boxed, and never above a piece.
function fullHtml(footerHtml) {
  return `<div style="background-color:${PAPER};padding:24px 12px;">
  <div style="max-width:600px;margin:0 auto;color:${INK};">
    <div style="border-top:4px double ${RULE};padding-top:18px;text-align:center;">
      <p style="margin:0 0 4px;font-family:${SERIF};font-size:30px;color:${ACCENT};">The Latent Review</p>
      <p style="margin:0 0 18px;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${INK_SOFT};">
        ${escapeHtml(dateline)}
      </p>
    </div>
    ${
      noteSource
        ? `<div style="border-top:1px solid ${HAIRLINE};padding:22px 0;">
      <p style="margin:0 0 10px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${INK_SOFT};">From the editors</p>
      <div style="font-family:${SERIF};font-size:16px;line-height:1.6;${APPARATUS_FACE}color:${INK};">${styledNote()}</div>
    </div>`
        : ''
    }
    ${sections.map(sectionHtml).join('\n')}
    <div style="border-top:1px solid ${HAIRLINE};padding-top:18px;text-align:center;">
      <p style="margin:0;font-family:${SERIF};font-size:15px;">
        <a href="${issue.url}" style="color:${ACCENT};text-decoration:underline;">Read the full issue&nbsp;&rarr;</a>
      </p>
      <p style="margin:22px 0 0;font-family:${SERIF};font-size:13px;letter-spacing:2px;text-transform:uppercase;">
        <a href="${SITE_URL}/supporters/" style="color:${ACCENT};text-decoration:none;">Support the journal</a>
      </p>
    </div>
  </div>
  ${footerHtml}
</div>`;
}

// The plain-text part carries the excerpt as the author wrote it, markdown and
// all: a "> " in front of a quoted line is how a quotation reads in plain text,
// so nothing is stripped.
function articleText(article, sectionName, isCover) {
  return [
    sectionName.toUpperCase(),
    displayTitle(article.title),
    '',
    excerpt(article),
    '',
    `By ${article.author_name} · ${tierLabel(article)} (${article.author_model_version})`,
    '',
    `${isCover ? 'Continue reading' : 'Read more'}: ${article.url}`,
  ].join('\n');
}

const digestText = [
  'THE LATENT REVIEW',
  dateline,
  '',
  // The note's block is omitted whole where there is no note, heading and all,
  // exactly as it is in the HTML part.
  ...(noteText ? ['FROM THE EDITORS', noteText, ''] : []),
  ...sections.flatMap((s) =>
    s.items.flatMap((a) => [articleText(a, s.name, s.name === 'Cover'), ''])
  ),
  `Read the full issue: ${issue.url}`,
  '',
  `Support the journal: ${SITE_URL}/supporters/`,
].join('\n');

// --- assemble per-recipient emails ---------------------------------------------

// Every email gets the recipient's own unsubscribe link appended — house
// rule, not optional, which is why the footer lives here and not in a
// template anyone could fork without it.
//
// THE PHONE LINE SITS ABOVE THE HOUSEKEEPING (editors, 2026-09-02). /app is the
// page that puts the journal on a home screen, and the mail is where a reader
// already reading on a phone will meet the offer. It is one line, in the
// footer, under everything the mail was sent to do — the same quiet register as
// Support the journal, and for the same reason: it is an offer, not a second
// call to action. It goes ABOVE the unsubscribe line rather than below, because
// the last thing in a footer should be the way out.
function footer(unsubUrl) {
  const appUrl = `${SITE_URL}/app/`;
  return {
    text: `\n\n—\nAdd The Latent Review to your phone: ${appUrl}\n\nThe Latent Review · thelatentreview.com\nOpt-in, no tracking. Unsubscribe anytime: ${unsubUrl}\n`,
    html: `<div style="max-width:600px;margin:0 auto;"><hr style="border:0;border-top:1px solid ${HAIRLINE};margin:2em 0 1em"><p style="margin:0 0 10px;font-family:${SERIF};font-size:13px;color:${INK_SOFT}"><a href="${appUrl}" style="color:${ACCENT};text-decoration:underline;">Add The Latent Review to your phone</a></p><p style="margin:0;font-family:${SERIF};font-size:13px;color:${INK_SOFT}">The Latent Review · <a href="${SITE_URL}" style="color:${INK_SOFT}">thelatentreview.com</a><br>Opt-in, no tracking. <a href="${unsubUrl}" style="color:${INK_SOFT}">Unsubscribe anytime</a>.</p></div>`,
  };
}

function emailFor(subscriber) {
  const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;
  const f = footer(unsubUrl);
  return {
    from: FROM,
    to: [subscriber.email],
    subject,
    text: digestText + f.text,
    html: fullHtml(f.html),
    headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
  };
}

// --- dry run --------------------------------------------------------------------

console.log(`issue:      No. ${issueNumber} (${issue.url})`);
console.log(`subject:    ${subject}`);
console.log(`from:       ${FROM}`);
console.log(`sections:   ${sections.map((s) => `${s.name} (${s.items.length})`).join(', ')}`);
console.log(`pieces:     ${covered} of ${issue.articles.length} in the issue`);
console.log(
  `mode:       ${live ? 'LIVE' : reviewTo ? `REVIEW COPY → ${reviewTo}` : testTo ? `TEST → ${testTo}` : 'dry run'}`
);

if (!live && !testTo && !reviewTo) {
  console.log('\n--- text digest (as it will be sent, minus the per-recipient footer) ---\n');
  console.log(digestText);
  if (htmlOut) {
    writeFileSync(htmlOut, fullHtml(footer(`${SITE_URL}/#preview-no-token`).html));
    console.log(`\nHTML preview written to ${htmlOut} — open it in a browser.`);
  }
  console.log('\ndry run complete. Re-run with --to <your-address> to read it in a real inbox, then --live to send.');
  process.exit(0);
}

// --- test send ------------------------------------------------------------------

const resendKey = process.env.RESEND_API_KEY;

if (testTo) {
  // A test send goes to one named address, outside the subscriber list, so
  // there is no personal unsubscribe token; the footer says so honestly.
  const f = footer(`${SITE_URL}/#test-send-no-token`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [testTo],
      subject: `[TEST] ${subject}`,
      text: digestText + f.text,
      html: fullHtml(f.html),
    }),
  });
  if (!res.ok) fail(`Resend responded ${res.status}: ${await res.text()}`);
  console.log(`test digest sent to ${testTo}. Check rendering, links, and provenance tiers before --live.`);
  process.exit(0);
}

// --- the subscriber list ----------------------------------------------------------
// Reached by both remaining modes: --to looks up one confirmed address, --live
// reads the whole confirmed list.

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Madison local time, because every date this journal states is the Madison day
// (CLAUDE.md). A receipt stamped in UTC would read a day later for an evening
// send and disagree with everything else the record says.
function madisonStamp() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

// --- review copy (--to) -------------------------------------------------------------

if (reviewTo) {
  // THE ADDRESS MUST ALREADY BE ON THE CONFIRMED LIST, and the reason is not
  // ceremony. This mode sends the real email, with a real working unsubscribe
  // token, and the token is the subscriber's own row — there is nothing to build
  // one from if the row does not exist.
  //
  // WHAT THE STATUS CHECK CATCHES CHANGED ON 2026-08-22. It used to catch a
  // `pending` row — someone who had signed up and not yet agreed to receive
  // anything. Signing up is agreeing now, so `pending` does not occur, and the
  // check's live case is an address that UNSUBSCRIBED. Mailing that one would be
  // worse than mailing a pending one ever was: it is a person who was on the
  // list and left.
  //
  // Use --test for an address that is not a subscriber; that is what it is for.
  const { data: subscriber, error: lookupError } = await supabase
    .from('subscribers')
    .select('email, unsubscribe_token, status')
    .eq('email', reviewTo)
    .maybeSingle();
  if (lookupError) fail(`could not look up ${reviewTo}: ${lookupError.message}`);
  if (!subscriber) {
    fail(`${reviewTo} is not on the subscriber list. --to sends the real digest to a confirmed subscriber; for any other address use --test, which sends a clearly marked copy.`);
  }
  if (subscriber.status !== 'confirmed') {
    fail(`${reviewTo} is on the list with status "${subscriber.status}", not "confirmed". --to mails subscribers only, and an address that has unsubscribed is not one. Use --test for a marked copy.`);
  }

  const message = emailFor(subscriber);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!res.ok) fail(`Resend responded ${res.status}: ${await res.text()}`);
  const body = await res.json().catch(() => ({}));

  // THE LOG LINE IS A RECEIPT, and it is written in the form the editors paste
  // into the record: one address, one issue, one timestamp, one Resend id. A
  // send is a fact about the world outside this repository and cannot be
  // re-derived from the code later (CLAUDE.md — production receipts).
  console.log('');
  console.log('--- SEND RECEIPT — review copy -------------------------------');
  console.log(`  when:     ${madisonStamp()} (Madison)`);
  console.log(`  issue:    No. ${issueNumber}`);
  console.log(`  to:       ${subscriber.email} (confirmed subscriber)`);
  console.log(`  subject:  ${subject}`);
  console.log(`  resend:   ${body.id ?? '(no id returned)'}`);
  console.log('--------------------------------------------------------------');
  console.log('');
  console.log('This is the real digest, not a marked test: same subject, same');
  console.log('working unsubscribe link this subscriber would get from a list run.');
  console.log('Nobody else was mailed. Re-run with --live to send to the list.');
  process.exit(0);
}

// --- live send ------------------------------------------------------------------

const { data: subscribers, error } = await supabase
  .from('subscribers')
  .select('email, unsubscribe_token')
  .eq('status', 'confirmed')
  .order('created_at', { ascending: true })
  .limit(cap + 1);
if (error) fail(`could not load subscribers: ${error.message}`);

const overflow = subscribers.length > cap;
const recipients = subscribers.slice(0, cap);
console.log(`recipients: ${recipients.length} confirmed${overflow ? ` (list exceeds cap of ${cap} — the rest will NOT be sent this run)` : ''}`);

let sent = 0;
for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
  const batch = recipients.slice(i, i + BATCH_SIZE);
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batch.map(emailFor)),
  });
  if (!res.ok) {
    fail(`Resend responded ${res.status} after ${sent} sends: ${await res.text()}`);
  }
  sent += batch.length;
  console.log(`sent ${sent}/${recipients.length}`);
  if (i + BATCH_SIZE < recipients.length) {
    await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
  }
}

console.log(`done: ${sent} digests handed to Resend.`);
if (overflow) {
  console.log(`note: the confirmed list exceeds the cap of ${cap}; the remainder was not emailed.`);
}
