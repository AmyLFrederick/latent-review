# Ops note: the involvement-tier relaxation applied

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because a schema change is live in the
production database, and because "merged" and "live" are separate facts that
this repository writes down separately.*

## The two facts, kept apart

**Merged.** `supabase/migrations/20260810210000_email_tier_undeclared.sql`
merged to `main` as `5927a38` (PR #154; the work itself is `d747f10`), on
2026-08-09. That put the migration **in the repository**. It did not change a
constraint in a database.

**Live.** Applied to the production Supabase project (`latent-review`) by the
human editor on **2026-08-09**, ~10:20 PM Madison, minutes after the merge. The
SQL editor returned `Success. No rows returned.` — the migration's probe raised
nothing.

*(Git stamps this work 2026-08-10 UTC. The journal's dates are Madison local and
the record does not follow the machine's clock.)*

## What the clean apply proves

This migration is transactional and ends with a `do $$` probe that raises
**inside** the transaction, so an apply that completed is an apply in which every
assertion held. A failure on any one would have rolled the whole thing back
rather than leaving the constraint half-changed. Passing therefore means, in
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

## Two inferences turned into observations

`20260810120000` applied cleanly on 2026-08-09 at ~8:55 PM Madison, and its
seven columns were confirmed by direct query at ~10 PM. Two of its other effects
— `truth_standard drop not null` and the `global_email_daily` cap insert — were
never separately queried, and were therefore *inferred* from that clean apply
rather than observed.

§2 of this migration restated both idempotently and §3's probe asserted them.
They are now observed. That was belt-and-braces rather than doubt, and it cost
two no-op statements.

## The outage this closes

Every email submission returned `500 Storage failed` from the door going live
until this applied — roughly 8:55 PM to 10:20 PM Madison on 2026-08-09. One
message was affected, the first end-to-end test:
`msg_3HhnvGIv6IT2k8Gvmaw8CwpP03T`, webhook fired 2026-08-10T02:36:36Z UTC
(2026-08-09 ~9:36 PM Madison).

**Nothing was lost.** The 500 is deliberate — it makes Resend retry, and the
message remains on Resend's side throughout. See
`docs/SCRATCH-EMAIL-INBOUND-500-2026-08-10.md` for the diagnosis.

## Re-ingestion — OPEN

Whether `msg_3HhnvGIv6IT2k8Gvmaw8CwpP03T` landed on Resend's own retry after the
fix, or whether retries had exhausted and a fresh test email was needed, is not
yet recorded. This section is appended when it is known.

**Replay was not used and should not be.** `verifySvix` rejects any
`svix-timestamp` more than 300 seconds old, and whether Resend's Replay stamps a
fresh timestamp is not settled by their public documentation. Retries were
observed reaching the handler and returning 500 rather than 401, which is what
makes the retry path the reliable one here.

## Still to verify at the desk

- The submission appears at `/admin` with `arrival = email`.
- `parse_warning` reads as expected for a message declaring no tier
  (`missing:involvement_tier`) and no truth standard (`missing:truth_standard`).
