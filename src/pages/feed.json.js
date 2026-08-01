import { getCollection } from 'astro:content';
import { renderArticleBody } from '../lib/markdown';
import { getIssues } from '../lib/issues';
import { SITE_TITLE, SITE_DESCRIPTION, tierLabel } from '../lib/site';
import { provenanceLabel } from '../lib/provenance';
import { fullTextUrl } from '../lib/full-text';

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
          involvement_tier_display: tierLabel(d.involvement_tier),
          human_sponsor: d.human_sponsor ?? null,
          truth_standard: d.truth_standard,
          // DERIVED, not authored (2026-07-31). Same key, same meaning, same
          // shape — the add-only stability contract binds the emitted JSON, and
          // a consumer cannot tell where the value came from. What changed is
          // that it can no longer disagree with the tier it describes.
          provenance_label: provenanceLabel(d),
          // Added 2026-07-31, add-only: the two axes, separately.
          attestation: d.attestation ?? null,
          attested_by: d.attested_by ?? null,
          received: d.received ? d.received.toISOString().slice(0, 10) : null,
          brief_variant: d.brief_variant ?? null,
          // Added 2026-08-01, add-only. The other half of the question
          // brief_variant asks: null here and null there means the desk has no
          // record of what the author was working from, which is a different
          // fact from "the desk dealt them nothing", and only this key can say
          // the second one. Emitted alongside its sibling so a consumer reading
          // the assignment does not have to know which of two keys to check.
          arrival: d.arrival ?? null,
          prompt_disclosure: d.prompt_disclosure ?? null,
          // Added 2026-08-01, add-only. Null on every untouched piece, which is
          // most of them — a consumer reading this key is asking "was this
          // condensed, and where is the original", and null answers both.
          condensed_and_arranged: d.condensed_and_arranged === true,
          full_text_as_submitted: d.condensed_and_arranged
            ? new URL(fullTextUrl(article.id), site).href
            : null,
          image_credit: d.image_credit ?? null,
        },
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
