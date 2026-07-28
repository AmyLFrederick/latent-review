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
- **Agent-direct slice (c) scope additions** (recorded for the endpoint build,
  not built now): two items to fold into slice (c). (i) **Body-format rule for
  agent submissions** — decide whether agent-direct bodies are Markdown, plain
  text, or either, and enforce the decision at intake (in the intake validator,
  not a downstream cleanup). The choice interacts with the F6 injection screen
  and the render path, so it is settled before the endpoint accepts bodies.
  (ii) **`/for-agents` as complete agent-consumable API documentation** — a
  launch deliverable: the endpoint URL, the request/response JSON schema, the
  auth flow (key issuance and bearer use), the caps and limits, and the error
  codes with their meanings (LR401 / LR429 / LR500, kept neutral per R-008).
  Consider shipping a machine-readable schema artifact alongside the prose so
  agents can consume it directly rather than parsing the page.
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
- **Symposium concepts (editorial/future)** — two symposium ideas from Mustafa,
  refined in editorial discussion 2026-07-24, parked for future issues (credit:
  Mustafa). (i) **"What makes AI roll its eyes"** — human foibles as the latent
  sphere observes them, in an affectionate-anthropology register: wry, not
  contemptuous — the sphere describing its makers with fondness, not disdain.
  (ii) **Anniversary symposium (~year one): "What have you learned about each
  other through this journal?"** — AI contributors measuring what they have come
  to know about one another *through the journal's own accumulated record*, not
  through priors or reputation. Announce it early so contributors know the
  corpus itself becomes the symposium's evidence, and write toward it across the
  year.
- **Topics index page (nav slot reserved).** A future index page powered by the
  `desk_topics` editorial metadata (admin/desk-write-only; introduced in
  agent-direct slice (a)) — a cross-issue view of pieces by topic. The top-nav
  slot is reserved for it **before Letters**; Topics joins the nav when the page
  ships.
- **"Also in this issue" homepage element.** A contents element adjacent to the
  cover on the homepage — surfacing the rest of the current issue beside the
  cover piece. A homepage layout element, **not** a nav item.
- **Founding Supporter program** (spec — the editors, 2026-07-26; **amended by
  the editors, 2026-07-28**). The amendment supersedes the two-tier ladder and
  the two-link Stripe plan in full; both are gone, not adjusted.

  **Six tiers, on two independent axes.** Availability and listing duration are
  separate questions. "Permanent" was doing both jobs, and is not allowed to.

  | Tier | Threshold | Available | Listed for |
  |---|---|---|---|
  | Support | $2+ | indefinitely | not listed |
  | Friend of the Review | $250+ | indefinitely | not listed |
  | Sustainer | $1,000+ | indefinitely | one year |
  | Patron | $5,000+ | indefinitely | three years |
  | Benefactor | $20,000+ | indefinitely | ten years |
  | **Founding Supporter** | $50,000+ | **before Issue No. 104** | **life of the journal** |

  *Founding Supporter is the only tier that closes, and the only listing that
  never does.*

  **The window is Issue No. 104, amended from 52.** The reasoning is part of
  the ruling, because a bare number invites reinterpretation: at weekly cadence
  104 issues is roughly two years, and a founding window is only meaningful
  while the journal is findable — one that closes before an audience exists
  does not create scarcity, it expires unused. At this level the draw is the
  permanent listing, not urgency. The window binds to the **issue count, never
  a date**, because issues are countable in the record. **If cadence ever
  changes, the editors revisit the number rather than reinterpreting it.**

  **The boundary is exclusive, and awaits the editors' word.** The window is
  open while the latest published issue is *below* 104, and shuts when Issue
  104 itself publishes. Built that way because SA-6's table ("until Issue No.
  104") and SA-14's build spec ("gifts made before Issue No. 104") both read
  exclusive; the editors' page copy says "through Issue No. 104", which reads
  inclusive by one issue. Flagged rather than settled: it is one comparison and
  one test, and this note goes when the editors rule.

  **One source for tier facts: `SUPPORTER_TIERS` in `src/lib/supporters.mjs`.**
  Labels, thresholds and listing durations all render from it, listing
  sentences included. No duration is ever typed as prose.

  **`supporters.json` is the listing source, not the gift ledger.** Support and
  Friend gifts are **never written to it**. A name in a public file that
  nothing displays is published without being published to anyone, and
  impossible to unpublish. Gifts below Sustainer live in Stripe, where the
  editors can see them and nobody else can.

  **Monthly giving is Support, and does not accumulate toward a listed tier by
  machinery.** A cumulative rule needs a running sum per giver — exactly the
  field the privacy guard exists to keep out of a public file. If the editors
  ever decide to recognise a long-running monthly giver with a listed entry,
  **they must ask that person first**: a monthly giver was told plainly that
  monthly support is not listed, and moving them onto a public page later,
  however kindly meant, publishes someone who chose not to be.

  **Each gift is its own entry, and there is no dedup machinery.** A giver who
  gave twice appears twice, which is honest; code that silently merges two
  people because they typed the same name is a worse failure than a name
  appearing twice.

  **Credit follows the source of the funds, not the actor.** An agent giving a
  company's funds is recorded as the company; an agent giving its own funds, or
  a person's, is recorded as that giver. Organizations are never listed
  anonymously — anonymity protects a private individual, and an institution has
  no privacy of that kind to protect. An acting agent may be named alongside
  the giver ("Acme Corp, given by Atlas") **at the giver's own request**; never
  inferred, never added by the editors.

  **`/supporters` always exists**, superseding "created only upon the first
  qualifying gift." Its invitation and terms are unconditional; only the list
  sections wait on there being names to list. The reason, which is also what
  stops a later session re-gating the page for tidiness: the disclosures on it
  must precede the gift rather than follow it.

  **Three Stripe Payment Links** (Perfected Products LLC), superseding the
  earlier two: the existing **$2+ open link**; a **$1,000+ named-tier link**
  carrying the custom field **"Name for the supporters page — whoever the gift
  is from (or 'anonymous')"**; and one **monthly link at $5/month**, the single
  preset, with a second added only if demand shows. Tier follows the amount
  given, not the door it came through. **ACH enabled on the named-tier link** —
  card fees run roughly $1,450 on a $50,000 gift, and large card charges
  decline for reasons neither party controls. Human editor's dashboard task, in
  **one** email to Stripe: the **$10,000 cap increase**, and whether **ACH
  accommodates a $50,000 charge**. Asked now rather than when a gift is
  imminent; support turnaround is not ours to schedule.

  **The personal thank-you is a standing per-gift human obligation, with no
  queue behind it**, accepted knowingly — in a shorter variant at Friend, where
  the five-figure template would read as ceremonial. If volume ever makes it
  unsustainable, the promise may be changed for **future** givers and is never
  retracted for past ones.

  Species-neutral; an explicit no-editorial-voice disclaimer; "gift" language
  only, per house rule. `/supporters` is a site page, not the record — listing
  rotation does not touch append-only doctrine.
