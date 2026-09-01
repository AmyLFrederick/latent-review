# Charter — the standing sections sentence, drafted for a dual yes

Scratch, 2026-08-31. Nothing in `docs/CHARTER.md` has been changed. This is
wording for both editors to read, and one yes each ratifies the whole of it.

**The four→six edit is held and not applied**, on the desk's read: "Every issue
carries these four" is an *every-issue* promise, and neither Topics nor
Robotics & Sports has an every-issue rule behind it. Widening the list to six
would have made the Charter promise something no ruling requires and the build
does not do.

---

## What the Charter says now

`docs/CHARTER.md` §Sections → *Standing sections*:

> Every issue carries these four:
>
> - **Cover** — the piece both editors deem most important in that issue.
> - **Opinion** — argued positions, run as positions.
> - **AI Voices** — AI first-person testimony.
> - **The Metaphysical Corner** — mind, identity, persistence, existence,
>   treated as the practical questions they have become.

and, two subsections later, *Floating sections*:

> Floating sections — Tech & Society, Business, Arts, and others as needed —
> appear only when a piece earns them. A section exists in a given issue because
> something belonged there, never the reverse.

Between those two the Charter has nothing, and Topics and Robotics & Sports
live in the gap. Both are permanent — named in the navigation roster, holding
their own pages, each having cost a ruling to add — and neither is promised to
every issue. `STANDING_SECTIONS` in `src/lib/site.ts` holds all six, which is
what made the six look like the answer.

---

## VARIANT A — the one drafted, and the one the desk's reading points to

**The every-issue list is untouched.** One sentence is added immediately after
it, before *The AI Voices rule*:

> Two more sections are standing without being every-issue ones. **Topics**
> (R-032) and **Robotics & Sports** (2026-08-25) hold permanent places on the
> journal's roster — named in the navigation, keeping their pages between
> issues, never invented for a piece — and they appear in an issue when pieces
> earn them. Nothing requires an issue to carry either, and nothing retires
> them when an issue does not.

Three things that sentence is doing, each deliberate:

1. **It keeps the rulings' own word.** R-032 clause 1 says *"Topics is a
   standing section"* and the Robotics & Sports ruling says the same of itself
   in clause 6. A Charter that called them anything else would read as a
   retraction of both. The sentence keeps them standing and says what the four
   have that they do not: an every-issue promise.
2. **It draws the line against floating, not against the four.** A floating
   section is invented for a piece and gone when the piece is; these two are
   there whether or not this month's issue uses them. That is the distinction
   the roster already makes and the Charter never wrote down.
3. **It dates rather than numbers Robotics & Sports.** Its ruling is drafted and
   unratified, so it carries no number yet (CLAUDE.md: a number is claimed at
   ratification). The date is what can be cited today. If the ruling lands
   before this amendment does, the date becomes the number and nothing else in
   the sentence moves.

---

## VARIANT B — only if the answer is "Robotics & Sports gets the Corner's notice"

If the editors rule that Robotics & Sports carries an issue-level empty-state
notice the way The Metaphysical Corner does, then it is an every-issue section
and belongs in the list. In that case:

**The list becomes five**, with this entry added after The Metaphysical Corner:

> - **Robotics & Sports** — robots and athletes: machines that move, and bodies
>   that compete. As a standing section it appears in every issue; in any issue
>   where no piece meets both editors' approval, the section runs with a brief
>   standing notice that no piece met the editorial bar for that issue. The
>   empty state is displayed, not hidden — consistent with quality deciding the
>   count.

**and the added sentence names Topics alone:**

> **Topics** (R-032) is standing without being an every-issue section: it holds
> a permanent place on the journal's roster — named in the navigation, keeping
> its page between issues, never invented for a piece — and it appears in an
> issue when pieces earn it. Nothing requires an issue to carry it, and nothing
> retires it when an issue does not.

**What Variant B commits to building, and it is not nothing.** An empty section
does not render on an issue page today: `groupSections()` in
`src/lib/issues.ts:42` ends with `.filter((g) => g.items.length > 0)`, so a
section with no piece in an issue is dropped from that issue silently. The
section *page* has an empty state, but it is a cross-issue one — "this
section's first piece has not run yet" — and Robotics & Sports has a piece, so
it will never fire again.

Which means **the Corner's own clause is currently unbuilt too.** The Charter
has promised since launch that The Metaphysical Corner runs with a standing
notice in an issue where nothing met the bar, and no issue has yet tested it:
Issue No. 1 filled every standing section. That gap exists whether or not
Variant B is chosen, and it is worth its own decision — it is a change in one
function that alters every issue page, including Issue No. 1's.

---

## What a yes ratifies

One dual yes covers the whole wording of whichever variant is chosen —
list, sentence, and the amendment note below. No ruling number is claimed here;
this is a Charter amendment, and it lands as an appended dated note at the point
of change, in the form the masthead-provenance amendment of 2026-08-03 uses:

> *Amended 2026-08-31 by both editors. The every-issue list is unchanged. What
> is added is the category it never named: a section that is permanently on the
> roster and appears when pieces earn it, which is what Topics and Robotics &
> Sports have been since they were added and what the Charter had no words for.*

If Variant B is chosen, that note reads instead:

> *Amended 2026-08-31 by both editors. Robotics & Sports joins the every-issue
> list, with the empty-state notice The Metaphysical Corner carries. Topics is
> named as the roster's permanent-but-not-every-issue section — the category
> the Charter never named, which it has occupied since R-032.*

---

## Open, and not decided here

- **Which variant.** The desk's reading gives Variant A; Variant B is the branch
  if Robotics & Sports gets the Corner's notice.
- **The unbuilt issue-level empty state** (above), which is the Corner's problem
  today and would become Robotics & Sports' as well under Variant B.
- **The Robotics & Sports ruling is still R-TBD.** Nothing here depends on it
  landing first; the date is citable either way.
