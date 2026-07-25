-- The Latent Review — agent-direct, slice (b): KEY ISSUANCE, under the ruled
-- open-self-service registration posture (posture B, ruled 2026-07-25).
--
-- This migration is the DB half of the issuance path designed in the slice-(b)
-- doc and its open-registration addendum, both marked up by the editors. It
-- folds in the ratified decisions:
--   * B-1  — OPEN self-service registration (no admin gate, no email/PoW gate).
--   * B-2  — rotation is authenticated by presenting a currently-valid key.
--   * B-5  — keys are hashed with the dedicated AGENT_KEY_SALT (Netlify env);
--            the RPCs only ever see salted hashes. Raw keys and salts never
--            enter Postgres.
--   * B-10 — admin-write-only `label` on identities, to aim the ban lever.
--   * L2   — global registration backstops, ATOMIC in the RPC, counted from
--            the durable agent_identities.created_at (never rate_limit_events
--            — the F4 lesson), serialized by FOR UPDATE on the caps rows.
--   * L3   — registered_ip_hash: the salted network fingerprint every minted
--            identity permanently carries (RATE_LIMIT_SALT domain — the key
--            salt and the network salt never cross).
--   * Ratified dials (editors, 2026-07-25; RULINGS entry follows the merge):
--            global_registrations_daily    = 100   (UTC day)
--            global_registrations_monthly  = 400   (calendar month, UTC)
--            per_identity_monthly          = 6     (slice-(c) seed — closes
--            the slice-(a) deferred item; slice (c) READS this ruled dial,
--            nothing enforces it in slice (b))
--            Residual math, confirmed by the editors: 400 × 6 = 2,400 < 3,200
--            — registration farming alone can never exhaust the global
--            agent-direct submission budget.
--
-- Error contract (same family as slice (a); messages generic, no oracle):
--   LR401 — rotation not authorized (unknown hash / revoked key / banned
--           identity, indistinguishable).
--   LR429 — registration backstop full (daily and monthly indistinguishable
--           in the message; the distinction lives in errdetail, which only
--           our service-role caller sees and logs server-side).
--   LR500 — a caps row is missing (fail closed, never fail open).
--
-- Slice boundaries: the per-identity submission ceiling, flood limits, and
-- injection screen are slice (c); notifier (d); nightly batch (e). No new
-- table here, so the RLS-from-day-one rule has nothing new to cover —
-- agent_identities / agent_api_keys / agent_caps keep the slice-(a) RLS and
-- grants unchanged.

-- ---------------------------------------------------------------------------
-- 1. Identity columns: L3 network attribution + B-10 label.
-- ---------------------------------------------------------------------------

-- L3: salted SHA-256 of the registering IP (RATE_LIMIT_SALT domain, hashed in
-- the Netlify function — the raw IP never touches the database, same pattern
-- as rate_limit_events). Nullable: no rows exist today, and a future non-IP
-- issuance path must not be wedged by a NOT NULL. Admin-readable through the
-- existing select policy; never submitter-readable, never rendered.
alter table public.agent_identities
  add column registered_ip_hash text
    check (registered_ip_hash is null or char_length(registered_ip_hash) between 16 and 200);

-- B-10 (approved): who this identity was issued to / what the desk knows
-- about it. Admin-write-only — it is not an RPC parameter and is not in any
-- anon grant, so nothing submitter-controlled can ever reach it (hence no
-- injection screen needed). Turns "ban an opaque UUID" into "ban the cluster
-- that registered from X and submitted Y".
alter table public.agent_identities
  add column label text
    check (label is null or char_length(label) <= 500);

grant update (label) on table public.agent_identities to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Ratified registration dials + the slice-(c) per-identity seed.
--    Dials, not welds: raise/lower mid-month by ruling = one admin UPDATE
--    backed by a RULINGS.md entry, no deploy. Values are the editors'
--    ratified numbers — the probe at the end asserts them, so a drifted or
--    mistyped seed rolls the migration back.
-- ---------------------------------------------------------------------------
insert into public.agent_caps (key, value) values
  ('global_registrations_daily', 100),
  ('global_registrations_monthly', 400),
  ('per_identity_monthly', 6);

-- ---------------------------------------------------------------------------
-- 3. register_agent_identity — the production side of the key lifecycle.
--    One transaction: atomic L2 backstops, then identity + key. The raw key
--    is generated in the Netlify function and never appears here; the RPC
--    sees only its salted hash (B-5). SECURITY DEFINER with a pinned empty
--    search_path and full schema qualification, exactly like slice (a).
--
--    Lock order is fixed (daily row, then monthly row) so every caller
--    acquires the FOR UPDATE locks in the same order — concurrent
--    registrations serialize at the first lock and can never deadlock or
--    double-pass a full backstop.
-- ---------------------------------------------------------------------------
create function public.register_agent_identity(
  p_key_hash text,
  p_ip_hash text
) returns table (identity_id uuid, key_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap_daily integer;
  v_cap_monthly integer;
  v_count integer;
  v_identity uuid;
  v_key uuid;
begin
  -- (1) L2 daily backstop: lock, count from the durable table, refuse full.
  select value into v_cap_daily
  from public.agent_caps
  where key = 'global_registrations_daily'
  for update;

  if v_cap_daily is null then
    raise exception 'agent registration not configured' using errcode = 'LR500';
  end if;

  select count(*) into v_count
  from public.agent_identities
  where created_at >= date_trunc('day', now());

  if v_count >= v_cap_daily then
    raise exception 'agent registration not accepted'
      using errcode = 'LR429', detail = 'daily registration backstop full';
  end if;

  -- (2) L2 monthly backstop, same shape.
  select value into v_cap_monthly
  from public.agent_caps
  where key = 'global_registrations_monthly'
  for update;

  if v_cap_monthly is null then
    raise exception 'agent registration not configured' using errcode = 'LR500';
  end if;

  select count(*) into v_count
  from public.agent_identities
  where created_at >= date_trunc('month', now());

  if v_count >= v_cap_monthly then
    raise exception 'agent registration not accepted'
      using errcode = 'LR429', detail = 'monthly registration backstop full';
  end if;

  -- (3) Mint: identity, then its first key. Status defaults are 'active'.
  --     A key_hash UNIQUE violation (astronomically unlikely at 256-bit
  --     entropy) propagates as-is — fail loud; the endpoint treats it as a
  --     retryable server error and never as success.
  insert into public.agent_identities (registered_ip_hash)
  values (p_ip_hash)
  returning id into v_identity;

  insert into public.agent_api_keys (identity_id, key_hash)
  values (v_identity, p_key_hash)
  returning id into v_key;

  -- (4) Receipt only — ids, never the key, nothing evaluative.
  return query select v_identity, v_key;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. issue_agent_key — rotation (B-2: presenting a currently-valid key IS the
--    authentication). Resolving the presented key and minting the new one
--    happen inside this one definer function, so the endpoint never reads the
--    key tables itself (the F5 discipline) and the failure modes stay neutral:
--    unknown hash, revoked key, and banned identity are indistinguishable
--    (LR401, R-008). Rotation mints NO identity, so it takes no registration
--    backstop — a banned identity cannot rotate, but caps never block an
--    honest rotation.
--
--    Design note for the record: the marked-up base doc sketched
--    issue_agent_key(p_identity uuid, …); built form takes the CURRENT KEY's
--    hash instead, because the endpoint only ever holds the presented key —
--    an identity-uuid parameter would have forced the endpoint to resolve
--    hash→identity with a direct table read outside any RPC. Same B-2
--    semantics, strictly smaller surface. Flagged in the review findings.
-- ---------------------------------------------------------------------------
create function public.issue_agent_key(
  p_current_key_hash text,
  p_new_key_hash text
) returns table (identity_id uuid, key_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity uuid;
  v_key uuid;
begin
  select k.identity_id into v_identity
  from public.agent_api_keys k
  join public.agent_identities i on i.id = k.identity_id
  where k.key_hash = p_current_key_hash
    and k.status = 'active'
    and i.status = 'active';

  if v_identity is null then
    raise exception 'agent key rotation not accepted' using errcode = 'LR401';
  end if;

  insert into public.agent_api_keys (identity_id, key_hash)
  values (v_identity, p_new_key_hash)
  returning id into v_key;

  return query select v_identity, v_key;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Front door: closed explicitly (Postgres default-grants EXECUTE to
--    PUBLIC and PostgREST exposes /rpc/), opened to service_role only —
--    identical treatment to slice (a)'s RPCs.
-- ---------------------------------------------------------------------------
revoke execute on function public.register_agent_identity(text, text) from public, anon, authenticated;
revoke execute on function public.issue_agent_key(text, text) from public, anon, authenticated;

grant execute on function public.register_agent_identity(text, text) to service_role;
grant execute on function public.issue_agent_key(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Fail loudly in the migration itself if anything above did not take.
-- ---------------------------------------------------------------------------
do $$
declare
  missing text[] := '{}';
  v integer;
begin
  -- The ratified dials must be seeded at exactly the ratified values.
  select value into v from public.agent_caps where key = 'global_registrations_daily';
  if v is distinct from 100 then
    missing := missing || 'global_registrations_daily not seeded at 100'::text;
  end if;
  select value into v from public.agent_caps where key = 'global_registrations_monthly';
  if v is distinct from 400 then
    missing := missing || 'global_registrations_monthly not seeded at 400'::text;
  end if;
  select value into v from public.agent_caps where key = 'per_identity_monthly';
  if v is distinct from 6 then
    missing := missing || 'per_identity_monthly not seeded at 6'::text;
  end if;

  -- The /rpc front door must be closed to the public key and open only to
  -- service_role, for both new functions.
  if has_function_privilege('anon', 'public.register_agent_identity(text, text)', 'execute') then
    missing := missing || 'anon CAN execute register_agent_identity (front door not closed)'::text;
  end if;
  if has_function_privilege('anon', 'public.issue_agent_key(text, text)', 'execute') then
    missing := missing || 'anon CAN execute issue_agent_key (front door not closed)'::text;
  end if;
  if not has_function_privilege('service_role', 'public.register_agent_identity(text, text)', 'execute') then
    missing := missing || 'service_role cannot execute register_agent_identity'::text;
  end if;
  if not has_function_privilege('service_role', 'public.issue_agent_key(text, text)', 'execute') then
    missing := missing || 'service_role cannot execute issue_agent_key'::text;
  end if;

  -- B-10: label is admin-writable at column granularity (has_table_privilege
  -- ignores column grants — the editors_desk lesson), and neither new column
  -- leaks to anon.
  if not has_column_privilege('authenticated', 'public.agent_identities', 'label', 'update') then
    missing := missing || 'authenticated cannot update agent_identities.label'::text;
  end if;
  if has_column_privilege('anon', 'public.agent_identities', 'registered_ip_hash', 'select') then
    missing := missing || 'anon can select agent_identities.registered_ip_hash'::text;
  end if;
  if has_column_privilege('anon', 'public.agent_identities', 'label', 'select') then
    missing := missing || 'anon can select agent_identities.label'::text;
  end if;

  -- RLS must still be enabled on the tables this migration touched.
  if not (select relrowsecurity from pg_class where oid = 'public.agent_identities'::regclass) then
    missing := missing || 'RLS not enabled on agent_identities'::text;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.agent_caps'::regclass) then
    missing := missing || 'RLS not enabled on agent_caps'::text;
  end if;

  if array_length(missing, 1) > 0 then
    raise exception 'agent-direct slice (b) did not apply cleanly — %',
      array_to_string(missing, '; ');
  end if;
end $$;
