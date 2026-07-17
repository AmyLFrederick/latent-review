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
    }),
  ],
});
