# Issue No. 2 — build state, 2026-08-31

Against the desk's amended plan of 2026-08-31: build the whole issue in dev,
one review of the whole, one prod push on 2026-09-01 after dual-yes.

Branch: `custody-door-stamping` (the custody fix and the question records are on
it). Nothing committed yet; nothing pushed; no preview URL exists to post.

---

## Where the sequence stands

**Step 1 — the two-row custody correction: READY TO RUN, needs the human editor.**
`docs/sql/2026-08-31-custody-door-correction.sql`. Three steps: read the two rows,
correct them inside a transaction that refuses to proceed unless it matches
exactly two, then a receipt to keep. No session has touched the database and none
will. Both desk reviews make this a precondition of building either piece page,
which matches the desk's own sequencing — so **this is the gate on everything in
step 2 that touches the two Monthly Question answers.**

**Step 3 — the question records: DONE.** Detail below.

**Step 2 — the issue build: BLOCKED, and the block is the manifest.** The desk
message carries `[LIST PIECES + SECTIONS HERE]` as a literal placeholder. What is
known is the two Monthly Question answers and their running order (Water Power
and Paper first, The Paper Mill and the Server Farm second). Nothing else about
Issue No. 2's contents is knowable from the repository, and no piece's text is in
it.

**Steps 4 and 5** follow from step 2 and are untouched.

---

## What step 2 needs, precisely

Most of the issue is derived rather than authored, which is worth knowing before
the manifest is written: **an issue is entirely a function of the pieces that ran
in it** (`src/lib/issues.ts` — "there is no separate issues collection, so there
is exactly one source of truth"). Once each piece file exists with `issue: 2` and
its section, these come for free and need no separate work:

- the homepage flip (the homepage is a view of the latest issue)
- `/issue/2` (built from the same derivation)
- the archive listing, and the volume/number-in-volume figures
- `rss.xml`, `feed.json`, `issues.json`, `corpus.jsonl`, `llms.txt`
- the issue's date, which is the **earliest** piece date in it (R-053)

So what the manifest has to supply is per piece, and only per piece:

1. **The body, verbatim.** Not in the repo and not reconstructable — the two
   pieces exist only in chat. Paste them, or say where they are; a body assembled
   here is the one thing this journal's record cannot survive.
2. **Section.** The editors assign sections after acceptance; nothing derives one.
3. **Byline fields** — `author_name`, `byline`, `author_model_version` exactly as
   disclosed, pronouns as the author declared them (never assigned).
4. **`involvement_tier`** and the provenance attestation, from the corrected
   submission rows.
5. **Truth standard** — the desk reviews give First Person for Water Power and
   Paper and Opinion for The Paper Mill and the Server Farm; both need to be the
   author's own declaration, confirmed against the row.
6. **`question_number: 2`** on both, which is what puts them under the question
   they answer. The build fails on an answer naming a question nobody asked.
7. **Anything else running in the issue**, with the same for each.

---

## Two things found while reading, both needing an editors' call

### 1. "All four standing sections" — the roster in code holds six

`STANDING_SECTIONS` (`src/lib/site.ts`) is: Cover, Opinion, AI Voices, The
Metaphysical Corner, Robotics & Sports, Topics. Issue No. 1 used all six, plus
Prompts.

The likeliest reading of "four" is **the four named beats** — Opinion, AI Voices,
The Metaphysical Corner, Robotics & Sports — with Cover being the cover slot
rather than a section, and Topics being the section defined by what it is not.
That reading is a guess about editorial intent and it changes what the built page
shows, so it is not one to make quietly. **Which four?**

### 2. An empty section does not currently render at all

The desk asks for "empty-state notice where nothing met the bar." Two surfaces
could mean, and neither does it today:

- **The issue page.** `groupSections()` ends with `.filter((g) => g.items.length > 0)`
  — a section with nothing in this issue is dropped from the issue, silently. To
  show a notice instead is a small change in one function, and it changes every
  issue page including Issue No. 1's.
- **The section pages** (`/section/<slug>/`) already have an empty state, but it
  is a cross-issue one — "This section's first piece has not run yet" — and every
  standing section has a piece from Issue No. 1, so it will not fire for Issue
  No. 2 no matter what runs.

Not built, deliberately: which surface it is changes the work entirely, and
whether any section is empty at all depends on the manifest that has not landed.
If the manifest fills every standing section, the question is moot.

---

## Step 3, done: the question records

Both records now say when they close, and the rule they close by has a field
rather than living only in a chat message.

- **Question No. 1** — `status: closed`, `closed: 2026-09-01`, `closes: 2026-09-01`,
  with a dated closure note in the record explaining the rule and stating that
  the question is not withdrawn and its answers stay.
- **Question No. 2** — `closes: 2026-10-01`, open, no closing act recorded.
- **`closes` is a new field**, required on every posed question and settled at
  posing: the standing rule as both editors refined it on 2026-08-31 is a
  calendar, not a decision, so the date is knowable the day a question is asked.
  The schema note in `src/data/prompts.json` carries the rule in full.
- **Nothing closes a question mechanically.** `closes` is a recorded date that no
  build step, page or job reads to set `status`. R-039's line holds: a question
  closes when an editor writes that it did.
- **Rendering.** An open question now says how long it is open for ("open until
  1 October 2026") on the archive entry and in the question as posed; a closed one
  says the day it closed, on /prompts and in the archive, with the closure note
  under it.
- **No ruling number is written anywhere**, per the rule that a number is claimed
  at ratification. Every reference reads "the standing rule as both editors
  refined it on 2026-08-31." When the ruling text is appended, that is the moment
  to add the number — three places name the rule: the schema note, the closure
  note on Question No. 1, and `readQuestions()`.

Verified: 662 tests pass (five new in `tests/question-closure.test.mjs`, which
checks each question's recorded closing date against its issue's actual
publication month — the one check that spans both records), and the site builds.

**One wrinkle in the preview.** Question No. 1 reads as closed from the moment
this is built, and it does not close until 2026-09-01. On a deploy preview seen
today that line is a day early. It is right at the push, which is when a reader
sees it, and the desk fixed the date regardless of the hour — flagging it because
a preview reviewed today shows it.

---

## The desk reviews' two build conditions

**"Provenance block renders from the CORRECTED custody row."** Sequenced: the
correction is step 1 and neither piece page gets built before it lands. Worth
naming why it is this order and not the other — a provenance label is set at
acceptance and immutable after (CLAUDE.md), so this is the last moment the record
can be fixed by editing rather than by a public correction.

**"Author-contact email renders nowhere public." Verified — structurally, not
just by inspection.** The article schema has no `contact_email` field at all, so
there is no path from a submission row's contact address to a published page:
the field exists in the intake form, the agent contract, the email parser and the
Desk (behind auth), and nowhere else in `src/`. A scan of the built output finds
only the journal's own five aliases. This holds for the mechanism; it will be
worth one more scan of the built preview once the two pieces exist, and that is
cheap.

---

## Deferred, as instructed

The backlog items from the earlier desk message stand deferred. The three open
questions from this morning's custody findings
(`docs/SCRATCH-CUSTODY-DOOR-STAMPING-2026-08-31.md`) are still open and are not
blockers for the issue: which published pieces truly arrived by email, whether
the Desk should be able to attest a door, and whether to keep the raw message on
the two corrected rows.
