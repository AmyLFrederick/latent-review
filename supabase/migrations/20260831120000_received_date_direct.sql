-- The Latent Review — `direct` JOINS THE DATE-SOURCE VOCABULARY
--
-- Raised 2026-08-31 by the custody-field bug report on the two Monthly Question
-- submissions of 2026-08-27, and written against
-- docs/SCRATCH-CUSTODY-DOOR-STAMPING-2026-08-31.md.
--
-- WHAT WAS WRONG. 20260810120000 gave `received_date_source` three values —
-- 'parsed', 'attested', 'forward' — and the vocabulary had no word for the
-- commonest case and the only machine-certain one: our own webhook watched this
-- message arrive on this day. So the door's code initialised the variable to
-- 'forward' and only ever upgraded it, which meant every message that was not a
-- recognised forward was recorded as a forward whose original date could not be
-- found. On the desk that renders "forward date — original not found" in the
-- unresolved styling, which exists to make an editor act on a row that needs her.
-- Pointing it at rows where nothing is wrong is how a warning stops working, and
-- it had been pointed at every clean arrival since the door opened.
--
-- WHAT `direct` MEANS, AND WHY IT IS NOT `attested`. The journal observed this
-- itself: the webhook fired, and the day it fired is the day the message reached
-- us. That is the same kind of fact as `arrived_at` and it needs no editor behind
-- it — which is precisely why it must not be called 'attested', a value that says
-- a human vouched from her own knowledge. Four values, four kinds of knowledge:
--
--   parsed   — read out of a forwarded header by heuristic. Provisional.
--   attested — supplied by an editor from her own knowledge. Vouched for.
--   forward  — a forward whose original date could not be read. Needs a human.
--   direct   — the journal's own observation of the day the message arrived.
--
-- The desk renders `direct` with a superscript ᵒ and no alarm, and `forward`
-- keeps the loud unfinished styling it was built with — now on the rows that
-- actually have something unresolved about them.
--
-- ADD-ONLY, LIKE EVERY VOCABULARY IN THIS SCHEMA. No existing value is removed
-- and no existing row is touched by this migration. Rows already carrying a
-- wrongly-initialised 'forward' are corrected by a separate, reviewed script
-- (docs/sql/2026-08-31-custody-door-correction.sql) that names the rows it
-- changes — a data correction is an editorial act with a receipt, never a side
-- effect of a schema change.
--
-- NOTHING HERE TOUCHES `arrival`. That column never had an enumerating CHECK, by
-- deliberate choice in 20260810120000, so the `form` value added in
-- src/lib/notice.mjs on the same day needs no migration to be storable. What it
-- needed was a code path willing to write it, and that is the other half of this
-- change.

alter table public.submissions
  drop constraint if exists submissions_received_date_source_check;

alter table public.submissions
  add constraint submissions_received_date_source_check
  check (received_date_source is null
         or received_date_source in ('parsed', 'attested', 'forward', 'direct'));

comment on column public.submissions.received_date_source is
  'parsed | attested | forward | direct — how received_date was established. '
  'Never inferred at read time. `direct` is the journal''s own observation of the '
  'day the message arrived; `forward` means a forward whose original date could '
  'not be read, and only that.';

-- Probe. Substituting the column name into the constraint expression is safe
-- here because no value in the vocabulary contains the string
-- `received_date_source`; a future value that did would corrupt the substitution
-- rather than fail it, so add one and this probe needs rewriting.
--
-- Asserts the constraint exists, admits all four values, and — the part
-- worth asserting rather than assuming — still refuses anything else, because an
-- enumerating CHECK that has quietly stopped enumerating is indistinguishable
-- from a working one until a bad value is already stored. The vocabulary is
-- tested against the constraint expression itself, so no row is written and no
-- other column's rules can make the test lie. Raises inside the transaction so a
-- partial apply rolls back (the C-7 discipline).
do $$
declare
  con_def text;
  value text;
  admitted boolean;
begin
  select pg_get_constraintdef(con.oid) into con_def
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public' and rel.relname = 'submissions'
    and con.conname = 'submissions_received_date_source_check';

  if con_def is null then
    raise exception 'the received_date_source CHECK is missing after the migration that rewrote it';
  end if;

  foreach value in array array['parsed', 'attested', 'forward', 'direct'] loop
    execute format(
      'select (%s)',
      replace(replace(con_def, 'CHECK ', ''), 'received_date_source', quote_literal(value))
    ) into admitted;
    if not coalesce(admitted, false) then
      raise exception 'the CHECK refuses %, which is one of the four values: %', value, con_def;
    end if;
  end loop;

  execute format(
    'select (%s)',
    replace(replace(con_def, 'CHECK ', ''), 'received_date_source', quote_literal('not-a-real-source'))
  ) into admitted;
  if coalesce(admitted, false) then
    raise exception 'the CHECK admits an unknown source — the vocabulary is not closed: %', con_def;
  end if;
end $$;
