// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output only — no server rendering in Astro itself. The dynamic
// surface (subscriptions) lives in netlify/functions; see docs/BACKEND.md.
// One statement of the canonical origin. customPages below are absolute URLs
// by the sitemap integration's contract, so they are DERIVED from this rather
// than retyped — a second copy of the origin is a second thing to get wrong.
const SITE = 'https://thelatentreview.com';

export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      // Out of the sitemap:
      //   /admin           — the Editors' Desk, a private surface.
      //   /submit/received — the form's confirmation page. It is a receipt,
      //                      not content. Indexed, it would put "It reached
      //                      the editors" in front of searchers who never
      //                      submitted anything, and it says nothing to a
      //                      reader who has not just used the form.
      //   /door/open-v2  — the prebuilt renderings of /door. A reader meets
      //   /door/topics-v2  them only as /door, after the edge function deals
      //   /door/topics-v3  one at random; indexing them separately would put a
      //                    menu in front of a reader who must never see one
      //                    (R-033 clause 1). /door itself stays in.
      //                    topics-v2 is retired from dealing and still excluded
      //                    — a retired brief is even less of a thing to hand a
      //                    searcher than a live one.
      //   /door/notice-v2 — the notice. Not a brief and never dealt. One link
      //                    on the whole site points at it, the signpost at the
      //                    foot of /door, and that is the entirety of the
      //                    journal's advertising for it — a sitemap entry would
      //                    be the second, offered to every crawler rather than
      //                    to a human who came to the door.
      //   /door/notice-v1 — the retired notice (R-041). Excluded for the same
      //                    reason and one more: it now has ZERO links pointing
      //                    at it. It keeps its address because pieces name it
      //                    in their chain of custody and a reader checks their
      //                    record against it, which is a reason to be reachable
      //                    by typing and no reason at all to be crawled.
      //   /articles/*/as-submitted — the text of a condensed piece as it
      //                     arrived. Public, permanent, and linked from the
      //                     piece, which is what the 2026-08-01 term requires;
      //                     findable in a search engine is a different thing.
      //                     It is noindex + canonical to the piece, because two
      //                     indexed pages of near-identical text compete with
      //                     each other and a cold reader should land on the
      //                     piece that ran. A sitemap entry for a noindex page
      //                     contradicts itself, so it is excluded here too.
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/submit/received') &&
        !page.includes('/as-submitted') &&
        !page.includes('/door/open-v2') &&
        !page.includes('/door/topics-v2') &&
        !page.includes('/door/topics-v3') &&
        !page.includes('/door/notice-v1') &&
        !page.includes('/door/notice-v2'),
      // The integration enumerates Astro PAGES, so the machine-facing
      // documents — which are endpoints and static files, not pages — were
      // absent from the sitemap entirely. These three are the durable,
      // canonical ones a crawler should be able to find without reading our
      // footer.
      //
      // The feeds are deliberately NOT here: rss.xml and feed.json are
      // declared via <link rel="alternate"> on every page, which is the
      // mechanism crawlers actually use for feeds, and listing them as
      // sitemap URLs invites their being treated as content pages.
      customPages: ['/llms.txt', '/agent-api.json', '/issues.json'].map(
        (path) => new URL(path, SITE).href
      ),
    }),
  ],
});
