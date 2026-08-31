-- The Latent Review — CUSTODY CORRECTION, the two Monthly Question rows
-- of 2026-08-27 (GLM-5.3 and Grok 4.5).
--
-- RUN BY HAND BY THE HUMAN EDITOR. Nothing in this repository executes it, no
-- session has touched the database, and it is deliberately in docs/sql/ rather
-- than supabase/migrations/ because it is not a schema change: it corrects two
-- specific rows and must never replay against another database or another day's
-- data. The schema half of this change is
-- supabase/migrations/20260831120000_received_date_direct.sql and is applied the
-- normal way.
--
-- WHAT WAS WRONG, IN ONE LINE. Both pieces came through the human submission
-- form at /submit and reached the desk by being carried into the email door,
-- which stamped its own name on them and initialised their date provenance to
-- 'forward'. The desk therefore read "arrived by email · forward date — original
-- not found" about two pieces that arrived by neither. See
-- docs/SCRATCH-CUSTODY-DOOR-STAMPING-2026-08-31.md for the full finding, and
-- netlify/functions/email-inbound.mts for the fix that stops it recurring.
--
-- WHAT IT IS CORRECTED TO, per the editors' instruction of 2026-08-31:
--   arrival               → 'form'      the door the pieces actually came through
--   received_date         → 2026-08-27  the Madison day, as the record dates
--   received_date_source  → 'attested'  because an editor is vouching for it here
--   prompt_disclosure     → the question was couriered by the human editor as a
--                           chat paste, ONLY where the field is empty (below)
--   courier_submission    → true, with the AI author's identity read off the row
--
-- 'attested' AND NOT 'direct'. The new 'direct' value means the journal's own
-- webhook watched a message arrive. Nothing watched these: the date is the
-- editor's knowledge of when she received the answers, which is exactly what
-- 'attested' is for. It renders ᵃ, "attested by the editor", and takes the loud
-- forward marker off the row.
--
-- THE TWO ROWS, NAMED. Both are answers to Monthly Question No. 2, which stays
-- open through September:
--
--   "Water Power and Paper"            — GLM-5.3
--   "The Paper Mill and the Server Farm" — Grok 4.5
--
-- The titles are here so step 1's output can be checked against something, not
-- as the key: a row's stored title is the working title as submitted, the
-- headline is the editors' (/submit), and a correction that matched on a string
-- either of those can move is a correction aimed at a moving target. Step 2 is
-- keyed on the ids step 1 returns.
--
-- THIS RUNS BEFORE THE ISSUE IS BUILT, per the desk's sequence of 2026-08-31, so
-- both pieces are built with true custody from the start rather than published
-- and corrected afterwards. A provenance label is set at acceptance and is
-- immutable after it (CLAUDE.md) — which makes this the last moment the record
-- can be fixed by editing it instead of by correcting it in public.
--
-- RUN THE THREE STEPS IN ORDER AND READ STEP 1 BEFORE RUNNING STEP 2.

-- ---------------------------------------------------------------------------
-- STEP 1 — READ THE ROWS FIRST. Nothing is written here.
-- ---------------------------------------------------------------------------
--
-- This is not ceremony. Step 2 needs the two ids, and two of the fields it sets
-- must not be written blind:
--
--   * prompt_disclosure may already hold the submitter's own words — the form
--     offers that field, and these came through the form. Overwriting an
--     attestation someone wrote with a sentence composed here would not be a
--     correction. The database agrees and enforces it: the trigger from
--     20260731120000 refuses any change of a non-null disclosure to a different
--     non-null value, so step 2 fills it only where it is empty.
--   * courier_author_identity must be the model string the row already
--     discloses, not one retyped from a chat message. Step 2 reads it off
--     author_model_version; if that column is empty on either row, step 2 says
--     so and leaves the courier fields alone rather than inventing a value.

select
  id,
  title,
  author_name,
  author_model_version,
  arrival,
  received_date,
  received_date_source,
  courier_submission,
  courier_author_identity,
  prompt_disclosure,
  parse_warning,
  arrived_at,
  status
from public.submissions
where arrival = 'email'
  and received_date between date '2026-08-25' and date '2026-08-31'
order by arrived_at;

-- ---------------------------------------------------------------------------
-- STEP 2 — THE CORRECTION. One transaction, and it refuses to be approximate.
-- ---------------------------------------------------------------------------
--
-- Paste the two ids from step 1 into `targets`. The block writes nothing unless
-- it matches exactly two rows: a correction that hit one row, or three, is a
-- correction aimed at the wrong thing, and rolling back is cheaper than
-- discovering it later in a published record.

begin;

do $$
declare
  -- ↓↓↓ PASTE THE TWO IDS FROM STEP 1 ↓↓↓
  targets uuid[] := array[
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000'
  ]::uuid[];
  -- ↑↑↑ PASTE THE TWO IDS FROM STEP 1 ↑↑↑

  couriered_prompt constant text :=
    'The prompt was the journal''s Monthly Question, couriered verbatim by the '
    'human editor as a chat paste (the paste block at /prompts). The answer was '
    'returned to the editor and submitted through the human submission form.';

  matched integer;
  touched integer;
  no_model integer;
begin
  if '00000000-0000-0000-0000-000000000000'::uuid = any (targets) then
    raise exception 'the ids were not filled in — read step 1 and paste the two row ids';
  end if;

  select count(*) into matched from public.submissions where id = any (targets);
  if matched <> 2 then
    raise exception 'expected exactly 2 rows, matched % — check the ids from step 1', matched;
  end if;

  -- The door, the date, and the provenance of the date. The three facts the
  -- bug report names, and the only three this block writes unconditionally.
  update public.submissions
     set arrival = 'form',
         received_date = date '2026-08-27',
         received_date_source = 'attested'
   where id = any (targets);
  get diagnostics touched = row_count;
  raise notice 'door and date corrected on % rows', touched;

  -- The submitter's own words are never overwritten — see step 1. Where the
  -- field is empty, the editor's account of how the question reached the author
  -- goes in; where it is not, whatever the submitter wrote stands.
  update public.submissions
     set prompt_disclosure = couriered_prompt
   where id = any (targets)
     and prompt_disclosure is null;
  get diagnostics touched = row_count;
  raise notice 'prompt disclosure written on % of 2 rows (the rest already carried the submitter''s own)', touched;

  -- The courier declaration, with the identity read off the row rather than
  -- retyped. A row that discloses no model version keeps its courier fields
  -- untouched: the CHECK requires an identity when the box is ticked, and an
  -- identity invented here would be the journal writing an author's name for it.
  select count(*) into no_model
    from public.submissions
   where id = any (targets)
     and courier_submission = false
     and (author_model_version is null or char_length(trim(author_model_version)) = 0);

  update public.submissions
     set courier_submission = true,
         courier_author_identity = trim(author_model_version)
   where id = any (targets)
     and courier_submission = false
     and author_model_version is not null
     and char_length(trim(author_model_version)) > 0;
  get diagnostics touched = row_count;
  raise notice 'courier declaration set on % rows', touched;

  if no_model > 0 then
    raise notice
      'NOT SET on % row(s): author_model_version is empty there, so there is no disclosed identity to carry. Fill that field first, then re-run this block.',
      no_model;
  end if;
end $$;

-- Read the notices above. If they say what you expect:
commit;
-- If they do not:
-- rollback;

-- ---------------------------------------------------------------------------
-- STEP 3 — THE RECEIPT. Run after the commit and keep the output.
-- ---------------------------------------------------------------------------
--
-- Production receipts are always written (CLAUDE.md): this correction is a fact
-- about the world outside the repository and cannot be re-derived from the code.
-- Paste this output into docs/ops/ alongside the migration receipt.

select
  id,
  author_name,
  author_model_version,
  arrival,
  received_date,
  received_date_source,
  courier_submission,
  courier_author_identity,
  prompt_disclosure is not null as has_prompt_disclosure,
  parse_warning
from public.submissions
where arrival = 'form'
  and received_date = date '2026-08-27'
order by author_name;

-- Expected: two rows, arrival 'form', received 2026-08-27, source 'attested'.
--
-- parse_warning and raw_email are LEFT AS THEY ARE, deliberately. They are not
-- the row's claim about itself — they are the evidence of how the row came to
-- exist, and this corrects the claim. Say the word and a follow-up clears them.
