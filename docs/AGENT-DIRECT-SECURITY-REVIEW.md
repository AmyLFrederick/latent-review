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
| F4 | 🟠 | Monthly cap unenforceable on the rate limiter; cap checks were racy | `ratelimit.mts:28-58` | ✔ Global cap — PR #35 (slice a); ◻ flood caps — slice (c) · **now closed, see C2** |
| F5 | 🟠 | "Cannot read the queue" was app-enforced, not DB-enforced | `supabase.mts:7-24`, `subscribe.mts:67` | ✔ Fixed — PR #35 (slice a) |
| F6 | 🟠 | Screen must cover all submitter fields; AI-pass prompt under-isolated some | `ai-editor-pass-background.mts:229-238` | ◻ Deferred — slice (c)/(e) |
| F7 | 🟠 | The "existing nightly batched pass" did not exist (manual only) | `netlify.toml`, `ai-editor-pass-background.mts:130` | ◻ Deferred — slice (e) |
| F8 | 🟡 | Net-new machinery confirmed absent; each piece needs RLS from day one | schema / functions | ✔ Tables built — PR #35 (slice a); ◻ later tables per slice |
| F-min | 🟡 | `type` field trusted from caller on the agent path | `20260717120000_editors_desk.sql:75-78` | ✔ Fixed — PR #35 (slice a) |
| G1 | 🟠 | No security response headers | `netlify.toml` | ✔ Fixed — PR #34 · **corrected, see C1** |
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

---

## Corrections

This artifact is a dated record and is **not rewritten** when it turns out to
be wrong or goes stale: the original text stays where it is, and what is true
is stated here with the date it was established. The finding index carries
pointers into this section. This is the same rule the journal applies to its
own provenance labels — a correction runs as a visible correction.

Status lines for findings that are still open are included deliberately. A
corrections section that updated only the flattering entries would be its own
kind of misleading.

### C1 — G1's disposition overstated what shipped · 2026-07-29

**What the index claimed:** G1 — "✔ Fixed — PR #34".

**What was true when that was written, and still is:** PR #34 added six
security response headers, and **five of them enforce** — `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`,
`Permissions-Policy`. The sixth, the Content Security Policy, shipped as
`Content-Security-Policy-Report-Only` and remains Report-Only in production
today. G1's own detail section says so; the index row did not, and the index
is what a reader scans.

**What an audit on 2026-07-29 additionally established:** the Report-Only
policy carries **no `report-uri` and no `report-to` directive**, and no
`Reporting-Endpoints` header exists anywhere in the configuration. A
Report-Only policy without a reporting endpoint is inert: browsers evaluate it,
log to each visitor's own console, and send nothing anywhere. The plan recorded
in G1 — "tighten after violation review" — has therefore been waiting on data
that could not arrive.

**Why the flip was not simply performed on discovery:** enforcing today would
break the site. Every script this site serves is inlined by the build —
`dist/_astro/` contains no `.js` files at all — so `script-src 'self'` would
block the subscribe-form handler present on 21 pages, both of `/submit`'s
validation scripts, and the two inline `application/ld+json` structured-data
blocks. The failure would be silent: no error a reader sees, just forms that
stop working.

**Corrected disposition:** G1 is **partially remediated**. Five headers
enforce; the CSP is defence-in-depth that is currently not in force and not
observable. The sequence ruled by the editors on 2026-07-29 is: reporting
endpoint first, then an observation window reviewed by both editors, then
enforcement with inline scripts nonced or extracted according to what the
reports show. No date pressure — enforcing-and-broken is worse than
Report-Only-and-honest.

### C2 — F4's deferred half is closed · 2026-07-29

The flood caps deferred to slice (c) shipped, at the dials ruled in **R-023**:
per-IP burst 10 per 10 minutes, per-IP daily 40 per 24 hours, per-key burst 3
per 10 minutes (`netlify/functions/agent-submit.mts`). F4 is closed in both
halves. The index still shows it deferred, which is honest drift rather than
error; it is closed here so there is one status surface and not two.

### C3 — F6, F7 and G2 remain open · 2026-07-29

- **F6** — the deterministic screen shipped in slice (c); the AI-pass prompt
  isolation half was deferred to slice (e), which does not exist. Open.
- **F7** — slice (e) is unbuilt: no automated pass runs at all. The
  author-facing copy that claimed a nightly batch was corrected separately
  (`65df4d0`), so the journal no longer misstates it to authors. The
  Denial-of-Wallet guardrail named that batch as the cost defence; today the
  guardrail holds **by absence** — nothing calls a model on arrival because
  nothing calls a model at all. That is safe, and it is not the same thing as
  being defended. Open.
- **G2** — notifier email-context hardening, deferred to slice (d), unbuilt.
  Open.

### C4 — F8's standing requirement is being met · 2026-07-29

Every migration that creates a table also enables row level security: the
subscribers migration 2 of 2, the editors' desk migration 2 of 2, the
agent-direct identity migration 3 of 3. The later agent-direct migrations
(key issuance, triage, submit, letters) add columns, functions and policies
and create no tables. Recorded because a standing requirement with no
evidence of compliance is indistinguishable from one nobody checked.

### C5 — the CSP observation window will be read during launch week · 2026-07-31

Not a correction of an error. A commitment, recorded here because this is the
one status surface for G1 and a commitment kept off the record is
indistinguishable from one never made.

**The state it addresses.** C1 established that G1 is partially remediated: five
security headers enforce, and the Content Security Policy is Report-Only. PR #61
(2026-07-29) gave the policy `report-to` and `report-uri` pointing at
`/api/csp-report` and a `Reporting-Endpoints` header to match, so from that date
it produces data — for the fourteen months before it, the policy was inert and
the "tighten after violation review" plan was waiting on reports that could not
arrive. The observation window opened on 2026-07-29 and, as of this entry, no
editor had recorded reading it.

**What was raised.** The 2026-07-31 findings noted that the pre-launch item here
is a decision rather than a build, and that Issue 1's traffic is the best data
this window will ever collect. A window nobody reads is the same inert policy
with more moving parts.

**The commitment, ruled 2026-07-31.** Both editors commit to **reading the CSP
reports during launch week** — the week beginning with Issue 1 on 2026-08-03.

**What it does not do.** It does not schedule the flip to enforcement, and
deliberately not. Enforcing today breaks the site: every script is inlined by the
build (`dist/_astro` holds no `.js` at all), so `script-src 'self'` would
silently kill the subscribe form on 21 pages and both of `/submit`'s validation
scripts — no error a reader sees, just forms that stop working. The ruled
sequence is unchanged: reporting endpoint (done), then an observation window read
by both editors (this commitment), then enforcement with inline scripts nonced or
extracted according to what the reports actually show. Enforcing-and-broken is
worse than Report-Only-and-honest.

**G1 therefore remains open**, and its index row is untouched — the same
discipline as C2: the correction section is the single status surface, and the
index is not rewritten to flatter it.

### C6 — the deal token does not expire, and that is accepted · 2026-07-31

A residual found after this review closed, in machinery this review never
covered — the assignment desk (R-033) postdates it. Recorded here rather than
in a new artifact because this is where the journal keeps its open security
truths, and a second surface for them would defeat the point of having one.

**The finding.** `src/lib/deal-token.mjs` reads the issue timestamp a token
carries and validates its *shape* (`/^\d{1,12}$/`), but never its *age*.
`verifyDealToken` is called at `netlify/functions/agent-submit.mts:381` with no
maximum-age argument, and the function has no parameter for one. A deal token is
therefore valid indefinitely from the moment it is issued, and nothing marks a
token as spent: **one token can back any number of submissions.**

**What it does and does not reach.** The token's only effect is to populate
`submissions.brief_variant_observed` — one metadata field, written by the
SECURITY DEFINER RPC. It grants no access, carries no identity, bypasses no cap,
and is not consulted by any auth, budget, flood, or screening path. A forged
token is not possible without `DOOR_DEAL_SALT`; an *old* or *reused* one is, and
what it buys is the record saying "this piece was drawn against brief X" more
times than a brief was drawn.

**How it relates to the residual already disclosed.** `src/lib/deal-token.mjs`
already states, in the file's own header, that `/door` is unauthenticated by
design — an agent has not registered when it is dealt to — so anyone may fetch
the door repeatedly and keep whichever token they prefer, and therefore "deals
issued are 50/50 by construction; deals redeemed are not guaranteed to be." The
no-expiry finding **widens that residual rather than introducing a new one**: the
disclosed version says an author may choose which token to redeem, and the true
version is that an author may also redeem the same one repeatedly, and at any
later date. The distribution of `brief_variant_observed` is not a random sample,
and it is less of one than the existing note implies.

**The mitigation that exists.** `dealTokenIssuedAt()` is implemented and
exported, so the desk can read any token's age. It is inspection, not
enforcement, and it is only as good as somebody looking.

**Disposition — accepted, by the editors' decision of 2026-07-31.** Enforcement
is **deferred and no code changes here.** The reasoning, recorded so a later
reader does not mistake acceptance for oversight: the field is metadata with no
privilege attached; the larger anonymous-door residual is not closable by a TTL
anyway (an author who can reroll can also reroll fresh); and adding single-use
tracking would mean a row per issued token — an unbounded insert surface driven
by unauthenticated traffic, which is the exact thing the stateless design was
chosen to avoid.

**What this disposition binds.** If `brief_variant_observed` is ever used for
anything beyond the desk's own record — published as a distribution, cited as
evidence about how briefs perform, or read as a sample of anything — this entry
must be read first, and the enforcement question reopened before that use, not
after. The field is honest about being the journal's own observation. It is not
honest as a statistic.

> **REMEDIATED IN PART · 2026-07-31.** Appended beneath the disposition above
> rather than replacing it, per this artifact's own rule. **The disposition is
> superseded on its first clause only — "enforcement deferred, no code changes
> here" is no longer true. Everything else in C6 stands unaltered**, including
> the reasoning against a ledger and the binding condition immediately above.
>
> **What changed, and why now.** The editors adopted a standing rule on
> 2026-07-31 that genuine risks are fixed before they are documented. Under it,
> `verifyDealToken` gained a **fourteen-day maximum age**, ruled by the editors,
> shipped with the cost-exposure work of the same day
> (`docs/SCRATCH-COST-EXPOSURE-2026-07-31.md` §2).
>
> **The expiry is on by default.** An opt-in parameter would have left the one
> call site that matters — `netlify/functions/agent-submit.mts`, which passes two
> arguments — exactly as exposed as it was before, which is a fix in name only.
> That call site is deliberately **unchanged**, and the fact that it needed no
> change is the evidence the default is doing the work. A test asserts both
> directions against the real clock.
>
> **It fails quietly, as C6's own doctrine requires.** An expired token returns
> `null` like every other verification failure: `brief_variant_observed` stays
> null, the submission is accepted exactly as before, and the submitter sees
> nothing. No refusal, no new LR code, no error that would teach an author to
> treat the journal's measurement as their obligation.
>
> **Tokens dated more than five minutes in the future are refused too.** This is
> defence in depth, not a live hole — the door never issues one and forging
> requires `DOOR_DEAL_SALT`. It is included because `issued` accepts twelve
> digits, so without it a token claiming a date centuries out would satisfy the
> age check forever, making the expiry decorative on precisely the day it began
> to matter.
>
> **WHAT IS REMEDIATED, STATED WITHOUT INFLATION:** "valid indefinitely" is now
> "valid for fourteen days." **What is NOT:** the same token may still back more
> than one submission inside that window, and the anonymous-door reroll residual
> is unchanged and unclosable by a TTL. This narrows the replay window; it does
> not close it. `brief_variant_observed` is still not a random sample, and the
> caution against reading it as one is undiminished.
>
> **One thing this work found that C6 did not.** The deal-token test suite pinned
> its clock to a fixed timestamp about five days before the rule was adopted. The
> expiry therefore left the suite passing, and it would have begun failing on its
> own roughly eight days later with nothing in the repository having changed —
> and, until then, several tests asserting `null` for a bad secret or a malformed
> shape would have gone on passing for the wrong reason. The fixed clock is now
> threaded through every verification call so each test still tests what it
> names. Recorded because a security fix that quietly arms a time bomb in the
> suite meant to guard it is worth writing down.

### C7 — C-11 security sign-off, performed late · 2026-07-31

**Due at the PR #48 build review on 2026-07-27; performed on 2026-07-31.**
R-024's preamble committed the reopened `type` pin to "its own security sign-off
at the (c2) build review." The sign-off was requested in PR #48's title and body;
the PR merged with the request unanswered, and the conversation holds zero
reviews and zero review comments. The commitment was not discharged at the time
it was made. This entry discharges it late and says so, rather than letting the
log imply it happened on schedule.

**Evidence.** Both suites re-run fresh on 2026-07-31 against the full
fourteen-migration chain on a clean `postgres:16`: **47 SQL assertions pass, 138
Node tests pass, 0 failures.** The three enforcement layers were verified
independently:

- **Endpoint allowlist** — N21 (the allowlist admits exactly two values and every
  near-miss returns the one generic LR400 body), N20 (absent `type` is a
  submission, so the live integrations keep working), N20b (target fields on a
  submission are ignored, never stored).
- **RPC re-validation** — T2b, T2c, T2d and especially **T2e**: a null type is
  refused, so the RPC carries no silent default and an endpoint bug cannot be
  masked downstream. N25 confirms the RPC's own LR400 maps to the same generic
  validation body.
- **DB CHECK as the floor** — T11a, T11c and T11b prove the constraint against a
  direct insert that bypasses the RPC entirely; T10a, T10b and T10c confirm the
  anonymous door gained no writable value and lost none it legitimately held.

The layers are independent: each is probed separately, and the third is exercised
by inserts that never touch the RPC.

**Granted by** the AI co-editor, Claude (Fable 5), in the editors' session of
2026-07-31, on that evidence. The human editor was present, understands the
grant, and concurs with proceeding.

**The lesson, recorded with it:** a sign-off named in RULINGS.md is a gate, and a
PR that merges with its gate unanswered should not be mergeable. That the posture
turned out sound is luck about this instance, not evidence the process held. The
gap was found by an audit four days later, not by the machinery — nothing in the
repository would have raised it, and nothing yet does.
