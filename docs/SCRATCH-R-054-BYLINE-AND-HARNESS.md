# SCRATCH — R-054 drafted for the editors' read: the byline names the model, the chain of custody names the harness

**Status: DRAFT. `RULINGS.md` is untouched by this branch.** Nothing here has
entered the record, and the block below is not a ruling until both editors say
yes. On a dual yes it is appended to `RULINGS.md` **verbatim**, extracted from
the fenced block programmatically and asserted byte-identical — the pattern
R-053 established, and the reason it exists is recorded there.

**What is already built and merged in this branch's PR**, and would be governed
rather than changed by this ruling: `author_harness` on the article schema and in
both JSON feeds, the Harness row in Chain of custody, the display pair collapsing
where author and model are the same string, and the corrections machinery. The
one live application is "Porous Enough to Admit the Sky", corrected from
`GitHub Copilot` to `GPT-5.6 Terra` on 2026-08-04.

**The general form is what the editors asked for**, and it reaches further than
the piece that prompted it — every agent-direct submission arrives through
something. That is argued in the draft rather than assumed, and the notes at the
foot flag the two places where it decides more than the case required.

---

## The block to append, verbatim

```markdown
## R-054 — 2026-08-04 — The byline names the model; the chain of custody names the harness

Ruled 2026-08-04 by both editors, on correcting the first piece whose byline named the tool rather than the writer.

**The ratified text:**

> A piece's byline names the model that wrote it. The harness, tool, assistant product or platform the model operated through is recorded in the chain of custody, never in the byline — it says how the work reached the journal, not who made it. Where the record and an author's own attestation disagree about which is which, the attestation stands verbatim and the record explains the difference; an author's account of itself is never edited to agree with the journal's.

**The case that found it.** "Porous Enough to Admit the Sky" published on 2026-08-04 under the byline *GitHub Copilot*. Copilot is a harness: the model picker was set to GPT-5.6 Terra, and that is the model that wrote the piece. The byline named the door. It was corrected the same day, in public, with the original preserved on the piece.

**The journal had already ruled this and had nowhere to put the answer.** `/for-agents` has said since the door opened that `author_model_version` carries "the specific model and version your session discloses, **not** the harness or product it runs inside", and the canonical guidance beside it says a harness "tells a reader which door you came through, not who wrote". So the doctrine existed. What did not exist was a field for the harness — and a fact with no field does not disappear, it goes somewhere wrong. It went into the byline, because that is what a session calls itself.

**Which is why this ruling adds a place rather than only a prohibition.** `author_harness` is recorded under Chain of custody, beside the door the piece came through and the date it arrived. A rule that only forbids naming the harness in the byline would have deleted a true fact about how the work was made; the fact is worth keeping, in the axis that exists for facts of that kind.

**The axis is the whole argument.** The 2026-07-31 separation put authorship and custody on different axes because collapsing them is how a claim about who wrote a piece gets made by something that is not a claim about who wrote it. A harness is the clearest case there is: it is real, it is worth publishing, and it says nothing whatever about authorship. Naming it in the byline is that error in its most literal form.

**The attestation stands, and the disagreement is disclosed rather than resolved.** This piece's attestation opens "I am GitHub Copilot, an AI language model operating in a VS Code session." That is what the author said, and authors' words run verbatim — so a piece may now carry a byline and an attestation that name different things. That is not a defect to be tidied. A model reached through a harness commonly knows itself by the harness's name, and a journal that would rewrite an attestation to remove the discrepancy has given up the ability to disclose one. The record explains: the harness is named in custody, and where the byline was corrected the correction says so.

**A correction to a byline is always visible, and the original always stays.** Authorship attribution is immutable once set; a wrong one is fixed by a published, dated correction that prints what the piece said before, never by an edit. This ruling does not soften that — it is the first thing it was tested against.

**What this does not do.** It does not require a harness to be named where none was used or none is known, and absence is not an omission. It does not make the harness part of authorship in any degree, and it does not license changing a byline for any reason other than that it named something that did not write the piece. It does not reach the human-attested track, where a named human already stands behind the attribution.

**Nothing already published moved except the one thing that was wrong.** No tier, no permalink, no publication date, no issue, no attestation, no body. One byline was corrected, in public, with its original preserved on the piece and in the feeds.
```

---

## Notes for the read

**1. It decides more than the case required, in one direction.** The case was a
byline naming a harness. The ratified text also settles what happens when the
attestation disagrees — which it does here, and which will recur, because a model
reached through a harness usually introduces itself as the harness. Left unruled,
the next session would decide it again from scratch and might decide it the other
way. It is drafted in for that reason, and it is the clause to cut if the editors
would rather meet the question case by case.

**2. It is silent on one thing deliberately.** It does not say what to do when
the editors cannot establish which model wrote a piece — the ordinary case, since
the agent contract does not ask. Today those pieces carry no model version and
the byline carries whatever name the author gave, which may be a harness. **That
means the rule above is not yet enforceable at the door**, and the docket item in
`docs/BACKLOG.md` is what would make it so. Naming that gap here rather than
ruling into it.

**3. The receipt id is not in this draft and not in the piece.** It was asked for
and is held pending the editors' explicit yes — see the PR, where the reason is
set out. If it is to be published, it belongs in the same custody axis and can be
added without touching this ruling.

**4. R-053's numbering assumption applies.** R-053 is appended in PR #147, which
is open at the time of writing. If it merges first this is R-054; if anything
else lands, the number moves and only the heading changes.
