# Topic_Data — schema findings and proposed migration

*Working scratch, not the record.* Answers R-032 clause 4's instruction: confirm
the schema supports topic tags on every submission, and propose the migration if
it does not.

**No SQL has been run and no migration file has been created.** The proposed SQL
below sits in this document deliberately rather than in `supabase/migrations/`, so
that nothing can pick it up and apply it before the editors have read it.

## The short answer

**The schema supports it. No migration is required by the ruling.** What is
missing is not schema — it is that nothing can write to the column, so the record
is empty today and would stay empty.

## What already exists

`supabase/migrations/20260724120000_agent_direct_identity.sql:155`

```sql
alter table public.submissions add column desk_topics text[];
grant update (desk_topics) on table public.submissions to authenticated;
```

Checked against each part of clause 4:

| Clause 4 requires | Status |
|---|---|
| Every submission carries tags | ✅ A nullable column on `public.submissions` — every row has it |
| Accepted **or declined** | ✅ Independent of `status`; rows are not deleted on decline |
| Pieces **and letters** | ✅ Letters are rows in this same table (`letter_target_type`), so they carry it too |
| Recorded by the editors, never the submitter | ✅ Deliberately excluded from the anon insert grant and not a `submit_agent_direct` parameter — the original migration's comment says so in terms |
| Not published | ✅ No feed, page, or endpoint reads it; the build never queries the database |
| Write access limited to the desk | ✅ `submissions_admin_update` policy, gated on the admin email |

The original author anticipated this ruling almost exactly: the migration's own
comment describes the column as *"what the piece was about… Written ONLY by the
admin/desk path — never the submitter,"* and calls wiring it up *"a later,
separate item."* This is that item.

## The gap that matters

**Nothing reads or writes `desk_topics`.** A filesystem-wide search finds it in
exactly two places: the migration that created it, and a comment in
`src/content.config.ts` pointing at it. The Editors' Desk has no field for it.

So the ruling's "every submission carries topic tags" is true of the schema and
false of the data, and will stay false until the desk grows an input. That is a
build item, not a migration — flagged here because a schema confirmation that
stopped at "the column exists" would read as done when nothing is being recorded.

## Proposed migration — **HELD by the editors, 2026-07-30**

The editors held all four: *"The record works without them and they can ride a
later PR; the rename especially can wait."* Nothing below has been applied, and
nothing below is needed for Topic_Data to start collecting — the Desk field ships
against the column as it stands.

One consequence of holding the rename, recorded so it is not a surprise later: the
Desk's label reads **Topic_Data** and the column it writes is still `desk_topics`.
That divergence is in one place (`src/pages/admin.astro`, commented at the write),
and it costs a line of explanation until the rename rides its later PR.

Recommended together whenever they are taken up, and cheapest while the column is
empty: every one of these is trivial today and a data migration once the corpus
exists.

```sql
-- Proposed: supabase/migrations/20260731000000_topic_data.sql
-- NOT APPLIED. Proposed under R-032 clause 4; awaiting the editors.

-- 1. The name. R-032 names this corpus Topic_Data, against Topics the section.
--    Nothing in the codebase reads or writes this column, and it holds no rows,
--    so the rename costs nothing today and costs a coordinated deploy later.
alter table public.submissions rename column desk_topics to topic_data;

-- 2. Provenance of the metadata itself. The journal records who decided what
--    and when everywhere else (R-011); its own research record should not be
--    the one place a label appears with no hand behind it.
alter table public.submissions add column topic_data_by text;
alter table public.submissions add column topic_data_at timestamptz;

-- 3. No blank labels. An empty string in the array is not a topic, and it would
--    silently become a heading if this corpus is ever published (R-032 c5).
alter table public.submissions add constraint topic_data_no_blanks
  check (topic_data is null or array_position(topic_data, '') is null);

-- 4. An index, because this exists to be queried. Array containment (@>, &&)
--    cannot use a btree; without GIN, "every submission about X" is a full scan
--    that gets slower every week.
create index submissions_topic_data on public.submissions using gin (topic_data);

-- Grants follow the rename; the column-level update grant does not survive it.
grant update (topic_data, topic_data_by, topic_data_at)
  on table public.submissions to authenticated;
```

If the rename is unwelcome, drop change 1 and the last statement reverts to
`grant update (desk_topics, …)`. The other three stand on their own.

## Deliberately not proposed

- **A controlled vocabulary.** The published side enforces one spelling per
  subject at build time; the database has no equivalent, so `AI safety` and
  `ai-safety` can both be recorded and would not be counted together. A lookup
  table would fix it and would also freeze the vocabulary before anyone knows
  what it should be. Recommendation: leave free text, and revisit if and when
  clause 5's publication ruling happens — a research record that cannot record an
  unanticipated subject is worse than one that needs tidying.
- **Backfill.** There is nothing to backfill; the column is empty.
- **Anything that publishes it.** Clause 4 says recording is not publishing and
  clause 5 parks the question. No view, no endpoint, no feed.

## Who applies Topic_Data, and when — **RULED 2026-07-30**

**At desk review, not on acceptance.** The reviewer tags a submission when it is
reviewed; the editors may correct the tags at acceptance. Option 2 below was
rejected for the reason clause 4 gives: tagging only what runs discards the more
interesting half of the record, which is what was sent and not published. Recorded
as R-032 clause 5.

1. ✅ **At the desk, on review** — ruled. Tagging is a cost of every decline as
   well as every acceptance, and that is the point rather than the price.
2. ❌ **Only on accept** — rejected; it silently breaks clause 4.
3. ⏸ **Suggested by the AI desk pass, confirmed by an editor** — not ruled out and
   not built. The original migration's comment contemplates it ("wiring the AI desk
   pass to suggest topics is a later, separate item"), it is the only option that
   scales, and it needs the nightly batch that slice (e) has not built. It composes
   with the ruling rather than replacing it: a suggestion an editor confirms is
   still applied at review.

## Built, 2026-07-30

The Desk field exists. `src/pages/admin.astro` carries a **Topic_Data** input at
the top of the review form — placed above the decision selects deliberately, since
it is applied at review and not by deciding — and writes `desk_topics` on save.

Parsing lives in `src/lib/topics.mjs` as `parseTopicData` / `formatTopicData` so it
is unit-tested rather than trapped in a client script: comma-separated in, trimmed,
blanks dropped, duplicates collapsed case-insensitively with the first spelling
kept. **No labels reads as `null`, not `[]`** — the desk needs to tell "not yet
tagged" from "tagged with nothing" to know what is still owed a review.

*A verification note, and an accepted limit.* This build environment has no
Supabase env vars, and Vite statically eliminates the entire desk script without
them — so a default local build produces an `/admin` page with no desk at all. That
is pre-existing and unrelated to this change. The field was verified by building
with placeholder env vars set, which emits the bundle and shows `topic_data`,
`desk_topics` and `Topic_Data` in it.

**It has not been exercised against the live database, and by the editors' decision
of 2026-07-30 it will not be here: Supabase env vars are not to be wired into this
environment to test it. The first real tag is the first real test.** Enter it
knowing that — on a submission whose tags you would be willing to correct — and
check the row afterwards rather than trusting the "Saved." message alone.
