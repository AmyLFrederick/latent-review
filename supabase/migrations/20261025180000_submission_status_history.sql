-- Editors' desk: add-only status history. Every move of a submission between
-- the desk's four sections (Under review / Accepted, awaiting publication /
-- Published / Declined) is logged with when and who. Rows can be inserted
-- only by the trigger below; nothing in this table can be updated or deleted.
-- Depends on 20261025170000_submissions_published_url.sql (apply that first).

create table if not exists public.submission_status_history (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.submissions (id) on delete restrict,
  from_status text,
  to_status text not null,
  from_section text,
  to_section text not null,
  from_published_url text,
  to_published_url text,
  changed_at timestamptz not null default now(),
  changed_by text not null
);

create index if not exists submission_status_history_submission
  on public.submission_status_history (submission_id, changed_at desc);

alter table public.submission_status_history enable row level security;
revoke all on table public.submission_status_history from anon, authenticated, service_role;
grant select on table public.submission_status_history to authenticated;

create policy submission_status_history_admin_select on public.submission_status_history
  for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick@verizon.net');

-- Section a submission sits in, exactly as the desk derives it.
create or replace function public.desk_section(p_status text, p_published_url text)
returns text language sql immutable as $$
  select case
    when p_status = 'declined' then 'Declined'
    when p_status = 'accepted' and p_published_url is not null then 'Published'
    when p_status = 'accepted' then 'Accepted, awaiting publication'
    else 'Under review'
  end
$$;

create or replace function public.log_submission_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old_section text;
  v_new_section text;
  v_who text := coalesce(nullif(auth.jwt() ->> 'email', ''), nullif(auth.role(), ''), current_user);
begin
  if tg_op = 'INSERT' then
    insert into public.submission_status_history
      (submission_id, from_status, to_status, from_section, to_section, to_published_url, changed_by)
    values (new.id, null, new.status, null, public.desk_section(new.status, new.published_url), new.published_url, v_who);
    return new;
  end if;
  v_old_section := public.desk_section(old.status, old.published_url);
  v_new_section := public.desk_section(new.status, new.published_url);
  if new.status is distinct from old.status
     or new.published_url is distinct from old.published_url then
    insert into public.submission_status_history
      (submission_id, from_status, to_status, from_section, to_section,
       from_published_url, to_published_url, changed_by)
    values (new.id, old.status, new.status, v_old_section, v_new_section,
            old.published_url, new.published_url, v_who);
  end if;
  return new;
end
$$;

drop trigger if exists submissions_status_history on public.submissions;
create trigger submissions_status_history
  after insert or update of status, published_url on public.submissions
  for each row execute function public.log_submission_status_change();

-- Add-only: refuse UPDATE, DELETE and TRUNCATE for every role, the owner included.
create or replace function public.submission_status_history_add_only()
returns trigger language plpgsql as $$
begin
  raise exception 'submission_status_history is add-only: % is not allowed', tg_op;
end
$$;

drop trigger if exists submission_status_history_no_update_delete on public.submission_status_history;
create trigger submission_status_history_no_update_delete
  before update or delete on public.submission_status_history
  for each row execute function public.submission_status_history_add_only();

drop trigger if exists submission_status_history_no_truncate on public.submission_status_history;
create trigger submission_status_history_no_truncate
  before truncate on public.submission_status_history
  for each statement execute function public.submission_status_history_add_only();

-- Starting point: one baseline row per existing submission, so every piece's
-- history begins with where it sits on the day this ships.
insert into public.submission_status_history
  (submission_id, from_status, to_status, from_section, to_section, to_published_url, changed_at, changed_by)
select s.id, null, s.status, null, public.desk_section(s.status, s.published_url), s.published_url, now(),
       'baseline (migration 20261025180000)'
from public.submissions s
where not exists (select 1 from public.submission_status_history h where h.submission_id = s.id);
