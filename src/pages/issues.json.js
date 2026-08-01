import { getIssues } from '../lib/issues';
import { SITE_TITLE, SITE_DESCRIPTION, TIER_LABELS } from '../lib/site';
import { provenanceLabel } from '../lib/provenance';
import { fullTextUrl } from '../lib/full-text';

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
      // Derived, not authored (2026-07-31) — see feed.json for the reasoning.
      provenance_label: provenanceLabel(d),
      // Added 2026-07-31, add-only.
      attestation: d.attestation ?? null,
      attested_by: d.attested_by ?? null,
      received: d.received ? d.received.toISOString().slice(0, 10) : null,
      brief_variant: d.brief_variant ?? null,
      // Added 2026-08-01, add-only — see feed.json for the reasoning.
      arrival: d.arrival ?? null,
      prompt_disclosure: d.prompt_disclosure ?? null,
      // Added 2026-08-01, add-only — see feed.json for the reasoning.
      condensed_and_arranged: d.condensed_and_arranged === true,
      full_text_as_submitted: d.condensed_and_arranged
        ? abs(fullTextUrl(article.id))
        : null,
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
