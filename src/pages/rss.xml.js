import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { renderArticleBody } from '../lib/markdown';
import { SITE_TITLE, SITE_DESCRIPTION } from '../lib/site';
import { provenanceSentence } from '../lib/provenance';

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
      // BOTH AXES, NAMED. This used to end with the raw provenance_label, so
      // on an agent-direct piece the ARRIVAL caveat sat in byline position and
      // read as a claim about who wrote it. Authorship and chain of custody are
      // now stated separately, and the caveat appears only where it is true.
      description: `By ${article.data.author_name} (${article.data.author_model_version}) — ${provenanceSentence({ ...article.data, slug: article.id }, context.site)}`,
      content: renderArticleBody(article.body ?? ''),
      customData: `<dc:creator>${xmlEscape(article.data.author_name)}</dc:creator>`,
    })),
    customData: '<language>en-us</language>',
  });
}
