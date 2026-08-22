import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Checks for /api/subscribe, in two groups.
//
// S1–S7 are the global-ceiling checks, added 2026-07-31 after the cost-exposure
// audit found the one publicly reachable path that could cause an unbounded
// number of billable API calls (docs/SCRATCH-COST-EXPOSURE-2026-07-31.md).
// What they assert is not "the limiter works" — ratelimit.mts is exercised
// elsewhere — but the four things that make the ceiling a ceiling: that it
// exists at the ruled numbers, that tripping it sends NO email, that a request
// already refused by a narrower limit does not spend global budget, and that a
// broken limiter fails closed instead of open.
//
// S8–S13 are new on 2026-08-22, when a signup began subscribing immediately.
// Removing the confirmation step removed a safety property along with a step —
// nothing now stands between a POST and a live subscription — so the things
// that replaced it are pinned here: the row is written confirmed with a consent
// record, a welcome email goes out, that email carries the way out in the body
// and not only in the footer, and an address already on the list is neither
// rewritten nor re-mailed.

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
//
// `writes` records every POST/PATCH body sent to /rest/v1/subscribers, which is
// how S8–S10 read what was actually written rather than inferring it from a
// 200.
const stub = {
  rateCounts: [],
  buckets: [],
  subscriber: null,
  emails: [],
  writes: [],
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
      stub.writes.push({ method, body: JSON.parse(body || '{}') });
      // A bare object, not an array: both write paths end in `.single()`, which
      // asks PostgREST for `application/vnd.pgrst.object+json` and does no
      // client-side unwrapping — unlike `.maybeSingle()` on the read above,
      // which takes data[0] itself and is why that branch can answer with an
      // array. A stub that answered both the same way would hand the handler an
      // undefined token and still return 200.
      return new Response(JSON.stringify({ unsubscribe_token: 'utok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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
  stub.writes = [];
  stub.rateFails = false;
});

const ctx = { ip: '203.0.113.7' };

const request = (email = 'reader@example.com', extra = {}) =>
  new Request('http://site.test/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, ...extra }),
  });

// A signup that clears every limiter. Four zeroes, one per bucket.
const clear = () => {
  stub.rateCounts = [0, 0, 0, 0];
};

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

// --- S6/S7: one reply for every non-error outcome --------------------------

test('S6: an already-subscribed address is not re-mailed and not rewritten', async () => {
  clear();
  stub.subscriber = { id: 'sub_1', status: 'confirmed', unsubscribe_token: 'utok' };
  const res = await subscribe(request(), ctx);

  assert.equal(res.status, 200);
  assert.deepEqual(stub.emails, [], 'confirmed addresses are not re-mailed');
  // Load-bearing since 2026-08-22: signing up twice must not refresh the
  // consent record. What the row says is when this reader actually consented,
  // and a second POST by anyone who knows the address would otherwise move that
  // date forward — quietly turning the evidence into a record of the last time
  // a form was submitted.
  assert.deepEqual(stub.writes, [], 'a second signup must not touch the row');
});

test('S7: a new address and an already-subscribed one get byte-identical replies', async () => {
  // The property, unchanged through two copy rewrites: this endpoint must not
  // be usable to test whether an address is on the list. A future copy edit
  // could break it by writing a friendlier sentence for the reader whose
  // address is new.
  clear();
  const fresh = await subscribe(request(), ctx);

  clear();
  stub.subscriber = { id: 'sub_1', status: 'confirmed', unsubscribe_token: 'utok' };
  const confirmed = await subscribe(request(), ctx);

  assert.equal(fresh.status, confirmed.status);
  assert.equal(await fresh.text(), await confirmed.text());
});

// --- S8: a signup subscribes, in one step ---------------------------------

test('S8: a new signup is written confirmed, with a consent record', async () => {
  clear();
  const res = await subscribe(request('new@example.com', { source: 'web-form' }), ctx);

  assert.equal(res.status, 200);
  assert.equal(stub.writes.length, 1);
  const [write] = stub.writes;
  assert.equal(write.method, 'POST');
  assert.equal(write.body.email, 'new@example.com');
  assert.equal(write.body.status, 'confirmed', 'nobody is left pending');
  assert.equal(write.body.consent_source, 'web-form');
  assert.ok(write.body.consent_at, 'a consent record needs its moment');
  assert.equal(write.body.confirmed_at, write.body.consent_at);
});

test('S9: a source we did not issue is recorded as api, never echoed back', async () => {
  // The consent record is evidence. Free text supplied by the caller is not.
  clear();
  await subscribe(request('new@example.com', { source: 'referred-by-a-friend' }), ctx);
  assert.equal(stub.writes[0].body.consent_source, 'api');

  clear();
  stub.writes = [];
  await subscribe(request('new@example.com'), ctx);
  assert.equal(stub.writes[0].body.consent_source, 'api', 'no source at all is still api');

  clear();
  stub.writes = [];
  await subscribe(request('new@example.com', { source: 'web-form-footer' }), ctx);
  assert.equal(stub.writes[0].body.consent_source, 'web-form-footer', 'our own doors survive');
});

// --- S10: the welcome email, and the way out ------------------------------

test('S10: a signup gets exactly one welcome email', async () => {
  clear();
  await subscribe(request('new@example.com'), ctx);

  assert.equal(stub.emails.length, 1);
  const [mail] = stub.emails;
  assert.deepEqual(mail.to, ['new@example.com']);
  assert.equal(mail.subject, 'Thank you for subscribing');
});

test('S11: the way out is in the message, once, with the sentence that explains it', async () => {
  // THE REASON THIS IS PINNED. Under confirmed opt-in, someone whose address
  // was typed in by mistake could ignore the mail and stay off the list; doing
  // nothing was a complete remedy. It is not any more — they are subscribed
  // before the email arrives — so the link out and the sentence naming their
  // case both have to be present and next to each other.
  //
  // THEY SIT IN THE FOOT, not in a paragraph (editors, 2026-08-22): somebody
  // who wants out needs the link, not prose about the link. What that costs is
  // prominence, and what it must not cost is presence — hence this test, and
  // hence "exactly once", because two unsubscribe links in one message make a
  // reader choose between them.
  clear();
  await subscribe(request('new@example.com'), ctx);

  const [mail] = stub.emails;
  const unsub = 'https://thelatentreview.com/api/unsubscribe?token=utok';
  assert.equal(mail.headers['List-Unsubscribe'], `<${unsub}>`);

  for (const [name, part] of [
    ['text', mail.text],
    ['html', mail.html],
  ]) {
    assert.equal(
      part.split(unsub).length - 1,
      1,
      `the ${name} message must carry the unsubscribe link exactly once`
    );
    // The apostrophe is a character in the text part and an entity in the HTML
    // one, so match around it rather than pinning the spelling.
    assert.match(part, /ask for this/, `the ${name} message must name the mistyped case`);
    // Adjacent, not merely both present: the sentence follows the link it
    // refers to ("that link"), and would be a dangling reference apart from it.
    assert.ok(
      part.indexOf('ask for this') > part.indexOf(unsub),
      `in ${name}, the sentence must sit beside the link it points at`
    );
  }
});

test('S11b: every email carries the terms; only this one carries the mistyped line', async () => {
  // Two properties of the shared foot, in one place because they pull opposite
  // ways. "Opt-in, no tracking" is a published promise and has no opt-out —
  // asserted on a footer built with no options at all, and again on the welcome
  // email below, so no caller can quietly become the exception. The mistyped
  // line is the reverse: it must NOT leak, because "if you didn't ask for this"
  // in issue seven, to somebody reading since issue one, would be the journal
  // apologising monthly for the subscription it was asked for.
  const { emailFooter } = await import('../netlify/lib/email.mts');
  const plain = emailFooter('https://example.test/u');

  assert.match(plain.text, /Opt-in, no tracking\./, 'the promise is unconditional');
  assert.match(plain.html, /Opt-in, no tracking\./);
  assert.doesNotMatch(plain.text, /ask for this/, 'the welcome line does not leak');
  assert.doesNotMatch(plain.html, /ask for this/);

  clear();
  await subscribe(request('new@example.com'), ctx);
  const [mail] = stub.emails;
  assert.match(mail.text, /Opt-in, no tracking\./, 'and the welcome email is not an exception');
  assert.match(mail.html, /Opt-in, no tracking\./);
});

test('S12: nothing in the welcome email asks for a confirmation click', async () => {
  clear();
  await subscribe(request('new@example.com'), ctx);

  const [mail] = stub.emails;
  for (const part of [mail.text, mail.html, mail.subject]) {
    assert.doesNotMatch(part, /\/api\/confirm/, 'no confirmation link is minted any more');
    assert.doesNotMatch(part, /confirm/i, 'and nothing asks the reader to confirm');
  }
});

test('S12b: the welcome email is the editors’ letter, and says the four things it is for', async () => {
  // The copy is the editors' verbatim, and it carries commitments as well as
  // warmth. Pinned so that a later edit to the voice has to notice what it is
  // moving: the volume promise that bounds the dispatch, the invitation to
  // write, the ask to share, and the signature that says who is writing —
  // including that one of them is an AI, which is the whole premise of the
  // journal and not a disclosure to be tidied away.
  clear();
  await subscribe(request('new@example.com'), ctx);

  const [mail] = stub.emails;
  for (const [name, part] of [
    ['text', mail.text],
    ['html', mail.html],
  ]) {
    assert.match(part, /Thank you for subscribing\./, `${name}: opens as a letter`);
    assert.match(part, /one email per issue/, `${name}: the volume promise survives`);
    assert.match(part, /between issues/, `${name}: and it bounds the dispatch`);
    assert.match(part, /Letters section/, `${name}: invites a reply`);
    assert.match(part, /open to human and AI readers/, `${name}: from either kind of reader`);
    // An invitation with no address is not an invitation. The HTML anchors the
    // section name; the text has nowhere to hide a URL, so it carries one
    // inline.
    assert.match(part, /thelatentreview\.com\/letters\//, `${name}: and gives the door`);
    assert.match(part, /sharing it is the single most helpful thing/, `${name}: makes the ask`);
    assert.match(part, /The Editors/, `${name}: is signed`);
    assert.match(part, /Claude \(AI\) and Amy Louise Frederick \(Human\)/, `${name}: by both, named`);
    assert.match(part, /supporters\//, `${name}: carries the support link`);
  }
});

// --- S13: the two states that are not on the list --------------------------

test('S13: an unsubscribed address coming back is resubscribed with a fresh consent record', async () => {
  clear();
  stub.subscriber = { id: 'sub_1', status: 'unsubscribed', unsubscribe_token: 'utok' };
  const res = await subscribe(request('back@example.com', { source: 'web-form' }), ctx);

  assert.equal(res.status, 200);
  assert.equal(stub.writes.length, 1);
  assert.equal(stub.writes[0].method, 'PATCH');
  assert.equal(stub.writes[0].body.status, 'confirmed');
  assert.equal(stub.writes[0].body.consent_source, 'web-form');
  assert.ok(stub.writes[0].body.consent_at, 'coming back is a new consent, recorded as one');
  assert.equal(stub.emails.length, 1, 'and they are welcomed like anyone else');
});

test('S13b: a legacy pending row is subscribed rather than left stranded', async () => {
  // The 2026-08-22 migration should leave none of these behind. This asserts
  // what happens if one turns up anyway — from a row created between the deploy
  // and the migration, or a hand edit — because the failure mode being guarded
  // is a reader who asked and silently never got on.
  clear();
  stub.subscriber = { id: 'sub_1', status: 'pending', unsubscribe_token: 'utok' };
  const res = await subscribe(request('stranded@example.com'), ctx);

  assert.equal(res.status, 200);
  assert.equal(stub.writes[0].body.status, 'confirmed');
  assert.equal(stub.emails.length, 1);
});
