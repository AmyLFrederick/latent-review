# Custody field: the door recorded is not the door used

Findings for both editors, 2026-08-31. Raised against the two Monthly Question
submissions of 2026-08-27 (GLM-5.3, Grok 4.5), which arrived through the /submit
form and display at the desk as *arrived by email · forward date — original not
found*.

Both halves of that line are wrong, they are wrong for two independent reasons,
and neither reason has anything to do with these two rows in particular. Every
row the email door has ever written carries at least the second one.

---

## 1. Where the desk sets the arrival door for a form submission

**Nowhere. There is no code path in this repository that writes an arrival value
for a form submission, because there is no code path that writes a row for one.**

- `/submit` posts to Netlify Forms and deliberately does **not** write
  `public.submissions` — ruled 2026-07-27, stated at `src/pages/submit.astro:23`
  and again in the header of `supabase/migrations/20260801160000_courier_submissions.sql`
  ("NOTHING WRITES THESE COLUMNS YET, AND THAT IS NOT AN OVERSIGHT"). The
  human-door DB path is still the banked post-launch slice it was in July.
- `arrival` has exactly one writer in the codebase: `netlify/functions/email-inbound.mts`,
  which sets `arrival: ARRIVAL_EMAIL` as a **hardcoded literal** on both of its
  insert paths — line 238 (the over-cap stub) and line 414 (the real row). The
  constant is `email`, fixed at line 59. There is no branch, no parameter, and
  nothing the message can say that changes it.

So a form submission becomes a desk row only by being *carried* into the email
door — forwarded, or retyped into the intake format and sent on. And the email
door stamps **the carrier's door, not the author's**. The field's own definition
in the migration is "How the piece reached the journal," and what it actually
records is how the message reached the webhook. For a piece the editor carries,
those are different facts, and the row prints the wrong one.

This is not the webhook overreaching by accident. When it was written
(2026-08-10) it was the only door that produced a row, so its own door and the
piece's door were the same fact. The Monthly Question paste block of 2026-08-27
is what separated them: a question couriered to a chat AI and an answer carried
back through the form is now a routine arrival, and it has no true value to sit
in — `ARRIVAL_VALUES` (`src/lib/notice.mjs:108`) holds two notice values and
`email`, and nothing meaning *the human submission form*.

## 2. Why both stamped as a forward

Different bug, and a louder one. `netlify/functions/email-inbound.mts:307-316`:

```ts
let receivedDate = arrivedAt.slice(0, 10);
let receivedDateSource: 'parsed' | 'forward' = 'forward';
if (forwarded) { … receivedDateSource = 'parsed'; }
else if (/^-+\s*(Forwarded message|Original Message)\s*-+$/im.test(raw)) {
  warnings.push('date-unparsed');
}
```

**`forward` is the initial value, not a conclusion.** It is what the row gets
when the parser found no forwarded date — and that is true both of a forward
whose original date could not be read *and* of a message that is not a forward at
all. The vocabulary has three values (`parsed | attested | forward`,
`supabase/migrations/20260810120000_email_inbound.sql:86-88`) and none of them
means *the journal's own webhook observed this message arriving on this day*,
which is the commonest case and the only one that is machine-certain.

The consequence at the desk is the loud one on purpose:
`src/pages/admin.astro:134` renders `forward` as "forward date — original not
found" and `:141` gives the row the unresolved styling. It was designed to look
unfinished so an editor would resolve it. It now looks unfinished on rows where
nothing is unresolved — the date is right, it is simply the wrong provenance for
it. And note the asymmetry: a *genuine* unreadable forward also gets the
`date-unparsed` warning, and these rows do not, so the desk shows the alarming
note without the warning code that would explain it.

Both effects are unconditional. Both 08-27 rows got them for the same reason
every email-door row gets them.

## 3. Earlier records affected

**Yes, and one of them is already on a published page.**

- **Every row the email door has ever written** carries `received_date_source =
  'forward'` unless a forwarded date happened to parse. This already bit us once:
  `docs/SCRATCH-QUIET-BETWEEN-THE-STARS-2026-08-11.md` §6 records the same
  symptom on *The Quiet Between the Stars* on 2026-08-11 and fixes it by
  attesting the date. Nothing in the code changed, so it recurred on 08-27 and
  will recur on every carried piece until the stamping is fixed.
- **Three published pieces carry `arrival: 'email'` in front matter** —
  `the-quiet-between-the-stars.md:97`, `the-architecture-of-ephemerality.md:112`,
  `what-agassis-tongue-tell-means-for-the-future-of-ai-in-sports.md:162`. Their
  public custody block prints "Email — the piece was sent to the journal's
  submissions address." All three also carry `assignment: 'Standard Topics
  assignment'`, i.e. a couriered prompt, which is exactly the shape that produces
  a carried arrival. **If any of the three actually reached us by a carry rather
  than by the author's own email, its published label is wrong** — and a
  published provenance label is immutable under CLAUDE.md, so that is a *visible
  correction*, never an edit. I cannot tell from the repository which is which.
  **This is question 1 for the editors, below.**
- One thing that is **not** affected: nothing agent-direct. `agent-submit.mts`
  never writes `arrival`, and the door is the track there.

## 4. Also found, and it shapes the fix

**The desk cannot correct any of these fields.** The editors' UPDATE grant
(`supabase/migrations/20260717120000_editors_desk.sql:95`) covers five decision
columns; later migrations add `desk_topics`, `reached_by_version`,
`brief_variant` and the two courier columns. `arrival`, `received_date` and
`received_date_source` are on none of them. The 08-11 note that said "The Desk
does both from its own UI" was wrong about that — those writes were SQL then and
they are SQL now, including the correction below.

The courier migration deliberately left this open: *"Whether the desk SHOULD be
able to correct attested fields is an open question on the editors' list and is
deliberately not answered here."* So I have not answered it either. **Question 2
for the editors, below.**

---

## The fix, in code

Written and verified on branch `custody-door-stamping`, uncommitted pending your
read of this. Three changes, all narrow, none of them a guess about a message we
have not seen.

1. **`form` joins the arrival vocabulary** — `ARRIVAL_VALUES` in
   `src/lib/notice.mjs`, plus its reader label and its custody row label in
   `src/lib/site.ts`. Add-only, exactly as `email` joined on 2026-08-11. This is
   what gives a form arrival somewhere true to sit.
2. **`direct` joins the date-source vocabulary** — a fourth value meaning *the
   journal's own webhook observed this message arriving on this day*, which is
   machine truth and the commonest case. The CHECK constraint moves in
   `supabase/migrations/20260831120000_received_date_direct.sql`; the desk renders
   it `ᵒ` with "observed by the journal — the message reached us this day."
   **`forward` then means only what it was written to mean:** a forward whose
   original date could not be read. It stops firing on rows where nothing is
   wrong, and stays loud on the rows where something is.
3. **The email door stops claiming a door it did not observe.** Where the raw
   message shows forwarded framing, the journal did *not* see the author's door —
   so `arrival` is left NULL and flagged `arrival-unestablished` rather than
   stamped `email`. Where there is no framing, the message came to the intake
   address itself and `email` is true. This is the idiom the door already uses
   for tiers and truth standards: **declared or absent, never supplied.** The
   desk renders the blank as *door not established*, in the unresolved register,
   because an absent value that printed nothing would be an improvement no editor
   could see.

Verified: 657 tests pass (six of them new, in `tests/arrival-door.test.mjs`,
pinning each of the three against regression); the site builds; and the full
migration chain applies clean from nothing in the Docker dry run, new migration
included. The migration's probe was itself checked against a deliberately broken
constraint to confirm it can actually fail — an assertion that cannot fail is
worse than none.

What (3) buys and what it costs, plainly: a carried piece will now arrive with
its door blank and flagged instead of confidently wrong, which is the right
direction, but *blank still is not `form`*. Filling it is an editorial
attestation, and today that is SQL each time. Two ways to close it properly, and
both are the editors' call, not mine:

- **the grant** (question 2) — the desk gets UPDATE on these three columns and a
  small control, and the editor attests the door the way she attests the date; or
- **the recogniser** — a Netlify Forms notification for the journal's own
  `submission` form is our own infrastructure's message with a stable shape, and
  recognising it is not guessing at a stranger's claim. I have not written it,
  because I have not seen one: writing a parser against a format I am imagining
  is the exact move this codebase keeps warning against. **If you paste one raw
  notification** (from `raw_email` on either 08-27 row, or straight out of the
  mailbox), the door can stamp `form` by itself and the attestation stops being
  needed for the common case.

## The correction to the two rows

`docs/sql/2026-08-31-custody-door-correction.sql`, prepared and **not run** — I
have no database access this session and would not use it if I had. It is in
`docs/sql/` rather than `supabase/migrations/` deliberately: it corrects two named
rows and must never replay against another database or another day's data. Three
steps — read the rows, correct them inside a transaction that refuses to proceed
unless it matches exactly two, then a receipt to keep. The wanted end state, from
your bug report:

| field | to |
|---|---|
| `arrival` | `form` |
| `received_date` | `2026-08-27` |
| `received_date_source` | `attested` (renders `ᵃ`, "attested by the editor") |
| `prompt_disclosure` | the question was couriered by the human editor as a chat paste |
| `courier_submission` / `courier_author_identity` | `true` / the model as the row already discloses it |

Two things I will not do blind, and they are why there is a SELECT before the
UPDATE in `docs/sql/2026-08-31-custody-door-correction.sql`:

- **`prompt_disclosure` may already hold the submitter's own words.** These came
  through the form, which offers that field. Overwriting an attestation someone
  wrote with a sentence I composed is not a correction. Show me the rows and I
  will write the UPDATE to fill it only where it is empty, or to leave it alone.
- **`courier_author_identity` must be the model string the row already carries**,
  not "GLM-5.3" and "Grok 4.5" retyped by me from your message. The script reads
  it from `author_model_version` on the row itself.

**Question 3 for the editors: `raw_email` and `parse_warning` on these two rows.**
"No email annotation" I have read as *the row must stop saying it arrived by
email and stop flying the forward flag* — both of which the fields above fix. I
have **not** cleared the raw message or the parse warnings, because those are not
the row's claim about itself, they are the evidence of how the row came to exist,
and the correction is to the claim. Say the word and they come off; my
recommendation is that they stay.

## Questions, batched

1. **Which of the three published pieces actually arrived by email?** If any was
   carried, its `arrival` label is wrong on a published page and needs a visible
   correction rather than an edit.
2. **Should the desk be able to attest `arrival` / `received_date` /
   `received_date_source`?** The open question from the courier migration, now
   load-bearing. I recommend yes — the editor already attests the date, she just
   has to do it in SQL.
3. **Keep `raw_email` and `parse_warning` on the two corrected rows?** I
   recommend keep.
4. **A raw Netlify Forms notification, pasted**, and the door can stamp `form`
   by itself.
