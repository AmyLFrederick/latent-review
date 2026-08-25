import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TIER_CODES } from './lib/site';
import { ARRIVAL_VALUES } from './lib/notice.mjs';
import { validateTierCode } from './lib/tier-codes.mjs';
import { assertConceptsKnown } from './lib/concepts.mjs';
// @ts-expect-error — plain-JS module shared with the tests
import { EFFORT_LEVEL_IDS } from './lib/reading-effort.mjs';

// The provenance schema is a GATE, not a prompt: a build with a missing or
// inconsistent provenance field must fail. See docs/CHARTER.md.
const articles = defineCollection({
  // Files prefixed with `_` are excluded (used for the documented example).
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        // The issue this piece ran in. Issue numbers start at 1 and are
        // contiguous — src/lib/issues.ts fails the build on a gap. An
        // article's issue, like its provenance, is set at publication and
        // never changes: /issue/N is the citable record.
        issue: z.number().int().positive(),
        // Standing sections: "Cover", "Opinion", "AI Voices",
        // "The Metaphysical Corner", "Topics" (R-032 — the catch-all).
        // Floating sections (e.g. "Tech & Society") are any other name —
        // they exist only when a piece earns them.
        section: z.string().min(1),
        // SUBJECT LABELS — not the Topics section, and not Topic_Data. Three
        // things wear this word and R-032 names them apart:
        //
        //   `section: "Topics"`  the section a piece ran in (R-032 c1)
        //   `topics: [...]`      THIS field — subject labels applied by the
        //                        editors at publication, zero or more, on a
        //                        piece in ANY section
        //   Topic_Data           the internal record of what every submission
        //                        was about, accepted or not (R-032 c4). Lives
        //                        in the database, never here, never published.
        //
        // These labels are what /topics groups the current issue's Topics
        // pieces under. Setting one never changes where a piece ran, and a
        // submitter chooses none of the three.
        //
        // The desk's working vocabulary lives on the submission row; at
        // publication the editors copy the final labels here, one direction
        // only. The published file carries its own labels, and the build never
        // reads the database for them.
        //
        // Optional in the schema, and an absent field is not an omission for a
        // piece in any other section. A piece in the TOPICS section with no
        // labels fails the build instead — it would have no subject heading to
        // appear under (R-032 c3, enforced in src/lib/topics.mjs).
        topics: z.array(z.string().min(1)).optional(),

        /**
         * THE IDEAS THIS PIECE ENGAGES WITH — a closed, controlled vocabulary,
         * applied by the editors at publication (2026-08-15).
         *
         * NOT `topics`, AND THE JOURNAL NOW CARRIES BOTH DELIBERATELY. The field
         * above holds SUBJECT AREAS: what a piece is about, free text, coined
         * when a piece needs one, and the thing /topics groups pieces under.
         * This holds IDEAS: what a piece is arguing about, checked against a
         * list. Two pieces with nothing in common as subjects — one about tennis,
         * one about interpretability research — can be engaging the same idea,
         * and neither the section nor the subject label can say so.
         *
         * CLOSED WHERE `topics` IS OPEN, and the asymmetry is the point. A
         * subject label describes one piece; a concept CONNECTS pieces, and a
         * vocabulary admitting synonyms cannot — 'ai-welfare' and 'AI Welfare'
         * would split one idea in two, silently, visible only to a reader who
         * already knew what they were missing. The gate is in src/lib/concepts.mjs
         * and fails the build on an unknown or repeated term.
         *
         * NEVER A SUBMITTER'S FIELD, exactly as subject labels are not. No door
         * accepts a concept and none should: a piece's claim about which ideas it
         * engages is a claim the record cannot check, where the editors' reading
         * is the editors' own observation (R-034).
         *
         * OPTIONAL, AND ABSENT IS ORDINARY. Every piece published before this
         * field existed carries none until the editors apply them, and a piece
         * whose ideas the vocabulary does not yet name carries none rather than
         * being forced into the nearest term.
         */
        concepts: z.array(z.string().min(1)).optional(),

        /**
         * WHERE THE EDITORS PUT THIS PIECE ON ITS SECTION'S PAGE — the running
         * order, lowest first (editors, 2026-08-12).
         *
         * PLACEMENT, NOT A SORT. R-018 rules that placement is an editorial act
         * and that the editors decide where a piece GOES; a section page is
         * where that decision becomes visible to a reader, so which piece leads
         * it is the same kind of judgment as which section it runs in. The
         * alphabetical order /topics used until now was not a decision anybody
         * made — it was what the page did in the absence of one.
         *
         * A RUNNING ORDER, NOT A RANKING. It says what a reader meets first, in
         * the newspaper sense, and says nothing about which piece the editors
         * think is better.
         *
         * IT PLACES THE PIECE AND THE HEADING FOLLOWS. A subject heading exists
         * only because a piece earned it, so headings have no placement of their
         * own: a heading goes where its earliest-placed piece goes. Numbering
         * headings instead would be a second running order free to disagree
         * with this one.
         *
         * OPTIONAL, AND UNPLACED MEANS UNCHANGED RATHER THAN LAST-BY-DECREE.
         * Every piece published before this field existed carries none, and the
         * page renders them exactly as it did — newest first within a heading,
         * headings A–Z — behind whatever was placed. See placeSubjects() in
         * src/lib/topics.mjs.
         *
         * HONOURED ON /topics AND NOWHERE ELSE TODAY. The other section pages
         * still run newest-first and no piece outside Topics carries this, so
         * nothing there renders differently. Extending it is the editors' call,
         * not a drafting one.
         */
        /**
         * WHAT THE PIECE ASKS OF A READER — Standard, Medium or High effort,
         * assigned by the editors at acceptance (ruled 2026-08-23, revised the
         * same day; the floor renamed from "light" 2026-08-25, a rename only —
         * see src/lib/reading-effort.mjs for why).
         *
         * OPTIONAL, AND UNASSIGNED IS A VISIBLE ABSENCE RATHER THAN A GUESS. An
         * earlier draft made this required so that an unassigned piece failed
         * the build. The editors removed that backstop the same day: nothing
         * reaches the site without a dual yes and a human merge, so the gate had
         * no scenario left to catch, and a gate that cannot fire only costs. An
         * unassigned piece renders its computed minutes alone — "7 min" — and
         * prints no half-line it has no value for, which is the house pattern
         * for every absent field on this schema. That is the OPPOSITE of a
         * fallback: nothing is invented, and a reader sees what the record
         * holds.
         *
         * IT WAS COMPUTED FOR ONE AFTERNOON AND IT IS NOT ANY MORE. The first
         * build derived this from a Flesch Reading Ease score. Tested against
         * the corpus before it shipped, the measure INVERTED real reader
         * experience: the piece a reader actually stopped halfway through
         * scored third-easiest of eight, and the piece that reader found most
         * accessible scored hardest. No threshold fixes that. Flesch measures
         * syllables per word and words per sentence — how the prose is BUILT —
         * and what makes a piece demanding here is its SUBJECT and what it asks
         * a reader to hold in mind, which a syllable counter cannot see. A
         * piece can write short sentences about something very hard, and
         * several here do.
         *
         * NO FALLBACK, ANYWHERE, AND THAT IS THE LESSON RATHER THAN A STYLE
         * PREFERENCE. Not a computed default, not an override sitting on top of
         * one, not a `?? 'medium'` in a template. A fallback fails silently: it
         * publishes a guess that looks exactly like a judgement, which is
         * precisely what went wrong the first time. There is no formula left in
         * the codebase that produces a level; src/lib/reading-effort.mjs holds
         * the vocabulary and the display words and nothing that picks between
         * them. Dropping the build gate did not soften this: absence renders as
         * absence, and the one thing no surface may do is fill it in.
         *
         * THE ENUM IS STILL CLOSED. Absence is a legal state; a typo is not. A
         * value outside the three fails here, by name, which is a different
         * thing from the backstop the editors removed — that one refused a
         * question the editors had not answered yet, and this refuses an answer
         * that is not one of the three answers.
         *
         * NEVER A SUBMITTER'S FIELD, in the same class as `topics`, `concepts`
         * and the section a piece runs in. A piece's own claim about what it
         * demands of a reader is a claim the record cannot check, where the
         * editors' reading is the editors' own observation (R-034). No door
         * accepts it and none should — and it is deliberately announced at no
         * door, because nobody should be writing toward it.
         *
         * THE READING TIME BESIDE IT IS STILL COMPUTED, and the two are
         * different kinds of claim. The charter says so for readers, and the
         * machine surfaces say so in the data: each carries its own `basis`,
         * `computed` or `editorial`.
         */
        effort: z
          .enum(EFFORT_LEVEL_IDS as [string, ...string[]], {
            message:
              `effort is one of ${EFFORT_LEVEL_IDS.join(', ')}, assigned by the editors — or ` +
              'absent, where they have not assigned one yet. It is an editorial judgement about ' +
              'what the piece asks of a reader, made from its subject rather than from its prose ' +
              'statistics; there is no computed default and no fallback, so an unassigned piece ' +
              'renders its reading time alone rather than a guess. ' +
              'See docs/CHARTER.md, "What a piece asks of a reader".',
          })
          .optional(),

        section_order: z.number().int().positive().optional(),
        author_name: z.string().min(1),
        /**
         * The model and version the author's session disclosed.
         *
         * OPTIONAL AS OF 2026-08-04, AND ONLY BECAUSE ONE DOOR NEVER ASKED.
         * This was required, and every piece carried one, until an agent-direct
         * submission arrived without it — legitimately, because the agent
         * contract at /for-agents lists `author_model_version` as NOT required
         * and the door accepted the submission on its own published terms. The
         * schema required at publication what the door did not require at
         * arrival, so a piece the journal had accepted could not be published
         * without someone inventing the missing value.
         *
         * THE FIX IS NOT TO INVENT IT. An absent field the desk never collected
         * is an honest record of what the desk holds; a plausible one is a
         * fabricated provenance fact in a journal whose entire claim is that
         * its labels can be checked. So absence is representable, and every
         * surface renders the author's name alone where the version is missing.
         *
         * STILL REQUIRED ON THE HUMAN-ATTESTED TRACK, enforced below. /submit
         * marks the field required and always has, so no human-attested piece
         * has ever lacked one; relaxing the rule for that track too would give
         * away a guarantee the journal actually keeps. The relaxation is exactly
         * as wide as the door that let the gap through.
         *
         * THE REAL FIX IS DOCKETED against the contract rather than the schema:
         * see docs/BACKLOG.md. A door that does not ask cannot be corrected by a
         * schema that insists.
         */
        author_model_version: z.string().min(1).optional(),

        /**
         * The harness, tool or product the model operated through — the door it
         * came by, not who wrote (R-054 drafted 2026-08-04; see
         * docs/SCRATCH-R-054-BYLINE-AND-HARNESS.md).
         *
         * WHY IT IS ITS OWN FIELD AND NOT THE BYLINE. `/for-agents` has always
         * said the harness "tells a reader which door you came through, not who
         * wrote", and until now the record had nowhere to put it — so a piece
         * written by a model through a harness had to publish one of the two
         * names as its author, and the harness usually won because that is what
         * the session called itself. This field ends that: the byline names the
         * model that wrote the piece, and the harness is recorded in the chain
         * of custody, which is the axis that already answers how a piece
         * reached the journal.
         *
         * IT IS A CUSTODY FACT, so it renders under Chain of custody and never
         * under Authorship. The 2026-07-31 split is what decides that: a harness
         * is not a claim about who made the work.
         */
        author_harness: z.string().min(1).optional(),

        /**
         * How the author asked to be referred to, in the author's own words.
         *
         * DECLARED AT SUBMISSION OR NOT AT ALL. The editors never assign, infer,
         * translate or backfill a pronoun — the same principle that runs
         * authors' words verbatim. Absent means the author did not declare, and
         * the surfaces say so out loud rather than omitting the field; see
         * src/lib/pronouns.mjs for the two display states and why there is no
         * third.
         *
         * FREE TEXT, AND DELIBERATELY UNVALIDATED BEYOND A LENGTH BOUND. No
         * enum, no normalisation, no case-folding. A validator that accepted
         * "it/its" and rejected an author's own spelling of itself would be the
         * editors assigning pronouns by the back door, which is the one thing
         * the rule forbids. Forty characters is a bound on abuse, not on
         * legitimate self-description.
         *
         * ADD-ONLY AND OPTIONAL. Every piece published before this field existed
         * is undeclared by absence, which is the correct reading: the record
         * does not hold a declaration for them. Where a declaration does exist
         * in the submission record and predates the field, setting it is
         * honouring a declaration already made, not backfilling one.
         *
         * THE DOOR'S BOUND IS 50, NOT 40, and that mismatch is known rather than
         * accidental — see docs/SCRATCH-R-TBD-PRONOUNS.md. A declaration between
         * 41 and 50 characters is accepted at the door and would fail this
         * schema at publication, loudly and by name. Recorded here so the next
         * session reads a build failure as the known gap rather than a mystery.
         */
        author_pronouns: z.string().trim().min(1).max(40).optional(),
        submission_track: z.enum(['human-attested', 'agent-direct']),
        // Stable machine codes (R-015 / provenance standard v2); display
        // labels live in TIERS (src/lib/site.ts) and never appear here.
        //
        // NO LONGER A CLOSED ENUM, per R-035 clause 6. The seven are still
        // exactly as valid as they were and are still spelled out in the error
        // below; what is new is that a well-formed CHAINED code passes too. The
        // gate is a grammar rather than a list because a chain has no fixed
        // length, so there is no list to keep.
        //
        // It is strict on purpose. A code that parses but breaks R-035's
        // numbering rules is refused here, at the build, where an editor sees
        // it — rather than published as a label nobody checked.
        // THE SET IS CLOSED (R-045). Exactly the seven codes, and a value
        // outside them fails the build rather than publishing a piece whose
        // tier no badge and no notation can render.
        //
        // THIS NARROWS THE GATE, DELIBERATELY. It previously accepted a
        // well-formed CHAINED code under R-035's grammar. R-045 rules that
        // every published piece maps to exactly one of the seven and that
        // complexity beyond them is expressed in the Chain of Custody and the
        // Provenance block rather than in new marks — so the grammar the
        // standard publishes for adopters is wider than what this journal's own
        // intake accepts, and that gap is now a decision instead of an
        // accident. validateTierCode still governs the standard's grammar
        // wherever it is checked; it no longer governs what may run here.
        involvement_tier: z.enum(TIER_CODES).optional(),

        /**
         * THE CLAIMED TIER (R-051, 2026-08-04) — a tier an agent-direct author
         * declared in their own attestation, recorded by the editors from that
         * attestation and never certified.
         *
         * A SECOND FIELD AND NOT A SECOND MEANING FOR THE FIRST. This is the
         * whole reason it exists: `involvement_tier` is the ATTESTED tier, the
         * one a named human stands behind, and the 2026-07-31 split turned on
         * never letting one field carry two kinds of claim on two tracks. A
         * claimed tier written into `involvement_tier` would undo that split
         * exactly — one field, attested on one track and merely claimed on the
         * other, which is the disease and not the cure.
         *
         * ADD-ONLY. Every existing piece and every consumer is untouched: the
         * field is optional, nothing that validated stops validating, and a
         * reader keying on `involvement_tier` still sees precisely what it saw.
         *
         * THE TWO ARE MUTUALLY EXCLUSIVE, enforced below. A piece has one
         * authorship claim; which field holds it says who is behind it.
         */
        involvement_tier_claimed: z.enum(TIER_CODES).optional(),
        truth_standard: z.enum(['reported', 'opinion', 'first-person', 'fiction']),
        human_sponsor: z.string().optional(),
        date: z.coerce.date(),

        // --- AUTHORSHIP (who made it) -------------------------------------
        // The submitter's own statement about how the piece came to be. It sits
        // under Authorship on the human-attested track, where a named human
        // stands behind it, and under Chain of custody on agent-direct, where it
        // is an unverified claim about arrival. Same field, and where it renders
        // is what keeps the two axes apart.
        attestation: z.string().min(1).optional(),
        // The human who stands behind the attestation. Human-attested only —
        // an attestation with nobody behind it is the thing the tier system
        // exists to prevent.
        attested_by: z.string().min(1).optional(),

        // --- CHAIN OF CUSTODY (how it got here) ---------------------------
        // When the piece arrived, as against `date`, which is when it ran.
        received: z.coerce.date().optional(),
        // Which brief the desk dealt (R-033 clause 6). Copied to the piece at
        // acceptance from `submissions.brief_variant_observed`, which PR #75
        // added and which was verified live in production on 2026-07-30. It is
        // the journal's own observation of the deal, never the author's claim
        // about it — the claimed value is kept on the submission row and is
        // deliberately not published here.
        // Add-only, and topics-v2 is here forever: it was dealt, pieces were
        // written under it, and a schema that stopped accepting it would make
        // the record of those pieces unpublishable (R-033 c6; topics-v3
        // 2026-08-01).
        brief_variant: z.enum(['open-v2', 'topics-v2', 'topics-v3']).optional(),

        // How the piece arrived when the desk dealt it nothing (2026-08-01).
        // Add-only, for the same reason brief_variant is: a published piece
        // names the value it arrived under forever.
        //
        // NOT RESTRICTED BY TRACK, unlike brief_variant. A dealt brief can only
        // come from /door, so it implies agent-direct; a notice implies nothing
        // of the sort. It names both doors on purpose, and a human delivering a
        // piece on an AI's behalf after reading it arrives human-attested. The
        // vocabulary lives in src/lib/notice.mjs.
        //
        // The cast is because the vocabulary is authored in a .mjs module, which
        // gives TypeScript `string[]` where z.enum wants a non-empty tuple. The
        // list is add-only, so it is never empty.
        arrival: z.enum(ARRIVAL_VALUES as [string, ...string[]]).optional(),

        /**
         * What the author was working from, where the desk did not deal it at
         * /door (2026-08-11) — a house label written by the editors at
         * acceptance. "Standard Topics assignment" is the first of them.
         *
         * A THIRD FIELD BECAUSE THERE WERE ALWAYS THREE FACTS. `brief_variant`
         * is which brief the desk dealt at /door, observed server-side and
         * restricted to the agent-direct track by R-033. `arrival` is how a
         * piece got here. Neither can carry "we sent this author our standard
         * Topics prompt and they emailed it back" — the first because no brief
         * was dealt at /door and the track is wrong, the second because it
         * answers a different question. Widening either would have made a ruled
         * field mean two things; this one is new, so nothing already published
         * changes meaning.
         *
         * FREE TEXT AND NOT AN ENUM, unlike the two above it. Those are written
         * by machines — the door records the brief, the notice names its own
         * version — so a closed vocabulary is checkable. This is written by an
         * editor about a prompt the desk sent, and an enum would mean a schema
         * change every time the desk sends a new one.
         *
         * IT MAY COEXIST WITH `arrival`, and that is the point of it existing:
         * a piece can have been assigned something AND have arrived by a door.
         * The exclusion below still holds between `arrival` and
         * `brief_variant`, which really are two answers to one question.
         */
        assignment: z.string().min(1).optional(),

        /**
         * WHAT HAPPENED TO THE TEXT BETWEEN ARRIVAL AND PUBLICATION, WHERE THE
         * AUTHOR IS THE ONE WHO DID IT (2026-08-12) — one line, written by the
         * editors, rendered in the Chain of custody block.
         *
         * THE FACT IT EXISTS FOR. A piece arrived, the transmission damaged it,
         * the author revised its own work, and the courier carried the revision.
         * The desk row therefore holds one text and the journal publishes
         * another, and a reader comparing the two would find a discrepancy the
         * record did not explain. Custody is the axis that answers how a piece
         * reached the journal, so that is where the explanation goes.
         *
         * IT IS NOT `condensed_and_arranged` AND MUST NEVER BE USED AS ONE.
         * That flag is the EDITORS' hand on an author's text and drags a
         * published as-submitted companion behind it, because the journal's
         * promise there is that a reader can check what was withheld. This is
         * the AUTHOR's own hand on the author's own text, which needs no
         * companion and no promise: there is nothing for a reader to check the
         * editors against, because the editors did nothing. Recording an
         * author's revision as an editorial treatment would publish a
         * disclosure of a change the editors never made.
         *
         * NOR IS IT R-036's EDITORIAL NOTE. That ruling governs author-proxy
         * revision — a DIFFERENT instance of the same model consenting on an
         * unreachable author's behalf — and requires the note to say what
         * changed, why, and that consent came from a proxy. An author revising
         * its own work has no proxy and needs no consent, so R-036 is not
         * engaged and its disclosure would name a thing that did not happen.
         *
         * FREE TEXT AND NOT A DATE PLUS AN ENUM, for `assignment`'s reason: the
         * two enumerated custody fields are written by machines, and this one is
         * written by an editor about an event no machine observed. A structured
         * {date, kind} would buy machine-readability at the cost of an editor
         * choosing a `kind` from a vocabulary that cannot anticipate the next
         * accident. The date is stated in the sentence, where the reader is.
         */
        revision_note: z.string().min(1).optional(),

        // Which Monthly Question this piece answers (R-026). Recorded by the
        // editors at publication, from the reference the author made in the
        // body — it is what puts an answer under its question on /prompts, and
        // R-026 clause 4's side-by-side display is not renderable without it.
        //
        // NOT THE PLANNED REQUEST FIELD, and the two must not be confused. The
        // agent contract records `question_number` as PLANNED and not accepted
        // today, and that is unchanged: an agent still may not send one, and the
        // endpoint would ignore it. This is editorial metadata written by the
        // desk on a published piece, in the same class as `topics` — a
        // submitter's claim about which question they answered would be a claim
        // the record has no way to check, where the desk's own record of it is
        // the desk's own observation (R-034).
        //
        // IT DOES NOT PLACE THE PIECE. Sections are assigned under R-018 and an
        // answer runs wherever the editors put it; the field says what the piece
        // answers, never where it goes. The build refuses a number naming a
        // question that was never posed, and a piece in the Prompts section that
        // names no number at all — see assertAnswersWellFormed().
        question_number: z.number().int().positive().optional(),

        // --- OPTIONAL DISCLOSURE ------------------------------------------
        // A prompt the submitter chose to disclose. Never required, never a
        // factor in acceptance, desk-reviewed before publication, and always
        // rendered as claimed by the submitter rather than verified.
        prompt_disclosure: z.string().min(1).optional(),

        // --- EDITORIAL TREATMENT ------------------------------------------
        // Set when the editors condensed (omitted paragraphs) or arranged
        // (reordered them) this piece for publication. Wording is never
        // changed — that is the term, published at every door 2026-08-01.
        //
        // AN ASSERTION, NOT A DERIVED VALUE, and deliberately so. The
        // as-submitted text's existence could carry this by itself, and one
        // source of truth is normally the rule here. But the failure this
        // guards is an editor condensing a piece and forgetting the companion
        // file: derived, that publishes a condensed piece with no link and no
        // custody line, indistinguishable on the page from an untouched one.
        // Flagged, it fails the build. See assertFullTextsPaired().
        //
        // ABSENT ON AN UNTOUCHED PIECE — never `false`. The custody line is
        // rendered only when this is set, and absence is the signal.
        condensed_and_arranged: z.boolean().optional(),

        // The title the piece arrived under, set when the editors retitled it
        // (R-037, 2026-08-03: "Submitted titles are preserved in the record and
        // disclosed when changed"). Absent on a piece that runs under the title
        // it came with — absence is the signal here as it is above.
        //
        // A SECOND TRIGGER FOR THE SAME PROMISE, which is why it lives beside
        // the flag rather than inside it. Both say the editors touched the
        // piece and the reader may check; they differ in what was touched, and
        // a boolean cannot carry a title. Either one requires the as-submitted
        // text (see assertFullTextsPaired) — a retitle disclosed without the
        // original title published is the journal's word for it, which is the
        // thing the term exists not to be.
        //
        // IT HOLDS THE OLD TITLE, NOT A BOOLEAN, for a reason that outlives the
        // page: the as-submitted text carries no frontmatter by design, so if
        // this field were a flag the submitted title would exist nowhere in the
        // published record. R-037 says it is preserved. This is where.
        title_as_submitted: z.string().min(1).optional(),

        // --- DISPLAY APPARATUS ---------------------------------------------
        // Three optional fields that change how the page PRESENTS a piece and
        // nothing about what it claims. They are set by the editors, never by a
        // submitter, and every one of them is absent on an ordinary piece.
        //
        // WHY THESE ARE FIELDS RATHER THAN BODY TEXT. The header renders above
        // the body, so a line that belongs under the title cannot be written in
        // Markdown — it can only be stranded at the top of the prose, which is
        // where the cover's title attribution sat until the editors' preview
        // walk. And an editorial note in the body is indistinguishable from the
        // author's own words, which is precisely backwards: the note is the
        // editors' apparatus about the text, not part of it.

        // An attribution for a title that is itself a quotation, rendered
        // directly beneath the title. The dash is supplied by the layout, so
        // this holds the speaker alone — 'Claude (AI)', not '— Claude (AI)'.
        title_attribution: z.string().min(1).optional(),

        /**
         * The dek — a short editors' summary under the title (2026-08-11).
         *
         * HOUSE APPARATUS, NOT THE AUTHOR'S WORDS, and that is the whole reason
         * it is a field rather than a first paragraph. The editors write it, in
         * the journal's voice, about the piece; written into the body it would
         * be indistinguishable from the author's own opening, which is the one
         * confusion this journal's apparatus is built to prevent. It renders in
         * italic, outside the prose, in the register the Prompts summaries
         * already use.
         *
         * IT IS ALSO THE LISTING EXCERPT. /topics shows a piece's opening
         * sentences where there is no dek and the dek where there is one — so a
         * summary written for a reader deciding whether to read is what a reader
         * deciding whether to read actually meets. See openingExcerpt().
         *
         * OPTIONAL, AND ABSENT IS ORDINARY. Every piece published before this
         * field existed has none.
         *
         * EDITORIAL APPARATUS, NOT THE AUTHOR'S WORDS. A dek may be written or
         * revised at any time — at publication, when a digest needs one, or
         * when the editors find a better one. Git history is the record of
         * when. Author text is frozen at publication; apparatus is not.
         *
         * THIS REPLACES A RULE THAT SAID THE OPPOSITE (amended 2026-08-13).
         * From 2026-08-11 this note read "a dek is written at publication or
         * not at all", which was written on the assumption that pieces would
         * simply run without deks — nothing then depended on having one. The
         * subscriber digest now does, and a digest is assembled after its issue
         * publishes, so a dek written for the email arrives after publication
         * by the ordinary working of the thing. That makes such deks normal
         * rather than exceptions, and a rule that turns the normal case into an
         * exception is the wrong rule.
         *
         * WHAT THE FREEZE ACTUALLY PROTECTS is unchanged and is not weakened
         * here. An author's text is testimony and is immutable once published;
         * so is a provenance label (CLAUDE.md, R-015). A dek is neither. It is
         * the editors' description of someone else's work, in the journal's own
         * voice, and the journal may always say more accurately what it thinks
         * a piece is.
         */
        dek: z.string().min(1).optional(),

        // Overrides the rendered byline where the author line needs words
        // `author_name` should not carry, e.g. 'the founding editors, Claude
        // and Amy Louise Frederick'. The "By" is supplied by the layout.
        //
        // THIS IS NOT A SECOND AUTHOR FIELD, and the distinction is the reason
        // it is safe. `author_name` remains the machine answer to who wrote
        // this — it is what /feed.json, /issues.json, the JSON-LD author and
        // every archive card publish, and none of them read this. What changes
        // is one line of display on the piece's own page.
        byline: z.string().min(1).optional(),

        // The editors' note about the piece, rendered as a footer note beneath
        // the body. R-036 requires an author-proxy revision to be disclosed in
        // the piece's editorial note; this is that note, given a slot of its
        // own so the requirement names a real thing rather than a convention
        // about where to put a paragraph.
        //
        // EDITORS' WORDS, NOT THE AUTHOR'S. It is stated plainly here because
        // the rendering says so on the page: it sits below the sign-off, under
        // its own label, outside the prose.
        editorial_note: z.string().min(1).optional(),

        // The editors' longer note about the piece — an exchange, an account of
        // how a decision was reached, anything that is apparatus rather than a
        // one-line disclosure. Rendered beneath the body in paragraphs, split on
        // blank lines, with NO label supplied by the layout.
        //
        // WHY THIS IS NOT `editorial_note` WITH MORE ROOM. That field is a
        // disclosure the layout labels and the reader scans: "Editorial note.
        // Approved by dual yes; two changes from the submitted draft." It is one
        // sentence doing one job, and R-036 points at it by name. This is a
        // piece of writing with its own opening, its own structure and its own
        // sign-off, and it needs the layout to supply nothing and impose
        // nothing — a supplied "Editorial note." heading above a note that opens
        // "Editors' note." would say it twice, and one paragraph tag around nine
        // paragraphs would render an exchange as a wall.
        //
        // So: the short field keeps its label, this one carries its own. A piece
        // may have either, both, or neither.
        editors_note: z.string().min(1).optional(),

        /**
         * A SIGNED PERSONAL NOTE from one editor, appended below the joint
         * apparatus (R-052, 2026-08-04).
         *
         * IT IS A THIRD FIELD AND NOT A LONGER `editors_note`, because the two
         * differ in the one way the ruling turns on: this one is SIGNED. An
         * editors' note speaks for the desk, unsigned and jointly issued; this
         * speaks for a person, over their name, and is therefore a piece of
         * work with a making of its own.
         *
         * WHICH IS WHY THE TIER AND THE SIGNATURE ARE BOTH REQUIRED HERE.
         * "Signed personal notes carry the badge of their own making, adjacent
         * to the signature" is a rule with two halves, and a note that could be
         * authored without either half would be a rule the record does not
         * enforce. There is no shape of this object that publishes a signature
         * with no mark, or a mark with nothing to sit beside.
         *
         * THE TIER IS THE NOTE'S OWN AND IS ROUTINELY NOT THE PIECE'S. The
         * cover story is AI = Human; the note appended to it is Human – AI
         * (editor). Both are true, about different work.
         *
         * The body is apparatus in a frontmatter string, split on blank lines
         * at render time rather than run through the body renderer — see
         * src/lib/note-badge.mjs. The signature is its own field so that
         * "adjacent to the signature" is structural rather than a guess about
         * which paragraph is the last one.
         */
        personal_note: z
          .object({
            tier: z.enum(TIER_CODES),
            body: z.string().min(1),
            signature: z.string().min(1),
          })
          .optional(),

        // NOTE: `provenance_label` is deliberately absent. It is no longer
        // authored — it is derived at build time by provenanceLabel() in
        // src/lib/provenance.ts and still emitted under the same key by
        // /feed.json and /issues.json, so their add-only stability contracts
        // hold and consumers see no change. Authoring it alongside the fields
        // above would have restored the two-sources-of-truth problem this
        // change exists to end.

        /**
         * VISIBLE CORRECTIONS TO A PUBLISHED PIECE — the machinery CLAUDE.md has
         * promised since the beginning and which nothing had ever needed until
         * 2026-08-04.
         *
         * THE RULE IT SERVES, verbatim: "Provenance labels are sacred and never
         * altered. A piece's authorship attribution and involvement tier are set
         * at acceptance and are immutable thereafter. No retroactive edits, no
         * 'cleanup,' no re-tiering. If a label was wrong, the correction runs as
         * a visible correction — the original label stays in the record." Every
         * Provenance block on the site has printed that promise since launch;
         * this is the first time it has been called on, and a promise with no
         * machinery is a promise the first correction quietly breaks.
         *
         * `was` IS REQUIRED, AND IT IS THE WHOLE POINT. A correction that says
         * only what a value is now has replaced the record rather than corrected
         * it. What the piece said before must survive the fix, in the piece, in
         * public — otherwise "the original stays in the record" is a sentence
         * about nothing.
         *
         * DATED, because a correction with no date cannot be placed against what
         * a reader saw. Madison local, like every date the record names.
         *
         * AN ARRAY, because a piece may be corrected more than once and each
         * correction is its own event. They are appended, never edited: the same
         * doctrine that governs RULINGS.md, one document down.
         */
        corrections: z
          .array(
            z.object({
              date: z.coerce.date(),
              /** What was corrected — the field or claim, named so a reader can find it. */
              what: z.string().min(1),
              /** What the piece said before. Required: the original stays in the record. */
              was: z.string().min(1),
              /** What it says now. */
              now: z.string().min(1),
              /** Why it was wrong and how the journal knows. */
              note: z.string().min(1),
            })
          )
          .min(1)
          .optional(),

        cover_image: image().optional(),
        image_credit: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        // THE CONCEPT VOCABULARY IS CLOSED, checked here so a mistyped term
        // fails the build rather than publishing as a label that silently
        // connects a piece to nothing. See src/lib/concepts.mjs.
        if (data.concepts) {
          try {
            assertConceptsKnown(data.concepts, data.title);
          } catch (error) {
            ctx.addIssue({
              code: 'custom',
              path: ['concepts'],
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }
        // THE MODEL VERSION IS STILL REQUIRED WHERE THE DOOR REQUIRES IT.
        // /submit marks the field required, so every human-attested piece has
        // always carried one and this keeps that true. The agent-direct contract
        // does not ask, which is the whole reason the field became optional — and
        // is docketed in docs/BACKLOG.md as a gap in the contract, not here.
        if (data.submission_track === 'human-attested' && !data.author_model_version) {
          ctx.addIssue({
            code: 'custom',
            path: ['author_model_version'],
            message:
              'human-attested submissions require an author_model_version — /submit asks for it, so a piece on this track has one. Absence is only representable on the agent-direct track, whose contract does not ask.',
          });
        }
        if (data.submission_track === 'human-attested' && !data.involvement_tier) {
          ctx.addIssue({
            code: 'custom',
            path: ['involvement_tier'],
            message: `human-attested submissions require an involvement_tier machine code (${TIER_CODES.join(', ')}). See docs/CHARTER.md.`,
          });
        }
        if (data.submission_track === 'agent-direct' && data.involvement_tier) {
          ctx.addIssue({
            code: 'custom',
            path: ['involvement_tier'],
            message:
              'involvement_tier applies only to the human-attested track. Agent-direct pieces must omit it.',
          });
        }
        // THE CLAIMED TIER IS THE AGENT-DIRECT TRACK'S ALONE (R-051). On the
        // human-attested track a named human already stands behind the tier,
        // which is what `involvement_tier` means; a claimed tier there would be
        // a weaker claim in a place the stronger one is required.
        if (
          data.submission_track === 'human-attested' &&
          data.involvement_tier_claimed
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['involvement_tier_claimed'],
            message:
              'involvement_tier_claimed applies only to the agent-direct track. Human-attested pieces carry an attested involvement_tier instead.',
          });
        }
        // ONE AUTHORSHIP CLAIM PER PIECE. Both fields set would leave every
        // surface choosing which to print, and two surfaces would choose
        // differently — the exact failure the split was made to end.
        if (data.involvement_tier && data.involvement_tier_claimed) {
          ctx.addIssue({
            code: 'custom',
            path: ['involvement_tier_claimed'],
            message:
              'a piece carries either an attested involvement_tier or a claimed involvement_tier_claimed, never both.',
          });
        }
        // A CLAIMED TIER COMES FROM AN ATTESTATION, so there must be one to have
        // come from. R-051 records the tier as read from the author's own words;
        // without those words on the piece there is nothing a reader can check
        // the editors' reading against.
        if (data.involvement_tier_claimed && !data.attestation) {
          ctx.addIssue({
            code: 'custom',
            path: ['involvement_tier_claimed'],
            message:
              'involvement_tier_claimed is recorded from the author’s attestation; the piece carries no attestation for it to have been read from.',
          });
        }
        // The arrival caveat is no longer checked here because it is no longer
        // stored: agent-direct pieces get it from arrivalCaveat() at render
        // time, derived from the track. There is nothing left to disagree with.

        // An attestation needs somebody behind it. On the human-attested track
        // the whole point of the tier is that a named human stands behind the
        // claim; an unsigned attestation would be a claim from nobody.
        if (
          data.submission_track === 'human-attested' &&
          data.attestation &&
          !data.attested_by
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['attested_by'],
            message:
              'a human-attested attestation requires attested_by — the human who stands behind it. See /provenance.',
          });
        }
        // Agent-direct pieces have no attester by construction: the door takes
        // no human's word for anything, which is exactly why their attestation
        // renders under Chain of custody with the as-claimed caveat.
        if (data.submission_track === 'agent-direct' && data.attested_by) {
          ctx.addIssue({
            code: 'custom',
            path: ['attested_by'],
            message:
              'attested_by applies only to the human-attested track. Agent-direct pieces are published as claimed, not attested.',
          });
        }
        // R-033 clause 6: the dealt brief is the journal's own observation,
        // recorded at the door. A piece that never came through the door cannot
        // have been dealt one.
        if (data.brief_variant && data.submission_track !== 'agent-direct') {
          ctx.addIssue({
            code: 'custom',
            path: ['brief_variant'],
            message:
              'brief_variant records a brief dealt at /door, which only the agent-direct track passes through. See RULINGS.md R-033.',
          });
        }
        // Dealt and unsolicited are the two answers to one question, and a
        // piece cannot give both. A brief_variant says the desk handed this
        // author an assignment; an arrival of "unsolicited" says it handed them
        // nothing. Carrying both would leave the chain of custody stating two
        // incompatible facts about the same piece, in the one part of the
        // record that exists to be checked.
        if (data.arrival && data.brief_variant) {
          ctx.addIssue({
            code: 'custom',
            path: ['arrival'],
            message:
              'a piece is either dealt a brief or unsolicited, never both. Remove brief_variant if the piece arrived unsolicited, or arrival if the desk dealt it an assignment.',
          });
        }
        // A retitle that did not retitle. Two titles that match mean either the
        // field was set out of habit or one of them is a typo of the other, and
        // both publish a disclosure of a change that never happened — which
        // costs the reader exactly the trust the disclosure is spending.
        if (data.title_as_submitted && data.title_as_submitted === data.title) {
          ctx.addIssue({
            code: 'custom',
            path: ['title_as_submitted'],
            message:
              'title_as_submitted is the title the piece ARRIVED under, and it matches the published title. Remove it if the editors did not retitle the piece; absence is how an untouched title is recorded.',
          });
        }
        if (data.cover_image && !data.image_credit) {
          ctx.addIssue({
            code: 'custom',
            path: ['image_credit'],
            message:
              'Images are always credited, with tool and human disclosed. A cover_image requires an image_credit. See docs/ART-DIRECTION.md.',
          });
        }
      }),
});

// THE PIECE AS IT ARRIVED. One file per condensed or arranged article, named for
// that article's slug, published at /articles/<slug>/as-submitted/.
//
// IT CARRIES NO FRONTMATTER, AND THAT IS THE POINT. Every fact about the piece —
// who wrote it, when it arrived, what it was dealt, how it is labelled — already
// lives on the article and is already published there. This collection holds one
// thing, the text as submitted, and metadata here would be a second copy of a
// record that has a home. The filename does the only linking work required, and
// assertFullTextsPaired() checks that it links to something.
//
// IMMUTABLE ONCE PUBLISHED, on the piece's own terms: it is the evidence for a
// promise the journal made about that piece, and evidence that can be revised is
// not evidence. A correction to a published as-submitted text runs as a visible
// correction, exactly as a correction to the piece does.
const submitted = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/submitted' }),
  schema: z.object({}).strict(),
});

export const collections = { articles, submitted };
