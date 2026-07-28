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
      filter: (page) => !page.includes('/admin') && !page.includes('/submit/received'),
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
