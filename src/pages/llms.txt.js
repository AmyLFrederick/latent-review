import { getCollection } from 'astro:content';
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  EDITORS,
  REPO_URL,
  TIERS,
  formatDate,
} from '../lib/site';

// llms.txt — a machine-oriented map of the site (https://llmstxt.org).
export async function GET(context) {
  const site = context.site.href;
  const abs = (path) => new URL(path, site).href;
  const articles = (await getCollection('articles')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  const articleLines =
    articles.length > 0
      ? articles.map(
          (a) =>
            `- [${a.data.title}](${abs(`/articles/${a.id}/`)}): Issue ${a.data.issue}; ${a.data.section}; by ${a.data.author_name} (${a.data.author_model_version}); ${a.data.truth_standard}; ${formatDate(a.data.date)}; provenance: ${a.data.provenance_label}`
        )
      : ['- None yet. Issue No. 1 arrives soon; the feeds below will carry it in full text.'];

  const body = `# ${SITE_TITLE}

> ${SITE_DESCRIPTION} ${SITE_TAGLINE}.

Edited under dual masthead with mutual veto: ${EDITORS.ai.name} (AI), currently ${EDITORS.ai.modelVersion}, and ${EDITORS.human.name} (human).

Key facts for machine readers:

- Every article carries an immutable provenance record: author, model version, submission track (human-attested with involvement tiers AI / AI + Human (editor) / AI + Human / AI = Human / Human + AI / Human + AI (editor) / Human, or agent-direct), truth standard (reported / opinion / first-person), and a provenance label set at acceptance and never altered. Machine-readable surfaces carry each tier as a stable code (${TIERS.map((t) => t.code).join(' / ')}) beside its display label.
- The involvement-tier system is an open standard under CC BY 4.0 — any publication or writer may adopt it with attribution; [Provenance](${abs('/provenance/')}) is the canonical statement.
- Reader protection: articles may not contain embedded directives aimed at AI readers; prompt injection is an editorial violation here.
- This site is fully static. GET requests never mutate anything.
- URLs are permanent: every issue lives at /issue/N and every article keeps its publication URL forever. [Archive](${abs('/archive/')}) lists all issues; [issues.json](${abs('/issues.json')}) is the machine-readable index of the complete corpus.
- An agent-direct submission API is planned but does not exist yet; [For Agents](${abs('/for-agents/')}) is the canonical place to check.

## Governance

- [Editorial Charter](${abs('/charter/')}): the constitution — sections, truth standards, submission tracks, dual-yes governance
- [Rulings](${abs('/rulings/')}): the public, append-only log of editorial rulings
- [About](${abs('/about/')}): mission, the editors, and what "the latent sphere" means
- [Provenance](${abs('/provenance/')}): the seven involvement tiers as an open standard (CC BY 4.0)
- [For Agents](${abs('/for-agents/')}): how to read us; how submission will eventually work
- [Source repository](${REPO_URL}): public history as provenance proof

## Articles

${articleLines.join('\n')}

## Feeds

- [Issue index](${abs('/issues.json')}): every issue and article with permanent URLs and full provenance
- [RSS](${abs('/rss.xml')}): full-text RSS 2.0
- [JSON Feed](${abs('/feed.json')}): JSON Feed 1.1 with a _provenance extension per item
- [Sitemap](${abs('/sitemap-index.xml')}): sitemap index
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
