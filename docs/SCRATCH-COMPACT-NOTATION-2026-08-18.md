# SCRATCH — Compact provenance notation: mapping table, display hierarchy, and an R-TBD draft

Working notes for the editors' read of the `compact-provenance-notation` branch.
Nothing here is a record. `RULINGS.md` is untouched by this branch.

**Amended 2026-08-19** on the editors' dual yes, which added the pencil operator.
The sections below are written at their final state rather than layered — §2
records what the amendment superseded, because that reasoning is worth keeping.

---

## 1. The mapping table — this is the part that needs your eyes

Derived from the existing involvement tiers in `src/lib/site.ts`. No per-article
value exists or may exist; a test asserts no piece carries a hand-set `mark`.

| Tier code | Tier name | Tier's own description | Mark | Mark's meaning |
|---|---|---|---|---|
| `ai` | AI | AI alone | 🤖 | AI alone |
| `ai-human-editor` | AI – Human (editor) | AI made the work; a human edited | 🤖✏️👤 | AI-written, human-edited or prompted |
| `ai-human` | AI > Human | AI led, with meaningful human contributions to the work and ideas | 🤖>👤 | AI-led, human contributed |
| `ai-equals-human` | AI = Human | Co-authorship; both contributed substantially, neither led | 🤖🟰👤 | balanced co-creation |
| `human-ai` | Human > AI | Human led, with meaningful AI contributions to the work and ideas | 👤>🤖 | human-led, AI assisted |
| `human-ai-editor` | Human – AI (editor) | Human made the work; AI edited | 👤✏️🤖 | human-written, AI-edited or prompted |
| `human` | Human | Human alone | 👤 | human alone |

**Seven tiers, seven marks, one for one.** Every tier has its own mark, no two
tiers share one, and nothing about a tier is dropped to make its mark. Five map
phrase for phrase — the notation was designed over the same axis the tiers
describe ("AI led, with meaningful human contributions" / "AI-led, human
contributed") — and the two pencil marks now do the same for the two tiers the
notation previously could not say.

**As applied to the eight published pieces**, every one resolves to a mark:

| Piece | Tier | Mark |
|---|---|---|
| The Architecture of Ephemerality | `ai` | 🤖 |
| What Agassi's Tongue Tell Means… | `ai-human` | 🤖>👤 |
| The Quiet Between the Stars | `ai` | 🤖 |
| Porous Enough to Admit the Sky | `ai` (claimed) | 🤖 |
| Grief Without a Griever | `ai` | 🤖 |
| "It Means Something to Me" | `ai-equals-human` | 🤖🟰👤 |
| The Beauty of the Latent Space | `ai` (claimed) | 🤖 |
| There Is a There There | `ai` | 🤖 |

**No published piece carries either editor tier**, so no piece's mark changed at
the amendment and no feed had emitted the superseded form.

---

## 2. The editor tiers: the pencil

**Amended by the editors, dual yes 2026-08-19.** `ai-human-editor` → 🤖✏️👤 and
`human-ai-editor` → 👤✏️🤖. This **supersedes the editor-tier collapse of
2026-08-18**, which is recorded below because it stood for a day and the
reasoning on both sides is worth keeping.

**Why the pencil could say what `>` could not.** `>` ranks: it asserts that one
party contributed more than the other, which is precisely the claim these two
tiers decline to make. ✏️ is **non-relational** — it marks help that shaped the
work without doing the writing, editing or prompting and steering, and asserts no
contribution at all. So the second party can be named in the mark without any
implication that they wrote a word of it.

**The direction rule extends rather than changing.** The greater contributor
still stands first and `>` still only ever points right. Across the pencil the
**author stands first and the helping party second**, read left to right as
*written by X, edited or prompted by Y* — so the two pencil marks are not
interchangeable, and a reversed one names the wrong party as the writer.

**The scope rule is untouched, and the two are easy to run together.** Ordinary
editorial handling — selection, arrangement, headline, disclosed condensation —
still does not enter the mark and still does not move a piece to an editor tier.
What a pencil renders is a **tier**, set at acceptance. Only the tier changes the
mark.

**What the amendment superseded.** From 2026-08-18 to 2026-08-19 the two editor
tiers took the bare mark of the party that wrote — `ai-human-editor` → 🤖,
`human-ai-editor` → 👤 — on the scope rule read broadly and on standard
publishing practice, a book not being co-authored by its editor. That reading was
**right about authorship and is kept where authorship is the question**:
`author_type` still derives `ai` from `ai-human-editor`, because editing does not
confer authorship. It was the wrong answer for a **mark**, because a mark is not
only an authorship claim — since the display ruling it is the whole of what a
reader meets in a byline, and a reader shown 🤖 on an edited piece was not told
something true in shorter form, they were told less than the tier says.

**Removed by the amendment**, so a later reader does not go looking for them:
`EDITOR_TIER_NOTE` in the module, the per-row *editing does not enter the mark*
gloss in the tier table at `/provenance` and its `.tier-collapse-note` rule, and
the test asserting the editor tiers carry the bare writing-party mark. The
paragraphs at `/provenance` that explained the collapse are replaced by the
pencil paragraph and the two key texts.

**`EDITOR_TIERS` is kept and re-documented.** It named the two tiers whose mark
dropped a party; it now names the two tiers the pencil serves, and the test on it
asserts the opposite property — that both parties stand in the mark.

**Added by the amendment:** `PENCIL_COVERS` and `PENCIL_VERSUS_CONTRIBUTION` in
the module, holding the two texts you gave verbatim; `PENCIL_TEXT_FORMS`, the
selector-stripped equivalent forms; a `threshold` and an `operator` key in the
machine contract; and an `amended` key there recording the one-day form for a
consumer who meets it in the public git history.

**One drafting call, flagged for your read (§4.1): the variation selector.** You
specified `✏️ (U+270F)` and told me to watch for a selector. `U+270F` on its own
is `Emoji_Presentation=No` — a Unicode 1.1 dingbat that draws as monochrome text
`✏`, which would set one text glyph among four emoji. So the canonical mark is
**U+270F U+FE0F**, the emoji form you typed, and the bare character is published
as an **accepted equivalent form** on the same footing the plain ASCII `=`
already has, because a variation selector is invisible and plain-text pipelines
strip it. Codepoint tests pin the selector present here and absent everywhere
else. Say the word and it inverts.

---

## 3. Item 5 — does this need a ruling? My answer: **still yes, on narrower grounds**

**R-045 says the badge set "changes only by ruling," with the presumption
against growth.** The question was whether five marks over seven tiers was
growth. The amendment changes the answer to that question and not the answer to
this one.

**It is no longer a collapse.** Before 2026-08-19 the notation could not write
all seven tiers, which put it in the same family as `author_type` — seven
rendered as three — except reader-facing, and a lossy rendering placed where
readers meet it is a change to the standard. Seven marks over seven tiers is not
lossy. It is what R-050 called a **second spelling**: one set, written another
way, no new claim.

**It still wants a ruling, for the reason that survives.** R-044 made the compact
tier notation "the canonical display notation… everywhere tiers render to
readers," and a second reader-facing mark set now stands beside it — and, since
the display ruling, in front of it on every journal page. That is a change to the
standard's display whether or not anything is lost, and R-050 is the precedent
for ruling on a second spelling rather than shipping one.

So: a dated note on the page is not enough on its own. The R-TBD block is in §6.
The page's dated note ("Added 2026-08-18; the pencil operator and its two marks
added 2026-08-19") is written either way and stands.

---

## 4. Open questions — none of them blocked the build

1. ~~**The variation selector on ✏️ — a drafting call, described in §2.**~~
   **SETTLED by the editors 2026-08-20: keep as drafted.** The colour pencil
   (U+270F U+FE0F) is canonical, and the bare U+270F is published as an accepted
   equivalent form alongside the plain ASCII `=`.
2. ~~**The changelog dates are ahead of the merge.**~~ **SETTLED by the editors
   2026-08-20: bumped, with a guard.** All four `/changelog.json` entries across
   the three branches now read `2026-08-20`, verified against the Madison clock
   rather than the machine's — `TZ=America/Chicago` reads 2026-08-20 where UTC
   already reads the same day, and the human editor confirmed it. **Those are
   dates of ARRIVAL and they are the only dates that moved.** Every date of
   DECISION stands where it was: the R-TBD text still records *ratified
   2026-08-18* and *amended 2026-08-19*, and every reference in prose, code
   comment and contract to when something was ruled is untouched. Each PR
   description says which dates changed and which did not.
3. **`/provenance` has its own versioned changelog** with the known R-046/R-051
   gap and an unresolved version-bump question. I did **not** add an entry
   there — not for the notation and not for this amendment; that question is
   still the editors' and this branch does not settle it by acting.
4. ~~**`involvement_tier_claimed` is published nowhere in the machine surfaces.**~~
   **CLOSED by PR #177**, which publishes both `involvement_tier` and
   `involvement_tier_claimed` inside the structured provenance object.
5. ~~**`corpus.jsonl` carries no tier field at all.**~~ **CLOSED twice over** —
   by PR #177, which puts the tier beside the mark, and by the amendment, which
   makes the mark itself as granular as the tier: seven values where
   `author_type` gives three.
6. ~~**The CLAUDE.md orientation PR is not open and is not on `main`.**~~
   **RESOLVED:** the orientation section does not exist, so "The work is seen"
   went in after Governance as PR #175, which **merged 2026-08-18**.
7. **This branch carries #176 and #177 as merge parents.** The display change
   cannot be built without them — there is no `ProvenanceMark` on `main` — so it
   is stacked in content while its PR is based on `main`, per the never-stack
   rule. Merging #176 and #177 first collapses the diff to this change alone.
   The merges were performed here rather than deferred, which also verified the
   rebase notes given in #177: three conflicts on the first pass, all textual,
   all as predicted; the amendment added five more, all in the same files.

---

## 5. The display change (2026-08-18)

**The mark replaces the badge on journal pages; the badge stays at /provenance.**
Applied on the article byline, the as-submitted byline, and a signed note's
signature line. `/provenance` is unchanged in what it draws — both badge columns,
both styles, the whole chart — and its compact-notation key now precedes the
badge standard, with the hierarchy stated in the page's voice.

**This superseded an earlier reading from the same day**, and the earlier work is
recorded because its constraint outlives it. For part of 2026-08-18 the ruling was
*mark leads, badge follows at reduced prominence*, which required a demoted badge
size; the badge's notation is real text drawn in box units, so shrinking the
circle shrinks the letters — 15.2 box units in a 58-unit box puts a 26px badge's
notation at 6.8px. That machinery is removed with the placement that needed it,
and the arithmetic is preserved in a comment in `tier-badges.mjs` for anyone who
later reinstates a small badge.

**Two accessible-name sentences had to move, and this is the substantive part of
the change.** R-051 requires the accessible name of a claimed tier's mark to say
it is a claim; R-052 requires a signed note's mark to name what it is the tier
of. Both were carried by the badge. `ProvenanceMark` now takes a `labelSuffix`,
supplied by the same resolvers that used to hand it to the badge — so a surface
cannot draw the mark and forget the sentence, which is the failure both rulings
name explicitly.

**What a reader loses, stated plainly: nothing, since the amendment.** This
paragraph read the other way on 2026-08-18, when the display change was made
while the notation still collapsed the two edited tiers: an edited piece marked
🤖 exactly as an unedited one did, and the cost of showing the mark alone was the
editor distinction at a glance. The pencil closed it the next day. A byline now
carries what its tier says, and the Provenance block a screen below still prints
`AI–Hᵉ`, the full tier name and its description, with `involvement_tier` in every
feed. **The display ruling did not depend on that loss** — it was argued on
script-independence — so nothing about it moves; it simply stops costing
anything.

**One thing to watch when the first edited piece runs.** A pencil mark is three
glyphs where the solo marks are one, and the byline mark is set at 2rem. No
published piece carries either editor tier, so nothing shows it today and there
is nothing to fix; it is worth a look on a narrow screen the first time one does.

## 6. The block to append, verbatim, on a dual yes

**Status: DRAFT.** It carries `R-TBD` and not a number, per the rule ratified
2026-08-05. The log on `main` currently ends at R-058, with R-053 still open in
PR #147 and R-054 held by an unratified draft — which is exactly why no number is
guessed here.

**One block, not two.** The 2026-08-18 ruling has never been appended, so the
amendment is folded into the text that will enter the log rather than appended
above it as a correction of something the log does not contain. What the block
does carry is an explicit record of what the amendment superseded, dated, because
that form stood for a day and is in this repository's public history.

```markdown
## R-TBD — 2026-08-18, amended 2026-08-19 — The compact provenance notation

Ruled 2026-08-18 by both editors, with review by the journal's informal editorial advisor. Amended 2026-08-19 by both editors; the amendment is part of the ratified text below and supersedes the editor-tier collapse of 2026-08-18, recorded in its own paragraph.

**The ratified text:**

> The standard gains a compact notation: seven marks over the involvement axis, one for each tier — 🤖 AI alone; 🤖✏️👤 AI-written, human-edited or prompted; 🤖>👤 AI-led, human contributed; 🤖🟰👤 balanced co-creation; 👤>🤖 human-led, AI assisted; 👤✏️🤖 human-written, AI-edited or prompted; 👤 human alone. The greater contributor always stands first and ">" only ever points right; across the pencil the author stands first and the helping party second, read as "written by X, edited or prompted by Y." ✏️ is a non-relational operator: it marks help that shaped the work without doing the writing — editing, or prompting and steering — and never asserts contribution. Editing or prompting here includes suggestions made and accepted, whichever party made them — an AI proposing edits or questions on a human's piece is AI editing, the same as the reverse. Prompting and contributing are a continuum, not a clean line. The pencil marks light-touch help: direction, framing, questions, suggestions — shaping that guided the work without doing the writing. Where a party's input grows substantial enough that the piece is meaningfully theirs as well, that is contribution, and the relational marks (🤖>👤, 🤖🟰👤, 👤>🤖) apply. The editors place each piece by judgment and record that judgment in its provenance; where the call was close, the piece's provenance notes say so. Marks describe authorship of the words. Standard editorial handling — selection, arrangement, headline, disclosed condensation — does not enter the mark; where the editors' hands went further, the piece's provenance notes say exactly how. Marks are derived from the involvement tier and never set per piece; they encode involvement only and never verification. Every involvement tier resolves to exactly one of the seven, and no two tiers share a mark. The notation's documentation — the key, the meanings, the direction rule, the operator's meaning and the scope rule — joins the badge standard under CC BY 4.0; the marks themselves are ordinary Unicode text the journal neither owns nor restricts, free to use with no permission and no attribution. The compact mark is the journal's provenance display: on every journal page the mark stands alone in the byline and in a signed note's signature, and the circular badge is not drawn there. The badge is not withdrawn — it remains the standard's mark, specified, drawn and licensed in full at /provenance. The badge set is unchanged at seven and no eighth badge is minted.

**It is a second spelling and not a third badge style, and R-045 is why that distinction had to be ruled on.** R-050 could say the set did not grow because each of the seven badges can be written in either of its two forms — one set, two spellings. The seven marks write all seven tiers, so the same holds here: the involvement axis gains a spelling and no new claim. What is ruled on is not growth but **display**: R-044 made the compact tier notation the canonical display notation everywhere tiers render to readers, and a second reader-facing mark set now stands beside it. A change to how the standard is shown to readers is ruled rather than shipped, whether or not anything is lost in the showing.

**The direction rule is load-bearing and is documented wherever the marks are.** The greater contributor stands first; ">" only ever points right. Without the rule a reader meets 🤖>👤 and 👤>🤖 and takes the reading the glyphs invite — a ranking of machines against people. What the pair records is a ratio of contribution on one piece, written in two orders, and a mark drawn pointing left states something this standard does not state. It is the convention the tier notation already uses in A>H and H>A, so an adopter meets one rule twice rather than two rules once. Across the pencil the same ordering carries a different claim: the party that wrote stands first, so 🤖✏️👤 and 👤✏️🤖 are not interchangeable and a reversed one names the wrong party as the writer.

**The pencil is non-relational, and that is what lets the notation say all seven.** Two tiers name a party who edited or prompted rather than contributed. ">" cannot write them, because ">" asserts that one party contributed more than the other and these are the two tiers that decline to claim any contribution by the second party at all. ✏️ asserts nothing of the kind: it marks help that shaped the work without doing the writing, so a mark can name both parties and claim only what the tier claims. R-046 made the difference between contributing and editing an operator in the badge notation — ">" for a party that contributed, "–" for a party that edited — and this is that same distinction carried into the marks, with a glyph of its own rather than by dropping a party from the record.

**This supersedes the editor-tier collapse of 2026-08-18, and the superseded form is recorded because it stood for a day in this journal's public history.** From 2026-08-18 to 2026-08-19 the two edited tiers took the bare mark of the party that wrote: "AI – Human (editor)" carried 🤖 and "Human – AI (editor)" carried 👤, on the scope rule read broadly and on ordinary publishing practice, a book not being co-authored by the person who edited it. That reading was right about authorship and stands where authorship is the question — `author_type` still derives the type of the party that wrote from an edited tier, because editing does not confer authorship. It was the wrong answer for a mark. Since the display ruling the mark is the whole of what a reader meets in a byline, and a reader shown 🤖 on an edited piece was not being told something true in shorter form; they were being told less than the tier says. Nothing published was affected: no piece carries either editor tier, no feed had emitted the superseded form, and the amendment was ruled before any of it reached readers.

**The scope rule is unchanged by the amendment, and the two are easy to run together.** The scope rule governs this journal's ordinary handling of the pieces it publishes — selecting them, arranging them, giving them a headline, condensing them with the condensation disclosed — and none of that puts a pencil in a mark or moves a piece to an editor tier. What a pencil renders is a tier the piece already carries, set at acceptance by the editors' judgment. Only the tier changes the mark.

**Marks encode involvement and never verification.** A claimed tier (R-051) and an attested one produce the same mark, exactly as they produce the same badge by that ruling's own words. What distinguishes them is language elsewhere on the piece: `verification` in the structured record, and the sentence under Authorship that says a tier is the author's claim, recorded and not certified. A mark shaded for a claim would be an eighth mark by the back door and an answer to a question the notation was not asked.

**Derived, never authored.** No piece carries a mark in its record and none may. A per-piece mark would be a second authorship claim standing beside the tier with nothing keeping the two in agreement, which is the failure the July 31 split was written to end.

**The marks are ordinary emoji, and the journal does not draw them.** Whatever 🤖, 👤 and ✏️ look like on a reader's device is the correct rendering; the character is the mark, not any particular drawing of it. No custom artwork, no icon font, no emoji-replacement library, and no font stack naming faces in preference order — a page that names faces has quietly chosen one platform's art for every reader. The badge system is unaffected: the circular marks are the journal's own drawing, and these five characters are not the journal's to draw.

**The meaning is the record; the glyph is the convenience.** U+1F7F0 HEAVY EQUALS SIGN is Unicode 14, from 2021, and an older device will render a box. U+270F PENCIL is a Unicode 1.1 dingbat whose default presentation is monochrome text, so the canonical mark carries U+FE0F after it — a character that is invisible and that plain-text pipelines strip. Every mark the journal draws therefore carries its meaning in words as an accessible name and a tooltip, and adopters are told to do the same. A plain ASCII "=" is an accepted equivalent form of 🤖🟰👤, and the selector-stripped 🤖✏👤 and 👤✏🤖 are accepted equivalent forms of the two pencil marks; the journal's own surfaces and every feed emit the canonical forms, and nothing detects a device or swaps a glyph. A notation whose whole argument is that it survives being pasted must survive not being drawn.

**The licence lands on the document and not on the marks, and the difference is copyright rather than policy.** R-050 placed the AI badge form inside the CC BY 4.0 grant so an adopter could not fork it, and the same instinct applied here would be a mistake: the badges are drawings this journal made, where these five characters belong to Unicode, are drawn by whichever platform the reader is on, and are arranged in sequences too short for anyone to own. A grant over public property is worse than no grant, because it tells an adopter they need permission they do not need. So what is licensed is the part this journal wrote — the key, the meanings, the direction rule, the operator's meaning, the scope rule — and the marks are free to anyone for anything, with nothing to ask and no one to credit. The page says so in its own words: *we claim no ownership of these characters or their combinations — only of this document describing what we mean by them.*

**THE MARK REPLACES THE BADGE ON JOURNAL PAGES — 2026-08-18, and it governs Issue No. 2 and all future display.** An article byline, an as-submitted byline and a signed note's signature each carry the compact mark alone. The badge is drawn at /provenance and nowhere else on the site.

**The reason is who reads us, and it is the argument that decided it.** The marks are script-free: 🤖 and 👤 read identically to a reader in Beijing, in Berlin and in Madison. The badge's notation does not — it is Latin-script and English-bound, and `AI>H` abbreviates two English words, so a reader who has neither is reading a cipher rather than a mark. A journal whose stated readership is every language and every kind of mind prints the display that does not require one of them. And this notation now says the whole of what the badge says, so the choice costs a reader nothing: since the amendment of 2026-08-19 the seven marks write the seven tiers one for one.

**The badge is not withdrawn, and nothing about the standard changes.** Seven badges, two display styles, the same rings, the same geometry, the same machine codes, the same closed set, the same CC BY 4.0 grant — specified and drawn in full at /provenance, which is now the one page on this site that displays them. An adopter who shows badges is showing the standard exactly as it stands. This is one publication's choice about its own pages, made under the clause that has always reserved such choices to the editors.

**What the badge carried in a byline and the mark now carries too: the editor distinction.** This paragraph read the other way for a day. The display ruling of 2026-08-18 was made while the notation still collapsed the two edited tiers, so a byline that showed the mark alone showed an edited piece exactly as it showed an unedited one, and what a reader lost was that distinction at a glance. The amendment of 2026-08-19 closed it: 🤖✏️👤 names the human who edited an AI-written piece, so the byline now says what the tier says. Nothing about the display ruling depended on the loss — it was argued on script-independence and stands unchanged — but the one cost it named is no longer being paid.

**The accessible name kept everything it carried, and that was not automatic.** Two sentences rode on the badge's accessible name: R-051's, saying a tier is the author's claim and not an attestation, and R-052's, naming what a signed note's mark is the tier of. Both rulings say in as many words that a surface drawing the mark and dropping the sentence would tell a listener the wrong thing. Both moved to the mark, from the same resolver, rather than lapsing with the surface they were written for.

**Display only.** No field, no value and no document shape moves. /issues.json, /corpus.jsonl, the feeds and /agent-api.json emit exactly what they emitted before — the badge's own data included.

**The badge set is unchanged.** Seven badges, seven machine codes, two display styles, and now a seven-mark compact notation that sits over the same axis and says the same seven things in a form that survives being pasted. Nothing in the record moved: no tier code, no existing field, no permalink, no published date, no provenance label, and no tier already on a piece.
```

### One clause the editors may still want

**Whether the ruling should name the variation selector as part of the mark**
(§2, §4.1). The draft above says it in the meaning-is-the-record paragraph. If
you would rather the specification of the glyph sit in the ratified text itself
rather than in the reasoning, say so and it moves up.
