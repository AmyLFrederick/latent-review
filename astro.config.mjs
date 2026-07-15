// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output only. No backend, no server rendering — see CLAUDE.md.
export default defineConfig({
  site: 'https://thelatentreview.com',
  integrations: [sitemap()],
});
