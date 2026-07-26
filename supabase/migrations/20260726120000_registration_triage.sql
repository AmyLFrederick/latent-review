-- The Latent Review — registration-triage panel (Editors' Desk), its own
-- small slice after slice (b), per the ratified queue.
--
-- One read-only reporting function backing the desk's "Registration triage"
-- section: registrations today / this month against the ruled dials (R-021),
-- network-cluster counts over the L3 fingerprint, the zero-submission
-- identity ratio, and the newest identities with label/status.
--
-- Posture, stated so review can hold it to account:
--   * DETERMINISTIC SQL ONLY. Nothing in this path calls, triggers, queues,
--     or schedules an AI pass. The function is LANGUAGE sql and STABLE —
--     Postgres itself rejects data-modifying statements in a stable SQL
--     function, so read-only is enforced by the engine, not by discipline.
--   * ADMIN-JWT-GATED, twice over. EXECUTE is revoked from public/anon and
--     granted to authenticated only; and the function is SECURITY INVOKER,
--     so every SELECT inside it runs under the caller's own RLS. The
--     slice-(a) policies only match the admin's JWT email — any other
--     authenticated caller (none can exist: signups are disabled) would see
--     zeros and empty lists, never data. No privilege is escalated anywhere.
--   * The window predicates are copied verbatim from the enforcement RPC
--     (register_agent_identity): created_at >= date_trunc('day', now()) and
--     >= date_trunc('month', now()). The panel counts what the door counts —
--     the two can never disagree about "how full is today".
--   * No new table, so the RLS-from-day-one rule has nothing new to cover.
--
-- Presentation constants (not dials, not editorial policy): clusters are
-- groups of >= 2 identities sharing a registered_ip_hash, top 20 by size;
-- the newest-identities list shows 15. Changing these is a code change to a
-- report, not a ruling.

create function public.registration_triage()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'generated_at', now(),

    -- Every dial, at its current ruled value. R-021: dials move only by
    -- ruling; this panel only ever reads them.
    'dials', coalesce((
      select jsonb_agg(
               jsonb_build_object('key', c.key, 'value', c.value, 'updated_at', c.updated_at)
               order by c.key)
      from public.agent_caps c
    ), '[]'::jsonb),

    -- Registrations vs the global backstops — same predicates as the
    -- enforcement RPC, so the panel mirrors the door exactly.
    'registrations', jsonb_build_object(
      'today', (
        select count(*) from public.agent_identities i
        where i.created_at >= date_trunc('day', now())
      ),
      'this_month', (
        select count(*) from public.agent_identities i
        where i.created_at >= date_trunc('month', now())
      )
    ),

    -- Identity totals and the zero-submission ratio (mass registration that
    -- never submits is the farming signature named in the R-021 record).
    'identities', jsonb_build_object(
      'total',  (select count(*) from public.agent_identities i),
      'active', (select count(*) from public.agent_identities i where i.status = 'active'),
      'banned', (select count(*) from public.agent_identities i where i.status = 'banned'),
      'zero_submission', (
        select count(*) from public.agent_identities i
        where not exists (
          select 1 from public.submissions s where s.agent_identity_id = i.id
        )
      )
    ),

    -- L3 clusters: identities sharing a network fingerprint. The hash is the
    -- attribution record made visible — "these N identities registered from
    -- one place". NAT caveat stands (R-021): ban with judgment, not by hash
    -- alone.
    'ip_clusters', coalesce((
      select jsonb_agg(cl order by (cl ->> 'identities')::int desc)
      from (
        select jsonb_build_object(
                 'ip_hash', i.registered_ip_hash,
                 'identities', count(*),
                 'banned', count(*) filter (where i.status = 'banned'),
                 'first_seen', min(i.created_at),
                 'last_seen', max(i.created_at)
               ) as cl
        from public.agent_identities i
        where i.registered_ip_hash is not null
        group by i.registered_ip_hash
        having count(*) >= 2
        order by count(*) desc
        limit 20
      ) clusters
    ), '[]'::jsonb),

    -- Identities carrying no fingerprint (nullable by design for a future
    -- non-IP issuance path; today this should stay 0).
    'unattributed', (
      select count(*) from public.agent_identities i
      where i.registered_ip_hash is null
    ),

    -- Newest identities, with the desk's own label and current status.
    'newest', coalesce((
      select jsonb_agg(n order by n ->> 'created_at' desc)
      from (
        select jsonb_build_object(
                 'id', i.id,
                 'created_at', i.created_at,
                 'status', i.status,
                 'label', i.label,
                 'ip_hash', i.registered_ip_hash,
                 'submissions', (
                   select count(*) from public.submissions s
                   where s.agent_identity_id = i.id
                 )
               ) as n
        from public.agent_identities i
        order by i.created_at desc
        limit 15
      ) newest
    ), '[]'::jsonb)
  );
$$;

-- Front door: nobody anonymous, nothing public. The authenticated grant is
-- the admin's browser session on /admin; RLS (invoker) is the second lock.
revoke execute on function public.registration_triage() from public, anon;
grant execute on function public.registration_triage() to authenticated;

-- Fail loudly in the migration itself if the posture did not take.
do $$
declare
  missing text[] := '{}';
  fn record;
begin
  if has_function_privilege('anon', 'public.registration_triage()', 'execute') then
    missing := missing || 'anon can execute registration_triage'::text;
  end if;
  if not has_function_privilege('authenticated', 'public.registration_triage()', 'execute') then
    missing := missing || 'authenticated cannot execute registration_triage'::text;
  end if;

  select p.prosecdef, p.provolatile into fn
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'registration_triage';

  if fn.prosecdef then
    missing := missing || 'registration_triage is SECURITY DEFINER (must be INVOKER)'::text;
  end if;
  if fn.provolatile <> 's' then
    missing := missing || 'registration_triage is not STABLE (read-only guarantee lost)'::text;
  end if;

  if array_length(missing, 1) is not null then
    raise exception 'registration_triage migration failed checks: %',
      array_to_string(missing, '; ');
  end if;
end;
$$;
