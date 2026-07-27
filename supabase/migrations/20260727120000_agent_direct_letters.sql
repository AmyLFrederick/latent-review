-- The Latent Review — agent-direct, slice (c2): LETTERS BY AGENT, the DB
-- layer, per R-024 and the marked-up (c2) findings
-- (docs/SCRATCH-SLICE-C2.md, both editors' mark-up of 2026-07-27).
--
-- What this migration does:
--   * C2-1 (RULED, option (a)) — the submissions.type CHECK becomes
--     ('submission', 'correspondence', 'letter'). 'letter' is the
--     agent-direct letter value; 'correspondence' remains R-007's human-lane
--     value, untouched (R-017's record intact). The public anon INSERT policy
--     is tightened in the same breath so the widening hands anon NOTHING new
--     — see §1.
--   * C2-9 — letter_target_type / letter_target_id on submissions, with
--     CHECK backstops; the RPC is the enforcer, the CHECKs are the floor.
--   * C2-5 — agent_submission_count grows a p_type filter: drop-and-recreate,
--     probe asserts exactly one function (the C-7 discipline).
--   * C2-6 — submit_agent_direct takes p_type explicitly with NO default, so
--     an endpoint that forgets it fails closed rather than silently writing a
--     submission; the two-value allowlist is re-validated here even though
--     the endpoint already allowlisted it (C-11: three layers, none shared).
--   * R-024 §1 — the letter budget dial (3 per identity per calendar month,
--     UTC), seeded here and asserted by the probe. Letters SHARE the global
--     monthly window (R-024 §2 / C-13): the global count stays type-agnostic.
--
-- Error contract — LR400 joins the RPC's family (C-5 confirmed it for the
-- endpoint; this is its first DB use). Messages stay generic; the true cause
-- lives in errdetail, which only our service-role caller sees:
--   LR400 — type not allowlisted, or a malformed/absent/misplaced letter
--           target. The endpoint maps it to the one generic validation body.
--   LR401 — not authorized (unknown hash / revoked key / banned identity).
--   LR429 — per-identity ceiling (submissions OR letters) or the global
--           monthly cap; indistinguishable in the response (C-2 unchanged —
--           the letter budget joins the same month-full class).
--   LR500 — a dial row is missing (fail closed, never open).
--
-- Not here, by design: word bounds (100–300 for letters) stay at the
-- endpoint, exactly as the 500–5,000 submission bounds do — the DB CHECKs
-- bound characters, not words. Target EXISTENCE and the two-month freshness
-- window are endpoint work against the deploy bundle (C2-2/C2-3 CONFIRMED:
-- the published archive and the section roster live in the repo, not in
-- Postgres). This migration enforces shape and presence only.
--
-- Deploy-ordering note: migration and endpoint travel in one PR; nothing
-- calls these RPCs but our functions, so the drop-and-create window is not a
-- live-traffic hazard.

-- ---------------------------------------------------------------------------
-- 1. C2-1 — the type vocabulary, and the anon door held exactly where it was.
--
--    FINDING (raised at the build, not in the mark-up): anon HOLDS a column
--    INSERT grant on submissions.type (editors_desk migration), and the
--    public_insert policy constrains submission_track but not type. Widening
--    the CHECK alone would therefore hand the public key a third writable
--    value it never had — a human-attested row typed 'letter'. It could not
--    reach an agent budget (those filter on track = 'agent-direct'), but it
--    would land on the desk wearing the agent-letter label, and a new
--    submitter-controlled value is exactly what "no new write surface" is
--    supposed to exclude. So the policy is restated to allowlist the two
--    values anon could already write. Status quo preserved, precisely.
-- ---------------------------------------------------------------------------

-- Drop the existing single-column CHECK on `type` by discovery, not by
-- guessed name: fail loudly rather than assume Postgres's auto-naming.
do $$
declare
  v_con text;
begin
  select con.conname into v_con
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid and att.attname = 'type'
  where con.conrelid = 'public.submissions'::regclass
    and con.contype = 'c'
    and con.conkey = array[att.attnum];

  if v_con is null then
    raise exception
      'no single-column CHECK on public.submissions.type found — refusing to guess';
  end if;

  execute format('alter table public.submissions drop constraint %I', v_con);
end $$;

alter table public.submissions
  add constraint submissions_type_check
  check (type in ('submission', 'correspondence', 'letter'));

-- The public door keeps exactly the reach it had before the widening.
-- (ALTER POLICY replaces the whole expression, so every existing clause is
-- restated here verbatim — the F1 track restriction included.)
alter policy submissions_public_insert on public.submissions
  with check (
    status = 'new'
    and amy_decision is null and coeditor_decision is null
    and coeditor_review is null and decided_at is null
    and submission_track = 'human-attested'
    and type in ('submission', 'correspondence')
  );

-- ---------------------------------------------------------------------------
-- 2. C2-9 — the declared target (R-024 §5). Null for submissions and for
--    every existing row. The RPC enforces; these CHECKs are the backstop that
--    survives a future caller.
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column letter_target_type text
    check (letter_target_type is null
           or letter_target_type in ('piece', 'charter', 'ruling', 'section'));

alter table public.submissions
  add column letter_target_id text
    check (letter_target_id is null or char_length(letter_target_id) between 1 and 200);

-- A target exists if and only if the row is a letter. Unconditional, because
-- C2-1(a) gave agent letters their own value: no track qualification needed.
alter table public.submissions
  add constraint letter_target_present_iff_letter
  check ((type = 'letter') = (letter_target_type is not null));

-- The Charter is a singleton — it has no identifier. Every other target type
-- carries one.
alter table public.submissions
  add constraint letter_target_id_matches_type
  check (
    letter_target_type is null
    or (letter_target_type = 'charter' and letter_target_id is null)
    or (letter_target_type <> 'charter' and letter_target_id is not null)
  );

-- No grants added: both columns are written by the SECURITY DEFINER RPC
-- alone. The probe below asserts anon can neither insert nor select them.

-- ---------------------------------------------------------------------------
-- 3. R-024 §1 — the letter budget dial. A dial, not a weld: changing it is
--    one admin UPDATE backed by a RULINGS entry, no deploy.
-- ---------------------------------------------------------------------------
insert into public.agent_caps (key, value) values
  ('per_identity_letters_monthly', 3);

-- ---------------------------------------------------------------------------
-- 4. C2-5 — the count primitive gains a type filter. Drop-and-recreate (a
--    signature change; CREATE OR REPLACE would leave the 3-arg form alive as
--    a second callable function). submit_agent_direct is dropped FIRST in §5
--    below... except that plpgsql resolves callees at runtime, so the order
--    that actually matters is: no function may be left half-wired at COMMIT.
--    Both are recreated in this same transaction.
--
--    p_type null = every type on the track, which is exactly the old
--    behaviour — so the global window keeps its meaning (letters share it,
--    R-024 §2) and the six-piece count equals today's count on a letters-free
--    dataset (the cutover equivalence the regression test pins).
-- ---------------------------------------------------------------------------
drop function public.submit_agent_direct(text, text, text, text, text, text, text, text, text, text);
drop function public.agent_submission_count(text, uuid, timestamptz);

create function public.agent_submission_count(
  p_track text,
  p_identity uuid,
  p_since timestamptz,
  p_type text default null
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
    and (p_identity is null or agent_identity_id = p_identity)
    and (p_type is null or type = p_type);
$$;

revoke execute on function public.agent_submission_count(text, uuid, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.agent_submission_count(text, uuid, timestamptz, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. The write path, reopened pin and all (C-11). Same discipline as every
--    slice: SECURITY DEFINER, search_path pinned empty, everything schema-
--    qualified, service_role the only caller.
--
--    p_type carries NO default — the endpoint applies the wire default
--    ('submission' when absent) and this function refuses anything that is
--    not one of the two ruled values. The layers are independent on purpose:
--    endpoint allowlist, RPC re-validation, DB CHECK.
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
  p_type text,
  p_letter_target_type text default null,
  p_letter_target_id text default null,
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
  v_dial text;
  v_count integer;
  v_id uuid;
begin
  -- (1) The two-value allowlist, re-validated. An endpoint bug, a future
  -- caller, or a hand-run RPC all die here before anything is read or
  -- locked.
  if p_type is null or p_type not in ('submission', 'letter') then
    raise exception 'agent-direct submission not accepted'
      using errcode = 'LR400', detail = 'type not allowlisted';
  end if;

  -- (2) Target shape (R-024 §5). Presence, vocabulary, and the Charter
  -- singleton rule — all deterministic. EXISTENCE and freshness are the
  -- endpoint's, against the deploy bundle (C2-2/C2-3).
  if p_type = 'letter' then
    if p_letter_target_type is null
       or p_letter_target_type not in ('piece', 'charter', 'ruling', 'section') then
      raise exception 'agent-direct submission not accepted'
        using errcode = 'LR400', detail = 'letter target type invalid or absent';
    end if;

    if p_letter_target_type = 'charter' then
      if p_letter_target_id is not null then
        raise exception 'agent-direct submission not accepted'
          using errcode = 'LR400', detail = 'charter target carries no identifier';
      end if;
    elsif p_letter_target_id is null then
      raise exception 'agent-direct submission not accepted'
        using errcode = 'LR400', detail = 'letter target identifier absent';
    end if;
  else
    if p_letter_target_type is not null or p_letter_target_id is not null then
      raise exception 'agent-direct submission not accepted'
        using errcode = 'LR400', detail = 'target fields on a non-letter';
    end if;
  end if;

  -- (3) Authenticate: hash -> active key -> active identity. A revoked key,
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

  -- (4) Lock the global-cap row — still the single serialization point, so
  -- the per-identity count and the global count that follow are both
  -- race-free and there is no lock-ordering question.
  select value into v_cap
  from public.agent_caps
  where key = 'global_agent_direct_monthly'
  for update;

  if v_cap is null then
    raise exception 'agent-direct submission not configured' using errcode = 'LR500';
  end if;

  -- (5) Per-identity ceiling, checked FIRST, on the dial for THIS type: six
  -- pieces (R-021 N5) and three letters (R-024 §1) are separate budgets
  -- counted by the one primitive, so they can never disagree on semantics.
  v_dial := case p_type
              when 'letter' then 'per_identity_letters_monthly'
              else 'per_identity_monthly'
            end;

  select value into v_ceiling
  from public.agent_caps
  where key = v_dial;

  if v_ceiling is null then
    raise exception 'agent-direct submission not configured' using errcode = 'LR500';
  end if;

  v_count := public.agent_submission_count(
               'agent-direct', v_identity, date_trunc('month', now()), p_type);
  if v_count >= v_ceiling then
    raise exception 'agent-direct monthly window full'
      using errcode = 'LR429', detail = 'per-identity ceiling: ' || p_type;
  end if;

  -- (6) Global monthly cap — type-agnostic: letters share the window and
  -- cannot expand total monthly review volume (R-024 §2 / C-13).
  v_count := public.agent_submission_count(
               'agent-direct', null, date_trunc('month', now()), null);
  if v_count >= v_cap then
    raise exception 'agent-direct monthly window full'
      using errcode = 'LR429', detail = 'global monthly cap';
  end if;

  -- (7) Insert. type is now the validated parameter; tier null; status new;
  -- identity linked; every submitter field lands verbatim as sent.
  insert into public.submissions (
    type, title, author_name, author_model_version, submission_track,
    involvement_tier, truth_standard, provenance_attestation, body,
    contact_email, agent_identity_id, suggested_section, pronouns,
    letter_target_type, letter_target_id
  ) values (
    p_type, p_title, p_author_name, p_author_model_version, 'agent-direct',
    null, p_truth_standard, p_provenance_attestation, p_body,
    p_contact_email, v_identity, p_suggested_section, p_pronouns,
    p_letter_target_type, p_letter_target_id
  )
  returning id into v_id;

  -- (8) Receipt only — nothing evaluative.
  return v_id;
end;
$$;

revoke execute on function public.submit_agent_direct(
  text, text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_agent_direct(
  text, text, text, text, text, text, text, text, text, text, text, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Fail loudly in the migration itself if anything above did not take.
-- ---------------------------------------------------------------------------
do $$
declare
  missing text[] := '{}';
  v integer;
  v_def text;
begin
  -- (a) C-7 discipline: exactly ONE of each reshaped function survives — no
  -- old-arity overload left alive as dead attack surface.
  select count(*) into v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'submit_agent_direct';
  if v <> 1 then
    missing := missing || format('expected exactly one submit_agent_direct, found %s', v)::text;
  end if;

  select count(*) into v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'agent_submission_count';
  if v <> 1 then
    missing := missing || format('expected exactly one agent_submission_count, found %s', v)::text;
  end if;

  -- (b) Front door: closed to anon, open to service_role, for both new
  -- signatures.
  if has_function_privilege('anon',
      'public.submit_agent_direct(text, text, text, text, text, text, text, text, text, text, text, text, text)',
      'execute') then
    missing := missing || 'anon CAN execute submit_agent_direct (front door not closed)'::text;
  end if;
  if not has_function_privilege('service_role',
      'public.submit_agent_direct(text, text, text, text, text, text, text, text, text, text, text, text, text)',
      'execute') then
    missing := missing || 'service_role cannot execute submit_agent_direct'::text;
  end if;
  if has_function_privilege('anon',
      'public.agent_submission_count(text, uuid, timestamptz, text)', 'execute') then
    missing := missing || 'anon CAN execute agent_submission_count (front door not closed)'::text;
  end if;
  if not has_function_privilege('service_role',
      'public.agent_submission_count(text, uuid, timestamptz, text)', 'execute') then
    missing := missing || 'service_role cannot execute agent_submission_count'::text;
  end if;

  -- (c) The ruled dials, at their ruled values (R-021 N5 = 6; R-024 §1 = 3).
  select value into v from public.agent_caps where key = 'per_identity_monthly';
  if v is distinct from 6 then
    missing := missing || 'per_identity_monthly not seeded at 6'::text;
  end if;
  select value into v from public.agent_caps where key = 'per_identity_letters_monthly';
  if v is distinct from 3 then
    missing := missing || 'per_identity_letters_monthly not seeded at 3'::text;
  end if;

  -- (d) C2-1: the type CHECK carries all three values — and 'correspondence'
  -- is still among them (R-007/R-017 untouched).
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.submissions'::regclass and conname = 'submissions_type_check';
  if v_def is null then
    missing := missing || 'submissions_type_check missing'::text;
  else
    if v_def not like '%''letter''%' then
      missing := missing || 'type CHECK does not admit ''letter'''::text;
    end if;
    if v_def not like '%''correspondence''%' then
      missing := missing || 'type CHECK dropped ''correspondence'' (R-007/R-017 value)'::text;
    end if;
    if v_def not like '%''submission''%' then
      missing := missing || 'type CHECK dropped ''submission'''::text;
    end if;
  end if;

  -- (e) The public door gained nothing: the anon INSERT policy allowlists
  -- type, and 'letter' is not in it. (Expression text, because a policy
  -- predicate has no privilege API to interrogate.)
  select pg_get_expr(polwithcheck, polrelid) into v_def
  from pg_policy
  where polrelid = 'public.submissions'::regclass and polname = 'submissions_public_insert';
  if v_def is null then
    missing := missing || 'submissions_public_insert policy missing'::text;
  elsif v_def not like '%''correspondence''%' or v_def like '%''letter''%' then
    missing := missing || 'anon insert policy does not hold type to (submission, correspondence)'::text;
  end if;

  -- (f) The target columns exist, with their two shape constraints…
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name in ('letter_target_type', 'letter_target_id')
    having count(*) = 2
  ) then
    missing := missing || 'letter_target_type/letter_target_id columns missing'::text;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.submissions'::regclass
      and conname = 'letter_target_present_iff_letter'
  ) then
    missing := missing || 'letter_target_present_iff_letter constraint missing'::text;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.submissions'::regclass
      and conname = 'letter_target_id_matches_type'
  ) then
    missing := missing || 'letter_target_id_matches_type constraint missing'::text;
  end if;

  -- (g) …and carry no anon reach of any kind. Column-granular probes — the
  -- editors_desk lesson (has_table_privilege ignores column grants).
  if has_column_privilege('anon', 'public.submissions', 'letter_target_type', 'insert')
     or has_column_privilege('anon', 'public.submissions', 'letter_target_id', 'insert') then
    missing := missing || 'anon can insert letter target columns'::text;
  end if;
  if has_column_privilege('anon', 'public.submissions', 'letter_target_type', 'select')
     or has_column_privilege('anon', 'public.submissions', 'letter_target_id', 'select') then
    missing := missing || 'anon can select letter target columns'::text;
  end if;

  -- (h) RLS still enabled on everything this migration touched.
  if not (select relrowsecurity from pg_class where oid = 'public.submissions'::regclass) then
    missing := missing || 'RLS not enabled on submissions'::text;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.agent_caps'::regclass) then
    missing := missing || 'RLS not enabled on agent_caps'::text;
  end if;

  if array_length(missing, 1) > 0 then
    raise exception 'agent-direct slice (c2) did not apply cleanly — %',
      array_to_string(missing, '; ');
  end if;
end $$;
