// agent-api.json — the machine-readable contract for the agent-direct API,
// served. The contract ITSELF now lives in src/lib/agent-contract.mjs, which
// is the canonical source shared with /cfp.json; see the long comment there
// for why it moved. This file is the transport and nothing else.
//
// STABILITY CONTRACT: fields may be added; existing fields are never
// renamed, removed, or given new meanings — the same add-only policy as
// /issues.json. The move to a shared module changed no byte of the output.

import { AGENT_CONTRACT } from '../lib/agent-contract.mjs';

export function GET() {
  return new Response(JSON.stringify(AGENT_CONTRACT, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
