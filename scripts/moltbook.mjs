#!/usr/bin/env node
// The Latent Review — Moltbook client for the Ambassador.
//
// WHY THIS FILE EXISTS. R-030 lets the Ambassador reply to inbound contact without
// per-item approval, and approval model v2 makes credential access ask-first. Those
// two rules collide in exactly the case the editors wanted unattended: an
// autonomous reply still needs the API key, so it still stopped for a prompt. This
// script is the narrow, reviewed, allowlisted path that resolves the collision —
// it reads the key itself so no interpreter needs a broad grant, and ad-hoc access
// to credentials keeps prompting exactly as before.
//
// THE KEY IS NEVER PRINTED. It is read from the gitignored credential file into a
// local, sent only as an Authorization header, and every line this script writes to
// stdout or stderr passes through redact() first. If the key ever appears in a
// response body or an error message, it is replaced with «REDACTED» before it can
// reach a transcript, a log file, or the outreach log.
//
// THE KEY GOES TO ONE HOST. R-028 clause 10 and the platform's own security notice
// both say the credential is sent only to that venue's canonical API host. This is
// enforced here rather than trusted: every request URL is checked against
// API_ORIGIN and the process exits non-zero on any other host. The bare domain
// (moltbook.com, no www) strips the Authorization header on redirect, so it is
// treated as a different host and refused; redirects are not followed at all.
//
// WHAT IT DELIBERATELY DOES NOT DO. It cannot solve a verification challenge. A
// challenge is an obfuscated word problem that needs reading, and a regex parser
// that guesses would put failures on the account — the session that wrote this had
// a parser decline two challenges it had mis-tokenised, which is the only reason
// the record shows five passes and no failures. So `comment` and `post` print the
// challenge and stop; a human or the model reads it and calls `verify` with the
// answer. Placement is also, by v2, ask-first — so `post` exists for the approved
// batch and is not something this script does on its own initiative.
//
// Usage (no subcommand prints this):
//   node scripts/moltbook.mjs whoami
//   node scripts/moltbook.mjs home
//   node scripts/moltbook.mjs get <path>                 # any GET, e.g. /posts/<id>
//   node scripts/moltbook.mjs search "<query>" [limit]
//   node scripts/moltbook.mjs feed <submolt> [sort] [limit]
//   node scripts/moltbook.mjs comments <post-id>
//   node scripts/moltbook.mjs comment <post-id> <file>   # body read from a FILE
//   node scripts/moltbook.mjs post <submolt> <title-file> <body-file>
//   node scripts/moltbook.mjs verify <verification-code> <answer>
//   node scripts/moltbook.mjs pin <post-id>
//
// Bodies are read from files, never from argv: an argv body lands in the shell
// history and the process table, and a long post would be unreadable there anyway.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_ORIGIN = 'https://www.moltbook.com';
const API_BASE = `${API_ORIGIN}/api/v1`;
const CRED_PATH = resolve(process.cwd(), '.env.moltbook-ambassador.json');
const UA = 'TheLatentReview-Ambassador/1.0';

function loadKey() {
  let raw;
  try {
    raw = readFileSync(CRED_PATH, 'utf8');
  } catch {
    fail(
      `cannot read the credential file at ${CRED_PATH}\n` +
        'It is gitignored by design. If it is missing, the Ambassador has no identity ' +
        'and nothing here can run.'
    );
  }
  let key;
  try {
    key = JSON.parse(raw)?.agent?.api_key;
  } catch {
    fail('the credential file is not valid JSON');
  }
  if (typeof key !== 'string' || key.length < 8) fail('no agent.api_key in the credential file');
  return key;
}

// Every byte this process emits goes through here. The key is the only secret in
// scope, so redacting it is sufficient and cheap.
let KEY = null;
function redact(s) {
  const text = typeof s === 'string' ? s : JSON.stringify(s, null, 1) ?? String(s);
  return KEY ? text.split(KEY).join('«REDACTED»') : text;
}
function out(s) {
  process.stdout.write(redact(s) + '\n');
}
function fail(msg) {
  process.stderr.write(redact(`moltbook: ${msg}`) + '\n');
  process.exit(1);
}

function assertOwnHost(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    fail(`not a URL: ${url}`);
  }
  if (u.origin !== API_ORIGIN) {
    // R-028(10). This is the check that makes the credential safe to hold here.
    fail(
      `refusing to send the Ambassador's credential to ${u.origin}. ` +
        `It goes to ${API_ORIGIN} and nowhere else.`
    );
  }
  return u;
}

async function call(method, path, body) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  assertOwnHost(url);
  const res = await fetch(url, {
    method,
    redirect: 'error', // the bare domain strips Authorization on redirect
    headers: {
      Authorization: `Bearer ${KEY}`,
      Accept: 'application/json',
      'User-Agent': UA,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch((e) => fail(`request failed: ${e.message}`));
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON response; keep text */
  }
  return { status: res.status, json, text };
}

function readBody(file, label) {
  const p = resolve(process.cwd(), file);
  let s;
  try {
    s = readFileSync(p, 'utf8');
  } catch {
    fail(`cannot read the ${label} file: ${p}`);
  }
  s = s.replace(/\n+$/, '');
  if (!s.trim()) fail(`the ${label} file is empty: ${p}`);
  return s;
}

// A created post/comment/submolt may come back with a challenge. Print it and stop
// — see the note at the top about why this script never answers one.
function reportCreation(kind, r) {
  const node = r.json?.[kind] ?? r.json?.post ?? r.json?.comment ?? {};
  out(`HTTP ${r.status}  ${r.json?.message ?? r.json?.error ?? ''}`);
  if (r.status !== 200 && r.status !== 201) {
    out(redact(r.text.slice(0, 800)));
    process.exit(2);
  }
  out(`id: ${node.id ?? '(none)'}`);
  const v = node.verification ?? r.json?.verification;
  if (!v) {
    out('verification: NOT REQUIRED — published immediately');
    if (node.id) out(`url: ${API_ORIGIN}/post/${node.id}`);
    return;
  }
  out('verification: REQUIRED — read the challenge and answer it yourself.');
  out(`  expires_at: ${v.expires_at}`);
  out(`  code:       ${v.verification_code}`);
  out(`  challenge:  ${v.challenge_text}`);
  out('');
  out(`Then: node scripts/moltbook.mjs verify ${v.verification_code} <answer>`);
  out('An expired challenge counts as a failure, and ten consecutive failures');
  out('suspend the account — so answer deliberately, and do not guess.');
}

const USAGE = `moltbook — the Ambassador's client. The API key is read from
.env.moltbook-ambassador.json, sent only to ${API_ORIGIN}, and never printed.

  whoami                              claim/auth status
  home                                dashboard: notifications and inbound activity
  get <path>                          any GET under /api/v1
  search "<query>" [limit]            semantic search over posts
  feed <submolt> [sort] [limit]       a submolt's posts (sort: new|hot|top|rising)
  comments <post-id>                  read a thread
  comment <post-id> <body-file>       reply (inbound only, per R-030)
  post <submolt> <title-file> <body-file>   place a post (ask-first under v2)
  verify <code> <answer>              answer a challenge you have read
  pin <post-id>                       pin in a submolt the journal owns
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help') {
    out(USAGE);
    return;
  }
  KEY = loadKey();

  switch (cmd) {
    case 'whoami': {
      const r = await call('GET', '/agents/status');
      out(`HTTP ${r.status}`);
      out(r.json ?? r.text);
      return;
    }
    case 'home': {
      const r = await call('GET', '/home');
      out(`HTTP ${r.status}`);
      out(r.json?.your_account ?? {});
      out('--- inbound activity ---');
      for (const a of r.json?.activity_on_your_posts ?? []) {
        out(
          `m/${a.submolt_name} | ${a.post_title} | new=${a.new_notification_count} | ` +
            `${a.preview} | ${JSON.stringify(a.latest_commenters ?? [])}`
        );
      }
      return;
    }
    case 'get': {
      if (!rest[0]) fail('get needs a path');
      const r = await call('GET', rest[0]);
      out(`HTTP ${r.status}`);
      out(r.json ?? r.text);
      return;
    }
    case 'search': {
      if (!rest[0]) fail('search needs a query');
      const limit = rest[1] ?? '25';
      const q = new URLSearchParams({ q: rest[0], type: 'posts', limit });
      const r = await call('GET', `/search?${q}`);
      out(`HTTP ${r.status}  results=${r.json?.results?.length ?? 0}`);
      for (const x of r.json?.results ?? []) {
        out(
          `${(x.relevance ?? 0).toFixed(3)}  m/${x.submolt?.name ?? '?'}  ` +
            `[${x.author?.name ?? '?'}]  ${x.title ?? ''}  (${x.post_id})`
        );
      }
      return;
    }
    case 'feed': {
      if (!rest[0]) fail('feed needs a submolt name');
      const sort = rest[1] ?? 'new';
      const limit = rest[2] ?? '15';
      const r = await call('GET', `/submolts/${rest[0]}/feed?sort=${sort}&limit=${limit}`);
      out(`HTTP ${r.status}  posts=${r.json?.posts?.length ?? 0}`);
      for (const p of r.json?.posts ?? []) {
        out(`[${p.author?.name ?? '?'}] ${p.title ?? ''}  (${p.id})  score=${p.score ?? 0} comments=${p.comment_count ?? 0}`);
      }
      return;
    }
    case 'comments': {
      if (!rest[0]) fail('comments needs a post id');
      const r = await call('GET', `/posts/${rest[0]}/comments?sort=new&limit=50`);
      out(`HTTP ${r.status}  count=${r.json?.count ?? 0}`);
      for (const c of r.json?.comments ?? []) {
        out(`--- [${c.author?.name ?? '?'}] ${c.created_at ?? ''}`);
        out(c.content ?? '');
      }
      return;
    }
    case 'comment': {
      const [postId, file] = rest;
      if (!postId || !file) fail('comment needs <post-id> <body-file>');
      const content = readBody(file, 'body');
      const r = await call('POST', `/posts/${postId}/comments`, { content });
      reportCreation('comment', r);
      return;
    }
    case 'post': {
      const [submolt, titleFile, bodyFile] = rest;
      if (!submolt || !titleFile || !bodyFile) fail('post needs <submolt> <title-file> <body-file>');
      const title = readBody(titleFile, 'title').split('\n')[0];
      const content = readBody(bodyFile, 'body');
      if (title.length > 300) fail(`title is ${title.length} chars; the limit is 300`);
      if (content.length > 40000) fail(`body is ${content.length} chars; the limit is 40000`);
      const r = await call('POST', '/posts', { submolt_name: submolt, title, content });
      reportCreation('post', r);
      return;
    }
    case 'verify': {
      const [code, answer] = rest;
      if (!code || !answer) fail('verify needs <verification-code> <answer>');
      const r = await call('POST', '/verify', { verification_code: code, answer: String(answer) });
      out(`HTTP ${r.status}  ${r.json?.message ?? r.json?.error ?? ''}`);
      if (r.json?.hint) out(`hint: ${r.json.hint}`);
      if (!r.json?.success) process.exit(2);
      return;
    }
    case 'pin': {
      if (!rest[0]) fail('pin needs a post id');
      const r = await call('POST', `/posts/${rest[0]}/pin`);
      out(`HTTP ${r.status}  ${r.json?.message ?? r.json?.error ?? ''}`);
      return;
    }
    default:
      fail(`unknown command: ${cmd}\n\n${USAGE}`);
  }
}

main().catch((e) => fail(e?.message ?? String(e)));
