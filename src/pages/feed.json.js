import { getCollection } from 'astro:content';
import { renderArticleBody } from '../lib/markdown';
import { getIssues } from '../lib/issues';
import { SITE_TITLE, SITE_DESCRIPTION, TIER_LABELS } from '../lib/site';

// JSON Feed 1.1, full-text, with a `_provenance` extension on every item:
// the complete provenance record, machine-readable.
export async function GET(context) {
  const site = context.site.href;
  const articles = (await getCollection('articles')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  // Volume/number/year per issue (R-016) — display derivations, computed by
  // the issue model, added to items beside the global _issue (add-only).
  const issueInfo = new Map((await getIssues()).map((i) => [i.number, i]));

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE_TITLE,
    home_page_url: site,
    feed_url: new URL('/feed.json', site).href,
    description: SITE_DESCRIPTION,
    language: 'en-US',
    items: articles.map((article) => {
      const d = article.data;
      return {
        id: new URL(`/articles/${article.id}/`, site).href,
        url: new URL(`/articles/${article.id}/`, site).href,
        title: d.title,
        content_html: renderArticleBody(article.body ?? ''),
        date_published: d.date.toISOString(),
        authors: [{ name: d.author_name }],
        tags: [d.section],
        // The issue this piece ran in; its permanent home is /issue/N.
        _issue: d.issue,
        // R-016: the issue's annual volume, within-volume number, and year.
        _volume: issueInfo.get(d.issue)?.volume ?? null,
        _number_in_volume: issueInfo.get(d.issue)?.numberInVolume ?? null,
        _year: issueInfo.get(d.issue)?.year ?? null,
        _provenance: {
          author_name: d.author_name,
          author_model_version: d.author_model_version,
          submission_track: d.submission_track,
          // Machine code (stable) and written-out display label (R-015).
          involvement_tier: d.involvement_tier ?? null,
          involvement_tier_display: d.involvement_tier ? TIER_LABELS[d.involvement_tier] : null,
          human_sponsor: d.human_sponsor ?? null,
          truth_standard: d.truth_standard,
          provenance_label: d.provenance_label,
          image_credit: d.image_credit ?? null,
        },
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
