# SCRATCH — the email-inbound 500, diagnosed

**Status: WORKING DRAFT, uncommitted, 2026-08-10.** Written to be read and
pasted. Nothing here has entered the record.

**The event.** `msg_3HhnvGIv6IT2k8Gvmaw8CwpP03T`, 2026-08-10T02:36:36Z. Chain
holds to the insert: DNS, forward, Resend receive, webhook fire, signature
verified, function ran, `500 Storage failed`.

---

## 0. FIRST, WHAT I COULD NOT DO

**I did not read the Netlify function log, and I could not.** No `netlify` CLI
in this container, no Netlify credentials on this machine, and the Netlify MCP
server exposes projects, deploys and forms but **no log surface at all**. Every
statement below is derived from the repository and from the deploy metadata,
which is a different kind of evidence and is labelled as such.

It turned out to be enough — the cause is provable from the source — but the log
still settles one open question, in §4.

---

## 1. TWO OF YOUR THREE CANDIDATES ARE RULED OUT BY THE RESPONSE BODY ALONE

**Missing service-role env var — ruled out, three ways.**

1. `requireEnv('SUPABASE_URL', 'SUPABASE_SECRET_KEY', …)` runs at **module
   load** (`email-inbound.mts:36`). A missing variable kills the cold start;
   Netlify then serves its own error, not the string `Storage failed`.
2. `serviceClient()` (`netlify/lib/supabase.mts:10-20`) throws on a missing or
   wrong-shaped key at line 167, before any insert. Also not `Storage failed`.
3. Decisive: `Storage failed` is returned from exactly **two** places, both
   after four `overLimit()` calls and `dailyCap()` have completed. `overLimit`
   does a real `SELECT` **and** a real `INSERT` against `rate_limit_events`
   using that same service client (`netlify/lib/ratelimit.mts:34-55`). Those
   four round-trips succeeded in this very request. The key works and it can
   write.

**Caps table lookup — ruled out.** `dailyCap()` swallows its own error and
returns `GLOBAL_DAILY_FALLBACK` (`email-inbound.mts:119`). It cannot produce a
500. And any limiter throw is caught at line 181, sets `throttled = true`, and
takes the branch that returns **200**. A 500 proves the limiter did *not* fail.

**Column/constraint mismatch — the only candidate left standing.** Correct, and
it is worse than one mismatch.

---

## 2. ROOT CAUSE — `involvement_tier_matches_track`

From `20260717120000_editors_desk.sql:57-61`, unchanged ever since (both later
tier migrations say so in their own headers, and nothing else touches it):

```sql
constraint involvement_tier_matches_track check (
  (submission_track = 'human-attested' and involvement_tier is not null)
  or (submission_track = 'agent-direct'  and involvement_tier is null)
)
```

`insertRow()` hardcodes `submission_track: 'human-attested'`
(`email-inbound.mts:363-368`) and passes `involvement_tier: tier`, which is
**NULL** whenever the sender declared no tier — or declared one the grammar
rejects. Uppercase is rejected: `parseTierCode` refuses anything not lowercase,
so a covering note reading `Involvement tier: AI` yields NULL, not `'ai'`.

Human-attested + NULL tier satisfies neither branch → **23514 check_violation**
→ PostgREST 400 → `error` non-null → `Storage failed`.

**Why nothing caught this before.** The constraint was correct for every door
that existed when it was written. `/submit`'s tier `<select>` is `required`
(`src/pages/submit.astro:176`). `agent-submit` never writes the column at all,
because it writes the other track. **The email door is the first door that
writes `human-attested` with a tier that may be absent** — and it is absent by
design, because the 2026-08-10 principle is that the desk does not supply what
the author did not declare.

The migration author saw this coming for `truth_standard` and dropped its NOT
NULL in §1b. The tier requirement was missed because it does **not** live in a
column NOT NULL — it lives in a table-level constraint, so it does not turn up
where you would look for it.

**It is deterministic.** Every retry Resend makes will fail identically.

---

## 3. THE MIGRATION APPLIED — AND TWO WRONG TURNS I TOOK GETTING THERE

**Settled.** Production has all seven inbound columns: an
`information_schema.columns` query returned exactly 7 rows, 2026-08-09 ~10 PM
Madison. Corroborated by the error code itself — **23514** is a database-level
check violation, only reachable once PostgREST has resolved every column in the
insert against its schema cache, since a missing one returns `PGRST204` instead.
`20260810120000` applied cleanly at ~8:55 PM Madison.

**Wrong turn one: the missing receipt.** I read the absence of an ops note in
`docs/ops/` as evidence the migration had never run. It was a paperwork gap, not
a schema fact, and it should never have carried that weight.

**Wrong turn two: a dry run against stale bytes.** I then ran
`scripts/sql-dry-run.sh`, watched it abort inside `20260810120000`'s probe, and
reported that as proof the committed text could not apply — and therefore that
the applied bytes must have differed from the repository's. The working tree was
on `desk-records-declarations`, cut **before** PR #152, which had already fixed
exactly that probe. `main` was fine the whole time. A dry run proves something
about the commit it was run against, and a branch is not `main`.

Both are recorded in the ops receipt rather than quietly dropped, because a
false alarm that nearly became a finding about production is worth one paragraph.

**What survives all of it:** §2's diagnosis, which never depended on either.

---

## 4. `20260810120000` IS NOT TOUCHED

Its probe needs nothing: PR #152 (`ffd4865`) already gives both probe rows the
tier `'ai'`, and did it better than my patch — the first handler reports any
unrelated failure via `SQLERRM` instead of swallowing it, and the second checks
the constraint *name* rather than catching `check_violation` generically. That
is the fix I was about to re-make worse.

`scripts/sql-dry-run.sh` applies the full chain from zero, `main`'s copy
untouched, plus the new migration, with all assertions passing.

**No production action for that file. No repo change to it either.**

---

## 5. THE FIX

**New migration `20260810210000_email_tier_undeclared.sql`** — the only file to
be applied by hand.

- §1 drops and re-adds `involvement_tier_matches_track`, relaxing **only** the
  human-attested half. The agent-direct half is unchanged: an agent-direct row
  must still omit the tier.
- §2 converges the two effects of `20260810120000` that were never directly
  verified — `truth_standard drop not null` and the `global_email_daily` cap
  insert. Both idempotent, neither new policy.
- §3's probe asserts the columns, asserts that a human-attested row with no tier
  and no truth standard now stores, and asserts the kept half from
  `pg_get_constraintdef` rather than by inserting a row — an agent-direct probe
  row would be refused first by `submissions_agent_identity_matches_track` and
  pass for the wrong reason. Its probe row is deleted; that delete is
  load-bearing here, because unlike its predecessor's the insert is meant to
  succeed.

**`netlify/functions/email-inbound.mts`.**

- An undeclared tier now pushes `missing:involvement_tier`, matching the
  existing `missing:truth_standard`.
- **A second, worse bug fixed in the throttled path.** The over-cap stub row
  omitted `provenance_attestation` and `contact_email` (both NOT NULL) and sent
  `body: ''` against a `char_length(body) between 1 and 40000` CHECK. That row
  **could never insert** — and its error was discarded a line later, returning
  200. Every over-cap message would have vanished in silence, which is exactly
  what this file's header promises cannot happen. The row now supplies every
  required column, and a stub that fails to store returns 500 instead of 200.
- **`contact_email` on both paths.** The main path passed
  `parsed.fields.contact_email ?? from` straight into a NOT NULL regex-checked
  column, so an unreadable envelope address would have 500'd there too. Both
  paths now fall back to `unknown@invalid.local` (RFC 2606's reserved TLD — it
  can never be a real address) **and always announce it**: any row carrying the
  sentinel also carries `envelope from failed validation; sentinel stored`, so
  the desk shows it and an editor knows the real address must come out of the
  raw. Editor-approved on ask, on exactly that condition — a sentinel the desk
  cannot see would be an invented value.

---

## 6. RE-INGESTION — CHECK BEFORE RELYING ON REPLAY

`verifySvix` rejects any request whose `svix-timestamp` is more than **300
seconds** from now (`email-inbound.mts:91-92`). Svix's own tolerance is the same
five minutes, and their guidance is that a replay of something captured a while
ago fails verification as too old even though the secret is correct.

Whether Resend's Replay stamps a fresh timestamp or re-sends the original is not
settled by their public docs, and it decides whether Replay works here. **The
retries already in flight answer it for free**, in the log:

- retries logging `signature verification failed` / 401 → the original timestamp
  is being reused, and **Replay on this event will 401, not re-ingest**;
- retries logging `insert failed` / 500 → signatures still verify, and Replay is
  the right path once the fix is live.

If it turns out to be 401, the message is still retrievable: `parse_warning`
carries `resend_id:` and the body can be fetched from
`api.resend.com/emails/receiving/{id}`. Sending a fresh test email is the
simpler route.

---

## 7. ORDER OF OPERATIONS

1. Merge the PR.
2. Apply **`20260810210000_email_tier_undeclared.sql`** by hand. That one file,
   and nothing else. Its probe passes or raises naming what broke.
3. The relaxation alone fixes the 500 for the **currently deployed** code, so
   retries start landing the moment it applies — no need to wait for the deploy.
4. Complete `docs/ops/2026-08-09-email-tier-undeclared-prod-migration.md`.
5. Re-ingest per §6.

`20260810120000` is not modified by this PR and needs nothing (§4).

Sources for the Svix timestamp behaviour:
[Svix — why verify](https://docs.svix.com/receiving/verifying-payloads/why),
[Svix retry schedule](https://docs.svix.com/retries),
[Resend webhooks](https://resend.com/docs/webhooks/introduction).
