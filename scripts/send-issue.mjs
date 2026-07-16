#!/usr/bin/env node
// send-issue — announce an issue to confirmed subscribers, by hand.
//
// This script is the ONLY way subscriber email leaves The Latent Review, and
// it is manual by design: nothing schedules it, nothing triggers it, and it
// must never be wired into CI, a webhook, or a cron job (CLAUDE.md — cost
// guardrails; a flooded queue burns disk, not sends).
//
// Usage:
//   node scripts/send-issue.mjs <announcement.md>            # dry run (default)
//   node scripts/send-issue.mjs <announcement.md> --live     # actually send
//   node scripts/send-issue.mjs <announcement.md> --cap 100  # lower the cap
//
// The markdown file's first `# Heading` becomes the subject; the rest is the
// body. Every email gets the recipient's own unsubscribe link appended —
// house rule, not optional, which is why the footer is added here and not in
// the markdown.
//
// Env (from the environment or a local .env, which is gitignored):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
//   optional: RESEND_FROM, SITE_URL

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import MarkdownIt from 'markdown-it';
import { createClient } from '@supabase/supabase-js';

// The absolute most recipients a single run will ever email. --cap may lower
// it, never raise it. If the confirmed list outgrows this, raising the cap is
// an editorial decision, made by editing this line in a reviewed PR.
const HARD_CAP = 500;
const BATCH_SIZE = 100; // Resend's batch endpoint maximum
const BATCH_PAUSE_MS = 700;

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

const args = process.argv.slice(2);
const live = args.includes('--live');
const capFlag = args.indexOf('--cap');
let cap = HARD_CAP;
if (capFlag !== -1) {
  cap = Number(args[capFlag + 1]);
  if (!Number.isInteger(cap) || cap < 1) fail('--cap requires a positive integer');
  if (cap > HARD_CAP) fail(`--cap may not exceed the hard cap of ${HARD_CAP}`);
}
const capValueIndex = capFlag === -1 ? -1 : capFlag + 1;
const mdPath = args.find((a, i) => !a.startsWith('--') && i !== capValueIndex);
if (!mdPath) fail('usage: node scripts/send-issue.mjs <announcement.md> [--live] [--cap N]');
if (!existsSync(mdPath)) fail(`no such file: ${mdPath}`);

// --- render the announcement -------------------------------------------------

const source = readFileSync(mdPath, 'utf8').trim();
const subjectMatch = source.match(/^#\s+(.+)$/m);
if (!subjectMatch) fail('the markdown file needs a top-level "# Subject line" heading');
const subject = subjectMatch[1].trim();
const body = source.replace(subjectMatch[0], '').trim();
if (!body) fail('the announcement body is empty');

const md = new MarkdownIt({ linkify: true });
const bodyHtml = md.render(body);

function emailFor(subscriber) {
  const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;
  return {
    from: FROM,
    to: [subscriber.email],
    subject,
    text: `${body}\n\n—\nThe Latent Review · thelatentreview.com\nConfirmed opt-in, no tracking. Unsubscribe anytime: ${unsubUrl}\n`,
    html: `${bodyHtml}<hr style="border:0;border-top:1px solid #e0d8c6;margin:2em 0 1em"><p style="font-size:13px;color:#6b6355">The Latent Review · <a href="${SITE_URL}" style="color:#6b6355">thelatentreview.com</a><br>Confirmed opt-in, no tracking. <a href="${unsubUrl}" style="color:#6b6355">Unsubscribe anytime</a>.</p>`,
    headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
  };
}

// --- recipients ---------------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');

const supabase = createClient(supabaseUrl, serviceKey, {
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

console.log(`subject:    ${subject}`);
console.log(`from:       ${FROM}`);
console.log(`recipients: ${recipients.length} confirmed${overflow ? ` (list exceeds cap of ${cap} — the rest will NOT be sent this run)` : ''}`);
console.log(`mode:       ${live ? 'LIVE' : 'dry run'}`);

if (!live) {
  console.log('\n--- text body (as it will be sent, minus the per-recipient footer) ---\n');
  console.log(body);
  console.log('\ndry run complete. Re-run with --live to send.');
  process.exit(0);
}

// --- send ----------------------------------------------------------------------

const resendKey = process.env.RESEND_API_KEY;
if (!resendKey) fail('RESEND_API_KEY must be set');

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

console.log(`done: ${sent} emails handed to Resend.`);
if (overflow) {
  console.log(`note: the confirmed list exceeds the cap of ${cap}; the remainder was not emailed.`);
}
