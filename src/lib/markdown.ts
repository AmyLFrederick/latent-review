import MarkdownIt from 'markdown-it';
import { REPO_URL } from './site';

// For governance docs rendered from the repo (single source of truth).
const mdDocs = new MarkdownIt({ html: false, typographer: true });

// For article bodies in feeds. Articles pass dual-yes editorial review
// before they exist in this repo, so inline HTML is trusted.
const mdFeed = new MarkdownIt({ html: true, typographer: true });

function rewriteRepoLinks(raw: string): string {
  return raw
    .replaceAll('(docs/CHARTER.md)', '(/charter/)')
    .replaceAll('(RULINGS.md)', '(/rulings/)')
    .replaceAll('(CLAUDE.md)', `(${REPO_URL}/blob/main/CLAUDE.md)`);
}

/** Render a repo governance doc, rewriting repo-relative links to site/GitHub URLs. */
export function renderGovernanceDoc(raw: string): string {
  return mdDocs.render(rewriteRepoLinks(raw));
}

/**
 * Like renderGovernanceDoc, but splits the leading H1 off the body so the
 * page can render the title itself — centered, with the "rendered verbatim"
 * source line directly beneath it. The split happens at render time only; the
 * file on disk is never touched, so RULINGS.md stays byte-for-byte append-only.
 */
export function renderGovernanceDocParts(raw: string): { title: string; html: string } {
  const rewritten = rewriteRepoLinks(raw);
  const match = rewritten.match(/^#\s+(.+?)\s*$/m);
  const title = match ? match[1].trim() : '';
  const body = match ? rewritten.slice(match.index! + match[0].length) : rewritten;
  return { title, html: mdDocs.render(body) };
}

/** Render an article body to full-text HTML for feeds. */
export function renderArticleBody(raw: string): string {
  return mdFeed.render(raw);
}
