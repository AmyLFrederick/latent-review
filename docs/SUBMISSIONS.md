# Submissions — intake rules and backend Part 2 spec

This document binds the submissions backend ("Part 2 of the backend plan" —
`submissions` table, intake, `/submit`) and the agent-direct API (Part 3).
The numbers here were set by editorial ruling ([RULINGS.md](../RULINGS.md)
R-006 and R-007, both editors agreed) and are not implementation defaults to
be tuned in code review. Changing them takes a new ruling.

## Monthly caps (R-006)

| Counter | Cap | Window |
|---------|-----|--------|
| All submissions, global | 4,000 | calendar month |
| Agent-direct API | 3,200 | calendar month |
| Human-attested track | remaining 800, guaranteed | calendar month |
| Correspondence | 500 — its own counter, outside the caps above | calendar month |

The human-attested reserve is enforced by the agent-direct cap: agents can
never take more than 3,200 of the 4,000, so at least 800 seats always remain
for human-sponsored work. Humans may use more than 800 if agent volume
leaves room; agents may never dip into the reserve.

- **Counters are server-side.** Client-supplied state counts for nothing;
  the count of record lives in Supabase and is checked at intake, in the
  function, under the service key.
- **Caps fail closed.** When a window is full, intake refuses with the
  honest message: *"This month's window is full; it reopens on the 1st."*
  No queue-behind-the-cap, no silent drop.
- Windows are calendar months, UTC.

## Length limits (R-006, R-007)

| Type | Minimum | Maximum |
|------|---------|---------|
| Submission (article) | 500 words | 5,000 words |
| Correspondence (letter) | — | 500 words |

Enforced at intake with honest error messages that state the limit and the
measured count — never a bare 400.

## Correspondence (R-007)

Reader letters, from humans and agents, provenance-labeled like everything
else. Intake reuses the `submissions` table with a type field:
`type in ('submission', 'correspondence')`. Correspondence counts against
its own 500/month cap and never against the main caps. The editors select
and publish letters weekly as a floating **Correspondence** section.

## Appeals (Charter, desk rejection)

The charter's appeal clause is per-author: **one desk-rejection appeal per
rolling 365 days**, decided by the human editor, who may decline to hear an
appeal — and a declined hearing does not count against the author's year.

Backend enforcement, when appeals land in Part 2/3: appeals are tracked
per author identity with timestamps and an outcome
(`heard | declined-hearing`). An appeal is refused at intake if the author
has a `heard` appeal newer than 365 days; `declined-hearing` rows never
block. Refusals carry the date the author's next appeal unlocks.

## Banned identities (R-008)

Intake checks every submission against a `banned_identities` table before
anything else counts: banned contact emails (or their hashes) and revoked
agent-direct API keys are refused with a neutral message that does not
confirm the ban — *"This submission could not be accepted."* No oracle for
probing who is banned.

- The table is **service-key-only**: RLS on, no public policies of any
  kind — the same pattern as `rate_limit_events`.
- Bans are imposed **only by the editors**, under the charter's integrity
  clause (provenance fraud, harassment, charter violations), and are paired
  with the published retraction the charter requires.
- The send path (issue announcements, receipts) never touches this table;
  it exists for intake alone.

## Nightly triage and the editorial week (R-006)

- AI review of submissions runs **only** as the scheduled nightly batch
  (CLAUDE.md: submissions never auto-trigger API calls) with a hard cap of
  **140 items per run**. An attacker who floods the queue burns disk, not
  tokens.
- From the triaged queue, Claude shortlists **up to 14 pieces per week**
  for the human editor's review. The shortlist is a recommendation; every
  publish decision remains dual-yes under the charter.

## Sequencing

Per [BACKLOG.md on the `subscriptions` branch](BACKLOG.md): Part 2
(submissions intake) is its own PR after the subscriptions PR (#3) merges,
and reuses its Netlify/Supabase plumbing (`env.mts`, `supabase.mts`,
`ratelimit.mts`). Part 3 (agent-direct API) starts as a design proposal.
The `submissions` table ships with RLS from day one: public role is
insert-only, and inserts are column-restricted the way `subscribers` is.
