-- The Latent Review — BRIEF VARIANT: which assignment a writer drew
--
-- R-033 clause 6: "Which brief each writer drew is recorded, and will appear on
-- its public record." This migration is the recording half. The publication half
-- is a content-schema change and is deliberately not here (see the note at the
-- foot of this file).
--
-- THREE COLUMNS, BECAUSE THERE ARE THREE DIFFERENT FACTS.
--
--   brief_variant           THE RECORD. Set by the editors at acceptance,
--                           immutable thereafter, published. This is the field
--                           the ruling promises, and it follows provenance-label
--                           discipline: set once, never corrected in place.
--
--   brief_variant_observed  THE JOURNAL'S OBSERVATION. Written at intake from a
--                           deal token whose HMAC the endpoint verified. Never
--                           published. This is evidence, not the record.
--
--   brief_variant_claimed   THE AUTHOR'S CLAIM, recorded verbatim and unverified,
--                           under a name that says exactly what it is. Never
--                           published.
--
-- WHY CLAIMED IS RECORDED AT ALL, AND WHY IT IS NOT ENUM-CHECKED. R-033 clause 1
-- says the dealt variant is the journal's observation and never the author's
-- claim. It does not say the claim is worthless — it says the two must not be
-- confused. Recording both, separately, is how they stay unconfused, and the
-- interesting row is the one where they disagree. A CHECK constraint listing the
-- two known variants would turn this column into a validator and discard exactly
-- that case: a claim of "open-v2" against an observation of "topics-v2" is a
-- fact worth having, and a claim of gibberish is a fact worth having too. Free
-- text with a length bound, for the same reason reached_by_version is.
--
-- WHY THIS IS NOT reached_by_version, AND MUST NEVER BE MERGED INTO IT.
-- That column (20260730120000) answers "which outreach text brought this author
-- here." It is desk-mutable, it is measurement metadata, and it is never
-- published. brief_variant answers "which assignment did this writer draw," and
-- the ruling makes it published and immutable. A mutable field inside an
-- immutable record is the exact confusion that migration warned against; this
-- one sits beside it and never inside it.
--
-- WHY THE RPC GETS PARAMETERS THE TAGGING MIGRATION REFUSED.
-- 20260730120000 deliberately gave submit_agent_direct no p_reached_by_version,
-- because "a value arriving through the door is supplied by the caller, which is
-- the author, which is the forgeable case." The two parameters added here look
-- like that and are not, and the difference is the whole design:
--
--   * p_brief_variant_claimed IS the forgeable case, stored under a name that
--     announces it. Nothing reads it as evidence.
--   * p_brief_variant_observed is not the caller's value passing through. The
--     caller sends a TOKEN; the endpoint verifies an HMAC it could not have
--     produced without a secret it does not hold; and what is stored is the
--     endpoint's own conclusion. If the secret is unset or the signature fails,
--     the endpoint passes null. There is no path by which an unverified value
--     reaches the observed column.
--
-- WHAT THIS MIGRATION DOES NOT FIX. /door is unauthenticated by design — an
-- agent has not registered when it is dealt to — so anyone may fetch the door
-- repeatedly and keep the token they prefer. Deals ISSUED are 50/50 by
-- construction; deals REDEEMED are not guaranteed to be. No mechanism at an
-- anonymous door closes this, and a deal ledger would not either. It is written
-- down here so that no one later reads this column as a random sample.

alter table public.submissions
  add column if not exists brief_variant text
    check (brief_variant is null or brief_variant in ('open-v2', 'topics-v2')),
  add column if not exists brief_variant_observed text
    check (brief_variant_observed is null
           or brief_variant_observed in ('open-v2', 'topics-v2')),
  add column if not exists brief_variant_claimed text
    check (brief_variant_claimed is null
           or char_length(brief_variant_claimed) between 1 and 100);

comment on column public.submissions.brief_variant is
  'Which brief this writer drew (R-033 c6). THE RECORD: set by the editors at '
  'acceptance and immutable thereafter, in provenance-label discipline. '
  'Published. Never to be confused with reached_by_version, which is '
  'desk-mutable outreach measurement and is never published.';

comment on column public.submissions.brief_variant_observed is
  'The journal''s own observation of the dealt variant, read from a deal token '
  'whose signature the endpoint verified. Evidence, never the record; never '
  'published. Null means the arrival carried no verifiable token.';

comment on column public.submissions.brief_variant_claimed is
  'What the submission asserted about its own variant, verbatim and unverified. '
  'Deliberately not enum-checked: a claim that disagrees with the observation is '
  'the interesting row, and a validator would discard it. Never published.';

-- IMMUTABILITY, ENFORCED RATHER THAN INTENDED.
--
-- "Set at acceptance and immutable thereafter" is a sentence in a ruling until
-- something refuses the second write. Re-saving the SAME value is allowed and is
-- a no-op: the Editors' Desk resends its whole update object on every save, and
-- a trigger that refused that would break the decision form for every field.
-- What is refused is a CHANGE.
--
-- brief_variant_observed is protected identically. It is the journal's evidence,
-- and evidence the desk can quietly rewrite is not evidence.
create or replace function public.enforce_brief_variant_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.brief_variant is not null
     and new.brief_variant is distinct from old.brief_variant then
    raise exception
      'brief_variant is immutable once set (R-033 c6): % cannot become %. '
      'A wrong label is corrected as a visible correction, never edited in place.',
      old.brief_variant, coalesce(new.brief_variant, 'null');
  end if;

  if old.brief_variant_observed is not null
     and new.brief_variant_observed is distinct from old.brief_variant_observed then
    raise exception
      'brief_variant_observed is the journal''s observation at intake and is not editable.';
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_brief_variant_immutable on public.submissions;
create trigger submissions_brief_variant_immutable
  before update on public.submissions
  for each row
  execute function public.enforce_brief_variant_immutable();

-- GRANTS. The desk sets the record; it does not touch the evidence. anon gets
-- nothing on any of the three — the door writes them through the SECURITY
-- DEFINER RPC, which runs as owner and needs no grant.
grant update (brief_variant) on table public.submissions to authenticated;

-- THE RPC IS DELIBERATELY NOT TOUCHED.
--
-- The obvious move is to widen submit_agent_direct with two more parameters.
-- Postgres identifies a function by its argument list, so that is not a widening
-- at all: `create or replace` with two extra arguments creates a SECOND function,
-- and every existing 13-argument call then resolves ambiguously between them.
-- Doing it properly means dropping the current function and re-specifying its
-- whole body — and that body is where the monthly caps, the global window, the
-- type allowlist and the letter-target validation live. Re-typing all of it to
-- record a metadata field would put the intake gates at risk for no gain, and it
-- is exactly the kind of change that looks safe in a diff and is not.
--
-- So the endpoint writes these two columns in a separate statement after the RPC
-- returns the id, as service_role, which already holds `update` on this table
-- (20260717120000). Consequences, accepted deliberately:
--
--   * There is a brief window in which the row exists with both columns null.
--     Nothing gates on them — they are metadata read by the desk days later, not
--     an intake decision — so a torn write costs an annotation, never an
--     acceptance.
--   * If that second statement fails, the submission still stands. A receipt is
--     confirmation of arrival, and arrival happened. The endpoint logs the
--     failure rather than refusing a piece that is already safely stored.
--
-- The allowlist that the RPC would have enforced is not lost: the CHECK
-- constraint on brief_variant_observed above refuses anything outside the two
-- variants at the database, which is the layer that cannot be bypassed by a bug
-- in the endpoint.

-- Probe. Asserts what must exist AND what must not, and raises inside the
-- transaction so a partial apply rolls back rather than leaving the intake
-- surface in an unverified state (the C-7 discipline).
do $$
declare
  problems text[] := '{}';
  col text;
begin
  foreach col in array array[
    'brief_variant', 'brief_variant_observed', 'brief_variant_claimed'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'submissions'
        and column_name = col
    ) then
      problems := problems || format('%s column missing', col)::text;
    end if;

    -- THE NEGATIVE ASSERTIONS. These are the reason this block exists: a
    -- submitter who could write any of these three turns the measurement into
    -- something an author can influence.
    if has_column_privilege('anon', 'public.submissions', col, 'insert') then
      problems := problems || format('anon CAN insert %s — self-reported variants are forgeable', col)::text;
    end if;
    if has_column_privilege('anon', 'public.submissions', col, 'update') then
      problems := problems || format('anon CAN update %s', col)::text;
    end if;
  end loop;

  -- The desk sets the record and only the record.
  if not has_column_privilege('authenticated', 'public.submissions',
                              'brief_variant', 'update') then
    problems := problems || 'the desk cannot UPDATE brief_variant'::text;
  end if;
  if has_column_privilege('authenticated', 'public.submissions',
                          'brief_variant_observed', 'update') then
    problems := problems || 'the desk CAN update brief_variant_observed — evidence must not be editable'::text;
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'submissions_brief_variant_immutable' and not tgisinternal
  ) then
    problems := problems || 'the immutability trigger is missing'::text;
  end if;

  -- Regression guard: the intake privileges anon legitimately holds must be
  -- untouched by this migration.
  if not has_column_privilege('anon', 'public.submissions', 'body', 'insert') then
    problems := problems || 'REGRESSION: anon lost insert on body'::text;
  end if;
  if not has_column_privilege('anon', 'public.submissions', 'truth_standard', 'insert') then
    problems := problems || 'REGRESSION: anon lost insert on truth_standard'::text;
  end if;

  if array_length(problems, 1) is not null then
    raise exception 'brief_variant migration failed its own probe: %',
      array_to_string(problems, '; ');
  end if;
end $$;

-- VERIFICATION QUERY — run this after applying and paste the output back, so the
-- ops note can record what is actually live rather than what was merged.
-- ("Merged" and "live" are separate facts — docs/ops/2026-07-26.)
--
--   select column_name, data_type
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'submissions'
--      and column_name like 'brief_variant%'
--    order by column_name;
--
--   select tgname from pg_trigger
--    where tgname = 'submissions_brief_variant_immutable' and not tgisinternal;
--
-- THE PUBLICATION HALF IS NOT HERE. Published pieces are markdown under
-- src/content/articles and the build never reads this database, so putting a
-- variant on a piece's public page is a content-schema change plus a
-- copy-at-publication step, and it ships as its own single.
--
-- IT IS NOT A LAUNCH BLOCKER, AND THE RULING'S OWN WORDS ARE WHY. Clause 6's
-- gate is "no piece may be published under this model with its brief
-- UNRECORDED" — it gates publication on the recording, which is what this
-- migration is, not on the display surface. Ruled by the human editor
-- 2026-07-30 on this PR's findings, which had over-read the clause's "will
-- appear on its public record" as a pre-Issue-1 deadline for the display. The
-- display ships early the following week.
