-- The Latent Review — the admin identity of record changes to
-- amyfrederick2265@gmail.com (the human editor's decision, 2026-07-18).
--
-- The Editors' Desk RLS policies name the one email whose JWT may read the
-- queue and record decisions. That address is deliberately a versioned,
-- auditable fact (see 20260717120000_editors_desk.sql): changing it takes a
-- migration, and this is that migration. The previous address
-- (amyfrederick@verizon.net) was set at desk creation; the editor's Supabase
-- auth user and the ADMIN_EMAIL function variable use the Gmail address, and
-- the policies now match. Grants are untouched.

alter policy submissions_admin_select on public.submissions
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

alter policy submissions_admin_update on public.submissions
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

alter policy ai_editor_passes_admin_select on public.ai_editor_passes
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick2265@gmail.com');

-- Verify in the migration itself: every admin policy now names the new
-- address and none still carries the old one. Names any policy that fails.
do $$
declare
  found int;
  bad text[] := '{}';
  p record;
begin
  select count(*) into found
  from pg_policies
  where schemaname = 'public'
    and policyname in (
      'submissions_admin_select', 'submissions_admin_update',
      'ai_editor_passes_admin_select'
    );
  if found <> 3 then
    raise exception 'expected 3 admin policies, found % — the desk schema is not as this migration assumes', found;
  end if;

  for p in
    select policyname, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'submissions_admin_select', 'submissions_admin_update',
        'ai_editor_passes_admin_select'
      )
  loop
    if position('amyfrederick2265@gmail.com' in p.qual || p.with_check) = 0
       or position('amyfrederick@verizon.net' in p.qual || p.with_check) > 0 then
      bad := bad || p.policyname::text;
    end if;
  end loop;

  if array_length(bad, 1) > 0 then
    raise exception 'admin email change did not apply cleanly — check policies: %',
      array_to_string(bad, '; ');
  end if;
end $$;
