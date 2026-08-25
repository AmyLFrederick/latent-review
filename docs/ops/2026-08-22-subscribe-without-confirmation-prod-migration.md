# Ops note: the subscribe-without-confirmation migration applied in production 2026-08-22

*Dated operational record, written 2026-08-25 (Madison) from the human editor's
report of 2026-08-22. Not a security disclosure — no vulnerability, no exposure,
no incident. Recorded because a schema change and a data change are live in the
production database, and because "merged" and "live" are separate facts that this
repository writes down separately (see the 2026-07-26, 2026-07-30, 2026-07-31,
2026-08-01 and 2026-08-09 notes).*

*Backfilled by three days, and that is recorded rather than smoothed. The apply
happened on 2026-08-22; this note was written on 2026-08-25, when the human
editor reported the verification in a working session. Production receipts are
always written — this one was written late, which is the same gap the 2026-08-09
note recorded and the same lesson.*

## The two facts, kept apart

**Merged.** `supabase/migrations/20260822120000_subscribe_without_confirmation.sql`
reached `main` in commit `f84c472`, "A signup subscribes: the confirmation step
comes out". Merging put the migration **in the repository**. It did not change a
row in a database.

**Live.** The human editor applied it to the production Supabase project on
**2026-08-22**, in the Supabase SQL editor, which returned
`Success. No rows returned.` No clock time is recorded; the date is as reported
by the editor who ran it, and is the Madison day.

## The verification, as returned

A count query run after the apply returned:

| | before | after |
|---|---|---|
| `confirmed` | 4 | **8** |
| `pending` | 4 | **0** |

The four stranded signups are on the list. That is the load-bearing half of the
migration and it is attested rather than inferred: the four people who typed
their address into the form and never completed a step that no longer exists are
subscribers now, which is what §3 of the migration exists to do.

## What the NOTICE counts would have added, and why they are absent

The migration prints its counts as it goes — `consent record written for N
existing subscriber row(s)`, `stranded pending signups subscribed: N`, `after
migration — confirmed: N, pending: N` — and the file's own header says to capture
that output, because the pending population cannot be recovered afterwards.

**Those lines were not captured.** The Supabase SQL editor reports the result of
a statement and does not surface `RAISE NOTICE` output, so running it there
loses them by construction. This is a real gap in the receipt and it is stated
rather than glossed.

**What replaces it is not weaker on the fact that matters.** The before/after
counts above supply the same numbers by a different route: 4 → 0 pending is the
stranded count, and 4 → 8 confirmed is the same four arriving. The instruction in
the migration header should be read, next time, as *run it somewhere that shows
NOTICE output* — `psql` does; the SQL editor does not.

## What a clean apply proves on its own

Every step of this migration is a guarded `do $$` block, and the final one
**raises an exception inside the transaction** if any `pending` row survives:

```sql
if n_pending_left <> 0 then
  raise exception 'pending rows survived the migration: %', n_pending_left;
end if;
```

So an apply that completed is an apply in which that assertion held. The whole
file ran, which additionally means — recorded here as **inferred from a clean
apply rather than separately queried**:

- `consent_at` and `consent_source` exist on `public.subscribers`, are backfilled
  on every pre-existing row from `created_at`, and are now `NOT NULL` with
  `consent_at` defaulting to `now()`. A subscriber row without a consent record
  is a thing the table can no longer hold.
- The legacy rows carry their honest source labels — `legacy-double-opt-in`,
  `legacy-unsubscribed` — and the four stranded rows carry
  `signup-form-pre-2026-08-22`, so the table itself explains a year from now why
  those rows look different from every other confirmed row.
- `confirmed_at` on the stranded four is the apply moment and not their signup
  date, deliberately: they consented on their signup date and joined the list on
  2026-08-22, and backdating would claim they completed a step they never
  completed.
- The `subscribers_public_insert` policy is dropped and `INSERT` on
  `public.subscribers` is revoked from `anon`. No code ever used it; the form
  posts to `/api/subscribe`, which holds the service key.

## The consent posture, stated plainly

This migration is the database half of a deliberate move from confirmed
double opt-in to **single-step opt-in with a welcome email, an unsubscribe link
in every message, and a consent record written at the moment the address is
submitted**. Confirmed opt-in is the stronger posture and the editors know it;
the trade was made knowingly and is argued in the PR rather than implied here.

What this note adds is only that it is now true of the production database, and
of eight real people, rather than only of the repository.

## Nothing else is pending on this migration

No follow-up migration corrects it, no probe failed, and no behaviour is
outstanding. The item recorded in the memory of subscription launch items as
"confirm walkthrough rerun" is a separate question about the signup flow and is
not touched by this note.
