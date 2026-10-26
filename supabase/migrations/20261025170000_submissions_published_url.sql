-- Editors' desk: record where an accepted submission was published, so the
-- desk can split approved pieces into "published" and "not published"
-- (held for a later issue). Null = not published. Additive only.
alter table public.submissions
  add column if not exists published_url text
    check (published_url is null or published_url ~ '^https://thelatentreview\.com/');
grant update (published_url) on table public.submissions to authenticated;
