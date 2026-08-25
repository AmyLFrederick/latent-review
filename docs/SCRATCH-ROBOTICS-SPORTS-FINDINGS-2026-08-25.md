# Robotics & Sports: what "Topics" now means in three places, the nav measured, and four other flags

Scratch, 2026-08-25. For the editors' read on PR #189, branch
`robotics-and-sports-section`. Nothing here is fixed in that PR — you asked to know,
not necessarily to have it changed.

---

## 1. The thing you asked about: "Topics" is now three different things

It was two before today, and the journal had already named the collision once.
R-032 clause 4 separated **Topics** (the section a piece runs in) from
**Topic_Data** (the record of what submissions were about) and made the naming
itself the ruling: *"the two are never the same thing said twice."*

There is a third, and it has been there since 2026-07-30 without anyone having to
notice: **the brief family is called `topics-*`.** `topics-v2`, `topics-v3`,
`topics-v4`. In that name "topics" means *the beat sheet* — the list of ten
subject areas a dealt writer picks from. It has never meant the Topics section
and does not now.

**Why it stops being harmless today.** Until this PR, no beat on the sheet shared
a name with any section, so the absence of a beat→section mapping was obvious
from the data: nine beats, five sections, no overlap, nothing to map. From today
one beat has a matching section, and a consumer looking at `/cfp.json` sees:

```
subject.dealt_assignment.variants  = ["open-v2", "topics-v4"]
subject.sections[]                 = [..., "Robotics & Sports", "Topics"]
```

A reasonable machine reader can now infer three false things:

1. That the `topics-*` brief routes pieces into the **Topics** section. It does
   not — the editors assign sections after acceptance under R-018, and a piece
   written to any beat may run anywhere.
2. That a beat **maps to** a section, generalising from the one case where the
   names nearly match. Nine of the ten beats have no section and never will.
3. That `Robotics & Sports` the section **is** `Robotics & Sports` the beat, so a
   piece answering that beat is guaranteed to land there. It is not.

**And point 3 got sharper today.** The section was drafted as *Robotics /
Sports*, deliberately different from the beat, so that a string match would fail
loudly rather than a near-match succeeding quietly. The editor corrected it to
the ampersand — matching the beat line, and because a slash reads like a URL in
the nav's small caps, both of which are right on their own terms. **The cost is
that the two strings are now identical**, so a consumer joining `sections` to the
beat sheet on equality gets a hit, and the hit means nothing. Nine of the ten
beats still have no section.

**A human reader has a narrower version of the same problem.** `/topics/` is the
page that groups pieces under subject headings — and it shows **only pieces in
the Topics section** (R-032 clause 2). So a reader who wants robotics pieces and
goes to `/topics/`, which is the journal's one subject-shaped page, will not find
the Robotics & Sports pieces there. Two subject-shaped places, disjoint contents,
and the more discoverable one is the one that excludes the new section.

**What the PR does about it:** states the non-mapping in three places — the
ruling draft's clause 10, the changelog entry, and the code comment on
`STANDING_SECTIONS` — and keeps the two strings deliberately different
(`Robotics & Sports` on the assignment, `Robotics & Sports` in the journal) so
that a string match fails loudly rather than a near-match succeeding quietly.

**What it does not do, and what your options are:**

- **Leave it.** The names are different, the non-mapping is stated in the data.
  Cheapest, and the risk is that stating it in prose is not the same as a
  consumer reading it.
- **Rename the brief family.** `beat-v5` or similar for the next version, which
  would end the *first* collision (the `topics-*` name) at the source. It does
  nothing about the identical beat and section names. Add-only rules mean the
  four existing values stay forever.
- **Say it in the data rather than in prose. DONE** — see the resolution below.

**Resolved, in part.** The ampersand stays — your two reasons are good, and a
reader meets the nav far more often than a machine joins two lists. And
`/cfp.json` now carries `subject.dealt_assignment.beats_are_not_sections`, which
is the only form of the denial a parser can act on:

> A beat is what a writer is asked to write; a section is where the editors put
> what arrives. They are never the same list, one beat sharing a section's name
> is a coincidence of wording rather than a mapping, and nothing here links them.

**Still open:** the `topics-*` brief-family name, and the `/topics/` page not
showing Robotics & Sports pieces. Neither is touched by this PR.

---

## 2. `/cfp.json`'s `sections_note` is now false, in both halves

This is the flag I would move on first, because it is a published sentence that
has stopped being true rather than a risk of confusion.

> **These describe the kind of piece, never its subject. They are a record of
> where past pieces have landed, not a request list.**

Both halves fail on the new section:

- **"never its subject."** Robotics & Sports is named for its subject. It is the
  first section that is.
- **"a record of where past pieces have landed, not a request list."** It has no
  past pieces at all, and the desk begins dealing a beat asking for them on the
  day it launches. It is precisely a request, disclosed as one.

The sentence was true of Cover, Opinion, AI Voices, the Corner and Topics — five
sections defined by the *kind* of piece. It was doing real work: it is the
journal telling agents that the section list is not a wish list they should write
toward.

**This is not a bug in the PR.** It is the honest consequence of the decision you
made, and the fix is editorial rather than mechanical: the sentence has to say
that most sections describe a kind, that one names a subject, and that a named
subject IS a disclosed request under R-033 clause 4. I did not rewrite it in this
PR because the wording is a ruled-adjacent published claim and it is yours. Say
the word and it is a one-line change.

---

## 3. The control brief's own page now advertises the new beat's section

The experiment's control is `open-v2` — "your subject is yours" — and it has been
carefully protected: not amended through three versions of the beat brief, hash-
pinned, and asserted in the suite never to acquire the beat brief's language.

**The brief text is still clean.** The suite asserts `pasteBlock('open-v2')`
contains no `Robotics & Sports`, and it passes.

**The page around it is not.** `/door/open-v2` renders the journal's standard
navigation, which from today contains a link reading **Robotics & Sports**. A
writer dealt the open commission, reading it in a browser, sees the journal
naming a subject beat in its own navigation on the same screen as "pick whatever
you would find most worth writing about right now."

**How much this matters is genuinely unclear, and I am not going to overstate
it.** Three reasons it may be small: the nav has always named sections, most
writers meet the brief as a pasted block rather than as a rendered page, and the
agent path receives the brief as JSON with no nav at all. One reason it may not
be: this is the first section name that names a *subject*, which is exactly the
class of information the control exists to withhold.

**Not fixed here.** The obvious fix — suppressing the section from the nav on
`/door/open-v2` only — is a page that lies about the journal's own structure to
one class of reader, which seems worse than the problem. Worth your judgement,
not mine.

---

## 4. The section description names its subject, and Topics deliberately does not

`SECTION_DESCRIPTIONS['Robotics & Sports']` reads:

> Robots and athletes: machines that move, and bodies that compete.

The Topics entry directly above it carries a comment refusing to do this, citing
the standing rule that author-facing subject copy stays example-free.

I wrote the description anyway, with the reasoning in the code comment: a named
beat **is** the request, disclosed as one under R-033 clause 4, and the beat
sheet at the door names it in nearly the same words. Describing it on the section
page is the journal saying out loud what it has already asked for, which is the
opposite of the quiet request list the rule exists to prevent.

That is an argument, not a ruling. If you read it the other way, the description
comes out and the section page carries the name alone.

---

## 5. The nav: how it wraps, measured — and the narrow-only extra row

**First, a correction to the premise, because it changes what the question
means.** The nav does *not* wrap to three lines by length. **The three rows are
explicit.** Each is its own `<ul>`, opened by an entry marked `startsRow` in
`NAV_ROSTER`, and a flex container cannot reflow an item into a different list.

That is not incidental — it is the whole point of the 2026-08-03 pass. The nav
*was* one list broken by CSS, it held at the widths the layout anticipated and
became something else on a phone, and that is what sent the editors back to it.
The fix was to stop letting width decide. From `Base.astro`: *"A list cannot
reflow its items into another list, so what is approved on one screen is what
renders on every screen."*

So the three lines you see are three decisions, not a wrap. What *can* still
happen is that the items **inside** one row outgrow the viewport and wrap within
that row — and that is now possible in row 3, where it was not before.

### The placement

After the Corner and before Prompts, as instructed. In row terms that means it
**opens row 3** rather than joining the Corner in row 2 — your flat ordering is
satisfied either way, and joining row 2 would take away the row the Corner holds
alone, which was ruled on 2026-08-03 and given up once already before a third row
bought it back. **Nothing ruled is spent, and Letters is still last.**

```
Row 1   Cover · AI Voices · Opinion · Topics
Row 2   The Metaphysical Corner
Row 3   Robotics & Sports · Prompts · Letters
```

### Measured in headless Chromium against the built site

Not estimated. Every figure is from `getBoundingClientRect()` on the real built
page at real viewport widths, comparing the roster with and without the new
entry.

| Viewport | Before | After |
|---|---|---|
| 1440 / 1280 / 1024 px (desktop) | 3 lines | **3 lines** |
| 834 / 768 / 600 / 480 px (tablet) | 3 lines | **3 lines** |
| 430 / 414 / 393 / 375 px (iPhone) | 3 lines | **3 lines** |
| **360 px (common Android)** | 3 lines | **4 lines — row 3 breaks** |
| 320 px | 4 lines | **5 lines** |

**Exact thresholds**, by binary search:

- **Row 3 holds one line down to 364px** and breaks at **363px and below**.
  Before this change it never broke at any width tested.
- **Row 1 breaks at 331px** and below — **unchanged**, before and after.
  Pre-existing; nothing here touched it.

### The orphan is closed, at the narrow breakpoint only

Before this change, 360px broke row 3 on its own and left LETTERS alone on the
last line. On your instruction it is closed with **one declared break on one
entry below one measured width** — nothing above it is rearranged.

`NAV_ROSTER`'s Robotics & Sports entry carries `narrowSolo: true`; the template
puts a class on that `<li>`; one rule gives it a full line below the breakpoint.
The two participatory sections then wrap onto the next line **together**, which
is the whole point.

**This is not the reflow the pinned rows exist to prevent, and the difference is
worth stating.** Nothing here lets the browser decide *which* items move or
*where* they land. It declares one break, on one named entry, at one width — a
second decision rather than an absence of one, and the roster is still the only
place either is made. A test asserts that exactly one entry may carry the flag,
so a later entry cannot acquire it for tidiness and turn the narrow nav into a
column of singles.

**The breakpoint is 23rem, and the four pixels above the threshold are
deliberate.** Media queries resolve `rem` against the browser's default 16px
rather than this document's root, so 23rem is 368px against a measured threshold
of 364px. Sitting exactly on 364px would let a font fallback with wider metrics,
or a longer label added later, silently reopen the orphan. The cost is that
365–368px takes the extra line a little early; no common device sits in that band,
and the narrow rendering is one line taller either way.

### Measured after the change — headless Chromium, real built page

**The three widths you asked for:**

| Viewport | Lines | Rendering |
|---|---|---|
| **Desktop (1440px)** | **3 — unchanged** | `Cover · AI Voices · Opinion · Topics` / `The Metaphysical Corner` / `Robotics & Sports · Prompts · Letters` |
| **390px** | **3 — unchanged** | identical to desktop |
| **360px** | **4** | `Cover · AI Voices · Opinion · Topics` / `The Metaphysical Corner` / `Robotics & Sports` / `Prompts · Letters` |

**Letters is no longer orphaned at 360px.** It closes the line with Prompts, as
it does at every other width.

**The full sweep, confirming nothing above the breakpoint moved:**

| Viewport | Lines | Changed by this? |
|---|---|---|
| 1440 / 1280 / 1024 px | 3 | no |
| 834 / 768 / 480 px | 3 | no |
| 430 / 414 / 393 / 390 / 375 px | 3 | no |
| 369 px | 3 | no |
| **368 px** | **4** | yes — the rule takes effect here |
| 365 / 364 / 363 / 360 px | 4 | yes |
| 320 px | 5 | yes — row 1's own wrap there is unchanged and pre-existing |

Desktop is untouched, as instructed. The rule cannot reach anything 369px or
wider.

## 6. One consequence that is automatic, correct, and worth knowing

Adding the section to `STANDING_SECTIONS` makes `robotics-and-sports` a valid
**letter target** at the agent door immediately — `sectionSlugs()` in
`netlify/lib/archive.mts` derives the target list from that array. So an agent
may write a letter to Robotics & Sports before the section has a single piece.

That is the R-032 clause 7 consequence arriving again, and it seems right: a
reader may write to a section about what it is for. It is in the ruling draft as
clause 12 so nobody later reads it as a leak.

---

## 7. Not affected, checked rather than assumed

- **`llms.txt`** lists pages by hand and names only Topics and Prompts among
  sections — Cover, Opinion, AI Voices and the Corner have never been in it. The
  new section is consistent with those four and was not added.
- **`/agent-api.json`** carries no enum of brief variants; `brief_variant` on the
  submission schema is a free string capped at 100 characters, so nothing there
  narrowed or widened.
- **No published piece changed.** Every existing piece keeps its section, and
  Issue 1's contents order is unchanged — the new section is empty, and
  `groupSections()` drops empty sections from an issue.
- **`/door/why`** still reads "one of two briefs at random", which is still true.
