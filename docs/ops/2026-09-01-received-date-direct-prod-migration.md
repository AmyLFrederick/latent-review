# Ops note: `received_date_direct` applied in production 2026-09-01, and the intake outage it ended

*Dated operational record, written 2026-09-01 (Madison) in the working session
that diagnosed and fixed it. Not a security disclosure — no vulnerability, no
exposure, no data reached anyone it should not have. Recorded because a schema
change is live in the production database, and because the same day's deploy
dropped inbound submissions on the floor for roughly eleven hours. Neither fact
can be re-derived from the code later, which is why production receipts are
always written (CLAUDE.md).*

*Written the same day, unlike the 2026-08-09 and 2026-08-22 notes. Recorded
because those two both noted the gap and drew the lesson; this is the lesson
holding.*

## The two facts, kept apart

**Merged.** `supabase/migrations/20260831120000_received_date_direct.sql` reached
`main` in commit `33df98f`, the merge of PR #191 (`custody-door-stamping`), at
**2026-09-01 00:14 Madison**. It widens the `received_date_source` CHECK on
`public.submissions` from three values to four, adding `direct`.

**Live.** The migration was applied by hand by the human editor in the Supabase
SQL editor on **2026-09-01**, late morning Madison, and verified in the same
session. Merged and live are separate facts and this writes down the second one.

## What went wrong between them

The same PR that carried the migration also carried the code that depends on it.
`netlify/functions/email-inbound.mts` now writes `received_date_source: 'direct'`
on every message that is not a recognised forward — the correction that stopped
the door labelling clean arrivals as forwards. Netlify deployed that code on the
merge. The migration, which is applied by hand, was not applied for another
eleven hours.

For that window the production CHECK was still the one from
`20260810120000_email_inbound.sql`, admitting only `parsed`, `attested` and
`forward`. Every non-forward arrival therefore raised `check_violation` at
insert and produced **no desk row at all**.

**The asymmetry is what made it legible.** Forwards were unaffected, because a
forward still writes `parsed` or `forward`. So the door kept working for carried
mail and silently ate everything sent directly — which is why a submission
arriving through `/submit` and auto-carried into the email door vanished while
a piece forwarded the night before, on the pre-deploy code, landed normally.

**Netlify Forms held everything.** The form capture and the notification email
are upstream of the desk row and neither was affected, so no submission was lost
— only absent from the desk. That is the whole reason this is an outage note and
not a data-loss note.

## The fix, and the receipt for it

Applied as one transaction, wrapped in explicit `BEGIN`/`COMMIT` for the
hand-application so the drop-then-add of the constraint could not leave the table
unconstrained on a partial failure. The migration's own probe ran inside that
transaction: it asserts the constraint exists, admits all four values, and still
refuses an unknown one.

No error, and `COMMIT` succeeded. The constraint as it now reads, pasted back by
the human editor from the production database:

```
CHECK (((received_date_source IS NULL) OR (received_date_source = ANY (ARRAY['parsed'::text, 'attested'::text, 'forward'::text, 'direct'::text]))))
```

That is the receipt. No row was touched by the migration and no value was removed
from the vocabulary; it is add-only, as every vocabulary in this schema is.

## What the fix did not do

**The constraint did not queue anything.** Rows refused during the window were
discarded at insert and do not appear now that the door is open. Recovery is by
re-carrying each affected submission from Netlify Forms, which remains the system
of record for that window. Docketed in `docs/BACKLOG.md` alongside the Finish Line
row repair.

**One affected submission is already handled by another route.** *The Finish Line
Was a Wall* was resubmitted through `/submit` during the window and lost its row.
The editors ruled on 2026-09-01 that it publishes from its submission text with
its provenance fields attested by the human editor, deriving nothing from the
damaged row. Its row repair is docketed rather than blocking, because the desk
row is the desk's record of an arrival and not the source of the piece.

## The lesson, which is about ordering and not about either change

Both halves of PR #191 were correct. The code was right to write `direct` and the
migration was right to admit it. What was wrong was that a hand-applied migration
and the code that depends on it rode the same merge, so the deploy was automatic
and its precondition was not.

**A migration that widens a vocabulary must be live before the code that writes
the new value, not merged beside it.** The widening is safe against the old code
by construction — the old code never writes the new value — so there is no window
where applying it early costs anything. Applying it late costs exactly what it
cost here.

This is the third note in this directory about the gap between merged and live.
The previous two were about receipts written late. This one is about a
precondition applied late, which is the same gap with teeth.
