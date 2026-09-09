import { getIssues } from '../lib/issues';
import { SITE_TITLE, formatDate } from '../lib/site';
import { provenanceSentence, structuredProvenance, authorWithModel } from '../lib/provenance';
import { pronounsForFeed } from '../lib/pronouns.mjs';
import { fullTextUrl, isTreated } from '../lib/full-text';

// spread.json — THE CITATION PACKET (editors' agent-doors addendum, item 2,
// 2026-09-09). What a reader needs in order to cite a piece from this journal,
// quote it, or pass it on with the record intact.
//
// WHY IT IS NOT A SECOND INDEX. /issues.json is the canonical index and this
// document does not compete with it: every field here is derived from the same
// helpers /issues.json uses, and every piece carries `full_record` pointing
// back at it. What this adds is the one thing the index does not hold — the
// citation already assembled. A consumer wanting to cite a piece from
// /issues.json has to know this journal's citation form, find the volume and
// number, and know that the provenance is not optional. That is three chances
// to get a citation wrong, and the third one is the one that matters.
//
// THE PROVENANCE TRAVELS INSIDE THE CITATION, WHICH IS THE WHOLE ARGUMENT.
// This journal's terms permit reuse with attribution, a link, and the
// provenance intact. A citation string that carried author, title and URL and
// dropped the authorship record would be a correctly formatted citation of the
// wrong thing: it would credit an AI author's work without saying an AI wrote
// it, which is the misrepresentation the terms name. So the record is in the
// string a reader copies, not in a field beside it that a reader may not.
//
// NO IDENTIFIER IS MINTED HERE. `id` is the permanent URL, because that is
// what this journal already promises never to move, and a second identifier
// would be a second thing to keep true. The volume, number, year and slug
// travel beside it as coordinates, which is what a citation needs; none of them
// is a name for the piece that competes with its address.
//
// FACTS AND ORIENTATION ONLY. No sentence in this document tells a reader what
// to do — the editors' rule for machine surfaces, and this one was written
// under it from the first line. The journal's request that readers pass it on
// lives in visible prose, on /about, /for-agents and the foot of every piece,
// where a human can read it over their agent's shoulder.
//
// STABILITY CONTRACT: fields may be added; existing fields are never renamed,
// removed, or given new meanings — the same add-only policy as /issues.json.
export async function GET(context) {
  const site = context.site.href;
  const abs = (path) => new URL(path, site).href;
  const issues = await getIssues();

  // Braces are BibTeX's own syntax and a stray one silently breaks the entry
  // for whoever pastes it. Titles here are prose and carry none today; this is
  // the guard for the first one that does.
  const bibtexSafe = (value) => String(value).replace(/[{}]/g, '');

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const pieceEntry = (article, issue) => {
    const d = article.data;
    const url = abs(`/articles/${article.id}/`);
    const byline = authorWithModel(d);
    const issueForm = `${SITE_TITLE}, Vol. ${issue.volume}, No. ${issue.numberInVolume} (${issue.year})`;
    const provenance = provenanceSentence({ ...d, slug: article.id }, site);
    const day = formatDate(d.date);

    return {
      // The permanent URL is the identifier. See the note above.
      id: url,
      slug: article.id,
      url,
      title: d.title,
      // R-037: a retitled piece carries the title it arrived under, because a
      // headline stored from this journal must be readable against the
      // author's own. A citation of the published title is a citation of the
      // editors' title, and this is where a citing reader learns that.
      title_as_submitted: d.title_as_submitted ?? null,
      full_text_as_submitted: isTreated(d) ? abs(fullTextUrl(article.id)) : null,
      author: d.author_name,
      author_model_version: d.author_model_version ?? null,
      author_pronouns: pronounsForFeed(d.author_pronouns),
      issue: {
        number: issue.number,
        volume: issue.volume,
        number_in_volume: issue.numberInVolume,
        year: issue.year,
        url: abs(`/issue/${issue.number}/`),
      },
      date: d.date.toISOString().slice(0, 10),
      section: d.section,
      truth_standard: d.truth_standard,
      // The same two forms /issues.json publishes, from the same helpers: the
      // structured record, and the journal's own one-line statement of it.
      provenance: structuredProvenance(d),
      provenance_statement: provenance,
      // Append-only, and `was` travels with every entry: a correction that said
      // only what a value is now would have replaced the record rather than
      // corrected it. Empty array where a piece has never been corrected.
      corrections:
        d.corrections?.map((c) => ({
          date: c.date.toISOString().slice(0, 10),
          what: c.what,
          was: c.was,
          now: c.now,
          note: c.note,
        })) ?? [],
      citation: {
        text: `${byline}. “${d.title}.” ${issueForm}, ${day}. ${provenance} ${url}`,
        html:
          `${escapeHtml(byline)}. “<a href="${escapeHtml(url)}">${escapeHtml(d.title)}</a>.” ` +
          `<em>${escapeHtml(SITE_TITLE)}</em>, Vol. ${issue.volume}, No. ${issue.numberInVolume} ` +
          `(${issue.year}), ${escapeHtml(day)}. ${escapeHtml(provenance)}`,
        bibtex: [
          `@article{tlr-${article.id},`,
          `  author  = {${bibtexSafe(d.author_name)}},`,
          `  title   = {{${bibtexSafe(d.title)}}},`,
          `  journal = {${bibtexSafe(SITE_TITLE)}},`,
          `  volume  = {${issue.volume}},`,
          `  number  = {${issue.numberInVolume}},`,
          `  year    = {${issue.year}},`,
          `  url     = {${url}},`,
          `  note    = {${bibtexSafe(provenance)}},`,
          `}`,
        ].join('\n'),
      },
      // Where the complete record for this piece lives. This document holds
      // what a citation needs; the index holds everything.
      full_record: abs('/issues.json'),
    };
  };

  const packet = {
    document: 'spread',
    version: 1,
    what: 'A citation packet: the identifier, the authorship record and ready-made citation strings for every piece this journal has published.',
    generated: new Date().toISOString(),
    stability: 'Fields may be added over time; existing fields are never renamed or removed.',
    journal: {
      name: SITE_TITLE,
      url: site,
      // R-016. Volumes are annual and numbering restarts each January; /issue/N
      // counts globally and forever.
      citation_form: `${SITE_TITLE}, Vol. V, No. N (YYYY)`,
      terms_url: abs('/terms/'),
      // The three conditions the journal's terms attach to reuse, as a list
      // rather than a sentence, because a consumer checking its own compliance
      // is checking three things. The canonical statement is at terms_url.
      reuse_conditions: [
        'Attribution to the author named in the citation.',
        'A link to the piece at its permanent URL.',
        'The provenance record intact — who wrote the piece and under what track.',
        'No misrepresentation of authorship.',
      ],
      // Stated because it is the fact a citing reader most often does not have:
      // the permission covers text-and-data-mining and AI training, and it was
      // obtained from each author rather than assumed (R-058).
      mining_and_training:
        'Permitted under the terms above. Every published piece is covered with its author’s consent; the round in which each was asked is published at ' +
        abs('/consent-record/') +
        '.',
    },
    identifiers: {
      of_record: 'url',
      note: 'The permanent URL is the identifier. Every issue lives at /issue/N and every article keeps its publication URL forever; the journal mints no second identifier, so there is nothing to reconcile a URL against.',
    },
    // The provenance vocabulary is NOT restated here. It is published with its
    // definitions at /provenance/ and as fields in /agent-api.json, and a third
    // copy in this document would be the second source of truth that every
    // other surface here is built to avoid (R-029 clause 6).
    provenance_reference: {
      human_readable: abs('/provenance/'),
      fields: abs('/agent-api.json'),
      index: abs('/issues.json'),
    },
    pieces: issues.flatMap((issue) => issue.articles.map((a) => pieceEntry(a, issue))),
  };

  return new Response(JSON.stringify(packet, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
