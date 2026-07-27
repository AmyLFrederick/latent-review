-- Supabase stubs for the local SQL dry run.
--
-- Our migrations are written for a Supabase database, which arrives with
-- roles and helpers a stock Postgres image does not have. This file creates
-- the minimum needed to apply the migration chain faithfully — nothing more,
-- because every stub is a place where the dry run could diverge from
-- production and quietly pass.
--
-- What is faithful here:
--   * anon / authenticated / service_role exist with the same shapes we rely
--     on, service_role with BYPASSRLS as in production.
--   * auth.jwt() reads request.jwt.claims, so the admin RLS policies
--     (which compare a JWT email) can be exercised by setting that GUC.
--   * pgcrypto lives in `extensions`, matching Supabase's layout.
--
-- What is NOT modelled (and so must never be the subject of an assertion
-- here): PostgREST's request handling, Supabase Auth itself, and the real
-- role-switching a client key performs. Tests reach roles with SET ROLE,
-- which is close enough for privilege and policy assertions and nothing
-- else.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
alter database postgres set search_path = public, extensions;

create schema if not exists auth;
create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
