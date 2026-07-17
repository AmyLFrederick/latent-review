-- The Latent Review — explicit service_role grants on the service tables.
--
-- Root cause of the production subscribe outage: 20260716000000_subscribers.sql
-- created both tables and granted anon its column-restricted INSERT, but never
-- granted service_role anything — it relied on the platform's default
-- privileges, which (verified empirically: HTTP 403, SQLSTATE 42501,
-- "permission denied for table subscribers") did not apply here. Every
-- server-side call failed, starting with the rate-limit check that runs
-- before anything else.
--
-- Lesson encoded here: a migration states every grant its tables need.
-- Platform defaults are not a contract.
--
-- These grants are the audited union of what the service-key code actually
-- does (netlify/functions/*.mts, netlify/lib/ratelimit.mts,
-- scripts/send-issue.mjs) — no more:
--
--   subscribers        SELECT  (lookup by email/token; INSERT ... RETURNING;
--                               send-issue recipient list)
--                      INSERT  (new pending subscription)
--                      UPDATE  (confirm, unsubscribe, re-pending a returner)
--                      — no DELETE: no code path deletes a subscriber, and
--                        unsubscribe is deliberately an UPDATE so consent
--                        records and stable tokens survive.
--
--   rate_limit_events  SELECT  (sliding-window count)
--                      INSERT  (record an attempt)
--                      DELETE  (opportunistic prune of expired events)
--                      — no UPDATE: events are written once, never edited.
--
-- No sequence grant is needed: rate_limit_events.id is GENERATED ALWAYS AS
-- IDENTITY, whose implicit sequence Postgres advances without requiring
-- USAGE from the inserting role (unlike serial), and subscribers.id is a
-- uuid default.
--
-- RLS posture is unchanged: both tables keep RLS enabled, anon keeps only
-- its column-restricted INSERT on subscribers, and service_role bypasses
-- RLS as before — these are table-level privileges, the layer below RLS,
-- which is the layer that was missing.

grant select, insert, update on table public.subscribers to service_role;
grant select, insert, delete on table public.rate_limit_events to service_role;

-- Fail loudly, in the migration itself, if the grants did not take — the
-- original bug survived because a missing privilege was silent until runtime.
do $$
begin
  if not (
    has_table_privilege('service_role', 'public.subscribers', 'select')
    and has_table_privilege('service_role', 'public.subscribers', 'insert')
    and has_table_privilege('service_role', 'public.subscribers', 'update')
    and has_table_privilege('service_role', 'public.rate_limit_events', 'select')
    and has_table_privilege('service_role', 'public.rate_limit_events', 'insert')
    and has_table_privilege('service_role', 'public.rate_limit_events', 'delete')
  ) then
    raise exception 'service_role grants did not apply — subscriptions will fail';
  end if;
end $$;
