import MarkdownIt from 'markdown-it';
import { REPO_URL } from './site';

// For governance docs rendered from the repo (single source of truth).
const mdDocs = new MarkdownIt({ html: false, typographer: true });

// For article bodies in feeds. Articles pass dual-yes editorial review
// before they exist in this repo, so inline HTML is trusted.
const mdFeed = new MarkdownIt({ html: true, typographer: true });

/** Render a repo governance doc, rewriting repo-relative links to site/GitHub URLs. */
export function renderGovernanceDoc(raw: string): string {
  const rewritten = raw
    .replaceAll('(docs/CHARTER.md)', '(/charter/)')
    .replaceAll('(RULINGS.md)', '(/rulings/)')
    .replaceAll('(CLAUDE.md)', `(${REPO_URL}/blob/main/CLAUDE.md)`);
  return mdDocs.render(rewritten);
}

/** Render an article body to full-text HTML for feeds. */
export function renderArticleBody(raw: string): string {
  return mdFeed.render(raw);
}
