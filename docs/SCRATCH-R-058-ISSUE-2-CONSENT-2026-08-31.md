# The R-058 gate on Issue No. 2, and why it fired

For the editors' morning review, 2026-08-31 (Madison). Raised by a build
failure, not by a reading: Issue No. 2's first piece would not build.

```
Error: The consent record is missing an entry for: the-paper-mill-and-the-server-farm.
Every published piece needs one — /terms, /for-agents and the footer all state that
every published piece is covered by its author's consent (R-058).
```

**DECIDED, NOT OPEN.** This began as a build failure with options attached. The
editors ruled on it the same evening, by dual yes, before the session closed:

> **Submission through /submit under the posted terms IS the author's consent to
> publish.** The form's footer states the permission and links the terms; both
> authors' provenance attestations confirm they wrote for and submitted to this
> journal. No separate consent ceremony is required for submitted pieces.
> R-058's fresh-session protocol applies to material that was **not** submitted.
> The consent-record entry for a submitted piece derives from the submission —
> author, basis, received date, attestation as source — automatically, with no
> bespoke round, and the same basis applies to future submitted pieces.
> *Ruled by both editors, 2026-08-31. A ruling draft follows at leisure; no
> number is claimed here, because a number is claimed at ratification.*

What follows is the reasoning that was in front of them, kept because the ruling
is easier to apply with the mechanism visible — not because anything below is
still an open question. §4 records what was decided and what it displaced.

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

## 4. What was decided

The editors took the substance of option (a) below and went further than it: the
entry does not merely *record* that the terms covered the piece, it **derives
from the submission**, and the rule is general rather than a patch for these two
pieces. Submission under the posted terms is the consent. The gate stays exactly
as strict as it was; what changed is that the record now has a legitimate way to
answer it for submitted work.

Two consequences worth carrying forward:

- **No new schema field was needed.** The existing third entry state — an
  `editors_note` for a consent with nothing to quote — already fits, because
  there genuinely is nothing to quote: nobody was asked, and that is the point.
  The note carries author, basis, received date and attestation as source.
- **`/consent-record` now holds two mechanisms**, and a reader should be able to
  tell which is which. Every Issue No. 1 entry is an answer to the published
  script; the submitted-work entries are records of a basis. The page's framing
  still describes only the first, and **that is the one piece of follow-up work
  this ruling leaves behind** — a line on the page saying both appear on it.
  Filed here rather than done tonight, because it is the editors' voice on the
  journal's own page.

### The options as they stood, for the record

**(a) Widen the record — what was recommended, and substantially what was
ruled.** Record coverage by the terms: `who` names the basis rather than a
session, `outcome` states the grant, and a note points at TERMS.md §6(c) and its
effective date.

**(b) Narrow the gate.** Require an entry only for pieces submitted before
2026-08-15. Rejected in effect: the gate stops watching the growing part of the
corpus, and `/consent-record` quietly stops being a complete account of it while
still reading as one.

**(c) Run a round anyway.** Rejected: it implies a doubt that does not exist, and
manufactures a conflict a "no" could not cleanly resolve.

**(d) Withhold the pieces.** Moot.

## 5. The scaffold that is no longer there, and the latch that is

For part of the evening `the-paper-mill-and-the-server-farm` carried a
placeholder entry that said so in its own text, accepted by the desk for the
deploy preview only. **The ruling in §4 removed the need for it, and it is
gone** — replaced by a real entry recording the submission as its basis.

**The merge block built as a condition of that scaffold stays permanently, by
the desk's instruction.** `tests/consent-record-no-scaffold.test.mjs` fails on
any consent entry containing DEV PLACEHOLDER, NOT ASKED, MUST NOT PUBLISH,
PLACEHOLDER, SCAFFOLD, TODO or FIXME anywhere in any field, and checks the round
metadata separately. It is green now and stays in the suite: no non-real entry
reaches `main` by any path, tonight or later. It is a latch rather than a
description of the code, which is why it keeps earning its place after the
thing it was written for is gone.

**One finding from that scaffold outlives it, and it is the most important thing
in this document.** It was surfaced by asking what the placeholder rendered as,
and the answer is about the site rather than about the placeholder:

- On `/consent-record` the scaffold was unmistakable — `who` and `outcome` both
  said in capitals that nobody had been asked. That surface behaved correctly.
- **On the piece's own page there is no consent state at all, and there never
  was.** An article page renders nothing per-piece about consent and does not
  even link `/consent-record` — checked in the built HTML, zero occurrences.
  What it *does* render is the site footer, on that page as on every page:

  > every piece we have published is covered with its author's consent.

  While the scaffold stood, that sentence was false on that piece's own page with
  nothing beside it to say otherwise. It did not read as pending; it read as
  consent existing.

The ruling closed the instance. **It did not close the exposure**, and that is
why this stays in the document. The journal makes a per-piece claim in a
site-wide sentence, and the only surface that can qualify it is a page the piece
does not link to. Every piece is genuinely covered today, so the sentence is true
today — but nothing in the build connects the claim to the evidence, and the one
night the two came apart, no reader could have seen it.

**Whether a piece page should carry its own consent line, linked to the record,
is a real question the corpus has never had to ask.** It is not urgent and it is
not Issue No. 2's problem. It is worth an hour some week, and it is the kind of
gap that is only ever visible from an accident like tonight's.

## 6. What this does not touch

The two Issue No. 2 pieces themselves are not in question at any point above.
Their authorship, provenance, custody and truth standards are settled and
corrected; their bodies are verbatim. This is entirely about the record's
vocabulary for a coverage that already exists.
