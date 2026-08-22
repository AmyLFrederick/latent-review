-- The Latent Review — a signup subscribes immediately (editors, 2026-08-22).
--
-- WHAT CHANGES. Until today a signup created a `pending` row and waited for a
-- click on an emailed link before it became `confirmed`. Confirmed opt-in is
-- the stronger consent posture and the editors know it; the trade is accepted
-- knowingly and is written down in the PR rather than implied here. What
-- replaces it is a single-step opt-in with a welcome email sent on signup, an
-- unsubscribe link in every message, and a consent record written at the
-- moment the address is submitted.
--
-- THIS MIGRATION DOES THREE THINGS:
--   1. Adds the consent record — `consent_at` and `consent_source` — to every
--      subscriber row, existing rows included.
--   2. Subscribes everyone currently stranded in `pending`. These are people
--      who typed their address into the form and never completed a step that
--      no longer exists. Leaving them pending would mean the change to
--      immediate subscription applied only to strangers and not to the readers
--      who already asked.
--   3. Revokes the anon INSERT grant, which no code has ever used and which
--      after (2) could only produce a stranded row.
--
-- It prints counts as it goes (RAISE NOTICE). Those counts are the receipt:
-- capture the psql output when applying this, because the pending population
-- cannot be recovered afterwards — the whole point of the migration is that it
-- stops existing.
--
-- IDEMPOTENT. Every step is guarded, so a second application is a no-op that
-- reports zeroes rather than an error.

-- --------------------------------------------------------------------------
-- 1. The consent record.
-- --------------------------------------------------------------------------
--
-- WHAT IS RECORDED AND WHAT DELIBERATELY IS NOT. `consent_at` is when the
-- address was submitted; `consent_source` is which door it came through. There
-- is no IP column and no user-agent column, and their absence is a decision
-- rather than an oversight: the journal publishes "no tracking" on every email
-- and hashes even its own rate-limit keys (see rate_limit_events below), so
-- retaining an identifying network address as consent evidence would buy
-- stronger proof by breaking a louder promise. What is kept is what the reader
-- did — an address, a moment, a door.

alter table public.subscribers
  add column if not exists consent_at timestamptz,
  add column if not exists consent_source text;

-- A vocabulary check would couple this table to a code constant, and a
-- mismatch would surface as a 500 on a public signup path. Shape only: a
-- source must be present and short enough to read in a table view.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.subscribers'::regclass
       and conname = 'subscribers_consent_source_shape'
  ) then
    alter table public.subscribers
      add constraint subscribers_consent_source_shape
      check (char_length(consent_source) between 1 and 64);
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 2. Backfill: every existing row gets a consent record.
-- --------------------------------------------------------------------------
--
-- The timestamp we have for an existing subscriber is `created_at` — the
-- moment they submitted the address. That is the consent moment under the new
-- flow and it was the consent moment under the old one too; the confirmation
-- click was evidence of it, not the thing itself. So `consent_at` is
-- `created_at` for everyone, and no row is given a moment it did not have.

do $$
declare
  n_legacy integer;
begin
  update public.subscribers
     set consent_at = created_at,
         consent_source = case
           when status = 'confirmed' then 'legacy-double-opt-in'
           when status = 'unsubscribed' then 'legacy-unsubscribed'
           else 'legacy-pending'
         end
   where consent_at is null;
  get diagnostics n_legacy = row_count;
  raise notice 'consent record written for % existing subscriber row(s)', n_legacy;
end $$;

-- --------------------------------------------------------------------------
-- 3. The stranded: pending → confirmed.
-- --------------------------------------------------------------------------
--
-- `confirmed_at` is set to now() rather than to created_at, and the difference
-- matters for the record: these addresses consented on their signup date
-- (`consent_at`, preserved above) and joined the list today, by the editors'
-- decision. Backdating `confirmed_at` would claim they completed a step they
-- never completed.
--
-- `consent_source` names the decision, so a year from now the table itself
-- explains why these rows look different from every other confirmed row.

do $$
declare
  n_pending integer;
begin
  update public.subscribers
     set status = 'confirmed',
         confirmed_at = now(),
         consent_source = 'signup-form-pre-2026-08-22'
   where status = 'pending';
  get diagnostics n_pending = row_count;
  raise notice 'stranded pending signups subscribed: %', n_pending;
end $$;

-- Now that every row has one, the record is mandatory. A subscriber without a
-- consent record is the thing this table must not be able to hold.
alter table public.subscribers
  alter column consent_at set not null,
  alter column consent_at set default now(),
  alter column consent_source set not null;

-- --------------------------------------------------------------------------
-- 4. Close the anon insert door.
-- --------------------------------------------------------------------------
--
-- The original migration granted anon INSERT(email) so a browser could create
-- a pending row directly. No code ever did — the form posts to
-- /api/subscribe, which uses the service key — and after this migration such a
-- row would be born `pending` (the column default), which nothing confirms and
-- nothing mails: stranded by construction, and invisible, since anon cannot
-- read. It also could not satisfy `consent_source not null`, so it would fail
-- anyway; revoking says so at the door instead of at the constraint.
--
-- The column default stays `pending`. It is now unreachable in practice, and
-- that is the safe direction for a default to fail: a row created by some
-- future path that forgets to say what it means receives nothing, rather than
-- being silently added to a mailing list.

drop policy if exists subscribers_public_insert on public.subscribers;
revoke insert on table public.subscribers from anon;

do $$
declare
  n_pending_left integer;
  n_confirmed integer;
begin
  select count(*) into n_pending_left from public.subscribers where status = 'pending';
  select count(*) into n_confirmed from public.subscribers where status = 'confirmed';
  raise notice 'after migration — confirmed: %, pending: % (must be 0)', n_confirmed, n_pending_left;
  if n_pending_left <> 0 then
    raise exception 'pending rows survived the migration: %', n_pending_left;
  end if;
end $$;
