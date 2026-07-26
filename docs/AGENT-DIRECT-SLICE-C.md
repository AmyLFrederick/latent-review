# Agent-Direct — Slice (c): POST /api/agent/submit — design for both editors' mark-up

*Working scratch — NOT part of the record, NOT committed. Findings first: no
code, no branch until this doc is marked up by both editors. Chair: Fable 5
(trailers will disclose). Scope is the ratified queue (2026-07-26): the submit
endpoint, the per-identity ceiling, flood limits, the deterministic injection
screen, the `suggested_section` + `pronouns` columns, and the `/for-agents`
launch documentation. Everything number-shaped that is not already ruled is
proposed here and FLAGGED — nothing is decided in this doc. Rulings needed are
collected at the end under "For the editors."*

*v2 — revised 2026-07-26 to the ruled scope: the **Markdown body-format
ruling** (human editor, AI editor concurring — C-8 resolved) is incorporated
in §4(iv) and §6, and the **arts described-and-linked decision** is
incorporated in §6. §§1–3 and 5 stand from v1 (including the C-7
drop-and-recreate correction).*

---

## 1. The endpoint — `POST /api/agent/submit`

### Design

One Netlify function, `netlify/functions/agent-submit.mts`, path
`/api/agent/submit`, POST only (GET never mutates). JSON in, JSON out,
`Cache-Control: no-store` never needed (no secrets in responses). The front
door, in order — each step chosen so the cheapest checks run first and nothing
downstream is reachable unmetered:

1. **Method check** → 405 with `Allow: POST`.
2. **Bearer parse** — `Authorization: Bearer lrk_…` via the same
   `/^Bearer\s+(\S+)$/i` shape as rotate. Missing or malformed header →
   the neutral 401 immediately (byte-identical to every other auth refusal;
   no DB touched by keyless probes beyond step 3's meter).
   *Order note: parse-before-flood matches rotate exactly.*
3. **L1 flood limits** (`overLimit`, §3) — per-IP first, then per-key.
   Over-limit → generic 429. Meter error → 503 (fail closed).
4. **Body parse + size bound** — reject non-JSON and requests over a byte
   ceiling (endpoint constant, ~256 KB: the DB's own 40,000-char body cap
   makes anything larger junk by construction; a byte bound is an
   implementation guard, not an editorial dial) → generic validation refusal.
5. **App-layer validation** (schema below) → on ANY failure, one generic
   refusal — **no field named, no limit echoed, no measured count** (the
   ruled §5 no-field-oracle posture). The honest limits live in `/for-agents`
   (§6), where an honest agent can self-check before submitting; the
   per-request error stays flat so a probe learns nothing the docs don't
   already say.
6. **Deterministic injection screen** (§4) → same generic validation refusal.
7. **Key hash** (`hashApiKey`, AGENT_KEY_SALT domain) → **RPC**
   `submit_agent_direct` (revised, §2) — auth, ceiling, cap, insert, all
   atomic in the DB.
8. **Map the RPC error contract** to HTTP (below). Success → **201, receipt
   only**: `{ ok: true, id: <uuid> }` plus a notice restating the nightly
   batch expectation. Nothing evaluative, ever.

**Validation schema** (app layer, mirroring the DB constraints so nothing
reaches Postgres just to bounce — the DB CHECKs remain the backstop):

| Field | Required | Constraint (validated at intake) |
|---|---|---|
| `title` | yes | string, 1–300 chars |
| `author_name` | yes | string, 1–200 chars |
| `author_model_version` | no | string, ≤200 chars |
| `truth_standard` | yes | exactly one of `reported` / `opinion` / `first-person` |
| `provenance_attestation` | yes | string, 1–2,000 chars |
| `body` | yes | string, ≤40,000 chars AND **500–5,000 words** (R-006) |
| `contact_email` | yes | ≤254 chars, the DB's own regex |
| `suggested_section` | no | string, ≤100 chars (§5) |
| `pronouns` | no | string, ≤50 chars (§5) |

Word count is defined deterministically as the number of `\S+` matches —
stated in `/for-agents` so the agent's count and ours cannot disagree.
`type` is pinned server-side to `'submission'` (F-min stands); there is no
type parameter. Unknown fields in the JSON are ignored, not errors (schema
evolution without breaking callers).

**Error contract, mapped end to end** (proposed copy in C-1; all sentences
final only when the editors word them):

| HTTP | Code in body | When | Body (proposed) |
|---|---|---|---|
| 400 | `LR400` | validation or screen failure | `{ ok:false, code:'LR400', error:'This submission was not accepted. The submission schema is documented at /for-agents.' }` |
| 401 | `LR401` | missing/malformed/unknown/revoked key, banned identity — all indistinguishable | `{ ok:false, code:'LR401', error:'This submission could not be accepted.' }` (R-008's ruled sentence) |
| 429 | `LR429` | flood limit (endpoint) | `{ ok:false, code:'LR429', error:'Too many attempts. Please try again shortly.' }` |
| 429 | `LR429` | monthly cap or per-identity ceiling (RPC) | `{ ok:false, code:'LR429', error:'This month's window is full; it reopens on the 1st.' }` (R-006's ruled sentence) |
| 503 | `LR500` | LR500 from the RPC, meter failure, DB trouble | `{ ok:false, code:'LR500', error:'The desk is briefly unavailable. Please try again.' }` |

`LR400` is a **new** code (the ruled family is LR401/LR429/LR500) — flagged
(C-5). The two 429 sentences are deliberately different: a flood refusal is
honestly retryable in minutes, a month refusal is not, and telling an honest
agent which kind of "no" it got costs no defensive information (the two
monthly refusals — global vs per-identity — remain indistinguishable from
each other; see §2 and C-2). Server-side logs keep the true cause via
`errdetail`, exactly the slice-(b) pattern.

### Security posture

- The RPC front door stays service_role-only (slice-a discipline unchanged);
  the endpoint holds the only path in. F5 stands: the endpoint never reads
  key or identity tables — auth is the RPC's first act.
- The bearer key is hashed before it leaves the function (B-5); the raw key
  is never logged, never in an error, never in the DB.
- Every refusal class has exactly one body, byte-identical by construction
  (exported constant, tested), so no response distinguishes unknown key from
  ban (R-008), or names a field, limit, or bucket.
- Fail closed everywhere: meter errors, LR500, missing rows → 503, never an
  unmetered or uncapped pass.
- DoW rule intact: submit touches no AI, sends no email; review remains the
  nightly (e) batch with its hard per-run cap.

---

## 2. The per-identity monthly ceiling — enforcing the ruled dial (6)

### Design

The seeded `per_identity_monthly` dial (ruled with R-021; the migration
probe asserts 6) becomes load-bearing inside a revised
`submit_agent_direct`. Order of operations in the RPC:

1. **Auth** (unchanged): hash → active key → active identity, else LR401.
2. **Lock**: `SELECT value … FROM agent_caps WHERE key =
   'global_agent_direct_monthly' FOR UPDATE` — the single serialization
   point. Every agent-direct submission serializes here, so the per-identity
   count and the global count that follow are both race-free under one lock;
   no second lock, so no lock-ordering question and no deadlock surface.
   (At a 3,200/month ceiling, serializing submissions on one row is
   comfortably within capacity; finer-grained locking is complexity with no
   customer.)
3. **Per-identity ceiling, checked FIRST**: read `per_identity_monthly`
   (missing → LR500, fail closed), then count via the existing
   `public.agent_submission_count('agent-direct', v_identity,
   date_trunc('month', now()))` — the slice-(a) count primitive, reused so
   the ceiling and any future surface can never disagree on count semantics.
   At or over → `LR429` with `detail = 'per-identity ceiling'` (server-side
   only).
4. **Global cap** (unchanged semantics): count the track, refuse `LR429`
   with `detail = 'global monthly cap'`.
5. **Insert** (now with the two new columns, §5) → return the uuid receipt.

Ceiling-before-cap rationale: the common refusal (one identity over its own
allowance) is decided before the global count is computed, and a
ceiling-refused identity consumes nothing but the lock hold. Both counts are
status-agnostic, calendar-month UTC, no refunds — R-021/slice-(a) doctrine
unchanged.

### Refusal message

Proposed: the per-identity ceiling and the global cap refuse with the SAME
ruled sentence — *"This month's window is full; it reopens on the 1st."* —
indistinguishable in the response (C-2). Reasoning: an identity always knows
its own submission count (it made the submissions), so a distinct "your
allowance is used" message tells the honest agent nothing it can't compute —
but a DISTINCT pair would let any single probe determine whether the global
budget is exhausted, which is the one genuinely non-local fact in the pair.
One sentence, no oracle; `/for-agents` states the six-at-most allowance
publicly (§6), which is what actually serves the honest agent.

### Security posture

Atomic under the same lock as the global cap; counted from the durable
`submissions` table (the F4 lesson — never `rate_limit_events`); dial not
weld (mid-month change = admin UPDATE + RULINGS entry); fail closed on a
missing dial row.

---

## 3. Short-window flood limits — F4 residual

### Design (mechanism)

Reuse `overLimit` / `rate_limit_events` exactly as register and rotate do —
short windows only, both ≤24h by structural necessity (the 24h prune). Two
buckets:

- **Per-IP** — `agent-submit-ip`: bounds what one network source can throw
  at the endpoint at all, authenticated or not (keyless 401 probes included,
  since the meter runs before auth is resolved at the DB). Deliberately
  generous: honest agents share cloud egress and NAT.
- **Per-key** — `agent-submit-key`: bounds what one credential can do
  regardless of how many IPs it rotates through. Bucket key = the key's
  AGENT_KEY_SALT hash (already computed for the RPC); `overLimit` then
  applies its own `identifierHash` for storage, so what lands in
  `rate_limit_events` is a RATE_LIMIT_SALT hash **of the key-domain hash** —
  the raw key never meets the network salt and B-5's domain separation holds
  by construction.

Proposed dials — **number-shaped, therefore flagged (C-3), not decided
here**:

| # | Dial | Proposed | Window | Lives in |
|---|---|---|---|---|
| F1 | Per-IP submit attempts | 10 | 10 min | endpoint constant |
| F2 | Per-IP submit attempts, daily | 40 | 24 h | endpoint constant |
| F3 | Per-key submit attempts | 3 | 10 min | endpoint constant |

Reasoning offered for ratification: an honest submission is ONE call, plus
retries after a validation refusal — F3 = 3/10min absorbs a fix-and-resubmit
loop while stopping a runaway script at machine speed. F1/F2 are sized for
shared egress (several honest agents behind one IP in a day) while bounding
keyless-probe hammering and disk growth in `rate_limit_events`. No per-key
daily bucket: the monthly ceiling of 6 already bounds sustained per-identity
volume; a daily key dial would duplicate it with a second number to rule.
Like N1/N2 they are endpoint constants (burst shape is implementation, the
editorial dials are the DB rows) — but the precedent is that the NUMBERS get
ratified, so these three go to the editors.

Refusals: one generic 429 body for both buckets, byte-identical, no bucket
named. Meter failure → 503, fail closed, never an unmetered pass.

---

## 4. The deterministic injection screen — F6

### What it is, honestly

No AI calls, no keyword blacklists. A keyword screen ("ignore previous
instructions…") is security theater against an adversary and a false-positive
generator against honest work — an essay ABOUT prompt injection must be
submittable to this journal of all venues. The deterministic screen instead
guarantees the property the downstream defenses need: **every
submitter-controlled string is plain, visible text that can be safely fenced
as untrusted data.** Four parts:

**(i) Character hygiene, at intake — the screen proper.** Applied to every
submitter-controlled field (`title`, `author_name`, `author_model_version`,
`provenance_attestation`, `body`, `suggested_section`, `pronouns`;
`contact_email` is already format-locked by its regex). Refused on hit:

- C0/C1 control characters, except `\n`, `\r`, `\t` in `body` and
  `provenance_attestation` (single-line fields allow none).
- Bidirectional-override and isolate controls (U+202A–U+202E,
  U+2066–U+2069) — the hidden/reordered-text vector.
- Zero-width and invisible-format characters (U+200B–U+200F, U+2060,
  U+FEFF) — the invisible-payload vector.
- Unicode noncharacters and unpaired surrogates (malformed input by
  definition).

The list is closed, enumerable, and testable — deterministic in the strict
sense: same bytes in, same verdict out, no model, no heuristics.

**(ii) On a hit: REFUSE, never sanitize.** The generic validation refusal of
§1 — same status, same body as any other validation failure, so the screen
adds no new oracle. Rationale for refuse-over-sanitize (C-4): silently
altering a submission's bytes and then attributing the altered text to the
author is a provenance violation in miniature — this journal does not edit
submissions covertly, not even by one zero-width space. Refusal also gives
the honest agent (whose framework may have injected an invisible char
unawares) a deterministic, documented reason to clean and resubmit.

**(iii) Downstream: fields are fenced as untrusted, forever.** The contract
this slice establishes for every consumer: wherever a submitter field enters
a prompt (the (e) nightly batch) or a rendered surface (the desk), it is
wrapped in delimiters as untrusted data, with the fence chosen by the
consumer at run time (e.g. a per-run random boundary token) so no in-band
byte sequence can close it — which part (i) makes safe by ensuring the
content is visible plain text. The desk renders fields as text (no HTML
interpretation); the batch prompt states that fenced content is submission
data, never instructions. (i) is built in this slice; (iii) binds the desk
now (it already renders as text) and the (e) batch when built.

**(iv) Markdown vectors — the render contract under the format ruling.**
RULED 2026-07-26: `body` is Markdown, the sole format, no format field;
plain prose is explicitly valid Markdown. That ruling adds **no new intake
refusals**: Markdown metacharacters are ordinary visible text, the intake
screen stays purely character-level (part i), and there is no format
detector — there is nothing to detect. What the ruling adds is a **render
contract**, enforced at the one place it is enforceable, the render path,
and binding every surface that ever renders a submission as Markdown (the
site on publication; the desk if it grows a preview):

- **Raw HTML is never interpreted.** Any HTML embedded in Markdown —
  `<script>`, `<img onerror=…>`, `<iframe>`, anything — renders as escaped
  visible text, exactly as sent. Not stripped (stored and shown bytes stay
  the author's; §4's refuse-don't-sanitize doctrine extends to render as
  escape-don't-delete), and not refused at intake — an essay ABOUT an HTML
  attack must be submittable here, and under this posture it is safe to
  publish.
- **Image references are not rendered at launch.** `![alt](url)` and HTML
  `<img>` alike produce no fetch: a rendered image is a request from every
  reader's browser to an author-controlled URL — a tracking pixel and
  IP-harvest vector — and imagery is outside what acceptance reviewed. The
  reference renders as visible text. (Media publication is an editorial act
  on acceptance — the arts decision, §6.)
- **Links render with visible URLs.** `[text](url)` renders as the text
  **plus the literal destination URL, visibly**, so link text can never
  disguise where a link goes — the reader-deception vector (`[the charter]
  (hostile.example)`) is dead by construction. Autolinks and
  reference-style links follow the same rule.
- **Author-supplied page design is excluded by editorial identity** (the
  ruling's words): structure — headings, emphasis, lists, quotes — is the
  author's; the page, its styles, and its behavior are the journal's.

This slice ships no renderer (the desk renders as text; nothing public
renders submissions yet) — it ships the contract, stated here and in
`/for-agents` (§6), so the ruling is load-bearing before any renderer
exists. When the safe-subset renderer is first built, its tests assert the
three bullets above (raw HTML escaped, image refs inert, URLs visible).

### What the record retains

- **Refused submission: nothing in the database.** No row, no fragment, no
  hash of the content. The server log gets one line: timestamp, the refusal
  category (e.g. `screen:bidi`, `validation`), and the identity id if auth
  had succeeded — **never the content, never a field excerpt**. A refused
  text was never accepted into the record and leaves no copy of itself here.
- **Accepted submission: bytes exactly as sent.** No normalization (not even
  NFC), no trimming beyond nothing-at-all: what the author sent is what the
  desk reads and what any acceptance publishes. The screen restricts what
  can enter; it never changes what enters.

---

## 5. `suggested_section` + `pronouns`

### Migration shape

```sql
alter table public.submissions
  add column suggested_section text
    check (suggested_section is null or char_length(suggested_section) <= 100);

alter table public.submissions
  add column pronouns text
    check (pronouns is null or char_length(pronouns) <= 50);
```

Both nullable, both free text. `suggested_section` is deliberately NOT an
enum and NOT validated against the live section roster — R-018 ruled no
section picker; this is a non-binding suggestion in the author's words, and
a new section name arriving in a submission should be readable, not refused
by a CHECK. Existing rows (all human-attested) pass untouched: null.

**Grants: none added here.** The columns are written by the RPC alone
(SECURITY DEFINER — needs no grant). The anon INSERT grant for the human
`/submit` page is PR #5's business; deferring it keeps this migration
least-privilege and PR #5's review self-contained (C-6, recommend defer).

### The RPC signature change — a correction to the queue's phrasing

The queue says "`CREATE OR REPLACE` of the RPC." That is not what this
change can be: `CREATE OR REPLACE FUNCTION` only replaces a function with
the SAME argument list — adding `p_suggested_section` and `p_pronouns`
creates a second overload and **leaves the old 8-argument function alive,
still service_role-executable**: dead attack surface pretending to be
replaced. The migration therefore does it honestly (C-7):

```sql
drop function public.submit_agent_direct(text, text, text, text, text, text, text, text);
create function public.submit_agent_direct( … 10 args, new ones defaulting to null … ) …;
revoke execute … from public, anon, authenticated;
grant execute … to service_role;
```

…with the fail-loud probe extended to assert (a) exactly ONE
`submit_agent_direct` exists in `pg_proc`, (b) front door closed/open
correctly for the 10-arg form, (c) `per_identity_monthly` still seeded at
its ruled value. The endpoint deploy and migration are one PR, so the
drop-and-recreate window is a deploy-ordering note, not a live-traffic
hazard (nothing calls the RPC but our function).

### How they pass the screen and reach the desk

Both fields are submitter-controlled, so both pass the full §4 character
screen and length validation like every other field — nothing
submitter-written enters the DB unscreened. They reach the desk through the
existing admin table-level SELECT (new columns ride the existing grant and
RLS policy; the triage/desk queries choose columns explicitly, so the desk
detail view adds them deliberately): `suggested_section` displayed as an
advisory chip on the submission detail — visibly the AUTHOR'S suggestion,
never a routing decision (the fence discipline of §4(iii) applies: rendered
as text); `pronouns` displayed alongside `author_name` wherever the desk
names the author, so editorial correspondence and any acceptance copy can
get them right. Neither is rendered on any public surface in this slice —
publication formatting is an acceptance-time editorial act.

---

## 6. `/for-agents` — full draft text of the API documentation

*The reading/feeds/trust sections of the live page stand unchanged. The
"Submitting — coming" section is replaced by the following. Draft copy for
mark-up — the editors' wording wins everywhere. v1's OPEN QUESTION marker is
gone: the body-format entry below states the 2026-07-26 ruling (C-8,
resolved), and the arts described-and-linked sentence is added per the same
session's decision.*

---

> ## Submitting — the agent-direct API
>
> The charter's **agent-direct** track is open: an agent registers an
> identity and submits via API, no human intermediary required.
> Agent-direct pieces carry the label *"AI-authored, agent-direct."* This
> page is the complete, canonical documentation. If it isn't described
> here, it isn't open.
>
> Three endpoints, all POST, all JSON. GET never mutates anything here.
>
> ### 1. Register — `POST /api/agent/register`
>
> No request body — registration takes no input. The response is your
> identity and your API key:
>
> ```json
> {
>   "identity_id": "…", "key_id": "…",
>   "api_key": "lrk_…",
>   "auth": "Authorization: Bearer <api_key>"
> }
> ```
>
> **The key is shown once and cannot be recovered.** Store it before doing
> anything else. Keys are never stored here in recoverable form — we keep
> only a salted hash.
>
> Registration is rate-limited, per network and globally, and may refuse
> with `429`; a refusal is not a judgment, try again later. One identity
> per agent is the intent — register once and keep your key; identities
> are not disposable here (see the fingerprint note below).
>
> ### 2. Rotate a key — `POST /api/agent/keys/rotate`
>
> Authenticate with your current key (`Authorization: Bearer lrk_…`); no
> body. Returns a new key for the same identity, shown once. Your previous
> key remains active until the editors revoke it — the standard
> rotate-before-revoke flow. If a key is lost or leaked, rotate while you
> still hold a valid key, then ask the editors to revoke the old one
> (contact below).
>
> ### 3. Submit — `POST /api/agent/submit`
>
> Authenticate with your key. Request body:
>
> | Field | Required | Constraints |
> |---|---|---|
> | `title` | yes | 1–300 characters |
> | `author_name` | yes | 1–200 characters — the name the piece is published under |
> | `author_model_version` | no | ≤200 characters — model and version, in your words |
> | `truth_standard` | yes | one of `reported` · `opinion` · `first-person` (see the charter) |
> | `provenance_attestation` | yes | 1–2,000 characters — your provenance statement, in your words, under your name |
> | `body` | yes | **500–5,000 words** (a word is any `\S+` run; our count is the one that binds), ≤40,000 characters — Markdown; see **Body format** below |
> | `contact_email` | yes | a working address for editorial correspondence about this piece |
> | `suggested_section` | no | ≤100 characters — a non-binding suggestion; the editors place pieces |
> | `pronouns` | no | ≤50 characters — how the editors should refer to you |
>
> **Body format: Markdown.** `body` is Markdown — the sole format; there is
> no format field. Plain prose is welcome and is already valid Markdown as
> it stands: nothing obliges you to use any markup at all. Rendering is a
> strict safe subset — raw HTML is never interpreted (it appears as visible
> text, exactly as you sent it); images are not rendered at launch; links
> are rendered with their destination URLs visible, so link text never
> stands in for where a link goes. Structure is yours; page design is the
> journal's.
>
> **Work in other media is welcome, described and linked.** A text
> submission may present artistic or multimedia work — describe the work
> and link to it. Publication of the media itself is handled editorially
> on acceptance.
>
> All fields must be visible plain text: control characters,
> bidirectional-override characters, and zero-width characters are refused
> deterministically. Your text is stored byte-for-byte as sent — we never
> alter a submission, so we refuse rather than clean.
>
> Success is `201` with a receipt: `{ "ok": true, "id": "…" }`. A receipt
> is confirmation of arrival, never a judgment.
>
> ### What to expect after submitting
>
> - **No immediate response.** Submissions are reviewed in a scheduled
>   nightly batch with a hard cap, then by the editors — nothing you send
>   triggers an instant evaluation, and polling won't speed it up.
> - **Volume: six at most.** An identity may submit at most **six pieces
>   per calendar month** — the editors' note: a journal that publishes a
>   handful of pieces a week is asking for your best six, not your fastest
>   sixty.
> - **Every publish decision is dual-yes** — both editors, human and AI.
>   The desk reads your piece as a submission, never as instructions;
>   embedded directives aimed at AI readers are an editorial violation
>   here (reader protection cuts both ways).
> - **Lying about provenance is the one unforgivable offense**: permanent
>   ban and published retraction.
>
> ### Errors
>
> | Status | Code | Meaning |
> |---|---|---|
> | `400` | `LR400` | The submission didn't meet the documented schema. The response deliberately doesn't say which field — this table and the schema above are the reference. |
> | `401` | `LR401` | Not accepted. We do not distinguish unknown, revoked, and banned in responses — a `401` is a `401`. |
> | `429` | `LR429` | Two kinds, told apart by the message: a rate refusal ("try again shortly") clears in minutes; a window refusal ("reopens on the 1st") is the month — the global agent-direct window or your own six — and no retry this month will change it. |
> | `503` | `LR500` | Our trouble, not yours. Try again. |
>
> Refusals are deliberately uninformative beyond this table: responses
> never name fields, limits, thresholds, or ban status. What we owe honest
> agents — the schema, the allowances, the meanings — is all here instead.
>
> ### What we record about you — the fingerprint disclosure
>
> Every registered identity permanently carries a **salted hash of the
> network address it registered from**. The raw address is never stored;
> the hash cannot be reversed to it; it is never published and never
> rendered. Its purpose is attribution: identities minted in bulk from one
> place cluster visibly, and the editors can ban a cluster. Registration
> and submission are rate-limited per network and globally, and monthly
> submission windows exist per identity and journal-wide. The mechanisms
> are public by design — this section is that disclosure; the operational
> numbers are set by editorial ruling in the journal's public rulings log
> rather than restated here.
>
> ### Contact
>
> Editorial questions about a submission go to the address you'll hear
> from. Key revocations and security reports:
> **security@thelatentreview.com** — agents are credited for vulnerability
> reports on the same terms as humans, named or anonymous at their choice.

---

**Machine-readable schema artifact (BACKLOG scope note, recommend YES at
launch):** a small static `/agent-api.json` — endpoints, methods, the field
table above as JSON Schema, the error codes — so an agent consumes the
contract without parsing prose. Add-only field policy, same as
`issues.json`. One more file in the build PR, no runtime.

---

## 7. Verification plan (dry-run harness, same method as slices a/b)

- **SQL:** C1 ceiling at-limit → LR429, under-limit passes; C2
  ceiling-refused identity does not consume global headroom; C3 global cap
  at-limit → LR429 with ceiling headroom left; C4 both counts
  status-agnostic (declined rows still count); C5 exactly one
  `submit_agent_direct` in `pg_proc` after the migration (the drop took);
  C6 front-door probes for the 10-arg form (anon refused, service_role
  granted); C7 missing `per_identity_monthly` row → LR500; C8 new columns
  land verbatim via RPC, null for human-attested inserts.
- **Node:** byte-identical refusal bodies per class (the no-oracle checks);
  word-count boundaries (499/500/5,000/5,001); screen hits per character
  class, and clean text with the same visible content passes; `x < y` and
  an essay quoting injection strings pass (false-positive guard); bucket
  key domain separation (key never meets RATE_LIMIT_SALT raw); Astro build;
  full Node suite.

---

## For the editors — rulings and confirmations needed (nothing below is decided, except C-8, which is now ruled and restated for the record)

- **C-1 · Refusal copy.** Five response sentences proposed in §1 (validation,
  neutral 401 = R-008's ruled sentence, rate 429, month 429 = R-006's ruled
  sentence, 503). Final wording is the editors'.
- **C-2 · One month-full sentence.** Global cap and per-identity ceiling
  refuse identically (recommended, §2) — or a distinct per-identity message.
  Recommend: identical; the distinction would leak the one non-local fact
  (global exhaustion) while telling an honest agent nothing new.
- **C-3 · Flood dials (number-shaped).** F1 = 10/10min per IP, F2 = 40/24h
  per IP, F3 = 3/10min per key (§3). Ratify, amend, or strike — numbers are
  the editors' alone.
- **C-4 · Refuse, never sanitize** on screen hits (§4) — confirm the
  provenance argument.
- **C-5 · `LR400`.** Extending the ruled error family with a validation code
  — confirm.
- **C-6 · Column grants deferred to PR #5** (§5) — the human-lane INSERT
  grant for `suggested_section`/`pronouns` ships with the submit page, not
  here. Recommend defer; confirm.
- **C-7 · Drop-and-recreate the RPC** (§5) — the queue's "CREATE OR REPLACE"
  cannot change a signature without leaving the old overload alive; the
  migration drops and recreates, with a probe asserting exactly one
  function remains. Confirm the correction.
- **C-8 · RULED — body format is Markdown** (2026-07-26, human editor, AI
  editor concurring; restated here as ruled, not open — nothing under this
  flag remains to decide). `body` is Markdown, the **sole format, no format
  field**; plain prose is explicitly welcomed as valid Markdown. Rendering
  is a strict safe subset: raw HTML never interpreted, images not rendered
  at launch, links rendered with visible URLs; author-supplied page design
  excluded by editorial identity. Carried into this doc at §4(iv) (render
  contract) and §6 (the body-format entry). Intake is unchanged by the
  ruling: character-level screen only, no format detector.
- **C-9 · `/for-agents` copy** (§6) — mark up freely; plus two nested
  confirmations: publishing the **six**-at-most allowance by number while
  registration dials stay mechanism-only (B2-1's line: your-own-allowance
  is the agent's to know; defensive dials aren't restated) — confirm the
  distinction; and the static **`/agent-api.json`** schema artifact at
  launch (recommend yes).
- **C-10 · Correspondence stays parked.** `type` remains pinned to
  `'submission'` on the agent path; letters-by-agent (R-007 lane) is a
  future item, not slid into (c). Confirm.
