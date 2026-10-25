import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUBMIT_ENDPOINT } from '../src/lib/agent-contract.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('contract requires involvement_tier and lists exactly the TIERS codes', () => {
  const schema = SUBMIT_ENDPOINT.request_schema;
  assert.ok(schema.required.includes('involvement_tier'));
  const siteCodes = [...read('src/lib/site.ts').matchAll(/\{\s*code: '([a-z-]+)',\s*label:/g)].map((m) => m[1]);
  assert.deepEqual([...schema.properties.involvement_tier.enum].sort(), [...new Set(siteCodes)].sort());
});

test('agent-submit refuses a missing tier by name', () => {
  const src = read('netlify/functions/agent-submit.mts');
  assert.match(src, /return json\(refusalInvolvementTier\(\), 400\)/);
});

test('email intake holds an undeclared tier out of new', () => {
  const src = read('netlify/functions/email-inbound.mts');
  assert.match(src, /tierRefused \? \{ status: 'under_review' \}/);
});
