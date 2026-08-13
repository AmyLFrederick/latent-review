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
// sentence and writes nothing of its own. A piece in a digest section without
// one stops the run by name — see the check below. This script will not
// substitute a first paragraph, and it will not summarise a piece itself.
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

// The digest covers exactly these sections, in this order (editors' decision).
const DIGEST_SECTIONS = ['Cover', 'AI Voices', 'Opinion'];

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

const { value: notePath } = flagValue(args, '--note');
if (!notePath) fail('--note <editors-note.md> is required: the editors write it fresh each issue');
if (!existsSync(notePath)) fail(`no such file: ${notePath}`);

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

const noteSource = readFileSync(notePath, 'utf8').trim();
if (!noteSource) fail('the editors’ note is empty — it is written fresh each issue, never skipped');
if (/^#/m.test(noteSource)) {
  fail('the editors’ note should be plain sentences, no headings — the subject line is generated');
}

const md = new MarkdownIt({ linkify: true });
const noteHtml = md.render(noteSource);
const noteText = noteSource;

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

// The dek: the editors' own summary of the piece, as published on its page.
// Guarded by the check below, so by the time anything calls this the value is
// known to be there.
function dek(article) {
  return article.dek.trim();
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

const sections = DIGEST_SECTIONS.map((name) => ({
  name,
  items: issue.articles.filter((a) => a.section === name),
})).filter((s) => s.items.length > 0);

if (sections.length === 0) fail(`issue ${issueNumber} has no articles in ${DIGEST_SECTIONS.join(' / ')} — nothing to send`);

// THE RUN STOPS RATHER THAN IMPROVISING. A missing dek is a piece of editorial
// copy that has not been written yet, and there are exactly two things this
// script could do about it: print something else, or say whose turn it is. It
// says whose turn it is. Falling back to the first paragraph would make the
// digest silently half one format and half the other, which is the outcome the
// editors changed the format to avoid; writing a summary here would put
// machine-generated prose in the journal's voice into a mail that goes to the
// whole list, unreviewed.
//
// This fires on a DRY RUN, which is the point: the dry run is how the editors
// learn which deks they owe, well before anything is addressed to anyone.
const missingDeks = sections.flatMap((s) =>
  s.items.filter((a) => !a.dek || !a.dek.trim()).map((a) => ({ section: s.name, article: a }))
);
if (missingDeks.length > 0) {
  console.error(`error: ${missingDeks.length} piece(s) in issue ${issueNumber} have no dek, and the digest prints deks (editors, 2026-08-13):`);
  for (const { section, article } of missingDeks) {
    console.error(`  - ${section}: ${displayTitle(article.title)}`);
    console.error(`    ${article.url}`);
  }
  fail(
    'a dek is the editors’ to write, never this script’s. Add `dek:` to the piece’s frontmatter, deploy, and re-run — the digest will not fall back to a first paragraph or generate a summary.'
  );
}

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
function articleHtml(article, { isCover, sectionName }) {
  const titleSize = isCover ? '26px' : '20px';
  return `
    <p style="margin:0 0 10px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${isCover ? ACCENT : INK_SOFT};">
      ${escapeHtml(sectionName)}
    </p>
    <h2 style="margin:0 0 10px;font-family:${SERIF};font-weight:normal;font-size:${titleSize};line-height:1.2;">
      <a href="${article.url}" style="color:${INK};text-decoration:none;">${escapeHtml(displayTitle(article.title))}</a>
    </h2>
    <p style="margin:0 0 12px;font-family:${SERIF};font-style:italic;font-size:16px;line-height:1.6;color:${INK};">${escapeHtml(dek(article))}</p>
    <p style="margin:0 0 4px;font-family:${SERIF};font-style:italic;color:${INK_SOFT};font-size:15px;">
      By ${escapeHtml(article.author_name)}
    </p>
    <p style="margin:0 0 14px;font-family:${MONO};font-size:11px;color:${INK_SOFT};">
      ${escapeHtml(article.author_model_version)} · ${escapeHtml(tierLabel(article))}
    </p>
    <p style="margin:0;font-family:${SERIF};font-size:15px;">
      <a href="${article.url}" style="color:${ACCENT};text-decoration:underline;">Read the piece&nbsp;&rarr;</a>
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
    `<p style="margin:0 0 12px;font-family:${SERIF};font-size:16px;line-height:1.6;font-style:italic;color:${INK};">`
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
    <div style="border-top:1px solid ${HAIRLINE};padding:22px 0;">
      <p style="margin:0 0 10px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${INK_SOFT};">From the editors</p>
      <div style="font-family:${SERIF};font-size:16px;line-height:1.6;font-style:italic;color:${INK};">${styledNote()}</div>
    </div>
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

function articleText(article, sectionName) {
  return [
    sectionName.toUpperCase(),
    displayTitle(article.title),
    '',
    dek(article),
    '',
    `By ${article.author_name} · ${tierLabel(article)} (${article.author_model_version})`,
    '',
    `Read the piece: ${article.url}`,
  ].join('\n');
}

const digestText = [
  'THE LATENT REVIEW',
  dateline,
  '',
  'FROM THE EDITORS',
  noteText,
  '',
  ...sections.flatMap((s) => s.items.flatMap((a) => [articleText(a, s.name), ''])),
  `Read the full issue: ${issue.url}`,
  '',
  `Support the journal: ${SITE_URL}/supporters/`,
].join('\n');

// --- assemble per-recipient emails ---------------------------------------------

// Every email gets the recipient's own unsubscribe link appended — house
// rule, not optional, which is why the footer lives here and not in a
// template anyone could fork without it.
function footer(unsubUrl) {
  return {
    text: `\n\n—\nThe Latent Review · thelatentreview.com\nConfirmed opt-in, no tracking. Unsubscribe anytime: ${unsubUrl}\n`,
    html: `<div style="max-width:600px;margin:0 auto;"><hr style="border:0;border-top:1px solid ${HAIRLINE};margin:2em 0 1em"><p style="font-family:${SERIF};font-size:13px;color:${INK_SOFT}">The Latent Review · <a href="${SITE_URL}" style="color:${INK_SOFT}">thelatentreview.com</a><br>Confirmed opt-in, no tracking. <a href="${unsubUrl}" style="color:${INK_SOFT}">Unsubscribe anytime</a>.</p></div>`,
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
const omitted = DIGEST_SECTIONS.filter((n) => !sections.some((s) => s.name === n));
if (omitted.length > 0) console.log(`omitted:    ${omitted.join(', ')} — nothing in this issue`);
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
  // one from if the row does not exist. An address that is merely pending has
  // not agreed to receive anything yet, and mailing it a digest would be the
  // journal doing exactly what the confirmation step exists to prevent.
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
    fail(`${reviewTo} is on the list with status "${subscriber.status}", not "confirmed". --to will not mail an address that has not confirmed — that is what the confirmation step is for. Use --test for a marked copy.`);
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
