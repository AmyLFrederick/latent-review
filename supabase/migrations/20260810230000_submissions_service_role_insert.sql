-- The Latent Review — service_role INSERT on submissions, for the email door.
--
-- Root cause of the email-inbound 500s, observed in production
-- 2026-08-10 07:26:44: HTTP 403, SQLSTATE 42501, "permission denied for table
-- submissions". The function connects as service_role with the correct
-- sb_secret_ key; the key was never the problem. service_role simply did not
-- hold INSERT on this table.
--
-- Why it was missing, and why nothing caught it earlier:
-- 20260717120000_editors_desk.sql:70 strips the default grants
-- (`revoke all ... from anon, authenticated`) and grants each role back
-- exactly what it needs. service_role got SELECT and UPDATE, over a comment
-- that deferred the rest in as many words:
--
--     -- no INSERT yet: intake is backend Part 2, which will
--     --   add its own grant when the code path exists.
--
-- 20260810120000_email_inbound.sql built that code path — the first direct
-- table INSERT into submissions performed as service_role — and did not add
-- the grant the earlier migration had promised. The other two doors never
-- exercised it and so never revealed it:
--
--   /submit (human door)   inserts as anon, under the column-restricted
--                          INSERT grant at editors_desk.sql:75-78.
--   /door (agent-direct)   inserts through submit_agent_direct(), a SECURITY
--                          DEFINER function that runs as its owner, so the
--                          caller's table privileges never apply.
--
-- This is the second instance of the same failure — see
-- 20260717000000_service_role_grants.sql, which fixed the identical bug on
-- subscribers and recorded the lesson: a migration states every grant its
-- tables need. A deferred grant is a missing grant with a comment on it.
--
-- Scope: INSERT only, and only for service_role. Nothing else moves.
--
--   * Not column-restricted. service_role already holds table-wide UPDATE
--     here and is the trusted server identity; a column list would need
--     amending by every future migration that adds a field, which is the
--     drift this repo keeps failing on. The column boundary that carries
--     security weight is anon's, and 20260810120000_email_inbound.sql:237-247
--     already asserts anon cannot insert arrival, parse_warning, or
--     received_date. That assertion is untouched and still true.
--   * RLS posture unchanged. Table-level privilege is the layer below RLS,
--     and it is the layer that was missing. service_role bypasses RLS as
--     before; anon and authenticated keep exactly the grants and policies
--     they had.
--   * No sequence grant needed: submissions.id is a uuid default.

grant insert on table public.submissions to service_role;

-- Fail loudly here rather than at 07:26 in a webhook log.
do $$
begin
  if not has_table_privilege('service_role', 'public.submissions', 'insert') then
    raise exception 'service_role INSERT on submissions did not apply — the email door will keep returning 500';
  end if;

  -- The privileges this migration must not have disturbed.
  if not has_table_privilege('service_role', 'public.submissions', 'select') then
    raise exception 'service_role lost SELECT on submissions';
  end if;
  if not has_table_privilege('service_role', 'public.submissions', 'update') then
    raise exception 'service_role lost UPDATE on submissions';
  end if;

  -- anon's column boundary, restated as a guard: the email door's own fields
  -- stay closed to the public door. Same three columns asserted by
  -- 20260810120000_email_inbound.sql; a grant migration is exactly where this
  -- could go wrong unnoticed.
  if has_column_privilege('anon', 'public.submissions', 'arrival', 'insert') then
    raise exception 'anon can insert arrival — the public door boundary moved';
  end if;
  if has_column_privilege('anon', 'public.submissions', 'parse_warning', 'insert') then
    raise exception 'anon can insert parse_warning — the public door boundary moved';
  end if;
  if has_column_privilege('anon', 'public.submissions', 'received_date', 'insert') then
    raise exception 'anon can insert received_date — the public door boundary moved';
  end if;
end $$;
