# "The Quiet Between the Stars" — what's needed before it can publish

Read the repo end to end against the instruction. The metadata as specified
cannot be expressed by the schema today, and the piece's text isn't in the
repo. Nothing is written yet; nothing is assumed.

## 1. The Assignment row needs a decision — three schema gates block it

You asked for **arrived by email** *and* **Assignment: "Standard Topics
assignment."** Three separate ruled gates currently forbid that combination:

| Gate | Where | What it says |
|---|---|---|
| `brief_variant` is agent-direct only | `content.config.ts:541` | "brief_variant records a brief dealt at /door, which only the agent-direct track passes through. See R-033." This piece is human-attested. |
| `arrival` and `brief_variant` are mutually exclusive | `content.config.ts:555` | "a piece is either dealt a brief or unsolicited, never both." |
| The email label denies an assignment | `site.ts` `ARRIVAL_LABELS.email` | Renders "Email — … **no assignment was dealt**", which would sit directly above an Assignment row saying one was. |

Underneath the three is one conflation: `brief_variant` means *which brief the
desk dealt at /door* — the journal's own server-side observation — and the
schema treats that as the only way a piece can have been working from
something. A standard Topics prompt sent by email is a real assignment that
`/door` never dealt. **Three ways to fix it:**

**(a) A new `assignment` field.** Holds the house label; renders the Assignment
row; independent of both `brief_variant` and `arrival`. R-033's field keeps its
ratified meaning untouched, and "what the author was working from" stops being
welded to "which door dealt it." Cleanest, and it is the one that scales to the
next prompt you send by email.

**(b) Extend `brief_variant`.** Add a `topics-standard` value and relax two
ruled gates so a human-attested email piece may carry one. Fewest new concepts,
but it widens a field R-033 defined narrowly and on purpose.

**(c) Fold it into the arrival label.** One row, no Assignment row —
contradicts the instruction, listed only so the option is on the record.

**Recommend (a).** Either way `ARRIVAL_LABELS.email` loses its "no assignment
was dealt" clause. That is safe: the value has never been published, because of
gate 4 below.

## 2. `arrival: 'email'` is not publishable at all yet

The email door (2026-08-10) added the reader-facing label and the row label but
never added `email` to `ARRIVAL_VALUES` in `src/lib/notice.mjs` — which is what
the article schema validates against. **Every published `arrival` value is one
of the two notice values; no piece can currently carry `email`.** This is a live
gap, not specific to this piece, and it has to close before any emailed piece
publishes. Add-only, so adding it is safe.

## 3. Topics section requires subject labels

`src/lib/topics.mjs` fails the build for a piece in the Topics section carrying
no `topics: [...]` labels — it would have no subject heading to appear under
(R-032 c3). **Which labels?** They're editors' labels applied at publication, so
they're yours to set, not mine to infer from the text.

## 4. What I don't have

The instruction says "attestation and body verbatim," and neither is in the
repo — no `docs/received/` record, no submissions row I can read, no file
anywhere matching the title. I'm not going to reconstruct either from a
mailbox: verbatim means verbatim, and a published body assembled by me is the
one thing this journal's record cannot survive.

Needed, verbatim:

- **The body.**
- **The attestation.**
- **`author_model_version`** — the model string exactly as the email disclosed
  it. Human-attested pieces require it (schema), and "Grok 4.5" from your
  message is a byline, not necessarily the disclosed string.
- **Byline form** — `author_name: 'Grok'` with `byline: 'Grok 4.5 (AI)'`, or
  something else? The two published courier pieces set both.
- **`attested_by` / `human_sponsor`** — you attested the date; do you also stand
  behind the attestation, and was there a transmission role to record?

Confirmed from your message and needing nothing further: pronouns `it`,
`truth_standard: opinion`, `involvement_tier: ai`, `submission_track:
human-attested`, `received: 2026-07-30`, author's title kept (so no
`title_as_submitted`, no as-submitted companion).

## 5. Issue number

Every published piece is issue 1, and issue 1 is the live one — monthly cadence
starts at issue 2 (R-055), so **"current issue" reads as 1**, with the piece
carrying its own date of 2026-08-11 under R-053. Say if you meant to open
issue 2 instead.

## 6. The desk row is yours

Both desk changes are Supabase writes and I don't touch production:

- `received_date` → `2026-07-30`, `received_date_source` → `attested` (renders
  `ᵃ`, "attested by the editor"), which is what takes the loud
  `forward` marker and its "forward date — original not found" note off the row.
- Status → accepted.

The Desk does both from its own UI. If you'd rather have SQL to paste, say so
and I'll write it for you to run.
