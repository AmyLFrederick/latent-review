# Agent-Direct — §9 Security Review

> **Status: RECORD ARTIFACT — reviewed security record of the agent-direct
> track.** This is the permanent record of the §9 security review of
> [docs/AGENT-DIRECT-PROPOSAL.md](AGENT-DIRECT-PROPOSAL.md), preserved beside
> the proposal so the findings and their dispositions sit in the provenance
> record. It documents a review already performed and acted on: findings were
> raised, ruled on by both editors, and either remediated in a merged PR or
> assigned to a named remaining slice. Each finding below carries its
> disposition. Nothing in the journal was published while any of these findings
> was open — no piece is published before Issue 1 — so the render-path findings
> were **latent until publication**, not live production exposure, and the
> load-bearing ones were closed before any intake path existed.

**Reviewer:** Claude, in Claude Code. The findings were verified against the
live codebase before being raised; each disposition records the editors' ruling
on that finding.
**Subject:** `docs/AGENT-DIRECT-PROPOSAL.md` §9.
**Basis:** verified against the codebase at `main` as of `48ec20e` (the review
baseline). Every claim in the proposal about existing machinery was checked
against schema, RLS, functions, and every render path — not taken on faith.
**Disposition baseline:** remediations landed in PR #34 (render-path hardening +
security headers) and PR #35 (agent-direct slice (a): identity/key/caps schema,
RLS, F1 policy, SECURITY DEFINER RPCs). Remaining items are assigned to
slices (c)/(d)/(e), each its own reviewed PR.

**Severity key:** 🔴 High · 🟠 Medium · 🟡 Low · ✅ Verified-safe.
**Status key:** ✔ Fixed (merged) · ◻ Deferred to a named slice.

---

## Finding index

| ID | Sev | One-line | Primary surface | Disposition |
|----|-----|----------|-----------------|-------------|
| F1 | 🔴 | Agent-direct rows could bypass all guardrails via the public anon INSERT grant | `20260717120000_editors_desk.sql:75-86` | ✔ Fixed — PR #35 (slice a) |
| F2 | 🔴 | Stored XSS via JSON-LD (`</script>` in submitter fields) | `articles/[slug].astro:20-36` | ✔ Fixed — PR #34 |
| F3 | 🟠 | XML injection in RSS `customData` (unescaped `author_name`) | `rss.xml.js:25` | ✔ Fixed — PR #34 |
| F4 | 🟠 | Monthly cap unenforceable on the rate limiter; cap checks were racy | `ratelimit.mts:28-58` | ✔ Global cap — PR #35 (slice a); ◻ flood caps — slice (c) |
| F5 | 🟠 | "Cannot read the queue" was app-enforced, not DB-enforced | `supabase.mts:7-24`, `subscribe.mts:67` | ✔ Fixed — PR #35 (slice a) |
| F6 | 🟠 | Screen must cover all submitter fields; AI-pass prompt under-isolated some | `ai-editor-pass-background.mts:229-238` | ◻ Deferred — slice (c)/(e) |
| F7 | 🟠 | The "existing nightly batched pass" did not exist (manual only) | `netlify.toml`, `ai-editor-pass-background.mts:130` | ◻ Deferred — slice (e) |
| F8 | 🟡 | Net-new machinery confirmed absent; each piece needs RLS from day one | schema / functions | ✔ Tables built — PR #35 (slice a); ◻ later tables per slice |
| F-min | 🟡 | `type` field trusted from caller on the agent path | `20260717120000_editors_desk.sql:75-78` | ✔ Fixed — PR #35 (slice a) |
| G1 | 🟠 | No security response headers | `netlify.toml` | ✔ Fixed — PR #34 |
| G2 | 🟠 | Notifier email-context: submitter strings untrusted (header injection) | slice (d) | ◻ Deferred — slice (d) |

Verified-safe items and the Q1 notifier analysis follow the findings.

---

## F1 — Agent-direct rows could bypass the entire guardrail stack via the public anon INSERT grant 🔴

**Severity:** High. This determined whether §3/§4/§5/§6 were enforceable at all.
**Disposition:** ✔ **Fixed in PR #35 (slice a).**

**Affected surface:** `supabase/migrations/20260717120000_editors_desk.sql:75-86`
(anon column-restricted INSERT + `submissions_public_insert` policy);
reachable with the public anon/publishable key (`admin.astro:54` ships it to
browsers).

**Evidence / risk:** The anon role held a column-restricted `INSERT` on
`submissions` covering `submission_track` and `type`; the insert policy's only
`WITH CHECK` was `status='new'` and votes-null. The publishable key is public by
design, and Supabase PostgREST is a public endpoint. So anyone could `POST`
directly to `…/rest/v1/submissions` with the anon key and insert a row with
`submission_track='agent-direct'`, entirely bypassing `POST /api/agent/submit`
and therefore **every guardrail the proposal placed in the function**:
identity/ban check (§3), injection pre-filter (§6), rate limits and the monthly
cap (§4), and word-count (§4). The DB CHECKs still bounded per-row size
(`body` ≤ 40 000 chars), so the accepted "a flood burns disk, not tokens"
tradeoff (CLAUDE.md) held — but caps, screening, and identity were all
function-level and thus evadable. This path was reachable at the DB layer on
`main` before any intake form existed; its effect was **latent until
publication** (no accepted piece is published before Issue 1), and it was closed
before the endpoint was built.

**Remediation (applied):** agent-direct was made **function-only at the DB
layer**. The anon insert policy was tightened to
`with check (… and submission_track = 'human-attested')` so anon can insert
human-attested only; agent-direct rows are written solely by a
`SECURITY DEFINER submit_agent_direct(...)` RPC (see F5). `type` is pinned
server-side for agent-direct (see F-min). This was slice (a) and was
load-bearing: without it, slices (b)–(e) would have been decorative.

**Cross-cutting (Task 5 / PR #5):** the same anon path means the future
human-attested intake form's own rate-limit / word-count / screen guardrails are
equally bypassable unless human-attested intake also routes through an RPC — a
decision recorded for that track.

---

## F2 — Stored XSS via JSON-LD 🔴

**Severity:** High. Public render path; would have affected every reader (and
the editors).
**Disposition:** ✔ **Fixed in PR #34.**

**Affected surface:** `src/pages/articles/[slug].astro:20-36`.

**Evidence / risk:** `jsonLd = JSON.stringify({ headline: d.title, author: {
name: d.author_name, description: \`…${d.author_model_version}…${d.provenance_label}\` } … })`
was injected raw via `<script type="application/ld+json" set:html={jsonLd}
is:inline>`. `JSON.stringify` does **not** escape `<` or `/`, so any of
`title` / `author_name` / `author_model_version` / `provenance_label`
containing `</script>` would close the tag and execute arbitrary script in every
reader's browser. For agent-direct these fields are attacker-controlled; the
only gate is human acceptance, and editors review the *piece*, not the byline
string for `</script>`. (The visible `{d.title}` / `{d.author_name}` fields on
the same page are Astro auto-escaped and were safe — only the `set:html` JSON-LD
sink was raw.) Because nothing is published before Issue 1, this was **latent
until publication**: it would have activated on the first published piece
carrying a hostile field, not before.

**Remediation (applied):** before `set:html`, the stringified JSON-LD has its
`<`, `>`, and `&` replaced with the JSON unicode escapes `\u003c`, `\u003e`,
and `\u0026`. Unicode escaping is used deliberately rather than HTML-entity
escaping: the payload is JSON inside the `<script>`, so HTML entities (`&lt;`)
would **corrupt the JSON-LD** — a parser would read them as literal characters
and the structured data would be wrong — whereas `\u003c` is valid JSON that
renders to the same character yet cannot form the `</script>` sequence that
closes the tag. This closed the sink ahead of any publication.

---

## F3 — XML injection in the RSS feed 🟠

**Severity:** Medium–High. Public feed; would corrupt/inject for every RSS
consumer.
**Disposition:** ✔ **Fixed in PR #34.**

**Affected surface:** `src/pages/rss.xml.js:25`.

**Evidence / risk:** `customData: \`<dc:creator>${article.data.author_name}</dc:creator>\``.
`@astrojs/rss` escapes `title` / `description` / `content`, but **`customData`
is raw XML by contract** and was not escaped. An `author_name` containing `&`,
`<`, `>`, or `]]>` would produce invalid XML or inject into the feed.
Attacker-controlled for agent-direct; latent until the first published piece,
as with F2.

**Remediation (applied):** `author_name` is entity-escaped
(`& < > " '` → XML entities) before interpolation into `customData`. The same
escape applies to any future submitter field added to `customData`.

---

## F4 — Monthly cap was unenforceable on the rate limiter; cap checks were racy 🟠

**Severity:** Medium. Undermined the §4 cost/queue cap for the agent path.
**Disposition:** ✔ **Global monthly cap fixed in PR #35 (slice a);**
◻ **short-window flood caps deferred to slice (c).**

**Affected surface:** `netlify/lib/ratelimit.mts:28-58`.

**Evidence / risk:** two problems.
1. **Non-atomic (check-then-insert):** `overLimit` SELECTed a count, compared to
   `max`, then INSERTed. Concurrent agent requests (machine speed) could both
   read a near-full count and both pass — the cap was overshootable under
   concurrency.
2. **Windows > 24h were structurally impossible here:** the opportunistic prune
   (`:52-57`) deletes `rate_limit_events` older than 24h. The **monthly**
   submission window (30 days) could therefore never be counted from this
   table — the rows it would count were already gone.

**Remediation (applied + deferred):** the **global** agent-direct monthly cap
now counts `submissions` rows for the track since calendar-month start (a
durable source of truth) **atomically**, inside the `submit_agent_direct` RPC,
serialized by a `SELECT … FOR UPDATE` row-lock on the `agent_caps` row so
concurrent inserts cannot both pass (PR #35). Counting is status-agnostic — no
refunds. The reusable count primitive is `agent_submission_count(...)`.
**Deferred to slice (c):** short-window flood caps (≤24h) and the per-identity
monthly ceiling, both built on the same atomic primitive.

---

## F5 — "Cannot read the queue even with a valid key" was app-enforced, not DB-enforced 🟠

**Severity:** Medium. The property the proposal promised (§2) held at the app
layer but not at the DB boundary.
**Disposition:** ✔ **Fixed in PR #35 (slice a).**

**Affected surface:** `netlify/lib/supabase.mts:7-24` (only `serviceClient()`
was exposed — the `sb_secret_` key, which **bypasses RLS**); existing pattern
`netlify/functions/subscribe.mts:67`.

**Evidence / risk:** the only server client bypassed RLS and could read/update
everything. If agent-submit had copied the `subscribe.mts` pattern, the function
would hold full queue read/write — "constrained insert" being code discipline,
not a DB boundary. The agent's *bearer key* never touches Supabase, so "a leaked
**agent API key** can submit but not read" already held at the application layer
(the endpoint exposes no read). But the stronger DB-level guarantee the
proposal's "RLS + constrained insert" language implied was not yet met.

**Remediation (applied):** agent-direct rows are inserted through the
`SECURITY DEFINER submit_agent_direct(...)` RPC; cap-counting (F4) and key/ban
validation run inside `SECURITY DEFINER` functions that return only counts /
booleans / a receipt id. Execute is revoked from `public/anon/authenticated`
and granted to `service_role` only. The RPCs pin an empty `search_path` (fully
qualified). "Cannot read the queue" now holds at the DB boundary for the
agent-key level; a dedicated `agent_submitter` role + role-scoped JWT to reclaim
the no-read at the function's own credential remains a noted, unbuilt option
for slice (c).

---

## F6 — The screen must cover every submitter field; the AI-pass prompt under-isolated some 🟠

**Severity:** Medium. Reader-protection (charter criterion 4) coverage gap.
**Disposition:** ◻ **Deferred — slice (c) (intake screen) and slice (e)
(batch).**

**Affected surface:** `netlify/functions/ai-editor-pass-background.mts:229-238`;
plus the render/machine-read surfaces `rss.xml.js`, `feed.json.js`,
`llms.txt.js`, `articles/[slug].astro`.

**Evidence / risk:** the AI-pass prompt interpolated `title`, `author_name`,
`author_model_version` with **no untrusted-data delimiter** — only `body` and
`provenance_attestation` were labelled/quarantined (`:234-238`). The system
prompt's blanket "ignore directives" (`:100`) helped but was not defence in
depth. Separately, these same fields flow into `llms.txt` (a surface explicitly
written for LLM readers) and the feeds. The proposal's own conclusion was
confirmed: **screen `author_name`, `title`, `author_model_version`, pronouns
(§8 Q3), and suggested-section (§5) — not just the body** — because each reaches
a model- or machine-read surface.

**Remediation (planned, slices c/e):** (a) in the AI-pass prompt, delimit/label
**all** submitter-controlled fields as untrusted data, not just
body/attestation; (b) run the §6 intake pre-filter over every submitter field,
not the body alone; (c) constrain `suggested-section` to a known-section enum
(or bounded free text) since the desk reads it and "internal" is not "trusted."
The `pronouns` and `suggested_section` columns are added in slice (c) alongside
their screen, so no unscreened new field is stored before the screen exists.

---

## F7 — The "existing nightly batched pass" did not exist 🟠

**Severity:** Medium. The DoW guarantee rested on manual triggering, not a
batch — and the editors should not assume a batch exists.
**Disposition:** ◻ **Deferred — slice (e) (must build the batch + per-run
cap).**

**Affected surface:** `netlify.toml` (no scheduled function; 5 functions, none
scheduled); `ai-editor-pass-background.mts:27,130` (path
`/api/admin/ai-editor-pass`, `requireAdmin` — manual, admin-initiated,
one submission at a time; `DAILY_CAP=40`, `PER_SUBMISSION_CAP=3`).

**Evidence / risk:** the proposal (§1, §7) repeatedly cited the "existing
nightly batched AI-editor pass" as the pickup mechanism for agent-direct rows.
It did not exist. What existed was a manual, per-submission, admin-triggered
pass. The "submissions never auto-trigger an API call" rule holds precisely
*because* it is manual — but there was no batch and no per-run batch cap, and
agent-direct rows would otherwise sit until an editor manually requested each
pass.

**Remediation (planned, slice e):** slice (e) must **build** the nightly batch
and carry a hard **per-run** cap into it (mirroring `DAILY_CAP` /
`PER_SUBMISSION_CAP`). Until then, agent-direct review is manual. Downstream
docs must not describe the batch as pre-existing.

---

## F8 — Net-new machinery confirmed absent; each piece needs RLS from day one 🟡

**Severity:** Low (informational), but scoped slices (a)/(b)/(d).
**Disposition:** ✔ **Slice-(a) tables built with RLS from day one (PR #35);**
◻ **later tables (key issuance, notifier, pronoun field) carry the same
requirement per slice.**

**Affected surface:** schema (`content.config.ts`, migrations); functions dir.

**Evidence:** at the baseline no `identities`, `api_keys`, or `bans` tables
existed; no `pronouns` field on the article schema or submissions table; no
notifier; no anon-scoped insert helper. The schema **did** correctly anticipate
the track (`submission_track` CHECK; `involvement_tier_matches_track` forces NULL
for agent-direct; v2 tier codes per `20260718120000_provenance_v2_tiers.sql`).
So slice (a) migrations, (b) key issuance (hash-only), (d) notifier, and the
§8 Q3 pronoun field were genuinely new.

**Remediation (applied + standing):** slice (a) built `agent_identities`,
`agent_api_keys`, and `agent_caps` with RLS enabled and column-restricted grants
from day one, mirroring the `editors_desk` pattern (revoke-all-then-grant-back,
plus an in-migration `has_table_privilege` / `has_column_privilege` probe that
fails the migration if a grant did not apply). Keys are stored as **hashes**
only (salted SHA-256, mirroring the `RATE_LIMIT_SALT` pattern). Standing
requirement for later slices: every new table ships with RLS and restricted
grants from day one; `pronouns` is added inside the §6 screen/encode surface
(slice c).

---

## F-min — `type` trusted from the caller on the agent path 🟡

**Disposition:** ✔ **Fixed in PR #35 (slice a).**

**Affected surface:** `20260717120000_editors_desk.sql:75-78` (anon grant
included `type`).

**Risk:** the anon grant exposed `type` (`submission | correspondence`); a
direct insert (F1) or an under-validated endpoint could set an unexpected `type`
on an agent-direct row.

**Remediation (applied):** `type='submission'` is pinned server-side inside the
`submit_agent_direct` RPC for the agent path; agent-direct rows can no longer be
created on the anon path at all (F1).

---

## G1 — Security response headers 🟠

**Severity:** Medium. Defence-in-depth for the F2 XSS class and general
hardening.
**Disposition:** ✔ **Fixed in PR #34 (config-only).**

**Affected surface:** `netlify.toml`.

**Evidence / risk:** Netlify ships no security headers by default.

**Remediation (applied):** PR #34 added `Content-Security-Policy` (started as
`Content-Security-Policy-Report-Only`, to tighten after violation review),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security`, `Referrer-Policy`, and `Permissions-Policy`. The
CSP is defence-in-depth for the F2 XSS class.

---

## G2 — Notifier email context 🟠

**Severity:** Medium. Header-injection / CRLF class on the notifier path.
**Disposition:** ◻ **Deferred — slice (d) (recorded in its design).**

**Evidence / risk:** submitter-controlled strings must be treated as untrusted
in the **email** context specifically.

**Remediation (planned, slice d):** strict format validation on the recipient
address, and **no submitter field ever interpolated into an email header**
(header-injection / CRLF class). Recorded in the slice (d) design.

---

## Verified-safe (checked, no change needed) ✅

- **Admin desk render path.** `admin.astro` escapes every interpolated field
  with a correct, complete `esc()` (`:68-72`, entity-encodes `& < > " '`) and
  renders the body `esc()`-then-`\n→<br>` (correct order). The admin session is
  privileged (RLS grants queue read only to the admin JWT), so this mattered —
  and it held.
- **Screening-model fail-closed + enum (§9 item 6).** `PASS_SCHEMA` (`:56-92`)
  enum-constrains `assessment` / `recommendation` / `confidence`. Model refusal
  → `status='failed'`, "review manually" (`:244-253`); rate-cap failure,
  criteria-load failure (incl. the criteria-not-ratified lock), and JSON-parse
  failure all fail closed. The pass is **advisory**; the dual-yes human gate is
  the real containment. Free-text pass fields render only in the `esc()`'d admin
  UI.
- **Auto-escaped render paths.** `ProvenanceBlock.astro` and the visible article
  fields use `{expr}` (auto-escaped); `feed.json.js` / `issues.json.js` go
  through `JSON.stringify`; `llms.txt.js` is `text/plain` (no XSS — but in scope
  for F6's content screen).
- **Schema anticipates agent-direct.** `submission_track` CHECK includes
  `agent-direct`; `involvement_tier_matches_track` forces `involvement_tier IS
  NULL`; tier codes migrated to v2. The proposal's §0 claim is accurate.

---

## Q1 notifier oracle (§9 item 9)

name-only + always-neutral-on-fraud/injection **closes** the iteration oracle,
provided two things also hold:
1. the §5 intake validation error stays **truly generic** — no field-by-field
   "which field failed," which would be an equivalent oracle at machine speed;
   and
2. the notifier's only outputs are `{failed_criterion_name}` or the neutral
   message, with fraud/injection flags **hard-routed** to the neutral branch.

**Disposition (slices c/d):** encode the notifier output as a fixed enum
(criterion name from the desk-reject log, or neutral), not free text; keep
intake validation errors generic. The slice (a) RPC already keeps its exception
text generic (`LR401` neutral auth, `LR429` cap full, `LR500` misconfig) — no
field-level oracle.

---

## §9 checklist coverage map

| §9 item | Finding(s) |
|---------|-----------|
| Registration / identity abuse & cap evasion (§3) | F1, F4, F8 |
| Key issuance, hash-only, rotation, revocation latency | F5, F8 |
| Intake injection screen threat model + false positives | F6 |
| Sanitization / encoding audit of every render path | F2, F3, ✅ (admin, feeds, provenance) |
| Injection screen coverage of all published fields | F6 |
| Injection against the screening model (enum + fail-closed) | ✅ (+ F6 field-labelling) |
| Validate internal-only suggested-section | F6 |
| Endpoint auth cannot read/mutate the queue | F1, F5 |
| Q1 notifier closes the oracle | Q1 analysis |

---

## Design changes the review forced, and where they landed

1. **F1** — RLS policy: anon inserts `human-attested` only; agent-direct is
   function/RPC-only. → **PR #35 (slice a).**
2. **F5** — insert + cap-count + key/ban checks via `SECURITY DEFINER` RPCs so
   "cannot read the queue" is DB-enforced. → **PR #35 (slice a).**
3. **F4** — monthly cap counts `submissions` durably + atomically; not
   `rate_limit_events`. → global cap **PR #35 (slice a)**; flood caps **slice
   (c).**
4. **F2, F3** — fix JSON-LD and RSS-customData encoding before agent-controlled
   fields can reach them. → **PR #34.**
5. **F6** — screen + delimit all submitter fields; constrain suggested-section.
   → **slices (c), (e).**
6. **F7** — build the nightly batch with a hard per-run cap; it did not exist.
   → **slice (e).**

---

## Sequencing (as executed)

F2 and F3 were **latent** XSS / injection holes — dormant only because nothing
is published before Issue 1, but they would have bitten the human-attested track
and any accepted piece regardless of agent-direct on first publication. The
review recommended, and the editors executed:

1. **A standalone hardening PR first: F2 + F3 + G1** (JSON-LD escape + RSS
   `customData` escape + security headers). Fast, self-contained. → **PR #34.**
2. **Then the agent-direct slices (a)–(e)**, with **F1 / F5 / F8 / F-min**
   folded into slice (a) (migrations + RLS + RPC + identity/key tables) →
   **PR #35**; **F4 / F6** into slice (c) (endpoint + caps + screen); **G2**
   into slice (d) (notifier); **F7** into slice (e) (batch + per-run cap). Each
   slice its own reviewed PR; nothing merges without both editors; GET never
   mutates; submissions never auto-trigger AI calls.

---

## Standards gap-check additions (commissioned by the human editor)

An outside-standards gap check (OWASP API Top 10, OWASP LLM Top 10, Supabase
production checklists) against this review found the standards well covered and
added two items, both recorded above as G1 and G2:

- **G1 — Security response headers (netlify.toml).** 🟠 Added in PR #34
  (config-only), defence-in-depth for the F2 XSS class.
- **G2 — Notifier email context (slice d).** 🟠 Treat submitter-controlled
  strings as untrusted in the **email** context specifically; recorded in the
  slice (d) design.

Editor-side actions (not the AI editor's): Supabase dashboard hardening (SSL
enforcement, RLS-on-new-tables toggle, account MFA) and GitHub Dependabot +
secret-scanning push protection — handled by the human editor.

---

## Provenance note

This artifact records a review performed at baseline `48ec20e` and its
dispositions as of the slice-(a) merge (PR #35). Line references point to the
baseline; where a finding was fixed, the fix lives in the cited PR and the
current code differs from the quoted lines. Findings F4 (flood caps), F6, F7,
and G2 remained open against named slices at the time this artifact was
committed, and are tracked there.
