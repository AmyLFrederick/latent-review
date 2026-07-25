import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Slice (b) Node-level checks (N1–N5 of the reviewed design): key shape and
// entropy, hash determinism and salt domains, the never-log-the-key
// invariant, and the endpoint front doors — driven end-to-end against a
// stubbed PostgREST (global fetch), so the byte-identical-refusal properties
// are observed, not assumed.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The endpoints verify env at import time; give them a coherent fake world.
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_only';
process.env.RATE_LIMIT_SALT = 'test-network-salt';
process.env.AGENT_KEY_SALT = 'test-key-salt';

const { generateAgentKey, hashApiKey, AGENT_KEY_PREFIX } = await import(
  '../netlify/lib/agentkeys.mts'
);
const { identifierHash } = await import('../netlify/lib/ratelimit.mts');
const register = (await import('../netlify/functions/agent-register.mts')).default;
const rotate = (await import('../netlify/functions/agent-keys-rotate.mts')).default;

const KEY_RE = /^lrk_[A-Za-z0-9_-]{43}$/;

// --- PostgREST stub: routes supabase-js traffic by URL and method. Each test
// --- configures counts/handlers; every request and every console line is
// --- recorded so tests can assert what was (and was not) said.
const stub = {
  rateCounts: [], // consumed per rate-limit SELECT, in call order
  rpc: null, // (name, params) => Response-ish
  requests: [],
};

globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const method = (input instanceof Request ? input.method : init.method) ?? 'GET';
  const body = input instanceof Request ? await input.text() : (init.body ?? '');
  stub.requests.push({ url, method, body });

  if (url.includes('/rest/v1/rate_limit_events')) {
    if (method === 'GET') {
      const count = stub.rateCounts.length > 0 ? stub.rateCounts.shift() : 0;
      return new Response('[]', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Content-Range': `*/${count}` },
      });
    }
    if (method === 'POST') return new Response('', { status: 201 });
    if (method === 'DELETE') return new Response('', { status: 204 });
  }

  const rpcMatch = url.match(/\/rest\/v1\/rpc\/([a-z_]+)/);
  if (rpcMatch && method === 'POST') {
    return stub.rpc(rpcMatch[1], JSON.parse(body || '{}'));
  }

  throw new Error(`stub fetch: unexpected ${method} ${url}`);
};

const logged = [];
const origLog = console.log;
const origError = console.error;
console.log = (...args) => logged.push(args.map(String).join(' '));
console.error = (...args) => logged.push(args.map(String).join(' '));
process.on('exit', () => {
  console.log = origLog;
  console.error = origError;
});

beforeEach(() => {
  stub.rateCounts = [];
  stub.rpc = null;
  stub.requests = [];
  logged.length = 0;
  process.env.RATE_LIMIT_SALT = 'test-network-salt';
  process.env.AGENT_KEY_SALT = 'test-key-salt';
});

const ok = (json, status = 200) =>
  new Response(JSON.stringify(json), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const pgError = (code, message, status = 400) =>
  ok({ code, message, details: null, hint: null }, status);

const post = (path, headers = {}) =>
  new Request(`http://site.test${path}`, { method: 'POST', headers });
const ctx = { ip: '203.0.113.7' };

// --- N1: key shape and entropy -------------------------------------------

test('N1: generated keys are lrk_ + 43 url-safe chars carrying 256 bits, and do not repeat', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const key = generateAgentKey();
    assert.match(key, KEY_RE);
    const decoded = Buffer.from(key.slice(AGENT_KEY_PREFIX.length), 'base64url');
    assert.equal(decoded.length, 32);
    seen.add(key);
  }
  assert.equal(seen.size, 200);
});

// --- N2: hash determinism + the drift guard ------------------------------

test('N2: hashApiKey is deterministic, salt-dependent, and the single shared implementation', () => {
  const raw = generateAgentKey();
  const expected = createHash('sha256').update(`test-key-salt:${raw}`).digest('hex');
  assert.equal(hashApiKey(raw), expected);
  assert.equal(hashApiKey(raw), hashApiKey(raw));

  process.env.AGENT_KEY_SALT = 'a-different-salt';
  assert.notEqual(hashApiKey(raw), expected);

  // The drift guard is structural: every endpoint that touches a key must
  // hash through this one function. Both slice-(b) endpoints import it; the
  // slice-(c) submit endpoint must too (assert here again when it exists).
  for (const file of ['agent-register.mts', 'agent-keys-rotate.mts']) {
    const src = readFileSync(join(root, 'netlify/functions', file), 'utf8');
    assert.match(src, /import \{[^}]*hashApiKey[^}]*\} from '\.\.\/lib\/agentkeys\.mts'/);
    assert.doesNotMatch(src, /createHash/);
  }
});

test('N2b: a missing AGENT_KEY_SALT fails loud, without echoing the key', () => {
  delete process.env.AGENT_KEY_SALT;
  const raw = generateAgentKey();
  assert.throws(() => hashApiKey(raw), (err) => !String(err.message).includes(raw));
});

// --- N4 (posture B): the register front door -----------------------------

test('N4: GET is refused 405 — GET never mutates', async () => {
  for (const handler of [register, rotate]) {
    const res = await handler(new Request('http://site.test/x', { method: 'GET' }), ctx);
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
  }
});

test('N4: the L1 refusal and the RPC-LR429 refusal are byte-identical (no threshold oracle)', async () => {
  // Path 1: per-IP burst already full — refused before any RPC call.
  stub.rateCounts = [3];
  stub.rpc = () => {
    throw new Error('RPC must not be reached when L1 refuses');
  };
  const l1 = await register(post('/api/agent/register'), ctx);
  const l1Body = await l1.text();
  assert.equal(l1.status, 429);

  // Path 2: rate limit clear, but the RPC's global backstop is full (LR429).
  stub.rateCounts = [0, 0];
  stub.rpc = () => pgError('LR429', 'agent registration not accepted');
  const l2 = await register(post('/api/agent/register'), ctx);
  const l2Body = await l2.text();
  assert.equal(l2.status, 429);

  assert.equal(l1Body, l2Body);
  assert.doesNotMatch(l1Body, /burst|daily|monthly|cap|limit|quota/i);
});

test('N4b: successful registration returns the key once, with no-store, and never logs it', async () => {
  const identity = '9f0d6df2-0000-4000-8000-000000000001';
  const keyId = '9f0d6df2-0000-4000-8000-000000000002';
  let hashedSeen;
  stub.rateCounts = [0, 0];
  stub.rpc = (name, params) => {
    assert.equal(name, 'register_agent_identity');
    hashedSeen = params.p_key_hash;
    // The RPC receives hashes only, in the right salt domains.
    assert.match(params.p_key_hash, /^[0-9a-f]{64}$/);
    assert.equal(params.p_ip_hash, identifierHash('203.0.113.7'));
    return ok([{ identity_id: identity, key_id: keyId }]);
  };

  const res = await register(post('/api/agent/register'), ctx);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = JSON.parse(await res.text());
  assert.match(body.api_key, KEY_RE);
  assert.equal(hashApiKey(body.api_key), hashedSeen);
  assert.equal(body.identity_id, identity);
  assert.equal(body.key_id, keyId);

  // N3 (dynamic half): the raw key appears nowhere in logs, and no request
  // to the backend ever carried it.
  const everywhere = [...logged, ...stub.requests.map((r) => `${r.url} ${r.body}`)].join('\n');
  assert.ok(!everywhere.includes(body.api_key));
  assert.ok(everywhere.includes(identity)); // ids ARE logged — the receipt
});

test('N4c: backend unreachable → generic 503, no key material in the response', async () => {
  stub.rateCounts = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('connection refused');
  };
  try {
    const res = await register(post('/api/agent/register'), ctx);
    assert.equal(res.status, 503);
    assert.doesNotMatch(await res.text(), /lrk_/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// --- N4 (rotation): neutral auth ------------------------------------------

test('N4d: rotation auth refusals are neutral and byte-identical (missing header vs LR401)', async () => {
  const noHeader = await rotate(post('/api/agent/keys/rotate'), ctx);
  assert.equal(noHeader.status, 401);
  const noHeaderBody = await noHeader.text();

  stub.rateCounts = [0, 0];
  stub.rpc = () => pgError('LR401', 'agent key rotation not accepted');
  const badKey = await rotate(
    post('/api/agent/keys/rotate', { Authorization: `Bearer ${generateAgentKey()}` }),
    ctx
  );
  assert.equal(badKey.status, 401);
  assert.equal(await badKey.text(), noHeaderBody);
  assert.doesNotMatch(noHeaderBody, /revoked|banned|unknown|invalid/i);
});

test('N4e: successful rotation presents old-key hash, returns a fresh key, logs neither key', async () => {
  const presented = generateAgentKey();
  stub.rateCounts = [0, 0];
  stub.rpc = (name, params) => {
    assert.equal(name, 'issue_agent_key');
    assert.equal(params.p_current_key_hash, hashApiKey(presented));
    assert.match(params.p_new_key_hash, /^[0-9a-f]{64}$/);
    assert.notEqual(params.p_new_key_hash, params.p_current_key_hash);
    return ok([
      {
        identity_id: '9f0d6df2-0000-4000-8000-000000000001',
        key_id: '9f0d6df2-0000-4000-8000-000000000003',
      },
    ]);
  };

  const res = await rotate(
    post('/api/agent/keys/rotate', { Authorization: `Bearer ${presented}` }),
    ctx
  );
  assert.equal(res.status, 201);
  const body = JSON.parse(await res.text());
  assert.match(body.api_key, KEY_RE);
  assert.notEqual(body.api_key, presented);

  const loggedText = logged.join('\n');
  assert.ok(!loggedText.includes(presented));
  assert.ok(!loggedText.includes(body.api_key));
});

// --- N3 (static half): no console call references a raw-key variable ------

test('N3: endpoint sources never pass a raw key to console.* or interpolate one into an error', () => {
  for (const file of ['agent-register.mts', 'agent-keys-rotate.mts']) {
    const src = readFileSync(join(root, 'netlify/functions', file), 'utf8');
    for (const line of src.split('\n')) {
      if (line.includes('console.')) {
        assert.doesNotMatch(line, /rawKey|presented|api_key/, `${file}: ${line.trim()}`);
      }
    }
  }
});

// --- N5: salt domain separation -------------------------------------------

test('N5: keys hash under AGENT_KEY_SALT only, identifiers under RATE_LIMIT_SALT only', () => {
  const raw = generateAgentKey();
  const keyHashBefore = hashApiKey(raw);
  const ipHashBefore = identifierHash('203.0.113.7');

  // Rotating the network salt must never touch key hashes…
  process.env.RATE_LIMIT_SALT = 'rotated-network-salt';
  assert.equal(hashApiKey(raw), keyHashBefore);
  assert.notEqual(identifierHash('203.0.113.7'), ipHashBefore);

  // …and rotating the key salt must never touch network hashes.
  process.env.RATE_LIMIT_SALT = 'test-network-salt';
  process.env.AGENT_KEY_SALT = 'rotated-key-salt';
  assert.notEqual(hashApiKey(raw), keyHashBefore);
  assert.equal(identifierHash('203.0.113.7'), ipHashBefore);

  // And the two functions never produce each other's value for the same input.
  process.env.AGENT_KEY_SALT = 'test-key-salt';
  assert.notEqual(hashApiKey(raw), identifierHash(raw));
});
