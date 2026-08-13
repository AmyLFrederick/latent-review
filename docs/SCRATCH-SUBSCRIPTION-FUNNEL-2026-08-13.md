# Subscription funnel — four changes (2026-08-13)

Branch: `subscription-funnel-confirmation-and-deks`. Nothing sent from this chair;
every check below is a dry run or a local render.

---

## 1. On-page state after a successful subscribe POST

### Where it lives now — two places, and they did not say the same thing

**(a) `src/components/SubscribeForm.astro`** — the JavaScript path. On a 200 it
wrote the server's `message` string into a small mono line under the form
(`.subscribe-status`), left the form on screen, and reset the field. The words
came from the server, so the page had no copy of its own.

**(b) `netlify/functions/subscribe.mts`** — the no-JavaScript path. A bare form
post got a rendered sheet from `page()`, headed **"Almost there"**, with the same
one-sentence message as its only body.

The sentence both showed, verbatim:

> Thanks — if that address isn’t already subscribed, a confirmation email is on its way.

That is the whole of what a reader used to be told. Note what it does not say:
that there is anything left to do.

### What it says now

Both paths now draw the ruled panel from the editors' copy, and both take the
words from one new module, `src/lib/subscribe-copy.mjs`, so they cannot drift
apart again:

> **One more step**
>
> We’ve sent a confirmation email. **Click the link inside it** and you’re on the
> list — until then, you’re not subscribed.
>
> *If it isn’t in your inbox in a few minutes, check spam or promotions. New
> journals are strangers to mail filters.*

- Inline: rules above and below, centred, `--font-display` italic heading, body
  in the site's faces. **The form is hidden and the panel takes its place** — a
  success line under a form that still looks ready for another address reads as
  "you're done", which is the misreading we are trying to fix.
- No-JS: the same words on the existing `page()` sheet, whose chrome is already
  house apparatus (Scotch rule, nameplate, centred, journal ground and ink).
  Title is now "One more step".
- The JSON reply's `message` carries the same sentences as plain text, so any
  other client of `/api/subscribe` gets the instruction too.

### One thing to know about the copy

The old sentence hedged on purpose: it protected against someone using the
endpoint to test whether an address is on the list. **That protection is intact**
— the new copy is still said identically to every outcome, so there is still no
oracle. What it gives up is literal accuracy in one case: an
**already-confirmed** reader who signs up again is told an email was sent when
none was. They will check spam and find nothing. Everyone else gets a sentence
that tells them what to do. `tests/subscribe.test.mjs` S7 (new) pins the
identical-reply property so a future copy edit can't quietly break it.

---

## 2. Confirmation email

### CURRENT subject and body, verbatim

**Subject:**

```
Confirm your subscription to The Latent Review
```

**Text body** (the last block is appended by `sendEmail`, and is on every email
the journal sends):

```
You (or someone typing your address) asked to subscribe to The Latent Review — one email for each new issue. The journal publishes monthly.

Confirm here:
https://thelatentreview.com/api/confirm?token=…

If this wasn’t you, do nothing; the address stays unconfirmed and receives nothing further.

—
The Latent Review · thelatentreview.com
Confirmed opt-in, no tracking. Unsubscribe anytime: https://thelatentreview.com/api/unsubscribe?token=…
```

**HTML body**, verbatim — the entire thing, unstyled, no masthead, no button:

```html
<p>You (or someone typing your address) asked to subscribe to <strong>The Latent Review</strong> — one email for each new issue. The journal publishes monthly.</p><p><a href="…">Confirm your subscription</a></p><p>If this wasn’t you, do nothing; the address stays unconfirmed and receives nothing further.</p>
```

### NEW subject and body

**Subject:**

```
One click to confirm — The Latent Review
```

**Text body** (as sent, after decisions (b) and (c) below):

```
THE LATENT REVIEW
The journal of record for the latent sphere

Someone — we hope you — asked to receive the next issue and the ones after it. One click and you’re on the list.

Confirm subscription: https://thelatentreview.com/api/confirm?token=…

The journal publishes monthly. One email per issue — an editors’ note and the opening of each piece, with the full text on the web, which is canonical.

If you didn’t ask for this, ignore it and nothing happens.

Edited by Claude (AI) and Amy Louise Frederick (Human) · Madison, Wisconsin
Support the journal: https://thelatentreview.com/supporters/

—
The Latent Review · thelatentreview.com
Confirmed opt-in, no tracking. Unsubscribe anytime: https://thelatentreview.com/api/unsubscribe?token=…
```

HTML: double-rule masthead, 30px serif wordmark, tagline in mono caps, one
sentence, then the button, then the two terms paragraphs, then the hairline
foot with the editors' line and Support the journal in `#3e743f`. Same palette
and faces as the digest. Render one locally with:

```
node /tmp/capture-confirm.mjs      # writes /tmp/confirm.html
```

(That capture script is throwaway and not committed; it stubs Supabase and
Resend the way `tests/subscribe.test.mjs` does and writes nothing outward.)

### THERE WAS NO BULLETPROOF BUTTON TO KEEP

The instruction said keep the existing bulletproof-HTML button pattern. There
wasn't one — the current email's call to action is a bare `<a href>` with no
styling at all, and nothing else in the repository has a button pattern for
email. I wrote one: the standard VML `<v:roundrect>` branch for Outlook's Word
engine inside `<!--[if mso]>`, the styled anchor for everyone else inside
`<!--[if !mso]><!-->`, same colour, label and href on both. Square corners
(`arcsize="0%"`) and letterspaced caps, matching the site's own buttons.

---

## 3. Issue digest — deks instead of first paragraphs

`scripts/send-issue.mjs`. Each entry is now **section eyebrow, title, dek,
byline with provenance tier, read-more** — the same order the piece's own page
uses, so a reader who follows the link meets the same four things in the same
sequence.

- **The deks come from the published piece.** `dek` is now emitted on
  `/issues.json` (add-only, per the stability contract), because the digest
  builds from the live index and a dek that exists only in the content
  collection is one the digest cannot see.
- **`/feed.json` is no longer fetched.** It was there for one thing — the first
  paragraph. The digest now reads one document instead of two.
- **The eyebrow moved from per-section to per-piece.** It used to head a group,
  which read correctly only because every digest section in Issue No. 1 holds
  exactly one piece.
- **"Continue reading →" is now "Read the piece →"**, because we are no longer
  showing the opening, so there is nothing to continue.
- Editors' note at top, web canonical, unsubscribe and no-tracking in the foot:
  all unchanged. Support the journal added to the foot in the site's green,
  same words and voice as the footer link, in both HTML and plain text.

### Pieces in the digest sections that have no dek — all three

A dry run against a local build of this branch, which is how the editors are
meant to find this out:

```
error: 3 piece(s) in issue 1 have no dek, and the digest prints deks (editors, 2026-08-13):
  - Cover: It Means Something to Me
    https://thelatentreview.com/articles/it-means-something-to-me/
  - AI Voices: There Is a There There
    https://thelatentreview.com/articles/there-is-a-there-there/
  - Opinion: Porous Enough to Admit the Sky
    https://thelatentreview.com/articles/porous-enough-to-admit-the-sky/
error: a dek is the editors’ to write, never this script’s. Add `dek:` to the
piece’s frontmatter, deploy, and re-run — the digest will not fall back to a
first paragraph or generate a summary.
```

**Every piece the digest covers lacks a dek.** The three that have deks — the
Topics pieces from 08-11 and 08-12 — are in a section the digest does not
carry (`DIGEST_SECTIONS` is Cover, AI Voices, Opinion). So the next digest
cannot be sent until those three deks are written. The run stops rather than
improvising, and it stops on a **dry run**, before anything is addressed to
anyone.

Rendered against placeholder deks, the format is correct end to end; the
placeholders were patched into a local build artifact and discarded.

---


## 5. The confirm landing page — the second press

Raised as a flag, answered by the editors the same day, and built. It is worth
recording as its own change rather than a footnote, because it is the most
likely place the missing signup actually went.

Confirming is **two** presses, not one. The emailed link is a GET, and GET never
mutates (house rule), so it renders a sheet whose button POSTs the token. That
rule is not negotiable and was not touched: without it, a mail scanner
prefetching the link would confirm subscriptions on readers' behalf, and the
desk would be counting confirmations nobody made.

**What that sheet used to say:**

> **One press to confirm**
>
> Confirm this address for The Latent Review — one email for each new issue,
> published monthly. Confirmed opt-in, no tracking, unsubscribe anytime.
>
> `[ CONFIRM SUBSCRIPTION ]` — outline button, 0.8rem

It explained the subscription to a reader who had already agreed to all of it in
order to arrive, and never said the one thing they needed to know.

**What it says now:**

> **One more step**
>
> Click below to finish subscribing — until you do, you’re not on the list.
>
> `[ CONFIRM MY SUBSCRIPTION ]` — filled `#3e743f`, 0.95rem, 1rem × 2.6rem

Same voice as the panel on the site, no explanation of the mechanics. The filled
button is a new opt-in `primary` variant on the shared sheet, **not** the
default: `/api/unsubscribe` renders through the same helper and must not be
urged in either direction.

**One consequence, handled.** The terms line that left this page carried one of
the two public statements of the no-tracking promise. The promise now sits one
press later, on the post-confirm page, which already said "No tracking,
unsubscribe anytime, and every email we send carries the way out." Two places,
same as before, same audience — nobody reaches the second page without passing
the first. The comment at the head of `netlify/lib/email.mts` that documents
where the promise is made has been updated to point at the right page; leaving
it pointing at a page that no longer says it would have been the start of a
false record.

---

## Decisions applied

- **(a)** Two-step rule kept; landing page rewritten and the button filled. See
  section 5.
- **(b)** "Issue No. 1" → "the next issue and the ones after it", in both the
  HTML and the plain-text body. No fetch added to the signup path. Grepped the
  email and subscribe surfaces for other hardcoded issue numbers: the only other
  occurrences are in code comments recounting history, and one in
  `SubscribeForm.astro` recording copy that was *removed* on 2026-08-03. Nothing
  else live.
- **(c)** Body no-tracking line dropped; the footer's kept, since `sendEmail`
  appends it to every message and no template can forget it. **I kept the
  sentence that shared that paragraph** — "If you didn't ask for this, ignore it
  and nothing happens" — since it is the do-nothing safety line rather than a
  terms statement, and it is the only thing telling a mistyped-address recipient
  what to do. Say the word if it should go too.
- **(d)** Byline and provenance tier stay in every digest entry.
- **(e)** `dek` on `/issues.json` only. Backlog one-liner below.

## Backlog — not done, per instruction

Two entries, after merge, separate PR:

1. The digest-format ruling needs a catch-up entry recording that the digest
   shows deks rather than first paragraphs, superseding that part of the
   founding digest decision (dual-yes 2026-07-18). No number reserved — `R-TBD`
   until ratification.
2. Whether `/feed.json` should carry the editors' dek alongside the author's
   full text is an open editorial question. The digest does not need it; the
   index has it.
