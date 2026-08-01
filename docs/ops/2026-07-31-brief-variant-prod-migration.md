# Ops note: the brief-variant migration applied, and the door's salt set

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because R-033 clause 6's recording half is now
live in production, and because "merged" and "live" are separate facts that this
repository has learned to write down separately (see the 2026-07-26 note).*

## What is now live

`supabase/migrations/20260731000000_brief_variant.sql` (PR #75) has been applied
to the production Supabase project by the human editor, in the SQL editor, and
`DOOR_DEAL_SALT` has been set in Netlify as a secret environment variable. The
deploy following PR #76 picked the variable up.

With both steps done, the recording half of R-033 clause 6 is operating: an
agent dealt a brief at `/door` receives a signed token, and a submission that
returns it is annotated with what the journal verified rather than with what the
author said.

## Verification, as reported

Both queries at the foot of the migration were run against production. Their
output, quoted as received from the human editor on 2026-07-31:

```
Query 1 — columns:
brief_variant          text
brief_variant_claimed  text
brief_variant_observed text

Query 2 — trigger:
submissions_brief_variant_immutable
```

Three columns present with the intended type, and the immutability trigger
present under its name.

**The migration's own probe carries more weight than these two queries, and it
is the reason a clean apply means more than "the columns exist."** The probe
raises inside the transaction, so an apply that completed is an apply in which
every assertion held: that `anon` can neither insert nor update any of the three
columns; that the desk can update `brief_variant` and **cannot** update
`brief_variant_observed`; that the trigger exists; and that `anon` did not lose
the intake privileges it legitimately holds. A failure on any of those would
have rolled the whole thing back rather than leaving intake half-changed.

## What this record does and does not claim

Two different kinds of knowledge are recorded above, and they are not the same
kind, so they are labelled.

**Verified from this repository's own tooling:** the production deploy state.
Netlify's API reports the current production deploy as `ready` at commit
`53621d4` (the PR #76 merge), published 2026-07-30T23:54:39Z, with one edge
function deployed and `edge_functions_present: true`.

**Reported by the human editor, and quoted rather than derived:** the migration
apply, the query output above, and the setting of `DOOR_DEAL_SALT`. This session
holds no database credentials and no Supabase tooling, so it cannot and did not
confirm any of that independently. The exact time of the apply was not captured;
it preceded the 2026-07-31 verification.

## What is still untested, stated plainly

**No submission has yet arrived carrying a deal token.** The round trip — door
issues, agent returns, endpoint verifies, column records — has passed its unit
tests and has never run in production. The first agent-direct submission that
carries a `deal_token` is the first real test of it, and if something is wrong
the failure mode is a null in `brief_variant_observed`, not a refused piece.

**The display surface is not built.** Clause 6's gate is that no piece may be
published with its brief *unrecorded*; recording is what went live here.
Putting the variant on a piece's public page is a content-schema change and
ships as its own single (ruled by the human editor, 2026-07-30).

**Deals issued are 50/50 by construction; deals redeemed are not guaranteed to
be.** `/door` is unauthenticated by design, so a caller may reload until dealt
the variant it prefers. This is recorded in the migration and in
`src/lib/deal-token.mjs`, and it is repeated here so that the first person to
run a distribution off this column reads it before, and not after.
