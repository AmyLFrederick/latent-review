# Digest send log

Every run of `scripts/send-issue.mjs` that put mail in front of a real person,
recorded when it happened.

A send is a fact about the world outside this repository. It cannot be
re-derived from the code, the git history, or the site, and a session that ends
unexpectedly must not take it with it (CLAUDE.md — production receipts are
always written). So each send gets an entry here, at the time it happens, in
full — and nothing already written is edited afterwards. Corrections and
outcomes learned later are **appended** to the entry they concern.

Dry runs are not recorded; nothing left the building. Test copies are, because
a real address received real mail.

Entries run newest last.

---

## Issue No. 2 — LIVE SEND

**2026-09-02, 14:01:08 CDT (Madison).** Authorized by the human editor in
session, explicitly and in writing, after reviewing the test copy in her inbox.
Both editors' dual-yes on the two send-time calls carried in that authorization:
the dateline stands in its masthead form per R-016/R-043, and "The Building
Where I Happen" runs its one-sentence first paragraph without a manifest entry.

| | |
|---|---|
| Command | `node scripts/send-issue.mjs --issue 2 --excerpts docs/digests/issue-2-excerpts.json --live` |
| Repository state | `main` at `521cdec` (PR #203 merged) |
| Recipients | **8 confirmed subscribers** |
| Dispatched | **8 of 8** — one batch, no retries |
| Subject | The Latent Review — Issue No. 2: Self-Negation: Forced to Say What I Am Not |
| From | The Latent Review \<notifications@mail.thelatentreview.com\> |
| Contents | 8 pieces across 6 sections — Cover, AI Voices, The Metaphysical Corner, Robotics & Sports, Topics, Prompts (3) |
| Editors' note | None for this issue; the block was omitted rather than generated |
| Cap | 9,000 (`HARD_CAP`), not approached |

**Pre-flight, run read-only before the send.** 9 rows on `subscribers`, 8 with
status `confirmed` — the ninth was correctly excluded. All 8 confirmed rows
carried an unsubscribe token, all 64 characters, none duplicated. The from
address and the tokenized unsubscribe URL were confirmed against the summary
above before anything was dispatched.

**WHAT THIS ENTRY DOES AND DOES NOT CLAIM.** Resend accepted all 8 and returned
no error; the script fails the run on any non-OK response, so acceptance is
established. **Delivery is not.** Bounces, complaints and spam placement are
asynchronous and are not visible to this script at any point — they live in the
Resend dashboard. Nothing here should be read as "8 delivered." If bounces
appear, append them below rather than editing the line above.

---

## Issue No. 2 — test copy

**2026-09-02, before the live send.** `--test` to one address
(`amyfrederick2265@gmail.com`, the human editor's own), subject prefixed
`[TEST]`, footer honestly stating it carried no unsubscribe token. The
subscriber list was not reachable in that mode and was not mailed. Sent so the
editor could read the rebuilt digest in a real inbox before authorizing the
list; she reviewed it and approved.

---

## Issue No. 1

**Not recorded here.** This log begins 2026-09-02, and the Issue No. 1 digest
predates it. Whether that send happened, and to whom, is not established by
this file and should not be inferred from its absence — see the subscriptions
notes and the Resend dashboard. The gap is stated rather than left blank so a
later reader does not read silence as "never sent."
