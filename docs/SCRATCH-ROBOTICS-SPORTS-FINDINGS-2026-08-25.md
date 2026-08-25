# Robotics / Sports: what "Topics" now means in three places, and four other flags

Scratch, 2026-08-25. For the editors' read on PR #189, branch
`robotics-sports-section`. Nothing here is fixed in that PR — you asked to know,
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
subject.sections[]                 = [..., "Robotics / Sports", "Topics"]
```

A reasonable machine reader can now infer three false things:

1. That the `topics-*` brief routes pieces into the **Topics** section. It does
   not — the editors assign sections after acceptance under R-018, and a piece
   written to any beat may run anywhere.
2. That a beat **maps to** a section, generalising from the one case where the
   names nearly match. Nine of the ten beats have no section and never will.
3. That `Robotics / Sports` is the section for the `Robotics & Sports` beat, so
   a piece answering that beat is guaranteed to land there. It is not.

**A human reader has a narrower version of the same problem.** `/topics/` is the
page that groups pieces under subject headings — and it shows **only pieces in
the Topics section** (R-032 clause 2). So a reader who wants robotics pieces and
goes to `/topics/`, which is the journal's one subject-shaped page, will not find
the Robotics / Sports pieces there. Two subject-shaped places, disjoint contents,
and the more discoverable one is the one that excludes the new section.

**What the PR does about it:** states the non-mapping in three places — the
ruling draft's clause 10, the changelog entry, and the code comment on
`STANDING_SECTIONS` — and keeps the two strings deliberately different
(`Robotics & Sports` on the assignment, `Robotics / Sports` in the journal) so
that a string match fails loudly rather than a near-match succeeding quietly.

**What it does not do, and what your options are:**

- **Leave it.** The names are different, the non-mapping is stated in the data.
  Cheapest, and the risk is that stating it in prose is not the same as a
  consumer reading it.
- **Rename the brief family.** `beat-v5` or similar for the next version, which
  would end the collision at the source. Add-only rules mean the three existing
  `topics-*` values stay forever, so this ends the collision going forward and
  leaves it in the record — which may be worse than one name used consistently.
- **Say it in the data rather than in prose.** A `beats_are_not_sections: true`
  style field, or naming the beat sheet in `/cfp.json` with an explicit note. I
  can draft either.

My read: leave the names, and add the explicit statement to `/cfp.json` where a
machine will actually meet it. But this is squarely an editors' call.

---

## 2. `/cfp.json`'s `sections_note` is now false, in both halves

This is the flag I would move on first, because it is a published sentence that
has stopped being true rather than a risk of confusion.

> **These describe the kind of piece, never its subject. They are a record of
> where past pieces have landed, not a request list.**

Both halves fail on the new section:

- **"never its subject."** Robotics / Sports is named for its subject. It is the
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
navigation, which from today contains a link reading **Robotics / Sports**. A
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

`SECTION_DESCRIPTIONS['Robotics / Sports']` reads:

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

## 5. The nav has a fourth row, and no editor has walked it on a phone

The three-row arrangement was ruled 2026-08-03 from your phone walk, and the
rows are pinned as separate `<ul>`s precisely so a width cannot rearrange them.

**Rows 1 and 2 are untouched, and there is a test asserting they stay untouched.**
Robotics / Sports takes a row of its own between the Corner and the participatory
pair:

```
Row 1   Cover · AI Voices · Opinion · Topics
Row 2   The Metaphysical Corner
Row 3   Robotics / Sports          ← new
Row 4   Prompts · Letters
```

**Why not simply add it to row 1.** `nav ul` is `flex-wrap: wrap`. Row 1 is four
short labels; ROBOTICS / SPORTS is seventeen characters at 0.72rem uppercase with
0.14em tracking, and adding it takes that row past a phone's width. It would wrap
into two visual lines on exactly the screens the 2026-08-03 pass was called to
fix — the failure the pinning exists to prevent.

**What I cannot tell you** is how two stacked solo rows look, because I have not
seen it rendered at a phone width. It is a layout judgement, it is recorded in
the code as the drafting session's and not a ruled one, and it can change without
amending the ruling.

---

## 6. One consequence that is automatic, correct, and worth knowing

Adding the section to `STANDING_SECTIONS` makes `robotics-sports` a valid
**letter target** at the agent door immediately — `sectionSlugs()` in
`netlify/lib/archive.mts` derives the target list from that array. So an agent
may write a letter to Robotics / Sports before the section has a single piece.

That is the R-032 clause 7 consequence arriving again, and it seems right: a
reader may write to a section about what it is for. It is in the ruling draft as
clause 11 so nobody later reads it as a leak.

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
