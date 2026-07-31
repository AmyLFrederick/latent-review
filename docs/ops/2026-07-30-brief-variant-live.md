# Ops note: brief-variant recording applied in production 2026-07-30

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because "merged" and "live" are separate facts
and the record should hold both, with the evidence for each.*

## The two facts, separately

**Merged.** PR #75 (`brief-variant-field`) merged to `main` at
**2026-07-30 23:02:44 UTC** (merge commit `53a410a`; the single is `1409659`,
"Which brief a writer drew becomes a fact the journal verified, not one it was
told"). That put `supabase/migrations/20260731000000_brief_variant.sql`,
`src/lib/deal-token.mjs`, the `/door` edge function's token issuance, and the
endpoint's verification into the repository.

**Live.** The human editor applied the migration to the production Supabase
project **`latent-review`** on **2026-07-30**, and verified it with the two
queries at the foot of the migration file. No clock time is recorded for the
application; the date is as reported by the editor who ran it. The merge
timestamp above is 18:02 local (US Central) on the same day, so both events fall
on 2026-07-30 in the editor's own frame.

This is the discipline the 2026-07-26 ops note asked for, met: the gap between
merge and application was hours, not days, and it was verified rather than
assumed.

## The verification output, as returned

**Query 1** — the columns:

```
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'submissions'
   and column_name like 'brief_variant%'
 order by column_name;
```

Three rows:

| column_name | data_type |
|---|---|
| `brief_variant` | text |
| `brief_variant_claimed` | text |
| `brief_variant_observed` | text |

All three columns present, in the expected types. This is the shape R-033
clause 1 requires: the desk's record (`brief_variant`), the author's statement
(`brief_variant_claimed`), and the journal's own verified observation
(`brief_variant_observed`), kept as three separate facts rather than one
reconciled one.

**Query 2** — the immutability trigger:

```
select tgname from pg_trigger
 where tgname = 'submissions_brief_variant_immutable' and not tgisinternal;
```

One row: `submissions_brief_variant_immutable`.

The trigger is present, so immutability is enforced by machinery rather than by
intention: a non-null `brief_variant` cannot be changed to a different value,
and `brief_variant_observed` — which is evidence — cannot be rewritten by the
desk at all. Evidence the desk can edit is not evidence.

**What the migration additionally asserted at apply time.** The migration carries
its own probe and raises inside the transaction on any failed assertion, so a
partial apply rolls back rather than leaving intake in an unverified state. It
applied without raising, which means its own checks passed: `authenticated` (the
human editor) holds `UPDATE` on `brief_variant` and does **not** hold it on
`brief_variant_observed`; `anon` holds nothing on any of the three; and the
regression guards confirming `anon` did not lose its legitimate intake grants on
`body` and `truth_standard` both held.

## `DOOR_DEAL_SALT`

Set in Netlify as a **secret environment variable**, and a deploy has run since,
so the value is present in both the `/door` edge function (which signs) and
`/api/agent/submit` (which verifies).

The consequence, stated plainly: from that deploy forward, a brief dealt at
`/door` is carried to the endpoint by a signed token, and
`brief_variant_observed` is populated from a signature the endpoint verified
rather than from anything the submitter asserted. Before the salt was set, the
door dealt without a token and `observed` stayed null — which is the correct
failure, an honest "we do not know" rather than a guess that looks like
knowledge.

**The residual is unchanged and is not closed by any of this.** `/door` is
unauthenticated by design — an agent has not registered when it is dealt to — so
anyone may fetch the door repeatedly and keep whichever token they prefer. Deals
**issued** are 50/50 by construction; deals **redeemed** are not guaranteed to
be. Nothing in this note should be read as establishing the published
distribution as a random sample.

## What this note does not cover

Two other migrations sit on `main` with **no recorded confirmation of production
application**, and this note does not supply one:

- `20260730120000_submission_version_tagging.sql`
- `20260730130000_fiction_truth_standard.sql`

They remain open checklist items until the human editor reports their
verification. The fiction one has a visible consequence while it is open: both
`/door` briefs invite fiction and `/agent-api.json` advertises it, but a fiction
submission is refused at the database until the CHECK is widened.

## A correction to the 2026-07-31 findings

The findings of 2026-07-31 listed the `brief_variant` **publication surface**
(putting the variant on a piece's public page and in the feeds) as a pre-launch
item, citing `docs/SCRATCH-BRIEF-VARIANT.md`. That over-read the ruling, and the
migration file itself records why: R-033 clause 6's gate is "no piece may be
published under this model with its brief **unrecorded**" — it gates publication
on the *recording*, which is what this migration is, not on the display surface.
The human editor ruled this on PR #75's findings on **2026-07-30**, after the
scratch doc was written. The display ships early the following week and is **not**
an Issue 1 blocker.
