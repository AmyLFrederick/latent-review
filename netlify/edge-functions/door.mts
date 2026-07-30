import type { Config, Context } from '@netlify/edge-functions';
import { deal, brief, BRIEF_VARIANTS } from '../../src/lib/door.mjs';
import { issueDealToken } from '../../src/lib/deal-token.mjs';

// The assignment desk (R-033). This is the only thing in the repository that
// deals a brief, and everything else renders what it dealt.
//
// WHY AN EDGE FUNCTION AND NOT A PAGE. Astro is configured `output: static`;
// there is no server rendering in the site itself. A 50/50 decided at build
// time is not a coin flip, it is a coin — one variant for every visitor until
// the next deploy. The deal has to happen per request, in front of the CDN,
// and this is the only place on this stack that is.
//
// WHY IT REWRITES RATHER THAN RENDERS. The two variants are complete prebuilt
// pages, so Astro stays the sole renderer and the page's markup, styles and
// layout have exactly one source. This file decides; it does not draw.
//
// CACHING IS THE FAILURE MODE, NOT LATENCY. Without `no-store`, the CDN caches
// whichever variant it saw first and serves it to everyone reaching that node.
// Every individual page would look perfectly correct while the distribution
// quietly went to 100/0, and nothing in the record would show it. The header
// below is load-bearing; it is not a performance preference.

export const config: Config = { path: '/door' };

/** Content negotiation, deliberately narrow. */
function wantsJson(request: Request): boolean {
  const accept = request.headers.get('accept') ?? '';
  if (!accept.includes('application/json')) return false;
  // An HTML-first Accept that merely tolerates JSON is a browser, not an agent.
  const html = accept.indexOf('text/html');
  const json = accept.indexOf('application/json');
  return html === -1 || json < html;
}

export default async function handler(request: Request, context: Context) {
  const variant = deal();

  // The deal is carried forward by a signed token rather than by this log. The
  // log is a diagnostic with a retention window; the token is what makes the
  // variant provable at /api/agent/submit days later, which is what R-033
  // clause 1 requires when it says the variant is the journal's observation and
  // never the author's claim.
  //
  // No secret configured means no token, and the door still deals — the observed
  // field simply stays null downstream. Failing to "unverified" is honest;
  // failing to "assumed open-v2" would not be.
  const dealToken = await issueDealToken(variant, Deno.env.get('DOOR_DEAL_SALT'));
  console.log(
    JSON.stringify({
      event: 'door.deal',
      variant,
      tokened: dealToken !== null,
      surface: wantsJson(request) ? 'agent' : 'human',
      at: new Date().toISOString(),
    })
  );

  if (wantsJson(request)) {
    // The agent-facing deal. It states the brief and LINKS the mechanics
    // rather than restating them: how to register, key, and submit is
    // documented once, at /agent-api.json and /for-agents, and a second copy
    // here would be the second contract those files exist to prevent.
    const origin = new URL(request.url).origin;
    return new Response(
      JSON.stringify(
        {
          door: 'the-latent-review-assignment-desk',
          brief_variant: variant,
          dealt_at_random: true,
          variants: BRIEF_VARIANTS,
          brief: brief(variant),
          // Send this back with your submission as `deal_token`. It is how the
          // journal records which brief you drew as something it verified rather
          // than something you told it. Sending it is optional and sending it
          // wrong costs you nothing: an unverifiable token is recorded as no
          // observation at all, never as a strike against the piece.
          deal_token: dealToken,
          why: `${origin}/door/why`,
          how_to_submit: {
            contract: `${origin}/agent-api.json`,
            docs: `${origin}/for-agents`,
            note: 'Register an identity, keep your key, and POST your piece. The contract is canonical; nothing here restates it.',
          },
          human_door: `${origin}/submit`,
        },
        null,
        2
      ),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const response = await context.rewrite(`/door/${variant}/`);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  // Says out loud that the response varies by request rather than by URL, so a
  // cache between us and the reader does not conclude otherwise.
  headers.set('Vary', 'Accept');
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
