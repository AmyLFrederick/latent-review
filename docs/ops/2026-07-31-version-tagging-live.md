# Ops note: per-arrival version tagging applied in production 2026-07-31

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. It records one failed attempt caused by a platform outage,
because an ops record that keeps only the successful attempt is a worse record.*

## The two facts, separately

**Merged.** `supabase/migrations/20260730120000_submission_version_tagging.sql`
reached `main` with PR #63 (`95abaef`, "Version-tagging single — arrivals can be
tagged, and the submitter is the one party who cannot do it"), implementing the
2026-07-29 ruling that the repository is the versioning surface and arrivals
carry which invitation or announcement text reached the author.

**Live.** The human editor applied the migration to the production Supabase
project on **2026-07-31** and verified it: the `reached_by_version` column
exists. No clock time is recorded; the date is as reported by the editor who ran
it.

## The failed attempt, recorded

The first run **failed with "Failed to fetch"** during a Supabase platform outage
on the morning of 2026-07-31. The editor retried, the retry succeeded, and the
result was then verified.

**Why this is worth a paragraph rather than a footnote.** "Failed to fetch" is a
transport error — the browser could not reach Supabase — and it says nothing
about what the database did. It is exactly the shape of failure that leaves an
operator unsure whether the statement ran, partly ran, or never arrived. Here
that ambiguity is resolved by the migration's own construction rather than by
inference: it runs as a single transaction and raises inside it on any failed
assertion, so a partial apply rolls back. The possible outcomes were "fully
applied" or "not applied," never "half applied." Verification after the retry
established which.

The general lesson, already recorded on 2026-07-26 and reinforced here: a
migration stays an open checklist item until it is *verified applied* in
production. A retry that appears to succeed is not verification; the check
afterward is.

## What the migration asserted at apply time

It applied without raising, which means its own probe passed:

- `reached_by_version` exists on `public.submissions`.
- `authenticated` (the human editor) holds `UPDATE` on it, so the desk can tag and
  re-tag an arrival.
- **`anon` holds neither `INSERT` nor `UPDATE` on it.** These are the negative
  assertions the migration's own comments call the reason the file exists:
  self-reported tagging would be forgeable, and the whole point of the column is
  that the submitter is the one party who cannot write it.
- Regression guards: `anon` retains `INSERT` on `truth_standard` and on `body` —
  the public door lost nothing.

## Where this sits in the dependency order

The 2026-07-29 ruling has the two pending invitation-v3 cells run with results
"logged with version tags" **before** invitation v4 activates, and v4's
activation was itself gated on the fiction ruling merging. Tagging was therefore
upstream of fiction, not alongside it. Both are now applied and verified — this
one and `2026-07-31-fiction-truth-standard-live.md` — so the database half of
that sequence is complete. What follows is editorial.
