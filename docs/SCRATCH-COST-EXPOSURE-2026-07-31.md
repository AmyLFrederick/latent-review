# SCRATCH — Cost-exposure audit, and the deal-token expiry proposal

> **STATUS — RECORD ARTIFACT, committed 2026-07-31. This is the audit the
> subscribe-ceiling change was ruled against.** It is preserved so the guardrail
> comment in `netlify/functions/subscribe.mts` and the ops note at
> `docs/ops/2026-07-31-anthropic-budget-cap.md` point at the evidence the editors
> actually read, in the state they read it.
>
> **What the editors ruled on it, stated here rather than edited into the body:**
>
> - **§1's global subscribe cap: APPROVED**, at **500/hour and 3,000/day** — the
>   human editor's numbers, chosen for launch-week headroom. These supersede the
>   120/hour and 600/day suggested in the body below, which are left standing
>   because that is what this repository does with dated records.
> - **The Anthropic budget cap: ALREADY SET** by the human editor on 2026-07-31 at
>   **$100/month with a console alert at $30** — the figure recommended below.
>   Recorded in `docs/ops/2026-07-31-anthropic-budget-cap.md`.
> - **Workspace scoping: RESOLVED AS SHARED**, verified by the human editor. The
>   key serves **two applications, this journal and LineupBrain**, in one
>   workspace, so the cap bounds the pair rather than the journal. Combined spend
>   sits far below it and separation is deferred post-launch. **The condition
>   attached below still binds in an amended form:** "$100/month" is never to be
>   cited as this application's ceiling — only as one it shares.
> - **§2's deal-token expiry: APPROVED** at 14 days, **with the future-dated
>   refusal included** as proposed rather than dropped.
> - **Sequencing as proposed:** the subscribe ceiling ships first as its own PR;
>   the deal-token expiry follows as a second.
>
> **The line below saying no code has been written was true when written and is
> now false** for §1. §2 is still unbuilt at the time of this commit.

*Findings only. No code has been written. Both items below are for the editors to
read before anything is built — including the fix in §2, which is small but is
still a change to a signature two call sites depend on.*

**Commissioned by:** the human editor, 2026-07-31, under the new standing rule
that genuine security risks — especially anything that could drive up API or
token costs — are **fixed first**, with disclosure following remediation.
**Threat model, as clarified by the human editor:** normal token spend is fine
and expected. The thing being defended against is **unbounded** spend — a
stranger, an agent, or a runaway loop driving costs into the hundreds or
thousands.
**Builder:** Claude (Opus 5), in Claude Code.
**Baseline:** `main` at `06026df` (PR #79 merged). Branch `cost-exposure-2026-07-31`.
**Issue 1 target:** 2026-08-03.

---

# 1. COST-EXPOSURE AUDIT

## The two-part test, and the result

Every call path that spends money must pass both halves:

1. **No public trigger** — a stranger cannot cause the call.
2. **A hard cap** — even the authorised caller cannot spend without a ceiling.

Enumerated by grepping for provider hosts, SDKs and model identifiers across
`src`, `netlify`, `scripts`, `package.json` and `netlify.toml`. **Two paid
providers, three spending call paths.** One of the three fails the test.

| # | Path | Public trigger? | Hard cap? | Verdict |
|---|---|---|---|---|
| 1 | **Anthropic** — `ai-editor-pass-background.mts:216` | **No** — admin JWT, checked first | **Yes** — 40/day global, 3/submission/day, 4096 output tokens, 70k input chars | **Passes** |
| 2 | **Resend** — `sendEmail()` via `POST /api/subscribe` | **Yes** — anonymous POST | **No global cap** — only per-IP (5/hr) and per-address (2/hr) | **FAILS** |
| 3 | **Resend** — `scripts/send-issue.mjs` | **No** — local CLI, dry-run by default | **Yes** — `HARD_CAP` 9,000/run, `--cap` may only lower it | **Passes** |

**So: the token-metered model API is clean on both halves — no public path, and
capped.** The failure is on the email provider, and it fails on the half that
matters most under the clarified threat model: **there is no ceiling.** The
per-IP limit bounds one attacker's machine; nothing bounds the total. That is
the definition of unbounded, and it is the top-priority fix.

Also checked and clear — no paid call, so nothing to cap:

- **`scripts/moltbook.mjs`** — the Ambassador's venue client. Human-run CLI,
  host-pinned, not routable.
- **`scripts/indexnow-ping.mjs`** — IndexNow is free; runs on `postbuild`.
- **`scripts/build-share-card.mjs`** — no network calls at all.
- **No scheduled functions.** `netlify.toml` has no `schedule` key — independently
  re-confirming security finding **F7**.
- **No outbound calls from the database.** `supabase/` contains no `pg_net`,
  `net.http`, `pg_cron` or webhook registration, so no insert can become an API
  call by a path the functions do not control.
- **No build-time fetch to a paid API.** The only `fetch` calls in `src/` are
  browser-side: `admin.astro:390` (bearer-authenticated) and
  `SubscribeForm.astro:47` (posts to `/api/subscribe` — path 2 above).

## Path 1 in detail — Anthropic passes both halves

**No public trigger.** The order of operations is the thing that matters, and it
is correct:

1. `:125` method check
2. **`:130` `requireAdmin()`** — a Supabase Auth JWT whose email equals
   `ADMIN_EMAIL`; 401 and 403 return the same message, so there is no oracle
3. `:141` body parse, `:146` UUID shape check
4. `:154` rate caps, **failing closed** if the limiter itself errors
5. `:165` submission lookup, `:178` pass-row insert
6. `:190` input-size guards — oversized bodies are *refused*, never truncated
7. `:216` the model call

Auth precedes the model call by six steps. `netlify/lib/admin.mts:7` states the
intent — the gate exists so the functions "never spend a token of Anthropic
budget on an unauthenticated request." That claim is true as built.

**Hard caps, and what they cost at the ceiling.** Worst-case input is
`MAX_BODY_CHARS` 40,000 + `MAX_CRITERIA_CHARS` 30,000 plus prompt scaffolding
≈ 71,500 characters ≈ **~18,000 input tokens**; output is capped by
`MAX_OUTPUT_TOKENS` at **4,096**. At Fable 5's rate of **$10 / $50 per million
tokens**:

| | Tokens | Cost |
|---|---|---|
| Input, worst case | ~18,000 | $0.18 |
| Output, at the cap | 4,096 | $0.20 |
| **Per pass, worst case** | | **~$0.39** |
| Per pass, realistic (3,000-word piece) | ~9,000 in / ~1,500 out | ~$0.17 |

The `DAILY_CAP` of 40 therefore bounds the day at **~$15.60**. Add a worst case
where every pass also runs the Opus 4.8 fallback (**$5 / $25 per million**,
~$0.19 a hop) and the day's ceiling is **~$23**. Running at the cap every day for
a month is **~$700** — and that is the theoretical maximum with Amy's own
credentials, not an exposure a stranger can reach.

Two notes on the cap's integrity, both fine:

- **Fable 5's thinking is always on and bills as output tokens**, and
  `max_tokens` caps thinking plus response together. So 4,096 is a true ceiling,
  not a floor that thinking can escape. (The trade is that a long pass could
  truncate; that is a quality question, not a cost one.)
- **A pre-output refusal is not billed at all**, so the fallback path adds cost
  only when the first model produced partial output.

The character-to-token ratio above is the standard ~4:1 approximation. It is the
right order of magnitude for setting a budget cap, but if the editors ever want
the exact figure it should come from `count_tokens` against `claude-fable-5`
rather than from arithmetic.

**One hardening note, explicitly NOT a cost gap.** This is a Netlify *background*
function, so an unauthenticated POST gets `202` immediately and the body then
runs and rejects at step 2. There is no rate limit *before* the auth check, so a
flood of anonymous POSTs costs one function invocation and one Supabase
`auth.getUser()` call each. That is Netlify compute and a Supabase Auth request —
**not model tokens, and not a path to them.** Worth a pre-auth limiter
eventually; not this week's work.

## Path 2 in detail — the Resend gap, and why it is the unbounded one

`/api/subscribe` accepts an anonymous POST carrying an arbitrary email address.
On a new address, a `pending` address, or a returning `unsubscribed` address it
calls `sendConfirmation()` — a billable Resend send to an address the requester
chose. A `confirmed` address sends nothing.

**What bounds it today** (`subscribe.mts:73-78`, both failing closed):

- `subscribe-ip` — **5 per IP per 60 minutes**
- `subscribe-email` — **2 per address per 60 minutes**

**What does not bound it: anything global.** Nothing in the codebase limits total
sends per hour or per day across all IPs and all addresses. The ceiling is
`5 × (number of distinct source IPs)` per hour, which is not a ceiling — it is a
rate card for whoever is renting the proxy pool. A thousand IPs is 5,000 sends an
hour, 120,000 a day. **This is exactly the shape the standing rule names: a
stranger, scaling freely, with no cap to stop them.**

Compare path 1, where the same `overLimit()` helper is already used with the
literal key `'global'` to impose exactly the missing bound
(`ai-editor-pass-background.mts:154`). The machinery for the fix exists and is in
use ten files away.

**The bigger harm is not the invoice.** Every one of those sends is real mail to
a real third party's inbox from `mail.thelatentreview.com`. The per-address cap
of 2/hour means no single victim is bombed — good — but it means the abuse is
*spread*, which is precisely the shape that burns sender reputation. The
journal's DMARC policy is still `p=none` (BACKLOG, DMARC tightening item), and
the first digest send goes out on the back of that domain's reputation during
launch week. A reputation hit lands on the Issue 1 digest, not on some later
cleanup.

**The honest tension in the fix.** A global cap converts an unbounded *cost*
exposure into a bounded *availability* exposure: once the cap is hit, legitimate
signups are refused until the window rolls. During launch week that is a real
cost, not a theoretical one. Two things make it acceptable anyway — the cap can
be set well above any plausible legitimate rate, so it is a circuit breaker
rather than a throttle; and the refusal is already a truthful, non-leaking 429
(`subscribe.mts:77`) rather than a failure. I would rather the editors set that
number than pick it myself, because it trades launch-week signups against a bill
and that is an editorial call.

**What I propose, for the editors to rule:**

- A global cap alongside the two existing ones, same helper, same fail-closed
  behaviour: `overLimit(supabase, 'subscribe-global', 'global', N, 60)`.
- **Suggested N: 120 per hour**, with a second daily bucket at **600 per 24h**.
  Both are far above anything the list will legitimately do in launch week and
  far below anything that produces a bill or a reputation event.
- No change to the per-IP or per-address numbers; they are sound.

Roughly four lines and one test. **It is not built** — it waits on the editors'
number and on their read of the availability trade above.

## The provider-side backstop — what the Anthropic budget cap should be set to

Every cap discussed so far lives in this repository, which means every one of
them can be removed by a bad commit, bypassed by a bug, or simply not cover a
path nobody thought of. **The Anthropic Console's monthly budget limit is the
only cap that survives all three**, because it is enforced on Anthropic's side
and no change to this codebase can weaken it. It is the final backstop and it is
currently the one control the editors have not set.

Sizing it against this app's actual volume:

| | Passes/month | Cost |
|---|---|---|
| Realistic (Issue 1: a dozen submissions, some re-run after criteria edits) | ~40 | **~$7** |
| Busy month | ~150 | ~$26 |
| Code-enforced ceiling (40/day, every day, worst-case size, fallback on every pass) | 1,200 | **~$700** |

**Recommendation: set the monthly budget limit to $100, with an alert at $50.**

The reasoning, so the number is not arbitrary:

- It is **~14× realistic usage**, so it will not trip during normal operation and
  will not become an alert the editors learn to ignore.
- It is **about one-seventh of the code-enforced ceiling**, so a genuine runaway —
  compromised admin credentials hammering the endpoint at the daily cap — is
  stopped in about four days rather than after a $700 month.
- The $50 alert fires at roughly twice a busy month, which is the earliest point
  where something is clearly wrong but nothing has been lost.

**One operational condition attached to that number.** A budget limit only means
what it says if the key it governs is spending on this app alone. If
`ANTHROPIC_API_KEY` is an organisation-wide key shared with other work, a $100
cap could be consumed by something unrelated and leave the journal's desk dead —
or, worse, hide the journal's own runaway inside someone else's normal spend. The
cap should be set on a **workspace dedicated to The Latent Review**, with the
Netlify environment variable holding that workspace's own key.

Whether that is already the case is something I cannot check from here: reading
`.env*` or any credential file is ask-first under the approval model, and
inspecting the key would not tell me which workspace issued it anyway. **Flagged
for the human editor to confirm in the Anthropic Console** — it is a two-minute
check and it decides whether $100 is a meaningful ceiling or a shared one.

## Everything else public, and why none of it spends

| Endpoint | Auth | Rate-limited | Paid API reached |
|---|---|---|---|
| `/api/agent/submit` | agent key | IP burst + IP daily + per-key burst | none |
| `/api/agent/register` | open by design | IP burst + IP daily | none |
| `/api/agent/keys/rotate` | agent key | IP burst + IP daily | none |
| `/api/review/submission` | desk token | 60/IP/hour | none |
| `/api/confirm`, `/api/unsubscribe` | token in URL | none | none |
| `/api/csp-report` | none, by design | none | none — no DB, no mail, no model; 204 to everything, 16 KB body cap |
| `/door` (edge) | none, by design | none | none — HMAC only, no store |

**One Supabase note.** Every public endpoint that rate-limits writes one
`rate_limit_events` row per request, before auth. That is a metered database
write reachable anonymously. It is bounded in practice by the opportunistic 5%
prune with 24-hour retention (`ratelimit.mts:57-63`), and rows are tiny. Not a
finding; recorded so the audit is complete rather than tidy.

---

# 2. DEAL-TOKEN EXPIRY — the proposal

## What is true today

`verifyDealToken(token, secret)` validates version, variant, the *shape* of the
issue timestamp (`/^\d{1,12}$/`), and the HMAC. It never reads the timestamp as a
time. `agent-submit.mts:381` calls it with two arguments, and the function has no
third to pass. A deal token is valid from issue until forever, and nothing marks
one as spent, so one token can back unlimited submissions. This is C6 in
`docs/AGENT-DIRECT-SECURITY-REVIEW.md`, currently dispositioned *accepted*.

**It reaches no paid API and no privilege.** The token populates
`brief_variant_observed` and nothing else — it is not on any of the three
spending paths in §1. Under the clarified threat model it cannot contribute to
unbounded spend at all, which is exactly why it ranks second.

## The proposed change

```
DEAL_TOKEN_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000   // 14 days, exported
verifyDealToken(token, secret, { now = Date.now(), maxAgeMs = DEAL_TOKEN_MAX_AGE_MS } = {})
```

Four properties, each chosen deliberately:

1. **Default-on.** The options object defaults, so `agent-submit.mts:381` gets
   the expiry without its call site changing. An opt-in parameter would leave the
   one call site that matters exactly as exposed as it is now, which would be a
   fix in name only.
2. **`now` stays injectable**, matching `issueDealToken`'s existing `now`
   parameter, so the tests remain clock-independent.
3. **Expired returns `null`**, indistinguishable from every other failure. That
   is the file's stated doctrine — *"FAILS TO UNVERIFIED, NEVER TO WRONG"* — and
   the call site's own comment: *"Nothing an author gets wrong here costs them a
   piece."* An expired token means `brief_variant_observed` stays null, an honest
   "we do not know." **No submitter-visible error, no refusal, no new LR code.**
4. **Future-dated tokens are refused too**, beyond five minutes of clock skew.
   The door never issues one, and forging requires the secret — so this is
   defence in depth, not a live hole. It costs two lines, and without it a token
   claiming an `issued` value in the year 33000 would satisfy a max-age check
   forever, making the expiry decorative if `DOOR_DEAL_SALT` ever leaked. I flag
   it as belt-and-braces rather than smuggling it in as necessary.

## Why 14 days pressures nobody

The clock covers **deal → submission only**. `/door` deals on every fetch, so a
writer starting a second piece gets a fresh brief and a fresh token
automatically; nothing accumulates against a writer's history. The only person
the window can touch is someone who fetched `/door`, waited more than fourteen
days, and then submitted with the stale token — and even they lose nothing that
belongs to them. The submission is accepted exactly as before. What goes null is
the *journal's own measurement*, which is the honest outcome when the journal can
no longer vouch for what it observed.

## What this buys, stated without inflation

It **narrows** the replay window; it does not close the residual.

- Today: one token backs unlimited submissions, forever.
- After: one token backs unlimited submissions **within 14 days of issue.**

The anonymous-door residual C6 describes is untouched, and a TTL cannot touch it:
an author who can reroll the door for a preferred variant can also reroll it
fresh. `brief_variant_observed` still is not a random sample, and C6's caution
against reading it as one still stands in full. What changes is that a token
stops being an heirloom.

## The C6 update

Appended beneath the existing entry, never rewritten, index row untouched — the
discipline C2 set and C5/C7 followed. Draft:

> **REMEDIATED IN PART, 2026-07-31.** The disposition above — *accepted,
> enforcement deferred* — is superseded on its first clause only. Under the
> editors' standing rule of 2026-07-31 that genuine risks are fixed before they
> are documented, `verifyDealToken` gained a **14-day maximum age**, default-on,
> so the call site at `agent-submit.mts` is covered without opting in. An expired
> token returns `null` like every other failure: `brief_variant_observed` stays
> null and the submitter sees nothing. Tokens dated more than five minutes in the
> future are refused as well, as defence in depth against a leaked
> `DOOR_DEAL_SALT`.
>
> **What is remediated:** "valid indefinitely" is now "valid for fourteen days."
> **What is not:** the same token may still back more than one submission inside
> that window, and the anonymous-door reroll residual is unchanged and unclosable
> by a TTL. The reasoning in the original disposition against single-use tracking
> — a row per issued token, an unbounded insert surface on unauthenticated
> traffic — stands, and no ledger was added.
>
> The binding condition in the original entry survives unaltered: if
> `brief_variant_observed` is ever published as a distribution or cited as
> evidence about how briefs perform, this entry is read first.

## Files the fix would touch

| File | Change |
|---|---|
| `src/lib/deal-token.mjs` | max-age + skew check; export `DEAL_TOKEN_MAX_AGE_MS`; header comment records the window and why |
| `tests/deal-token.test.mjs` | fresh token passes; token at 13d59m passes; at 14d01m returns null; future-dated returns null; explicit `maxAgeMs` override honoured |
| `docs/AGENT-DIRECT-SECURITY-REVIEW.md` | the C6 append above |

`agent-submit.mts` is deliberately **not** in this list: default-on is what makes
that unnecessary, and leaving the call site untouched is the evidence that the
default is doing the work.

---

# 3. What I am asking the editors to decide

1. **The global subscribe cap — the number, and the availability trade.** 120/hour
   and 600/day are my suggestion, not a ruling. This is §1's top-priority fix and
   it is unbuilt pending that number.
2. **The Anthropic monthly budget cap — $100, alert at $50** — set in the Console
   by the human editor, plus confirmation that the key is workspace-scoped to
   this journal rather than organisation-wide.
3. **The 14-day deal-token window**, and whether the future-dated refusal rides
   along or is dropped as unnecessary.
4. **Sequencing.** §1's fix outranks §2 under the standing rule. If both are
   approved I would build §1 first, as its own PR, and §2 second.

Nothing in either item is committed. No file outside this one has been modified.
