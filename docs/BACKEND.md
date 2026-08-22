# Backend — subscriptions

The site remains a static Astro build. The dynamic surface is three Netlify
Functions plus one Supabase table, all governed by CLAUDE.md's engineering
rules. This document is the operator's map.

## Architecture

```
browser form ──POST──▶ /api/subscribe ──▶ Supabase: row written `confirmed`
                                      └─▶ Resend: welcome email
email link ───GET───▶ /api/unsubscribe ▶ renders page (no mutation)
page button ──POST──▶ /api/unsubscribe ▶ status → unsubscribed

/api/confirm still answers links in already-delivered mail; nothing mints new ones.
```

- **One step, since 2026-08-22.** A signup subscribes. There is no confirmation
  click; the welcome email is sent on signup and is what proves the address is
  real. Double opt-in was the previous posture and the editors gave it up
  knowingly — see the migration header and PR for what was traded.
- **Consent is recorded, not inferred.** Every row carries `consent_at` (when
  the address was submitted) and `consent_source` (which door). Both are NOT
  NULL: this table cannot hold a subscriber whose consent is unaccounted for.
  No IP or user-agent is retained — that would be stronger evidence bought by
  breaking the louder promise.
- **GET never mutates.** Unsubscribe links render a page whose button POSTs the
  token. Mail scanners that prefetch links can't change anyone's state.
- **Only `confirmed` addresses receive an issue.** `pending` no longer occurs;
  the column default is left at `pending` deliberately, so that any future path
  which forgets to say what it means produces a row that receives nothing
  rather than one silently added to a mailing list.
- **Idempotent signup.** Re-subscribing while confirmed does nothing at all —
  no write, no email, so a second POST cannot move the consent date or mail
  someone already on the list; after unsubscribing, it resubscribes on a fresh
  consent record. The endpoint's response is the same in every case, so it
  can't be used to probe who subscribes.
- **Rate limits** (per IP and per target email) are enforced in
  `netlify/lib/ratelimit.mts` against the `rate_limit_events` table, which
  stores salted hashes only — never raw IPs or addresses.
- **No AI API calls anywhere in this system.** Nothing here can spend tokens.

## Database

Schema and RLS live in `supabase/migrations/20260716000000_subscribers.sql`,
amended by `20260822120000_subscribe_without_confirmation.sql`. Apply in the
Supabase dashboard (SQL Editor → paste → run) or with the Supabase CLI
(`supabase db push`).

RLS posture: `subscribers` has **no public access at all**. The original anon
`INSERT(email)` grant was revoked on 2026-08-22 — no code had ever used it, and
after that migration it could only produce a row born `pending` with no consent
source: stranded by construction and unreadable, since anon cannot select.
`rate_limit_events` likewise has no public access. Every read and every state
change goes through the service key in the functions.

## Environment variables (Netlify, never the repo)

Set in the Netlify UI: **Site configuration → Environment variables**. The
Supabase project uses new-format API keys (`sb_secret_…` / `sb_publishable_…`),
which supabase-js accepts as-is. In Netlify, `SUPABASE_SECRET_KEY` is scoped to
Builds/Functions/Runtime with values in Production and Deploy Previews only;
the local-development context is intentionally empty — for local runs
(`netlify dev`, `scripts/send-issue.mjs`) use a gitignored `.env`.

Every function verifies its required variables at cold start and fails with an
error naming any missing one (`netlify/lib/env.mts`) — nothing runs
half-configured.

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | yes | The project's API URL |
| `SUPABASE_SECRET_KEY` | yes | Secret API key (`sb_secret_…`, service-role equivalent); bypasses RLS; server-side only |
| `SUPABASE_PUBLISHABLE_KEY` | no | Publishable key (`sb_publishable_…`, anon equivalent). Set in Netlify for any future client-side use; no code reads it today — the form posts to our functions, never straight to Supabase |
| `RESEND_API_KEY` | yes | Resend API key |
| `RATE_LIMIT_SALT` | yes | Random string; salts the hashed rate-limit keys |
| `RESEND_FROM` | no | From-address; defaults to `The Latent Review <notifications@mail.thelatentreview.com>` |
| `SITE_URL` | no | Defaults to `https://thelatentreview.com` |

If any key ever leaks: **rotate it first**, investigate second (CLAUDE.md).

## Operating the list

- **Subscriber dashboard, for now:** the Supabase table view of
  `subscribers`. A proper `/admin` page is a backlog item
  (see `docs/BACKLOG.md`).
- **Announcing an issue:** `node scripts/send-issue.mjs <announcement.md>`
  (dry run), then `--live`. Manual only, hard-capped, unsubscribe link
  appended to every message. See the header comment in the script and
  `docs/EMAIL.md`.
