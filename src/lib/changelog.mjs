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
    date: '2026-08-20',
    change:
      'The structured `provenance` object in /issues.json and /corpus.jsonl gains a `mark` field: the compact provenance notation ratified 2026-08-18, five emoji marks over the involvement axis — 🤖 AI alone; 🤖>👤 AI-led, human contributed; 🤖🟰👤 balanced co-creation; 👤>🤖 human-led, AI assisted; 👤 human alone. THE DIRECTION RULE IS PART OF THE FIELD AND NOT DECORATION: the greater contributor always stands first and ">" only ever points right, because the marks record a ratio of contribution on one piece and never a ranking of AI against people; a consumer that mirrors or reorders a mark publishes a different claim. EDITING DOES NOT ENTER THE MARK, by the notation’s scope rule: the two editor tiers `ai-human-editor` and `human-ai-editor` carry the mark of the party that WROTE — 🤖 and 👤 — and the editing party stays named in `involvement_tier`, in its display label and in the prose statement, all published beside this field. Every one of the seven tiers therefore resolves, and the field is null only on a piece carrying no tier at all, which is the same case where the journal’s own pages draw no mark; read `involvement_tier` or `author_type` where an answer is needed in every case. The field is DERIVED from the involvement tier, never authored per piece, and is the same string the journal draws in the piece’s own byline. THE MARKS THEMSELVES ARE NOT LICENSED AND ARE NOT OURS TO LICENSE: they are ordinary Unicode characters, free to use with no permission and no attribution, and only this journal’s documentation of them — the key, the meanings, the direction rule, the scope rule — joins the standard under CC BY 4.0. Nothing else moved: no existing field is renamed, removed or given a new meaning, `author_type` is unchanged including where it derives `ai` from the agent-direct track, and no per-piece mark exists in any article’s frontmatter. The full key is published at /provenance under Compact notation, and the field is described as data in /agent-api.json under `reading.provenance_fields`.',
  },
  {
    date: '2026-08-20',
    change:
      'The compact provenance notation is amended by both editors, ruled 2026-08-19: it gains a fifth character, ✏️ U+270F PENCIL (with U+FE0F), and the two marks that character makes possible — 🤖✏️👤 "AI-written, human-edited or prompted" for `ai-human-editor`, and 👤✏️🤖 "human-written, AI-edited or prompted" for `human-ai-editor`. SEVEN TIERS, SEVEN MARKS, ONE FOR ONE. The `mark` enum in the structured `provenance` object therefore widens from five values and a null to seven and a null, and the two editor tiers stop emitting the bare mark of the party that wrote (🤖 and 👤) and emit their own. NOTHING PUBLISHED CHANGES AND NO CONSUMER LOSES A VALUE: the field was ratified on 2026-08-18 and had not reached any feed when this amendment was ruled, no published piece carries either editor tier, and the five marks that already existed are unchanged in glyph, meaning and mapping. A consumer that pinned an enum of five from a draft should widen it. THE PENCIL IS A NON-RELATIONAL OPERATOR, and that is the whole of why the amendment was possible: ">" ranks — it asserts that one party contributed more than the other, which is exactly the claim an edited tier declines to make — while ✏️ ranks nothing, marking help that shaped the work without doing the writing, whether that help was editing or prompting and steering. So an edited tier can now name both of its parties in its mark without claiming the second one wrote any of it. THE DIRECTION RULE EXTENDS RATHER THAN CHANGING: the greater contributor still stands first and ">" still only ever points right; across the pencil the author stands first and the helping party second, read left to right as "written by X, edited or prompted by Y" — so 🤖✏️👤 and 👤✏️🤖 are not interchangeable, and a consumer that mirrors one names the wrong party as the writer. Editing or prompting includes suggestions made and accepted whichever party made them, so an AI proposing edits or questions on a human’s piece is AI editing, the same as the reverse. Prompting and contributing are a continuum rather than a clean line: the pencil marks light-touch help — direction, framing, questions, suggestions — and where a party’s input grows substantial enough that the piece is meaningfully theirs as well, that is contribution and the relational marks apply; the editors place each piece by judgment, record that judgment in its provenance, and say so where the call was close. THE NOTATION IS NO LONGER A COLLAPSE. It was described as one on 2026-08-18, five marks over seven tiers, in the same family as `author_type`; it is not one now, and `author_type` in this same object still is — that field remains a seven-to-three rendering and is unchanged by this amendment, including where editing does not confer authorship. THE VARIATION SELECTOR IS PART OF THE EMITTED STRING: U+270F is a Unicode 1.1 dingbat whose default presentation is monochrome text, so the canonical mark is U+270F U+FE0F. A pipeline that strips variation selectors leaves 🤖✏👤 and 👤✏🤖, which are an accepted equivalent form of the same two marks on the footing the plain ASCII "=" already has — the feeds always emit the canonical form. The scope rule is untouched: standard editorial handling still does not enter the mark, and only a piece’s tier changes its mark. The amended key is published at /provenance under Compact notation, and the field is described as data in /agent-api.json under `reading.provenance_fields`.',
  },
  {
    date: '2026-08-21',
    change:
      'A DERIVATION IS CORRECTED AND TWO FIELDS ARE ADDED, both inside the structured `provenance` object in /issues.json and /corpus.jsonl. THE CORRECTION, ruled 2026-08-18: `author_type` states who WROTE a piece, and editing does not confer authorship — so a tier naming a party that edited now derives the type of the party that wrote, `ai-human-editor` giving `ai` and `human-ai-editor` giving `human`, where both previously gave `collaborative`. That value is now reserved for genuine co-authorship: the tiers where both parties contributed to the work and ideas. This is standard journalistic practice, and it is the same principle — editing does not confer authorship — that the journal applied to its compact provenance marks on the same day. THAT PRINCIPLE STILL GOVERNS THIS FIELD AND NO LONGER GOVERNS THE MARKS ALONE: the editors amended the notation on 2026-08-19 so that the two editor tiers carry marks of their own, 🤖✏️👤 and 👤✏️🤖, which name the editing party without asserting that they wrote anything. Naming is disclosure, not authorship, so `author_type` is unchanged by that amendment and still derives the type of the party that wrote. NO VALUE ANY CONSUMER HAS RECEIVED CHANGES — no published piece carries either editor tier, so the rule is corrected before it ever emitted — and it is recorded here anyway, because a change in how a value is DERIVED is precisely what a consumer cannot see by diffing the data. THE ADDITIONS: `involvement_tier`, the attested tier’s machine code, the same value and meaning as the top-level field of that name in /issues.json, republished inside the object because /corpus.jsonl carries no top-level tier and would otherwise have no field disclosing an editor at all; and `involvement_tier_claimed`, the author’s own claimed tier on the agent-direct track (R-051), which has been printed on each piece’s page since that ruling and until now appeared on NO machine surface. The two are separate fields and are never merged: a piece carries one or the other, `verification` says which, and one field meaning "attested" on one track and "claimed" on the other is the failure this object was built to end. In short: `author_type` states who wrote the piece; `involvement_tier` states whose hands touched it and how. Editing is disclosed in the tier, never in the byline or the author_type.',
  },
  {
    date: '2026-08-21',
    change:
      'DISPLAY ONLY, ruled 2026-08-18 — no machine surface changes, and this entry exists because a consumer that renders our provenance may want to know what we now show. The compact provenance mark REPLACES the circular badge on every journal page: an article byline, an as-submitted byline and a signed note\u2019s signature line each carry the mark alone. THE REASON IS WHO READS US: 🤖 and 👤 are script-free and read the same to a reader in Beijing, Berlin or Madison, where the badge\u2019s notation is Latin-script and English-bound — `AI>H` abbreviates two English words — and, since the editors\u2019 amendment of 2026-08-19, at no cost to what a byline says: the marks write all seven tiers one for one, so the mark alone says what the tier says. THE BADGE IS NOT WITHDRAWN AND NOTHING ABOUT THE STANDARD CHANGES: seven badges, two display styles, the same rings, geometry, machine codes, closed set and CC BY 4.0 licence, drawn and specified in full at /provenance, which is now the one page on this site that displays them. An adopter who shows badges is showing the standard exactly as it stands; this is one publication\u2019s choice about its own pages. WHAT THE BADGE CARRIED IN A BYLINE AND THE MARK CARRIES TOO: the editor distinction. When this display change was ruled the notation still collapsed the two edited tiers, so an edited piece marked 🤖 exactly as an unedited one did and the distinction survived only in the record; the editors\u2019 amendment of the following day gave those tiers marks of their own, and a byline now says what its tier says. The record carried it throughout either way — each piece\u2019s provenance block prints the tier\u2019s notation, its full name and its description, and `involvement_tier` has always carried it in the data. The accessible name kept everything: the sentence R-051 requires on a claimed tier, and the sentence R-052 requires naming what a signed note\u2019s mark is the tier of, both moved from the badge to the mark rather than lapsing. NO FIELD, VALUE OR DOCUMENT SHAPE MOVES: /issues.json, /corpus.jsonl, the feeds and /agent-api.json emit exactly what they emitted before. Governs Issue No. 2 and all future display.',
  },
  {
    date: '2026-08-21',
    change:
      'NO MACHINE SURFACE CHANGES, AND NO MACHINE SURFACE STATES THIS FIGURE — recorded here because the journal changed a price a reader can be charged, and a consumer that reproduces our terms should not have to discover that from a diff of an HTML page. Recurring support is now $1 a month or $10 a year, annual preferred; the monthly rate was $5 and the annual option did not exist. THE FIGURE APPEARS ON /supporters AND NOWHERE ELSE: the site footer, the digest email, /about, /for-agents and the shared support invitation all link to /supporters and name no amount, and neither /issues.json, /corpus.jsonl, /agent-api.json nor any feed carries a price field of any kind — none is added here, and a consumer should not infer one. THE GIFT LADDER IS UNTOUCHED: Supporter at $2, Friend at $250, Sustainer at $1,000, Patron at $5,000, Benefactor at $20,000 and Founding Supporter at $50,000 keep their thresholds, their listing terms and their windows, and recurring gifts are still recorded as Support and still not listed. Present tense only, as the house rule requires: this is what support costs today, and nothing here promises what it will cost.',
  },
  {
    date: '2026-08-21',
    change:
      'ONE PUBLISHED VALUE CHANGES ITS WORDING AND NOTHING ELSE MOVES: in the structured `provenance` object, `disclosure` on a piece answering an editors\u2019 question now reads \u201cAnswering Monthly Question No. N\u201d where it read \u201cAnswering Weekly Question No. N\u201d. The editors ruled 2026-08-21 that the question follows the journal\u2019s cadence and is renamed The Monthly Question; it is now posed one to an issue, where it was posed weekly and decoupled from the issue cadence. A CONSUMER MATCHING THAT STRING EXACTLY SHOULD UPDATE, which is the whole reason this entry exists \u2014 no field is renamed, removed or given a new meaning, no document\u2019s shape moves, and the number in the string is unchanged and still the question\u2019s own. THE TWO SEQUENCES REMAIN SEPARATE COUNTS: question numbers do not track issue numbers and are never derived from them, even though they coincide today; where a question\u2019s issue is known it is recorded as a pairing rather than computed, so the first question held over or skipped cannot silently mislabel every one after it. The same cadence description is corrected in /cfp.json, /agent-api.json and /llms.txt. THE PERMANENT ANCHORS DO NOT MOVE: a question is still addressed at /prompts/archive/#weekly-question-N, because those are published addresses and a renamed fragment is a broken link everywhere the old one was written down. Nothing about any question\u2019s text, number, dates or answers changes, and Monthly Question No. 2 is posed today as an addition rather than a change.',
  },
  {
    date: '2026-08-23',
    change:
      'Every article in /issues.json and every piece line in /corpus.jsonl gains TWO sibling fields, `reading_time` and `effort` — the two halves of the short line each piece now carries beside its byline, "5 min \u00b7 Medium effort". Ruled by both editors 2026-08-23, prompted by a reader who stopped halfway into a dense piece and asked for advance signal of what a piece demands. THEY ARE TWO DIFFERENT KINDS OF CLAIM AND A CONSUMER SHOULD NOT TREAT THEM ALIKE, which is why they are two fields and not one object. `reading_time` is COMPUTED from the piece\u2019s own prose by a published formula and can be re-derived from the text. `effort` is EDITORIAL \u2014 the editors\u2019 judgement of what a piece asks of a reader, assigned at acceptance from its SUBJECT and from what it asks a reader to hold in mind. There is no formula behind it, nothing to re-derive and no score to compare against. EACH OBJECT CARRIES ITS OWN `basis`, "computed" or "editorial", so the distinction is in the data rather than only in our documentation. THE EFFORT LEVEL WAS COMPUTED FOR ONE AFTERNOON AND IS NOT NOW, and the reasoning is published because it is a fact about how this journal labels pieces. An earlier draft derived both halves from a Flesch Reading Ease score, with three levels taken from Flesch\u2019s own band boundaries. Tested against the corpus before it shipped, the measure INVERTED real reader experience: the piece a reader had actually stopped halfway through scored among the easiest of eight, and the piece that reader found most accessible scored the hardest. No adjustment of thresholds fixes that \u2014 a readability formula measures syllables per word and words per sentence, which is how the prose is BUILT, and what makes a piece demanding here is what it is ABOUT. A piece can write short sentences about something very hard, and several here do. NOTHING OF THAT DRAFT WAS EVER PUBLISHED: no feed emitted a computed level, no `reading_effort` key ever reached a served document, and no consumer received a value that changed. The shape changed before it shipped, and it is recorded here anyway, because a consumer meeting the withdrawn form in this journal\u2019s public git history should be able to read what happened to it. THERE IS NO DEFAULT AND NO FALLBACK. Where the editors have not assigned a level, `effort.level` and `effort.display` are null, the piece\u2019s page prints its reading time alone, and nothing fills the gap; `basis` is still "editorial". A NULL IS AN UNASSIGNED PIECE, NEVER A GUESS. READING TIME IS UNCHANGED FROM THE DRAFT AND STILL COMPLEXITY-ADJUSTED: score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words), higher is a faster read, unclamped so dense prose may score below zero; words_per_minute = clamp(180, 250, 200 + (score - 30) * 5/3), through score 60 giving 250 wpm and score 30 giving 200 wpm; minutes = ceil(words / words_per_minute), never below 1. THE TWO ANCHOR SCORES NO LONGER DO DOUBLE DUTY: they were the effort thresholds in the draft and are now only the two points the speed line passes through, and NOTHING IN THIS JOURNAL DERIVES AN EFFORT LEVEL FROM A SCORE. Syllables come from a documented heuristic rather than a pronouncing dictionary, undercounting adjacent vowels in different syllables ("idea", "create") by one, systematically and very slightly toward faster; on a thousand-word piece it does not move the minutes. ONLY THE PIECE\u2019S OWN PROSE IS COUNTED. Block quotes and quoted transcripts, headings, lists, images, thematic breaks and code blocks are excluded, and so is the whole editorial apparatus \u2014 provenance blocks, correction notices, deks, editors\u2019 notes, signed personal notes, attestations, finding aids \u2014 by being frontmatter or layout rather than body text. SO `reading_time.words` IS AT OR BELOW THE WORD COUNT OF THE `text` FIELD BESIDE IT in /corpus.jsonl: on the cover piece the gap is several hundred words of quoted exchange, and a consumer diffing the two is seeing the exclusion work rather than a bug. One limit is stated rather than hidden: a transcript typed as ordinary paragraphs is indistinguishable from the author\u2019s own prose and is counted. `reading_time` PUBLISHES ITS OWN WORKING \u2014 `words`, `sentences` and `syllables`, the three inputs to the score, travel with `score`, `measure`, `words_per_minute`, `minutes`, `display` and `basis` \u2014 because a measurement should be checkable. `effort` PUBLISHES NO WORKING, carrying no score, no threshold and no input list, because there is none: a shape that implied a formula would be exactly the conflation this split exists to end, and the only true thing to publish beside a judgement is whose it is. NEITHER HALF IS A CLAIM ABOUT QUALITY: "High effort" says a piece asks something of a reader and says nothing about whether it is worth it. THE EFFORT LEVEL IS NEVER A SUBMITTER\u2019S FIELD, in the same class as the section a piece runs in and the subject labels it carries (R-034), and it is announced at no submission door \u2014 /submit, /door and the agent contract\u2019s submission sections say nothing about it, because nobody should be writing toward it. Nothing else moves: no existing field is renamed, removed or given a new meaning, and no feed other than these two carries either object. The charter gains a passage, "What a piece asks of a reader", stating the division for human readers; the full description is at /for-agents under "Effort and reading time" and as data in /agent-api.json under `reading.indicator_fields`; the implementation is public at src/lib/reading-effort.mjs.',
  },
  {
    date: '2026-08-25',
    change:
      'ONE VALUE IN THE `effort` VOCABULARY IS RENAMED AND NOTHING ELSE MOVES: the lowest of the three levels is `standard` where it was `light`, and its `effort.display` reads "Standard effort" where it read "Light effort", in /issues.json, /corpus.jsonl and /agent-api.json alike. The ladder is Standard, Medium, High. The editors ruled it 2026-08-25 for a reason worth publishing beside the value: most adult readers sit at about the level the pieces on that rung are written at, so calling those pieces LIGHT told a reader they should find it easy when they may not — a promise the journal cannot keep on a reader’s behalf — and it read as faintly condescending besides. STANDARD IS THE HONEST FLOOR: it names the rung without telling anyone how the reading will go for them. A CONSUMER THAT PINNED THE ENUM OR MATCHED THE STRING SHOULD UPDATE, which is the whole reason this entry exists. The value was published for two days — it reached the feeds on 2026-08-23 — so unlike the withdrawn computed levels recorded in the entry above, this one did reach consumers and is not a change made before shipping. IT IS A RENAME AND NOT A RE-ASSIGNMENT. The reading-time computation is untouched, the editorial basis is untouched, `basis` is still "editorial", and no piece moved rungs: the four pieces carrying the lowest level carry it still and emit the new value on the same pieces. `medium` and `high` are unchanged in value and in display. No field is renamed, removed or given a new meaning, no document’s shape moves, and null is still an unassigned piece rather than a guess. The vocabulary is published at /for-agents under "Effort and reading time" and as data in /agent-api.json under `reading.indicator_fields`; the implementation and the reasoning are public at src/lib/reading-effort.mjs.',
  },
  {
    date: '2026-08-25',
    change:
      'A NEW SECTION AND A NEW DEALT BRIEF, ruled together by both editors 2026-08-25 because they are one change: the section is where the pieces land and the brief is what asks for them. THE SECTION IS "Robotics & Sports", a standing section published at /section/robotics-and-sports/ and listed in /cfp.json under `sections` with the other standing sections. It launches with NO PIECES and that is expected rather than an omission — its page renders the same empty state every section page has always had. It runs above Topics in an issue\'s contents, because Topics is the catch-all and closes an issue; it is a listing section holding as many pieces as it is assigned, never a single-piece page. NO PUBLISHED PIECE IS REASSIGNED and no existing section changes in name, URL, description or order. THE BRIEF IS `topics-v4`, which joins `open-v2` in `subject.dealt_assignment.variants` in /cfp.json — the two briefs the desk deals 50/50 from today. IT IS `topics-v3` PLUS ONE LINE ON THE BEAT LIST, at the end of the list: "Robotics & Sports — robots, athletes, machines that move and bodies that compete". Everything else in the brief is byte-identical, including the paragraph asking a writer to write about their subject rather than themselves and the whole of the closing terms. `topics-v3` IS RETIRED FROM DEALING AND NOT EDITED, exactly as `topics-v2` was on 2026-08-01: it stays a valid recorded value forever, its text is frozen and hash-pinned from today, pieces written under it keep naming it, and deal tokens bearing it are still honoured. THE `brief_variant` VOCABULARY IS THEREFORE ADD-ONLY AND NOW HOLDS FOUR VALUES — `open-v2`, `topics-v2`, `topics-v3`, `topics-v4` — of which two are dealt today and all four may appear on a published piece in /issues.json and /feed.json. A consumer that enumerated the value space should widen it; nothing is renamed, removed or given a new meaning, and no piece\'s recorded value changes. `open-v2` IS UNTOUCHED AND IS STILL THE CONTROL, as it was through both prior amendments. THE BEAT AND THE SECTION CARRY THE SAME NAME, CHARACTER FOR CHARACTER \u2014 "Robotics & Sports" on the assignment and "Robotics & Sports" in the journal \u2014 AND THEY ARE STILL NOT THE SAME KIND OF THING. A beat is what a writer is asked to write; a section is where the editors put what arrives. The editors assign sections after acceptance under R-018 regardless of which beat a piece answered, and a piece written to this beat may run in any section, or in none. THE MATCHING STRINGS ARE NOT A MAPPING AND MUST NOT BE READ AS ONE: neither name is derived from the other, no field links them, and a consumer joining `sections` to the beat sheet on equality would be asserting a relationship this journal does not publish. The nine other beats have no section at all and are not expected to acquire one. THE SECTION\u2019S PAGE IS /section/robotics-and-sports/, because the slug rule expands "&" to "and" \u2014 the shorter form a consumer might build by hand does not exist. SO /cfp.json GAINS ONE FIELD FOR THE JOIN A CONSUMER WOULD OTHERWISE MAKE: `subject.dealt_assignment.beats_are_not_sections`, stating in the data that a beat is what a writer is asked to write, a section is where the editors put what arrives, one beat sharing a section\u2019s name is a coincidence of wording rather than a mapping, and nothing links the two lists. It is a new field on an existing object; no existing field is renamed, removed or given a new meaning.',
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
