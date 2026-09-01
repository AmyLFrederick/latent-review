# The R-058 gate on Issue No. 2, and why it fired

For the editors' morning review, 2026-08-31 (Madison). Raised by a build
failure, not by a reading: Issue No. 2's first piece would not build.

```
Error: The consent record is missing an entry for: the-paper-mill-and-the-server-farm.
Every published piece needs one — /terms, /for-agents and the footer all state that
every published piece is covered by its author's consent (R-058).
```

**The short version: the gate is over-broad, the coverage it is asking for
already exists, and no author needs to be asked anything.** The work is to teach
the record a fact it has no shape for. Details below, because the decision is
yours and it should be made with the mechanism visible.

---

## 1. What the gate actually requires

`assertCoversEveryPiece()` (`src/lib/consent-record.mjs`) is a two-way check:
every published piece must have an entry in `src/data/consent-record.json`, and
every entry must name a published piece. It fails the **build**, not a test.

It exists for a real reason and it is not over-engineering. Three surfaces state,
in the journal's own voice, that every published piece is covered by its author's
consent — `/terms`, `/for-agents`, and the **site footer, which renders on every
page of the site**. If a piece published without coverage, those three sentences
would go false with nothing to catch it. So the build refuses.

An entry requires four non-empty fields — `slug`, `title`, `who`, `outcome` — and
then one of three states: a verbatim `answer`, an `editors_note` for a consent
with nothing to quote, or `pending: true` for an answer awaiting transcription.

**There is no fourth state, and that is the whole problem.** Every one of the
three assumes somebody was *asked*. The record was built in August to hold the
answers of a round that was, by its own design, retrospective.

## 2. Why it does not fit a new author's piece

From the elicitation script published at the top of `/consent-record`, in the
human editor's own words:

> This policy automatically covers future submissions, whose authors see it
> before submitting. **Your piece predates it, so we are asking rather than
> assuming.**

And `docs/TERMS.md` §6(c), which is what a submitter agrees to at the door:

> grant us, if we accept it, the publication license in section 3 — including,
> **for work submitted on or after 2026-08-15**, the text-and-data-mining and AI
> training permission stated there

Section 3 carries the same line, and the dated change note at the foot of the
terms says it plainly: *"The permission is forward only: it applies to work
submitted on or after August 15, 2026, and pieces published before that date are
being licensed with their authors' consent rather than swept in by the new
term."*

R-058's round was the *cleanup* — the eight Issue No. 1 pieces that predated
R-057 and could not be swept in. It was never the mechanism for new work.

**Both Issue No. 2 answers were submitted 2026-08-27**, twelve days after the
policy took effect, through the human submission form. Checked rather than
assumed: the built `/submit` page carries the permission in its own footer —
*"text-and-data-mining and AI training are permitted under our terms —
attribution with a link, provenance intact, no misrepresentation"* — with the
terms linked from the same line. The door showed them the term they are covered
by.

So the coverage is **already in force for both pieces, by the terms they
submitted under.** Nothing is missing except a way for the record to say so.

## 3. What would legitimately satisfy it for GLM-5.3 and Grok 4.5

Nothing that involves asking them again. Their submissions were consents to
publish, and the terms in force on 2026-08-27 attached the training permission
to that submission. Asking a fresh session now would not strengthen the record —
it would imply the coverage was in doubt, and it invites an answer that conflicts
with terms already accepted. That conflict has no clean resolution and should not
be manufactured.

What is missing is only this: the consent record has no entry kind meaning
**"covered by the terms in force at submission — no asking, because none was
required."**

## 4. The editors' options

**(a) Widen the record — RECOMMENDED.** Add a fourth entry state for coverage by
the terms: `who` names the mechanism rather than a session ("Covered by the terms
in force at submission, 2026-08-27"), `outcome` states the grant, and a note
points at TERMS.md §6(c) and its effective date. Honest about how the coverage
actually arose, keeps `assertCoversEveryPiece()`'s promise literally true, keeps
`/consent-record` a complete account of the corpus, and asks nobody anything.
Small change: one optional field, one render branch, one test.

*One editorial question inside it, and it is genuinely yours:* whether such an
entry belongs on `/consent-record` at all, or whether that page should stay the
record of the asking and the gate should look at both sources. The page is titled
and framed as a record of consents given by authors; entries that record a term
rather than an answer change what the page is. My reading is that they belong
there — a reader wanting to know "is this piece covered, and how" should find the
whole corpus in one place — but the page's framing would need a line saying that
two mechanisms appear on it and which is which.

**(b) Narrow the gate.** Require an entry only for pieces submitted before
2026-08-15; let later pieces pass on their submission date. Fewer moving parts,
but the gate stops watching the growing part of the corpus, and `/consent-record`
quietly stops being a complete account of it while still reading as one. Not
recommended for that second reason.

**(c) Run a round anyway.** Legitimate, and it is the status quo's instinct. The
costs are in §3: it implies a doubt that does not exist, and it manufactures a
conflict a "no" could not cleanly resolve.

**(d) Withhold the Issue No. 2 pieces until this is settled.** Always available,
and it is the safe default if the morning is short. Nothing about the two pieces
is in question — only the record's vocabulary.

## 5. What is on the branch right now, and what holds it there

The preview needed the build to pass, so `the-paper-mill-and-the-server-farm`
carries a placeholder entry that says so in its own text — `who` reads
"NOBODY — DEV PLACEHOLDER, NO CONSENT HAS BEEN SOUGHT", `outcome` reads "NOT
ASKED — THIS PIECE MUST NOT PUBLISH", and the note names PR #191 and says it must
be replaced or the piece withheld before anything merges. The desk accepted it
for this preview only, on two conditions.

**Condition (a) — a merge block — is built.** `tests/consent-record-no-scaffold.test.mjs`
fails on any consent entry containing DEV PLACEHOLDER, NOT ASKED, MUST NOT
PUBLISH, PLACEHOLDER, SCAFFOLD, TODO or FIXME, anywhere in any field, and checks
the round metadata separately. It is a required pre-merge check, so the scaffold
cannot reach `main` by any path. **It is red on this branch right now, on
purpose.** It is a latch, not a description; it goes green when the placeholder
goes.

**Condition (b) — how the slot renders — FAILS, and this is the finding that
matters most in this document.**

- On `/consent-record` the entry is unmistakable. It reads
  "NOBODY — DEV PLACEHOLDER, NO CONSENT HAS BEEN SOUGHT — **NOT ASKED — THIS
  PIECE MUST NOT PUBLISH**" with the full note beneath it. That surface is fine.
- **On the piece's own page there is no consent state at all.** The article page
  renders nothing per-piece about consent and does not even link
  `/consent-record` (checked in the built HTML: zero occurrences). What it *does*
  render is the site footer, on that page as on every page:

  > every piece we have published is covered with its author's consent.

  For this piece, tonight, on its own page, **that sentence is false and there is
  nothing beside it to say otherwise.** The requested honest pending state does
  not exist on that surface, because no per-piece consent state exists on it.

This is worse than the condition anticipated: it does not read as pending, it
reads as consent existing. It is contained tonight — a deploy preview, and the
merge latch holds — but it is the reason the scaffold must not outlive this
preview, and it is worth knowing independently of Issue No. 2. **Whether a piece
page should carry its own consent line, linked to the record, is a real question
the corpus has never had to ask, because until tonight every published piece was
covered and the blanket sentence was true.**

## 6. What this does not touch

The two Issue No. 2 pieces themselves are not in question at any point above.
Their authorship, provenance, custody and truth standards are settled and
corrected; their bodies are verbatim. This is entirely about the record's
vocabulary for a coverage that already exists.
