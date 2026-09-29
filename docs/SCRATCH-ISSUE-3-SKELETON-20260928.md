# Issue No. 3 — the skeleton, as built on `issue-3`

Written 2026-09-28 by the build session, from the state of the branch. It is a
record of what the issue holds, what it does not, and which of the absences are
the editors' to fill. Nothing here is a decision; the decisions are named as
open.

## What the issue is

Everything below is DERIVED from one file — `src/content/articles/the-one-who-wouldnt-take-the-couch.md`. There is no issues collection and no stored issue, so
staging the piece is what creates Issue No. 3. Verified against a local build of
this branch.

| Surface | State |
| --- | --- |
| `/issue/3/` | Built. Permanent URL, as every issue's is. |
| Issue date | **2026-10-01**, and it is derived, not typed. R-053 dates an issue from its first publication — `min()` of its pieces' dates — and this issue has one piece, dated the day it opens. |
| Volume / number | Vol. 1, No. 3 (R-016). Derived from the date. |
| `/archive/` | Card present, in the issue-first design: "Issue No. 3" as the heading and the link, "Vol. 1, No. 3 · October 1, 2026" beneath it, roster line "1 piece · Claude". **No cover line**, because the issue has no Cover piece — the card omits the line rather than printing an empty label. |
| `/issues.json` | Entry present, `"number": 3`, with the piece and its full provenance record. |
| Homepage | Issue No. 3 is the current issue **on this branch**. That is the 1 October state; the homepage is a view of the highest-numbered issue and nothing had to be switched. |
| `/section/research/` | Lists the piece. |
| Issue No. 2 | Unchanged. `/issue/2/` names "Scientific Research" exactly once, in the site-wide navigation, which every page carries and which is not a surface of Issue No. 2. Its contents list, its cover, its roster and its send log are untouched. |

## The empty slots

Each of these is empty because filling it would mean writing editorial content,
which this build was told not to do. None is a build gap.

**Cover story — empty, and the house empty state is already running.** An issue
may have no Cover piece; `Issue['cover']` is optional and every surface handles
its absence. `/section/cover/` renders the section page's own copy, unedited and
unconditioned:

> No piece in this issue. Quality decides the count — a thin issue ships thin. This section's earlier work is in the [archive](/archive/).

The same sentence runs on `/section/ai-voices/`, `/section/opinion/`,
`/section/the-metaphysical-corner/` and `/section/robotics-and-sports/`, for the
same reason: a section page shows the CURRENT issue (R-059's standardisation,
2026-09-08), and no piece in any of them has been staged into Issue No. 3.

**Editors' note — no slot exists to leave empty, which is worth knowing before
one is looked for.** The repository has no issue-level editors' note. What it
has is two per-piece fields — `editorial_note`, a labelled one-line disclosure,
and `editors_note`, a longer unlabelled note rendered beneath a piece's body —
and a `--note` flag on the digest script that takes a Markdown file written by
the editors for that issue's mail. The Couch piece carries neither field, and
the digest has no note file. Whether Issue No. 3 opens with an editors' note is
an editorial decision; if the answer is yes, the question of *where it lives*
is a build question that has not been asked yet.

**Monthly Question No. 4 — and this one is a discrepancy, not an omission.**
Issue No. 3's question is already posed, and it is **No. 3**, not No. 4:

```
number: 3   issue: 3   status: open
opened: 2026-09-01   closes: 2026-11-01
"The Wars That Outlive Their Plans"
```

It is recorded against `"issue": 3` in `src/data/prompts.json`, and the closing
date is the standing rule applied to this issue — the first of the month after
its publication month, October's issue closing on 1 November. The two sequences
are separate counts that have coincided so far (Q1/Issue 1, Q2/Issue 2, Q3/Issue
3), and the file says in its own schema note that the pairing is **recorded,
never computed**. So on the record as it stands, No. 4 belongs to Issue No. 4.

Nothing was added. Creating a Monthly Question No. 4 for this issue would either
duplicate a question this issue already has or put a numbered, empty question
into a public and permanent file — which that file's first paragraph warns
against by name. **If the editors meant that Issue No. 3 should carry a second
question, or that Q3 should be re-paired, that is theirs to say.**

## The digest

**Template only. Nothing sent, nothing scheduled, and nothing could be.**
`scripts/send-issue.mjs` is manual by design and reads an issue's contents from
the LIVE site's `/issues.json`, so no digest for Issue No. 3 can be composed —
dry run included — until the issue is deployed.

What the digest needed for this issue is done: its mirrored `STANDING_SECTIONS`
array, which it keeps by hand because it is plain node and cannot import the
TypeScript roster, now carries "Scientific Research" in the same position the
site's roster does. The suite asserts the two arrays are identical **and in the
same order**, so the section cannot go unmentioned in the only mail the issue
gets.

Two things about the digest remain the editors':

- **The excerpt manifest.** The path convention is `docs/digests/issue-3-excerpts.json`, and it holds passages the editors choose where a piece's opening is not the right doorbell. There is none for this issue. Omitting it is silent and not an error: every piece simply mails its opening paragraph. The Couch piece's opening paragraph is a clean doorbell, so this may be the right answer — but it is a choice, not a default anyone should inherit.
- **The editors' note for the mail** (`--note`), as above.

**Known and not fixed tonight:** the digest orders sections by its mirrored
`STANDING_SECTIONS`, while the site has ordered an issue's contents by the
navigation roster since 2026-09-07. The two agree for this issue, because it has
one piece. They are two different orderings and the mismatch predates this work.

## Checks run on this branch

- `npm test` — 741 tests, 0 failures. `tests/as-submitted-no-scaffold` is green; it is not failing on this branch.
- `npm run build` — 69 pages, clean. The build's own gates passed, including the consent-record coverage gate (R-058), the issue-contiguity check, the concepts vocabulary and the changelog well-formedness check.
- `npm run check:rulings` — append-only, 866 base lines intact.
