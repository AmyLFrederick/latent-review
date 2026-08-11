# SCRATCH — R-TBD drafted for the editors' read: sizing leaves the standard

Drafted 2026-08-11. **Not ratified.** It carries `R-TBD` and takes the next free
number when it is appended to `RULINGS.md`, per the rule ratified 2026-08-05 — a
number is claimed at ratification, never at drafting.

**Why it is here and not in `RULINGS.md`.** The two rules meet awkwardly and this
is the only way they both hold. A draft appended to the log under `R-TBD` would
have to have that heading *rewritten* to its real number at ratification, and
rewriting a line of `RULINGS.md` is the one thing the append-only check exists to
stop. So the draft waits here and is appended to the log once, already numbered,
already ratified. This is the same place R-054's draft waited; what is different
is the heading, which claims nothing.

**Ratification checklist.** On a dual yes: give it the next free number, change
"The text put for ratification" to "The ratified text", change the drafting line
to the ruling line, append to `RULINGS.md`, and land the `/provenance` changelog
entry in the same PR. Delete this file in that PR.

---

## R-TBD — 2026-08-11 — Sizing leaves the standard

Drafted 2026-08-11 for both editors' read, on the scope correction made while the
badge chart was being fixed.

**The text put for ratification:**

> Sizing leaves the standard. The involvement-tier standard governs notation, tier
> meaning and form. It does not govern size, and it does not govern proportion.
> Adopters render badges at whatever size suits their layout; legibility of the
> notation is the only requirement. The sizing portions of R-049 and R-050 are
> superseded **as terms of the standard** and stand undisturbed as descriptions of
> this journal's own implementation — specifically R-049's clause that the marks
> are a quarter larger at every placement at exactly 1.25, R-050's clause that the
> AI form's circle is a quarter larger with its notation a quarter smaller so the
> letters come out equal, and the 2026-08-04 amendment's clause setting the
> journal's own surfaces at the AI form's sizing. Nothing else in either ruling is
> touched. The chart at /provenance draws every badge at one diameter.

**The reason, in one line: sizing was never what the standard governed.**

**Superseded by number, and only in part.** R-049 and R-050 stand in this log
exactly as written, every sentence of their reasoning included. Three clauses stop
being terms an adopter is bound by, and they are named above rather than described,
so a later reader can find each one where it lives. Everything else those rulings
decided — the ring colours and the ground, the closed set of seven, the two styles
and their equal canonicity, the derivation of the AI form from the letter form, the
split-ring order rule, the house form — is untouched and carried forward unchanged.

**What is left of the three clauses is the house's own numbers, which are not
diminished by ceasing to bind anyone else.** The marks are still a quarter larger
than they were before 2026-08-03; the AI form's circle is still a quarter larger
than the letter form's wherever a mark stands alone, with its notation a quarter
smaller so the letters come out equal; the journal's own surfaces still set the AI
form at the AI form's sizing. All of it lives in `src/lib/tier-badges.mjs`, which
is where an implementation's numbers belong. What left is the claim that they bind
an adopter.

**A standard that specifies size is asking an adopter to fit their design to
ours.** What a badge must do is say which tier a piece is — the ring's colour, the
notation, the split rule, the accessible name, the notation drawn as real text.
How big it is on someone else's page is a question about their layout, and the
standard has no business having an opinion about it. The one requirement that
survives is the one that is about meaning rather than proportion: a notation too
small to read is a badge that has stopped saying anything.

**The chart at /provenance draws every badge at one diameter, and this ruling is
where that is recorded.** The two columns drew at their own sizes — the AI form's
a quarter larger, which was the seating rule working exactly as R-050 described —
and side by side in a grid the effect read as an error rather than as a
specification. The columns were levelled to the smaller of the two on 2026-08-11.
The consequence is stated rather than hidden: in that table alone the AI form's
notation renders about a fifth smaller than the letter form's, because the
cancellation that held them equal is a product of two numbers and the table changes
one. The editor superscript still clears the 12px rendered floor, at 13px, and the
suite asserts it. **This is a house display decision, not an amendment to the
standard** — which is precisely the distinction this ruling draws, and the chart is
the first thing to fall on the house side of it.

**The page went first, and that is allowed rather than an oversight.** The
prescriptions were removed from "Displaying it" before this ruling was drafted,
under the 2026-08-02 rule that sequencing of rule and doc updates against pushes is
cost-benefit rather than ceremony, reconciled within about a day. The published
standard and this log disagreed for that interval about whether size was prescribed,
and this ruling is the reconciliation.

**The standard's changelog entry rides with this ruling and not before it.** Every
entry in that changelog cites the rulings it records; an entry citing nothing, or
citing a number not yet claimed, would be the first one that could not be checked
against the log. The entry is written when this takes its number.

**Nothing in the record moved.** No tier code, no machine surface, no feed field,
no permalink, no published date, no provenance label, no tier name, no badge, no
notation. The set is still closed at seven, both styles still sit over one set of
codes, and no piece is marked differently than it was. This ruling narrows what the
standard claims about drawing; it says nothing about what any piece is.
