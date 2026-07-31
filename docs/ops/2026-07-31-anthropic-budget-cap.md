# Ops note: Anthropic monthly budget cap set 2026-07-31

*Dated operational record. Not a security disclosure — no vulnerability, no
exposure, no incident. Recorded because a spending ceiling that exists only in a
console nobody wrote down is a control the next session cannot rely on.*

## What was set

**The human editor set a monthly budget limit of $100 on the Anthropic account
on 2026-07-31**, with a **console notification alert at $30**. No clock time is
recorded; the date is as reported by the editor who set it.

The alert sits at roughly four times realistic monthly use and roughly a third of
the cap, which is the interval where something is clearly wrong but nothing has
been lost yet.

## Why a provider-side cap exists at all

Every other spending guardrail in this project lives in this repository:
`DAILY_CAP` and `PER_SUBMISSION_CAP` in
`netlify/functions/ai-editor-pass-background.mts`, `MAX_OUTPUT_TOKENS`, the input
character bounds, `HARD_CAP` in `scripts/send-issue.mjs`, and the rate buckets in
`netlify/functions/subscribe.mts`. Each of those can be removed by a bad commit,
bypassed by a bug, or simply fail to cover a path nobody thought of.

The console budget limit is the only ceiling that survives all three, because it
is enforced on Anthropic's side and no change to this codebase can weaken it.
That is its whole job: it is not the first line of defence, it is the last one.

## How the number was chosen

From the cost-exposure audit of 2026-07-31
(`docs/SCRATCH-COST-EXPOSURE-2026-07-31.md` §1), against Fable 5 at $10/$50 per
million tokens with an Opus 4.8 fallback at $5/$25:

| | Passes/month | Cost |
|---|---|---|
| Realistic (Issue 1 volume, some re-runs after criteria edits) | ~40 | ~$7 |
| Busy month | ~150 | ~$26 |
| Code-enforced ceiling (40/day every day, worst-case input, fallback each pass) | 1,200 | ~$700 |

$100 is roughly fourteen times realistic use — high enough that it will not trip
in normal operation and become an alert the editors learn to ignore — and roughly
one-seventh of the ceiling the in-repo caps permit, so a genuine runaway is
stopped in about four days rather than after a $700 month.

The per-pass figures rest on the standard ~4 characters-per-token approximation,
which is the right order of magnitude for sizing a cap and is **not** an exact
count. If a future decision turns on the precise number, it should come from
`count_tokens` against `claude-fable-5` rather than from that arithmetic.

## Scoping — RESOLVED AS SHARED, verified by the human editor

**The key is shared.** The human editor checked the console on 2026-07-31 and
reports that `ANTHROPIC_API_KEY` belongs to a single workspace serving **two
applications: The Latent Review and LineupBrain**. The $100 cap and the $30 alert
therefore govern **the pair, not this journal alone**. Realistic combined spend is
far below both. Separation into a dedicated workspace is **deferred as a
post-launch chore** by the editors' decision of the same day.

Three consequences, recorded because a shared ceiling behaves differently from a
dedicated one and the difference is easy to forget:

- **The cap is not a bound on this application.** It is a bound on the sum. No
  document should cite "$100/month" as The Latent Review's ceiling; the honest
  phrasing is that the journal spends inside a $100 ceiling it shares.
- **The journal's effective headroom moves without this repository changing.** If
  LineupBrain's usage grows, what is left for the desk shrinks, and nothing in
  this codebase will reflect that. The in-repo caps in
  `netlify/functions/ai-editor-pass-background.mts` remain the only ceiling that
  is specifically this journal's, which is a further reason not to weaken them.
- **Neither the alert nor a cap trip attributes spend.** A $30 notification says
  the workspace crossed $30; it does not say which application did it. Diagnosis
  means opening the console, not reading the alert. A session investigating a cost
  surprise should not assume the desk caused it, and should not assume it didn't.

None of this is a finding — the arrangement is a deliberate, recorded choice, and
at the volumes involved it costs nothing. It is written down so the next session
reads the cap correctly rather than generously.

## What this note does not claim

It does not claim the cap has ever been tested by being reached — it has not, and
the desk's realistic volume means it should not be. It does not claim the cap
replaces the in-repo guardrails; those remain the first line and the ones a code
review can actually inspect. And it does not claim the alert will be seen: an
alert is a message to a human, and this note is the only place that records the
ceiling exists.
