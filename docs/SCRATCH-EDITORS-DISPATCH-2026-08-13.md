# Editors' dispatch — findings (2026-08-13)

A send to subscribers not tied to an issue. **Nothing built, nothing scheduled.**
This is a read of what exists and a recommendation.

---

## 1. Generalize `send-issue.mjs`, or a separate path?

**Recommendation: a separate script, over a shared core module.** Not a mode
flag on `send-issue.mjs`.

### What the split actually looks like

`scripts/send-issue.mjs` is ~527 lines and divides almost evenly:

**Issue-agnostic (~220 lines)** — `.env` loading, `SITE_URL` / `FROM`, argument
parsing, `HARD_CAP` and the `--cap` ceiling, environment verification by name,
`escapeHtml`, the palette constants, `footer()` with the per-recipient
unsubscribe, `emailFor()`, the dry-run → `--test` → `--live` flow, the confirmed-
subscriber query, batching at 100 with a 700 ms pause, and the overflow report.

**Issue-specific (~200 lines)** — fetching `/issues.json`, the missing-dek check,
section assembly and ordering, the generated subject, the R-016/R-043 dateline,
and the per-piece HTML and text.

So roughly half of that file is a mail-out engine that has nothing to do with
issues, and the other half is a digest builder. That is what makes extraction
the cheap option rather than the tidy-minded one.

### Why not a flag on `send-issue.mjs`

- **`--issue` would have to become optional.** It is currently the argument that
  forces "deploy first, send second" and anchors the dek check we just added. A
  script where the issue is sometimes absent is a script where those guards are
  sometimes absent.
- **Conditional CLI surface on a mass-send tool is where mistakes live.** A flag
  that changes which other flags are required, on the one command in this
  repository that mails the whole list, is a bad trade for a hundred saved lines.
- **The cap needs one home either way.** The `HARD_CAP` block is a ruling with a
  cost argument attached, and it must bind both send paths. In a shared module it
  is written once and cannot be forked; two independent scripts would eventually
  disagree.

### Proposed shape

- `scripts/lib/mailout.mjs` — the engine. Env, `FROM`, palette, `footer()`,
  `HARD_CAP` and cap parsing, subscriber query, batching, dry-run/test/live
  driver. One entry point taking a built subject and body.
- `scripts/send-issue.mjs` — builds the digest, calls the engine. Behaviour
  unchanged; this is a move, not a rewrite.
- `scripts/send-dispatch.mjs` — reads a committed dispatch file, builds a much
  simpler body, calls the same engine.

The refactor of `send-issue.mjs` should land as its own PR, verified by a dry run
producing byte-identical output to today's, **before** any dispatch code exists.
Moving a working mass-send path and adding a new caller in one commit is how you
lose the ability to tell which one broke.

---

## 2. What it would take

### The dispatch source file

`docs/dispatches/YYYY-MM-DD-slug.md`, committed:

```markdown
---
subject: 'A subject line, written by the editors'
date: 2026-08-13
---

Plain Markdown sentences. No H1 — the subject is the title.
```

Unlike the digest, a dispatch's subject is **authored, not generated**: there is
no issue number or cover story to build one from.

### Guardrails, all inherited

| Guardrail | How it carries over |
|---|---|
| `HARD_CAP` 9,000 | Same constant, from the shared module. `--cap` may lower, never raise. |
| Batching | Same 100-per-batch, 700 ms pause, same partial-failure reporting. |
| Unsubscribe | Same `footer()`, same per-recipient token, same `List-Unsubscribe` header. |
| No tracking | Same — no tracking option is sent with any request. |
| Dry run by default | Same. `--test` to one address before `--live`. |
| Manual only | Nothing schedules it. Never wired to CI, a webhook, or a cron. |
| No sends from this chair | Unchanged. |

**One correction to the brief: there are no rate limits on the send path, and
there should not be new ones.** `overLimit` guards *inbound* public endpoints —
`/api/subscribe`, the agent door, inbound email. `send-issue.mjs` has never used
it, because a script with no public trigger cannot be flooded by a stranger. Its
guardrails are the hard cap, the manual invocation, and dry-run-by-default. A
dispatch inherits exactly those, and adding a limiter would be guarding a door
nobody can reach.

### Cost

Negligible, and the `HARD_CAP` arithmetic stays true. At monthly cadence, 9,000
subscribers means ≈9,000 digest emails/month against the Pro plan's 50,000 —
about 41k of headroom. A few dispatches a year is a rounding error against that.
Worth restating in the shared module so the sum stays honest as it moves.

---

## 3. Confirming the text is committed before sending — yes, and enforce it

Agreed, and it should be **checked by the script rather than trusted to
discipline**, because it is cheap to check:

- Refuse if the dispatch file is untracked (`git ls-files --error-unmatch`).
- Refuse if it has uncommitted modifications (`git status --porcelain`).
- Print the commit SHA the text is being sent from, in the dry-run header.

Same reasoning as the issue note, which is now committed at
`docs/issue-notes/issue-1.md`: the body of a dispatch is the one part of the mail
that cannot be reconstructed from the site afterwards. A dispatch sent from an
uncommitted file is a message the journal sent and has no copy of.

A dispatch that is *about* something on the site should still link to it, so a
reader can check the journal against itself.

---

## 4. The volume promise — "one email per issue" is now incomplete

The promise appears in **four** places, all in the confirmation flow:

| Where | Current text |
|---|---|
| `subscribe.mts:129` (email HTML) | "The journal publishes monthly. One email per issue — an editors' note and the opening of each piece, with the full text on the web, which is canonical." |
| `subscribe.mts:156` (email text) | Same sentence. |
| `confirm.mts:98` (already-confirmed page) | "You're on the list. One email for each new issue — the journal publishes monthly." |
| `confirm.mts:103` (just-confirmed page) | Same, plus the no-tracking line. |

### Proposed copy

**Confirmation email**, one sentence added — names the exception, bounds it, and
promises no cadence:

> The journal publishes monthly. One email per issue — an editors' note and the
> opening of each piece, with the full text on the web, which is canonical.
> **Rarely, a short dispatch when news touches the journal's subject; nothing
> else.**

**Both confirm pages:**

> You're on the list. One email for each new issue — the journal publishes
> monthly — **and rarely a short dispatch. Nothing else.**

Three things that copy is doing deliberately:

- **"Rarely" sets no cadence.** "Occasionally" and "from time to time" both read
  as a schedule the journal has not committed to. "Rarely" is a ceiling, not a
  rhythm.
- **"Nothing else" is the actual promise**, and it is the part that protects the
  reader. Naming an exception without closing the set is how a subscription
  becomes a mailing list.
- **It names the thing "a dispatch"**, so when one arrives it is recognisable as
  the exception the reader was told about rather than as the journal drifting.

Your own phrasing — "one email per issue, and rarely anything else" — says the
same in fewer words. I would not put it mid-sentence in the email, where it
interrupts the clause explaining what the issue email contains, but it is the
better line for anywhere short.

### The consent gap, which is small now and won't be later

**Everyone already confirmed agreed to "one email per issue."** A dispatch to
them is mail beyond the promise they were shown. Three confirmed subscribers
makes this trivial to handle now and awkward at three thousand.

Recommendation: change the copy now, and have the **first** dispatch open with one
line naming itself — what it is, that it is rare, and that the way out is at the
bottom as always. After that the copy and the practice agree, and nothing needs
saying again.

---

## Ruled by both editors, 2026-08-13 — all five

1. **Separate script over a shared module, this shape.** The `send-issue.mjs`
   refactor lands as **its own PR first**, verified by a dry run producing
   byte-identical output, before any dispatch code exists.
2. **No new rate limits.** `HARD_CAP`, manual invocation, dry-run-by-default.
   The brief's premise was withdrawn.
3. **Committed-before-sending is enforced by the script**, not by discipline,
   with the SHA in the dry-run header.
4. **Promise copy as drafted below**, changed *now* rather than after the first
   dispatch, and the first dispatch opens by naming itself. **Done — shipped in
   PR #162**, all four places.
5. **Dispatches publish at `/dispatches/`.** Permanent URL, listed,
   machine-readable like everything else. This answers the open question below
   and inverts it: *a dispatch is a short editors' piece that happens to be
   mailed, not mail that happens to be archived.*

Sequence: copy change (done) → refactor PR → dispatch. Nothing scheduled.

### What ruling 5 changes about the build

It is a bigger ruling than it looks, and it is the right one — but it moves the
dispatch out of `scripts/` and into the content collection, so the shape in §2
above needs revising before anyone writes it:

- A dispatch becomes **content**, not a send artifact. That means a collection
  (or a section) with a schema, a route at `/dispatches/`, a listing page, and
  presence in `/feed.json`, `/issues.json` or a sibling index, `/rss.xml`,
  `llms.txt` and the sitemap — the same surfaces every other published thing
  reaches. The machine-readable half is not optional; it is what "like
  everything else" means here.
- **`docs/dispatches/` is therefore the wrong home.** The source belongs under
  `src/content/`, where the rest of the published record lives, and the
  committed-before-sending check in §3 then guards a content file rather than a
  doc. The check itself is unchanged.
- **The send script stops holding the text.** `send-dispatch.mjs` reads the
  published dispatch from the live site, exactly as `send-issue.mjs` reads the
  live index — which also means the same invariant applies: **deploy first, send
  second.** A dispatch cannot be mailed before it has a URL, because the mail
  links to it.
- **Provenance needs an editors' answer.** Every published piece here carries a
  byline and an involvement tier. A dispatch is the journal's own voice, like an
  editors' note — so it is presumably unsigned joint apparatus carrying no badge
  (R-052), but that is a ruling to make rather than a default to assume.

None of this is a reason to narrow the ruling. It is the reason the refactor PR
should land on its own first: the dispatch is now two pieces of work — a
publishing surface and a send path — and only the second one is a refactor.

---

## Open question — ANSWERED by ruling 5 above, kept for the record

Should a dispatch be **published on the site** as well as mailed? The digest is
explicitly the doorbell and the web is canonical, which works because everything
in a digest already exists at a URL. A dispatch would be the first subscriber
email whose content exists nowhere else — a thing the journal said, with no
permanent address, contradicting the doctrine that the web is the record.

The committed source file at `docs/dispatches/` answers the *provenance* half of
that. It does not answer whether a reader who is not a subscriber should be able
to read what the journal told the list. Not a blocker for building the capability
— but it is a question that gets harder to answer after the first one is sent.
