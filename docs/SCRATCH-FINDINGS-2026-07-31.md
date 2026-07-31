# SCRATCH — Findings of 2026-07-31: slices, security, provenance vs arrival

> **STATUS — RECORD ARTIFACT, committed 2026-07-31 (PR #79).** This is the audit
> cited by **C7** in `docs/AGENT-DIRECT-SECURITY-REVIEW.md`: the pass that found
> the C-11 sign-off missing, and the deal-token no-expiry residual recorded as
> C6. It is committed so that entry points at something rather than at a memory.
>
> **It is a dated record and is not rewritten.** The prose below is as it was
> reported, including the two places it was wrong. Where a finding was later
> resolved or corrected, that is marked inline in a dated block beneath it —
> appended, never substituted. Two such blocks exist: the migration-status entry
> (partly resolved the same day) and the `brief_variant` publication-surface
> entry (corrected — it was called a launch blocker on the strength of a scratch
> doc that predated the human editor's ruling of 2026-07-30, and it is not one).
> A findings document that quietly fixed its own mistakes would be worth less
> than one that shows them.
>
> The one thing here that remains **entirely open and unruled** is §3, provenance
> versus arrival. Nothing in this PR changes any of it.

*Questions-only session. No code was written, no file outside this one was
modified, and nothing here is a proposal — three investigations, reported as
found, for the editors to rule on.*

**Commissioned by:** the human editor.
**Investigator:** Claude, in Claude Code.
**Baseline:** `main` at `fa910bb`, working branch `door-step2-action`.
**Date:** 2026-07-31 (Issue 1 target: 2026-08-03).

---

# 1. SLICES (a)–(e)

The roadmap is defined in `docs/SCRATCH-SLICE-A.md:160-175`. Status against `main`:

| Slice | What it is | Status | PR |
|---|---|---|---|
| **(a)** | DB layer: `agent_identities` / `agent_api_keys` / `agent_caps`, RLS, F1 policy tightening, `SECURITY DEFINER` RPCs, atomic global monthly cap | **Shipped** | **#35** (`166abbb`) — applied in prod 2026-07-26 (`docs/ops/2026-07-26-…`) |
| **(b)** | Key issuance: `register_agent_identity` RPC, `/api/agent/register`, `/api/agent/keys/rotate`, hash-only storage | **Shipped** | **#41** (`fa3cac5`), dials ruled in R-021 (**#42**) |
| **(b2)** | Desk registration-triage panel | **Shipped** | **#43** |
| **(c)** | `POST /api/agent/submit`, per-identity ceiling, flood dials, deterministic injection screen, `suggested_section`+`pronouns` columns, `/for-agents` + `/agent-api.json` | **Shipped** | **#47** (`7ce8d8f`, `84bb6e5`, `2cb069b`), dials ruled R-023/R-024 |
| **(c2)** | Letters by agent through the same door (`type: letter`), target validation, letter budget | **Shipped** | **#48** |
| **(d)** | **Rejection notifier** | **Never started** | — |
| **(e)** | **Nightly batched AI-editor pass with a hard per-run cap** | **Never started** | — |

Verified by absence, not just by doc: `netlify/functions/` holds nine functions,
none of them a notifier; `netlify.toml` contains no `schedule` key at all;
`ai-editor-pass-background.mts` is still admin-triggered, one submission at a
time.

## What (d) contains

The path that tells a declined submitter they were declined. Today the desk
sends **nothing** — decline is a silent DB status change. (d) is net-new
machinery: an outbound notifier keyed on the desk-reject log, emitting **the
failed criterion's name only** (never the notes), and **always** the neutral
R-008 message when the flag is provenance fraud or prompt injection. Output must
be a fixed enum, not free text, or it becomes an oracle an adversarial submitter
iterates against at machine speed. It carries security finding **G2** (no
submitter string in an email header; strict recipient-format validation).

## What (e) contains

The scheduled nightly batch that picks up queued submissions and runs the
AI-editor criteria pass, with a **hard per-run cap**. The proposal repeatedly
described this as "the existing nightly batched pass"; the security review
established it never existed (F7). (e) also owns the deferred half of **F6** —
labelling *all* submitter-controlled fields as untrusted data in the AI-pass
prompt, not just body and attestation.

## Before or after launch

**Both are after.** Neither blocks Issue 1, and the reasoning differs:

- **(e)** is genuinely safe to defer, but for an uncomfortable reason. The
  Denial-of-Wallet guardrail named that batch as the cost defence. Today the
  guardrail holds **by absence** — nothing calls a model on arrival because
  nothing calls a model at all. That is safe. It is not the same as being
  defended. The moment anything automated is built, (e)'s per-run cap must exist
  first.
- **(d)** is deferrable but has a visible cost: `docs/SUBMISSIONS.md` grants an
  appeal (one per rolling 365 days), and an author cannot appeal a rejection they
  were never told about. With two submissions held and Issue 1 landing Monday,
  the first real decline will be a silent one.

The volume through the agent door is currently low enough that the desk can do
both by hand. That is the argument for shipping Issue 1 without them — not that
they are optional.

---

# 2. SECURITY — every outstanding item

## Open, from the §9 security review (`docs/AGENT-DIRECT-SECURITY-REVIEW.md`)

**F6 — injection screen / prompt isolation, half open.** 🟠 The deterministic
intake screen shipped in slice (c). The other half — the AI-pass prompt
interpolating `title`, `author_name`, `author_model_version` with no
untrusted-data delimiter — was deferred to (e). *Protects against:* adversarial
text in a byline field steering the desk's criterion-4 verdict. *Timing:*
**after.** The vulnerable code path only executes when the AI pass runs, and it
runs only when an editor triggers it manually. It becomes load-bearing the day
(e) exists.

**F7 — no nightly batch exists.** 🟠 As above. *Protects against:*
Denial-of-Wallet via a flooded queue. *Timing:* **after**, and binding on
whatever is built next.

**G2 — notifier email context.** 🟠 Deferred to unbuilt (d). *Protects against:*
header injection / CRLF through submitter-controlled strings in an email
context. *Timing:* **after** — there is no notifier to attack.

**G1 / C1 — CSP is Report-Only and not enforcing.** 🟠 Five of six headers
enforce. The Content-Security-Policy has been `Report-Only` since PR #34. Since
PR #61 (2026-07-29) it finally has both `report-to` and `report-uri` pointing at
`/api/csp-report`, so it is now producing data — it was inert before that,
reporting to nobody. *Protects against:* the F2 stored-XSS class, as defence in
depth. *Timing:* **after, deliberately.** Enforcing today breaks the site: the
build inlines every script (`dist/_astro` holds no `.js`), so `script-src 'self'`
would silently kill the subscribe form on 21 pages and both `/submit` validation
scripts. The ruled sequence is observation window → both editors read the
reports → nonce or extract → flip. **The one thing that is pre-launch here is a
decision, not a build:** the observation window opened 2026-07-29 and nobody has
reported reading the reports. Launch traffic is the best data this window will
ever get; it is worth deciding before Sunday whether anyone is watching it.

> **DECIDED, 2026-07-31.** Both editors commit to **reading the CSP reports
> during launch week** — the week beginning with Issue 1 on 2026-08-03. This does
> not schedule the flip to enforcement, deliberately: the sequence stays
> reporting endpoint → observation window read by both editors → enforcement with
> inline scripts nonced or extracted according to what the reports show. G1
> remains open. Recorded in the security review's corrections section as **C5**,
> appended rather than rewritten, with the index row left untouched — the same
> discipline C2 set.

## Open, operational — and this is the pre-launch cluster

**Three migrations had no recorded confirmation of being applied in
production.** `20260730120000_submission_version_tagging.sql`,
`20260730130000_fiction_truth_standard.sql`, and
`20260731000000_brief_variant.sql`. The letters migration was verified
2026-07-27; nothing in `docs/ops/` or the record covered these three. The ops
note from 2026-07-26 exists precisely because this happened before, and states
the lesson: *"'merged' and 'live' are separate facts, and a migration stays an
open checklist item until it is verified applied in production."*

> **RESOLVED IN PART, 2026-07-31 (human editor).** `20260731000000_brief_variant.sql`
> **is applied and verified** in the production `latent-review` project, applied
> 2026-07-30, with both verification queries returning the expected output
> (three `brief_variant%` columns; the `submissions_brief_variant_immutable`
> trigger present). `DOOR_DEAL_SALT` is set in Netlify as a secret environment
> variable and a deploy has run since. Recorded in
> `docs/ops/2026-07-30-brief-variant-live.md`.
>
> **The other two remain open and unverified.** Version-tagging and fiction are
> *not* to be assumed applied. *Timing:* **before Sunday, both.** The fiction one
> has a visible consequence while it is open — `docs/SCRATCH-DOOR.md:255` flags
> that until `20260730130000` is applied, **a fiction submission is rejected at
> the database**, while both `/door` briefs invite fiction and the contract
> advertises it. Not a vulnerability; a door that says yes and a database that
> says no.

**`brief_variant` publication surface is unbuilt.**
`docs/SCRATCH-BRIEF-VARIANT.md:156-175` flags it as a follow-up and says plainly
it is not small: a new frontmatter field, a copy-at-publication step, a
provenance-aside line, and a decision across `issues.json` / `feed.json` /
JSON-LD, all three carrying add-only stability contracts.

> **CORRECTED, 2026-07-31.** This entry first called it a pre-Sunday item on the
> strength of the scratch doc. That over-read the ruling. R-033 clause 6 gates
> publication on the brief being **recorded**, which is what the applied
> migration is — not on the display surface. The human editor ruled this on
> PR #75's findings on **2026-07-30**, after the scratch doc was written, and the
> ruling is recorded in the migration file's own footer. The display ships early
> the following week. **Not an Issue 1 blocker.**

## Open, disclosure-surface

**No `/.well-known/security.txt` exists.** `security@thelatentreview.com` is
published in exactly one place — `/for-agents:383`. It is not on `/about`.
*Protects against:* a finder having nowhere obvious to send a report, which is
how findings become public before they become fixed. *Timing:* **before Sunday** —
it is a static file and costs nothing, and the journal invites agents to report
vulnerabilities.

## Open by design

**C-11 — security sign-off on the reopened `type` pin.** Recorded "open by
design until (c2) review" in `docs/AGENT-DIRECT-SLICE-C.md:738`; the (c2) mark-up
(`9c86bec`) records "preliminary concurrence, formal sign-off at the build PR."
(c2) merged as #48.

> **CHECKED, 2026-07-31 — the sign-off does not exist.** PR #48's GitHub
> conversation was queried directly. It holds **zero reviews**, **zero
> review comments**, and **one issue comment**, which is the Netlify deploy-preview
> bot. Nothing else.
>
> What does exist is the **request**. PR #48's title ends "(C-11 sign-off
> requested)" and its body carries a section headed "C-11 — formal security
> sign-off, requested," setting out the posture in five numbered points (three
> independent fail-closed enforcement layers; no new oracle; no new unmetered
> surface; no new write surface; counts cannot entangle) plus two named residual
> risks (the new archive reader in the refusal path; the widened 13-argument RPC
> signature). That same material already lives in the repository at
> `docs/SCRATCH-SLICE-C2.md` §5, "C-11 — security sign-off material (drafted for
> the review)." **So there is nothing to copy in — the submission was already in
> the record. What is missing is the grant.**
>
> The gap is that the PR merged with the request unanswered. RULINGS.md:203
> (R-024's preamble) states that reopening the F-min `type` pin "carries its own
> security sign-off at the (c2) build review" — a commitment made in the
> append-only log and, on this evidence, not discharged.
>
> **This is a records failure, not a discovered vulnerability.** The posture it
> describes is real and is enforced in the built code: the endpoint allowlists two
> exact strings, the RPC re-validates against the same two literals and takes no
> default for `p_type`, the DB CHECK is the floor, and all three layers are
> probed separately by the SQL suite. Nothing here says the pin is unsafe. It says
> the review that was promised was never recorded as performed.
>
> *Timing:* the editors' call. Left for them to handle properly rather than
> papered over.

**The `agent_submitter` role.** Noted-not-built in slice (a) and (c). "Cannot
read the queue" holds at the agent-key level; the function's own credential is
`service_role` and could read the queue. *Timing:* **after.**

**Anon-path bypass for the human door.** F1's cross-cutting note: the
human-attested intake form's own guardrails are bypassable unless human-attested
intake also routes through an RPC. Currently moot — `/submit` posts to Netlify
Forms, not the database. It becomes live the day the banked human-door DB path is
built. *Timing:* **after.**

## Closed (recorded so they are not re-opened)

F1, F2, F3, F5, F8, F-min (PRs #34/#35); F4 both halves (C2, R-023 dials);
`AGENT_KEY_SALT` leak — rotated before any key was ever issued, disclosure
published at `docs/disclosures/2026-07-25-agent-key-salt-rotation.md`.

## One item not in any doc — found in this read

`src/lib/deal-token.mjs` parses the token's `issued` timestamp and validates its
*shape* (`/^\d{1,12}$/`) but **never checks its age**, and `verifyDealToken` is
called at `agent-submit.mts:381` with no max-age argument. A deal token is
therefore valid forever and reusable across unlimited submissions. Severity is
genuinely low — the token grants no privilege and populates one metadata field —
and the doc already discloses the larger residual (`/door` is unauthenticated, so
an author can reroll until dealt the variant they prefer). But "deals issued are
50/50; deals redeemed are not" understates it slightly: one token can back many
submissions. `dealTokenIssuedAt()` exists and is exported, so the desk can see
the age; nothing enforces it. *Timing:* **after** — recommend recording it rather
than building to it.

---

# 3. PROVENANCE vs ARRIVAL

The human editor's report is correct, and the merge is in more than one place.
Two genuinely different axes are involved — and, as the editor's footer note
surfaced, a third sense of the word:

- **Involvement tier** (authorship): AI · AI + Human (editor) · AI + Human ·
  AI = Human · Human + AI · Human + AI (editor) · Human. Required on
  human-attested, *forbidden* on agent-direct.
- **Submission track** (arrival): `human-attested` | `agent-direct`.
- **Repo provenance** (the git history as proof), a third meaning entirely.

## Where they merged

**(1) In the data model — `provenance_label`, and this is the root.**
`src/content.config.ts:59` defines one free-text string that means different
things per track. On human-attested it encodes the *tier*: `'AI + Human: AI led,
a human contributed substantively; attested by Amy Louise Frederick'`. On
agent-direct it is forced by schema validation (`:80-86`) to be exactly the
*arrival* caveat: `'provenance as claimed by the author; not independently
verifiable'`. One field carrying an authorship claim on one track and an arrival
disclaimer on the other. Present since the initial scaffold (`c2ce95c`) — this
was never introduced by a later PR, it was the original shape.

**(2) On `/archive` — a single slot labelled "tier" that holds either.**
`src/pages/archive.astro:21-30`:

```
const tier =
  d.submission_track === 'agent-direct'
    ? 'agent-direct'
    : TIER_LABELS[d.involvement_tier ?? ''];
return `By ${d.author_name} · ${tier}`;
```

A variable named `tier`, a function named `coverTierLine`, and an arrival-track
value printed into it. Introduced in **PR #19** (`c4a3c86`, issue archive &
permalinks). **PR #21** (`8050db5`, provenance v2) touched this exact line and
improved the human-attested branch from `Tier ${code}` to the display label — but
preserved the collapse. So a reader sees `By X · AI + Human` on one issue and
`By Y · agent-direct` on the next, in the same visual slot, as if those were two
values of one thing. The lowercase `agent-direct` against title-case tier labels
is the visible seam.

**(3) In the footer — the word "provenance" points at two destinations.**
`src/layouts/Base.astro:231` links `Provenance` → `/provenance/` (the tier
standard). Twelve lines below, `:237` links `source & provenance` → the GitHub
repo. The repo link is original (`c2ce95c`); the `/provenance/` link is new —
added in **PR #60** (`dad71e2`), where Supporters left the governance row and
Provenance took the vacated slot. **PR #60 created the collision:** before it,
"provenance" appeared once in the footer and meant the repo. Now it appears
twice, in adjacent rows, meaning two different things.

## What each surface currently shows

| Surface | Tier | Track | Notes |
|---|---|---|---|
| **Article page** — `ProvenanceBlock.astro` | Separate row, suppressed when absent | Separate row, "Human-attested" / "Agent-direct" | **Actually correct.** Both axes are distinct rows. But the block *ends* with a "Label" row quoting `provenance_label` — so an agent-direct piece shows `Submission track: Agent-direct`, **no tier row at all**, then `Label: "provenance as claimed by the author…"`. The reader's eye lands on that caveat in the position a tier would occupy. |
| **`/archive`** | Collapsed | Collapsed | One slot, either value. The merge is visible here. |
| **`ArticleCard`** (homepage, sections) | Neither | Neither | Shows model version, truth standard, date only. |
| **`IssueContents`** cover byline | Neither | Neither | Author + model version only. |
| **`/provenance`** | The canonical tier table | **Never mentioned** | The page defining the standard does not say the track exists, or that agent-direct carries no tier. |
| **`/rss.xml:33`** | — | — | `By X (model) — {provenance_label}`. For agent-direct, the arrival caveat reads as an authorship claim in byline position. |
| **`/llms.txt:24`** | — | — | `provenance: {provenance_label}`. Neither axis by name. |
| **JSON-LD** (`structured-data.ts:141`) | — | — | `AI author. Model version: X. Provenance: {label}` |
| **`/feed.json`, `/issues.json`** | `involvement_tier` + `involvement_tier_display` | `submission_track` | **Fully separated, plus `provenance_label` as a third field.** |
| **`/admin`** (`:328-329`) | Separate | Separate | Separated. |
| **`/submit`** | Required select, seven tiers | Implicit in the door | Collects tier + a free-text attestation; the arrival axis is never named because the door *is* the answer. |

## The shape of it

The **machine surfaces got this right and the human surfaces did not.**
`feed.json` and `issues.json` carry three clean fields; `/archive` carries one
muddled one; `/provenance` carries only half the model. That inversion is worth
naming, because the journal's whole argument is that the machine-readable record
is the serious one — and here it happens to be true.

Two structural facts the editors will want in hand before ruling:

- `provenance_label` is a **single free-text string doing two jobs**, and
  CLAUDE.md makes it immutable at acceptance. Whatever separation is ruled, it
  cannot be applied retroactively to already-accepted labels — it binds what is
  accepted next. No piece is published yet, so the window is open now and closes
  with Issue 1.
- The word "provenance" currently carries **three senses** on the site: the tier
  standard (`/provenance`), the arrival caveat (`provenance_label` on
  agent-direct), and the git history (`source & provenance` → GitHub). The naming
  question is not only tier-vs-track.

---

*No files outside this one were modified in producing these findings.*
