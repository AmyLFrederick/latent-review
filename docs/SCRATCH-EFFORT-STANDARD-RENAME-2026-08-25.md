# Light → Standard: what names the old value, and where

Scratch, 2026-08-25. For tonight's documentation pass. PR #187, branch
`effort-standard-rename`, based on `main` at 78c857d.

---

## 1. Nothing in the Charter needs your pass

Checked line by line. `docs/CHARTER.md`, "What a piece asks of a reader"
(lines 75–90), **names no level value at all.** Its two examples are
*"5 min · Medium effort"* and *"High effort"* — both unchanged by this
rename. The passage is correct as written and I left it alone.

If you want the floor named there for completeness, the sentence that would
carry it is the one beginning **"Effort is assigned by the editors"** — but
nothing there is wrong today.

---

## 2. What /for-agents now says — already updated in the PR

Two rows in the `effort` table changed. You may want to reword the second
half of the first one tonight; the wording is mine, not ruled.

**`level` row, values cell:** `standard` · `medium` · `high` · `null`

**`level` row, meaning cell** — the sentence I added at the end:

> The floor was `light` until 2026-08-25; renaming the value is all that
> changed, and no piece moved rungs.

**`display` row:** The words we print: *Standard effort*, *Medium effort*,
*High effort*. `null` with an unassigned level.

Nothing else on that page names a level value. The prose sections above the
tables ("Effort and reading time", "Why the effort level is not computed")
use *High effort* as their example throughout, which is unchanged.

---

## 3. Everywhere the old value still appears, and why

Four places, all deliberate. None is a miss; each is there so a consumer or a
reader who meets `light` in a stored record can find out what happened to it.
Say the word and any of them comes out.

| Where | What it says |
|---|---|
| `/agent-api.json` → `reading.indicator_fields.effort.fields.level.note` | "THE FLOOR WAS `light` UNTIL 2026-08-25 and is `standard` from that day…" |
| `/agent-api.json` → `…fields.display.note` | "`Light effort` was the floor's display until 2026-08-25" |
| `/for-agents` | the sentence quoted in §2 above |
| `/changelog.json` | the new 2026-08-25 entry, which names both values |

And two that are **not** about the effort level at all, so leave them:

- The provenance notation's *"the pencil marks light-touch help"* — appears
  in `agent-contract.mjs`, `notation.ts`, `changelog.mjs`, `/for-agents`.
- `THRESHOLD_LIGHT` in `tests/reading-effort.test.mjs` — a guard asserting a
  constant from the withdrawn computed version has not come back. It was
  never a level's name.

---

## 4. One decision that is yours, not mine

**The value was live for two days.** `light` reached `/issues.json`,
`/corpus.jsonl` and `/agent-api.json` on 2026-08-23 and has been there since.
So this rename is a break a machine consumer can see — the first one the
journal has shipped. That is different from the withdrawn computed levels,
which the changelog is careful to say never reached a feed.

I have written the changelog entry to say this plainly and to tell a consumer
that pinned the enum or matched the string to update. Two days of exposure on
a two-day-old field is about as cheap as such a break gets, and I think the
rename is worth it — but the honesty of that entry is the thing to read
before you merge, because it is the journal's first admission of the kind.

**Changelog date.** The entry is dated **2026-08-25**, the Madison day this
is expected to reach `main`. If the merge slips past Madison midnight it
wants a bump to 08-26 before it lands.

---

## 5. One note on the ladder itself — not a blocker

*Standard* and *Medium* are near-synonyms in ordinary use, so the ladder
reads as two middles and a top rather than as three rising steps. Your
reasoning holds regardless — *standard* is doing a different job than
*medium* does, naming what a typical reader handles rather than a position on
a scale — and I built it as ruled. Flagging once, in case a third word for
the middle rung is worth a minute tonight while the documentation is open.
If not, it stays as it is and I will not raise it again.

---

## 6. Two older items, unrelated, still open

- **PR #147** — the R-053 append, open since 2026-08-04.
- **The R-054 gap** — the log still reads R-053 → R-055.

Both are editors' calls. Neither is urgent.
