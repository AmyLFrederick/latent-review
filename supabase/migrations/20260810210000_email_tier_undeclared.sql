-- The Latent Review — AN UNDECLARED INVOLVEMENT TIER IS UNSET, NOT REQUIRED
--
-- Fixes the fault that made every email submission return 500 on 2026-08-10.
-- Approved by both editors 2026-08-10 against
-- docs/SCRATCH-EMAIL-INBOUND-500-2026-08-10.md.
--
-- WHAT BROKE. `involvement_tier_matches_track` has been in force since
-- 20260717120000 and was correct for every door that existed then: a
-- human-attested row must carry a tier, an agent-direct row must omit one.
-- /submit's tier select is `required`; agent-submit writes the other track. So
-- nothing ever exercised the third case — a human-attested row whose submitter
-- is not present to be asked. The email door is that third case, and its tier is
-- absent by design.
--
-- THIS IS 20260810120000 §1b's RULING AGAIN, NOT A NEW ONE. That migration made
-- `truth_standard` nullable for exactly this reason and missed the tier, because
-- the tier's requirement does not live in a column NOT NULL where one would look
-- for it — it lives in a table-level constraint.
--
-- WHAT THIS GIVES UP, STATED PLAINLY, as §1b states its own cost. The database
-- no longer guarantees that a human-attested submission carries a tier. The
-- guarantee moves where §1b moved truth_standard's: the ARTICLE schema still
-- requires a tier (src/content.config.ts), so nothing can be published without
-- one, and /submit still requires it at the door. NULL is reachable only from
-- the email door and only where the author was silent.
--
-- THE AGENT-DIRECT HALF IS UNCHANGED, deliberately. That half stops a track from
-- claiming a provenance it has no standing to claim, and nothing about an absent
-- submitter bears on it. §3 asserts it survived.

-- ---------------------------------------------------------------------------
-- 1. The constraint
-- ---------------------------------------------------------------------------

alter table public.submissions
  drop constraint involvement_tier_matches_track;

alter table public.submissions
  add constraint involvement_tier_matches_track check (
    submission_track = 'human-attested'
    or (submission_track = 'agent-direct' and involvement_tier is null)
  );

comment on column public.submissions.involvement_tier is
  'The author''s declared involvement tier, as a lowercase machine code. NULL means undeclared — the desk never assigns one; an editor sets it before publication.';

-- ---------------------------------------------------------------------------
-- 2. Convergence — because 20260810120000 cannot have applied whole
-- ---------------------------------------------------------------------------
--
-- 20260810120000 APPLIED CLEANLY on 2026-08-09 at ~8:55 PM Madison, and its
-- seven columns were confirmed in production by direct query at ~10 PM. See
-- docs/ops/2026-08-09-email-inbound-prod-migration.md. Since it is transactional
-- and its probe raises inside the transaction, a completed apply means the whole
-- file ran — including `truth_standard drop not null` and the cap insert.
--
-- SO WHY RESTATE THEM. Because neither was *queried*, and the two statements
-- below cost nothing: `drop not null` on an already-nullable column and an
-- `on conflict do nothing` insert are both no-ops against the state we expect.
-- What they buy is that §3's probe then asserts them in production rather than
-- inferring them from an apply that succeeded. An inference and an assertion are
-- different kinds of fact, and this file is cheap enough to prefer the second.
--
-- Nothing here is new policy; both statements are 20260810120000's own.
--
-- The alternative — carrying the constraint fix in 20260810120000 itself — was
-- rejected. That file has been applied to the production database, and a
-- migration that has touched production is not a draft any more.

alter table public.submissions
  alter column truth_standard drop not null;

insert into public.agent_caps (key, value)
values ('global_email_daily', 200)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Probe — asserts what this migration claims, in both directions
-- ---------------------------------------------------------------------------

do $$
declare
  missing text := '';
  kept    text;
begin
  -- The columns 20260810120000 promised. Asserted here rather than assumed,
  -- because §2 exists precisely because that file's application is uncertain.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name in ('arrival', 'raw_email', 'parse_warning', 'attachment_note',
                          'arrived_at', 'received_date', 'received_date_source')
    group by table_name having count(*) = 7
  ) then
    missing := missing || 'one or more inbound columns missing; ';
  end if;

  -- THE FIX ITSELF: a human-attested row may now omit both the tier and the
  -- truth standard. This is the exact insert that aborted 20260810120000, kept
  -- verbatim so that what failed there is what is asserted here.
  --
  -- EVERY FAILURE MODE IS NAMED. `when others` would let this probe report
  -- success for a reason nobody chose, which is the trap PR #152 was already
  -- fixing one instance of.
  begin
    insert into public.submissions (title, author_name, body, provenance_attestation,
                                    contact_email, submission_track)
    values ('probe-null-tier', 'probe', 'probe', 'probe', 'probe@example.com',
            'human-attested');
  exception
    when check_violation then
      missing := missing || 'human-attested still requires an involvement_tier; ';
    when not_null_violation then
      missing := missing || 'truth_standard is still NOT NULL; ';
  end;

  -- THE HALF WE KEPT, asserted from the constraint's own definition rather than
  -- by inserting a row. An agent-direct row also needs an agent_identity_id
  -- (20260724120000), so a probe row built to test the tier clause would be
  -- refused by the identity clause first and report success having tested
  -- nothing. Reading the definition tests this clause and only this clause.
  select pg_get_constraintdef(oid) into kept
  from pg_constraint
  where conrelid = 'public.submissions'::regclass
    and conname = 'involvement_tier_matches_track';

  if kept is null then
    missing := missing || 'involvement_tier_matches_track is gone entirely; ';
  elsif kept not like '%agent-direct%involvement_tier IS NULL%' then
    missing := missing || 'agent-direct may now carry an involvement_tier; ';
  end if;

  -- The cap row 20260810120000 §2 intended, whether or not it got there.
  if not exists (select 1 from public.agent_caps
                 where key = 'global_email_daily' and value = 200) then
    missing := missing || 'global_email_daily cap missing or not 200; ';
  end if;

  if missing <> '' then
    raise exception 'email tier migration failed its own probe: %', missing;
  end if;
end $$;

-- The probe row above is expected to SUCCEED, which is the whole point of it, so
-- unlike 20260810120000's cleanup this delete is load-bearing rather than
-- belt-and-braces. A probe that leaves data behind is a probe that lies.
delete from public.submissions
where title = 'probe-null-tier' and contact_email = 'probe@example.com';
