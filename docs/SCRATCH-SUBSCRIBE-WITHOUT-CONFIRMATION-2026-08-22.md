# A signup subscribes immediately — receipts (2026-08-22)

> **The welcome email was rewritten** as a letter rather than a notice, on the
> editors' verbatim copy, and then settled over two follow-up passes. See §8 —
> nothing is left open there.


Branch: `subscribe-without-confirmation`. Nothing sent from this chair, nothing
applied to production, no database touched. Every check below is a local test
run, a local build, or a throwaway Postgres container.

---

## 1. The question you asked first: how many are stranded?

**I cannot answer it from here.** This session has no database access — you
hand-apply every migration and I never call one live. So the number has to come
from you, and there are two ways to get it.

**Before the migration, read-only, run in the Supabase SQL editor:**

```sql
select status, count(*), min(created_at) as oldest, max(created_at) as newest
  from public.subscribers
 group by status
 order by status;
```

**Or let the migration tell you.** It prints the counts as it runs:

```
NOTICE:  consent record written for N existing subscriber row(s)
NOTICE:  stranded pending signups subscribed: N
NOTICE:  after migration — confirmed: N, pending: 0 (must be 0)
```

Capture that output. It is the only record of how many people were stranded —
the migration's whole purpose is that the pending population stops existing, so
the number is unrecoverable afterwards.

**The one data point the repository holds** is nine days stale and I am giving
it to you as context, not as an answer: a comment written into
`SubscribeForm.astro` on 2026-08-13 records "four pending signups against three
confirmed" — which is what prompted that day's funnel work. If the ratio held,
the stranded group is small and slightly larger than the list itself.

---

## 2. What changed

| File | What |
|---|---|
| `supabase/migrations/20260822120000_subscribe_without_confirmation.sql` | **New.** Consent record, pending→confirmed backfill, anon insert door closed |
| `netlify/functions/subscribe.mts` | Writes `confirmed` + consent record; sends the welcome letter (§8); no confirmation link |
| `netlify/functions/confirm.mts` | Kept, unchanged in behaviour, documented as legacy — see §5 |
| `netlify/lib/email.mts` | `confirmUrl()` removed; footer gains a per-email note and is wrapped into the page — see §8 |
| `scripts/send-issue.mjs` | Same footer line; `--to`'s status guard re-explained |
| `src/lib/subscribe-copy.mjs` | The panel's words: instruction → receipt |
| `src/components/SubscribeForm.astro` | New panel copy, hidden `source` field, note line |
| `docs/TERMS.md` | The double-opt-in sentence, rewritten |
| `docs/BACKEND.md`, `docs/EMAIL.md` | Flow diagram, RLS posture, operator notes |
| `tests/subscribe.test.mjs` | S8–S13b added; S6 strengthened; S11b/S12b added with the rewrite |
| `tests/sql/subscribers-consent.test.sql` | **New.** 12 assertions on the migration |

**Kept, as instructed.** The welcome email (sent on signup, carries the
unsubscribe link, and is what proves the address is real). A consent record per
subscriber — `consent_at` and `consent_source`, both `NOT NULL`, so the table
cannot hold a subscriber whose consent is unaccounted for. The email format
check, the 254-character bound, and all four rate limits at their ruled numbers.

**One thing I added that you did not ask for, and why.** The migration revokes
the anon `INSERT(email)` grant on `subscribers`. No code has ever used it — the
form posts to our function, which uses the service key — and after this change
an anon insert could only produce a row born `pending` with no consent source:
stranded by construction, and invisible, because anon cannot read. It is the
one door through which the problem you are fixing could be recreated. Say the
word and I will drop it from the migration.

---

## 3. What we lose — the part for the PR

Double opt-in is the standard consent evidence under GDPR, and it protects
sender reputation from bad addresses. You are accepting that knowingly. Three
specific consequences, so they are on the record rather than implied:

1. **The evidence is now our own log, not the subscriber's action.** A confirmed
   opt-in proves the person holding the mailbox agreed. What we retain instead
   is that an address was submitted, when, and through which form — which is
   evidence that *somebody* typed it. `consent_source` distinguishes our two
   forms from a bare API call, and refuses to store caller-supplied free text,
   so the record is at least ours rather than the requester's. It is still
   weaker.

2. **A mistyped or malicious signup now lands on the list before anyone can
   object.** Under the old flow, doing nothing was a complete remedy: ignore the
   mail, stay off the list. Doing nothing now leaves you subscribed. So the
   welcome email has to carry both the way out and the sentence naming that
   reader's case. They sit together in the foot, at your instruction (§8) —
   test S11 pins that the link appears exactly once and that the sentence sits
   beside it, because this is the property standing where the confirmation step
   used to.

3. **The rate limits are now guarding more than the invoice.** Whatever gets
   past them is subscribed, not merely mailed. The numbers are unchanged (5/IP,
   2/address, 500 hourly, 3,000 daily) and I did not tighten them; the thing
   they protect got larger, and that is worth a look before the list does.

**One thing we gain, small and real:** the reply is now true in every case. The
2026-08-13 copy told an already-confirmed reader that a confirmation email was
on its way when none had been sent — an accepted inaccuracy at the time. "You're
on the list" is true for every address that reaches the end of the handler.

**Not retained, deliberately: no IP, no user-agent.** Both are the usual belt
for consent evidence, and both would contradict "no tracking" — a promise the
journal makes on every email and now on the form itself. We hash even our own
rate-limit keys. Stronger proof bought by breaking a louder promise is a bad
trade; if you want it, it is a decision to make out loud and change the copy
first.

---

## 4. What was checked

```
npm test          597 tests, 597 pass       (18 in tests/subscribe.test.mjs)
npm run test:sql  full migration chain + 12 new assertions, all pass
npm run build     49 pages, clean
```

The SQL dry run applies all 21 migrations to a fresh Postgres 16 container from
nothing and then asserts against the result: the consent columns exist and are
mandatory, an insert without either is refused, an empty or over-long source is
refused, the anon grant and its policy are gone, RLS is still on, and the
backfill leaves each of the three pre-migration states where the migration says
it does — including that an **unsubscribed** row is not swept back onto the list.

What the dry run cannot check is the backfill's *counts*, because the container's
table is empty. That is what the RAISE NOTICE output in §1 is for.

Grepped the built site: no "Confirmed opt-in", no "double opt-in", no "One more
step", no "confirmation email" anywhere in `dist/`.

**One note on the form.** `SubscribeForm` has two variants and both now carry
their door. Only the footer variant renders today — the homepage's `page`
variant sits inside the pre-launch "awaiting" block, which has not rendered
since Issue No. 1 ran on 08-02. So live signups will record `web-form-footer`,
and `web-form` will start appearing if that block ever returns.

---

## 5. Why `/api/confirm` is still there

Every confirmation email the journal ever sent is sitting in somebody's inbox
with a live link in it. After the migration those readers are subscribers, so
the link finds a confirmed row and the page says "Already confirmed" — which is
true. Deleting the route would answer them with a 404, which reads, to someone
just subscribed by our decision rather than their click, as though we lost them.

The route is unchanged in behaviour and documented at the top as legacy. Its
`pending` branch is unreachable in production and left intact rather than
stubbed. Nothing in the repository mints a new confirmation link — `confirmUrl()`
is deleted, and test S12 asserts that no email we send contains `/api/confirm`
or the word "confirm".

---

## 6. Two things I did not do, both yours to decide

**(a) The stranded people get no welcome email.** The migration subscribes them;
it does not mail them. Under the new flow everyone else gets a welcome message,
and these readers will instead hear nothing until the next issue arrives — which
could read as a surprise to someone who signed up weeks ago and assumed it never
took. Mailing them is an outbound placement to a group who never completed the
step they were asked to complete, so it is not mine to start. If you want it,
`scripts/send-issue.mjs --to <address>` sends one at a time to a confirmed
subscriber, and at four-ish people that is the whole job; a bulk path would need
building and I have not built one.

**(b) This is the sharpest instance of the trade you accepted.** A stranger who
typed an address and walked away is the weakest consent in the set — no click,
no reply, possibly not even their address. Subscribing them is exactly the
decision you made, stated plainly, and I am not arguing it. I am recording that
this group, not the future signups, is where a complaint would come from first.

---

## 7. To apply

1. Run the read-only count in §1 and keep it.
2. Merge the PR (yours alone).
3. Paste `supabase/migrations/20260822120000_subscribe_without_confirmation.sql`
   into the Supabase SQL editor and run it. **Capture the NOTICE output** — it
   is a production receipt and goes in `docs/ops/` per CLAUDE.md.
4. Subscribe a test address at the live form; confirm the welcome email arrives
   and that its in-body unsubscribe link works.

**There is a window between the merge and the migration, and it fails safe.**
Netlify deploys on merge, so the new function will be live against the old table
for as long as step 3 takes: an insert naming `consent_at`/`consent_source` hits
columns that do not exist, the error is caught, and the signup returns a 503.
The reverse order has the same shape — the old function inserts `{email}` alone
and trips the new `NOT NULL` on `consent_source`. Either way the form is briefly
down rather than writing a subscriber row with no consent record, which is the
correct failure. Do step 3 promptly and it is a matter of minutes.

---

## 8. The welcome email, rewritten (second commit)

The first draft read as a terms notice. Replaced with the editors' copy,
verbatim — no word added, removed, or reordered. Rendered by running the real
function with Supabase and Resend stubbed, so what follows is what would leave
the building.

```
SUBJECT: Thank you for subscribing

THE LATENT REVIEW
The journal of record for the latent sphere

Thank you for subscribing.

The Latent Review publishes monthly. You’ll get one email per issue — an
editors’ note and the opening of each piece, with the full text on the web.
Occasionally, if something happens that touches the journal’s subject, we may
write to you between issues.

If you read something here that stays with you, we’d love to hear from you —
the Letters section (https://thelatentreview.com/letters/) is open to human and
AI readers alike, and we publish what’s worth publishing. And if you know
someone who would find this journal interesting, sharing it is the single most
helpful thing you can do for us right now.

We’re glad you’re here.

The Editors
Claude (AI) and Amy Louise Frederick (Human)
Madison, Wisconsin

Support the journal → https://thelatentreview.com/supporters/

—
The Latent Review · thelatentreview.com
Opt-in, no tracking. Unsubscribe anytime: https://thelatentreview.com/api/unsubscribe?token=…
If you didn’t ask for this, someone typed your address by mistake — that link
takes it straight back off.
```

(In the HTML part, "Letters section" is an anchor and the URL is not shown; the
parenthetical above is the plain-text part, which has nowhere else to put it.)

Masthead, palette, faces and centred column untouched. Support link alone after
the signature, on its own line, letterspaced caps in the house green with the
arrow. Signature set in serif with "The Editors" in full ink and the two lines
under it muted, which is how a signed note reads rather than a colophon.

### Three questions, all answered by the editors the same day

**(a) "Opt-in, no tracking." is back in this email's footer.** It had come out
because the foot as written carried only the site line and the unsubscribe link.
Restored — and the `standingTerms` switch that made it optional came out with
it. The promise is now unconditional in `emailFooter()`, which is the honest
shape: an unused switch that makes a published promise conditional is an
invitation, and there is no email this journal sends for which the answer is
yes. Test S11b asserts the clause on a footer built with no options at all *and*
on the welcome email itself, so no caller can quietly become the exception.

**(b) The Letters invitation has its door.** The HTML anchors "Letters section"
to `/letters/`, which carries `letters@thelatentreview.com`. One departure from
verbatim, and it is only in the plain-text part: an anchor has nowhere to hide a
URL there, so the address goes inline in parentheses — "the Letters section
(https://thelatentreview.com/letters/) is open to…". The sentence is otherwise
word for word.

**(c) The subject is now "Thank you for subscribing"**, matching the letter's
first line. It carries no " — The Latent Review" suffix, which the two previous
subjects did; the From name says "The Latent Review" in every inbox, so the
suffix was belt-and-braces, and the editors gave the string without it. Noting
the pattern break rather than restoring it unasked. The site's panel still says
"You're on the list" — the right thing for a panel to say, and the reason the
two now differ on purpose.

### One thing I fixed that you did not ask for

**The footer was falling outside the page.** `emailFooter()` appended its rule
and line after the caller's markup had closed every wrapper, so the foot landed
outside the centred 600px column and outside the paper ground — full-bleed,
left-aligned, on whatever white the mail client paints, under a centred cream
body. Pre-existing, not introduced here, and invisible until somebody rendered
the message and looked. `send-issue.mjs` never used this helper and had quietly
solved the same problem in its own copy.

It contradicted the instruction to keep the palette, so it is fixed: the foot is
wrapped in the paper ground and the same 600px centred column, set in the house
serif at 13px. The wrapper assumes the caller's ground is the journal's paper,
which is true of the only email that uses `sendEmail` today; a future template on
a different ground would need this to become an option.

### Placement, and one instruction that superseded another

Your opening line said to keep the unsubscribe link in the body; the placement
note then moved the mistyped-address instruction — which was what carried that
link — into the foot, "a subscriber who wants out doesn't need a paragraph about
it, just the link." I followed the specific instruction over the general one.
The link is still in the message rather than only in the `List-Unsubscribe`
header, which is the reading under which both hold.

What that costs is prominence, and what it must not cost is presence — so test
**S11** now asserts the link appears **exactly once** in both parts (two ways out
make a reader choose between them) and that the sentence sits *after* the link it
points at, since "that link" is a dangling reference apart from it.

### Checks on this commit

```
npm test          597 tests, 597 pass   (18 in tests/subscribe.test.mjs)
npm run build     49 pages, clean
```

New: **S11b** pins the shared foot from both sides — the terms clause is
unconditional, and the mistyped line never reaches an email that did not ask for
it, because "if you didn't ask for this" in issue seven, to somebody reading
since issue one, would be the journal apologising monthly for a subscription it
was asked for. **S12b** pins the letter's four commitments: the volume promise
that bounds the dispatch, the invitation to write, the ask to share, and the
signature naming both editors — including that one is an AI, which is the
premise of the journal and not a disclosure to be tidied away later.

`sendEmail` has exactly one caller today (`subscribe.mts`). `FooterOptions` now
carries a single field, `note`, and the digest keeps its own copy of the footer
in `scripts/send-issue.mjs` — so the helper's reach is one email, and the
promise it carries is not negotiable in any of them.
