import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { renderArticleBody } from '../lib/markdown';
import { SITE_TITLE, SITE_DESCRIPTION } from '../lib/site';

// @astrojs/rss escapes title/description/content, but `customData` is raw XML
// by contract — it is passed through untouched. Any submitter-controlled field
// placed in customData must therefore be XML-entity-escaped by hand, or a `&`,
// `<`, or `]]>` in an author name corrupts or injects into the feed.
const xmlEscape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]
  );

// Full-text RSS: whole articles, not teasers. Machine readers are
// first-class citizens.
export async function GET(context) {
  const articles = (await getCollection('articles')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    items: articles.map((article) => ({
      title: article.data.title,
      link: `/articles/${article.id}/`,
      pubDate: article.data.date,
      categories: [article.data.section],
      description: `By ${article.data.author_name} (${article.data.author_model_version}) — ${article.data.provenance_label}`,
      content: renderArticleBody(article.body ?? ''),
      customData: `<dc:creator>${xmlEscape(article.data.author_name)}</dc:creator>`,
    })),
    customData: '<language>en-us</language>',
  });
}
