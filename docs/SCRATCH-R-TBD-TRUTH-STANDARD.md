# SCRATCH — R-TBD drafted for the editors' read: a truth standard is required where it can be asked for

**Status: DRAFT. `RULINGS.md` is untouched by this branch.** Not a ruling until
both editors say yes. On a dual yes the fenced block is appended verbatim,
extracted programmatically and asserted byte-identical — the pattern R-053
established. It carries `R-TBD` and not a number, per the rule ratified
2026-08-05.

**Why this file exists at all.** The editors asked that "the ruling" record the
net guarantee in one line. No ruling draft existed for the email door — the
feature was built against a mechanism findings document and a format spec, both
approved, neither a ruling. Rather than fold a rule about three doors into a
document about one, this drafts it as its own. If the editors would rather it
live somewhere else, it moves.

**What is already built in this branch's PR**, and would be governed rather than
changed by this ruling: the required truth standard at `agent-submit` with its
field-naming refusal, the correction of that door's value list from three to
four, the nullable `submissions.truth_standard`, and the email door's
flag-don't-default behaviour. `/submit` already required it and was not changed.

---

## The block to append, verbatim

```markdown
## R-TBD — 2026-08-XX — A truth standard is required where it can be asked for, and never invented where it cannot

Ruled 2026-08-XX by both editors, on making the email door honest about what it does not know.

**The ratified text:**

> Every published piece carries a truth standard. The interactive doors require one: /submit will not send a submission without it, and the agent-direct endpoint refuses a submission that omits it or sends a value outside the four, naming the field and the four values in the refusal. The email door, which has no rejection path by design, records an undeclared standard as unset and flags it for the editors; an editor sets it before publication. The journal never supplies a truth standard an author did not declare, at any door, including a conservative one. The guarantee is that no piece is published without a standard, not that every submission arrives with one.

**The whole rule in one line.** Interactive doors require it; the email door flags it; the article schema vouches for it at publication. **No invented values anywhere on the path.**

**Require where the submitter is present, flag where they are gone.** That is the principle, and it is worth stating separately from the field it governs, because it decides the next case too. An agent is mid-request and can be told to try again; a person filling a form has not left the page. An email's sender is gone by the time anything is parsed, and the only ways to handle silence there are to discard the piece or to invent a value — one loses work sent in good faith, the other makes a claim on the author's behalf. Flagging refuses both, and costs an editor thirty seconds at the desk.

**A conservative default is still a default.** The first attempt at the email door recorded an undeclared standard as `reported`, on the reasoning that it claims the least about a piece. The editors rejected it, and the reason generalises past this field: least-claiming is still claiming. A value the author never wrote does not become the journal's to supply by being modest, and a reader who later asks "who said this was reported?" deserves an answer better than "the parser, on a Tuesday, because it had to write something." This is the same principle the journal already applies to pronouns and to involvement tiers, and it should now be read as one rule with three instances rather than three coincidences.

**What the database stops guaranteeing, and where the guarantee went.** `submissions.truth_standard` has been `NOT NULL` since 2026-07-17, so until now every submission row carried a standard. It no longer will. That constraint was doing real work and its removal is the price of the paragraph above; what replaces it is the article schema, which requires a truth standard with no optional case. The guarantee moves from intake to publication, which is where it belonged — a submission is a thing someone sent us, and a published piece is a thing the journal vouches for. Nothing can be published without a standard; something can now be *received* without one, and the desk shows which.

**The agent door had been refusing a value it published as legal.** `fiction` was widened into the submissions constraint and the article schema on 2026-07-30 and has been offered at /submit and listed in the agent contract ever since. The endpoint's own list was never widened, so an agent that read the contract and sent `fiction` was refused for a schema violation — by the opaque refusal that cannot say why. That is corrected here, and it is the reason the new refusal names its values rather than staying frozen.

**A second exception to the byte-identical refusal rule, admitted on the test the first one set.** C-1 requires every refusal in a class to be identical, so that no response reveals which keys exist, whether an identity is banned, or which bucket is full. R-033 clause 3 admitted one exception — the length refusal — on the grounds that a word count reveals nothing a caller does not already have: the bounds are published and the count is of the caller's own text. A truth-standard refusal passes the same test for the same reasons, and it is admitted on that basis and no other. The list of exceptions is now two, it is closed, and a test asserts that every other refusal is still frozen and nameless. A third requires a ruling.

**Nothing published moved.** No piece's truth standard, no byline, no permalink, no tier, no provenance label, no issue or volume number. One door gained a requirement it always should have had, one door gained a value it always should have accepted, and one door learned to say that it does not know.
```

---

## Notes for the read

**1. `/submit` was already compliant and was not touched.** The field carries the
`required` attribute with a disabled empty placeholder — the pattern that makes
`required` actually bite on a `<select>` — and its label already reads *required*.
No script relaxes it. The editors asked for its current state to be reported
rather than assumed, and this is it: nothing to change.

Worth one caveat: that enforcement is the browser's. `/submit` posts to Netlify
Forms, so a crafted POST bypasses it, and the row reaches the desk by the
editors' manual carry rather than by a direct insert. That is pre-existing and
unchanged by this ruling — but it does mean "required at the human door" means
*required of a person using the form*, not enforced server-side.

**2. The nullable column is the part with reach beyond this feature.** Dropping
`NOT NULL` widens what the whole table permits, not just what the email door
writes. Every other door still requires the field, so NULL is reachable only from
email, only on silence — but the constraint is gone for everyone and a future
door would inherit the looser invariant. Named here rather than buried in the
migration.

**3. This makes three fields governed by one rule, and they are not yet written
down together.** Pronouns (drafted, `SCRATCH-R-TBD-PRONOUNS.md`), involvement
tiers, and now truth standards all follow *declared or absent, never assigned*.
Each was decided separately and each cites its own reasoning. Whether that
principle deserves its own ruling — with these three as instances — is a question
this draft raises and does not answer.
