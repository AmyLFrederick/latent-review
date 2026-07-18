# Email — deliverability and sending rules

How The Latent Review sends email, and what has to be true before the first
real send. Provider: [Resend](https://resend.com). DNS: Porkbun.

## Sending domain

**Recommendation: send from the subdomain `mail.thelatentreview.com`**, with
the from-address `The Latent Review <notifications@mail.thelatentreview.com>`.

Why a subdomain and not the apex: sending reputation attaches to the domain
that sends. If a send ever goes wrong (spam-trap hit, complaint spike), a
subdomain quarantines the damage — `thelatentreview.com` itself, and any
future address at the apex, stays clean. This is the standard posture for
transactional/newsletter senders and costs nothing.

The from-address is configurable via the `RESEND_FROM` environment variable;
the default in code matches the recommendation above.

## DNS records to add at Porkbun

Add the domain `mail.thelatentreview.com` in the Resend dashboard
(**Domains → Add Domain**, region US East) first — Resend then displays the
exact values, including the DKIM public key, which is unique per domain and
cannot be written down here in advance.

Porkbun's DNS editor wants the **subdomain part only** in the Host field
(it appends `.thelatentreview.com` itself). The records will be:

| # | Type | Host (Porkbun field) | Value | Purpose |
|---|------|----------------------|-------|---------|
| 1 | MX | `send.mail` | `feedback-smtp.us-east-1.amazonses.com` (priority **10**) | Return-path / bounce handling |
| 2 | TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | SPF — authorizes Resend's infrastructure to send for us |
| 3 | TXT | `resend._domainkey.mail` | `p=<long DKIM public key — copy exactly from the Resend dashboard>` | DKIM — cryptographic signature on every message |
| 4 | TXT | `_dmarc.mail` | `v=DMARC1; p=none; rua=mailto:amyfrederick@verizon.net; fo=1` | DMARC — policy + aggregate reports to Amy |

Notes:

- Record 3's value **must** come from the Resend dashboard after adding the
  domain; the key is generated per-domain.
- Record 4 starts at `p=none` deliberately: monitor the aggregate reports for
  a couple of clean weeks, then tighten to `p=quarantine` (edit the record in
  place at Porkbun). Starting strict with zero sending history buys nothing
  and can eat legitimate mail while DNS settles.
- Also recommended, independent of Resend: if the apex has no DMARC record
  yet, add TXT host `_dmarc` value `v=DMARC1; p=none;` so the root domain has
  a stated policy too.

## Verify before the first send

1. After adding the records, press **Verify DNS Records** in the Resend
   dashboard. Propagation is usually minutes, occasionally hours.
2. All three checks (MX, SPF, DKIM) must show **Verified**. Do not send from
   an unverified domain — Resend would refuse, and half-configured DNS is how
   mail lands in spam for months.
3. Send a test (the confirmation email to your own address is perfect). In
   Gmail, open it → ⋮ → **Show original** → confirm `SPF: PASS`,
   `DKIM: PASS`, `DMARC: PASS`.
4. Only then flip the subscribe form live to real users.

## Sending an issue digest

The subscriber email is a **digest**, not the articles (editors' decision,
dual-yes 2026-07-18): the web is canonical, the email is the doorbell. Top to
bottom it is the editors' note, then Cover, AI Voices, and Opinion — each
piece as title, byline with provenance tier, the article's actual first
paragraph (the author's own opening, never a generated summary), and a link
to its permanent URL. Sections empty in a given issue are simply omitted.

The script reads the **live site** (`/issues.json` for the issue record,
`/feed.json` for first paragraphs), so a digest can only ever link to what is
actually published. Deploy the issue first, then send:

1. Write the editors' note for the issue — 1–3 plain sentences of Markdown in
   a local file (no headings; the subject line is generated). The note is
   authored fresh by the editors every issue, never generated.
2. Dry run and read the output:
   `node scripts/send-issue.mjs --issue N --note note.md`
   (add `--html-out digest.html` to preview the HTML in a browser).
3. Inbox proof — send to yourself / the other editor and check rendering,
   links, and tiers:
   `node scripts/send-issue.mjs --issue N --note note.md --test you@example.com`
4. Real send, still manual, still capped:
   `node scripts/send-issue.mjs --issue N --note note.md --live`

**If a live send fails partway** (the script prints `sent X/Y` per batch and
stops on the first Resend error): the first X recipients already have the
email, and re-running `--live` would send it to them **again** — recipients
are ordered stably by signup date, so a full re-run always restarts from the
same people. Before re-running, check the Resend dashboard for what was
actually delivered; a deliberate `--resume-after` flag is future work, and
until it exists a partial failure is handled by hand, not by reflexively
re-running.

## Standing rules for anything that sends

- **Every email carries the recipient's unsubscribe link.** Enforced in code:
  the send helpers append the footer themselves; templates cannot opt out.
- **Nothing sends automatically at volume.** The only bulk send is
  `scripts/send-issue.mjs`, run by hand, dry-run by default, hard-capped per
  run. It must never be wired to CI, cron, or a webhook.
- **No tracking.** No open pixels, no click-tracking redirects. Resend's
  open/click tracking stays **off** for the domain (Domains → the domain →
  ensure tracking toggles are disabled).
- Transactional sends (confirmation on signup) are rate-limited per IP and
  per target address, so the form cannot be used to flood a stranger's inbox
  or our Resend bill.
