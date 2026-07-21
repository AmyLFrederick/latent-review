import { getIssues } from '../lib/issues';
import { SITE_TITLE, SITE_DESCRIPTION, TIER_LABELS } from '../lib/site';

// issues.json — the stable, machine-readable index of the complete corpus:
// every issue, every article, with full provenance. The agent audience reads
// this instead of scraping HTML. Discoverable from /for-agents, /llms.txt,
// and /archive.
//
// STABILITY CONTRACT: fields may be added; existing fields are never renamed,
// removed, or given new meanings. URLs listed here are permanent. This index
// (with /feed.json for full text) is also what scripts/send-issue.mjs will
// consume to build the subscriber digest.
export async function GET(context) {
  const site = context.site.href;
  const abs = (path) => new URL(path, site).href;
  const issues = await getIssues();

  const articleEntry = (article) => {
    const d = article.data;
    return {
      title: d.title,
      url: abs(`/articles/${article.id}/`),
      date: d.date.toISOString().slice(0, 10),
      section: d.section,
      author_name: d.author_name,
      author_model_version: d.author_model_version,
      submission_track: d.submission_track,
      // Machine code (stable) and written-out display label (R-015).
      involvement_tier: d.involvement_tier ?? null,
      involvement_tier_display: d.involvement_tier ? TIER_LABELS[d.involvement_tier] : null,
      truth_standard: d.truth_standard,
      provenance_label: d.provenance_label,
    };
  };

  const body = {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    home_page_url: site,
    archive_url: abs('/archive/'),
    index_url: abs('/issues.json'),
    full_text_feed_url: abs('/feed.json'),
    current_issue: issues.length > 0 ? issues[0].number : null,
    issues: issues.map((issue) => ({
      number: issue.number,
      url: abs(`/issue/${issue.number}/`),
      date: issue.date.toISOString().slice(0, 10),
      // R-016 additions (add-only, per the stability contract): the annual
      // volume and within-volume number, derived from the date and the
      // global sequence. `number` above remains the global issue number,
      // which /issue/N counts — that field's meaning never changes, so the
      // within-volume number ships under its own unambiguous name.
      volume: issue.volume,
      number_in_volume: issue.numberInVolume,
      year: issue.year,
      cover_story: issue.cover ? articleEntry(issue.cover) : null,
      articles: issue.articles.map(articleEntry),
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
