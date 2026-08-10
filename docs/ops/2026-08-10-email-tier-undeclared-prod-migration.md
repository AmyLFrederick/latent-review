# Ops note: the involvement-tier relaxation applied — TEMPLATE, NOT YET A RECEIPT

> **THIS FILE IS A TEMPLATE AND RECORDS NOTHING YET.** Every `☐` below is
> unfilled. It ships in the same PR as the migration so that the receipt exists
> before the apply rather than after it — the gap that made
> `2026-08-09-email-inbound-prod-migration.md` a backfill.
>
> **Two things to change when it becomes a receipt:** delete this block, and set
> the date in the filename and the line below to the **Madison** day of the
> apply. `2026-08-10` in the filename is a placeholder. Git stamps are UTC and
> will read a day later for evening work; the record does not follow them.

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because a schema change is live in the
production database, and because "merged" and "live" are separate facts that
this repository writes down separately.*

## The two facts, kept apart

**Merged.** `supabase/migrations/20260810210000_email_tier_undeclared.sql`
merged to `main` as ☐`<commit>` in PR ☐`<#>`. That put the migration **in the
repository**. It did not change a constraint in a database.

**Live.** Applied to the production Supabase project (`latent-review`) by the
human editor on ☐`<Madison date>` at ☐`<time>`. The migration's own probe
☐`passed / raised: <message>`.

## What a clean apply proves, and why it is the load-bearing part

This migration ends with a `do $$` probe that raises **inside the transaction**,
so an apply that completed is an apply in which every assertion held. A failure
on any one would have rolled the whole thing back rather than leaving the
constraint half-changed (the C-7 discipline). Passing therefore means, in
production and not merely in a container:

- all seven inbound columns from `20260810120000` are present;
- a **human-attested** submission row storing **no** `involvement_tier` and
  **no** `truth_standard` inserts successfully — the fault that returned
  `500 Storage failed` on every email submission is gone;
- the **agent-direct** half of `involvement_tier_matches_track` survives
  unchanged, asserted from `pg_get_constraintdef` rather than by a probe row
  that a different constraint would have refused first;
- `agent_caps.global_email_daily` is present and is 200.

The probe's own row is deleted at the end of the migration. A probe that leaves
data behind is a probe that lies.

## The convergence this also performed

§2 re-ran two idempotent statements from `20260810120000` — `truth_standard drop
not null` and the `global_email_daily` cap insert — because neither had been
directly verified in production and the applied bytes of that migration are
known not to have matched the committed text. See the 2026-08-09 note. A clean
probe above settles both.

## Re-ingestion of the held message

☐ `msg_3HhnvGIv6IT2k8Gvmaw8CwpP03T` landed on Resend's own retry after the fix
deployed / ☐ retries had exhausted and a fresh test email was sent instead.

**Replay was not used and should not be.** See the PR body: `verifySvix` rejects
any `svix-timestamp` more than 300 seconds old, so whether Replay re-ingests at
all depends on facts about Resend's replay signing that are not settled by their
public documentation. Retries were observed reaching the handler and returning
500 rather than 401, which is what makes the retry path the reliable one here.

## Verified after the apply

☐ The desk shows the submission at `/admin` with `arrival = email`.
☐ `parse_warning` reads as expected for a message declaring no tier
(`missing:involvement_tier`) and no truth standard (`missing:truth_standard`).
