import type { Config } from '@netlify/functions';

export const config: Config = { path: '/api/csp-report' };

// The CSP violation sink. The policy has been Report-Only since PR #34 with
// nowhere to report to, which made it inert — browsers evaluated it, logged to
// each visitor's own console, and sent nothing anywhere (security review C1).
// This is the collector that turns Report-Only into observation.
//
// IT WRITES TO THE FUNCTION LOG AND NOWHERE ELSE. No table, no email, no
// Supabase client. A violation report is telemetry the editors read during an
// observation window and then stop needing — persisting it would mean a table,
// an RLS policy, a retention question and a new store of visitor-adjacent data,
// all to hold something whose entire purpose expires when the policy is
// enforced. Netlify's log retention is exactly the right lifetime for it.
//
// IT IS AN UNAUTHENTICATED PUBLIC POST ENDPOINT, WHICH IS WHAT THE REPORTING
// API REQUIRES, so it is built to be cheap to abuse and worth nothing to an
// abuser: it calls no model, touches no database, sends no mail, and returns
// the same empty 204 to everything. Flooding it costs the journal log lines.
// The body cap below bounds even that.

// Reports are a few hundred bytes; browsers batch a handful per POST. Anything
// past this is not a browser and is not read.
const MAX_BODY_BYTES = 16 * 1024;

// What a report may contribute to the log, and nothing else. A violation report
// carries attacker- or page-controlled strings (`blocked-uri`, `script-sample`),
// and this log is read by editors in a terminal: an unbounded field is a
// terminal-injection and log-flooding surface. Values are truncated hard and
// control characters are stripped rather than escaped, because nothing in a
// legitimate report needs them.
const FIELD_MAX = 300;
const clean = (value: unknown): string =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, FIELD_MAX)
    : '';

/**
 * Both report shapes, flattened to the same four fields.
 *
 * The legacy `report-uri` shape posts `{ "csp-report": {...} }` with hyphenated
 * keys; the Reporting API `report-to` shape posts an ARRAY of `{ type, body }`
 * with camelCase keys. Both are accepted because both are needed: Chromium
 * implements the Reporting API, and the other engines still only implement
 * report-uri, so a policy carrying just one directive observes only part of the
 * audience.
 */
const summarize = (report: Record<string, unknown>): string => {
  const legacy = (report['csp-report'] ?? {}) as Record<string, unknown>;
  const modern = (report.body ?? {}) as Record<string, unknown>;

  const directive = clean(
    modern.effectiveDirective ?? legacy['effective-directive'] ?? legacy['violated-directive']
  );
  const blocked = clean(modern.blockedURL ?? legacy['blocked-uri']);
  const document = clean(modern.documentURL ?? legacy['document-uri']);
  const sample = clean(modern.sample ?? legacy['script-sample']);

  return `csp-violation directive=${directive || '?'} blocked=${blocked || '?'} document=${document || '?'} sample=${sample || '-'}`;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 204 });

  // EVERY OUTCOME IS 204, INCLUDING FAILURE. A browser is not asking us a
  // question and has nothing to do with an error; a prober learns nothing from
  // a body we do not send. The report is the whole transaction.
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 204 });

    const parsed = JSON.parse(raw);
    const reports = Array.isArray(parsed) ? parsed : [parsed];

    for (const report of reports.slice(0, 20)) {
      if (report && typeof report === 'object') {
        console.log(summarize(report as Record<string, unknown>));
      }
    }
  } catch {
    // Malformed body: nothing to record and nothing to say.
  }

  return new Response(null, { status: 204 });
}
