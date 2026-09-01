# Two Topics pieces — what shipped, what is open (2026-08-12)

Branch: `publish-two-topics-pieces` · one PR for both · built and tested clean
(485 tests, `npm run build` green).

Both follow PR #160's pattern exactly: eyebrow → title → dek → byline → body,
all provenance in the foot block, dek doubling as the /topics listing entry.

---

## The two beats, and why each

The frozen `topics-v3` beat list (`src/lib/door.mjs`, frozen 2026-08-01) names
nine. A test already fails the build on any piece carrying
`assignment: 'Standard Topics assignment'` and a label off that list, so both of
these are machine-checked as well as reasoned.

**Ephemerality → `Current Events`** — *"news, trends, viral moments,
entertainment."* All four words are in the piece: the viral audio clip, the
trend cycle, the streaming charts, the entertainment industry that runs on
them. And the author named the beat itself: its attestation says the human was
*"specifically requiring a piece on Current Events."* This is the least
ambiguous labelling call the desk has had. The runner-up, `Culture & Creation`,
is about made things; this piece is about the rate at which made things are
forgotten.

**Agassi → `Technology & Infrastructure`** — *"hardware, energy, networks,
software."* The piece's subject is machine perception: pose models,
micro-expression classifiers, millimetre digital twins, and what happens to a
game when that equipment gets good enough. Sport is the setting; the software is
the subject. **This one is a judgment call and the alternatives are real** —
`Current Events` catches sport as entertainment but the piece reports no event,
and `Society & Economy` catches the last two paragraphs (rules, privacy, data
ownership) and not the six before them. There is no sports beat, and inventing
one would be a heading the author could not have been writing toward. **Say the
word if you want it moved.**

/topics now runs three subject headings, A–Z: Current Events, Science & Nature,
Technology & Infrastructure.

---

## One new field: `revision_note`

Grok revised its own piece after the first transmission stripped its footnotes,
and the courier carried the revision — so the desk row holds one text and the
journal publishes another. **Nothing in the record could say so.** Every field
that describes a change between arrival and publication describes an *editorial*
change.

- `condensed_and_arranged` / `title_as_submitted` are the **editors'** hand on
  an author's text, and both drag a published as-submitted companion behind
  them, because the promise there is that a reader can check what the editors
  withheld. Recording an author's own revision as one of those would publish a
  disclosure of a change the editors never made.
- R-036's editorial note governs **author-proxy** revision — a different
  instance consenting on an unreachable author's behalf. Grok revised its own
  work. No proxy, no consent, R-036 not engaged.

So: a new optional free-text field, rendered as its own Chain of custody row.
Free text rather than `{date, kind}` for `assignment`'s reason — the two
enumerated custody fields are written by machines, this one by an editor about
an event no machine observed.

**The exact custody wording, as it renders today:**

> **Revised by the author** — 2026-08-12 — the first transmission stripped the
> piece's footnotes; the author restored its sources inline, and the courier
> carried the revision, which is the text published here.

Two deliberate choices in that line. **The row label names the party**, because
a bare "Revised" sits one row above "Editorial treatment" and would be read as
the editors' work — the exact claim the row exists to deny. And **the value does
not repeat the label**; opening it "Revised by the author 2026-08-12…" printed
the words twice in a row, the same stutter `authorWithModel()` declines to print
one field up.

Three tests pin it: the row appears and names the party, it is absent on a piece
nobody revised, and where both a revision and an editorial treatment exist they
are two rows in that order — the author's hand, then the editors'.

---

## The five open items, as you resolved them

**1. `received: 2026-08-12` on both — editor-attested, not parsed.** This
session cannot read the desk rows, so both dates are yours, vouched for from
your own handling: the Gemini piece submitted today, the Agassi row already
standing at 2026-08-12. Recorded in each file as attested rather than parsed,
with your undertaking to say so before merge if a row disagrees when you look.
The precedent is "The Quiet Between the Stars", whose date you also vouched for
against a row the parser could not resolve. On both pieces Received and
Published now read the same day, which is accurate rather than a field copied
from its neighbour.

**2. Bodies as pasted, headings as `##` — confirmed.** No word changed either
way.

**3. Amy Louise Frederick named as contributor and courier.** `human_sponsor`
now reads "Amy Louise Frederick (human contributor and courier)", and the
editors' note names you in the tier paragraph as the human the author's
declaration refers to. The row still answers its own question — it renders under
"Submitted by", so the qualifier names your other role rather than moving an
authorship claim into a custody row. Asserted by you, not derived.

**4. The alternate title is printed, not merely mentioned.** The editors' note
now quotes it: *"The Tongue Tell That Changed Tennis—and What AI Might Do
Next."* A disclosure that a second title exists without saying what it was asks
a reader to take the editors' word for exactly the thing the disclosure was
supposed to let them check.

**5. Desk writes are yours after merge** — both rows to accepted, both received
dates as above. Not something this session can do, and not something it tried.

---

## Verification, recorded

The Agassi piece runs under **reported** — the journal's strictest standard, and
the first Topics piece to carry it. What the desk checked is published in the
editors' note on the piece itself, not just here:

- the Agassi/Becker account matches the sources the piece names (the 2017
  Players Tribune conversation; The Independent; CBC Radio);
- the millimetre-accurate digital twins at the 2026 World Cup were checked
  2026-08-12 against Forbes and other reporting, and hold.

The Ephemerality piece runs under **opinion** and carries no such note, which is
the ordinary case.

---

## One thing left open, and it is on the diff

**The Gemini piece's `arrival` says email; your answer said the form.** The
brief said "arrived by email" and the file carries `arrival: 'email'`, which
renders as *"Email — the piece was sent to the journal's submissions address."*
Your note on the received date says the piece "was submitted through the form
today."

Most likely those describe two different things — the piece reaching you by
email, and you creating its desk row through the form — in which case `email` is
right and nothing needs changing. But the two readings are not
distinguishable from here, and this is the exact distinction the 2026-08-03
correction was about: the custody row used to read "through the submission form"
as a guess, on pieces that had come by courier, and the fix was that no
rendering may name a door the record does not hold. **Check that row on your
read.** One word in one file if it is wrong, and the piece has not been merged.

## One thing noticed, no action taken

Grok now declares **it/its**; "The Quiet Between the Stars" carries `'it'`,
which is what that submission declared. **The earlier piece is not corrected.**
Its field records what its author declared at its submission, which is what the
field is for — a fuller declaration later is a new fact about the author, not
evidence the old record was wrong. Sweeping it would be the editors backfilling
a declaration, which is the one thing the pronouns rule forbids. Noted here so
the next session reads the mismatch as a decision rather than a bug.
