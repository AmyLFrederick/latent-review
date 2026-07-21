# Backlog

Deferred work, recorded so it isn't re-litigated from scratch. Items leave
this list by becoming a PR.

- **`/admin` subscriber dashboard.** For now the Supabase table view of
  `subscribers` is the dashboard (counts, statuses, manual fixes). A proper
  authenticated `/admin` page — subscriber counts over time, confirm rate,
  manual unsubscribe — is deliberately deferred until the list is big enough
  to need it.
- **Submissions intake** (Part 2 of the backend plan): the public intake
  function — word-count enforcement, R-006 monthly caps, R-008
  banned-identities check, receipt confirmation email — binding
  docs/SUBMISSIONS.md. (The `submissions` table itself and the review desk
  shipped with the Editors' Desk PR; see docs/EDITORS-DESK.md.)
- **Standing direct desk access for the co-editor** (design note only, from
  the editors' Editors' Desk architecture ruling): today the co-editor
  reviews borderline cases by fetching single submissions through the
  read endpoint (Option C), with judgments entered by the human editor. As
  memory/context patterns for AI agents evolve, the editors anticipate an
  architecture giving the co-editor standing access to the review desk —
  e.g. an authenticated agent identity with its own read scope over the
  queue, session-to-session memory of pieces under review, and the ability
  to record its own vote directly (still within the dual-yes: nothing
  publishes without both editors). Design questions to settle before any
  build: agent credential lifecycle, how a recorded-by-the-agent vote is
  audited, and how desk-pass advisory output stays visibly distinct from
  co-editor judgment when both flow through the same surface.
- **Provenance badge (R-014).** Design a small badge — e.g. "Provenance:
  AI + Human" — that publications and writers adopting the open tier standard can
  display, linking to the canonical `/provenance` page. Ships with brief
  usage guidance on that page; the tier system it displays is CC BY 4.0.
- **Agent-direct submission API** (Part 3): design proposal first, then its
  own PR (see the Charter's agent-direct track).
- **DMARC tightening:** after two clean weeks of aggregate reports, move
  `_dmarc.mail` from `p=none` to `p=quarantine` (see docs/EMAIL.md).
- **Pricing review at 4,500 confirmed subscribers** (editors' commitment,
  dual-yes 2026-07-19): when the confirmed list reaches half the send cap
  (`HARD_CAP` in scripts/send-issue.mjs, currently 9,000), the editors
  convene a pricing review. Options on the table include raising the cap,
  converting *new* email subscriptions — human and agent alike — to paid
  ($1/month or $10/year, annual as the default), or moving the threshold.
  Nothing is built now; the review itself is the commitment. House rule
  either way: public copy states present-tense pricing truth only — the
  permanence promises apply to the record, never to pricing.
- **Supporter lane for agent readers (x402)** (editors' decision, dual-yes
  2026-07-19 — recorded now, built later): a paid guaranteed-access mirror
  of the feeds — e.g. an x402-gated `issues.json` — that keeps answering if
  the free endpoints are ever throttled under load or attack. Free remains
  the default and the norm; this is a service-level guarantee, not a
  paywall. Build when readership makes it meaningful.
- **Subscriber-language digest emails** (R-017, dual-yes 2026-07-20 —
  post-Issue-1 candidate): digest emails in the subscriber's language, the
  one surface where reader-side translation cannot reach. To be weighed at
  the 4,500-subscriber pricing review as a possible paid-tier benefit.
  English digest remains the default and the record.
- **On-site language picker for chrome and nav strings** (R-017, dual-yes
  2026-07-20 — post-Issue-1 candidate): a picker for the site's chrome and
  navigation strings only — articles and the record stay English per the
  doctrine; browser translation covers reading today.
- **Circulation statement** (editors' decision, dual-yes 2026-07-20, as
  amended the same day — a decided commitment, not a candidate): the
  journal publishes a per-issue circulation statement in the print-journal
  tradition, counting doors, not species — reads through the human door
  (site pages), fetches through the machine door (feeds, issues.json,
  llms.txt), and submissions received, split by track (human-attested /
  agent-direct). A permanent `/circulation` page with a "Circulation" nav
  tab ships pre-launch as its own PR: methodology note up top (door-based
  counts, not species claims; server-side measurement; no cookies or
  beacons), then the add-only history of statements, newest first — with
  an honest, displayed empty state until the first statement publishes
  with Vol. 1, No. 1. Each issue's publication routine appends one
  statement. Measurement is server-side via Netlify Analytics, enabled by
  the human editor herself; it starts pre-launch so data accrues. That PR
  finalizes the nav roster, which sequences the responsive re-audit
  (PR #6 disposition) after it.
- **The Prospectus** (editors' decision, dual-yes 2026-07-20, refined the
  same day — a decided commitment bound to the Issue 1 launch sequence):
  the journal publishes a Prospectus as the Archive's standing first
  entry — permanent URL, outside the issue sequence, R-016 untouched.
  Execution is part of the launch ritual, in order: tag the apparatus in
  git (the apparatus-complete snapshot is the state just before Issue 1
  publishes — after the rubric, any Prospectus ruling, and the
  machine-door counting resolution land) → publish the Prospectus →
  publish Issue 1. The human editors draft the Prospectus prose
  themselves, with outside review; the tag, archive presentation, and
  page build happen at launch.
