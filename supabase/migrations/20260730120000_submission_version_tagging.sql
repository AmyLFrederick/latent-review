-- The Latent Review — PER-ARRIVAL VERSION TAGGING
--
-- Ruled 2026-07-29 by both editors: the repository is the versioning surface
-- from that date, and arrivals are tagged with which invitation or announcement
-- version reached the author, in the same discipline as the version ledger in
-- docs/outreach-log.md (Entry 4).
--
-- What this migration does:
--   * Adds ONE nullable column, submissions.reached_by_version, holding the
--     version of the text that brought the author to the door.
--   * Grants the human editor (authenticated) column-restricted UPDATE on it,
--     so the desk can tag and re-tag an arrival.
--   * Grants anon NOTHING, and the probe asserts the ABSENCE of that privilege
--     rather than only the presence of what should exist.
--
-- WHY THIS IS ITS OWN MIGRATION AND NOT PART OF THE FICTION CHANGE.
-- The fiction work amends the Charter, the editorial criteria and the
-- truth_standard CHECK; it merges as a constitutional change under dual review.
-- This is additive plumbing with no editorial content, and coupling them would
-- gate a nullable column behind a constitutional review. It is also needed
-- FIRST: the 2026-07-29 ruling has the human editor running the two pending v3
-- cells with results "logged with version tags" BEFORE invitation v4 activates,
-- and v4's activation is itself gated on the fiction ruling merging. Tagging is
-- upstream of fiction in the dependency order, not alongside it.
--
-- WHY ONE COLUMN AND NOT TWO. An arrival is reached by exactly one text — the
-- one that actually brought it. Separate invitation_version and
-- announcement_version columns invite rows with both set or neither, and then
-- the distribution the editors read has to guess which was decisive. One
-- column with namespaced values ('invitation-v3', 'announcement-v1') cannot
-- express that ambiguity.
--
-- WHY NO ENUM CHECK ON THE VALUE. A CHECK listing known versions would require
-- a migration for every new invitation or announcement — reintroducing exactly
-- the coupling this file exists to avoid. The column is free text with a length
-- bound. The outreach log is the authority on which version strings are real,
-- and it is a text file the editors control directly.
--
-- WHY ANON CANNOT SET IT — THE POINT OF THE WHOLE THING.
-- submissions uses a column-restricted anon INSERT (20260717120000): anon may
-- write exactly the intake columns and nothing else. This column is
-- deliberately not among them. If a submitter could declare which invitation
-- reached them, the tag becomes self-reported and forgeable, and the
-- distribution the editors read — how many answered the Weekly Question, how
-- many wrote free-choice pieces, how many declined — becomes a figure an author
-- can influence. The measurement has to be the journal's observation, not the
-- author's claim.
--
-- The agent door needs no grant to populate this: submit_agent_direct is
-- SECURITY DEFINER (20260726180000) and writes as owner. It is NOT given a
-- p_reached_by_version parameter here, deliberately — a value arriving through
-- the door is supplied by the caller, which is the author, which is the
-- forgeable case above. Agent-direct arrivals are tagged at the desk from the
-- outreach log, exactly like human-door arrivals. If a later slice ever wants
-- the author's own account of how they heard, that belongs in a SEPARATE
-- advisory field that is never confused with this one.
--
-- THIS IS NOT A PROVENANCE LABEL. It is measurement metadata about how outreach
-- performed. It is absent from src/content.config.ts, from /agent-api.json and
-- from every machine-readable surface, and it must stay absent. Provenance
-- labels are set at acceptance and are immutable (CLAUDE.md); this field is an
-- editorial note the desk may correct freely. Conflating the two would place a
-- mutable field inside an immutable record.

alter table public.submissions
  add column if not exists reached_by_version text
    check (reached_by_version is null
           or char_length(reached_by_version) between 1 and 100);

comment on column public.submissions.reached_by_version is
  'Which invitation or announcement version reached this author, namespaced '
  '(e.g. invitation-v3, announcement-v1). Set by the editors at the desk, never '
  'by the submitter. Measurement metadata, NOT a provenance label: never '
  'published and never part of the machine-readable contract. The authority on '
  'valid values is the version ledger in docs/outreach-log.md.';

-- The desk may tag and re-tag. This ADDS one column to the existing
-- column-restricted UPDATE grant; it does not replace it, so the decision
-- fields keep exactly the privileges they already had.
grant update (reached_by_version) on table public.submissions to authenticated;

-- Probe. Asserts what must exist AND what must not, and raises inside the
-- transaction so a partial apply rolls back rather than leaving the intake
-- surface in an unverified state (the C-7 discipline).
do $$
declare
  problems text[] := '{}';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name = 'reached_by_version'
  ) then
    problems := problems || 'reached_by_version column missing'::text;
  end if;

  if not has_column_privilege('authenticated', 'public.submissions',
                              'reached_by_version', 'update') then
    problems := problems || 'authenticated cannot UPDATE reached_by_version'::text;
  end if;

  -- The negative assertions. These are the reason this file exists.
  if has_column_privilege('anon', 'public.submissions',
                          'reached_by_version', 'insert') then
    problems := problems || 'anon CAN insert reached_by_version — self-reported tagging is forgeable'::text;
  end if;

  if has_column_privilege('anon', 'public.submissions',
                          'reached_by_version', 'update') then
    problems := problems || 'anon CAN update reached_by_version'::text;
  end if;

  -- Regression guard: the intake privileges anon legitimately holds must be
  -- untouched by this migration. If the widening cost anon something it had,
  -- that is a break in the public door and belongs in the same failure.
  if not has_column_privilege('anon', 'public.submissions', 'truth_standard', 'insert') then
    problems := problems || 'REGRESSION: anon lost insert on truth_standard'::text;
  end if;
  if not has_column_privilege('anon', 'public.submissions', 'body', 'insert') then
    problems := problems || 'REGRESSION: anon lost insert on body'::text;
  end if;

  if array_length(problems, 1) is not null then
    raise exception 'version-tagging migration failed its own probe: %',
      array_to_string(problems, '; ');
  end if;
end $$;
