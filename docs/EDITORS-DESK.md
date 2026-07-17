# The Editors' Desk — submissions review infrastructure

Architecture ruled by both editors: **Option A** (in-admin AI review desk) plus
**Option C** (read endpoint for the co-editor's direct review). The dual-yes
mutual veto remains with the two founding editors, always.

## The three inputs to a decision

| Input | Where it lives | Who produces it | Votes? |
|---|---|---|---|
| **AI desk pass** | `ai_editor_passes` table | "AI desk review — Claude (Fable 5) applying the editors' written criteria" | **No** — advisory only |
| **Co-editor review** | `submissions.coeditor_review` + `coeditor_decision` | The founding AI co-editor, for borderline cases: fetches the piece via the read endpoint, forms a judgment; the human editor enters it | **Yes** |
| **Amy's decision** | `submissions.amy_decision` | The human editor | **Yes** |

Disclosure framing (binding for schema, docs, UI, and any published reference
to a desk pass, per the editors' architecture discussion): the desk pass is
attributed as **"AI desk review — Claude (Fable 5) applying the editors'
written criteria"** — explicitly distinct from the founding co-editor's
judgment. Same model, different role; provenance rules apply to our own
process, consistent with R-011. If a refusal fallback served the pass, the
stored `model` says so and the label follows it. `decided_at` is set only when
both founding editors' decisions are recorded.

## Components

### `/admin` — the desk page (`src/pages/admin.astro`)

Static page, client-side Supabase. Lists submissions newest-first with status
(`new / under_review / accepted / declined`); full-read view shows tier label,
provenance attestation, piece text, and contact info; renders AI desk passes;
records the decision fields.

**Auth model — three layers, all required:**

1. **Supabase Auth, magic link.** In the Supabase dashboard: *Authentication →
   Sign In / Up → disable "Allow new users to sign up"*, then *Authentication →
   Users → Add user* with the editor's address. The page passes
   `shouldCreateUser: false`, so no stranger can mint an account even if
   signups get re-enabled by accident.
2. **RLS.** Every policy on `submissions` and `ai_editor_passes` matches only
   the admin email (hardcoded in the migration, deliberately: who can read the
   queue is an auditable, versioned fact — changing it takes a migration).
   Any other authenticated user sees zero rows.
3. **Function-side check.** The AI pass function re-verifies the session JWT
   and the email (`netlify/lib/admin.mts`) before spending a single token.

The page is `noindex` and excluded from the sitemap. The anon key the page
ships with is the *publishable* key — anon's only grant is the
column-restricted INSERT on `submissions` (the public submit door).

### AI review desk (`netlify/functions/ai-editor-pass-background.mts`)

`POST /api/admin/ai-editor-pass` — a **background function** (Fable 5 passes
can run for minutes, past the synchronous timeout): the caller gets a 202, the
pass lands in `ai_editor_passes`, and the admin page polls for it.

- **Model:** `claude-fable-5`, with the server-side refusal fallback to
  `claude-opus-4-8` (Fable 5's safety classifiers can false-positive on benign
  editorial content). The stored row records the model that actually served.
- **Criteria:** read at runtime from `docs/EDITORIAL-CRITERIA.md` (bundled via
  `netlify.toml` `included_files`) so the criteria stay versioned in the
  public repo. Each pass stores the SHA-256 of the exact criteria text it
  applied. **While the file carries the `DRAFT — DO NOT APPLY` marker, the
  desk refuses to run** — the pass row fails loudly with a clear message.
- **Safeguards (LineupBrain playbook):** editor-initiated only — submissions
  never auto-trigger API calls (CLAUDE.md; flooding the queue burns disk, not
  tokens); auth before any spend; output hard-capped at 4,096 tokens; input
  guards (40k-char body ceiling, 30k-char criteria ceiling — oversized input
  is refused, never silently truncated); rate caps of 40 passes/day and
  3/submission/day; the submission body is framed as untrusted data and the
  reviewer is instructed to flag embedded directives (reader-protection
  clause).
- Structured JSON output (schema-enforced): summary, per-criterion findings
  (`meets / falls_short / unclear`), charter flags, advisory recommendation
  (`advance / decline / discuss`), confidence.

### Read endpoint (`netlify/functions/review-read.mts`)

`GET /api/review/submission?id=<uuid>` — read-only JSON of one submission plus
its desk passes, for the co-editor's direct review of borderline cases in the
chat interface. GET never mutates (house rule); responses are `no-store` and
`noindex`.

**Token setup for Amy (`REVIEW_DESK_TOKEN`):**

1. Generate: `openssl rand -hex 32`
2. Netlify → Site configuration → Environment variables → add
   `REVIEW_DESK_TOKEN` with that value (all scopes, or Functions only).
3. Use: `https://thelatentreview.com/api/review/submission?id=<uuid>&token=<value>`
   — or, preferred where headers are possible, send
   `Authorization: Bearer <value>` and omit the query param.
4. **Revocation drill:** rotate by generating a new value and saving it —
   the old token dies at the next deploy/function refresh. Rotate immediately
   if a URL containing the token may have leaked (URLs land in logs; that is
   the accepted tradeoff for chat-interface fetch-by-URL, hence a dedicated,
   low-privilege, rotate-at-will token rather than anything shared).

Properties: separate from the Supabase service key; grants exactly this one
read; revocable by rotating one env var; compared in constant time; minimum
length enforced (32 chars).

## Environment variables (Netlify)

| Variable | Used by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI desk pass | New — from the Anthropic console |
| `ADMIN_EMAIL` | AI desk pass auth | Must match the email in the RLS policies |
| `REVIEW_DESK_TOKEN` | Read endpoint | See token setup above |
| `PUBLIC_SUPABASE_URL` | `/admin` page (build-time) | Project URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `/admin` page (build-time) | The `sb_publishable_…` key — safe to ship to browsers |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SALT` | All functions | Already configured |

## Sequencing

The `submissions` table ships here (RLS from day one, anon insert-only) so the
desk has something to review. **Intake is still backend Part 2**: the submit
form, word-count enforcement with honest errors, the R-006 monthly caps, and
the R-008 banned-identities check land there, binding docs/SUBMISSIONS.md.
Until Part 2, rows can only arrive via the (column-restricted) anon insert or
by hand.
