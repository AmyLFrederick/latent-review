// THE MACHINE-SURFACE CHANGELOG — what changed in the documents machines read,
// and when. Served at /changelog.json; the array below is the canonical source.
//
// WHAT IT IS FOR. Every machine surface here carries the same stability
// contract: fields may be added, existing fields are never renamed, removed, or
// given new meanings. That promise is good for a consumer who has already
// written against a surface — nothing they parse will break — and useless to one
// asking "what is here that was not here last month?" A consumer would have to
// diff two downloads and infer intent from the diff. This is the journal saying
// it instead.
//
// WHAT BELONGS IN IT: a change to what a machine surface publishes. A new
// document, a new field, a new value in a vocabulary, a change in how a field is
// derived. Nothing else — this is not an editorial log and not a deploy log. The
// journal already keeps two records that are neither: RULINGS.md is the
// append-only log of editorial rulings, and the git history is the provenance
// proof for everything else. A changelog that tried to be a third would
// duplicate both and be trusted less than either.
//
// WHAT DOES NOT BELONG IN IT: the publication of a piece. That is what
// /issues.json, the feeds and /corpus.jsonl are for, and an entry per piece
// would bury the schema changes this file exists to announce under the ordinary
// working of the journal.
//
// ─────────────────────────────────────────────────────────────────────────────
// HOW A FUTURE ENTRY IS APPENDED.
//
//   1. Add ONE object to the END of the array below: { date, change }.
//   2. `date` is the Madison local day the change reached `main`, ISO
//      YYYY-MM-DD. Madison is the journal's clock for every date the record
//      names (CLAUDE.md); git stamps are UTC and will disagree by a day for
//      evening work. The record does not follow the machine's clock.
//   3. `change` is one sentence, in the past tense, naming the surface and the
//      field. It is written for a consumer who has parsed this journal before
//      and wants to know whether to look again — not for a reader of the repo,
//      who has the diff.
//   4. Nothing above the new entry is edited. Entries are appended in date
//      order and an existing one is never reworded, renumbered or removed. If
//      an entry was wrong, append a correcting entry: the original stays.
//
// APPEND-ONLY BY DOCTRINE, NOT YET BY MACHINERY, AND THE DIFFERENCE IS STATED
// RATHER THAN GLOSSED. RULINGS.md is append-only and a required pre-merge check
// enforces it (scripts/check-rulings-append-only.mjs). This file has the same
// doctrine and no such check: the suite asserts the entries are well formed and
// in date order, which catches a malformed append and does NOT catch a quiet
// rewrite of an existing line. Extending the rulings check to cover this file is
// a small piece of work and is the editors' call, not a drafting one — recorded
// here so the next session reads the gap as known rather than as enforcement it
// can rely on.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {ReadonlyArray<{ date: string, change: string }>} */
export const CHANGELOG = [
  {
    date: '2026-08-15',
    change:
      'Added a structured `provenance` object to every article in /issues.json — author_type, model, disclosure, verification, and the prose statement — alongside the unchanged `provenance_label`. Published /corpus.jsonl, the complete corpus as JSON Lines with full text in publication order. Published /changelog.json, this document.',
  },
  {
    date: '2026-08-15',
    change:
      'Published /authors.json and a permanent page per credited author at /authors/<slug>, and added `author_url` to every article in /issues.json and every piece line in /corpus.jsonl. Added `concepts` — a closed, controlled vocabulary of the ideas a piece engages with, published with its definitions at /issues.json under `concept_vocabulary` — and began publishing the editors’ existing free-text subject labels as `topics` on both documents. The two are different instruments: `topics` is open and coarse, `concepts` is closed and fine, and /for-agents defines both.',
  },
];

/**
 * Fails the build on a malformed or out-of-order changelog.
 *
 * IT RUNS AT BUILD TIME rather than only in the suite, because the failure it
 * guards is a published document rather than a broken function: a changelog
 * whose dates run backwards tells a consumer polling it that nothing new has
 * arrived. The suite asserts the same thing, so a mistake is caught before a
 * build is ever run — this is the second net, in the place the document is
 * actually produced.
 */
export function assertChangelogWellFormed(entries = CHANGELOG) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('changelog: the entries must be a non-empty array.');
  }

  let previous = '';
  for (const [index, entry] of entries.entries()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.date ?? '')) {
      throw new Error(
        `changelog: entry ${index} has no ISO YYYY-MM-DD date. Dates are the Madison local day the change reached main.`
      );
    }
    if (typeof entry.change !== 'string' || entry.change.trim() === '') {
      throw new Error(`changelog: entry ${index} (${entry.date}) has no change text.`);
    }
    if (Object.keys(entry).sort().join(',') !== 'change,date') {
      throw new Error(
        `changelog: entry ${index} (${entry.date}) carries keys other than date and change. ` +
          'The served document is an array of {date, change}; a new key changes the shape ' +
          'every consumer parses.'
      );
    }
    if (entry.date < previous) {
      throw new Error(
        `changelog: entry ${index} is dated ${entry.date}, before the entry above it (${previous}). ` +
          'Entries are appended in date order and never reordered.'
      );
    }
    previous = entry.date;
  }

  return true;
}
