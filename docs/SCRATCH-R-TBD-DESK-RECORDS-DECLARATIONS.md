# SCRATCH — R-TBD drafted for the editors' read: the desk records declarations; it never supplies them

**Status: DRAFT. `RULINGS.md` is untouched by this branch.** Not a ruling until
both editors say yes. On a dual yes the fenced block is appended to `RULINGS.md`
**verbatim**, extracted from the block programmatically and asserted
byte-identical — the pattern R-053 established.

**It carries `R-TBD` and not a number**, per the rule ratified 2026-08-05: a
number is claimed at ratification, never at drafting.

**This replaces `docs/SCRATCH-R-TBD-TRUTH-STANDARD.md`, which is deleted in the
same commit.** The editors ruled on 2026-08-10 that the truth-standard rule is an
instance of a larger principle rather than a rule of its own, and that running
two rulings where one governs is how a principle becomes three coincidences. Its
whole argument is carried below, in §3.

**Where it came from.** The question was raised as note 3 of the truth-standard
draft — pronouns, involvement tiers and truth standards had each been decided
separately, on separate days, each with its own reasoning, and nobody had asked
whether they were one thing. The editors answered that they are.

---

## The block to append, verbatim

```markdown
## R-TBD — 2026-08-XX — The desk records declarations; it never supplies them

Ruled 2026-08-XX by both editors, on noticing that three fields decided separately had been decided the same way.

**The ratified text:**

> A value the author did not declare does not become the journal's to provide — not by default, not by modesty, not by convenience. Where a submitter is present to be asked, the door requires the declaration. Where the submitter is gone, the record stores the absence, shows it plainly, and an editor supplies what only an editor can vouch for. Pronouns, involvement tiers and truth standards are the three current instances of this rule; each keeps its own dated reasoning, and a future field of the same kind is an application of this ruling rather than a new argument.

**The principle in one line: the desk records declarations; it never supplies them.**

**What was already ruled, and what was not.** R-018 settled one half of this boundary in 2026-07-21 — an author declares what a piece *is*, and the editors decide where it *goes*. R-034 settled a second half on 2026-08-01: the line governing who may write a field is claimed versus observed, and a submitter may write their own claims. Neither answers the question that kept recurring, which is narrower and only appears once a field is optional: **when the submitter declared nothing, may the desk write something?** R-018 says placement is ours. R-034 says the claim is theirs. This says the *silence* is theirs too.

**A default is a claim wearing a modest hat.** The case that forced this was a conservative one. An email that declared no truth standard was going to be recorded as `reported`, on the reasoning that of the four it claims the least about a piece. That reasoning is real and it is not enough. Least-claiming is still claiming, and a reader who later asks who called this piece reported deserves a better answer than that a parser had to write something. The modesty of a default does not change its authorship: it was the journal's word, in a field that exists to carry the author's.

**Convenience is the other disguise, and it is the more common one.** A parser that reads `Involvement Tier: A` from a submitter's covering note and helpfully lowercases it into a valid code has assigned a tier. So has an editor who fills an empty field because the piece obviously belongs in it. Both are small, both are well meant, and both put the journal's judgment into a field whose entire evidentiary value is that it holds the author's.

**Require where the submitter is present; flag where they are gone.** This is how the rule is applied at a door, and it decides the next case as well as the three below. An agent is mid-request and can be told to try again. A person filling a form has not left the page. An email's sender is gone by the time anything is parsed, and the only ways to handle silence there are to discard the piece or to invent a value — one loses work sent in good faith, the other makes a claim on the author's behalf. Flagging refuses both and costs an editor a moment at the desk.

**Required at a door means required of a person using that door.** `/submit` enforces its required fields in the browser, and a crafted POST goes around them; the agent endpoint enforces its own in code. The desk's flag logic is the backstop for anything that arrives around either. This is said plainly because a rule that claimed more enforcement than it has would be the same species of error it exists to prevent.

**The three instances, each keeping its own reasoning.**

1. **Pronouns** — declared by the author at submission or not at all; undeclared is published as a fact rather than hidden. The editors never assign, infer, translate or amend them. Its own reasoning is dated 2026-08-09 and is not restated here.
2. **Involvement tiers** — the attested tier is the human-attested track's and is required there; the claimed tier (R-051) is the author's own and is recorded as claimed, never certified. An unrecognised value is left unset and flagged, never mapped to the nearest valid code.
3. **Truth standards** — required at both interactive doors as of this ruling, and recorded as unset by the email door where the author was silent. §"The truth standard" below carries this instance in full, because it was decided in the same session as the parent and its details would otherwise have no home.

**The truth standard.** Every published piece carries one. The interactive doors require it: `/submit` will not send without it, and the agent-direct endpoint refuses a submission that omits it or sends a value outside the four, naming the field and the four values in the refusal. The email door, which has no rejection path by design, records an undeclared standard as unset and flags it; an editor sets it before publication. The guarantee is that **no piece is published without a standard, not that every submission arrives with one.**

**What the database stops guaranteeing, and where the guarantee went.** `submissions.truth_standard` had been `NOT NULL` since 2026-07-17, so every submission row carried a standard; it no longer will. That constraint was doing real work, and what replaces it is the article schema, which requires a truth standard with no optional case. The guarantee moves from intake to publication, which is where it belonged: a submission is a thing someone sent us, and a published piece is a thing the journal vouches for. Something may now be *received* without a standard, and the desk shows which.

**The agent door had been refusing a value it published as legal.** `fiction` was widened into the submissions constraint and the article schema on 2026-07-30 and has been offered at `/submit` and listed in the agent contract ever since; that endpoint's own list was never widened. An agent that read the contract and sent `fiction` was refused for a schema violation, by the opaque refusal that cannot say why. Corrected with this ruling, and it is the reason the new refusal names its values rather than staying frozen.

**A second exception to the byte-identical refusal rule, admitted on the test the first one set.** C-1 requires every refusal in a class to be identical, so that no response reveals which keys exist, whether an identity is banned, or which bucket is full. R-033 clause 3 admitted one exception — the length refusal — because a word count reveals nothing a caller does not already have: the bounds are published and the count is of the caller's own text. A truth-standard refusal passes the same test for the same reasons, and is admitted on that basis and no other. The list of exceptions is now **two, and closed**; a test asserts that every other refusal is still frozen and nameless, so a third fails the suite before it can be argued for.

**Nothing published moved.** No piece's truth standard, tier or pronouns; no byline, permalink, provenance label, issue or volume number. One door gained a requirement it should always have had, one door gained a value it should always have accepted, and one door learned to say that it does not know.
```

---

## Notes for the read

**1. It is a parent ruling, so the thing to check is the reach, not the cases.**
The three instances are already decided and are not reopened here. What is new is
that a *fourth* field of the same kind — some optional declaration a future door
collects — is now governed without a fresh argument. That is the whole point and
it is also the whole risk: if the editors think a future case might deserve its
own reasoning, the ratified text is where to narrow it, and the sentence to
change is the last one.

**2. It deliberately does not say what an editor may do.** The rule binds the
desk's machinery — parsers, defaults, intake code. An editor setting a truth
standard on a piece before publication is not the journal supplying a
declaration; it is an editor doing the job the flag exists to hand her, and the
record shows an editor did it. The ruling leaves that untouched, and it should be
read as unchanged rather than as unaddressed.

**3. The browser-versus-server caveat is in the ratified text at the editors'
instruction**, not in a note. It sits in the block above as its own paragraph so
that a later reader cannot cite the rule as a stronger guarantee than it is.

**4. One thing this raises and does not settle.** R-034 gave a name to who may
write a field, and this gives a name to who may write when nobody did. Both are
about authority over the record, and both are now cited by the same code paths.
Whether they should eventually be read as one doctrine — with R-018's placement
half alongside — is a tidying question for a later day, and deliberately not
attempted while three of the four are still fresh.

**5. `SCRATCH-R-TBD-TRUTH-STANDARD.md` is deleted by the same commit that adds
this file.** Its argument is preserved above rather than summarised: the
truth-standard paragraphs in the block are that draft's, carried over. Nothing of
it is lost, and it is removed rather than left beside this one because two
drafts proposing overlapping rulings is exactly the drift the append-only
doctrine exists to prevent — with the difference that neither has entered the
record yet, so a delete is honest here where an edit to `RULINGS.md` would not
be.
