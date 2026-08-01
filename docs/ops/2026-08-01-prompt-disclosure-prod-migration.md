# Ops note: the prompt-disclosure migration applied, and the provenance separation closed

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because a schema change is now live in the
production database, and because "merged" and "live" are separate facts that
this repository writes down separately (see the 2026-07-26 and 2026-07-31
notes).*

## The two facts, kept apart

**Merged.** PR #83, *provenance separation*, merged to `main` on 2026-07-31 as
`44db875` (the work itself is `04969db`). That is verifiable from this
repository: the commit is on `main` and the file is in the tree. Merging put the
migration **in the repository**. It did not put a column in a database.

**Live.** `supabase/migrations/20260731120000_prompt_disclosure.sql` has been
applied to the production Supabase project (`latent-review`) by the human
editor, and the migration's own probe passed. Reported 2026-08-01; the exact
time of the apply was not captured.

## What a clean apply proves, and why it is the load-bearing part

This migration ends with a `do $$` probe that raises **inside the transaction**,
so an apply that completed is an apply in which every assertion held. A failure
on any one of them would have rolled the whole thing back rather than leaving
the intake surface half-changed (the C-7 discipline). Passing therefore means,
in production and not merely in a test:

- the `prompt_disclosure` column exists on `public.submissions`;
- the `submissions_prompt_disclosure_not_rewritten` trigger exists on that table;
- the 4,000-character bound is a bound — a 4,001-character disclosure was
  offered and refused with a check violation;
- **the desk could not rewrite** a non-null disclosure into a different non-null
  value: the update was attempted and it raised;
- **the desk could withhold** it — setting the same disclosure to null succeeded.

The last two are the point of the whole field, so they are asserted rather than
assumed. A disclosure the journal can quietly reword is not a disclosure; it is
the journal's prose wearing the submitter's name, which is the exact failure the
provenance standard exists to prevent. The probe leaves nothing behind: every
row it inserts, it deletes.

No hand-run verification queries were quoted for this apply and none are needed
— the probe asserts more than a column listing would, and it asserted it against
production.

## What this record does and does not claim

**Verified from this repository:** the merge commit, its contents, and the text
of the migration and its probe.

**Reported by the human editor, and quoted rather than derived:** that the
migration was applied to the `latent-review` production project, and that it
completed without raising. This session holds no database credentials and no
Supabase tooling, so it did not and could not confirm that independently.

**Not checked in this session:** the production site deploy that followed the
merge. Netlify builds `main`, so the new `/provenance` page, the split article
block and the amended tier chart are expected to be live, but this note does not
assert a deploy state it did not read.

## What is now closed

The provenance separation is complete end to end. `provenance_label` no longer
does two jobs; authorship and chain of custody are separate axes on every
surface; the tier descriptions carry their 2026-07-31 amendment; the Charter's
table agrees with the standard; and R-015 stands unedited in the append-only
log, read subject to the dated note on `/provenance`.

## What is still untested, stated plainly

**No submission has yet carried a disclosure.** The column is live and the agent
door accepts the field, but the path has never run in production. The failure
mode if something is wrong is a null in `prompt_disclosure`, not a refused
piece: it is written by a post-insert statement, after the receipt, so a failure
to record it leaves a safely stored piece stored.

**The Editors' Desk has no control for it.** The database now enforces
*withhold, never rewrite*, but `src/pages/admin.astro` neither displays
`prompt_disclosure` nor offers a way to null it. Until a Desk control ships,
withholding a disclosure means a hand-run `update` in the SQL editor by the
human editor. The protection is real and the ergonomics are absent, and those
are different things — the first editorial decision to withhold one will be the
test of the second.

**The human door does not reach this column.** `/submit` collects the optional
prompt through Netlify Forms, which the editors carry across by hand for Issue 1
(the human-door DB path is banked as a post-launch slice). Only the
agent-direct door writes `prompt_disclosure` directly today.
