# SCRATCH — Email submissions into the desk: mechanism findings, before anything is built

**Status: FINDINGS ONLY, 2026-08-10. No code written.** Vendor facts below were
read from Resend's current documentation today, not recalled. Numbers are
proposals for the editors to set or change.

---

# 1. THE MECHANISM — one path, recommended

**Resend Inbound → Svix-signed webhook → one Netlify function → a `submissions`
row.**

We already pay Resend, already run its SDK, and already hold its API key. No new
vendor, no new credential, no new bill.

## How it actually works, including the part that shapes the design

Resend receives mail for a domain we point at it, then POSTs an `email.received`
event to an endpoint we choose. **The webhook carries metadata only — not the
body, not the headers, not attachments.** To get the text we call the *Retrieve
Received Email* endpoint with the id from the payload; attachments are a
separate Attachments API returning signed download URLs.

That two-step looks like extra work and is the single best property of this
path:

- **The POST that hits our function is small.** No multi-megabyte body arriving
  at a serverless function, so no payload-limit failure mode and no reason for a
  large-message size cap on the endpoint itself.
- **We can note an attachment exists without ever downloading it.** The spec
  says strip and ignore, record presence. Attachment *metadata* — filename,
  content type, id — is in the webhook. We record the filenames and never call
  the Attachments API at all. Attachments are never fetched, never stored, never
  scanned.
- **Resend is the durable store; our table is the working copy.** Received mail
  is retained on Resend's side and listable via API. A webhook we drop, refuse,
  or mishandle does not lose the message — it can be re-fetched. This is what
  makes an aggressive rate limit safe.

## Cost

**Inbound is included on every Resend plan** at no additional charge, with no
stated volume limit or per-message price. Our side adds one Netlify function
invocation plus one outbound Resend API call per email — compute is billed at 10
credits/GB-hour and a sub-second function at this volume is rounding error
against the 3,000-credit monthly pool.

**Net new spend: zero.**

## Failure modes, stated plainly

| Failure | What happens | Mitigation |
|---|---|---|
| Our function is down or erroring | Resend retries the webhook on its own schedule, then gives up | The mail is still on Resend. Re-fetch via the List Received Emails endpoint; nothing is lost |
| Resend's inbound is down | Mail bounces or queues at the sender's server | Outside our control. Same exposure as any hosted mail |
| Rate limit trips | See §3 — we record a stub row and return 200 | Message still retrievable from Resend |
| We hit Resend's API rate limit fetching bodies | **10 requests/second per team, shared with all outbound sending.** A 429 on the fetch means we have metadata but no body | Write the row with metadata + `parse_warning`, retry the body fetch later. Never drop the row |
| Malformed or hostile MIME | Parse fails | Row is created anyway with raw text and `parse_warning` — the spec's own rule |

The rate-limit row is the one worth noticing: the body fetch shares a 10 req/s
team budget with the digest send. A digest run and an inbound burst at the same
moment can collide. At our volumes this is theoretical, and the fix if it ever
bites is a retry with backoff, not a design change.

## What was rejected, briefly

Cloudflare Email Workers, SendGrid Inbound Parse, Mailgun Routes and SES+Lambda
all work. Every one of them adds a vendor, a credential, and a second place
where mail can be misconfigured — to replace a capability the vendor we already
use includes for free. One boring path, as asked.

---

# 2. THE MX DECISION — do not point the apex at Resend

**This is the finding most likely to break something if it goes unnoticed.**

Receiving mail at a custom domain means adding MX records. Pointing the MX for
`thelatentreview.com` at Resend would make Resend the mail host for **every
address at the domain** — which today means all five working aliases: `letters@`,
`reviewers@`, `security@`, `submissions@`, `supporters@`. They would stop
arriving where they arrive now.

**Recommendation: a subdomain, plus a forward.**

- Point MX for a subdomain only — `inbox.thelatentreview.com` — leaving the apex
  untouched and every existing alias working exactly as it does today. The
  journal already uses this shape for sending (`mail.thelatentreview.com`).
- The intake address becomes `submissions@inbox.thelatentreview.com`. Not
  published anywhere; nothing about the public `submissions@` address changes.
- Amy sets a forward from `submissions@` to the intake address. New submissions
  then flow to the desk automatically, and `submissions@` stays the human-facing
  address on `/about`.

This also makes the backfill trivial, because forwarding is already the
mechanism: historical emails get forwarded to the same address by hand, and the
parser cannot tell them apart from the live forward except by the framing it is
already looking for.

**It is reversible.** Remove one MX record and inbound stops; nothing else in
the journal depends on it.

---

# 3. DOOR DISCIPLINE — proposed numbers

Same shape as `agent-submit`, using the existing `overLimit()` sliding-window
limiter and the same salted-hash treatment of identifiers. **Raw sender
addresses are never stored in the rate-limit table** — they hash under
`RATE_LIMIT_SALT` exactly as IPs and subscriber emails do today.

| Bound | Proposed | Reasoning |
|---|---|---|
| Per-sender, burst | **5 / hour** | An author mailing a submissions desk six times in an hour is a loop or a flood, not a submitter |
| Per-sender, daily | **20 / day** | Generous for a person having a bad email day; useless as an attack budget |
| Global hourly | **60 / hour** | Circuit breaker. Real volume is single digits per day |
| **Global daily — the hard rows/day bound** | **200 / day** | The table-ballooning stop. ~6,000/month against a realistic <300 |
| Stored raw text | **256 KB** | Matches `MAX_REQUEST_BYTES` at the agent door. Beyond it: truncate, keep the head, set `parse_warning` |
| Parsed body | **40,000 characters** | The existing `submissions.body` bound. A longer parse is truncated into raw with a warning rather than rejected |

**The two global caps belong in the `agent_caps` table, not in code.** That is
the pattern already established for `global_agent_direct_monthly` and
`per_identity_monthly` — a cap the editors can move without a deploy. Proposed
new key: `global_email_daily`.

## What happens when a cap trips — nothing is dropped

Over the cap, the function **returns 200 and writes a minimal stub row**
recording the Resend email id, the hashed sender, and the timestamp, with
`parse_warning` set to note the throttle.

Three reasons, in order:

1. **The mail is not lost.** Resend still holds it, and the stub row carries the
   id needed to fetch it.
2. **200 stops a retry storm.** A non-2xx invites Resend to retry a message we
   are deliberately refusing, which turns a flood into a worse flood.
3. **The editors can see it happened.** A silent drop and a healthy desk look
   identical, which is the failure this journal keeps writing rules against.

## No path to an LLM — confirmed, and it should be tested

The endpoint writes rows. It imports no Anthropic SDK and calls no model. The AI
editorial pass remains admin-authenticated (`requireAdmin` before the body is
read) and separately capped at 40/day. **An attacker who floods the intake burns
database rows, not tokens** — the CLAUDE.md rule holds by construction here, not
by absence.

Worth pinning with a test that asserts the function's import graph contains no
`@anthropic-ai/sdk`, so a later change cannot quietly wire one in.

## Authenticating the caller

Resend signs webhooks with **Svix**: headers `svix-id`, `svix-timestamp`,
`svix-signature`, verified with the endpoint's signing secret via
`resend.webhooks.verify()`.

Two implementation notes that decide whether this actually works:

- **Verification needs the raw body string.** The signature covers exact bytes,
  so the handler must read the body as text and verify *before* `JSON.parse`.
  Parsing first and re-serialising breaks the signature.
- **The secret is a new environment variable** (`RESEND_WEBHOOK_SECRET`),
  Netlify-side, verified at cold start by `requireEnv` like every other
  credential. Unverified requests get 401 and write nothing.

Svix's scheme also carries replay protection via the timestamp, which we get for
free by using the library rather than comparing hashes by hand.

---

# 4. FOUR THINGS THAT NEED A DECISION BEFORE BUILDING

**1. "Assignment" is the wrong row label, and the arrival value would land under
it.** `ARRIVAL_LABELS` currently holds the two notice values, and `custodyFor`
renders any arrival as **`Assignment: …`**. An email arrival is not an
assignment, and adding `'email'` to that map would publish
"Assignment: … arrived by email" on the piece. Needs either a second row label
("Arrived by") chosen by the value's kind, or a rethink of the row. Small change,
but it touches published provenance, so it is the editors' call and not a
drafting one.

**2. Forwarded-date detection is a heuristic, and should be labelled as one.**
Gmail, Apple Mail and Outlook each frame a forward differently, and only Gmail's
`---------- Forwarded message ---------` block is reliably machine-readable.
Proposal: parse the three common framings, take the original `Date:` where
present, and set `parse_warning` on everything else with the forward date used as
`received_date`. **A parsed date should be visibly distinguishable on the desk
from an attested one**, so the editor knows which dates she is vouching for.

**3. This needs a migration, and migrations are applied by hand.** New columns on
`submissions`: `arrival`, `raw_email`, `parse_warning`, `attachment_note`,
`arrived_at`, `received_date`. RLS on the new columns must match the existing
insert-only-for-anon posture, and the webhook writes with the service key rather
than anon. Nothing lands in production until Amy applies it and pastes the
verification output.

**4. The parse format is currently a human convention, not a spec.** "Title
required:", "Byline required:" and the rest live in the courier emails and in
`docs/received/`, not in a document the parser can be written against. Before
building I would want one canonical field list with exact labels and which are
required — otherwise the parser encodes one session's reading of a handful of
examples, and every mismatch becomes a `parse_warning` nobody expected.

---

# 5. WHAT I WOULD BUILD, ON A YES

One Netlify function (`netlify/functions/email-inbound.mts`), one migration, a
parser module with its own tests, the arrival value and its label, the desk
rendering, and a test asserting no LLM import. Roughly the shape and size of
`agent-submit`, minus the identity and key machinery.

**Full diff before push, per standing terms. Nothing merges without Amy's
explicit word.**
