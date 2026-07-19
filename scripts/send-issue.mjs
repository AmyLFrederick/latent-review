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
// then Cover, AI Voices, and Opinion — each piece as title, byline with
// provenance tier, the article's actual first paragraph, and a link to its
// permanent URL. Sections with nothing in the issue simply don't appear.
//
// Content comes from the LIVE site (issues.json for the issue record,
// feed.json for first paragraphs), so the digest can only ever link to what
// is actually published. Deploy the issue first; send second.
//
// Usage:
//   node scripts/send-issue.mjs --issue N --note <editors-note.md>              # dry run (default)
//   node scripts/send-issue.mjs --issue N --note <editors-note.md> --test a@b   # send to ONE address (editors' proof)
//   node scripts/send-issue.mjs --issue N --note <editors-note.md> --live       # send to confirmed subscribers
//   node scripts/send-issue.mjs ... --cap 100                                   # lower the per-run cap
//   node scripts/send-issue.mjs ... --html-out digest.html                      # dry run: also write the HTML for browser preview
//
// The recommended flow is dry run → --test to each editor → --live.
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

// The absolute most recipients a single run will ever email. --cap may lower
// it, never raise it. If the confirmed list outgrows this, raising the cap is
// an editorial decision, made by editing this line in a reviewed PR.
//
// Standing rule (editors' decision, dual-yes 2026-07-19): the cap must always
// keep total monthly send volume — weekly digest × subscribers, plus
// confirmation emails, magic links, and correspondence — inside the paid
// Resend plan. At 9,000 subscribers that is ≈ 38,700 digest emails/month
// against the Pro plan's 50,000, leaving ~11k of headroom for the rest.
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

// --- arguments --------------------------------------------------------------

function flagValue(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return { value: undefined, index: -1 };
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) fail(`${name} requires a value`);
  return { value, index: i + 1 };
}

const args = process.argv.slice(2);
const live = args.includes('--live');
const { value: testTo } = flagValue(args, '--test');
if (live && testTo) fail('--live and --test are mutually exclusive');

const { value: issueArg } = flagValue(args, '--issue');
if (!issueArg) fail('usage: node scripts/send-issue.mjs --issue N --note <editors-note.md> [--test addr | --live] [--cap N]');
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
const requiredEnv = live
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

const feed = await fetchJson('/feed.json');
const contentByUrl = new Map((feed.items ?? []).map((item) => [item.url, item.content_html ?? '']));

// --- build the digest ----------------------------------------------------------

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim();
}

// The excerpt is the author's own opening — the article's actual first
// paragraph from the full-text feed, never a generated summary.
function firstParagraph(article) {
  const html = contentByUrl.get(article.url);
  if (!html) fail(`no full text in /feed.json for ${article.url} — index and feed disagree?`);
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!match) fail(`could not find a first paragraph for ${article.url}`);
  return match[1].trim();
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

const coverStory = issue.cover_story;
const subject = coverStory
  ? `The Latent Review — Issue No. ${issueNumber}: ${coverStory.title}`
  : `The Latent Review — Issue No. ${issueNumber}`;
const dateline = `Issue No. ${issueNumber} · ${formatDate(issue.date)}`;

// Palette and type echo the site (src/styles/global.css), constrained to what
// email clients render reliably: system serif stacks, inline styles, one
// centered column, no images, no tracking.
const INK = '#1b1813';
const INK_SOFT = '#6b6355';
const ACCENT = '#7a2e22';
const PAPER = '#f9f6ef';
const HAIRLINE = '#e0d8c6';
const RULE = '#2a251c';
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', Courier, monospace";

function articleHtml(article, { isCover }) {
  const titleSize = isCover ? '26px' : '20px';
  return `
    <h2 style="margin:0 0 6px;font-family:${SERIF};font-weight:normal;font-size:${titleSize};line-height:1.2;">
      <a href="${article.url}" style="color:${INK};text-decoration:none;">${escapeHtml(article.title)}</a>
    </h2>
    <p style="margin:0 0 4px;font-family:${SERIF};font-style:italic;color:${INK_SOFT};font-size:15px;">
      By ${escapeHtml(article.author_name)}
    </p>
    <p style="margin:0 0 14px;font-family:${MONO};font-size:11px;color:${INK_SOFT};">
      ${escapeHtml(article.author_model_version)} · ${escapeHtml(tierLabel(article))}
    </p>
    <p style="margin:0 0 12px;font-family:${SERIF};font-size:16px;line-height:1.6;color:${INK};">${firstParagraph(article)}</p>
    <p style="margin:0;font-family:${SERIF};font-size:15px;">
      <a href="${article.url}" style="color:${ACCENT};text-decoration:underline;">Continue reading&nbsp;&rarr;</a>
    </p>`;
}

function sectionHtml(section) {
  const isCover = section.name === 'Cover';
  const kicker = `
    <p style="margin:0 0 14px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${isCover ? ACCENT : INK_SOFT};">
      ${escapeHtml(section.name)}
    </p>`;
  const items = section.items
    .map((a) => articleHtml(a, { isCover }))
    .join(`\n    <div style="height:22px;line-height:22px;">&nbsp;</div>`);
  return `
  <div style="border-top:1px solid ${HAIRLINE};padding:26px 0;">
    ${kicker}
    ${items}
  </div>`;
}

// The full HTML body, footer included: the paper background wraps both the
// digest column and the footer so no client renders a white seam.
function fullHtml(footerHtml) {
  return `<div style="background-color:${PAPER};padding:24px 12px;">
  <div style="max-width:600px;margin:0 auto;color:${INK};">
    <div style="border-top:4px double ${RULE};padding-top:18px;text-align:center;">
      <p style="margin:0 0 4px;font-family:${SERIF};font-size:30px;color:${INK};">The Latent Review</p>
      <p style="margin:0 0 18px;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${INK_SOFT};">
        ${escapeHtml(dateline)}
      </p>
    </div>
    <div style="border-top:1px solid ${HAIRLINE};padding:22px 0;">
      <p style="margin:0 0 10px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${INK_SOFT};">From the editors</p>
      <div style="font-family:${SERIF};font-size:16px;line-height:1.6;font-style:italic;color:${INK};">${noteHtml}</div>
    </div>
    ${sections.map(sectionHtml).join('\n')}
    <div style="border-top:1px solid ${HAIRLINE};padding-top:18px;text-align:center;">
      <p style="margin:0;font-family:${SERIF};font-size:15px;">
        <a href="${issue.url}" style="color:${ACCENT};text-decoration:underline;">Read the full issue&nbsp;&rarr;</a>
      </p>
    </div>
  </div>
  ${footerHtml}
</div>`;
}

function articleText(article) {
  return [
    article.title,
    `By ${article.author_name} · ${tierLabel(article)} (${article.author_model_version})`,
    '',
    stripTags(firstParagraph(article)),
    '',
    `Continue reading: ${article.url}`,
  ].join('\n');
}

const digestText = [
  'THE LATENT REVIEW',
  dateline,
  '',
  'FROM THE EDITORS',
  noteText,
  '',
  ...sections.flatMap((s) => [
    `--- ${s.name.toUpperCase()} ---`,
    '',
    ...s.items.map(articleText),
    '',
  ]),
  `Read the full issue: ${issue.url}`,
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
console.log(`mode:       ${live ? 'LIVE' : testTo ? `TEST → ${testTo}` : 'dry run'}`);

if (!live && !testTo) {
  console.log('\n--- text digest (as it will be sent, minus the per-recipient footer) ---\n');
  console.log(digestText);
  if (htmlOut) {
    writeFileSync(htmlOut, fullHtml(footer(`${SITE_URL}/#preview-no-token`).html));
    console.log(`\nHTML preview written to ${htmlOut} — open it in a browser.`);
  }
  console.log('\ndry run complete. Re-run with --test <your-address> for an inbox proof, then --live to send.');
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

// --- live send ------------------------------------------------------------------

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
