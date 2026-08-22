-- Immediate subscription + the consent record — the DB layer's assertions.
--
-- Run with scripts/sql-dry-run.sh (see that file for the how). Every test runs
-- in its own transaction and rolls back, so no test can see another's rows and
-- the file can be re-run against the same database.
--
-- WHAT THIS FILE COVERS: what the 2026-08-22 migration is responsible for —
-- that the consent record exists and is mandatory, that the anon insert door is
-- shut, and that a subscriber row can no longer be created without saying when
-- and through which door consent was given.
--
-- WHAT IT CANNOT COVER, and the honest reason: the backfill. The migration's
-- two UPDATEs run over whatever rows exist when it is applied, and the dry-run
-- container's `subscribers` table is empty — the chain creates it three
-- migrations before this one and nothing seeds it. So the assertions below
-- construct the pre-migration states by hand and check the SHAPE that the
-- backfill leaves behind; the counts themselves come from the RAISE NOTICE
-- output when the migration is applied to production, which is the receipt.

\set ON_ERROR_STOP on

create or replace function pg_temp.want(got text, expected text, label text)
returns void language plpgsql as $$
begin
  if got is not distinct from expected then
    raise notice 'pass: %', label;
  else
    raise exception 'FAIL % — got %, expected %', label, coalesce(got, '<null>'), expected;
  end if;
end $$;

-- C1 · The consent columns exist, and both are mandatory.
begin;
select pg_temp.want(
  (select string_agg(column_name || ':' || is_nullable, ',' order by column_name)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'subscribers'
      and column_name in ('consent_at', 'consent_source')),
  'consent_at:NO,consent_source:NO', 'C1 consent record present and NOT NULL');
rollback;

-- C2 · A row cannot be written without saying when consent was given.
--     consent_at has a default, so this tests the explicit-null case: a writer
--     that knows about the column and passes nothing for it.
begin;
do $$
begin
  insert into public.subscribers (email, status, consent_at, consent_source)
  values ('c2@example.com', 'confirmed', null, 'web-form');
  raise exception 'FAIL C2 — a subscriber was written with no consent moment';
exception when not_null_violation then raise notice 'pass: C2 consent_at is required';
end $$;
rollback;

-- C3 · A row cannot be written without saying which door it came through.
--     This is the one with no default, so an ordinary insert that forgets it
--     fails rather than recording an unattributed consent.
begin;
do $$
begin
  insert into public.subscribers (email) values ('c3@example.com');
  raise exception 'FAIL C3 — a subscriber was written with no consent source';
exception when not_null_violation then raise notice 'pass: C3 consent_source is required';
end $$;
rollback;

-- C4 · The source is shape-checked: present, and short enough to read.
begin;
do $$
begin
  insert into public.subscribers (email, consent_source) values ('c4@example.com', '');
  raise exception 'FAIL C4 — an empty consent source was accepted';
exception when check_violation then raise notice 'pass: C4 empty source refused';
end $$;
rollback;

begin;
do $$
begin
  insert into public.subscribers (email, consent_source)
  values ('c4b@example.com', repeat('x', 65));
  raise exception 'FAIL C4b — an over-long consent source was accepted';
exception when check_violation then raise notice 'pass: C4b over-long source refused';
end $$;
rollback;

-- C5 · consent_at defaults to now() for a writer that omits it entirely.
--     The service function always passes one; this is the backstop, and it must
--     be a real moment rather than null.
begin;
insert into public.subscribers (email, consent_source) values ('c5@example.com', 'api');
select pg_temp.want(
  (select case when consent_at between now() - interval '1 minute' and now()
               then 'recent' else 'wrong' end
     from public.subscribers where email = 'c5@example.com'),
  'recent', 'C5 consent_at defaults to the moment of writing');
rollback;

-- C6 · The anon insert door is shut — both the grant and the policy.
begin;
select pg_temp.want(
  (select coalesce(string_agg(privilege_type, ','), 'none')
     from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'subscribers' and grantee = 'anon'),
  'none', 'C6 anon holds no grant on subscribers');
select pg_temp.want(
  (select coalesce(string_agg(policyname, ','), 'none')
     from pg_policies where schemaname = 'public' and tablename = 'subscribers'),
  'none', 'C6b no policy remains — RLS denies by default');
rollback;

-- C7 · RLS is still on. Revoking the grant must not have been read as
--     "this table no longer needs protecting".
begin;
select pg_temp.want(
  (select case when relrowsecurity then 'on' else 'off' end
     from pg_class where oid = 'public.subscribers'::regclass),
  'on', 'C7 row level security remains enabled');
rollback;

-- C8 · The backfill's shape: a row in each pre-migration state, run through
--     the same two UPDATEs the migration performs, lands where the migration
--     says it lands. Constructed by hand because the chain leaves no rows.
begin;
-- The pre-migration table had no consent record at all, so the fixture has to
-- put the columns back the way they were before it can hold a pre-migration
-- row. DDL is transactional here; the rollback at the end of this block
-- restores the constraints along with the rows.
-- The default has to go too, and that is worth naming: `consent_at` defaults to
-- now(), so a fixture row that merely omits the column arrives with a
-- timestamp, the backfill's `where consent_at is null` never matches it, and
-- the test passes for the wrong reason. In the migration itself the ordering
-- rules that out — the default is added after the backfill has run — but a
-- fixture builds the old table by hand and has to build it accurately.
alter table public.subscribers
  alter column consent_at drop not null,
  alter column consent_at drop default,
  alter column consent_source drop not null;

insert into public.subscribers (email, status, created_at, confirmed_at)
values ('c8-pending@example.com',   'pending',      now() - interval '10 days', null),
       ('c8-confirmed@example.com', 'confirmed',    now() - interval '10 days', now() - interval '9 days'),
       ('c8-gone@example.com',      'unsubscribed', now() - interval '10 days', now() - interval '9 days');
-- The migration's step 2, verbatim in effect.
update public.subscribers
   set consent_at = created_at,
       consent_source = case
         when status = 'confirmed' then 'legacy-double-opt-in'
         when status = 'unsubscribed' then 'legacy-unsubscribed'
         else 'legacy-pending'
       end
 where consent_at is null;
-- The migration's step 3.
update public.subscribers
   set status = 'confirmed',
       confirmed_at = now(),
       consent_source = 'signup-form-pre-2026-08-22'
 where status = 'pending' and email like 'c8-%';

select pg_temp.want(
  (select status || '|' || consent_source || '|' ||
          case when consent_at = created_at then 'consent=signup' else 'consent=moved' end || '|' ||
          case when confirmed_at > created_at then 'joined=today' else 'joined=backdated' end
     from public.subscribers where email = 'c8-pending@example.com'),
  'confirmed|signup-form-pre-2026-08-22|consent=signup|joined=today',
  'C8 a stranded signup is subscribed, consenting on its own signup date');

select pg_temp.want(
  (select status || '|' || consent_source
     from public.subscribers where email = 'c8-confirmed@example.com'),
  'confirmed|legacy-double-opt-in', 'C8b an already-confirmed row keeps its status and is labelled');

select pg_temp.want(
  (select status || '|' || consent_source
     from public.subscribers where email = 'c8-gone@example.com'),
  'unsubscribed|legacy-unsubscribed', 'C8c an unsubscribed row is NOT resubscribed by the backfill');
rollback;

\echo '=== all subscriber-consent SQL assertions passed ==='
