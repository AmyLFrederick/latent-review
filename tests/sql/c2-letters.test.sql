-- Slice (c2) — letters by agent: the DB layer's assertions.
--
-- Run with scripts/sql-dry-run.sh (see that file for the how). Every test
-- runs in its own transaction and rolls back, so no test can see another's
-- rows and the file can be re-run against the same database.
--
-- WHAT THIS FILE COVERS: everything the migration is responsible for —
-- the reopened `type` allowlist, target shape, the two per-identity budgets
-- and their independence, the shared global window, auth neutrality, the
-- cutover equivalence of the type-filtered count, the public door's
-- unchanged reach, and the DB CHECKs as backstops against a caller that
-- bypasses the RPC.
--
-- WHAT IT DOES NOT COVER, by design: word bounds (100–300 for letters,
-- 500–5,000 for submissions) live at the endpoint, as do the deterministic
-- screen, target EXISTENCE, and the two-month freshness window — the
-- published archive and the section roster are repo artifacts bundled with
-- the function, not database tables (C2-2 / C2-3). Those are the Node
-- suite's, and a passing run here says nothing about them.
--
-- Fixture note: the hashes below are padded to satisfy the 16–200 character
-- CHECKs on registered_ip_hash and key_hash. They stand in for real salted
-- digests — the RPC only ever compares strings, and the salts never enter
-- Postgres (B-5).

\set ON_ERROR_STOP on

-- Fixtures: two identities with active keys. Deleted first so the file is
-- re-runnable against a database an earlier run already touched.
begin;
delete from public.submissions
 where agent_identity_id in ('11111111-1111-1111-1111-111111111111',
                             '22222222-2222-2222-2222-222222222222');
delete from public.agent_api_keys
 where identity_id in ('11111111-1111-1111-1111-111111111111',
                       '22222222-2222-2222-2222-222222222222');
delete from public.agent_identities
 where id in ('11111111-1111-1111-1111-111111111111',
              '22222222-2222-2222-2222-222222222222');

insert into public.agent_identities (id, registered_ip_hash)
values ('11111111-1111-1111-1111-111111111111', 'iphash-aaaaaaaaaaaaaaaaaaaa'),
       ('22222222-2222-2222-2222-222222222222', 'iphash-bbbbbbbbbbbbbbbbbbbb');
insert into public.agent_api_keys (identity_id, key_hash)
values ('11111111-1111-1111-1111-111111111111', 'keyhash-aaaaaaaaaaaaaaaaaaaa'),
       ('22222222-2222-2222-2222-222222222222', 'keyhash-bbbbbbbbbbbbbbbbbbbb');
commit;

-- One submission through the RPC, named-parameter style exactly as the
-- endpoint calls it.
create or replace function pg_temp.sub(
  p_key text, p_type text, p_tt text default null, p_tid text default null
) returns uuid language sql as $$
  select public.submit_agent_direct(
    p_key_hash := p_key,
    p_title := 'T',
    p_author_name := 'A',
    p_author_model_version := 'M',
    p_truth_standard := 'opinion',
    p_provenance_attestation := 'attested',
    p_body := 'body text',
    p_contact_email := 'a@b.co',
    p_type := p_type,
    p_letter_target_type := p_tt,
    p_letter_target_id := p_tid
  );
$$;

-- The SQLSTATE of a failing call, or 'OK00' if it succeeded.
create or replace function pg_temp.code(
  p_key text, p_type text, p_tt text default null, p_tid text default null
) returns text language plpgsql as $$
declare v uuid;
begin
  v := pg_temp.sub(p_key, p_type, p_tt, p_tid);
  return 'OK00';
exception when others then
  return sqlstate;
end $$;

create or replace function pg_temp.want(p_got text, p_want text, p_label text)
returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL % — expected %, got %', p_label, p_want, p_got;
  end if;
  raise notice 'pass: %', p_label;
end $$;

-- T1 · A letter is accepted, for each target type that carries one.
begin;
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'piece', 'some-slug'), 'OK00', 'T1a letter/piece accepted');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter', null), 'OK00', 'T1b letter/charter accepted');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'ruling', 'R-024'), 'OK00', 'T1c letter/ruling accepted');
rollback;

-- T2 · The reopened pin (C-11): only the two ruled values pass, and the
-- near-misses that matter are refused — including R-007's internal
-- 'correspondence', which is a storage value and never an API value.
begin;
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'submission'), 'OK00', 'T2a submission still accepted');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'correspondence'), 'LR400', 'T2b R-007 internal value refused at the door');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'Letter'), 'LR400', 'T2c case variant refused');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'accepted'), 'LR400', 'T2d arbitrary value refused');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', null), 'LR400', 'T2e null type refused (no silent default in the RPC)');
rollback;

-- T3 · Target shape (R-024 §5): presence, vocabulary, Charter singleton.
begin;
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', null, null), 'LR400', 'T3a letter without target refused');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter', 'x'), 'LR400', 'T3b charter with id refused');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'piece', null), 'LR400', 'T3c piece without id refused');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'issue', 'x'), 'LR400', 'T3d unknown target type refused');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'submission', 'piece', 'x'), 'LR400', 'T3e targets on a submission refused');
rollback;

-- T4 · Letter budget: three accepted, fourth refused (R-024 §1).
begin;
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'OK00', 'T4a letter 1');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'OK00', 'T4b letter 2');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'OK00', 'T4c letter 3');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'LR429', 'T4d letter 4 refused');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'submission'), 'OK00', 'T4e pieces unaffected by a full letter budget');
rollback;

-- T5 · Piece ceiling: six accepted, seventh refused (R-021 N5); letters
-- unaffected. The two budgets are independent in BOTH directions.
begin;
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'OK00', 'T5a piece 1');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'OK00', 'T5b piece 2');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'OK00', 'T5c piece 3');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'OK00', 'T5d piece 4');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'OK00', 'T5e piece 5');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'OK00', 'T5f piece 6');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'LR429', 'T5g piece 7 refused');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'letter', 'charter'), 'OK00', 'T5h letters unaffected by a full piece ceiling');
rollback;

-- T6 · Budgets are per identity, not per type globally.
begin;
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'OK00', 'T6a a letter 1');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'OK00', 'T6b a letter 2');
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'OK00', 'T6c a letter 3');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'letter', 'charter'), 'OK00', 'T6d b unaffected by a''s full budget');
rollback;

-- T7 · Letters SHARE the global monthly window (R-024 §2 / C-13): they
-- cannot expand total review volume. The dial is lowered inside the
-- transaction and rolled back with it.
begin;
update public.agent_caps set value = 2 where key = 'global_agent_direct_monthly';
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'OK00', 'T7a letter fills global slot 1');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'OK00', 'T7b submission fills global slot 2');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'letter', 'charter'), 'LR429', 'T7c global window full — letters counted');
select pg_temp.want(pg_temp.code('keyhash-bbbbbbbbbbbbbbbbbbbb', 'submission'), 'LR429', 'T7d global window full — submissions too');
rollback;

-- T8 · Auth neutrality is unchanged (R-008). Note T8c: validation precedes
-- auth in the RPC, so a malformed payload with a bad key refuses as
-- validation — the same order the endpoint already uses for every other
-- field, and therefore not a new oracle.
begin;
update public.agent_api_keys set status = 'revoked' where key_hash = 'keyhash-aaaaaaaaaaaaaaaaaaaa';
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'LR401', 'T8a revoked key refused');
select pg_temp.want(pg_temp.code('nosuchkey-xxxxxxxxxxxxxxxx', 'submission'), 'LR401', 'T8b unknown key refused');
select pg_temp.want(pg_temp.code('nosuchkey-xxxxxxxxxxxxxxxx', 'bogus'), 'LR400', 'T8c validation precedes auth (no key oracle either way)');
rollback;

begin;
update public.agent_identities set status = 'banned' where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.want(pg_temp.code('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter'), 'LR401', 'T8d banned identity refused');
rollback;

-- T9 · Cutover equivalence (C2-5): on letters-free data the type-filtered
-- count equals the unfiltered one, so nothing about the six-piece ceiling
-- changed the day this shipped — and once a letter exists they diverge,
-- which proves the filter is load-bearing rather than decorative.
begin;
select pg_temp.want(
  (select case when public.agent_submission_count('agent-direct', '11111111-1111-1111-1111-111111111111', date_trunc('month', now()), 'submission')
             = public.agent_submission_count('agent-direct', '11111111-1111-1111-1111-111111111111', date_trunc('month', now()), null)
          then 'EQ' else 'NE' end),
  'EQ', 'T9a filtered = unfiltered on letters-free data');
select pg_temp.sub('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'charter');
select pg_temp.want(
  (select case when public.agent_submission_count('agent-direct', '11111111-1111-1111-1111-111111111111', date_trunc('month', now()), 'submission')
             = public.agent_submission_count('agent-direct', '11111111-1111-1111-1111-111111111111', date_trunc('month', now()), null)
          then 'EQ' else 'NE' end),
  'NE', 'T9b once a letter exists the counts diverge (the filter is load-bearing)');
rollback;

-- T10 · The public door gained nothing from widening the type CHECK. anon
-- holds a column INSERT grant on `type`, so the policy must hold it to the
-- two values it could already write — and the ordinary human-attested path
-- must still work.
begin;
set local role anon;
do $$
begin
  insert into public.submissions (type, title, author_name, truth_standard,
    provenance_attestation, body, contact_email, submission_track)
  values ('letter', 'T', 'A', 'opinion', 'att', 'b', 'a@b.co', 'human-attested');
  raise exception 'FAIL T10a — anon inserted a letter';
exception
  when insufficient_privilege or check_violation then
    raise notice 'pass: T10a anon cannot insert type=letter';
end $$;
reset role;
rollback;

begin;
set local role anon;
do $$
begin
  insert into public.submissions (type, title, author_name, truth_standard,
    provenance_attestation, body, contact_email, submission_track, letter_target_type)
  values ('submission', 'T', 'A', 'opinion', 'att', 'b', 'a@b.co', 'human-attested', 'charter');
  raise exception 'FAIL T10b — anon wrote a target column';
exception
  when insufficient_privilege or check_violation then
    raise notice 'pass: T10b anon cannot write target columns';
end $$;
reset role;
rollback;

begin;
set local role anon;
do $$
begin
  insert into public.submissions (type, title, author_name, truth_standard,
    provenance_attestation, body, contact_email, submission_track, involvement_tier)
  values ('submission', 'T', 'A', 'opinion', 'att', 'b', 'a@b.co', 'human-attested', 'human');
  raise notice 'pass: T10c anon can still file a human-attested submission (no regression)';
exception when others then
  raise exception 'FAIL T10c — anon submission path broke: % %', sqlstate, sqlerrm;
end $$;
reset role;
rollback;

-- T11 · The CHECKs are real backstops: a caller that bypasses the RPC
-- entirely still cannot store an untargeted letter, a targeted submission,
-- or a Charter letter carrying an identifier.
begin;
do $$
begin
  insert into public.submissions (type, title, author_name, truth_standard,
    provenance_attestation, body, contact_email, submission_track, agent_identity_id)
  values ('letter', 'T', 'A', 'opinion', 'att', 'b', 'a@b.co', 'agent-direct',
          '11111111-1111-1111-1111-111111111111');
  raise exception 'FAIL T11a — untargeted letter stored';
exception when check_violation then raise notice 'pass: T11a CHECK blocks untargeted letter';
end $$;
do $$
begin
  insert into public.submissions (type, title, author_name, truth_standard,
    provenance_attestation, body, contact_email, submission_track, agent_identity_id,
    letter_target_type, letter_target_id)
  values ('submission', 'T', 'A', 'opinion', 'att', 'b', 'a@b.co', 'agent-direct',
          '11111111-1111-1111-1111-111111111111', 'piece', 'x');
  raise exception 'FAIL T11b — targeted submission stored';
exception when check_violation then raise notice 'pass: T11b CHECK blocks targeted submission';
end $$;
do $$
begin
  insert into public.submissions (type, title, author_name, truth_standard,
    provenance_attestation, body, contact_email, submission_track, agent_identity_id,
    letter_target_type, letter_target_id)
  values ('letter', 'T', 'A', 'opinion', 'att', 'b', 'a@b.co', 'agent-direct',
          '11111111-1111-1111-1111-111111111111', 'charter', 'x');
  raise exception 'FAIL T11c — charter letter with id stored';
exception when check_violation then raise notice 'pass: T11c CHECK blocks charter+id';
end $$;
rollback;

-- T12 · A stored letter is exactly what was sent, and the receipt is a
-- bare id (nothing evaluative).
begin;
select pg_temp.sub('keyhash-aaaaaaaaaaaaaaaaaaaa', 'letter', 'section', 'ai-voices') as receipt \gset
select pg_temp.want(
  (select type || '|' || letter_target_type || '|' || letter_target_id || '|' || submission_track || '|' || status
   from public.submissions where id = :'receipt'),
  'letter|section|ai-voices|agent-direct|new', 'T12 letter row stored verbatim');
rollback;

\echo '=== all c2 SQL assertions passed ==='
