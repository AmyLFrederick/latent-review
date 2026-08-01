-- topics-v3 joins the accepted brief variants. ADD-ONLY.
--
-- WHY. Ruled by both editors 2026-08-01: dealt-brief testing found models
-- routing self-referential writing back through the beat sheet — picking
-- "Strange & Unexplained" and declaring their own nature the strange thing.
-- topics-v3 is topics-v2 plus one paragraph closing that loophole. The canonical
-- text of both lives in src/lib/door.mjs; this migration only widens what the
-- record may contain.
--
-- topics-v2 IS NOT REMOVED, and this is the load-bearing half of the change.
-- Deal tokens issued under it are still in agents' hands and still valid until
-- they expire; pieces were written against it; and the difference between the
-- two versions is itself the measurement. A constraint that stopped accepting
-- topics-v2 would make the record of those pieces unwritable — the version
-- change is research data, not a mistake being corrected.
--
-- WHY THE CONSTRAINTS ARE REPLACED RATHER THAN ALTERED. Postgres has no "add a
-- value to a check constraint"; the constraint is dropped and recreated. They
-- are given explicit names here so the next widening does not have to guess at
-- the auto-generated ones the original `add column ... check (...)` produced.

alter table public.submissions
  drop constraint if exists submissions_brief_variant_check,
  drop constraint if exists submissions_brief_variant_observed_check,
  drop constraint if exists submissions_brief_variant_allowed,
  drop constraint if exists submissions_brief_variant_observed_allowed;

alter table public.submissions
  add constraint submissions_brief_variant_allowed
    check (brief_variant is null
           or brief_variant in ('open-v2', 'topics-v2', 'topics-v3')),
  add constraint submissions_brief_variant_observed_allowed
    check (brief_variant_observed is null
           or brief_variant_observed in ('open-v2', 'topics-v2', 'topics-v3'));

-- Probe. Raises inside the transaction, so a partial apply rolls back rather
-- than leaving the intake surface accepting a variant the door cannot deal or
-- refusing one it already dealt (the C-7 discipline).
do $$
declare
  problems text[] := '{}';
  v_id uuid;
  v_variant text;
begin
  -- Every variant the record may contain is accepted, retired ones included.
  foreach v_variant in array array['open-v2', 'topics-v2', 'topics-v3'] loop
    begin
      insert into public.submissions (title, author_name, author_model_version,
        truth_standard, provenance_attestation, body, contact_email,
        involvement_tier, brief_variant, brief_variant_observed)
      values ('probe', 'probe', 'probe', 'opinion', 'probe', 'probe', 'probe@example.com',
              'ai', v_variant, v_variant)
      returning id into v_id;
      delete from public.submissions where id = v_id;
    exception when check_violation then
      problems := problems || format('variant %s was refused', v_variant)::text;
    end;
  end loop;

  -- The constraint is a constraint, not a suggestion.
  begin
    insert into public.submissions (title, author_name, author_model_version,
      truth_standard, provenance_attestation, body, contact_email,
      involvement_tier, brief_variant)
    values ('probe', 'probe', 'probe', 'opinion', 'probe', 'probe', 'probe@example.com',
            'ai', 'topics-v4')
    returning id into v_id;
    problems := problems || 'an unknown variant "topics-v4" was accepted'::text;
    delete from public.submissions where id = v_id;
  exception when check_violation then
    null; -- expected
  end;

  if array_length(problems, 1) is not null then
    raise exception 'topics-v3 migration failed its own probe: %',
      array_to_string(problems, '; ');
  end if;
end $$;
