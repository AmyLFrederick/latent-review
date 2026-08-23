import { getCollection } from 'astro:content';
import { structuredProvenance } from '../lib/provenance';
import { authorUrl, slugifyAuthor } from '../lib/authors';
import { readingEffortFields } from '../lib/reading-effort.mjs';

// corpus.jsonl — the complete published corpus as JSON Lines: one JSON object
// per line, every published piece, in publication order, with its full text.
//
// WHY A SECOND FULL-TEXT SURFACE. /feed.json already carries every piece in
// full, and this does not replace it. A feed is a document — a consumer parses
// the whole thing to reach any of it, and its shape (JSON Feed 1.1) is fixed by
// a spec written for readers following a publication. JSON Lines is the shape a
// consumer reads a CORPUS in: one record per line, streamable, appendable,
// splittable, readable by a tool that never allocates the whole file. The
// audience is the same audience /for-agents has always addressed; the access
// pattern is different, and a journal that says machine readers are first-class
// citizens should not make them parse a subscription document to read an
// archive.
//
// PUBLICATION ORDER, OLDEST FIRST, which is the opposite of every feed here.
// The feeds are newest-first because a reader following a publication wants what
// just appeared. A corpus is read forward — line 2 is the first piece the
// journal ever published — and the order is deterministic (date, then issue,
// then slug) so two builds of the same content produce the same file.
//
// STABILITY CONTRACT: the same add-only policy as /issues.json. Fields may be
// added; existing fields are never renamed, removed, or given new meanings.
//
// ─────────────────────────────────────────────────────────────────────────────
// NO LICENCE FIELD, AND ITS ABSENCE IS DELIBERATE.
//
// Licensing is an OPEN STANDING ITEM in this repository (CLAUDE.md): code will
// be MIT, article content will carry a separate rights statement, and neither is
// finalised. No published piece displays a licence or a rights statement today —
// the only CC BY 4.0 in the journal is on /provenance, and it covers the
// involvement-tier STANDARD rather than any piece. So there is nothing to
// mirror here, and the only honest thing this file can do is say nothing.
//
// A `license: null`, a `rights: "unspecified"`, or a training-use statement of
// any kind would each be this file answering a question the editors have
// explicitly held for themselves. An absent field is the one shape that carries
// no answer. When the rights statement is settled, it is displayed on pieces
// first and reflected here second, in that order.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(context) {
  const site = context.site.href;
  const abs = (path) => new URL(path, site).href;

  // Deterministic and forward: the day it ran, then the issue it ran in, then
  // the slug. The last is never reached by two pieces published the same day in
  // the same issue for any reason other than needing a total order — which is
  // exactly what it is for.
  const articles = (await getCollection('articles')).sort(
    (a, b) =>
      a.data.date.valueOf() - b.data.date.valueOf() ||
      a.data.issue - b.data.issue ||
      a.id.localeCompare(b.id)
  );

  // LINE 1 IS A META RECORD AND EVERY OTHER LINE IS A PIECE, told apart by
  // `type`. A consumer that streams this file decides what a line is from the
  // line itself rather than from its position, so a record added at the head
  // later cannot silently become a piece.
  //
  // `generated` MOVES ON EVERY BUILD, which is the one thing in this file that
  // is not a fact about the corpus. It is the build's own timestamp, and a
  // consumer diffing two downloads should expect line 1 to differ when nothing
  // else does.
  const meta = {
    type: 'meta',
    generated: new Date().toISOString(),
    pieces: articles.length,
  };

  const lines = [meta].concat(
    articles.map((article) => {
      const d = article.data;
      return {
        type: 'piece',
        url: abs(`/articles/${article.id}/`),
        title: d.title,
        // The machine answer to who wrote this — the same field, the same
        // shape, as feed.json's `authors`. It is never the byline.
        authors: [{ name: d.author_name }],
        // The DISPLAY credit, which is a different fact and sometimes a
        // different string: 'the founding editors, Claude and Amy Louise
        // Frederick' is a byline and not a name. Falls back to the author name
        // on the pieces that need no override, so the key never vanishes.
        byline: d.byline ?? d.author_name,
        // The author's permanent page — a listing of the pieces published under
        // that name, never a claim that one entity wrote them. /authors.json
        // states the grouping rule in full.
        author_url: abs(authorUrl(slugifyAuthor(d.author_name))),
        section: d.section,
        issue: d.issue,
        date: d.date.toISOString().slice(0, 10),
        // THE EDITORS' SUBJECT LABELS, published as they stand (R-032). These
        // are set at publication on a piece in any section, and they are not
        // the `concepts` below — see that key.
        topics: d.topics ?? [],
        // CONCEPT TAGS — the ideas a piece engages with, from the closed
        // vocabulary in src/lib/concepts.mjs (2026-08-15; the key shipped empty
        // on 2026-08-15 with the corpus itself, and is populated here).
        //
        // A DIFFERENT INSTRUMENT FROM `topics`, NOT A TIDIER VERSION OF IT.
        // Subject labels are open and describe one piece; concepts are closed
        // and CONNECT pieces, which a vocabulary admitting synonyms cannot do.
        // Both are published because they answer different questions.
        concepts: d.concepts ?? [],
        provenance: structuredProvenance(d),
        // Added 2026-08-23, add-only — the effort-and-time indicator, the same
        // object and the same values as `reading_effort` on this piece's entry
        // in /issues.json, shaped by one function so the two cannot disagree.
        //
        // IT IS COMPUTED FROM THE `text` BELOW, which makes this the one
        // surface where a consumer can check it end to end without leaving the
        // line: the prose is here, the counts are here, and the formula, its
        // exclusions and its thresholds are published at /for-agents and in
        // /agent-api.json under `reading.reading_effort_fields`.
        //
        // NOT EVERY WORD OF `text` IS COUNTED, and that is the point of it.
        // Block quotes, quoted transcripts, headings, lists and code are
        // excluded, so `reading_effort.words` is at or below the word count of
        // the field beside it; on the cover piece, which carries a long quoted
        // exchange, the gap is several hundred words. A consumer diffing the
        // two is seeing the exclusion work, not a bug.
        reading_effort: readingEffortFields(article.body ?? ''),
        // MARKDOWN, MATCHING SOURCE. `body` is the piece's stored text exactly
        // as the collection holds it — the same string the site renders, not a
        // rendering of it. Markdown is the sole body format here (there is no
        // format field on a submission), so `text_format` names what is true
        // rather than offering a choice.
        //
        // IT IS THE PIECE AS IT RAN. Where the editors condensed, arranged or
        // retitled a piece, the text as it ARRIVED is a separate published
        // document, linked from the piece and named in /issues.json as
        // `full_text_as_submitted`. A corpus consumer that needs the original
        // reads it there; this line carries what the journal published.
        text_format: 'markdown',
        text: article.body ?? '',
      };
    })
  );

  // A trailing newline, so the file ends on a complete record and `wc -l`
  // counts what a reader counts.
  const body = lines.map((line) => JSON.stringify(line)).join('\n') + '\n';

  return new Response(body, {
    // The registered media type for JSON Lines. Not application/json: this
    // document is not one JSON value, and serving it as though it were invites
    // a consumer to parse the whole file and fail on line 2.
    headers: { 'Content-Type': 'application/jsonl; charset=utf-8' },
  });
}
