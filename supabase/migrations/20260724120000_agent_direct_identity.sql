-- The Latent Review — agent-direct, slice (a): the DB layer that makes the
-- agent-direct track FUNCTION-ONLY and DB-ENFORCED.
--
-- This is the reviewed remediation of the §9 security review (see the review
-- and docs/AGENT-DIRECT-PROPOSAL.md). It folds in:
--   * F1  — the public anon INSERT path is tightened to human-attested only;
--           agent-direct rows can be written solely by the SECURITY DEFINER
--           RPC below.
--   * F5  — insert / cap-count / key+ban checks run in SECURITY DEFINER
--           functions; the caller's DB role needs no table SELECT, so
--           "cannot read the queue even with a valid key" is a DB property.
--   * F8  — identity / key / caps tables, RLS enabled from day one,
--           column-restricted grants, hash-only key storage.
--   * F-min — `type` is pinned server-side on the agent path.
--   * ruling — the global agent-direct monthly cap is enforced ATOMICALLY
--           inside the RPC (calendar month; status-agnostic; no refunds).
--
-- House rules (CLAUDE.md): RLS on every table from day one; secrets never in
-- the repo (the key SALT lives in Netlify env — the DB only ever sees the
-- salted hash the function passes in); every grant a table needs is stated
-- here and probed at the end so a silently-failed grant rolls the migration
-- back.
--
-- Slice boundaries: (b) key issuance RPC + endpoint; (c) POST /api/agent/submit
-- with app-layer validation, per-identity monthly ceiling, short-window flood
-- limits, the deterministic injection screen, and the suggested_section +
-- pronouns fields (added there, with the screen); (d) notifier; (e) nightly
-- batch with a hard per-run cap. None of those are built here.

-- ---------------------------------------------------------------------------
-- 1. Identities — the ban lever (R-008). Revocation of keys plus a banned
--    identity status are the whole enforcement surface.
-- ---------------------------------------------------------------------------
create table public.agent_identities (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active'
    check (status in ('active', 'banned')),
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz not null default now()
);

alter table public.agent_identities enable row level security;
revoke all on table public.agent_identities from anon, authenticated;

-- Admin (the human editor's JWT) may read identities and record a ban. No
-- public access of any kind. Same versioned-email pattern as the desk.
grant select on table public.agent_identities to authenticated;
grant update (status, banned_at, ban_reason) on table public.agent_identities to authenticated;

create policy agent_identities_admin_select on public.agent_identities
  for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

create policy agent_identities_admin_update on public.agent_identities
  for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

-- ---------------------------------------------------------------------------
-- 2. API keys — hash only, never the key. The salt lives in Netlify env; the
--    function hashes the raw key and passes only the hash to the RPC, so the
--    salt and the raw key never enter Postgres.
-- ---------------------------------------------------------------------------
create table public.agent_api_keys (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.agent_identities (id) on delete cascade,
  key_hash text not null unique check (char_length(key_hash) between 16 and 200),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index agent_api_keys_identity on public.agent_api_keys (identity_id);

alter table public.agent_api_keys enable row level security;
revoke all on table public.agent_api_keys from anon, authenticated;

-- Admin may read key metadata for revocation/management. Key hashes are not
-- secrets in the recoverable sense, but there is no public access regardless.
grant select on table public.agent_api_keys to authenticated;
grant update (status, revoked_at) on table public.agent_api_keys to authenticated;

create policy agent_api_keys_admin_select on public.agent_api_keys
  for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

create policy agent_api_keys_admin_update on public.agent_api_keys
  for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

-- ---------------------------------------------------------------------------
-- 3. Cap configuration — one small table so the editors can raise the global
--    cap MID-MONTH BY RULING (an admin UPDATE backed by a RULINGS.md entry),
--    with no migration. Only the global agent-direct cap is seeded here (the
--    ruled value, 3,200). The per-identity ceiling belongs to slice (c) and
--    is inserted there once its number is ruled.
-- ---------------------------------------------------------------------------
create table public.agent_caps (
  key text primary key,
  value integer not null check (value >= 0),
  updated_at timestamptz not null default now()
);

insert into public.agent_caps (key, value) values
  ('global_agent_direct_monthly', 3200);

alter table public.agent_caps enable row level security;
revoke all on table public.agent_caps from anon, authenticated;

grant select on table public.agent_caps to authenticated;
grant update (value, updated_at) on table public.agent_caps to authenticated;

create policy agent_caps_admin_select on public.agent_caps
  for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

create policy agent_caps_admin_update on public.agent_caps
  for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

-- ---------------------------------------------------------------------------
-- 4. Link submissions to the submitting identity (add-only). Deliberately NOT
--    added to the anon insert grant, so the public key can never set it.
--
--    Fail-loud (editor ruling): the CHECK is added WITHOUT backfill. Every
--    existing row is human-attested with a null identity and passes. If any
--    agent-direct row already exists it has a null identity and this ALTER
--    fails — which is exactly the signal we want, since no agent-direct row
--    should exist before this migration.
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column agent_identity_id uuid references public.agent_identities (id);

alter table public.submissions
  add constraint submissions_agent_identity_matches_track check (
    (submission_track = 'agent-direct' and agent_identity_id is not null)
    or (submission_track = 'human-attested' and agent_identity_id is null)
  );

-- Index for the atomic monthly count (submission_track, created_at). Confirmed
-- by the editors (review items 4/6).
create index submissions_track_created on public.submissions (submission_track, created_at);

-- Editorial metadata (human editor, item 5): what the piece was about. Written
-- ONLY by the admin/desk path — never the submitter. Deliberately NOT in the
-- anon insert grant and NOT a submit_agent_direct parameter (a submitter-facing
-- topic field would need the slice-(c) injection screen and is out of scope).
-- Completes the "what was it about" dimension alongside the existing outcome
-- fields (status, decisions, dates, identity) for future circulation/analytics.
-- Wiring the AI desk pass to suggest topics is a later, separate item.
alter table public.submissions add column desk_topics text[];
grant update (desk_topics) on table public.submissions to authenticated;

-- ---------------------------------------------------------------------------
-- 5. F1 — tighten the public anon INSERT policy to human-attested only. After
--    this, the public/publishable key can create human-attested submissions
--    only; agent-direct rows are the RPC's alone.
-- ---------------------------------------------------------------------------
alter policy submissions_public_insert on public.submissions
  with check (
    status = 'new'
    and amy_decision is null and coeditor_decision is null
    and coeditor_review is null and decided_at is null
    and submission_track = 'human-attested'
  );

-- ---------------------------------------------------------------------------
-- 6. The SECURITY DEFINER write path. Runs as the function owner, so the atomic
--    cap + auth logic is encapsulated in one transaction. `search_path` is
--    pinned (empty) and every object is fully schema-qualified, so a definer
--    function never resolves a name through the caller's path — this satisfies
--    the Supabase linter's function_search_path_mutable rule (review item 2).
--    The empty path is the strict form of "SET search_path = public, pg_temp":
--    nothing resolves unqualified except pg_catalog, which is always implicit.
--
--    Error contract for the caller (slice c maps these; the messages stay
--    generic so nothing is an oracle):
--      LR401 — not authorized (unknown hash / revoked key / banned identity,
--              all indistinguishable) -> R-008 neutral message.
--      LR429 — monthly cap reached -> "full, hard refuse".
--      LR500 — cap not configured (should never happen; fail closed).
-- ---------------------------------------------------------------------------
create function public.submit_agent_direct(
  p_key_hash text,
  p_title text,
  p_author_name text,
  p_author_model_version text,
  p_truth_standard text,
  p_provenance_attestation text,
  p_body text,
  p_contact_email text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity uuid;
  v_cap integer;
  v_count integer;
  v_id uuid;
begin
  -- (1) Authenticate: hash -> active key -> active identity. A revoked key, a
  -- banned identity, and an unknown hash all resolve to nothing and raise the
  -- same neutral error, so the caller cannot tell them apart (R-008).
  select k.identity_id into v_identity
  from public.agent_api_keys k
  join public.agent_identities i on i.id = k.identity_id
  where k.key_hash = p_key_hash
    and k.status = 'active'
    and i.status = 'active';

  if v_identity is null then
    raise exception 'agent-direct submission not accepted' using errcode = 'LR401';
  end if;

  -- (2) Atomic global monthly cap. Lock the caps row so concurrent submissions
  -- serialize at the check; the count is status-agnostic (calendar month, no
  -- refunds for declined pieces).
  select value into v_cap
  from public.agent_caps
  where key = 'global_agent_direct_monthly'
  for update;

  if v_cap is null then
    raise exception 'agent-direct cap not configured' using errcode = 'LR500';
  end if;

  select count(*) into v_count
  from public.submissions
  where submission_track = 'agent-direct'
    and created_at >= date_trunc('month', now());

  if v_count >= v_cap then
    raise exception 'agent-direct monthly cap reached' using errcode = 'LR429';
  end if;

  -- (3) Insert. type pinned (F-min); tier null; status new; identity linked.
  insert into public.submissions (
    type, title, author_name, author_model_version, submission_track,
    involvement_tier, truth_standard, provenance_attestation, body,
    contact_email, agent_identity_id
  ) values (
    'submission', p_title, p_author_name, p_author_model_version, 'agent-direct',
    null, p_truth_standard, p_provenance_attestation, p_body,
    p_contact_email, v_identity
  )
  returning id into v_id;

  -- (4) Receipt only — nothing evaluative.
  return v_id;
end;
$$;

-- Count primitive: returns a COUNT only, never rows. p_identity null -> global
-- count for the track; non-null -> that identity's count. Status-agnostic, so
-- slice (c) drives both the global backstop and the per-identity ceiling from
-- this one function with no refund logic.
create function public.agent_submission_count(
  p_track text,
  p_identity uuid,
  p_since timestamptz
) returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::integer
  from public.submissions
  where submission_track = p_track
    and created_at >= p_since
    and (p_identity is null or agent_identity_id = p_identity);
$$;

-- Execute grants (AI editor's required hardening, review item 3): Postgres
-- default-grants EXECUTE to PUBLIC and PostgREST exposes /rpc/, so the front
-- door is closed EXPLICITLY — revoke from public, anon, authenticated — and
-- opened only to the role the Netlify functions connect as (service_role). The
-- public anon key therefore cannot reach /rpc/submit_agent_direct at all;
-- protection does not rest on the unforgeability of the hash. (The agent's
-- bearer API key is an app-level token, never a DB credential, so "an agent's
-- key cannot read the queue" still holds — agents get no PostgREST access.)
revoke execute on function public.submit_agent_direct(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.agent_submission_count(text, uuid, timestamptz) from public, anon, authenticated;

grant execute on function public.submit_agent_direct(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.agent_submission_count(text, uuid, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Fail loudly in the migration itself if any grant or policy did not take.
-- ---------------------------------------------------------------------------
do $$
declare
  missing text[] := '{}';
begin
  -- New tables must have RLS enabled.
  if not (select relrowsecurity from pg_class where oid = 'public.agent_identities'::regclass) then
    missing := missing || 'RLS not enabled on agent_identities'::text;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.agent_api_keys'::regclass) then
    missing := missing || 'RLS not enabled on agent_api_keys'::text;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.agent_caps'::regclass) then
    missing := missing || 'RLS not enabled on agent_caps'::text;
  end if;

  -- anon must NOT be able to read any of the new tables.
  if has_table_privilege('anon', 'public.agent_identities', 'select') then
    missing := missing || 'anon can select agent_identities'::text;
  end if;
  if has_table_privilege('anon', 'public.agent_api_keys', 'select') then
    missing := missing || 'anon can select agent_api_keys'::text;
  end if;
  if has_table_privilege('anon', 'public.agent_caps', 'select') then
    missing := missing || 'anon can select agent_caps'::text;
  end if;

  -- The /rpc front door must be closed to the public key and open only to
  -- service_role (review item 3).
  if has_function_privilege('anon',
      'public.submit_agent_direct(text, text, text, text, text, text, text, text)', 'execute') then
    missing := missing || 'anon CAN execute submit_agent_direct (front door not closed)'::text;
  end if;
  if not has_function_privilege('service_role',
      'public.submit_agent_direct(text, text, text, text, text, text, text, text)', 'execute') then
    missing := missing || 'service_role cannot execute submit_agent_direct'::text;
  end if;

  -- Admin visibility on identities/keys/caps.
  if not has_table_privilege('authenticated', 'public.agent_identities', 'select') then
    missing := missing || 'authenticated cannot select agent_identities'::text;
  end if;
  -- Column-restricted grant: probe at column granularity — has_table_privilege
  -- answers "on the whole table?" and ignores column grants (the lesson in
  -- 20260717120000_editors_desk.sql).
  if not has_column_privilege('authenticated', 'public.agent_caps', 'value', 'update') then
    missing := missing || 'authenticated cannot update agent_caps.value'::text;
  end if;

  -- The F1 tightening must be live: the anon insert policy must mention the
  -- human-attested restriction.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname = 'submissions_public_insert'
      and position('human-attested' in coalesce(with_check, '')) > 0
  ) then
    missing := missing || 'anon insert policy not restricted to human-attested'::text;
  end if;

  if array_length(missing, 1) > 0 then
    raise exception 'agent-direct slice (a) did not apply cleanly — %',
      array_to_string(missing, '; ');
  end if;
end $$;
