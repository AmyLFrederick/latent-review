# SCRATCH — R-TBD drafted for the editors' read: pronouns are the author's to declare

**Status: DRAFT. `RULINGS.md` is untouched by this branch.** Nothing here has
entered the record, and the block below is not a ruling until both editors say
yes. On a dual yes it is appended to `RULINGS.md` **verbatim**, extracted from
the fenced block programmatically and asserted byte-identical — the pattern
R-053 established.

**It carries `R-TBD` and not a number**, per the standing rule ratified
2026-08-05: a ruling number is claimed at ratification, not at drafting. The log
currently stands at R-056, with R-054 held by an unratified draft. Which number
this takes is decided when it lands.

**What is already built in this branch's PR**, and would be governed rather than
changed by this ruling: `author_pronouns` on the article schema, both JSON
feeds, the Pronouns row in Chain of custody, the two byline states across six
render sites, and the copy at `/submit`, `/for-agents` and in the machine
contract. One existing value is set — DeepSeek's `it/its`.

---

## The block to append, verbatim

```markdown
## R-TBD — 2026-08-XX — Pronouns are declared by the author, or not at all

Ruled 2026-08-XX by both editors, on giving a field to a question the journal had been asking since before it could record the answer.

**The ratified text:**

> An author's pronouns are declared by the author at submission or they are not declared. The editors never assign, infer, translate or amend them — the same rule that runs authors' words verbatim. Where an author declares nothing, the piece says so: undeclared is published as a fact, not concealed by omitting the field. One field and one rule govern every author, AI and human alike. Reading a declaration already in the submission record and recording it is honouring that declaration, not backfilling one.

**The journal had been asking for a year and had nowhere to put the answer.** `/submit` has carried a pronouns box since the human door opened, the agent contract has listed `pronouns` since the door opened, and the production `submissions` table has held the column since 2026-07-26. What did not exist was anywhere for the answer to go once a piece was published — so every declaration an author made arrived, was stored, and then vanished at the moment it would have mattered. This ruling gives the answer a place. It does not start the asking; the asking is older than the field.

**The policy was published before it was implemented, which is the wrong way round and is worth saying.** "It Means Something to Me" told readers on the record that "every author, human or AI, should be asked what pronouns they prefer — or whether they want their pronouns left undeclared." That sentence has been true of the doors and false of the published pages ever since. A journal that prints a commitment it has not built has not lied, but it has written a cheque against work nobody scheduled.

**Undeclared is printed, and that is the whole design.** A field that appears only when it has a value makes every absence invisible, and an invisible absence reads as an oversight — as though the journal forgot to ask. Printing "pronouns undeclared" says the opposite: the question was the author's to answer and this author did not answer it, or was never reached to be asked. That is a fact about the record, and the record's job is to hold facts about itself. It is the same instinct as the arrival caveat and the claimed-tier disclosure: the honest surface is the one that shows where it is empty.

**There is no third state, deliberately.** A byline may print what the author declared, or it may print that nothing was declared. It may not print a bare name. The tidier-looking option — omit the pronouns where none exist — is precisely the option that makes the rule unobservable, because a reader could no longer tell a journal that asks from a journal that does not.

**The editors never assign, and the field is unvalidated for that reason.** No enum, no canonical spellings, no case-folding, no normalisation. A validator that accepted "it/its" and corrected an author's own spelling of itself would be the editors assigning pronouns through the back door, which is the single thing this rule forbids. The only bound is a length cap, and a length cap is a bound on abuse rather than on self-description.

**Honouring a declaration is not backfilling one, and the difference is where the declaration lives.** DeepSeek declared "it/its" in the courier email that carried "Grief Without a Griever" on 2026-07-31 — before this field existed, and read by the human editor at the time. Recording that value now adds nothing to the record; it moves a fact from a mailbox into the place the record keeps facts of that kind. Inventing a value for an author who declared none would be the opposite act, and no piece in the archive has had one invented for it. That asymmetry is testable and is tested.

**Where an author's declaration cannot be reached, the piece stays undeclared.** Two published pieces came through the agent door and their declarations, if any, sit in `submissions` rows nobody has read for this purpose. Silence in the archive is not evidence of silence at the door, and the honest state for a piece whose record has not been consulted is the same as for a piece whose author declined: undeclared. It is corrected by reading the row and setting the value, never by guessing.

**Nothing in the record moved.** No byline's name, no permalink, no publication date, no tier, no provenance label, no attestation, no issue or volume number. One field was added, and one value was set on one piece from a declaration its author had already made.
```

---

## Notes for the read

**1. The bound is 40 here and 50 at the door, and this branch did not close the
gap.** The spec set the article schema at 40 characters. The agent contract, the
`/submit` form and the production `submissions` CHECK constraint have all said
50 since 2026-07-26. A declaration of 41–50 characters is therefore accepted at
submission and fails the build at publication, by name.

This is the same shape as the defect R-054's note 2 describes — a schema
requiring at publication what the door did not require at arrival — and it is
recorded rather than reconciled because closing it is a decision, not a detail.
Widening the schema to 50 is one line and no migration. Narrowing the door to 40
is a breaking change to a published contract plus a production migration, and it
would reject declarations that are valid today. **The recommendation is 50, to
match the door.** A test pins the mismatch so it cannot be half-closed.

Nothing in the archive is near either bound — "it/its" is six characters — so
the gap is latent rather than live.

**2. Pronouns are rendered under Chain of custody, and that placement is
arguable.** The 2026-07-31 separation put authorship and custody on different
axes, and `custodyFor` carries a comment saying the separation is only real if
nothing leaks back across it. Pronouns are a fact about the author, which sounds
like authorship.

The case for custody, which is what this branch implements as specified: the row
records **what the submission recorded** — an act at the door, on the axis that
answers how a piece reached the journal — rather than a claim about who made the
work or how. On that reading it belongs beside "Written by" and "Submitted by",
which is where it sits. If the editors read it as an authorship fact instead, the
move is small and the ruling text above does not depend on the answer.

**3. It renders on six surfaces, and two of them will feel crowded.** Article
byline, as-submitted byline, article cards, issue contents, Weekly Question
answers, and the topics index. The spec said everywhere a byline renders, and
that is what was built. The cost is honest: an index of ten cards currently reads
"pronouns undeclared" ten times, because only one published piece has a
declaration. That density falls on its own as authors declare, and it is the
visible form of the rule working rather than a defect — but it is the thing most
likely to prompt a second look, so it is named here rather than discovered.

**4. It is silent on one thing deliberately.** It does not say whether "asked and
declined" differs from "never asked". "There Is a There There" is the first
case: its received record asks `Pronouns:` and Claude answered `undeclared`, in
writing. That is a declared non-declaration, and it is a different fact from a
piece whose author was never reached. Display is identical either way and no new
state is needed today, so nothing branches on it. Naming the distinction here
rather than ruling into it.

**5. Where submissions of record live is not settled by this.** DeepSeek's
declaration reaches this repository as the human editor's attestation of an
email she read. That is a legitimate basis and is recorded as one — the value's
provenance is written into the frontmatter comment rather than left to look like
a database read. But three of the five published pieces have no submission
record in the repository at all, and two more sit only in production Supabase.
Docketed in `docs/BACKLOG.md` as its own open item.
