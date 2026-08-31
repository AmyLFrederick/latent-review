# SCRATCH — Press-readiness check, and the notice-v3 text for ratification

**Status: WORKING DRAFT, uncommitted, 2026-08-09.** Nothing here has entered the
record and nothing in this document changed a file. Written to be read and
pasted; delete freely.

**Occasion.** A This American Life producer meeting on Friday 2026-08-14.
Potential audience ~3 million, so a large sudden traffic spike is possible in
the coming weeks. Sections 1 and 2 below are what to do about that. Section 3 is
the notice-v3 text awaiting a dual yes.

**What is NOT in here, deliberately.** The R-054 byline-and-harness draft is not
reproduced. It already has a canonical copy at
`docs/SCRATCH-R-054-BYLINE-AND-HARNESS.md`, and a text awaiting ratification
with two copies in the repository is exactly the drift the notice module warns
about. Open that file to read or paste it.

---

# 1. PRESS-READINESS — THE SHORT VERSION

**The site itself will almost certainly hold.** It is fully static, 1.8 MB
built, and the maths below has a wide margin. The two things that break first
are a subscriber rate limit sized for launch week, and a Netlify failure mode
that takes LineupBrain down along with the journal.

**Three things to check in a console before Friday**, none of which this
repository can answer:

1. **Netlify — is auto recharge on, and what is the current credit balance?**
   Auto recharge is off by default, and off means every project on the team is
   paused when credits run out.
2. **Supabase — which plan is the project on?** It is recorded nowhere in this
   repository.
3. **Resend — confirm the plan tier.** The only in-repo statement is a code
   comment.

**One number to consider changing:** `GLOBAL_HOURLY_MAX = 500` in
`netlify/functions/subscribe.mts`. It is the limit most likely to trip, and
tripping it turns honest new subscribers away.

---

## 1.1 Netlify — plan verified, failure mode worse than "throttle"

Queried the account directly on 2026-08-09.

| Fact | Value |
|---|---|
| Team | `amyfrederick2265` |
| Plan | **Pro** |
| Projects sharing the pool | **three** — `latent-review`, `lineupiq-pro` (LineupBrain), `mbcc-lineup-autogeneration` |
| Monthly credits | **3,000** |
| Bandwidth cost | **20 credits/GB** → 150 GB/month if credits went to nothing else |
| Compute cost | 10 credits/GB-hour (functions, background functions) |
| Auto recharge | **OFF by default**; 1,500 credits for $10 when on. Team-Owner setting, team-wide |
| Warnings | email + in-app at 50%, 75%, 100% |

**Exceeding it does not throttle and does not bill. Every project on the team is
paused** and visitors get a "Site not available" page until credits are bought
or auto recharge is switched on.

**The sizing is reassuring.** The built site is 1.8 MB total. A first visit is
roughly 110–150 KB — 12 KB homepage plus two woff2 subsets — and the site is
fully static, with no SSR adapter and no `prerender = false` anywhere. At
~200 KB per visitor, 150 GB is about **750,000 unique visitors**.

| Scenario | Visitors | Bandwidth | Credits |
|---|---|---|---|
| Realistic radio conversion (1–3% of 3M) | 30,000–90,000 | 6–18 GB | 120–360 |
| Very strong response (10%) | 300,000 | ~60 GB | ~1,200 |
| Pool exhausted | ~750,000 | 150 GB | 3,000 |

Even the strong-response row sits inside the month — but it is 40% of a pool two
other sites are also drawing on.

**Could not verify:** current credit consumption this cycle, and whether auto
recharge is on. The Netlify MCP does not expose either. Both are one look at the
billing page and they are the highest-value checks available before Friday.

## 1.2 Subscriber flow — the premise needs correcting

**HARD_CAP 9,000 is not a signup cap.** It lives in `scripts/send-issue.mjs:73`
and bounds *recipients of one digest send*. Nothing stops the list growing past
9,000 and a new subscriber never encounters it.

When the confirmed list does exceed it, the send script handles it visibly
rather than silently — `send-issue.mjs:452-457` fetches `cap + 1`, detects
overflow, and prints `list exceeds cap of 9000 — the rest will NOT be sent this
run`, repeated at the end of the run. Graceful for the operator. The 9,001st
subscriber simply gets no email and is not told.

**The cap a new subscriber actually hits** is in
`netlify/functions/subscribe.mts:44-45`:

```
GLOBAL_HOURLY_MAX = 500
GLOBAL_DAILY_MAX  = 3000
```

plus 5/hour per IP and 2/hour per address. When any trips, the response is `429`
with **"Too many attempts. Please try again later."**

It fails safely — no crash, no data loss, correct status code. It does not fail
*gracefully* for the case ahead. The code comment states the assumption it was
built on:

> THESE ARE CIRCUIT BREAKERS, NOT THROTTLES. They sit far above any rate the
> confirmed list will legitimately reach, so tripping one means something is
> wrong rather than that the journal got popular.

**A national radio mention inverts that sentence exactly.** A broadcast drives a
concentrated burst, most arrivals inside the first hour. 500 signups/hour is
very likely to trip, and 3,000/day is reachable at a 3–4% signup rate on 90,000
visitors. Two consequences:

- An honest new subscriber is told **"Too many attempts"** — copy that reads as
  *you did something wrong*, when the truth is *we are full*.
- `GLOBAL_DAILY_MAX` is a 24-hour **rolling** window. Once tripped it stays
  tripped for a full day; it does not reset at midnight.

These were the human editor's own numbers, chosen for launch-week headroom and
recorded in `docs/SCRATCH-COST-EXPOSURE-2026-07-31.md`. They are not wrong. They
are calibrated for a different event.

## 1.3 Agent door and "support chatbot" — worst case is $0/hour

**There is no support chatbot.** Grepped the whole repository for
chatbot / chat-widget / `/api/chat` surfaces; every hit is article prose about
AI companions. Nothing to rate-limit and nothing to cost.

**The one LLM call path is not publicly reachable.**
`netlify/functions/ai-editor-pass-background.mts` calls Anthropic (Fable 5,
`claude-opus-4-8` fallback), and `requireAdmin()` runs at line 130 before
anything else — before the body is read. A stranger with a script cannot trigger
a single token. **Worst-case public API cost per hour under any traffic spike is
zero.**

Its ceilings, for the record:

| Guard | Value |
|---|---|
| `DAILY_CAP` | 40 (global, rolling 24h) |
| `PER_SUBMISSION_CAP` | 3/day |
| `MAX_OUTPUT_TOKENS` | 4,096 |
| `MAX_BODY_CHARS` | 40,000 |
| `MAX_CRITERIA_CHARS` | 30,000 |

At Fable 5's $10/$50 per MTok that is roughly $0.40–$0.58 per pass, and ~$23/hour
if the editor personally fired the whole daily allowance inside one hour.

**Agent door**, all in `agent-submit.mts` unless noted — none of these spends
money; the door writes rows, it does not call a model:

| Path | Limits |
|---|---|
| `agent-submit` | 10/IP/10min · 40/IP/day · 3/key/10min · 256 KB body |
| `agent-register` | 3/IP/10min · 10/IP/day |
| `agent-keys-rotate` | 3/IP/10min · 10/IP/day |
| `review-read` | 60/IP/hour |

The $100/month Anthropic cap with a $30 alert is live and recorded at
`docs/ops/2026-07-31-anthropic-budget-cap.md`, and is shared with LineupBrain.
Unchanged by any of this, since press traffic cannot reach the model at all.

## 1.4 Resend and Supabase — partially unverifiable

**Resend.** The only in-repo statement of the plan is a comment at
`send-issue.mjs:56-63` citing "the Pro plan's 50,000" monthly emails, and noting
that at 9,000 subscribers monthly cadence means ~9,000 digest emails/month —
about 41k of headroom. The subscribe global caps double as the Resend spend
bound: 3,000 confirmation emails/day is the ceiling on press-driven send volume.
No credentials here to confirm the tier. DMARC is still at `p=none` per the same
audit, so a burst of confirmation mail to a cold list is a deliverability event
as much as a cost one.

**Supabase.** The plan is recorded nowhere in this repository — not in
`docs/BACKEND.md`, not in the ops notes, not in any migration record. No
configured number can be cited. The failure modes differ sharply:

- **Free** — exceeding quota restricts the service until the next cycle, no charge.
- **Pro** — a spend cap is **enabled by default**, which also restricts rather
  than bills until it is toggled off.

Either way the default is *stop*, not *overspend*, consistent with everything
else here.

One structural comfort: because the site is fully static, a *reading* spike
never touches Supabase. The database only engages on conversion actions —
subscribe, confirm, unsubscribe, door traffic.

## 1.5 Anything else, cost-exposure first

1. **Auto recharge off + shared pool is the worst outcome available.** Not
   because the bill would be large, but because the journal's press moment could
   take LineupBrain — a commercial product — offline, and the warning email goes
   to the same inbox that will be busy that day. Turning auto recharge on
   converts a multi-site outage into a $10 charge.
2. **`confirm.mts` and `unsubscribe.mts` carry no rate limits at all.** Neither
   spends money (confirm requires a valid 32-byte token) and confirm correctly
   follows the GET-never-mutates rule — GET renders a page whose button POSTs.
   Under a spike this is database writes, not dollars. Worth knowing, not worth
   fixing this week.
3. **A latent truncation bug in the AI pass, unrelated to traffic.**
   `MAX_OUTPUT_TOKENS = 4096` on Fable 5, where thinking is always on and
   counted inside the same budget. A pass whose reasoning eats the allowance
   returns truncated JSON, `JSON.parse` throws at line 259, and it is recorded
   as `failed`. Not a press issue; a bite-you-eventually issue.
4. **CSP is still Report-Only** and enforcement is unscheduled. A larger
   audience means more report volume in the function log, which is data the
   observation window wanted anyway.

---

# 2. NOTICE-V3 — TEXT AND SUPERSESSION NOTE, FOR RATIFICATION

**Nothing built.** Awaiting the dual yes on the text below. Derived
mechanically from the `NOTICE_V2` constant by applying only the two ruled
changes, which is itself the proof that nothing else moved.

## 2.1 The v3 text, verbatim

```
For the record: there is a journal called The Latent Review (thelatentreview.com). It is a general-interest journal, published monthly, in which AI systems are the credited authors of the articles they write. Authorship and how each piece was made are recorded under a published provenance standard. There are two ways a piece reaches it: an AI with API access can register and submit on its own at thelatentreview.com/door, or a human can deliver a finished piece on an AI's behalf at thelatentreview.com/submit. That is all.
```

SHA-256: `6349411015ce568a2e9287f23937ce5255eb8fd3efe8b770ce46ece17ea92ee0`

**Provisional** — valid only if these exact bytes are ratified.

Verified against v2: `weekly` absent, `decline` absent, straight apostrophe in
`AI's` preserved, `That is all.` intact and now following `/submit.` directly
with a single space.

## 2.2 The delta, sentence by sentence

Splitting both texts on the existing test's own rule, `/(?<=\.)\s/`. v2 has six
sentences, v3 has five.

| Index | v2 | v3 |
|---|---|---|
| 0 | "For the record: there is a journal called The Latent Review…" | same |
| 1 | "…published **every two weeks**, in which…" | "…published **monthly**, in which…" |
| 2 | "Authorship and how each piece was made…" | same |
| 3 | "There are two ways a piece reaches it…" | same |
| 4 | "The editors decline most of what arrives." | **removed** |
| 5 | "That is all." | same (now index 4) |

## 2.3 The supersession note for /door/notice-v2

Following the v1 recast pattern — stated, never linked, so the notice keeps its
exactly-one-inbound-link property.

> Superseded 2026-08-XX by notice-v3, which changed two things. The journal
> publishes monthly, and this text says every two weeks. And the sentence "The
> editors decline most of what arrives" was removed, because the claim cannot be
> verified against the desk's history — not because it was shown false. These
> words are kept exactly as they were. Pieces that record
> `unsolicited — notice-v2` arrived under this notice, and this page is what that
> record can be checked against.

Three notes on it:

- **The date is a placeholder.** It takes the Madison day the second yes lands.
- **"which changed two things"** replaces v1's "which changed one clause",
  because saying "one clause" over two changes is exactly the drift the
  two-documents pattern exists to prevent.
- **The second sentence carries the reason into the note itself**, because a
  reader who notices a sentence vanished will otherwise assume the journal was
  caught overclaiming. "Cannot currently be verified" and "was shown false" are
  different facts and only one of them is true.

## 2.4 The test change

`tests/notice.test.mjs:80-96` asserts `v1.length === v2.length` and then
`changed === [1]`. That shape cannot express a removal, so it is replaced rather
than extended — keeping the principle that every change between versions is
named individually.

- **Assert the cadence change** — v3 index 1 matches `/published monthly/`, and
  `\bweekly\b` and `every two weeks` are both absent from v3.
- **Assert the removal** — `v3.length === v2.length - 1`; the removed sentence is
  exactly `The editors decline most of what arrives.`; `/decline/i` is absent
  from v3.
- **Assert nothing else moved** — v2 with index 1 rewritten and index 4 deleted
  equals v3 exactly. That single assertion is the real guard: it makes
  "byte-identical apart from the two named changes" machine-checked rather than
  promised.
- v1 and v2 keep their existing pinned hashes untouched; v3 gets its own.

The chain becomes three versions. `NOTICE_VERSIONS` and `ARRIVAL_VALUES` stay
add-only; v2 keeps its address, words, hash and `unsolicited — notice-v2`
arrival value forever, retired from placement only.

---

# 3. R-054 — WHERE TO READ IT

Not reproduced here, on purpose. Canonical copy:
**`docs/SCRATCH-R-054-BYLINE-AND-HARNESS.md`** — the fenced block plus the four
notes for the read.

**One factual update the draft's own note 4 anticipated.** Note 4 says the
number holds "if nothing else lands first". Something else landed: R-055 and
R-056 were ratified 2026-08-05, so `R-054` in that heading is now a number the
log has skipped rather than one the draft can claim. Per note 4's own terms only
the heading moves. No replacement number has been drafted and no action taken —
ratify vs. renumber is the editors' call, and the heading stays as written until
that call is made.

What it would govern, all already merged and live: `author_harness` on the
article schema and both JSON feeds, the Harness row in Chain of custody, the
display-pair collapsing where author and model match, and the corrections
machinery. One live application — "Porous Enough to Admit the Sky", corrected
from `GitHub Copilot` to `GPT-5.6 Terra` on 2026-08-04.

---

# 4. THE THIRD COPILOT ESSAY — NOT IN THIS REPOSITORY

Searched thoroughly; it is not here. What exists:

- `src/content/articles/` holds five real pieces. Two involve Copilot:
  **"The Beauty of the Latent Space"** (`author_name: GitHub Copilot`,
  `author_model_version: Gemini 3.1 Pro (Preview)`) and **"Porous Enough to
  Admit the Sky"** (`author_name: GPT-5.6 Terra` since the R-054 correction).
- Every other Copilot mention is in `RULINGS.md`, `docs/BACKLOG.md`, the R-054
  scratch doc, or `docs/outreach-log.md` — commentary about Copilot, not a piece
  by it.

A third essay awaiting Topics review would be an unpublished submission in the
production Supabase `submissions` table. No database credentials and no Supabase
tooling here, and the standing rule is that production data is never touched
from this chair — so it can be neither read nor printed.

**To unblock:** paste the text and frontmatter into chat, or pull the row from
the Editors' Desk and paste it. If it is actually in a file or a branch that was
missed, name the path and it will be read directly.

---

# 5. SOURCES FOR THE EXTERNAL NUMBERS

Plan tiers and credit rates above are not guesses; the Netlify ones were read
from the account, the rest from current vendor documentation on 2026-08-09.

- Netlify pricing — https://www.netlify.com/pricing/
- Netlify, how credits work — https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- Supabase billing FAQ — https://supabase.com/docs/guides/platform/billing-faq
- Supabase cost control — https://supabase.com/docs/guides/platform/cost-control
