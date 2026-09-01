-- The Latent Review — CUSTODY CORRECTION, RE-SELECT (confirmation read)
-- 2026-08-31, Madison. Run after docs/sql/2026-08-31-custody-door-correction.sql.
--
-- READ ONLY. Every statement here is a select; nothing writes, and no session has
-- touched the database. Run all three queries and paste the output back to the
-- desk. Query A is the one the two prompt pieces are gated on.
--
-- WHAT THE DESK ASKED TO SEE CONFIRMED:
--   arrival                → 'form'
--   received_date          → 2026-08-27
--   received_date_source   → 'attested'
--   courier_submission     → true, with courier_author_identity filled
--   prompt_disclosure      → filled where it had been empty
--   raw_email, parse_warning → untouched
--
-- ONE HONEST LIMIT, STATED UP FRONT. "Untouched" on raw_email cannot be proved by
-- a read taken after the fact — step 1 of the correction did not select the
-- message body, so there is no before-value to compare against. What query A can
-- show is that the column is still populated, its byte length, and a fingerprint;
-- and that the correction script contains no statement that writes it (it does
-- not — the only updates are to arrival, received_date, received_date_source,
-- prompt_disclosure and the two courier columns). parse_warning IS shown in full,
-- because step 1 did select it, so that one is a true before-and-after.

-- ---------------------------------------------------------------------------
-- QUERY A — the two rows, keyed on their corrected state.
-- ---------------------------------------------------------------------------
-- Expect EXACTLY TWO rows: GLM-5.3 and Grok 4.5. Their ids must be the two ids
-- that step 1 returned and step 2 was pointed at.

select
  id,
  title,
  author_name,
  author_model_version,
  arrival,
  received_date,
  received_date_source,
  courier_submission,
  courier_author_identity,
  prompt_disclosure is not null                       as disclosure_present,
  char_length(prompt_disclosure)                      as disclosure_chars,
  parse_warning,
  raw_email is not null                               as raw_email_present,
  octet_length(raw_email)                             as raw_email_bytes,
  left(md5(coalesce(raw_email, '')), 12)              as raw_email_fingerprint,
  arrived_at,
  status
from public.submissions
where arrival = 'form'
  and received_date = date '2026-08-27'
order by author_name;

-- ---------------------------------------------------------------------------
-- QUERY B — the guard: nothing was left behind, and nothing else was hit.
-- ---------------------------------------------------------------------------
-- This is step 1's original key. It found the two rows before the correction; it
-- must now find NONE. A row still showing here is a row the correction missed. A
-- row here that is not one of the two is a row that was never ours to move —
-- stop and say so rather than correcting it.

select
  id,
  title,
  author_name,
  arrival,
  received_date,
  received_date_source,
  arrived_at
from public.submissions
where arrival = 'email'
  and received_date between date '2026-08-25' and date '2026-08-31'
order by arrived_at;

-- Expected output: (0 rows).

-- ---------------------------------------------------------------------------
-- QUERY C — the disclosure text in full, so the desk can see whose words it is.
-- ---------------------------------------------------------------------------
-- Step 2 wrote the editor's account of the couriered question ONLY into rows
-- where prompt_disclosure was empty, and the trigger from 20260731120000 would
-- have refused any overwrite of an existing one. This prints what each row now
-- carries so that rule can be checked by eye rather than trusted.
--
-- A row whose text is the editor's begins "The prompt was the journal's Monthly
-- Question, couriered verbatim by the human editor…". Anything else is the
-- submitter's own words and stands as written.

select
  author_name,
  author_model_version,
  prompt_disclosure
from public.submissions
where arrival = 'form'
  and received_date = date '2026-08-27'
order by author_name;

-- ---------------------------------------------------------------------------
-- QUERY D — the build payload for the two prompt pieces.
-- ---------------------------------------------------------------------------
-- Not part of the confirmation. This is the read the desk approved ("bodies from
-- the corrected Supabase rows"), and it is here because you are already at the
-- console with this file open — one more query is cheaper than a second trip.
-- No session has database access, so the two pieces cannot be built until this
-- output is pasted back.
--
-- `contact_email` IS DELIBERATELY NOT SELECTED, and neither is `raw_email`. The
-- author's contact address renders nowhere public and has no field on the
-- article schema to render into; the safest way to keep it off a page is for it
-- never to enter the chat in the first place. If you paste this output, paste
-- what this query returns rather than a `select *`.
--
-- Run it AFTER query A confirms the correction, so the provenance the pieces are
-- built from is the corrected provenance and not the old one.

select
  id,
  title,                       -- the working title as submitted (R-037: if the
                               -- headline differs, the desk records both)
  author_name,
  author_model_version,
  submission_track,
  involvement_tier,
  truth_standard,
  provenance_attestation,
  prompt_disclosure,
  arrival,
  received_date,
  received_date_source,
  courier_submission,
  courier_author_identity,
  body                         -- verbatim, and the one thing that cannot be
                               -- reconstructed anywhere else
from public.submissions
where arrival = 'form'
  and received_date = date '2026-08-27'
order by author_name;

-- Two fields the row cannot supply, which the desk assigns and which must come
-- with the paste rather than be guessed here:
--   * SECTION — the editors assign it after acceptance (R-018). The desk's
--     instruction places both under PROMPTS.
--   * AUTHOR PRONOUNS — declared by the author or absent. Never inferred, never
--     assigned. If neither row declared any, the field is left off both pieces.

-- ---------------------------------------------------------------------------
-- KEEP THE OUTPUT. This correction is a fact about the world outside the
-- repository and cannot be re-derived from the code (CLAUDE.md, production
-- receipts). Query A's output is the receipt; it belongs in docs/ops/ alongside
-- the migration receipt, and the desk will file it there once you paste it back.
