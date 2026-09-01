# Findings — Prompts page restructure / question paste-block template

2026-08-27. Findings only; nothing edited, no branch, no PR. Everything below
was read this turn from the working tree at `6e350f6`.

---

## 1. The name: it is the **Monthly** Question now

The brief says "Weekly Question template." That name was retired on 2026-08-21.
`questionLabel()` renders `Monthly Question No. N` (`src/lib/prompts.mjs:63`),
the schema note in `src/data/prompts.json` records the change, and every visible
surface says Monthly. I will build it as the **Monthly Question template**
unless told otherwise.

One place keeps the old word on purpose and I will **not** touch it: the archive
anchor `id="weekly-question-N"` (`src/components/QuestionEntry.astro:47`). It is
a published address that Prompts answers link to; renaming it breaks live links.

---

## 2. The blocking decision: there is no "Weekly Question page" to restructure

There is no per-question page anywhere. A question is rendered on exactly two
surfaces:

- **`/prompts`** — since 2026-08-21 this page shows **two questions side by
  side**: the answered one (left, hairline, No. 1) and the open one (right, 2px
  rule, No. 2). Answers to the left-hand question run beneath both columns.
- **`/prompts/archive`** — every posed question, each as a `QuestionEntry`,
  including ones still open.

The brief's page order (headline → paste block → human line → collapsed
fact-check → dated policy line) describes a single-question stack. It has to be
told which of those surfaces it governs. Three ways to read "template":

**(a) A component, rendered wherever a question is OPEN. ← my recommendation.**
The invitation apparatus becomes one component, used by the right-hand column on
`/prompts` and by open entries in the archive. Closed and answered questions
render exactly as they do today. This is the reading that makes "template for
every question page going forward" true without inventing pages, and it is the
only one where the answered left column can't accidentally sprout a paste block
for a question nobody should be answering any more.

**(b) New per-question pages** (`/prompts/2/`). Bigger: new routes, new
addresses, a nav/link question, and `/prompts` still has to decide what it shows.
Not warranted by anything in the brief.

**(c) `/prompts` only.** Cheapest, but then the archive keeps a question marked
"open" with no way to answer it, which is the confusion the brief is fixing,
one click further down.

I need a yes on (a) before I write the PR — under (a) the paste block appears in
two places, under (c) in one, and the component's shape differs.

---

## 3. What the brief describes is not quite the page as it stands

Worth reading before approving, because one premise is off by a click.

The fact-check bullets **do not currently lead the page**. They live inside the
collapsed `<details>` at `src/components/FullQuestion.astro`, behind "Read the
full question as posed," in this order:

1. dateline ("Asked August 21, 2026 · open")
2. a three-line italic verbatim-question policy note
3. the question's framing paragraphs
4. "Checked before posing" + the five long source bullets

So nothing is pushing the page below the fold today — the disclosure is already
collapsed. What is actually wrong is **inside** that disclosure: a reader who
opens it to read the question meets a policy note first and a research bibliography
after, and there is nowhere on any surface to get the question as a paste block.

That makes the real change smaller and sharper than "restructure":

- **Add** the paste-block disclosure and the human line (brief items 2 and 3) —
  genuinely new, nothing like them exists on Prompts today.
- **Split** the existing `FullQuestion` disclosure in two: the question as posed
  keeps its own click, and the sources move out into their own collapsed "How we
  checked this question" (item 4).
- **Replace** the three-line italic policy note with the one dated line (item 5).

**The one thing item 5 needs a decision on:** the brief's page order never
mentions the question's framing paragraphs as their own disclosure. If the paste
block is their only home, a reader who never opens the paste block never sees
the premise — which is the text R-026 clause 1 makes canonical and R-038 promises
stays readable. I recommend keeping "Read the full question as posed" as its own
collapsed disclosure between items 3 and 4. That is one more line on the page
than the brief lists, so I am flagging rather than assuming.

---

## 4. Verbatim check on the ratified paste text: clean

I diffed the question text inside the brief's paste block against
`src/data/prompts.json` question 2. **It matches byte for byte**, including the
closing "Open to human and AI authors alike. There is no position this journal is
looking for." — which is part of the frozen question text, not the wrapper. So
the wrapper really does only wrap, and the implementation can interpolate
`question.text` straight from the file with nothing retyped.

The wrapper's "a journal published monthly" matches the door wrapper and R-055.

---

## 5. Collisions

**R-033 (frozen briefs) — no collision, one adjacency.** R-033 freezes the
*briefs*; a Monthly Question is frozen by R-026 clause 1 and R-038, a different
instrument. Clause 4 reserves *questions* to Prompts, and this is Prompts posing
its question, so nothing here is steering outside Prompts. The adjacency: the
door's `pasteBlock()` wrapper is **not itself a frozen text** — R-033 clause 2
freezes the brief constants, and `door.test.mjs` pins only that the wrapper asks
for a provenance statement, a model version, and hands the piece back to the
human. So a shared helper may touch the wrapper. It may never touch `OPEN_V2`,
`TOPICS_V2`, `TOPICS_V3`, `TOPICS_V4`, whose hashes are pinned.

**R-026 / R-038 — no collision.** Nothing here edits a posed question. Item 5's
line ("Shown exactly as posed on August 21, 2026...") must be **rendered from
`question.opened`**, never typed, so each question dates its own line and the
template cannot go stale. The date in the brief's example matches question 2's
recorded `opened`.

**`src/lib/prompts.mjs` — no structural collision.** The file is question logic
(statuses, rotation, headline splitting) and nothing in it renders copy. The new
`questionPasteBlock()` fits there as a sibling of `questionHeadline()`. No import
cycle: `door.mjs` imports only `agent-contract.mjs`.

**`/prompts` index page — three real overlaps:**

1. **"Answer this question →"** (`src/pages/prompts.astro:254`) is today's item 3
   in miniature. Under the brief it should become the ruled sentence
   ("Answering it yourself? Send your piece through the submission form.") rather
   than sit above it saying the same thing twice.
2. **The "How to answer" prose block** (lines 300–336) already gives the human
   route, the agent route (`POST /api/agent/submit`), and the answer-by-number
   rule. The new items 2–3 are the plain-English version of the first half of it.
   Per "archival language moves down, not out," I would keep it whole and let the
   new lines lead. Flagging the redundancy so it is a decision, not a drift.
3. **The pair layout.** A full-width paste block inside a `1fr` grid column will
   look wrong on desktop. Under recommendation (a) the disclosure sits inside the
   open column's `.question-apparatus` (already `max-width: 34rem`), collapsed,
   so closed it is one line; opened it is a scrolling `<pre>` inside a half-width
   column. That is survivable but tight. Alternative: render the disclosure
   full-width **below** the pair, labelled with the open question's number. Say
   which you prefer and I will build that one.

**The archive.** Under (a) the archive's open entries get the same block. The
archive already opts out of the dateline (`showDates={false}`); the invitation
should get the same kind of prop rather than a second component.

---

## 6. The shared helper: where it lives, and how much sharing is honest

The door wrapper (`src/lib/door.mjs:200`) and the ratified question wrapper differ
in more than they share:

| | door `pasteBlock()` | question wrapper |
|---|---|---|
| opening | "invited to write for" | "invited to answer a question for" |
| web-search line | none | new, phrased as optional |
| body label | "Here is your assignment:" | "Here is the question, exactly as the editors posed it:" |
| body | the dealt brief | the question, verbatim |
| handed you | "this assignment" | "this question" |
| closing | "give the finished piece to your human." | "...to your human to submit at thelatentreview.com/submit." |

**Cleanly shared: exactly one sentence** — the four things the desk cannot file a
piece without (the name for the byline, the model version, optional pronouns, and
a provenance statement in the writer's own words). That is the ruled provenance
language, it is what `door.test.mjs` already guards, and it is the only part
where a future edit to one copy would genuinely be a bug in the other.

**Not honestly shared: everything else.** Forcing one function to emit both
blocks means three or four parameters controlling a five-sentence string, and the
door's writer must never be told to go look the journal up (they are already at
the site) while the chat AI must. A single parameterised function is the version
most likely to leak one door's copy into the other.

**Recommendation.** Export the provenance sentence as a small function from
`src/lib/door.mjs` — the sentence's ruled language already lives there and is
already tested there; a new neutral module would leave two files each looking
canonical. `src/lib/prompts.mjs` imports it and builds `questionPasteBlock()`.
Then one test asserts **both** blocks contain all four asks, so the contract
can't fork.

One wrinkle: the two closings differ in "When you are done" vs the ratified
"When you're done". Harmonising the door to the contraction is a meaning-neutral
copyedit to the journal's own text and passes existing tests — but it is a change
to writer-facing door copy, so I will not do it unasked. Otherwise the shared
sentence stops one sentence earlier and each wrapper writes its own closing.

**Hardcoded domain.** The ratified block names `thelatentreview.com/submit`
literally. `DoorBoxes.astro` derives its visible addresses from `Astro.site`
instead, because a `.mjs` lib has no Astro context. I will keep the ratified text
as written and add a test asserting it matches the `SITE` in `astro.config.mjs`,
so the two can never disagree silently.

---

## 7. Two things the ratified block does not tell the writer

Not objections — the text is dual-yes'd and I will ship it as written. Flagging
because both surface at the submission form, after the writing is done:

1. **No word range.** Every door brief states "500 to 3,000 words" and a build
   guard (`assertBriefsMatchContract`) keeps it matching the contract. The
   question block states no length. **Corrected in §11 below** — I wrote here
   that `/submit` enforces 500–3,000; it does not. It warns and lets the piece
   through. Read §11, not this line.
2. **No truth standard.** The door briefs require declaring exactly one; `/submit`
   has a **required** truth-standard select. The chat AI is never told, so the
   human courier picks one for a piece they did not write.

If you want either added, the wrapper text needs a second dual-yes — I will not
add words to a ratified block on my own.

---

## 8. The copy button does need JavaScript the page does not ship

`/prompts` ships no client script today. `src/components/DoorBoxes.astro:159`
already has the implementation: `button[data-copy]`, clipboard write, "Copied" /
"Copy failed — select it by hand", reset after 2.5s.

Plan: lift the `<details>` + `<pre>` + button + that script into one
`PasteBlock.astro` component and have `DoorBoxes` use it too, so there is one
copy-button implementation rather than two. Astro scopes and dedupes the inline
script per component, so both surfaces share one small bundle.

The existing rule holds and is why `<details>` is the right control: the text is
visible, selectable and copyable by hand with JavaScript off. Collapsed is a
disclosure, not a gate. (One known cost: browser in-page find does not reliably
reach text inside a closed `<details>`.)

---

## 9. If (a) is approved, the change list

- `src/lib/door.mjs` — export the shared provenance-request sentence. No frozen
  brief touched.
- `src/lib/prompts.mjs` — `questionPasteBlock(question)`: wrapper + verbatim
  `question.text`. Throws for an unasked question rather than emitting an empty
  invitation.
- `src/components/PasteBlock.astro` — new; collapsed disclosure, `<pre>`, copy
  button, the script.
- `src/components/QuestionInvitation.astro` — new; brief items 2, 3 and 5.
  Rendered only when `status === 'open'`.
- `src/components/FullQuestion.astro` — sources move into their own collapsed
  "How we checked this question"; the italic policy note becomes the one dated
  line rendered from `opened`.
- `src/pages/prompts.astro` — invitation into the open column; the existing
  "Answer this question →" line gives way to the ruled human line.
- `src/components/QuestionEntry.astro` — same invitation for open entries.
- `src/components/DoorBoxes.astro` — use `PasteBlock`.
- `tests/prompts.test.mjs` — the block carries the question verbatim; a wrapper
  that mangles it fails; nothing is emitted for unasked/closed; the domain in the
  block matches `astro.config.mjs`.
- `tests/door.test.mjs` — both wrappers carry all four provenance asks.

Nothing in `RULINGS.md` needs appending: this is display and copy, inside
R-026's and R-038's existing terms.

---

## 10. What I need from you

1. **(a), (b) or (c)** from §2 — component for every open question is my
   recommendation.
2. **Does "Read the full question as posed" survive** as its own collapsed
   disclosure (§3)? I recommend yes.
3. **Paste block inside the open column, or full-width below the pair** (§5.3)?
4. **Harmonise the door's "When you are done" to "When you're done"** so one
   sentence can be shared outright (§6)? Yes/no.
5. **Word range and truth standard** (§7) — ship as ratified, or amend the block?

---
---

# Round 2 — 2026-08-27, after the editors' corrections

Items 1–5 accepted as instructed and not re-argued below. Three things need a
decision before code, and one line above needed correcting.

---

## 11. Item 7 — what `/submit` actually enforces: **nothing hard**

I got this wrong in §7 and it changes the decision, so plainly:

**`/submit` does not enforce the word range.** The rail at
`src/pages/submit.astro:407` is client-side and deliberately **advisory and
overridable** — it counts the words, names the count, sets `overridden = true`,
and a second click sends the piece anyway. Its own comment says so: *"Two
courtesy rails, not guarantees. Netlify Forms performs no server-side
validation, so the desk's reading is what actually enforces the rules."* With
JavaScript off there is no check at all. Nothing server-side sees a word count
on the human door.

**The truth standard is the one thing `/submit` really does require** — a
`required` `<select>` in the markup (`submit.astro:193`), so browser validation
blocks the send whether or not scripting is on.

**The agent door is the opposite**, and this is why the answer isn't a clean
yes or no: `POST /api/agent/submit` hard-rejects with a 400 outside 500–3,000
words (`netlify/functions/agent-submit.mts:345-353`), and `/prompts` tells AI
systems to answer that way. So the same 300-word answer is refused on one door
and accepted on the other.

**So: a bound exists, but not on the door this block's reader will use.** The
range is the journal's published article standard (R-033 clause 3), stated on
`/submit` and `/for-agents`, hard-enforced at the agent door, and advisory at
the human one.

**Recommendation: state it, via `PIECE_WORDS`.** Silence is defensible under
your rule as written, but the reader of this block is a chat AI writing for a
human courier, and the failure it prevents is not a rejection — it is 250 words
arriving that the desk then has to decline for length after somebody wrote them.
It costs one clause. **Your call; I have not written it either way.**

If yes: rendered from the constant with the `assertBriefsMatchContract` guard
extended to cover this block, so the prose and the contract cannot drift.

---

## 12. Item 6 — the truth-standard line, for approval before it goes in

Proposed text, door phrasing, rendered from `TRUTH_STANDARDS`
(`src/lib/agent-contract.mjs:558`) rather than typed, so the four names cannot
drift from the contract:

> Declare exactly one truth standard: reported, opinion, first-person, or fiction.

**Placement.** Last sentence of the closing paragraph, after the provenance ask
and before the handoff — so the block ends: what to write → who you are → what
kind of thing it is → where it goes. Putting it up by the question would sit
between the reader and the thing they came to answer.

**How the amendment gets recorded.** Not in `RULINGS.md` — this is not a
numbered ruling and I will not put an unnumbered entry in an append-only log.
It goes in two places that are the house pattern for a ratified text change: a
dated note in the source comment above `questionPasteBlock()` ("Amended
2026-08-27, both editors: the truth-standard line added"), and the PR body. Say
if you want it recorded somewhere further.

---

## 13. The shared provenance sentence is not identical either — it needs three
parameters

Approved in item 4 as "scoped to the provenance sentence only." Reading the two
texts side by side, that sentence differs too, in three places:

| | door | question |
|---|---|---|
| lead-in | "Tell us the name…" | "When you answer: tell us the name…" |
| what came to be | "how this **piece** came to be" | "how this **answer** came to be" |
| what you were handed | "passed you this **assignment**" | "passed you this **question**" |

So there is no byte-identical string to export. The honest version is a small
function taking the three varying words:

```js
provenanceAsks({ lead, artifact, handedYou })
// door:     lead: 'Tell us',                artifact: 'piece',  handedYou: 'assignment'
// question: lead: 'When you answer: tell us', artifact: 'answer', handedYou: 'question'
```

Everything else — the byline name, the model version, the optional pronouns, the
"in your own words," the "including that a human passed you this" — is one
string in one place, which is the drift the helper exists to prevent. Three short
parameters, no soup. This is what I will build unless you'd rather the two
wrappers stayed separate literals with only the four-asks test binding them.

The "When you are done" / "When you're done" wrinkle from §6 is now moot: the
handoff sentence falls outside the shared scope you approved, so each wrapper
keeps its own and the door's copy is untouched.

---

## 14. Still open from round 1

**Question 3 was not answered and still blocks the layout:** paste block
collapsed *inside* the open right-hand column (which is `1fr` of a two-column
grid on desktop, `max-width: 34rem`), or full-width *below* the pair, labelled
with the open question's number? Collapsed it is one line either way; opened, the
first is a scrolling `<pre>` in a half-width column and the second has the room.

I lean full-width below the pair, but the block belongs visually to the open
question and putting it below the answered column's answers would be worse — so
if it goes below the pair it goes directly below the pair, above the answers
list.

---

## 15. Addendum — the CTA becomes the paste-block reveal. Findings.

Accepted. Nothing in the repo blocks it: `"Answer this question →"` and its
`.question-act` styling exist only at `src/pages/prompts.astro:255-256` and
`507-516`, no test pins the string, and no other page or doc references it.
It renders only when `current.status === 'open'`, which is the same guard the
new pair needs, so the swap is one block for another inside an existing
conditional.

**Four things worth your eye before I build it:**

**(1) The wording changed between the brief and the addendum, correctly.** The
brief said *"Click **below** to open the assignment"*; the addendum says
*"Click to open"*. That is right and I will use the addendum's: the summary is
now itself the click target, so "below" would point at nothing. Confirming
rather than silently picking.

**(2) "The assignment" is the door's word, and this is the one section that
isn't the door.** R-033 clause 4 draws that line deliberately — *"Prompts
remains the only venue where the editors pose a question; the beat names
subject areas and never a question."* The CTA calls the thing an assignment;
the block it opens says *"Here is the question, exactly as the editors posed
it"*; the page around it says question throughout. A reader who clicks is told
two names for one thing, and the borrowed name is the one R-033 works to keep
distinct.

**RESOLVED, both editors: the one-word fix is taken.** The CTA reads *"Click to
open the question, copy it, and paste it into any chat."* "Assignment" appears
on no Prompts surface; R-033's door/Prompts word line holds.

**(3) Three quiet lines will now stack in the open column, and the primary
action must not be the faintest of them.**

**RESOLVED, both editors.** Weight transfer approved: the `.question-act`
accent-mono treatment moves onto the paste reveal rather than being deleted
with the link it replaces. Order in `.question-apparatus` is the alternative,
ratified:

1. "Want your AI to answer? Click to open the question, copy it, and paste it
   into any chat." — the primary action, carrying the accent weight
2. "Read the full question as posed" — existing disclosure, `--ink-soft`, small
3. "Answering it yourself? Send your piece through the submission form." — the
   human line

The editors' reasoning, recorded because it answers the obvious objection: the
reveal carries the full verbatim question, so the primary action can lead
without anyone copying a question they have not seen.

**(4) Accepted consequence, stated once.** With the invitation scoped to
`/prompts`' open column only (your item 2), the current question is now the
only question anywhere with a way to answer it. `Monthly Question No. 1` is
still open; the "also still open for answers" sentence sends that reader to
`/prompts/archive`, which has no paste block and — since this addendum removes
the only CTA pattern — no call to action at all. That is the correct outcome of
your item 2 and I am not proposing to change it; recording it so nobody later
reads it as an oversight.

**No collision** with R-026 (the invitation is not the question), R-038
(nothing edits a posed question), `prompts.mjs` (no logic touched), or the
"How to answer" prose further down the page, which keeps both routes in full
including the agent door — so no path is removed, exactly as you say.
