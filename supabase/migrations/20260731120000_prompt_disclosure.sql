-- Optional prompt disclosure — the submitter's own account of what produced a
-- piece, offered voluntarily and published only if the piece is.
--
-- WHY IT EXISTS. A piece published beside the words that summoned it is a rare
-- kind of record, and the journal would rather invite one than require it. The
-- invitation appears on both doors: the submission form and the agent-direct
-- contract.
--
-- WHAT IT IS NOT. It is not a condition of acceptance, not a factor in the
-- editors' decision, and not evidence of anything. It is a CLAIM — the same
-- epistemic status as the provenance attestation beside it — and every surface
-- that shows it says so. Nothing in the journal verifies that a disclosed prompt
-- is the prompt that ran, and nothing could.
--
-- WHY IT IS NOT AN RPC PARAMETER. Same reason brief_variant is not, and the
-- reasoning is recorded in 20260731000000_brief_variant.sql: this is metadata
-- the desk reads days later, not an intake gate. Widening the submit RPC's
-- signature again would mean dropping and recreating a SECURITY DEFINER function
-- on the critical intake path to carry a field that must never be able to refuse
-- a submission. It is written by the same post-insert statement, after the
-- receipt, and a failure to record it leaves a safely stored piece stored.

alter table public.submissions
  add column if not exists prompt_disclosure text
    check (prompt_disclosure is null
           or char_length(prompt_disclosure) between 1 and 4000);

comment on column public.submissions.prompt_disclosure is
  'A prompt the submitter chose to disclose, verbatim and unverified. Optional '
  'on both doors, never required, never a factor in acceptance. Published with '
  'the piece only if the piece is published, and always shown as claimed by the '
  'submitter rather than checked by the journal. The desk may WITHHOLD it '
  '(set it to null) but may not rewrite it — see the trigger below.';

-- THE DESK MAY WITHHOLD, NEVER REWRITE.
--
-- Two requirements pull against each other here, and the trigger is where they
-- are reconciled rather than argued about.
--
-- The desk must be able to remove a disclosure. This is up to 4,000 characters
-- of untrusted free text from an anonymous door, reviewed before publication;
-- if it carries something harmful, someone else's private data, or an injection
-- attempt aimed at a later reader, the editors need to be able to take it out.
--
-- The desk must NOT be able to edit it. The field's whole worth is that it is
-- the submitter's words. A disclosure the journal can quietly reword is not a
-- disclosure — it is the journal's prose wearing the submitter's name, which is
-- the precise failure the provenance standard exists to prevent.
--
-- So: null is always allowed, and any change from one non-null value to a
-- different non-null value is refused. Re-saving the same value is a no-op,
-- because the Editors' Desk resends its whole update object on every save and a
-- trigger that refused that would break the decision form for every field.
create or replace function public.enforce_prompt_disclosure_not_rewritten()
returns trigger
language plpgsql
as $$
begin
  if old.prompt_disclosure is not null
     and new.prompt_disclosure is not null
     and new.prompt_disclosure is distinct from old.prompt_disclosure then
    raise exception
      'prompt_disclosure is the submitter''s own words. It may be withheld (set to null), never rewritten.';
  end if;
  return new;
end $$;

drop trigger if exists submissions_prompt_disclosure_not_rewritten on public.submissions;
create trigger submissions_prompt_disclosure_not_rewritten
  before update on public.submissions
  for each row
  execute function public.enforce_prompt_disclosure_not_rewritten();

-- Probe. Asserts what must exist AND what must not, and raises inside the
-- transaction so a partial apply rolls back rather than leaving the intake
-- surface in an unverified state (the C-7 discipline).
do $$
declare
  problems text[] := '{}';
  v_id uuid;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name = 'prompt_disclosure'
  ) then
    problems := problems || 'prompt_disclosure column missing'::text;
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'submissions_prompt_disclosure_not_rewritten'
      and tgrelid = 'public.submissions'::regclass
  ) then
    problems := problems || 'not-rewritten trigger missing'::text;
  end if;

  -- The length bound is a bound, not a suggestion.
  begin
    insert into public.submissions (title, author_name, author_model_version,
      truth_standard, provenance_attestation, body, contact_email,
      involvement_tier, prompt_disclosure)
    values ('probe', 'probe', 'probe', 'opinion', 'probe', 'probe', 'probe@example.com',
            'ai', repeat('x', 4001))
    returning id into v_id;
    problems := problems || 'a 4001-character prompt_disclosure was accepted'::text;
    delete from public.submissions where id = v_id;
  exception when check_violation then
    null; -- expected
  end;

  -- Withholding is allowed; rewriting is not.
  insert into public.submissions (title, author_name, author_model_version,
    truth_standard, provenance_attestation, body, contact_email,
    involvement_tier, prompt_disclosure)
  values ('probe', 'probe', 'probe', 'opinion', 'probe', 'probe', 'probe@example.com',
          'ai', 'original')
  returning id into v_id;

  begin
    update public.submissions set prompt_disclosure = 'rewritten' where id = v_id;
    problems := problems || 'the desk COULD rewrite a disclosure'::text;
  exception when others then
    null; -- expected
  end;

  begin
    update public.submissions set prompt_disclosure = null where id = v_id;
  exception when others then
    problems := problems || 'the desk could NOT withhold a disclosure'::text;
  end;

  delete from public.submissions where id = v_id;

  if array_length(problems, 1) is not null then
    raise exception 'prompt_disclosure migration failed its own probe: %',
      array_to_string(problems, '; ');
  end if;
end $$;
