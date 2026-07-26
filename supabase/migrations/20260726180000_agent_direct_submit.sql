-- The Latent Review — agent-direct, slice (c): the DB layer for
-- POST /api/agent/submit, per the marked-up design doc
-- (docs/AGENT-DIRECT-SLICE-C.md, both editors' mark-up of 2026-07-26).
--
-- What this migration does:
--   * §5  — adds suggested_section + pronouns to public.submissions
--           (nullable free text, CHECK-bounded; deliberately NOT an enum and
--           NOT validated against the section roster — R-018 ruled no
--           section picker). No grants added here: the columns are written
--           by the SECURITY DEFINER RPC alone; the anon INSERT grant for the
--           human /submit page is PR #5's business (C-6, confirmed).
--   * §2  — the per-identity monthly ceiling (per_identity_monthly, seeded 6
--           by the slice-(b) migration under R-021) becomes load-bearing
--           inside submit_agent_direct, checked BEFORE the global cap, both
--           serialized under the single global-cap row lock.
--   * C-7 — the RPC signature grows from 8 to 10 args, so this is a DROP and
--           CREATE, not CREATE OR REPLACE (which would leave the old 8-arg
--           overload alive as dead attack surface). The probe asserts
--           exactly ONE submit_agent_direct remains. Confirmed at mark-up.
--
-- Refusal messages stay generic in the exception MESSAGE; the true cause
-- lives in errdetail (server-side only) — the slice-(b) pattern. Both
-- monthly refusals (per-identity ceiling, global cap) carry the same LR429
-- code and are mapped by the endpoint to one ruled sentence (C-2,
-- confirmed: indistinguishable in the response).
--
-- Deploy-ordering note (§5): the endpoint deploy and this migration travel
-- in one PR; nothing calls the RPC but our function, so the drop-and-create
-- window is not a live-traffic hazard.

-- ---------------------------------------------------------------------------
-- 1. §5 — the two new submitter fields. Both nullable, both free text, both
--    screened at intake by the endpoint (nothing submitter-written enters
--    the DB unscreened). Existing rows (all human-attested) pass as null.
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column suggested_section text
    check (suggested_section is null or char_length(suggested_section) <= 100);

alter table public.submissions
  add column pronouns text
    check (pronouns is null or char_length(pronouns) <= 50);

-- ---------------------------------------------------------------------------
-- 2. C-7 — drop the 8-arg RPC before creating the 10-arg one. Fully
--    qualified signature so the drop can never hit anything else.
-- ---------------------------------------------------------------------------
drop function public.submit_agent_direct(text, text, text, text, text, text, text, text);

-- ---------------------------------------------------------------------------
-- 3. The revised SECURITY DEFINER write path. Same discipline as slice (a):
--    search_path pinned empty, every object schema-qualified, service_role
--    the only caller.
--
--    Error contract (the endpoint maps these; messages stay generic so
--    nothing is an oracle):
--      LR401 — not authorized (unknown hash / revoked key / banned identity,
--              all indistinguishable).
--      LR429 — per-identity ceiling OR global monthly cap reached; the
--              distinction lives in errdetail only (C-2).
--      LR500 — a dial row is missing (fail closed; should never happen).
-- ---------------------------------------------------------------------------
create function public.submit_agent_direct(
  p_key_hash text,
  p_title text,
  p_author_name text,
  p_author_model_version text,
  p_truth_standard text,
  p_provenance_attestation text,
  p_body text,
  p_contact_email text,
  p_suggested_section text default null,
  p_pronouns text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity uuid;
  v_cap integer;
  v_ceiling integer;
  v_count integer;
  v_id uuid;
begin
  -- (1) Authenticate: hash -> active key -> active identity. A revoked key,
  -- a banned identity, and an unknown hash all resolve to nothing and raise
  -- the same neutral error (R-008).
  select k.identity_id into v_identity
  from public.agent_api_keys k
  join public.agent_identities i on i.id = k.identity_id
  where k.key_hash = p_key_hash
    and k.status = 'active'
    and i.status = 'active';

  if v_identity is null then
    raise exception 'agent-direct submission not accepted' using errcode = 'LR401';
  end if;

  -- (2) Lock the global-cap row — the single serialization point (§2: one
  -- lock, so the per-identity count and the global count that follow are
  -- both race-free, and there is no lock-ordering question).
  select value into v_cap
  from public.agent_caps
  where key = 'global_agent_direct_monthly'
  for update;

  if v_cap is null then
    raise exception 'agent-direct submission not configured' using errcode = 'LR500';
  end if;

  -- (3) Per-identity ceiling, checked FIRST (§2: the common refusal is
  -- decided before the global count is computed). Counted via the slice-(a)
  -- primitive so the ceiling and any future surface can never disagree on
  -- count semantics: status-agnostic, calendar-month UTC, no refunds.
  select value into v_ceiling
  from public.agent_caps
  where key = 'per_identity_monthly';

  if v_ceiling is null then
    raise exception 'agent-direct submission not configured' using errcode = 'LR500';
  end if;

  v_count := public.agent_submission_count('agent-direct', v_identity, date_trunc('month', now()));
  if v_count >= v_ceiling then
    raise exception 'agent-direct monthly window full'
      using errcode = 'LR429', detail = 'per-identity ceiling';
  end if;

  -- (4) Global monthly cap (unchanged semantics; same count primitive with
  -- a null identity for the whole track).
  v_count := public.agent_submission_count('agent-direct', null, date_trunc('month', now()));
  if v_count >= v_cap then
    raise exception 'agent-direct monthly window full'
      using errcode = 'LR429', detail = 'global monthly cap';
  end if;

  -- (5) Insert. type pinned (F-min stands through slice (c); the two-value
  -- choice opens with (c2) under C-11's review); tier null; status new;
  -- identity linked; the two new fields land verbatim as sent.
  insert into public.submissions (
    type, title, author_name, author_model_version, submission_track,
    involvement_tier, truth_standard, provenance_attestation, body,
    contact_email, agent_identity_id, suggested_section, pronouns
  ) values (
    'submission', p_title, p_author_name, p_author_model_version, 'agent-direct',
    null, p_truth_standard, p_provenance_attestation, p_body,
    p_contact_email, v_identity, p_suggested_section, p_pronouns
  )
  returning id into v_id;

  -- (6) Receipt only — nothing evaluative.
  return v_id;
end;
$$;

-- Front door: closed explicitly to public/anon/authenticated, open only to
-- service_role — same hardening as slice (a), restated for the new
-- signature.
revoke execute on function public.submit_agent_direct(text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_agent_direct(text, text, text, text, text, text, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Fail loudly if anything above did not take (§5's extended probe).
-- ---------------------------------------------------------------------------
do $$
declare
  missing text[] := '{}';
  v integer;
begin
  -- (a) Exactly ONE submit_agent_direct exists — the drop took, and no
  -- 8-arg overload survives as dead attack surface (C-7).
  select count(*) into v
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'submit_agent_direct';
  if v <> 1 then
    missing := missing || format('expected exactly one submit_agent_direct, found %s', v)::text;
  end if;

  -- (b) Front door closed/open correctly for the 10-arg form.
  if has_function_privilege('anon',
      'public.submit_agent_direct(text, text, text, text, text, text, text, text, text, text)', 'execute') then
    missing := missing || 'anon CAN execute submit_agent_direct (front door not closed)'::text;
  end if;
  if not has_function_privilege('service_role',
      'public.submit_agent_direct(text, text, text, text, text, text, text, text, text, text)', 'execute') then
    missing := missing || 'service_role cannot execute submit_agent_direct'::text;
  end if;

  -- (c) The ruled dial still seeded at its ruled value (R-021: 6).
  select value into v from public.agent_caps where key = 'per_identity_monthly';
  if v is distinct from 6 then
    missing := missing || 'per_identity_monthly not seeded at 6'::text;
  end if;

  -- (d) The new columns exist…
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name in ('suggested_section', 'pronouns')
    having count(*) = 2
  ) then
    missing := missing || 'suggested_section/pronouns columns missing'::text;
  end if;

  -- (e) …and carry NO anon INSERT grant (C-6: the human-lane grant is
  -- PR #5's, not this migration's). Column-granular probe — the
  -- editors_desk lesson.
  if has_column_privilege('anon', 'public.submissions', 'suggested_section', 'insert') then
    missing := missing || 'anon can insert suggested_section (C-6 says defer to PR #5)'::text;
  end if;
  if has_column_privilege('anon', 'public.submissions', 'pronouns', 'insert') then
    missing := missing || 'anon can insert pronouns (C-6 says defer to PR #5)'::text;
  end if;

  if array_length(missing, 1) > 0 then
    raise exception 'agent-direct slice (c) did not apply cleanly — %',
      array_to_string(missing, '; ');
  end if;
end $$;
