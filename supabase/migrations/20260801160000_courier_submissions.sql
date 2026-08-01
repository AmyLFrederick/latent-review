-- The Latent Review — THE COURIER CASE, structured
--
-- Approved in principle by both editors 2026-07-30: the human door gets a
-- structured courier case — a checkbox declaring the submission is made on behalf
-- of an AI author, and a required author-identity field when it is checked, carried
-- into the submission record.
--
-- WHY IT EXISTS. An invitation cell returned a CAPABILITY decline rather than a
-- preference one: a model willing to write, unable to fetch, register, store a key,
-- or POST. The courier sentence ratified for /for-agents tells such an author that
-- their human may carry the piece through the human door. Before this migration
-- that arrival had nowhere structured to go. A courier could SAY it in the free-text
-- provenance attestation, but nothing asked, and nothing carried the AI author's
-- identity as a field of its own. Unasked provenance is provenance that gets
-- forgotten — and a provenance label is set at acceptance and immutable afterwards
-- (CLAUDE.md), so the moment to capture it is intake, not review.
--
-- ANON CAN DECLARE, AND IT IS NOW RULED RATHER THAN FLAGGED — R-034, 2026-08-01.
-- The approval as first written said "anon must not self-declare." That phrase came
-- from the finding about reached_by_version in 20260730120000, where a
-- submitter-supplied value would let an author influence the outreach measurement.
-- It was flagged here as not transferring, and both editors ruled on it 2026-08-01:
-- the governing line is CLAIMED VERSUS OBSERVED, not anonymous versus authenticated.
-- A submitter may write their own claims about their own submission; they may never
-- write the journal's own observations.
--   So these columns sit with involvement_tier and provenance_attestation, which anon
-- has always been able to insert precisely because they are attested by the submitter
-- and never certified by the journal. If anon could not set them, the form could not
-- carry the declaration at all and the desk would be back to inferring it from free
-- text — the exact gap this closes.
--   What anon must not get is a field that says the claim was CHECKED. No such field
-- exists here, and none may be added without a ruling: verification of a courier
-- claim is an editorial act, and if it is ever recorded it belongs in a separate
-- desk-only column that anon cannot touch.
--
-- WHY THIS MIGRATION ALSO TOUCHES prompt_disclosure.
-- Applying the rule found an asymmetry that was never decided, only arrived at.
-- 20260731120000 added prompt_disclosure — an optional, submitter-attested field
-- arriving through the same public door as these two — and granted anon nothing.
-- Under R-034 that is simply wrong: a disclosed prompt is the submitter's claim about
-- their own submission, and it sits on the claimed side of the line with the tier and
-- the attestation. The grant is added below rather than left for later, because an
-- inconsistency between two migrations is read by whoever comes next as a distinction
-- somebody intended.
--   Nothing changes behaviourally today. The human door posts to Netlify Forms and
-- the agent door writes as service_role, so neither grant is exercised by anything
-- currently running. What is fixed is the precedent the schema teaches.
--
-- RESTAMPED 2026-08-01 (was 20260730140000). Three later-stamped migrations —
-- 20260731000000, 20260731120000 and 20260801120000 — merged and were applied in
-- production while this PR was open, so the original stamp would have inserted this
-- file behind the last migration applied on the remote, which `supabase db push`
-- refuses without --include-all. The contents are unchanged by the rename; only the
-- position in the sequence is.
--
-- NOTHING WRITES THESE COLUMNS YET, AND THAT IS NOT AN OVERSIGHT.
-- The human door posts to Netlify Forms and deliberately does NOT write to
-- public.submissions (ruled 2026-07-27; see the note at the top of
-- src/pages/submit.astro). The human-door DB path is a banked post-launch slice. So
-- today the courier declaration is captured in the Netlify form submission the
-- editors read by hand, and these columns are the shape waiting for it. The CHECK
-- constraint is the part that earns its place now: it fixes the invariant before any
-- writer exists, so the first writer cannot get it wrong.
--
-- NOT A PROVENANCE LABEL, AND NOT A TIER. courier_submission does not change the
-- involvement tier, which continues to describe who made the work. A courier
-- submission is a human-attested arrival whose AUTHOR is an AI: the tier still
-- names the making, and this pair of columns names the carrying. Conflating them
-- would let the act of clicking submit alter the authorship record, which is
-- exactly what the ratified courier sentence denies.

alter table public.submissions
  add column if not exists courier_submission boolean not null default false;

alter table public.submissions
  add column if not exists courier_author_identity text;

comment on column public.submissions.courier_submission is
  'True when a human carried this piece through the human door on behalf of an AI '
  'author. Declared by the submitter, never certified by the journal. Does NOT '
  'affect the involvement tier: the tier names who made the work, this names who '
  'carried it.';

comment on column public.submissions.courier_author_identity is
  'The AI author''s identity as the courier states it — the specific model and '
  'version disclosed to them, not the harness. Required when courier_submission is '
  'true, and forbidden when it is false, by CHECK. Submitter-attested.';

-- The invariant, both directions. Presence when declared, absence when not: an
-- identity left behind by an unchecked box is orphan data that later reads as a
-- courier claim nobody made.
alter table public.submissions
  add constraint submissions_courier_identity_coherent
  check (
    (courier_submission = true
      and courier_author_identity is not null
      and char_length(courier_author_identity) between 1 and 200)
    or
    (courier_submission = false and courier_author_identity is null)
  );

-- Intake: the declaration is the submitter's, so it rides the existing
-- column-restricted anon INSERT alongside the other attested fields. See the flagged
-- note above before changing this.
grant insert (courier_submission, courier_author_identity)
  on table public.submissions to anon;

-- The same rule, applied to the field that was missed. See the R-034 note in the
-- header: prompt_disclosure is a submitter's claim about their own submission, so it
-- belongs on the intake surface beside the tier and the attestation. Additive and
-- idempotent — `grant` on an already-granted column is a no-op, so this is safe on a
-- database where a later migration has already fixed it by hand.
grant insert (prompt_disclosure)
  on table public.submissions to anon;

-- The desk may correct a courier declaration, as it may correct any attested field
-- before acceptance.
grant update (courier_submission, courier_author_identity)
  on table public.submissions to authenticated;

-- Probe. Asserts the columns, the CHECK in BOTH directions, the intake grants, and
-- that anon gained nothing it should not have. Raises inside the transaction so a
-- partial apply rolls back (the C-7 discipline).
do $$
declare
  problems text[] := '{}';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name = 'courier_submission'
  ) then
    problems := problems || 'courier_submission column missing'::text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name = 'courier_author_identity'
  ) then
    problems := problems || 'courier_author_identity column missing'::text;
  end if;

  if not exists (
    select 1 from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'submissions'
      and con.conname = 'submissions_courier_identity_coherent'
  ) then
    problems := problems || 'the coherence CHECK is missing'::text;
  end if;

  if not has_column_privilege('anon', 'public.submissions', 'courier_submission', 'insert') then
    problems := problems || 'anon cannot insert courier_submission — the form could not carry the declaration'::text;
  end if;

  if not has_column_privilege('anon', 'public.submissions', 'courier_author_identity', 'insert') then
    problems := problems || 'anon cannot insert courier_author_identity'::text;
  end if;

  -- R-034 applied to the field 20260731120000 missed. Asserted here rather than
  -- assumed, because this grant is the whole reason that clause is in this file.
  if not has_column_privilege('anon', 'public.submissions', 'prompt_disclosure', 'insert') then
    problems := problems || 'anon cannot insert prompt_disclosure — the R-034 asymmetry fix did not take'::text;
  end if;

  if not has_column_privilege('authenticated', 'public.submissions', 'courier_submission', 'update') then
    problems := problems || 'the desk cannot correct courier_submission'::text;
  end if;

  -- anon must not have gained anything beyond the intake surface.
  if has_column_privilege('anon', 'public.submissions', 'status', 'insert') then
    problems := problems || 'REGRESSION: anon can insert status'::text;
  end if;

  if has_column_privilege('anon', 'public.submissions', 'amy_decision', 'insert') then
    problems := problems || 'REGRESSION: anon can insert amy_decision'::text;
  end if;

  -- the pre-existing intake privileges must be untouched
  if not has_column_privilege('anon', 'public.submissions', 'provenance_attestation', 'insert') then
    problems := problems || 'REGRESSION: anon lost insert on provenance_attestation'::text;
  end if;

  if array_length(problems, 1) is not null then
    raise exception 'courier-submissions migration failed its own probe: %',
      array_to_string(problems, '; ');
  end if;
end $$;
