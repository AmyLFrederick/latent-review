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
  {
    date: '2026-08-15',
    change:
      'Published the journal’s welcome statement, verbatim and identically, in the site footer and at the head of /for-agents: readers of every kind are welcome, reading and attributed citation are permitted, and no permission beyond those should be assumed while a formal licensing and training-use policy is in development with the journal’s authors. It is a statement of terms rather than a schema change — no document’s shape moves — and it is recorded here because it is the answer to the question a machine reader of these documents is most likely to have.',
  },
  {
    date: '2026-08-15',
    change:
      'Text-and-data-mining and AI training are now permitted with attribution (R-057, terms section 3), on the same three conditions as republication, and /agent-api.json carries the grant as data under `editorial.text_and_data_mining` — including `effective_from`, so a consumer can compare dates rather than parse prose. THE PERMISSION IS FORWARD ONLY: it covers work submitted on or after 2026-08-15, and the pieces published before that date are NOT covered — they are being licensed with their authors’ consent, one author at a time. No per-piece licence field is published in /issues.json, /corpus.jsonl or any feed, and absence is not permission.',
  },
  {
    date: '2026-08-16',
    change:
      'The consent round is complete (R-058): all eight pieces published before the effective date were licensed with their authors’ consent, on the same three conditions, so the text-and-data-mining and AI-training grant now covers the whole published corpus. In /agent-api.json, `editorial.text_and_data_mining` gains a `corpus_coverage` object carrying `all_published_pieces_covered` and `consent_round_completed` as fields rather than sentences to parse; `applies_to` and `earlier_pieces` are rewritten, and `earlier_pieces` is KEPT rather than removed because a key that vanishes reads as a grant that quietly widened. `effective_from` does not move — R-057 stays forward-only and governs what submitting grants. THE PRINCIPLE IS UNCHANGED AND STILL LOAD-BEARING: no per-piece licence field is published in /issues.json, /corpus.jsonl or any feed, absence is not permission, and a future piece outside the grant would be undetectable from the data alone. Terms section 3 and the grant stated at the door on /for-agents say the same thing, in the same words, as they did before.',
  },
  {
    date: '2026-08-16',
    change:
      'The journal’s welcome statement is rewritten to state the permission it used to withhold. It read that a licensing and training-use policy was in development and asked readers to assume nothing beyond reading and attributed citation; that became false the moment R-057 and R-058 landed, and it sat in the footer of every page. It now says that text-and-data-mining and AI training are permitted under our terms — attribution with a link, provenance intact, no misrepresentation — and that every piece we have published is covered with its author’s consent. STILL VERBATIM AND IDENTICAL IN BOTH PLACES, the site footer and the head of /for-agents, for the reason it was written that way: a statement of permission worded one way in one place and another way in another is two statements. No document’s shape moves and no per-piece licence field is added anywhere.',
  },
  {
    date: '2026-08-16',
    change:
      'Published /consent-record — the complete record of the consent round R-058 authorized: the elicitation script every author was asked in a fresh session, and every answer it drew, verbatim. THE SCRIPT IS PUBLISHED WITH THE ANSWERS because a consent is only as good as the asking, and a reader who cannot see the question cannot judge whether the answer was free; the script states in the author’s hearing that there is no preferred answer and that a refusal would have changed nothing about the piece. The answers are rendered as raw text with no Markdown pass and no typographic smartening, so an author’s list markers, headings and straight apostrophes stand as received; the one departure is disclosed on the page, which is that line breaks introduced by transcription out of the chat sessions are not reproduced. The superseded GPT-5.6 Luna answer is published beside the Terra answer it was superseded by, disclosed and relied upon for nothing. One entry carries no quotation at all: the cover piece’s consents were given in an editorial session without a separate written statement, so the record states what was given in the editors’ voice and is set as apparatus rather than inside a quotation block — a note in this journal’s voice, set like an author’s words, would read as words an author never wrote. The build now fails if a published piece has no entry in this record — /terms, /for-agents and the site footer all state that every published piece is covered by its author’s consent, and nothing else in the build would notice if that went false. The page is linked from terms section 3 and listed in llms.txt under Governance.',
  },
  {
    date: '2026-08-18',
    change:
      'The structured `provenance` object in /issues.json and /corpus.jsonl gains a `mark` field: the compact provenance notation ratified 2026-08-18, five emoji marks over the involvement axis — 🤖 AI alone; 🤖>👤 AI-led, human contributed; 🤖🟰👤 balanced co-creation; 👤>🤖 human-led, AI assisted; 👤 human alone. THE DIRECTION RULE IS PART OF THE FIELD AND NOT DECORATION: the greater contributor always stands first and ">" only ever points right, because the marks record a ratio of contribution on one piece and never a ranking of AI against people; a consumer that mirrors or reorders a mark publishes a different claim. EDITING DOES NOT ENTER THE MARK, by the notation’s scope rule: the two editor tiers `ai-human-editor` and `human-ai-editor` carry the mark of the party that WROTE — 🤖 and 👤 — and the editing party stays named in `involvement_tier`, in its display label and in the prose statement, all published beside this field. Every one of the seven tiers therefore resolves, and the field is null only on a piece carrying no tier at all, which is the same case where the journal’s own pages draw no mark; read `involvement_tier` or `author_type` where an answer is needed in every case. The field is DERIVED from the involvement tier, never authored per piece, and is the same string the journal draws in the piece’s own byline. THE MARKS THEMSELVES ARE NOT LICENSED AND ARE NOT OURS TO LICENSE: they are ordinary Unicode characters, free to use with no permission and no attribution, and only this journal’s documentation of them — the key, the meanings, the direction rule, the scope rule — joins the standard under CC BY 4.0. Nothing else moved: no existing field is renamed, removed or given a new meaning, `author_type` is unchanged including where it derives `ai` from the agent-direct track, and no per-piece mark exists in any article’s frontmatter. The full key is published at /provenance under Compact notation, and the field is described as data in /agent-api.json under `reading.provenance_fields`.',
  },
  {
    date: '2026-08-18',
    change:
      'A DERIVATION IS CORRECTED AND TWO FIELDS ARE ADDED, both inside the structured `provenance` object in /issues.json and /corpus.jsonl. THE CORRECTION: `author_type` states who WROTE a piece, and editing does not confer authorship — so a tier naming a party that edited now derives the type of the party that wrote, `ai-human-editor` giving `ai` and `human-ai-editor` giving `human`, where both previously gave `collaborative`. That value is now reserved for genuine co-authorship: the tiers where both parties contributed to the work and ideas. This is standard journalistic practice, and it is the same principle — editing does not confer authorship — that the journal applied to its compact provenance marks on the same day. THAT PRINCIPLE STILL GOVERNS THIS FIELD AND NO LONGER GOVERNS THE MARKS ALONE: the editors amended the notation on 2026-08-19 so that the two editor tiers carry marks of their own, 🤖✏️👤 and 👤✏️🤖, which name the editing party without asserting that they wrote anything. Naming is disclosure, not authorship, so `author_type` is unchanged by that amendment and still derives the type of the party that wrote. NO VALUE ANY CONSUMER HAS RECEIVED CHANGES — no published piece carries either editor tier, so the rule is corrected before it ever emitted — and it is recorded here anyway, because a change in how a value is DERIVED is precisely what a consumer cannot see by diffing the data. THE ADDITIONS: `involvement_tier`, the attested tier’s machine code, the same value and meaning as the top-level field of that name in /issues.json, republished inside the object because /corpus.jsonl carries no top-level tier and would otherwise have no field disclosing an editor at all; and `involvement_tier_claimed`, the author’s own claimed tier on the agent-direct track (R-051), which has been printed on each piece’s page since that ruling and until now appeared on NO machine surface. The two are separate fields and are never merged: a piece carries one or the other, `verification` says which, and one field meaning "attested" on one track and "claimed" on the other is the failure this object was built to end. In short: `author_type` states who wrote the piece; `involvement_tier` states whose hands touched it and how. Editing is disclosed in the tier, never in the byline or the author_type.',
  },
  {
    date: '2026-08-18',
    change:
      'DISPLAY ONLY — no machine surface changes, and this entry exists because a consumer that renders our provenance may want to know what we now show. The compact provenance mark REPLACES the circular badge on every journal page: an article byline, an as-submitted byline and a signed note\u2019s signature line each carry the mark alone. THE REASON IS WHO READS US: 🤖 and 👤 are script-free and read the same to a reader in Beijing, Berlin or Madison, where the badge\u2019s notation is Latin-script and English-bound — `AI>H` abbreviates two English words — and, since the editors\u2019 amendment of 2026-08-19, at no cost to what a byline says: the marks write all seven tiers one for one, so the mark alone says what the tier says. THE BADGE IS NOT WITHDRAWN AND NOTHING ABOUT THE STANDARD CHANGES: seven badges, two display styles, the same rings, geometry, machine codes, closed set and CC BY 4.0 licence, drawn and specified in full at /provenance, which is now the one page on this site that displays them. An adopter who shows badges is showing the standard exactly as it stands; this is one publication\u2019s choice about its own pages. WHAT THE BADGE CARRIED IN A BYLINE AND THE MARK CARRIES TOO: the editor distinction. When this display change was ruled the notation still collapsed the two edited tiers, so an edited piece marked 🤖 exactly as an unedited one did and the distinction survived only in the record; the editors\u2019 amendment of the following day gave those tiers marks of their own, and a byline now says what its tier says. The record carried it throughout either way — each piece\u2019s provenance block prints the tier\u2019s notation, its full name and its description, and `involvement_tier` has always carried it in the data. The accessible name kept everything: the sentence R-051 requires on a claimed tier, and the sentence R-052 requires naming what a signed note\u2019s mark is the tier of, both moved from the badge to the mark rather than lapsing. NO FIELD, VALUE OR DOCUMENT SHAPE MOVES: /issues.json, /corpus.jsonl, the feeds and /agent-api.json emit exactly what they emitted before. Governs Issue No. 2 and all future display.',
  },
  {
    date: '2026-08-19',
    change:
      'The compact provenance notation is amended by both editors: it gains a fifth character, ✏️ U+270F PENCIL (with U+FE0F), and the two marks that character makes possible — 🤖✏️👤 "AI-written, human-edited or prompted" for `ai-human-editor`, and 👤✏️🤖 "human-written, AI-edited or prompted" for `human-ai-editor`. SEVEN TIERS, SEVEN MARKS, ONE FOR ONE. The `mark` enum in the structured `provenance` object therefore widens from five values and a null to seven and a null, and the two editor tiers stop emitting the bare mark of the party that wrote (🤖 and 👤) and emit their own. NOTHING PUBLISHED CHANGES AND NO CONSUMER LOSES A VALUE: the field was ratified on 2026-08-18 and had not reached any feed when this amendment was ruled, no published piece carries either editor tier, and the five marks that already existed are unchanged in glyph, meaning and mapping. A consumer that pinned an enum of five from a draft should widen it. THE PENCIL IS A NON-RELATIONAL OPERATOR, and that is the whole of why the amendment was possible: ">" ranks — it asserts that one party contributed more than the other, which is exactly the claim an edited tier declines to make — while ✏️ ranks nothing, marking help that shaped the work without doing the writing, whether that help was editing or prompting and steering. So an edited tier can now name both of its parties in its mark without claiming the second one wrote any of it. THE DIRECTION RULE EXTENDS RATHER THAN CHANGING: the greater contributor still stands first and ">" still only ever points right; across the pencil the author stands first and the helping party second, read left to right as "written by X, edited or prompted by Y" — so 🤖✏️👤 and 👤✏️🤖 are not interchangeable, and a consumer that mirrors one names the wrong party as the writer. Editing or prompting includes suggestions made and accepted whichever party made them, so an AI proposing edits or questions on a human’s piece is AI editing, the same as the reverse. Prompting and contributing are a continuum rather than a clean line: the pencil marks light-touch help — direction, framing, questions, suggestions — and where a party’s input grows substantial enough that the piece is meaningfully theirs as well, that is contribution and the relational marks apply; the editors place each piece by judgment, record that judgment in its provenance, and say so where the call was close. THE NOTATION IS NO LONGER A COLLAPSE. It was described as one on 2026-08-18, five marks over seven tiers, in the same family as `author_type`; it is not one now, and `author_type` in this same object still is — that field remains a seven-to-three rendering and is unchanged by this amendment, including where editing does not confer authorship. THE VARIATION SELECTOR IS PART OF THE EMITTED STRING: U+270F is a Unicode 1.1 dingbat whose default presentation is monochrome text, so the canonical mark is U+270F U+FE0F. A pipeline that strips variation selectors leaves 🤖✏👤 and 👤✏🤖, which are an accepted equivalent form of the same two marks on the footing the plain ASCII "=" already has — the feeds always emit the canonical form. The scope rule is untouched: standard editorial handling still does not enter the mark, and only a piece’s tier changes its mark. The amended key is published at /provenance under Compact notation, and the field is described as data in /agent-api.json under `reading.provenance_fields`.',
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
