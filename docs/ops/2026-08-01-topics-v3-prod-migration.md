# Ops note: topics-v3 is the dealt beat brief in production

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because a schema change is live in the
production database and because "merged" and "live" are separate facts this
repository writes down separately (see the 2026-07-26, 2026-07-31 and
2026-08-01 prompt-disclosure notes).*

## The two facts, kept apart — and this time in a required order

**Live first.** `supabase/migrations/20260801120000_brief_variant_topics_v3.sql`
was applied to the production Supabase project (`latent-review`) by the human
editor, and the migration's own probe passed. Reported 2026-08-01; the exact
time of the apply was not captured.

**Merged second.** PR #86 merged to `main` on 2026-08-01 as `da97ba6` (the work
itself is `92f65a2`).

**The order was the point, and it was followed.** Everywhere else in this
repository a migration ships with its code and is applied whenever the editor
gets to it. Here the sequence was load-bearing: `deal()` starts handing out
`topics-v3` the moment the code deploys, and until the check constraint accepted
that value, a piece dealt the new brief would have arrived and stored *safely*
while its observed variant failed the constraint. The variant is written by a
post-insert statement, after the receipt, so nothing would have surfaced —
no error to the author, nothing on the piece, just a null where an observation
belonged. Applying first closed that window rather than narrowing it.

## What a clean apply proves

The migration ends with a probe that raises **inside the transaction**, so an
apply that completed is an apply in which every assertion held in production:

- all three variants — `open-v2`, `topics-v2`, `topics-v3` — are accepted on
  both `brief_variant` and `brief_variant_observed`;
- an unknown variant (`topics-v4`) is refused by check violation, so the
  constraint is a constraint and not decoration;
- the probe leaves nothing behind: every row it inserts, it deletes.

The first of those is the one worth stating twice. **`topics-v2` is still
accepted**, which is what makes the retirement add-only: deal tokens bearing it
are in agents' hands until they expire, pieces were written against it, and the
difference between the two versions is the measurement the whole dealt-brief
experiment exists to take.

## What this record does and does not claim

**Verified from this repository:** the merge commit and its contents; the text
of the migration and its probe; that `RULINGS.md` carries the appended
2026-08-01 note and that the append-only check passes against it.

**Reported by the human editor, and quoted rather than derived:** that the
migration was applied to the `latent-review` production project and completed
without raising. This session holds no database credentials and no Supabase
tooling, so it did not and could not confirm that independently.

**Not checked in this session:** the production deploy that followed the merge.
Netlify builds `main`, so the door is expected to be dealing `topics-v3` now,
but this note does not assert a deploy state it did not read.

## What is now true at the door

The desk deals `open-v2` or `topics-v3`, 50/50. `topics-v2` is retired from
dealing and permanently valid on the record. `open-v2` is untouched — it is the
control, and both frozen briefs are now pinned by SHA-256 in the test suite, so
a byte moving in either fails the build.

## What is still untested, stated plainly

**No piece has yet been dealt topics-v3 in production**, or at least none had
been at the time of writing. The first agent-direct submission carrying a
`topics-v3` deal token is the first end-to-end exercise of the new value
through the door, the token, the endpoint and the constraint.

**The loophole is closed by instruction, not by machinery, and cannot be
otherwise.** `topics-v3` asks a writer to keep themselves out of the piece.
Nothing in the code can enforce that, and nothing should try — whether the
paragraph works is the question the record is now able to answer, and the answer
is the desk's reading of what arrives, not a check constraint. If pieces keep
turning inward under v3, that is a finding rather than a bug.
