import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Global-ceiling checks for /api/subscribe, added 2026-07-31 after the
// cost-exposure audit found the one publicly reachable path that could cause an
// unbounded number of billable API calls (docs/SCRATCH-COST-EXPOSURE-2026-07-31.md).
//
// What these assert is not "the limiter works" — ratelimit.mts is exercised
// elsewhere — but the four things that make the ceiling a ceiling: that it
// exists at the ruled numbers, that tripping it sends NO email, that a request
// already refused by a narrower limit does not spend global budget, and that a
// broken limiter fails closed instead of open. Numbering: S1–S6.

process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_only';
process.env.RATE_LIMIT_SALT = 'test-network-salt';
process.env.RESEND_API_KEY = 're_test_only';

const subscribe = (await import('../netlify/functions/subscribe.mts')).default;

// The ruled numbers. Duplicated here deliberately: the module does not export
// them, and a test that read the value from the module under test could not
// notice the value changing.
const GLOBAL_HOURLY_MAX = 500;
const GLOBAL_DAILY_MAX = 3000;

// --- PostgREST + Resend stub ----------------------------------------------
// rateCounts is a queue: one entry consumed per rate-limit COUNT query, in the
// order the handler asks. That ordering is what lets S4/S5 prove which buckets
// were consulted and which were not.
const stub = {
  rateCounts: [],
  buckets: [],
  subscriber: null,
  emails: [],
  rateFails: false,
};

globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const method = (input instanceof Request ? input.method : init.method) ?? 'GET';
  const body = input instanceof Request ? await input.text() : (init.body ?? '');

  if (url.includes('api.resend.com/emails')) {
    stub.emails.push(JSON.parse(body || '{}'));
    return new Response(JSON.stringify({ id: 'email_test' }), { status: 200 });
  }

  if (url.includes('/rest/v1/rate_limit_events')) {
    if (stub.rateFails) return new Response('{"message":"boom"}', { status: 500 });
    if (method === 'GET') {
      const bucket = decodeURIComponent(url).match(/bucket=eq\.([a-z-]+)/)?.[1] ?? '?';
      stub.buckets.push(bucket);
      const count = stub.rateCounts.length > 0 ? stub.rateCounts.shift() : 0;
      return new Response('[]', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Content-Range': `*/${count}` },
      });
    }
    if (method === 'POST') return new Response('', { status: 201 });
    if (method === 'DELETE') return new Response('', { status: 204 });
  }

  if (url.includes('/rest/v1/subscribers')) {
    if (method === 'GET') {
      return new Response(JSON.stringify(stub.subscriber ? [stub.subscriber] : []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (method === 'POST' || method === 'PATCH') {
      return new Response(
        JSON.stringify([{ confirm_token: 'ctok', unsubscribe_token: 'utok' }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  throw new Error(`stub fetch: unexpected ${method} ${url}`);
};

const origError = console.error;
console.error = () => {};
process.on('exit', () => {
  console.error = origError;
});

beforeEach(() => {
  stub.rateCounts = [];
  stub.buckets = [];
  stub.subscriber = null;
  stub.emails = [];
  stub.rateFails = false;
});

const ctx = { ip: '203.0.113.7' };

const request = (email = 'reader@example.com') =>
  new Request('http://site.test/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });

// --- S1: the ceiling exists, at the ruled hourly number --------------------

test('S1: the global hourly ceiling refuses at 500 and sends no email', async () => {
  // ip under, email under, global hourly AT the ceiling.
  stub.rateCounts = [0, 0, GLOBAL_HOURLY_MAX];
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 429);
  assert.deepEqual(stub.emails, [], 'a refused signup must cost no Resend call');
  assert.deepEqual(stub.buckets, ['subscribe-ip', 'subscribe-email', 'subscribe-global']);
});

test('S1b: one below the hourly ceiling still passes — a breaker, not a throttle', async () => {
  stub.rateCounts = [0, 0, GLOBAL_HOURLY_MAX - 1, 0];
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 200);
  assert.equal(stub.emails.length, 1);
});

// --- S2: the daily ceiling, at the ruled number ----------------------------

test('S2: the global daily ceiling refuses at 3,000 and sends no email', async () => {
  // Everything under except the daily bucket, so this proves the daily check is
  // reached and is not shadowed by the hourly one.
  stub.rateCounts = [0, 0, 0, GLOBAL_DAILY_MAX];
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 429);
  assert.deepEqual(stub.emails, []);
  assert.deepEqual(stub.buckets, [
    'subscribe-ip',
    'subscribe-email',
    'subscribe-global',
    'subscribe-global-daily',
  ]);
});

// --- S3: the refusal is the truthful, non-leaking one ----------------------

test('S3: a ceiling refusal is the same 429 body as any other rate refusal', async () => {
  stub.rateCounts = [0, 0, GLOBAL_HOURLY_MAX];
  const globalRes = await subscribe(request(), ctx);

  stub.rateCounts = [5]; // per-IP already at its limit
  const ipRes = await subscribe(request(), ctx);

  assert.equal(globalRes.status, ipRes.status);
  assert.equal(await globalRes.text(), await ipRes.text());
  // No oracle: a stranger cannot tell "you are limited" from "the journal is".
});

// --- S4: a narrower refusal must not spend the global budget ---------------

test('S4: a per-IP refusal never reaches the global buckets', async () => {
  stub.rateCounts = [5];
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 429);
  assert.deepEqual(stub.buckets, ['subscribe-ip'], 'global budget must not be consumed');
});

test('S4b: a per-address refusal never reaches the global buckets', async () => {
  stub.rateCounts = [0, 2];
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 429);
  assert.deepEqual(stub.buckets, ['subscribe-ip', 'subscribe-email']);
});

// --- S5: fail closed ------------------------------------------------------

test('S5: a broken limiter refuses rather than sending unmetered', async () => {
  stub.rateFails = true;
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 503);
  assert.deepEqual(stub.emails, [], 'an unmeasurable request is never sent');
});

// --- S6: the ceilings do not break the ordinary path ----------------------

test('S6: an already-confirmed address still sends nothing, and costs no budget beyond the checks', async () => {
  stub.rateCounts = [0, 0, 0, 0];
  stub.subscriber = {
    id: 'sub_1',
    status: 'confirmed',
    confirm_token: 'ctok',
    unsubscribe_token: 'utok',
  };
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 200);
  assert.deepEqual(stub.emails, [], 'confirmed addresses are not re-mailed');
});
