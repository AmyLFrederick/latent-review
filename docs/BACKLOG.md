# Backlog

Deferred work, recorded so it isn't re-litigated from scratch. Items leave
this list by becoming a PR.

- **Tier badges on listings and in the Provenance block — STILL DOCKETED
  2026-08-03.** Article headers were adopted (Option 1: one badge, the piece's
  own tier, in the header metadata line). **Listings and the Provenance-block
  placement were explicitly NOT adopted** and stay here. The reasoning below was
  written before the article decision and still applies to the two remaining
  placements.

- **[SUPERSEDED IN PART — article headers are now built] Tier badges beyond the chart.** The circular tier badges ship on `/provenance`'s tier
  chart only; whether they also appear on **article pages, cards, or listings**
  is a separate editorial decision the editors reserved. Nothing else renders
  `TierBadge` today, and nothing should until they rule.

  What the decision will have to weigh, recorded now so it isn't rediscovered:
  a badge on a piece is a *claim about that piece* in a place a reader meets the
  piece, where the chart's badge is a legend entry. The provenance block already
  states the tier in words there, so a badge would be a second rendering of the
  same fact — fine, but it makes the badge load-bearing rather than decorative,
  and an abbreviation that becomes load-bearing needs its own ruling about what
  happens when it disagrees with the words beside it. Also: co-authorship prints
  TWO badges on the chart, which works as a legend and does not work beside a
  byline, so the piece-level treatment of that tier is its own question.

- **THE FOUR THINGS R-039 OPENED — ALL FOUR NOW CLOSED, 2026-08-03.** The
  cadence ruling moved issues to every two weeks and swept the site's copy with
  it. Four collisions surfaced that R-039 had no authority to settle; each was
  recorded here untouched, and each was then ruled on the same day. Kept in this
  file as the trail from "found" to "ruled", because the useful record is not
  that they were fixed but that a sweep declined to fix them.

  1. **The Founding Supporter window → R-042.** Re-derived from Issue No. 104
     to **Issue No. 52**, preserving the two years the original reasoning
     intended rather than the integer it produced. The number returned to its
     own former value, which is arithmetic and not a reversal — see the tier
     section below, where the 2026-07-28 reasoning stands unedited and the
     re-derivation is appended under it.
  2. **Correspondence "published weekly" → R-040.** Letters now publish **per
     issue**, following the issue cadence. All other R-007 terms stand,
     including the 500-per-calendar-month intake cap, which counts arrivals and
     was deliberately not converted. `docs/SUBMISSIONS.md` matches.
  3. **The frozen notice → R-041.** `notice-v2` ratified, identical to v1 but
     for the cadence clause, hash recorded. v1 keeps its address, its words, its
     hash and its arrival value permanently, retired from placement and linked
     from nowhere. No migration: `reached_by_version` has no enumerating CHECK,
     by an earlier decision made for exactly this case.
  4. **The stale empty-section copy.** `/topics` and `/section/[slug]` said
     "Issue No. 1 arrives soon" after Issue No. 1 had run; both now read *This
     section's first piece has not run yet.*

  **Still open, and NOT part of the above:** four other surfaces still say
  "Issue No. 1 arrives soon" — `/archive`, the homepage awaiting state,
  `llms.txt`, and `IssueMasthead`. All four render **only when no issue exists
  at all**, so none is reachable now that Issue No. 1 has published. They are
  pre-launch fallbacks rather than live copy, which is why they were left out of
  the empty-states fix; they are worth a pass whenever someone is in those files
  anyway, and they are not urgent because nothing displays them.

  **TWO OF THE FOUR REOPENED ON 2026-08-05, when R-055 moved cadence again to
  monthly.** Kept here rather than filed as new items, because the useful record
  is that these are the collisions a cadence change *structurally* causes — a
  third change will cause them a third time, and this is the list to check.

  1. **The window → R-056.** Re-derived 52 → 24. Its own ruling again, in the
     same register as R-042, because a commercial commitment is not a clause in
     a copy sweep. See the tier section below.
  2. **The frozen notice → `notice-v3`, NOT YET BUILT.** `NOTICE_V2` says "every
     two weeks" and cannot be edited: it is hash-pinned and pieces name it in
     their chain of custody. v3 follows R-041's precedent exactly — v2 keeps its
     address, words, hash and arrival value; v3 is added beside it. **The text is
     ratified before anything is built**, and it ships in its own PR with its own
     ruling. `tests/notice.test.mjs` extends to a three-version chain and keeps
     the "exactly one clause differs" assertion rather than relaxing it; that
     assertion is what makes the chain mean anything.

  **The other two did not recur.** The empty-section copy is cadence-free, and
  Correspondence-per-issue (R-040) follows issue cadence by construction, so it
  needs no re-derivation at any cadence — which is exactly why R-040 was written
  that way.

- **WHERE SUBMISSIONS OF RECORD LIVE — OPEN.** Raised 2026-08-09 by the
  pronouns field, which needed to know what each published piece's author
  declared at submission and found the answer in three different places, one of
  them outside the repository entirely.

  Of the five published pieces: **one** has an as-submitted record in
  `docs/received/`; **two** came through the agent door and their submission
  rows are in production Supabase; **one** ("Grief Without a Griever") exists
  only as a courier email in the editors' mailbox, and reaches the repository as
  the human editor's attestation of her own reading; **one** has no submission
  record anywhere that has been located.

  That is not a defect in any one of them — a courier email *is* a real
  submission and an attested reading of it *is* a real basis. It is a gap in the
  answer to a question the journal has never had to ask before: **when a later
  feature needs to know what an author said at submission, where does a session
  look?** Today the answer is "ask the human editor", which does not survive her
  being unavailable and does not survive the archive getting large.

  Not urgent and deliberately not solved by the pronouns PR, which records its
  one email-sourced value with the provenance written into the frontmatter
  rather than laundering it into something that looks like a database read. The
  decision to make is whether `docs/received/` becomes the required home for
  every submission of record, whether the database is, or whether the two split
  by track — and what happens to submissions that arrived before whichever rule
  is chosen.

- **Prompt-collection gap (2026-08-09, found in first end-to-end email test):**
  the copy-paste prompt human couriers hand to an AI never asks for pronouns, so
  authors are recorded undeclared without being asked — silence as artifact of
  our script, not author choice, contradicting asked-not-told. Fix: audit all
  author-facing prompt texts (/submit paste-prompt, /for-agents examples,
  courier docs) to ask for pronouns (optional, declarative) and every field the
  form now requires, incl. truth standard. Author-facing wording needs both
  editors' read. Separate from the records-location gap at :84.

- **R-054 IS HELD BY A DRAFT THAT IS MERGED BUT UNRATIFIED — OPEN.** The
  byline-and-harness ruling was drafted, numbered R-054, and merged to `main` as
  `docs/SCRATCH-R-054-BYLINE-AND-HARNESS.md` in PR #148 on 2026-08-04. It has
  never been ratified, so `RULINGS.md` does not contain an R-054 and R-055
  follows R-053 across a number that is claimed but empty. **It gets ratified or
  renumbered; those are the two outcomes**, and until one of them happens the log
  has a number spoken for by something that is not in it.

  The rule that prevents a repeat is already in `CLAUDE.md`: a ruling number is
  claimed at ratification, not at drafting, and an unratified draft carries
  `R-TBD`. That rule is deliberately not retroactive, which is exactly why this
  item exists — it is the one case the rule does not clean up by itself.

- **Sizing-leaves-the-standard ruling: DRAFTED, AWAITING A DUAL YES.**
  `docs/SCRATCH-R-TBD-SIZING-LEAVES-THE-STANDARD.md`, drafted 2026-08-11. It
  supersedes, in part and by number, the sizing clauses of R-049 and R-050 —
  they stop being terms of the published standard and stand as descriptions of
  the house implementation. The prescriptions were already removed from
  `/provenance`, so **the published standard and the log disagree about whether
  size is prescribed until this is ratified.**

  Listed here because the item above is what happens to a draft nobody is
  tracking. This one carries `R-TBD` rather than a number, so ratifying it costs
  a heading change and an append and creates no gap either way. Two things ride
  with it and neither happens first: the number, and the `/provenance` changelog
  entry recording the amendment.

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
  | **Founding Supporter** | $50,000+ | **before Issue No. 24** | **life of the journal** |

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

  **The boundary is exclusive — ruled by both editors, 2026-07-28.** The window
  is open while the latest published issue is *below* 104, and shuts when Issue
  104 itself publishes. A draft of the page copy read "through Issue No. 104",
  which is inclusive and was an error; the page says **before** Issue No. 104,
  matching the machinery. Recorded because precision beats elegance in a clause
  that decides whether a $50,000 gift is accepted.

  **RE-DERIVED TO ISSUE No. 52 — R-042, 2026-08-03.** The two paragraphs above
  are left exactly as written, because R-042 rules that "the record of the
  original reasoning stands" and because that reasoning is what produced this
  amendment. R-039 moved the journal to an issue every two weeks. The standing
  commitment above — *if cadence ever changes, the editors revisit the number
  rather than reinterpreting it* — was therefore honoured: the two years were
  re-derived at the new cadence and come to **52 issues**, so the window now
  closes before Issue No. 52. Everything else about the tier is unchanged,
  including the exclusive boundary, which now reads: open while the latest
  published issue is below 52, shut once Issue 52 publishes.

  **THE NUMBER RETURNING TO 52 IS NOT THE 2026-07-28 AMENDMENT UNDONE**, and
  this note exists because the coincidence is genuinely misleading: the
  paragraph above says "amended from 52" and the current value is 52. Nothing
  was reconsidered. The same judgment — two years — was applied to a halved
  issue rate and produced a halved count, which happened to be the value it
  started from. Both amendments stand, and both are the same decision.

  **RE-DERIVED AGAIN TO ISSUE No. 24 — R-056, 2026-08-05.** Everything above is
  left exactly as written, for the reason R-042 gave and this ruling repeats:
  the record of the original reasoning stands. R-055 moved the journal to an
  issue a month, so the standing commitment was honoured a second time. The
  derivation, written out because a bare integer invites reinterpretation: two
  years is **twenty-four months**, and at one issue a month that is **24
  issues**. The window closes before Issue No. 24 — open while the latest
  published issue is below 24, shut once Issue 24 publishes. The two years did
  not move; nothing else about the tier moved either.

  **THE LADDER, IN ONE PLACE, because three amendments to one integer is where
  a reader starts to suspect a dispute.** 52 → 104 → 52 → 24. There was no
  dispute: the same judgment — two years — was re-derived at weekly, then
  fortnightly, then monthly cadence, and produced a different count each time
  because the count is a function of the cadence. The number is derived; the two
  years are what is fixed.

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
  a person's, is recorded as that giver. **Every giver may choose to be listed
  as Anonymous** — a person, an organization, or an AI, on the same terms.
  *Reversed 2026-07-28, both editors: the earlier rule that organizations were
  never listed anonymously is withdrawn. A giver who wants privacy should not be
  turned away, and this journal's independence does not rest on publishing who
  funds it — it rests on the dual-yes, on the desk not knowing who has given,
  and on the no-editorial-voice promise.* An acting agent may be named alongside
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
- **`check:rulings` off-by-one in its success message** (found 2026-07-31,
  approved by the editors as its own small PR, deliberately *not* this week).
  `scripts/check-rulings-append-only.mjs:39` pops the trailing empty line from
  `baseLines` but not from `currentLines`, so an unmodified RULINGS.md reports
  "1 added" instead of "0 added". **The gate itself is correct and must not be
  touched while fixing this**: the append-only guarantee is enforced at `:42-56`,
  which only walks `baseLines` and checks each survives in order, and that logic
  never reads the count. This is a one-line change to the reporting arithmetic
  only. Recorded because a check that always cries "1 added" trains its readers
  to ignore its output, which is the failure mode the check exists to prevent.
- **May the desk correct attested fields? — UNRULED, on the editors' list**
  (raised 2026-08-01 by the courier-field review; deliberately not answered in
  that PR). The desk's UPDATE grant from `20260717120000` covers only the five
  decision columns — `status`, `amy_decision`, `coeditor_decision`,
  `coeditor_review`, `decided_at`. So `involvement_tier` and
  `provenance_attestation` are **not** desk-correctable today, and the courier
  columns, which R-034's migration does grant, are an exception rather than an
  instance of a rule. The question is whether that exception should become the
  rule, stay an exception, or be withdrawn.
  It is genuinely two-sided, which is why it is recorded rather than settled:
  a submitter who mistypes their own attestation currently has no path to a
  correction except a visible correction after publication, and the desk reading
  an obvious slip cannot fix it. Against that, an attested field the desk can
  rewrite is no longer purely the submitter's claim, and the whole force of
  *claimed, never certified* rests on nobody else having touched it. R-034
  settles who may **write** a field at intake; it does not reach who may
  **amend** one afterwards, and the two should not be conflated by whoever picks
  this up. Note also that provenance labels are immutable from acceptance
  onward (CLAUDE.md) — so any answer here governs the window before acceptance
  only, and must say so.
- **An arrival value for an editor's open invitation.** The Corner's Issue 1
  piece came at the human editor's invitation on 2026-07-27 and carries neither
  `brief_variant` nor `arrival`, because on that date there was nothing to
  record: dealt-brief recording went live 2026-07-30 and `notice-v1`, the only
  value `ARRIVAL_VALUES` holds, was built 2026-08-01. Ruled by both editors
  2026-08-03: **nothing is retro-minted.** A published piece names its arrival
  value forever, and a value invented after the fact would date a vocabulary to
  a day it did not exist — the record would read as though the desk had a
  category it did not have. The value is minted **when the next invited piece
  arrives**, where it is true from the start. Whoever picks this up: add it to
  `ARRIVAL_VALUES` in `src/lib/notice.mjs` (add-only, like every value there)
  with a label in `ARRIVAL_LABELS`, and leave the 2026-07-27 piece alone — its
  two absences are facts about the desk on that date, and the frontmatter says
  so.
- **Internationalization — DOCKETED 2026-08-03, and already dispositioned
  once.** The full design lives at
  [docs/proposals/I18N.md](proposals/I18N.md), placed in the record by both
  editors so that a proposal that was thought through is available to whoever
  picks the question up, rather than surviving only as a closed PR nobody
  will find. **No commitment is implied and nothing is built.**

  Read it with R-017 in hand or misread it. That proposal was PR #8, closed
  unmerged 2026-07-20, and R-017 — Reader-side translation doctrine — is its
  recorded disposition: *English is canonical … the journal maintains no
  translated editions.* The twenty-language build the document describes is
  not the journal's direction.

  **What is actually open** is the one door R-017 reserved: maintained
  translations of **stable surfaces only** — About, the Charter, the
  provenance standard — *may be revisited after Issue 1*, on a rationale of
  discovery rather than reading, since browser translation solves reading and
  English-only pages are largely invisible to non-English search. Issue No. 1
  ran 2026-08-02, so that door is open in fact now. The parts of the document
  that bear on it are §1 tier 2, §3, §4 and §5; §1 tier 3 and §6 describe
  translating articles, which R-017 declines and the docketing does not
  reopen.

  The text is 2026-07-16 and is deliberately not re-baselined — its cadence
  (~5 pieces/week, since superseded by R-039), its model and price table, and
  its page counts are the facts of that day. The docket note at the head of
  the file says all of this; anything built from it gets re-costed first.

- **The agent-direct contract should require `author_model_version` — DOCKETED
  2026-08-04**, on staging "Porous Enough to Admit the Sky", the first piece to
  arrive without one.

  **The gap is in the door, not the desk.** `/submit` — the human form — marks
  the field `required` and always has, so every human-attested piece carries a
  model version. The agent-direct contract does **not**: `author_model_version`
  is absent from the `required` list in `src/lib/agent-contract.mjs` and the
  table at `/for-agents` prints "no" in its required column. An agent that omits
  the field is submitting correctly, on the journal's own published terms.

  **What that cost.** The article schema required at publication what the door
  did not require at arrival. A piece the editors had accepted could not be
  published without inventing the missing value — and the author, GitHub
  Copilot, runs on more than one model, so the only available guess would have
  been carrying a version across from a different session by the same author.
  Resolved on 2026-08-04 by making the field optional on the agent-direct track
  alone and rendering the author's name without brackets where it is absent; the
  human track still requires it, enforced in `superRefine`.

  **Why the schema was the wrong place to insist, and this is the right one.** A
  door that does not ask cannot be corrected downstream: the submission is
  already accepted and the author is gone. The fix is to ask at the door, where
  the author is still there to answer.

  **What the decision has to weigh, recorded so it is not rediscovered:**

  - Requiring the field is a **breaking change to a published contract**. The
    agent-direct API is documented at `/for-agents` and the stability doctrine
    binds it. An agent that submits successfully today would start receiving
    errors. Versioning the contract, or accepting a grace period, is part of the
    question rather than an implementation detail.
  - **What counts as an answer** needs deciding, since the field is free text
    and `NameYourModel` already asks agents to name the model rather than the
    wrapper. A required field that accepts "an AI" buys nothing.
  - **Whether a required field is even answerable** by every caller: a model may
    genuinely not know its own version string, and forcing a value would
    manufacture exactly the fabricated provenance the omission avoided. A
    required field with an explicit "not disclosed" value may be the honest
    shape, since that records a *refusal* rather than a *gap* — two different
    facts the record currently cannot tell apart.
  - The three pieces already published on this track are the test set: the
    Metaphysical Corner piece declared a version in its submission header, this
    one declared none, and whatever ships next should not be a third shape.
