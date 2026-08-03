# Ops note: the courier field is live, and R-034's grant went with it

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because a schema change is live in the
production database, and because "merged" and "live" are separate facts this
repository writes down separately (see the 2026-07-26, 2026-07-31 and
2026-08-01 notes).*

## The two facts, kept apart

**Merged.** PR #71 merged to `main` on 2026-08-01 as `4e36201`. The work itself
is `7321fde` (the three ruled changes and R-034) and `f82a143` (the desk-update
comment correction and the backlog entry).

**Live.** `supabase/migrations/20260801160000_courier_submissions.sql` was
applied to the production Supabase project (`latent-review`) by the human
editor, and the migration's own probe passed. Reported 2026-08-01; the exact
time of the apply was not captured.

**The order was not load-bearing here, and that is worth saying.** For
`topics-v3` the sequence mattered — the code began dealing a value the
constraint had to accept first, so applying before merging closed a window
rather than narrowing it. Nothing of the kind applies to this migration.
**Nothing writes these columns**: the human door posts to Netlify Forms and does
not touch `public.submissions` (ruled 2026-07-27), and the agent door writes as
`service_role` through its own function. So there was no window in either
direction, and the two facts are recorded in the order they happened rather than
in an order that was required.

## What a clean apply proves

The migration ends with a probe that raises **inside the transaction**, so an
apply that completed is an apply in which every assertion held in production:

- both columns exist — `courier_submission` and `courier_author_identity`;
- the coherence CHECK exists, which is the part that earns its place before any
  writer does: an identity is present when the box is declared and absent when
  it is not, so the first writer cannot get it wrong;
- anon can insert `courier_submission` and `courier_author_identity` — without
  which the form could not carry the declaration at all;
- **anon can insert `prompt_disclosure`** — the R-034 asymmetry fix, asserted
  rather than assumed;
- the desk can correct `courier_submission`;
- and three regression guards held: anon still cannot insert `status`, still
  cannot insert `amy_decision`, and has **not lost** its existing insert on
  `provenance_attestation`.

That last group is the reason the probe is worth its length. A grant migration
that adds a privilege is only safe if it can also show it took nothing away and
opened nothing it should not have.

## The one production change that touched an existing column

Everything else here adds new columns. **`prompt_disclosure` is different**: it
shipped on 2026-07-31 with no anonymous insert grant, and this migration granted
one under R-034, because a disclosed prompt is a submitter's claim about their
own submission and belongs on the intake surface beside the tier and the
attestation.

**No behaviour changed in production as a result.** Neither door writes to that
table through the anon role today, so the grant is not currently exercised by
anything. What changed is the precedent the schema teaches — two migrations that
answered one question differently now answer it the same way.

## What this record does and does not claim

**Verified from this repository:** the merge commit and its contents; the text
of the migration and of its probe; that `RULINGS.md` carries R-034 and that the
append-only check passes against it; that the built `/submit` renders the
courier declaration before the prompt disclosure and both before the
attestation.

**Reported by the human editor, and quoted rather than derived:** that the
migration was applied to the `latent-review` production project and completed
without raising — described as a boring success. This session holds no database
credentials and no Supabase tooling, so it did not and could not confirm that
independently.

**Not checked in this session:** the production deploy that followed the merge.
Netlify builds `main`, so `/submit` is expected to be serving the reordered form
now, but this note does not assert a deploy state it did not read.

## What is now true, and what is still not

The shape is in the database and the invariant is enforced. **Nothing fills it
yet.** The human door still posts to Netlify Forms, so a courier declaration
made today is captured in the form submission the editors read by hand, exactly
as before — the columns are the structured home waiting for the human-door DB
path, which remains a banked post-launch slice.

So the first real exercise of these columns is still ahead of them, and it will
arrive with that slice rather than with this migration.

## Merged alongside, for the record

Three other PRs merged the same day and are named here because a reader
reconstructing 2026-08-01 will find them adjacent in the history: **#69** (the
courier sentence on `/for-agents`, which is what tells an AI author the human
door is open to it), **#90** (pronouns are never assigned), and **#91** (chained
tier labels, R-035). None of the three carries a migration; only this one
touched the database.
