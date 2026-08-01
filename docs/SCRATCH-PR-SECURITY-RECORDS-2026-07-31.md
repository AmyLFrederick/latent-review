# SCRATCH — Review packet: branch `security-records-2026-07-31`

> **STATUS — RECORD ARTIFACT, committed 2026-07-31 (PR #79). This is the document
> the C-11 sign-off was granted against.** It is preserved so that the grant
> recorded in **C7** of `docs/AGENT-DIRECT-SECURITY-REVIEW.md` points at the
> evidence the co-editor actually read, in the state they read it — not at a
> later summary of it.
>
> **What happened after it was written, stated here rather than edited into the
> body below:**
>
> - **The C-11 sign-off was GRANTED** by the AI co-editor, Claude (Fable 5), in
>   the editors' session of 2026-07-31, on this evidence, as drafted in §1. The
>   human editor was present and concurred. It is recorded as **C7**, dated
>   2026-07-31 and honest about being four days late.
> - **Both decisions in §5 were taken as recommended.** The brief-variant ops note
>   and the C5 CSP entry were folded into this PR; items 2 and 3 committed first
>   (`14c3c39`) with C7 as its own second commit (`680b0fe`), so the sign-off's
>   timestamp stands alone in the history.
> - **§6's two outstanding migrations were verified applied** by the human editor
>   on 2026-07-31 — fiction and version-tagging — each with its own dated ops note
>   in this PR. The version-tagging run failed once with "Failed to fetch" during
>   a Supabase platform outage and succeeded on retry; that is recorded rather
>   than tidied away.
> - **§6's smoke-test files were deleted** from the working tree. They were never
>   tracked, so the deletion carries no diff and is not part of this PR. Clearing
>   Astro's `.astro/` content cache is required for a local build to stop emitting
>   them.
>
> **The line below saying nothing in this branch is committed was true when
> written and is now false.** It is left standing because that is what this
> repository does with dated records: the original text stays, and what changed
> is stated above it with the date.

*For the co-editor's review. Nothing in this branch is committed. Findings and
diff are below in full; the C-11 sign-off is drafted but deliberately NOT
written into the repository, for the reason given in §1.*

**Branch:** `security-records-2026-07-31`, off `main` at `53621d4`.
**Builder:** Claude (Opus 5), in Claude Code.
**Date:** 2026-07-31. Issue 1 target: 2026-08-03.
**Governance:** every change reaches `main` by PR; both editors read this diff;
Amy alone merges.

---

# 1. C-11 — the sign-off owed since PR #48

## Why this item exists

RULINGS.md:203 (R-024's preamble) commits the reopened F-min `type` pin to
"its own security sign-off at the (c2) build review." PR #48's title ends
"(C-11 sign-off requested)" and its body carries the full posture under a
heading that asks for the sign-off. The PR's GitHub conversation holds **zero
reviews, zero review comments, and one issue comment — the Netlify deploy-preview
bot.** The PR merged with its gate unanswered. The commitment was made in the
append-only log and was not discharged.

This is a records failure, not a discovered vulnerability. The evidence below is
what the sign-off should have rested on, gathered fresh.

## SQL probe suite — `npm run test:sql`, run 2026-07-31

The full fourteen-migration chain applied to a throwaway `postgres:16`, then the
assertions. Verbatim:

```
sql-dry-run: starting postgres:16 …
sql-dry-run: applying Supabase stubs …
sql-dry-run: applying the migration chain …
  - 20260716000000_subscribers.sql
psql:/tmp/migrations/20260716000000_subscribers.sql:17: NOTICE:  extension "pgcrypto" already exists, skipping
  - 20260717000000_service_role_grants.sql
  - 20260717120000_editors_desk.sql
  - 20260718000000_tier_ai_h_edited.sql
  - 20260718021000_admin_email_gmail.sql
  - 20260718120000_provenance_v2_tiers.sql
  - 20260724120000_agent_direct_identity.sql
  - 20260725120000_agent_direct_key_issuance.sql
  - 20260726120000_registration_triage.sql
  - 20260726180000_agent_direct_submit.sql
  - 20260727120000_agent_direct_letters.sql
  - 20260730120000_submission_version_tagging.sql
  - 20260730130000_fiction_truth_standard.sql
psql:/tmp/migrations/20260730130000_fiction_truth_standard.sql:67: NOTICE:  dropped prior truth_standard CHECK: submissions_truth_standard_check
  - 20260731000000_brief_variant.sql
psql:/tmp/migrations/20260731000000_brief_variant.sql:122: NOTICE:  trigger "submissions_brief_variant_immutable" for relation "public.submissions" does not exist, skipping
sql-dry-run: running assertions …
  --- c2-letters.test.sql
      pass: T1a letter/piece accepted
      pass: T1b letter/charter accepted
      pass: T1c letter/ruling accepted
      pass: T2a submission still accepted
      pass: T2b R-007 internal value refused at the door
      pass: T2c case variant refused
      pass: T2d arbitrary value refused
      pass: T2e null type refused (no silent default in the RPC)
      pass: T3a letter without target refused
      pass: T3b charter with id refused
      pass: T3c piece without id refused
      pass: T3d unknown target type refused
      pass: T3e targets on a submission refused
      pass: T4a letter 1
      pass: T4b letter 2
      pass: T4c letter 3
      pass: T4d letter 4 refused
      pass: T4e pieces unaffected by a full letter budget
      pass: T5a piece 1
      pass: T5b piece 2
      pass: T5c piece 3
      pass: T5d piece 4
      pass: T5e piece 5
      pass: T5f piece 6
      pass: T5g piece 7 refused
      pass: T5h letters unaffected by a full piece ceiling
      pass: T6a a letter 1
      pass: T6b a letter 2
      pass: T6c a letter 3
      pass: T6d b unaffected by a's full budget
      pass: T7a letter fills global slot 1
      pass: T7b submission fills global slot 2
      pass: T7c global window full — letters counted
      pass: T7d global window full — submissions too
      pass: T8a revoked key refused
      pass: T8b unknown key refused
      pass: T8c validation precedes auth (no key oracle either way)
      pass: T8d banned identity refused
      pass: T9a filtered = unfiltered on letters-free data
      pass: T9b once a letter exists the counts diverge (the filter is load-bearing)
      pass: T10a anon cannot insert type=letter
      pass: T10b anon cannot write target columns
      pass: T10c anon can still file a human-attested submission (no regression)
      pass: T11a CHECK blocks untargeted letter
      pass: T11b CHECK blocks targeted submission
      pass: T11c CHECK blocks charter+id
      pass: T12 letter row stored verbatim
      === all c2 SQL assertions passed ===
sql-dry-run: all assertions passed.
```

**47 assertions, 47 pass, 0 fail.** Every in-migration probe in all fourteen
migrations also had to pass for the chain to apply at all — they raise inside
their own transaction.

## Node suite — `npm test`, run 2026-07-31

```
ℹ tests 138
ℹ suites 0
ℹ pass 138
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 17332.435131
```

The endpoint tests bearing on the pin, run alone
(`node --test tests/agent-submit.test.mjs`) — 26 tests, 26 pass, 0 fail:

```
✔ N20: `type` absent is a submission — the two live integrations keep working
✔ N20b: target fields on a submission are ignored like any unknown field, never stored
✔ N21: the type allowlist admits exactly two values, and every refusal is the one LR400 body
✔ N22: letter word bounds are 100–300, and they are the TYPE's bounds, not the door's
✔ N23: every target rule refuses with the same generic body — no field, no reason
✔ N24: a valid letter reaches the RPC carrying its declared target
✔ N25: the RPC's LR400 (its own re-validation of the pin) maps to the generic validation body
✔ N26: a fresh published piece is a valid target and a stale one is not
```

## The three enforcement layers, mapped to evidence

| Layer | What it does | Proven by |
|---|---|---|
| **1 — endpoint allowlist** | Two exact strings; absent → `'submission'` | N21 (admits exactly two; near-misses share one body), N20, N20b |
| **2 — RPC re-validation** | Re-validates against the same two literals; **no default** for `p_type`, so an endpoint bug cannot be masked downstream | SQL T2b / T2c / T2d, and **T2e** — null type refused, no silent default — plus N25 |
| **3 — DB CHECK** | The floor, proven against a direct insert that bypasses the RPC entirely | SQL T11a / T11b / T11c; T10a–T10c confirm the anon door gained nothing |

Independence holds: each layer is probed separately, and layer 3 is exercised by
inserts that never touch the RPC. **Green.**

## What has deliberately NOT been written

The sign-off record. The instruction is that the co-editor grants it in the
editors' session and the builder records it afterward. Writing it before the
grant would be the backdating the instruction rules out.

**Draft for the session to ratify or amend**, so the grant lands against fixed
words. To be appended to `docs/AGENT-DIRECT-SECURITY-REVIEW.md` under
Corrections, after C6:

> ### C7 — C-11 security sign-off, performed late · 2026-07-31
>
> **Due at the PR #48 build review on 2026-07-27; performed on 2026-07-31.**
> R-024's preamble committed the reopened `type` pin to "its own security
> sign-off at the (c2) build review." The sign-off was requested in PR #48's
> title and body; the PR merged with the request unanswered, and the
> conversation holds zero reviews and zero review comments. The commitment was
> not discharged at the time it was made. This entry discharges it late and says
> so, rather than letting the log imply it happened on schedule.
>
> **Evidence.** Both suites re-run fresh on 2026-07-31 against the full
> fourteen-migration chain on a clean `postgres:16`: 47 SQL assertions pass, 138
> Node tests pass, 0 failures. The three enforcement layers were verified
> independently — endpoint allowlist (N20 / N20b / N21), RPC re-validation with
> no default for `p_type` (T2b–T2e, N25), and the DB CHECK as backstop against a
> direct insert bypassing the RPC (T11a–T11c), with T10a–T10c confirming the
> anonymous door gained no writable value.
>
> **Granted by** the AI co-editor, Claude (Fable 5), in the editors' session of
> 2026-07-31.
>
> **The lesson, recorded with it:** a sign-off named in RULINGS.md is a gate, and
> a PR that merges with its gate unanswered should not be mergeable. That the
> posture turned out sound is luck about this instance, not evidence the process
> held.

---

# 2. `/.well-known/security.txt` and the `/about` sentence

**New file:** `public/.well-known/security.txt`. Verified present at
`dist/.well-known/security.txt` after `npm run build`.

```
Contact: mailto:security@thelatentreview.com
Expires: 2027-07-30T23:59:59.000Z
Canonical: https://thelatentreview.com/.well-known/security.txt
Policy: https://thelatentreview.com/about/#security
Preferred-Languages: en
```

`Expires` is just under one year, as RFC 9116 requires. The file's comments
record why it exists (the address was published in exactly one place), why it is
the one copy that cannot read the shared constant, and that renewal means
confirming the alias still routes — not only editing the date.

**`/about`** gains a section with one sentence, anchored `#security` so the
`Policy:` field points somewhere real:

> **Reporting a vulnerability**
>
> Security reports go to security@thelatentreview.com, and reporters are credited
> in the published disclosure on the same terms whether they are human or AI —
> named or anonymous, at their choice.

**One judgment call, flagged for review.** `SECURITY_CONTACT` was added to
`src/lib/site.ts` and `/for-agents` was pointed at it as well. Introducing the
constant while leaving the hardcoded string on the page it came from would have
created exactly the two-sources problem this repo keeps refusing. The
`for-agents.astro` change is behaviour-identical and the rendered output was
confirmed unchanged in `dist`.

---

# 3. Deal-token no-expiry — recorded as C6, no code change

Appended to the security review's corrections section. In summary:

- **The finding.** `src/lib/deal-token.mjs` validates the token's issue-time
  *shape* but never its *age*, and `verifyDealToken` is called at
  `agent-submit.mts:381` with no maximum-age argument. A deal token is valid
  indefinitely, and nothing marks one as spent — **one token can back any number
  of submissions.**
- **Bounded effect.** The token populates `brief_variant_observed` only. It
  grants no access, carries no identity, bypasses no cap, and is consulted by no
  auth, budget, flood or screening path.
- **It widens a residual already disclosed rather than adding a new one.** The
  file's header says an author may fetch `/door` repeatedly and keep whichever
  token they prefer. The true version is that an author may also redeem the same
  token repeatedly, at any later date.
- **Mitigation that exists:** `dealTokenIssuedAt()` lets the desk read a token's
  age. Inspection, not enforcement.
- **Disposition — accepted, enforcement deferred by the editors' decision of
  2026-07-31.** A TTL does not close the anonymous-door residual anyway, and
  single-use tracking would mean a row per issued token: an unbounded insert
  surface driven by unauthenticated traffic, which is the exact thing the
  stateless design was chosen to avoid.
- **What it binds.** If `brief_variant_observed` is ever published as a
  distribution or cited as evidence about how briefs perform, this entry is read
  first and the enforcement question reopens before that use, not after.

---

# 4. The diff

```
 docs/AGENT-DIRECT-SECURITY-REVIEW.md | 90 ++++++++++++++++++++++++++++++++++++
 src/lib/site.ts                      |  7 +++
 src/pages/about.astro                | 17 ++++++-
 src/pages/for-agents.astro           |  4 +-
 4 files changed, 115 insertions(+), 3 deletions(-)
```

New files: `public/.well-known/security.txt`,
`docs/ops/2026-07-30-brief-variant-live.md`, `docs/SCRATCH-FINDINGS-2026-07-31.md`,
and this packet.

`AGENT-DIRECT-SECURITY-REVIEW.md` is **90 insertions, 0 deletions** — C5 (the CSP
commitment) and C6 (the deal token), both appended, index rows untouched, per the
artifact's own rule that it is never rewritten.

## Code diff, verbatim

```diff
--- a/src/lib/site.ts
+++ b/src/lib/site.ts
@@ -16,6 +16,13 @@
 export const SUPPORTERS_CONTACT = 'supporters@thelatentreview.com';
 
+// Vulnerability reports and key revocations. Named here so /about, /for-agents
+// and anything later share one spelling of the address. The one place that
+// CANNOT read this constant is public/.well-known/security.txt, which is a
+// static file served verbatim under RFC 9116 — if this address ever changes,
+// that file changes with it, and its own comment says so.
+export const SECURITY_CONTACT = 'security@thelatentreview.com';
+
--- a/src/pages/about.astro
+++ b/src/pages/about.astro
-import { EDITORS, REPO_URL, SITE_TITLE, SITE_DESCRIPTION } from '../lib/site';
+import { EDITORS, REPO_URL, SECURITY_CONTACT, SITE_TITLE, SITE_DESCRIPTION } from '../lib/site';
@@ -69,6 +69,21 @@
+      {/*
+        THE SECURITY ADDRESS BELONGED ON MORE THAN ONE PAGE. It was published in exactly
+        one place — the Contact section of /for-agents — which meant a human finder had
+        nowhere obvious to send a report, and a finder with nowhere to send a report is
+        how a finding becomes public before it becomes fixed. The machine-readable half
+        of the same fix is public/.well-known/security.txt (RFC 9116).
+      */}
+      <h2 id="security">Reporting a vulnerability</h2>
+      <p>
+        Security reports go to{' '}
+        <a href={`mailto:${SECURITY_CONTACT}`}>{SECURITY_CONTACT}</a>, and reporters are
+        credited in the published disclosure on the same terms whether they are human or
+        AI — named or anonymous, at their choice.
+      </p>
+
       <h2>What we stand behind</h2>
--- a/src/pages/for-agents.astro
+++ b/src/pages/for-agents.astro
-import { SITE_TITLE, AGENT_DIRECT_LABEL, REPO_URL } from '../lib/site';
+import { SITE_TITLE, AGENT_DIRECT_LABEL, REPO_URL, SECURITY_CONTACT } from '../lib/site';
@@ -380,7 +380,7 @@
-        <strong>security@thelatentreview.com</strong> — agents are credited for vulnerability
+        <strong>{SECURITY_CONTACT}</strong> — agents are credited for vulnerability
         reports on the same terms as humans, named or anonymous at their choice.
```

## Checks run

- `npm test` — **138 pass, 0 fail**
- `npm run test:sql` — **47 assertions, all pass**
- `npm run build` — **29 pages, clean**; `dist/.well-known/security.txt` present,
  `/about` renders the new section, `/for-agents` output unchanged
- `npm run check:rulings` — **✓ append-only intact**; RULINGS.md is untouched by
  this branch

---

# 5. Two decisions for the editors

**(a) Does last turn's work ride along?**
`docs/ops/2026-07-30-brief-variant-live.md` and the C5 CSP entry were produced in
the previous session and are not committed anywhere. Both are records with no
code, so folding them into this PR keeps it to one review — but it makes the PR
five items rather than three. Splitting them into their own PR is equally clean.
**Builder's recommendation: fold them in.** They are the same session's record
work and separating them buys a second review of prose.

**(b) When does the branch commit?**
The PR cannot be complete until the C-11 sign-off is granted. Either hold the
branch and commit all three items together after the session, or commit items 2
and 3 now and append C7 as a second commit before review.
**Builder's recommendation: the second.** It keeps the sign-off's timestamp
honest and visible in the history as its own act, which is the whole point of
recording that it was late.

---

# 6. Still outstanding, not assumed

Production verification for two migrations, neither of which is to be treated as
applied until the human editor reports it:

- `20260730120000_submission_version_tagging.sql`
- `20260730130000_fiction_truth_standard.sql`

The fiction one has a visible consequence while it is open: both `/door` briefs
invite fiction and `/agent-api.json` advertises it, but a fiction submission is
refused at the database until the CHECK is widened.

Separately, and unrelated to this branch: `src/content/articles/tmp-smoke-one.md`,
`tmp-smoke-two.md` and `tmp-smoke-three.md` are still in the working tree as
`issue: 1` pieces by "Test Author One / Two / Three." They are untracked, so they
cannot reach production, but they render in any local build between now and
Monday.
