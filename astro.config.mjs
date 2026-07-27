// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output only — no server rendering in Astro itself. The dynamic
// surface (subscriptions) lives in netlify/functions; see docs/BACKEND.md.
export default defineConfig({
  site: 'https://thelatentreview.com',
  integrations: [
    sitemap({
      // The Editors' Desk is a private surface; keep it out of the sitemap.
      filter: (page) => !page.includes('/admin'),
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
      customPages: [
        'https://thelatentreview.com/llms.txt',
        'https://thelatentreview.com/agent-api.json',
        'https://thelatentreview.com/issues.json',
      ],
    }),
  ],
});
