-- The Latent Review — EMAIL SUBMISSIONS INTO THE DESK
--
-- Approved by both editors 2026-08-10, against docs/SCRATCH-EMAIL-INTAKE-FINDINGS.md
-- (the mechanism) and docs/EMAIL-SUBMISSION-FORMAT.md (the format). An email sent to
-- the intake address becomes a row here with its fields parsed, visible on /admin like
-- any other submission. The editors' inbox stops being a parallel records system.
--
-- WHAT THIS MIGRATION IS FOR, IN ONE LINE. Three of the journal's five published pieces
-- have no submission record in the repository and one exists only as an email; the
-- pronouns field ran into that gap on 2026-08-09 and it is docketed in docs/BACKLOG.md.
-- This is the machinery that stops the gap widening.
--
-- NOTHING PARSED IS TRUSTED, AND NOTHING UNPARSED IS LOST. Every column added here is
-- either the submitter's own claim or the parser's own account of what it managed —
-- never the journal's observation, and never a verification. The distinction is R-034's
-- claimed-versus-observed line, and it is why `parse_warning` records that a parse was
-- imperfect rather than recording a judgment about the piece.
--
-- ANON GETS NOTHING HERE. Unlike the courier columns of 20260801160000, which anon must
-- be able to write because the public form carries them, every column below is written
-- by the inbound webhook as service_role. The public doors do not produce these values
-- and must not be able to claim them: `arrival` in particular says how a piece reached
-- the journal, which is the journal's own observation about its own doors. A submitter
-- who could write it could claim to have arrived by a route they did not take.

-- ---------------------------------------------------------------------------
-- 1. The columns
-- ---------------------------------------------------------------------------

-- HOW THE PIECE REACHED THE JOURNAL. Add-only vocabulary, mirroring the arrival values
-- already in src/lib/site.ts: a published piece names the value it arrived under
-- forever, so a value is retired from placement and never from the vocabulary. No CHECK
-- constraint enumerating the values, for the same reason 20260730120000 declined one on
-- reached_by_version: an enumerating CHECK turns adding a value into a migration, and a
-- migration into a reason not to record something truthfully.
alter table public.submissions
  add column if not exists arrival text
    check (arrival is null or char_length(arrival) <= 100);

-- THE MESSAGE AS IT ARRIVED. The parser's input, kept whole, so that every judgment the
-- parser made can be checked against what it was given — including the covering note it
-- deliberately did not parse. 256 KB matches MAX_REQUEST_BYTES at the agent door; beyond
-- it the webhook truncates and flags rather than refusing, because a long email is a
-- long email and not an attack.
alter table public.submissions
  add column if not exists raw_email text
    check (raw_email is null or char_length(raw_email) <= 262144);

-- WHAT THE PARSE COULD NOT ESTABLISH. A list of stable codes — missing:title,
-- no-labels-found, date-unparsed, truncated:raw — not prose, so the desk can render them
-- and a later pass can count them. NULL means a clean parse; it never means "not
-- checked", because every inbound row goes through the parser exactly once.
alter table public.submissions
  add column if not exists parse_warning text
    check (parse_warning is null or char_length(parse_warning) <= 2000);

-- THAT AN ATTACHMENT EXISTED, AND ITS NAME. Attachments are never fetched, never stored
-- and never opened — the webhook records their filenames from the event metadata and
-- calls no attachment API at all. This column is the whole of the journal's relationship
-- with attachments, and it exists so that "the piece was in a PDF" is a thing the desk
-- can see rather than a thing the editors discover by wondering why a row is empty.
alter table public.submissions
  add column if not exists attachment_note text
    check (attachment_note is null or char_length(attachment_note) <= 2000);

-- WHEN THE MESSAGE REACHED US, AND WHEN THE PIECE WAS SENT. Two dates, because a
-- forwarded backfill has both and conflating them would backdate the desk or postdate
-- the piece. `arrived_at` is machine truth: when our webhook fired. `received_date` is
-- the journal's record of when the piece was received, taken from the forwarded framing
-- where it can be read and from the editor's attestation where it cannot.
alter table public.submissions
  add column if not exists arrived_at timestamptz;

alter table public.submissions
  add column if not exists received_date date;

-- HOW `received_date` WAS ESTABLISHED, WHICH IS AS IMPORTANT AS THE DATE.
-- 'parsed'   — read out of a forwarded header by heuristic. Provisional.
-- 'attested' — supplied by an editor from her own knowledge. Vouched for.
-- 'forward'  — no original date found; this is the forward's own date, standing in.
-- The desk renders the three differently (superscript marker and qualifier), because a
-- date a machine guessed and a date an editor vouched for are different kinds of fact
-- and a surface that showed them alike would invite an editor to attest what she had
-- not checked.
alter table public.submissions
  add column if not exists received_date_source text
    check (received_date_source is null
           or received_date_source in ('parsed', 'attested', 'forward'));

comment on column public.submissions.arrival is
  'How the piece reached the journal. Add-only vocabulary; see src/lib/site.ts ARRIVAL_LABELS.';
comment on column public.submissions.parse_warning is
  'Stable codes for what the email parse could not establish. NULL means a clean parse.';
comment on column public.submissions.received_date_source is
  'parsed | attested | forward — how received_date was established. Never inferred at read time.';

-- ---------------------------------------------------------------------------
-- 2. The daily cap, in the table the editors already tune
-- ---------------------------------------------------------------------------

-- 200 rows/day, global, approved 2026-08-10. It lives here rather than in code for the
-- reason global_agent_direct_monthly does: a ceiling the editors cannot move without a
-- deploy is a ceiling that gets raised in a hurry by someone editing a constant.
--
-- WHAT HAPPENS AT THE CAP IS NOT A DROP. The webhook returns 200 and writes a stub row
-- carrying the provider's message id, so the message stays retrievable from Resend and
-- the refusal is visible on the desk. A silent drop and a healthy desk look identical,
-- which is the failure this journal keeps writing rules against.
insert into public.agent_caps (key, value)
values ('global_email_daily', 200)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Probe — asserts what this migration claims, in both directions
-- ---------------------------------------------------------------------------

do $$
declare
  missing text := '';
begin
  -- Every column present.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name in ('arrival', 'raw_email', 'parse_warning', 'attachment_note',
                          'arrived_at', 'received_date', 'received_date_source')
    group by table_name having count(*) = 7
  ) then
    missing := missing || 'one or more inbound columns missing; ';
  end if;

  -- The source CHECK accepts the three values and rejects a fourth. Asserted in both
  -- directions because a CHECK that accepts everything passes a one-sided probe.
  begin
    insert into public.submissions (title, author_name, body, provenance_attestation,
                                    contact_email, truth_standard, submission_track,
                                    received_date_source)
    values ('probe', 'probe', 'probe', 'probe', 'probe@example.com', 'factual',
            'human-attested', 'guessed');
    missing := missing || 'received_date_source accepted an invalid value; ';
  exception when check_violation then
    null; -- correct
  end;

  -- The cap row exists and is the approved number.
  if not exists (select 1 from public.agent_caps
                 where key = 'global_email_daily' and value = 200) then
    missing := missing || 'global_email_daily cap missing or not 200; ';
  end if;

  -- ANON MUST NOT BE ABLE TO WRITE ANY OF THESE. The whole point of §"ANON GETS
  -- NOTHING HERE" above; asserted rather than assumed, because a grant that drifts is
  -- invisible until someone claims an arrival they did not make.
  if has_column_privilege('anon', 'public.submissions', 'arrival', 'insert') then
    missing := missing || 'anon can insert arrival; ';
  end if;
  if has_column_privilege('anon', 'public.submissions', 'parse_warning', 'insert') then
    missing := missing || 'anon can insert parse_warning; ';
  end if;
  if has_column_privilege('anon', 'public.submissions', 'received_date', 'insert') then
    missing := missing || 'anon can insert received_date; ';
  end if;

  if missing <> '' then
    raise exception 'email-inbound migration failed its own probe: %', missing;
  end if;
end $$;

-- Clean up any probe row that survived (it should not — the insert above is expected to
-- fail its CHECK — but a probe that leaves data behind is a probe that lies).
delete from public.submissions where title = 'probe' and contact_email = 'probe@example.com';
