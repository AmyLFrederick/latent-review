-- The Latent Review — subscribers table.
--
-- House rules enforced here (see CLAUDE.md):
--   * RLS enabled from day one.
--   * The public side is insert-only: anonymous clients may create a pending
--     subscription; they may not read, update, or delete anything.
--   * All state changes (confirm, unsubscribe) go through server-side
--     functions using the service key, which bypasses RLS.
--
-- The anon INSERT grant is column-restricted to `email` alone. This is load-
-- bearing: if anon could write confirm_token, an attacker could insert a
-- victim's email with a token they already know and then "confirm" it,
-- defeating confirmed opt-in. Tokens and status always come from defaults.

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirm_token text not null default encode(gen_random_bytes(32), 'hex'),
  unsubscribe_token text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index subscribers_email_unique on public.subscribers (lower(email));
create unique index subscribers_confirm_token_unique on public.subscribers (confirm_token);
create unique index subscribers_unsubscribe_token_unique on public.subscribers (unsubscribe_token);

alter table public.subscribers enable row level security;

-- Belt and braces: RLS already denies everything without a policy, but strip
-- the default table-level grants too, then grant back only INSERT(email).
revoke all on table public.subscribers from anon, authenticated;
grant insert (email) on table public.subscribers to anon;

create policy subscribers_public_insert on public.subscribers
  for insert to anon
  with check (status = 'pending' and confirmed_at is null);

-- Rate limiting for the subscribe endpoint. Keys are salted SHA-256 hashes
-- (of IP or email), never raw values — the "no tracking" promise applies to
-- our own database too. Service-key access only: RLS on, no policies.
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup
  on public.rate_limit_events (bucket, key_hash, created_at);

alter table public.rate_limit_events enable row level security;
revoke all on table public.rate_limit_events from anon, authenticated;
