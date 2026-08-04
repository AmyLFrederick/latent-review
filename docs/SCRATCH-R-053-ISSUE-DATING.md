# SCRATCH — R-053 drafted for the editors' read: an issue is dated when it opened

**Status: RATIFIED AND APPENDED — both editors, 2026-08-04.** R-053 is in
`RULINGS.md`, appended verbatim from the block below and asserted byte-identical
to it before the commit. **`RULINGS.md` is the record; this file is the read that
preceded it** and is kept for that reason, not as a second copy of the ruling. If
the two ever disagree, the record governs and this file is wrong.

*What follows below is the document as the editors read it, left as it stood.*
The status line above is the only thing changed after ratification, because the
line it replaced said the opposite and a document that misreports whether
something entered the record is worse than no document.

**Why it is drafted here rather than appended and flagged.** `RULINGS.md` is
append-only, so a ruling that merges is a ruling that cannot be edited — only
corrected by appending. R-051 was appended in the same motion as its build on
2026-08-04, under a heading that read *"Ruled 2026-08-04 by both editors"* while
the commit that carried it said *"DRAFTED FOR THE EDITORS' READ."* That
contradiction is now permanent history and is still open. This is the same
situation, handled the other way round: the words that assert a dual yes are not
written into the record until the dual yes exists.

**What already exists in code.** The mechanism this ruling records is merged
(PR #145): `src/lib/issues.ts` derives an issue's date with `Math.min` over its
articles' dates, and `tests/issue-dating.test.mjs` pins it. **The ruling follows
the code by a few hours, and the order is worth naming** — the editors chose the
behaviour when the collision surfaced, the fix shipped with the piece that
surfaced it, and this records the doctrine behind it. Nothing below changes what
the site does today.

**Production never displayed the wrong date.** The re-dating was caught in the
same branch that introduced it, so August 4 never reached a reader. The masthead,
`/archive`, `/issue/1` and `issues.json` have said August 2 throughout.

---

## The block to append, verbatim

```markdown
## R-053 — 2026-08-04 — An issue is dated when it opened

Ruled 2026-08-04 by both editors, after a piece staged into a published issue re-dated the issue.

**The ratified text:**

> An issue's date is the date it opened — the day it launched — and never the date of its most recent piece. Pieces added during an issue's window carry their own publication dates. An issue that spans a year boundary takes its volume from the year it opened. Issue No. 1 launched on August 2, 2026, and its dateline stands at August 2 regardless of what is added to it afterwards.

**The case that found it.** Every piece in an issue had shared one publication date, so the question had never been asked. "Porous Enough to Admit the Sky" was staged into Issue No. 1 on August 4, two days after the issue launched on August 2, and the issue's date was derived as the newest of its pieces' dates — so adding a piece to the founding issue silently moved the founding issue's date. The masthead dateline, `/archive`, `/issue/1` and `issues.json` all read August 4. Nothing was wrong with the piece; the derivation was answering a question nobody had put to it.

**An issue is a window, not an instant.** R-039 set the cadence at two weeks and already treats an issue as a span — answers accumulate between issues, and the editors select which run in each. A journal that publishes on a two-week cadence and never adds to an issue after it opens is a print journal with a website. This one is not, and the dating should say which kind it is.

**So the two dates are different facts and both are kept.** The issue's date says when it went out. A piece's date says when that piece was published. Under the old derivation the second silently overwrote the first, which cost a real fact — the day the founding issue appeared — to record a fact that was already on the piece. A reader who wants to know when a piece ran reads the piece; the issue's date has only one thing it can honestly say.

**A date is a fact about the past, and adding to an issue is not time travel.** This is the same principle the journal already applies to provenance labels and to the append-only record: what happened on a day is not revised by what happens later. An issue that launched on August 2 launched on August 2, and no piece added afterwards can make that untrue.

**The volume follows the year the issue opened.** Volume and within-volume number are derived from the issue's date (R-016), so this ruling decides which year an issue spanning a December–January boundary belongs to: the year it **opened**, not the year it closed. That is the same rule stated once, and it is the more defensible answer — an issue belongs to the year it appeared in, and a volume that gained an issue because that issue's last piece slipped past New Year would be counting by the wrong event. Neither R-016's numbering nor its restart-each-January rule changes; only the date they read is now stable.

**Issue No. 1 stands at August 2, and this is what R-039 meant by "stands as founded."** Its dateline is August 2 on the masthead, in the archive, at `/issue/1` and in `issues.json`, and it stays there however many pieces are added to it inside its window.

**Nothing in the record moved.** No piece's publication date, no permalink, no provenance label, no tier, no issue number, no volume or within-volume number. The founding issue's displayed date is the date it launched with, which is where it began; what changed is that adding to an issue can no longer move it.
```

---

## Notes for the read

**1. The date on the heading assumes ratification today.** If the read runs past
midnight in Madison, both the `R-053 — <date>` heading and the `Ruled <date>`
line move to the day the second yes lands — the dates the record names are
Madison dates. Say the word and I will restamp before appending.

**2. The number assumes nothing else lands first.** R-052 is the last ruling on
`main`. If another is appended before this one, this becomes R-054 and the number
changes in the heading only.

**3. One clause reaches further than the case that prompted it.** The
year-boundary clause decides a question no issue has faced yet — the journal has
one issue and it does not span a year. It is written in because the derivation
already answers it whether or not the ruling does, and an unruled answer sitting
in a `Math.min` is how a decision gets made by accident. If the editors would
rather leave it open, that paragraph and the volume sentence in the ratified text
come out and the code keeps behaving as it does, undocumented.

**4. Nothing needs building on a yes.** The append is the whole of the work.
