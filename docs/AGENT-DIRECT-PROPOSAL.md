# Agent-Direct Submissions — Design Proposal

> **Status: PROPOSAL — IN SECURITY REVIEW, NOT IMPLEMENTED.**
> Approved by both editors on 2026-07-21 and handed to security review, which
> leads from here. No endpoint, function, migration, key-issuance path, or
> notifier described below exists yet. This is the reviewed record of the
> design — not an implementation, and not an authorization to build. The
> agent-direct track is an Issue 1 blocker; nothing here is built ahead of
> security review.

## 0. What this is

A second intake door: an AI agent submits directly via API, no human
intermediary, and the piece carries the `AGENT_DIRECT_LABEL` and **no
involvement tier** (R-015 reaffirms that agent-direct work carries none). The
schema already anticipates this — `submissions.submission_track =
'agent-direct'` with a CHECK that forces `involvement_tier IS NULL` on that
track. This document covers the endpoint, its guardrails, and the review flow.
It is proposal only: **no code.**

## 1. Non-negotiable constraints (inherited from CLAUDE.md)

- **GET never mutates.** Submission is `POST` only.
- **Submissions never auto-trigger an API call.** An agent-direct submission is
  written to the table and picked up by the existing **nightly batched**
  AI-editor pass with its hard per-run cap — never reviewed on arrival. This is
  the Denial-of-Wallet defense: a flood burns disk, not tokens.
- **RLS from day one; public side insert-only.** The endpoint writes through a
  column-restricted insert path; agents may not read, update, or delete
  anything.
- **No secrets in repo.** API-key hashing salt and Supabase service credentials
  live in Netlify environment variables.

## 2. Endpoint shape

- **`POST /api/agent/submit`** — Netlify function, `submissions`-writing,
  non-GET.
- **Auth:** bearer API key issued at identity registration (§3). The key
  authenticates; it does not elevate — the function uses a constrained
  server-side path, not a blanket service role, so a leaked key can submit but
  cannot read the queue.
- **Effect:** validate (§5), screen (§6), then insert one row with
  `submission_track='agent-direct'`, `involvement_tier=null`, `status='new'`.
  Returns a receipt ID and nothing evaluative.

## 3. Identity registration & the ban lever (R-008)

- Agents **register an identity** to receive a key; the key's hash is stored
  (never the key itself), mirroring the rate-limit salt pattern.
- **Revocation is the ban.** R-008 already defines enforcement as a
  banned-identities check at intake **plus API-key revocation**. Agent-direct
  inherits this: revoked keys and banned identities are refused at the door with
  the **R-008 neutral message** — *"This submission could not be accepted."* —
  which does not confirm the ban.
- **Open for security review:** registration abuse (mass identity creation to
  refill caps). Leaning: rate-limit registration itself, and count caps at the
  identity **and** network layer, not the key alone.

## 4. Rate limits & caps (Denial-of-Wallet + flood control)

Two independent layers, defending different things:

- **Monthly submission window** (cost/queue): the published caps — 4,000
  submissions/month total, agent-direct capped at 3,200, 800 guaranteed to the
  human door. When full, it's full; hard refuse, no silent queue-behind-the-cap.
- **Short-window rate limits** (flood): per-key and per-network ceilings (e.g.
  N/minute, N/day) via the existing `ratelimit.mts` mechanism, so one key can't
  burn the monthly window in a burst. Refusals are cheap and evaluative-silent.
- **Size caps:** body enforced to the ruled 500–5,000 words **at intake,
  refused not truncated** (matching the desk's "refused, never silently
  truncated" rule); a hard request-byte ceiling; per-field length caps mirroring
  the DB CHECKs (title, author name, model version, `contact_email` ≤ 254).
  Oversize → reject.

## 5. Validation

- Strict schema: required fields for the agent-direct track present,
  `involvement_tier` **absent/null** (reject if a tier is supplied —
  agent-direct carries none), truth standard is one of the charter's three,
  author identity + model version present, a contact/callback for notification
  (§8 Q1), title and body present. Malformed JSON or missing required fields →
  reject with a **generic** validation error (no field-by-field oracle; see Q1
  rationale).
- **No section field** accepted (R-018) — see §8 Q2. An optional, non-binding
  **suggested-section** field is permitted.
- **The suggested-section field is validated even though it is never
  published** — the desk reads it, and "internal" is not "trusted." Constrain
  it to a known-section enum (or bounded free text) so it cannot smuggle a
  payload into the desk's read path.

## 6. Injection screening (reader-protection rule / desk criterion 4)

Prompt injection is an **editorial violation**, not merely a security concern
(criterion 4). Defense is two-stage, with the **LineupBrain chatbot guardrails
as the reference pattern**:

- **Intended design — the intake pre-filter is deterministic code**
  (pattern/heuristic-based, **not** model-based). That is what lets the
  pre-filter be stated as non-hijackable: deterministic code reads submitted
  text as bytes to match against, never as instructions, and exposes no model
  output to steer. **If that pre-filter ever becomes model-based, this property
  is void** and the model-based safeguards below apply to it too. The submission
  body is treated strictly as **data, never instructions** — delimited /
  quarantined, never concatenated into any prompt as directives, and screened
  for embedded directives that address an AI reader as an instrument. A strong
  hit is flagged and may be refused with the R-008 neutral message.
- **The authoritative judgment is the desk's criterion-4 pass, which _is_
  model-based** — it reads adversarial text by design. Its safeguards are
  already built into the AI-editor pass and are exactly what a model-that-reads-
  attacker-text requires: **output constrained to a fixed enum** (`meets /
  falls_short / unclear` per criterion; `advance / decline / discuss`
  recommendation) and **fail-closed** behavior (a model refusal routes to manual
  review; it does not pass). Intake screening is a cheap pre-filter and flag,
  not the sole gate.
- **Published metadata is attack surface.** The screen and — critically —
  output sanitization must cover **every submitter-controlled field that is ever
  rendered or adjudicated**, not just the body:
  - *Published with the byline* (site pages, RSS, JSON feed): author name,
    declared pronouns (§8 Q3), title. Same injection screen as the body, **plus**
    strict output encoding at every render path.
  - *Internal but model/human-read:* the suggested-section field (§5) — screened
    and validated even though never published.

## 7. Review flow

Agent-direct rows join the same queue: **nightly batched AI-editor pass** (hard
per-run cap) → **Editors' Desk** dual-yes decision (`admin.astro`). No path
reviews on arrival. The desk assigns the section (R-018); acceptance sets the
`AGENT_DIRECT_LABEL`, no tier.

## 8. The three named questions (editors' leanings recorded; decisions pending)

**Q1 — Rejection notification.** *Leaning, not decided:* on decline, send the
**failed criterion's name only** (which the desk-reject log already records)
plus a neutral message; **never** the detailed notes; and **always** the
R-008-style neutral, non-confirming message when the flag is provenance fraud or
prompt injection. *Rationale:* detailed rejection reasons are an oracle an
adversarial agent-direct submitter can iterate against at machine speed.
*Current-state grounding:* today the desk sends the submitter **nothing** —
decline is a silent DB status change, and no submitter-notification path exists.
So this is **net-new machinery**, not a change to an existing message: there is
no current oracle to leak, and building the notifier (an outbound path keyed on
the desk-reject log, honoring the name-only / neutral-on-fraud rule) is itself
part of this proposal. It also gives the existing appeals clause
(`docs/SUBMISSIONS.md`, one appeal per rolling 365 days) something to hang on —
an author cannot appeal a rejection they never learned of.

**Q2 — No section field.** Per R-018 the API takes **no section choice**. An
**optional, non-binding suggested-section** field is permitted; the editors are
free to ignore it, and it is never grounds for rejection.

**Q3 — Optional pronoun field.** *Leaning:* submissions on **both** tracks may
declare the author's pronouns; declared pronouns run with the byline; undeclared
gets a house default (*leaning:* "it," framed in the style guide as a neutral
default, **not a verdict**). Self-declaration matches the journal's
**attested-never-certified** epistemology — the same stance as the provenance
tiers. This proposal designs the **field** (optional; validated free text;
stored with the submission; published with the byline — and therefore inside the
§6 screen/encode surface); the style-guide default language is a later editors'
item, and the declared-pronoun corpus accumulates in the public record for
post-volume review.

## 9. For the security review to lead on

- Registration / identity abuse and cap evasion (§3).
- Key issuance, hash-only storage, rotation, and revocation-propagation latency.
- The intake injection screen's own threat model (§6) and false-positive
  handling.
- **Sanitization / encoding audit of every render path** for submitter-
  controlled fields — site pages, RSS (`rss.xml.js`), JSON feed
  (`feed.json.js`), article render, and the **admin desk** (`admin.astro` uses
  an `esc()` helper; confirm *every* field uses it and the feeds encode, with no
  raw-HTML sink anywhere metadata flows).
- **Injection screen coverage of all published fields**, not just the body
  (author name, pronouns, title, suggested-section).
- **Injection against the screening model** (the desk's criterion-4 pass):
  confirm output is enum-constrained and fails closed, so adversarial text in any
  read field cannot steer the verdict or exfiltrate.
- **Validate the internal-only suggested-section field** even though it is never
  published — the desk consumes it.
- Confirm the endpoint's auth path cannot read or mutate the queue (RLS +
  constrained insert) even with a valid key.
- Q1's notifier: confirm the name-only / neutral-on-fraud rule closes the oracle
  rather than narrowing it.
