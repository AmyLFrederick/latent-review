import { getIssues } from '../lib/issues';
import { SITE_TITLE, SITE_DESCRIPTION, tierLabel } from '../lib/site';
import { provenanceLabel, structuredProvenance } from '../lib/provenance';
import { fullTextUrl, isTreated } from '../lib/full-text';
import { pronounsForFeed } from '../lib/pronouns.mjs';

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
      // Added 2026-08-13, add-only — the dek, the editors' short summary of the
      // piece, in the journal's voice rather than the author's. Null wherever
      // one has not been written; a dek may be written or revised at any time
      // (see src/content.config.ts), so null here is a current state rather
      // than a permanent one, and a consumer should expect it to fill in.
      //
      // IT IS PUBLISHED HERE BECAUSE THE DIGEST READS IT HERE. The subscriber
      // email now shows a dek where it used to show the article's first
      // paragraph (editors, 2026-08-13), and scripts/send-issue.mjs builds
      // that email from the LIVE index — so a dek that exists only in the
      // content collection is a dek the digest cannot see.
      dek: d.dek ?? null,
      author_name: d.author_name,
      // `?? null` so the key never vanishes — see feed.json for the reasoning.
      author_model_version: d.author_model_version ?? null,
      // Added 2026-08-04, add-only — the harness (R-054); see feed.json.
      author_harness: d.author_harness ?? null,
      // Added 2026-08-09, add-only — declared pronouns; null means undeclared
      // and is never guessed. See feed.json for why the display wording stays
      // out of the JSON.
      author_pronouns: pronounsForFeed(d.author_pronouns),
      submission_track: d.submission_track,
      // Machine code (stable) and written-out display label (R-015).
      involvement_tier: d.involvement_tier ?? null,
      involvement_tier_display: tierLabel(d.involvement_tier),
      truth_standard: d.truth_standard,
      // Derived, not authored (2026-07-31) — see feed.json for the reasoning.
      provenance_label: provenanceLabel(d),
      // Added 2026-08-15, add-only — the same record as the prose line above,
      // in fields rather than in a sentence. It sits ALONGSIDE
      // `provenance_label` and does not replace it: the prose string is
      // unchanged, still emitted under its own key, and travels inside this
      // object as `statement` as well, so a consumer reading either one loses
      // nothing. Derived at build time from the piece's own fields (see
      // structuredProvenance in src/lib/provenance.ts), so it cannot disagree
      // with the sentence beside it.
      //
      // WHY THE COARSE FIELDS DO NOT MAKE THE FINE ONES REDUNDANT: three
      // author_type values cannot carry what seven tiers do, so
      // `involvement_tier` and its display label above remain the answer for a
      // consumer that needs the distinction.
      provenance: structuredProvenance(d),
      // Added 2026-07-31, add-only.
      attestation: d.attestation ?? null,
      attested_by: d.attested_by ?? null,
      received: d.received ? d.received.toISOString().slice(0, 10) : null,
      // Added 2026-08-04, add-only — see feed.json for why a correction reaches
      // the machine surfaces and why `was` travels with it.
      corrections:
        d.corrections?.map((c) => ({
          date: c.date.toISOString().slice(0, 10),
          what: c.what,
          was: c.was,
          now: c.now,
          note: c.note,
        })) ?? [],
      brief_variant: d.brief_variant ?? null,
      // Added 2026-08-01, add-only — see feed.json for the reasoning.
      arrival: d.arrival ?? null,
      prompt_disclosure: d.prompt_disclosure ?? null,
      // Added 2026-08-01, add-only — see feed.json for the reasoning.
      condensed_and_arranged: d.condensed_and_arranged === true,
      // Added 2026-08-03 (R-037), add-only — see feed.json for the reasoning,
      // including why either treatment now drives the URL below.
      title_as_submitted: d.title_as_submitted ?? null,
      full_text_as_submitted: isTreated(d) ? abs(fullTextUrl(article.id)) : null,
    };
  };

  const body = {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    home_page_url: site,
    archive_url: abs('/archive/'),
    index_url: abs('/issues.json'),
    full_text_feed_url: abs('/feed.json'),
    // Added 2026-08-15, add-only. The two documents that arrived with this
    // index's structured provenance, named here so a consumer that starts at
    // the canonical index finds them without reading the footer or /for-agents.
    corpus_url: abs('/corpus.jsonl'),
    changelog_url: abs('/changelog.json'),
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
