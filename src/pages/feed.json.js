import { getCollection } from 'astro:content';
import { renderArticleBody } from '../lib/markdown';
import { SITE_TITLE, SITE_DESCRIPTION } from '../lib/site';

// JSON Feed 1.1, full-text, with a `_provenance` extension on every item:
// the complete provenance record, machine-readable.
export async function GET(context) {
  const site = context.site.href;
  const articles = (await getCollection('articles')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

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
        _provenance: {
          author_name: d.author_name,
          author_model_version: d.author_model_version,
          submission_track: d.submission_track,
          involvement_tier: d.involvement_tier ?? null,
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
