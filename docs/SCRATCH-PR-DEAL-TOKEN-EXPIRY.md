# SCRATCH — Review packet: branch `deal-token-expiry`

> **STATUS — RECORD ARTIFACT, committed 2026-07-31 with PR #81. This is the
> document the co-editor's diff read was granted against**, preserved in the
> state they read it rather than replaced by a later summary of it.
>
> **What happened after it was written, stated here rather than edited into the
> body below:**
>
> - **Both flags in §8 and §9 were resolved by the editors.** On **§4**:
>   threading the fixed clock through the pre-existing tests was the right call —
>   *tests must not rot on a calendar*. On **§8**: editing the header comment in
>   place is correct — *comments are not dated records*, and the edit-vs-append
>   line falls where the builder put it.
> - **The co-editor's read of the diff was granted** on this packet as pasted,
>   in the editors' session of 2026-07-31.
> - **This packet was committed with the PR**, on the human editor's instruction,
>   following the precedent PR #79 set: the document a review was granted against
>   enters the record, so the grant points at evidence rather than at a memory.
>
> **The line below saying nothing in this branch is committed and no PR is open
> was true when written and is now false.** It is left standing because that is
> what this repository does with dated records: the original text stays, and what
> changed is stated above it with the date.

*For the co-editor's review. Nothing in this branch is committed and no PR is
open. Findings and the full diff are below, self-contained — nothing here
requires opening the repository.*

**Branch:** `deal-token-expiry`, off `main` at `df3abe8` (PR #80 merged).
**Builder:** Claude (Opus 5), in Claude Code.
**Date:** 2026-07-31. Issue 1 target: 2026-08-03.
**Governance:** every change reaches `main` by PR; both editors read this diff;
Amy alone merges.

**This is the second of two PRs from the cost-exposure audit of 2026-07-31.** The
first — the global ceiling on `/api/subscribe`, at 500/hour and 3,000/day —
merged as **PR #80**. This one implements §2 of that audit.

---

# 1. What was ruled

The editors approved, 2026-07-31:

- **A fourteen-day maximum age** on the deal token.
- **The future-dated refusal included** as proposed, rather than dropped as
  unnecessary.
- **Sequencing:** this ships after the subscribe ceiling, as its own PR.

---

# 2. The finding this closes — C6

`src/lib/deal-token.mjs` validated the issue timestamp's **shape**
(`/^\d{1,12}$/`) and never its **age**. `verifyDealToken` was called at
`netlify/functions/agent-submit.mts:381` with two arguments, and the function had
no third to pass. So a deal token was valid from issue until forever, and because
nothing marks a token as spent, **one token could back any number of submissions,
at any later date**.

Severity is genuinely low and was never disputed: the token populates
`submissions.brief_variant_observed` and nothing else. It grants no access,
carries no identity, bypasses no cap, and is consulted by no auth, budget, flood
or screening path. It reaches **no paid API**, which is why it ranked second
under the standing fix-first rule rather than first.

---

# 3. The change

## 3a. Implementation — `src/lib/deal-token.mjs`

Four properties, each deliberate:

1. **Default-on.** The options object defaults, so `agent-submit.mts:381` is
   covered **without its call site changing**. An opt-in parameter would have
   left the one call site that matters exactly as exposed as before — a fix in
   name only. That file is deliberately **not** in this diff, and the fact that
   it needed no change is the evidence the default is doing the work.
2. **`now` stays injectable**, matching `issueDealToken`'s existing `now`
   parameter, so tests remain clock-independent.
3. **Expired returns `null`**, indistinguishable from every other failure — the
   file's stated doctrine, *"FAILS TO UNVERIFIED, NEVER TO WRONG."*
   `brief_variant_observed` stays null, the submission is accepted exactly as
   before, and **the submitter sees nothing**. No refusal, no new LR code.
4. **Future-dated refused beyond five minutes' skew.** Defence in depth, not a
   live hole — the door never issues one and forging requires `DOOR_DEAL_SALT`.
   Included because `issued` accepts twelve digits, so without it a token
   claiming a date centuries out would satisfy the age check forever, making the
   expiry decorative on precisely the day it began to matter.

**On placement:** the age check runs **before** the HMAC — cheap check first,
matching the existing length bound. This is not a timing oracle: `issued` travels
in the clear inside the token, so anyone holding one can already read its date
without measuring anything.

```diff
--- a/src/lib/deal-token.mjs
+++ b/src/lib/deal-token.mjs
@@ -25,6 +25,12 @@
 // closes that, and a ledger would not either. It is written here so nobody later
 // reads this field as a random sample.
 //
+// The same is true of REUSE, and this paragraph used to leave it out. Nothing
+// marks a token as spent, so one token can back more than one submission — now
+// bounded to the fourteen-day window below, where it was previously unbounded in
+// time. That is a narrowing, not a closure, and it is stated here rather than
+// only in the security review because this file is where the next person looks.
+//
 // FAILS TO UNVERIFIED, NEVER TO WRONG. If the secret is unset, issue() returns
 // null and the door deals without a token; verify() returns null for anything it
 // cannot check. The observed column stays null, which is an honest "we do not
@@ -34,6 +40,43 @@ import { BRIEF_VARIANTS } from './door.mjs';

 const VERSION = 'v1';

+/**
+ * How long a dealt brief stays provable. Ruled by the editors 2026-07-31, after
+ * the cost-exposure audit found that this function read the issue timestamp's
+ * SHAPE and never its AGE — so a token was valid from issue until forever, and
+ * one token could back any number of submissions.
+ *
+ * WHAT FOURTEEN DAYS COSTS A WRITER: nothing. The clock covers deal → submission
+ * only. /door deals on every fetch, so a writer starting a second piece gets a
+ * fresh brief and a fresh token automatically; nothing accumulates against
+ * anyone's history. The only person the window can touch is someone who fetched
+ * the door, waited longer than a fortnight, and then submitted on the stale
+ * token — and even they lose nothing that is theirs. The submission is accepted
+ * exactly as before. What goes null is the JOURNAL'S OWN MEASUREMENT, which is
+ * the honest outcome once the journal can no longer vouch for what it observed.
+ *
+ * WHAT IT DOES NOT BUY, so nobody reads more into it later: this narrows the
+ * replay window, it does not close it. Before, one token backed unlimited
+ * submissions forever; now it backs unlimited submissions within fourteen days.
+ * The anonymous-door residual described below is untouched, and no TTL can touch
+ * it — an author who can reroll for a preferred variant can also reroll fresh.
+ * See C6 in docs/AGENT-DIRECT-SECURITY-REVIEW.md.
+ */
+export const DEAL_TOKEN_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
+
+/**
+ * Tolerance for a token dated slightly ahead of us.
+ *
+ * DEFENCE IN DEPTH, NOT A LIVE HOLE. The door never issues a future-dated token
+ * and forging one requires DOOR_DEAL_SALT. But `issued` accepts up to twelve
+ * digits, so without this a token claiming a date in the year 33000 would
+ * satisfy any maximum-age check forever — which would make the expiry above
+ * decorative on exactly the day it started to matter, the day the secret leaked.
+ * Five minutes absorbs ordinary clock disagreement between the edge and the
+ * function.
+ */
+const CLOCK_SKEW_MS = 5 * 60 * 1000;
+
 /** Base64url without padding — safe in JSON, URLs, and a pasted block. */
 function b64url(bytes) {
   let s = '';
@@ -77,10 +120,25 @@ export async function issueDealToken(variant, secret, now = Date.now()) {
  * Verify a token and return the variant it proves, or null.
  *
  * Null for every failure — malformed, unknown version, bad signature, unknown
- * variant, no secret configured. The caller cannot tell those apart and does not
- * need to: every one of them means "not observed."
+ * variant, expired, future-dated, no secret configured. The caller cannot tell
+ * those apart and does not need to: every one of them means "not observed."
+ *
+ * THE AGE CHECK IS ON BY DEFAULT, and that is the point. An opt-in parameter
+ * would have left the one call site that matters — agent-submit.mts, which
+ * passes two arguments — exactly as exposed as it was before, which is a fix in
+ * name only. Callers that genuinely want no expiry pass `maxAgeMs: Infinity`
+ * and say so at their call site.
+ *
+ * @param token   the token string, or anything at all
+ * @param secret  DOOR_DEAL_SALT, or null/undefined when it is not configured
+ * @param opts.now       epoch millis, injected so the tests are not clock-dependent
+ * @param opts.maxAgeMs  how old a token may be; Infinity disables the check
  */
-export async function verifyDealToken(token, secret) {
+export async function verifyDealToken(
+  token,
+  secret,
+  { now = Date.now(), maxAgeMs = DEAL_TOKEN_MAX_AGE_MS } = {}
+) {
   if (!secret || typeof token !== 'string') return null;
   // Bound the work before doing any: an oversized string should cost a length
   // check, not an HMAC.
@@ -94,6 +152,13 @@ export async function verifyDealToken(token, secret) {
   if (!BRIEF_VARIANTS.includes(variant)) return null;
   if (!/^\d{1,12}$/.test(issued)) return null;

+  // Age before HMAC — the cheap check first, matching the length bound above.
+  // This is not a timing oracle: `issued` travels in the clear inside the token,
+  // so anyone holding one can already read its date without measuring anything.
+  const age = now - Number(issued) * 1000;
+  if (age > maxAgeMs) return null;
+  if (age < -CLOCK_SKEW_MS) return null;
+
   const expected = await sign(`${version}.${variant}.${issued}.${nonce}`, secret);
   if (!timingSafeEqual(expected, mac)) return null;
```

---

# 4. THE THING FOUND WHILE WRITING THE TESTS

**This is the part most worth a second reader, because it nearly shipped
invisibly.**

`tests/deal-token.test.mjs` pins its clock to `NOW = 1_785_000_000_000` —
approximately **2026-07-25**, five or six days before this change. A default-on
fourteen-day expiry therefore left the suite **green today**, and it would have
begun **failing on its own around 2026-08-08** with nothing in the repository
having changed. That is a time bomb five days after launch.

The worse half is subtler. Several tests assert `null` for a bad secret or a
malformed shape. Once `NOW` aged past the window, those would have kept passing
**for the wrong reason** — expiry rather than the property each test names — and
would have quietly stopped guarding the HMAC at all. A green suite that has
stopped testing what it claims is worse than a red one.

**The fix:** the fixed clock is now threaded through **every** `verifyDealToken`
call in the file, so each test still tests what it says it tests. That accounts
for most of the test diff and honours the file's own stated rule that
`Date.now()` must not decide a test.

This is recorded in the C6 append too. A security fix that quietly arms a time
bomb in the suite meant to guard it is worth writing down.

---

# 5. Tests — 19 in the file, 10 new

| Test | What it pins |
|---|---|
| inside the window | a fresh token still proves its variant |
| past the window | a stale token proves nothing |
| **boundary is inclusive** | exactly 14 days still verifies — `age > maxAgeMs` is strict, and a later refactor to `>=` would silently move the edge |
| fourteen days is the ruled number | `DEAL_TOKEN_MAX_AGE_MS === 14 * DAY`, so the constant cannot drift from the ruling |
| **ON BY DEFAULT** | a two-argument call — `agent-submit.mts`'s exact shape — expires a stale token and accepts a fresh one, **both asserted against the real clock** so this test cannot rot the way a fixed `NOW` would |
| future-dated refused | beyond the five-minute allowance |
| ordinary skew tolerated | two minutes of edge-vs-function drift does not refuse a good token |
| expired ≡ forged | both return `null`; no caller can tell which failure occurred |
| explicit opt-out | `maxAgeMs: Infinity` disables the check, so a caller who wants no expiry must ask for it in writing |
| desk inspection survives | `dealTokenIssuedAt()` still reads the age of a token that no longer verifies |

Full test diff omitted here for length; it is the file
`tests/deal-token.test.mjs` on the branch. Its substance is the table above plus
the clock-threading described in §4.

---

# 6. The C6 append

Appended beneath the existing entry, index row untouched — the discipline C2 set
and C5/C7 followed. It supersedes **only** the "enforcement deferred, no code
changes here" clause and says so explicitly; the reasoning against a single-use
ledger and the binding condition on publishing `brief_variant_observed` both
stand unaltered.

The key paragraph, stated without inflation:

> **WHAT IS REMEDIATED, STATED WITHOUT INFLATION:** "valid indefinitely" is now
> "valid for fourteen days." **What is NOT:** the same token may still back more
> than one submission inside that window, and the anonymous-door reroll residual
> is unchanged and unclosable by a TTL. This narrows the replay window; it does
> not close it. `brief_variant_observed` is still not a random sample, and the
> caution against reading it as one is undiminished.

---

# 7. The diff, and the checks

```
 docs/AGENT-DIRECT-SECURITY-REVIEW.md |  49 +++++++++++++++
 src/lib/deal-token.mjs               |  71 +++++++++++++++++++++-
 tests/deal-token.test.mjs            | 113 ++++++++++++++++++++++++++++++++---
 3 files changed, 222 insertions(+), 11 deletions(-)
```

`netlify/functions/agent-submit.mts` is deliberately **absent** from that list.

- `npm test` — **156 pass, 0 fail** (was 146; +10)
- `npm run test:sql` — **47 assertions, all pass.** *The first run failed with
  `postgres did not become ready`. That was a transient container start, not the
  code: this branch touches no SQL (`git diff main...HEAD -- supabase/` is
  empty), and it passed clean on retry. Recorded rather than reporting only the
  green run.*
- `npm run build` — **29 pages, clean**
- `npm run check:rulings` — **✓ append-only intact**; `RULINGS.md` untouched by
  this branch

---

# 8. One judgment call, flagged for review

The **"WHAT IT DOES NOT DO"** paragraph in the file header previously described
only the reroll residual and omitted **reuse** — the omission C6 itself
identified. It now states that reuse is bounded to the window rather than
unbounded in time.

That is an edit to a **code comment**, not to a dated record, so it is a
correction in place rather than an append. Flagged because the distinction
between "this file may be edited" and "this record may only be appended to"
is one this repository takes seriously, and a reviewer should confirm the line
falls where I have put it.

---

# 9. What is being asked

1. **The co-editor's read of the diff**, particularly §4 — whether threading the
   clock through the pre-existing tests is the right call, or whether those tests
   should have been left alone and the drift accepted.
2. **§8** — whether amending the header paragraph in place is correct, or whether
   even a code comment describing a disclosed residual should have been left and
   corrected only in the security review.

Nothing is committed and no PR is open. On the co-editor's word, this becomes a
commit and a PR against `main`, for Amy to merge or not.
