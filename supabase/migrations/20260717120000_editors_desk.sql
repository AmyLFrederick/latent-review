-- The Latent Review — the Editors' Desk: submissions storage and review
-- infrastructure (admin read, AI editorial passes, dual-yes decision fields).
--
-- House rules enforced here (see CLAUDE.md):
--   * RLS enabled from day one, on every table.
--   * The public side of submissions is insert-only: anonymous clients may
--     create a submission; they may not read, update, or delete anything.
--   * Every grant a table needs is stated in the migration — platform
--     defaults are not a contract (lesson of 20260717000000_service_role_grants.sql).
--
-- Editorial context: a decision anticipates THREE inputs, only two of which
-- vote. (1) The AI desk pass (ai_editor_passes table) is ADVISORY —
-- attributed as "AI desk review — Claude (<model>) applying the editors'
-- written criteria", explicitly distinct from the founding co-editor's
-- judgment. Same model, different role; provenance rules apply to our own
-- process (R-011's disclosure spirit): each pass records the exact model that
-- produced it and the SHA-256 of the criteria text it applied. (2)
-- coeditor_review / coeditor_decision record the founding AI co-editor's
-- judgment and vote — for borderline cases, formed via the read endpoint and
-- entered by the human editor. (3) amy_decision is the human editor's vote.
-- Final acceptance requires the dual-yes of the two founding editors only.

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  -- R-007: correspondence reuses this table with a type field.
  type text not null default 'submission'
    check (type in ('submission', 'correspondence')),
  title text not null check (char_length(title) between 1 and 300),
  author_name text not null check (char_length(author_name) between 1 and 200),
  author_model_version text check (char_length(author_model_version) <= 200),
  submission_track text not null default 'human-attested'
    check (submission_track in ('human-attested', 'agent-direct')),
  -- R-010 involvement tiers; the letters name who led.
  involvement_tier text
    check (involvement_tier in ('AI', 'AI+H', 'H+AI', 'H+AI-edited', 'H')),
  truth_standard text not null
    check (truth_standard in ('reported', 'opinion', 'first-person')),
  -- The submitter's provenance attestation, in their words, under their name.
  provenance_attestation text not null
    check (char_length(provenance_attestation) between 1 and 2000),
  -- R-006 caps articles at 5,000 words; 40,000 chars is a generous ceiling
  -- that still bounds storage. Word-count enforcement with honest error
  -- messages lives at intake (backend Part 2), not here.
  body text not null check (char_length(body) between 1 and 40000),
  contact_email text not null
    check (char_length(contact_email) <= 254 and contact_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  status text not null default 'new'
    check (status in ('new', 'under_review', 'accepted', 'declined')),
  -- Dual-yes record (see header comment). coeditor_* is the founding AI
  -- co-editor's judgment and vote as recorded by the human editor — never the
  -- advisory desk pass, which lives in ai_editor_passes.
  amy_decision text check (amy_decision in ('yes', 'no')),
  coeditor_decision text check (coeditor_decision in ('yes', 'no')),
  coeditor_review text check (char_length(coeditor_review) <= 10000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  -- Charter: human-attested requires a tier; agent-direct must omit it.
  constraint involvement_tier_matches_track check (
    (submission_track = 'human-attested' and involvement_tier is not null)
    or (submission_track = 'agent-direct' and involvement_tier is null)
  )
);

create index submissions_created_at on public.submissions (created_at desc);
create index submissions_status on public.submissions (status);

alter table public.submissions enable row level security;

-- Strip default grants, then grant back exactly what each role needs.
revoke all on table public.submissions from anon, authenticated;

-- Public door: insert only, column-restricted. Status, votes, and timestamps
-- always come from defaults — if anon could write status or votes, an
-- attacker could file pre-approved work.
grant insert (
  type, title, author_name, author_model_version, submission_track,
  involvement_tier, truth_standard, provenance_attestation, body, contact_email
) on table public.submissions to anon;

create policy submissions_public_insert on public.submissions
  for insert to anon
  with check (
    status = 'new'
    and amy_decision is null and coeditor_decision is null
    and coeditor_review is null and decided_at is null
  );

-- Admin door: the authenticated role may read and record decisions, but ONLY
-- when the JWT belongs to the human editor. Anyone else who signs in (there
-- should be no one — signups are disabled and the admin page passes
-- shouldCreateUser: false) sees zero rows. Changing the admin address
-- requires a new migration, deliberately: who can read the queue is an
-- auditable, versioned fact.
grant select on table public.submissions to authenticated;
grant update (status, amy_decision, coeditor_decision, coeditor_review, decided_at)
  on table public.submissions to authenticated;

create policy submissions_admin_select on public.submissions
  for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick@verizon.net');

create policy submissions_admin_update on public.submissions
  for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick@verizon.net')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick@verizon.net');

-- AI editorial passes — advisory desk output, one row per requested pass.
create table public.ai_editor_passes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  -- 'running' while the background function works; the admin page polls this.
  status text not null default 'running'
    check (status in ('running', 'complete', 'failed')),
  -- The model that actually produced the pass (a refusal fallback may serve
  -- a different model than requested — the record tells the truth).
  model text,
  -- SHA-256 of the exact criteria text applied, so every pass is traceable
  -- to a version of docs/EDITORIAL-CRITERIA.md in the public history.
  criteria_sha256 text,
  pass jsonb,
  error text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index ai_editor_passes_submission
  on public.ai_editor_passes (submission_id, created_at desc);

alter table public.ai_editor_passes enable row level security;
revoke all on table public.ai_editor_passes from anon, authenticated;

-- The admin reads passes; only the service key (the background function)
-- writes them. No public access of any kind.
grant select on table public.ai_editor_passes to authenticated;

create policy ai_editor_passes_admin_select on public.ai_editor_passes
  for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'amyfrederick@verizon.net');

-- Service-role grants: the audited union of what the functions do.
--   submissions        SELECT  (AI pass loads the piece; read endpoint serves it)
--                      UPDATE  (AI pass moves status new -> under_review)
--                      — no INSERT yet: intake is backend Part 2, which will
--                        add its own grant when the code path exists.
--   ai_editor_passes   SELECT, INSERT, UPDATE (create running row, finish it)
grant select, update on table public.submissions to service_role;
grant select, insert, update on table public.ai_editor_passes to service_role;

-- Fail loudly in the migration itself if the grants did not take.
do $$
begin
  if not (
    has_table_privilege('service_role', 'public.submissions', 'select')
    and has_table_privilege('service_role', 'public.submissions', 'update')
    and has_table_privilege('anon', 'public.submissions', 'insert')
    and has_table_privilege('authenticated', 'public.submissions', 'select')
    and has_table_privilege('service_role', 'public.ai_editor_passes', 'insert')
    and has_table_privilege('service_role', 'public.ai_editor_passes', 'update')
    and has_table_privilege('authenticated', 'public.ai_editor_passes', 'select')
  ) then
    raise exception 'editors-desk grants did not apply — the review desk will fail';
  end if;
end $$;
