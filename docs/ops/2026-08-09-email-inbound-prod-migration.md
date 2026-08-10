# Ops note: the email-inbound migration applied, and what it did not fix

*Dated operational record, written 2026-08-09 (Madison) and backfilled the same
evening. Not a security disclosure — no vulnerability, no exposure, no incident.
Recorded because a schema change is live in the production database, and because
"merged" and "live" are separate facts that this repository writes down
separately (see the 2026-07-26, 2026-07-31 and 2026-08-01 notes).*

*Backfilled, and that is itself worth recording. The apply happened before this
note existed; the gap was noticed while diagnosing the failure below, not by the
process that should have caught it. Production receipts are always written —
this one was written late. The missing receipt was also briefly mistaken for
evidence that the migration had never run; see the false alarm below.*

## The two facts, kept apart

**Merged.** `supabase/migrations/20260810120000_email_inbound.sql` reached `main`
as part of PR #151 (`c4dac34`), with a probe correction in PR #152 (`ffd4865`).
Merging put the migration **in the repository**. It did not put a column in a
database.

**Live.** The migration was applied to the production Supabase project by the
human editor at **~8:55 PM Madison on 2026-08-09**, minutes after PR #152
merged. The editor reported the SQL editor's `Success. No rows returned.`

## What is verified, and by what

**Directly queried in production, 2026-08-09 ~10 PM Madison.** An
`information_schema.columns` query for the seven inbound columns returned
**exactly seven rows**: `arrival`, `raw_email`, `parse_warning`,
`attachment_note`, `arrived_at`, `received_date`, `received_date_source`.

That is attested and verified rather than inferred, and it is the load-bearing
half of the migration.

**Corroborated independently by the failure mode.** The first live email
submission returned `500 Storage failed` with PostgREST code **23514** naming
`involvement_tier_matches_track` — a database-level check violation. PostgREST
resolves every column in an insert against its schema cache before the row ever
reaches the database, and returns `PGRST204` when one is missing. Reaching a
23514 is therefore only possible with all seven columns present. The bug and the
receipt confirm each other.

## What a clean apply proves

This migration is transactional and ends with a `do $$` probe that raises
**inside** the transaction, so an apply that completed is an apply in which every
assertion held. The whole file ran — including `truth_standard drop not null`
and the `global_email_daily` cap insert.

Those two were **not separately queried**, so they are recorded here as inferred
from a clean apply rather than observed.
`20260810210000_email_tier_undeclared.sql` §2 restates both idempotently and its
probe then asserts them in production, turning the inference into an
observation. That is belt-and-braces, not doubt.

## The probe that PR #152 fixed, and a false alarm worth recording

`20260810120000`'s probe block was corrected three times before it was right,
the last of them in PR #152 (`ffd4865`) hours before the apply. Both probe rows
are now `human-attested` with the tier `'ai'`, because
`involvement_tier_matches_track` and `submissions_agent_identity_matches_track`
together leave no track that needs neither field. That is the version that was
applied and it applies cleanly; `scripts/sql-dry-run.sh` confirms the whole chain
from zero.

**A false alarm is recorded here because it nearly entered this receipt as a
finding.** During the diagnosis below, the dry run was run from a working tree
on the `desk-records-declarations` branch, which was cut *before* PR #152 and so
carried the pre-fix probe. It aborted, and the abort was briefly reported as
evidence that the committed text could not apply and that the applied bytes must
have differed from the repository's. **That was wrong, and the cause was stale
bytes in the working tree rather than anything about production.** No discrepancy
exists: what was applied on 2026-08-09 is what `main` carries.

The lesson is cheap and worth keeping: a dry run proves something about the
commit it was run against, and a branch is not `main`.

## What this migration did NOT fix, and the outage it caused

`involvement_tier_matches_track` (from `20260717120000`) requires a
human-attested row to carry an involvement tier. The email door writes
`human-attested` with a tier that is **NULL whenever the sender declared none** —
absent by design, under the 2026-08-10 principle that the desk does not supply
what the author did not declare.

Every email submission therefore failed at the insert with `500 Storage failed`.
The first was `msg_3HhnvGIv6IT2k8Gvmaw8CwpP03T`, 2026-08-10T02:36:36Z UTC
(2026-08-09 ~9:36 PM Madison). No submission was lost: Resend retains the
message and retries.

The migration made `truth_standard` nullable for precisely this reason and
missed the tier, because the tier's requirement does not live in a column
`NOT NULL` where one would look for it — it lives in a table-level constraint.

Fixed by `20260810210000_email_tier_undeclared.sql`. See
`docs/SCRATCH-EMAIL-INBOUND-500-2026-08-10.md` for the diagnosis.
