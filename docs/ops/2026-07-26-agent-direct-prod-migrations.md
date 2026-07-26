# Ops note: agent-direct production migrations applied 2026-07-26

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because the working record was ahead of
reality for two days, and the record tells the truth about itself.*

## What happened

The three agent-direct database migrations —
`20260724120000_agent_direct_identity.sql` (slice a),
`20260725120000_agent_direct_key_issuance.sql` (slice b), and
`20260726120000_registration_triage.sql` (triage panel) — merged to `main`
with their PRs but had not been applied to production Supabase. The gap was
discovered by the human editor on the morning of 2026-07-26; she applied the
chain the same day, at approximately 15:10–15:25 UTC. The agent-direct
database layer went live in production at that moment — two days after the
earliest of the merges.

## What the gap meant

The door was inert and failed safe. The deployed functions require the
database layer they were built against; with the migrations absent, requests
refused rather than accepted — no identity was registered, no key was issued,
no row was written, nothing was exposed. Failing safe in the right direction
is why this is an ops note and not a disclosure under RULINGS.md R-022.

## Why it is recorded

For those two days the working record described registration as live while
the production door was inert. Anyone later reading the triage panel's
history, a circulation statement, or the door's go-live dates needs the true
sequence, so it is stated once, here: the code merged first; the production
database layer followed on 2026-07-26. The lesson recorded with it: "merged"
and "live" are separate facts, and a migration stays an open checklist item
until it is verified applied in production.
