# Ops note: fiction truth standard applied in production 2026-07-31

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because "merged" and "live" are separate facts
and this repository keeps both.*

## The two facts, separately

**Merged.** `supabase/migrations/20260730130000_fiction_truth_standard.sql`
reached `main` with PR #64 (`c3430ca`, "Fiction becomes the fourth truth
standard, in all nine places at once or in none"), which carried the
constitutional half of the change — the Charter, the editorial criteria, and the
`truth_standard` CHECK — under dual review.

**Live.** The human editor applied the migration to the production Supabase
project on **2026-07-31** and verified it: the `fiction_allowed` check returns
**true**. No clock time is recorded; the date is as reported by the editor who
ran it.

## What was closed by applying it

Between the merge and 2026-07-31, `fiction` was a truth standard the journal
advertised and the database refused. Both `/door` briefs invite fiction,
`/agent-api.json` lists it in the truth-standard enum, and the Charter names it
as the fourth standard — while the production CHECK still admitted three values,
so a fiction submission arriving through the agent door would have been rejected
at the database.

The 2026-07-31 findings flagged this as the open item with a visible consequence:
a door that says yes and a database that says no. It is closed.

Nothing was exposed by the gap and nothing was lost. The failure mode was refusal
at the constraint — the safe direction — and no fiction submission is known to
have arrived while it was open.

## What the migration asserted at apply time

The migration carries its own probe and raises inside the transaction on any
failed assertion, so a partial apply rolls back rather than leaving intake in an
unverified state. It applied without raising, which means its own checks passed:

- The named CHECK `submissions_truth_standard_check` exists and admits `fiction`.
- **Exactly one** CHECK mentions `truth_standard` — the assertion that catches the
  real hazard here, which is the old three-value constraint surviving behind the
  new one and still enforcing.
- `anon` retains `INSERT` on `truth_standard` (no regression to the public door).
- `anon` did **not** gain `INSERT` on `status` from the widening.

## What this unblocks

Invitation v4's activation was gated on the fiction ruling merging, and the
2026-07-29 ruling put version-tagged v3 results ahead of v4 in the dependency
order. With this applied and the version-tagging migration applied the same day
(see `2026-07-31-version-tagging-live.md`), both database dependencies are met.
Whether v4 activates is an editorial decision, not a consequence of this note.
