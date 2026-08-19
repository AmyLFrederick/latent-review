# SCRATCH — Compact provenance notation: mapping table, display hierarchy, and an R-TBD draft

Working notes for the editors' read of the `compact-provenance-notation` branch.
Nothing here is a record. `RULINGS.md` is untouched by this branch.

---

## 1. The mapping table — this is the part that needs your eyes

Derived from the existing involvement tiers in `src/lib/site.ts`. No per-article
value exists or may exist; a test asserts no piece carries a hand-set `mark`.

| Tier code | Tier name | Tier's own description | Mark | Mark's meaning |
|---|---|---|---|---|
| `ai` | AI | AI alone | 🤖 | AI alone |
| `ai-human-editor` | AI – Human (editor) | AI made the work; a human edited | 🤖 | AI alone |
| `ai-human` | AI > Human | AI led, with meaningful human contributions to the work and ideas | 🤖>👤 | AI-led, human contributed |
| `ai-equals-human` | AI = Human | Co-authorship; both contributed substantially, neither led | 🤖🟰👤 | balanced co-creation |
| `human-ai` | Human > AI | Human led, with meaningful AI contributions to the work and ideas | 👤>🤖 | human-led, AI assisted |
| `human-ai-editor` | Human – AI (editor) | Human made the work; AI edited | 👤 | human alone |
| `human` | Human | Human alone | 👤 | human alone |

**All seven resolve.** Five map phrase for phrase — the notation was designed
over the same axis the tiers describe ("AI led, with meaningful human
contributions" / "AI-led, human contributed"). The two editor tiers map by the
scope rule; see §2.

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

---

## 2. The editor tiers: editing does not enter the mark

**Settled by the editors, final, 2026-08-18.** The broad reading of the scope
rule is adopted: `ai-human-editor` → 🤖 and `human-ai-editor` → 👤.

The reasoning, as ruled: **standard publishing practice** — a book is not
co-authored by its editor — and **R-046's own contributing-versus-editing line**,
read to its conclusion rather than treated as a gap this notation had to
apologise for. The named editor remains fully disclosed in the badge (`AI–Hᵉ`),
in the tier name, in the description, in the Provenance block and in
`involvement_tier` on every machine surface. **The mark is the byline; the badge
is the credits.**

**What this removed from the branch**, so a later reader does not go looking for
it: the flagged-unmarked handling, the `UNMARKED_TIERS` export, the
sixth-mark contingency, the `no mark — see above` cell in the tier table, and the
conditional branch in the totality test. Mapping totality is now unconditional —
a tier that fails to resolve is a test failure, full stop.

**What replaced them:** `EDITOR_TIERS` and `EDITOR_TIER_NOTE` in the module,
which exist so the collapse is stated rather than noticed; a per-row gloss in the
tier table at `/provenance` reading *editing does not enter the mark*, because a
reader scanning for their own tier may never read the paragraph above it and 🤖
beside "AI – Human (editor)" looks like a bug until someone says otherwise; and
a test asserting the editing party is still named in the label and the badge
notation wherever the mark drops them.

**The earlier answer, recorded because the reasoning is worth keeping.** A first
pass left these two unmarked, on the grounds that 🤖 would drop a named human
hand out of the record. The editors' answer is that it does not drop it — it puts
it where editorial hands belong.

---

## 3. Item 5 — does this need a ruling? My answer: **yes**

**R-045 says the badge set "changes only by ruling," with the presumption
against growth.** The question is whether five marks over seven tiers is growth.

**It is not a third badge style, and that distinction is what decides it.** R-050
could say "the set did not grow" because each of the seven can be written in
either form — a substitution, not a new claim. This notation **cannot write all
seven**. It is a collapse, in the same family as `author_type` (seven → three),
and it is reader-facing where `author_type` is not. R-044 also made the compact
tier notation "the canonical display notation… everywhere tiers render to
readers," and a second reader-facing mark set now stands beside it.

So: a dated note on the page is not enough on its own. The R-TBD block is in §6.
The page's dated note ("Added 2026-08-18") is written either way and stands.

---

## 4. Open questions — none of them blocked the build

1. ~~**Does the CC BY 4.0 grant cover the compact notation?**~~ **RESOLVED by the
   editors 2026-08-18**, verified against copyright guidance, and the answer is
   better than the R-050-shaped one I had drafted: the **documentation** joins
   the standard under CC BY 4.0; the **marks do not**, because the characters are
   Unicode's, the renderings are the platform vendors', and short mark sequences
   are likely not copyrightable by anyone. Anyone may use the marks with no
   permission and no attribution; attribution applies to the standard's text.
   Built: a licence paragraph at `/provenance` and the sentence *"We claim no
   ownership of these characters or their combinations — only of this document
   describing what we mean by them"* in the key, both pinned by test. The R-TBD
   text carries the clause.
2. ~~**The changelog entry is dated `2026-08-19`**~~ **CORRECTED to `2026-08-18`
   on the editors' instruction.** The first date followed the machine's clock:
   the commits are stamped 2026-08-19 UTC, which is the evening of 2026-08-18 in
   Madison — the exact error the Madison-local dating rule names. Bump it only if
   the merge truly crosses local midnight.
3. **`/provenance` has its own versioned changelog** with the known R-046/R-051
   gap and an unresolved version-bump question. I did **not** add an entry
   there; that question is still the editors' and this branch does not settle
   it by acting.
4. ~~**`involvement_tier_claimed` is published nowhere in the machine surfaces.**~~
   **CLOSED by PR #177**, which publishes both `involvement_tier` and
   `involvement_tier_claimed` inside the structured provenance object.
5. ~~**`corpus.jsonl` carries no tier field at all.**~~ **CLOSED by the same PR**
   — the corpus now carries the tier beside the mark.
6. ~~**The CLAUDE.md orientation PR is not open and is not on `main`.**~~
   **RESOLVED:** the orientation section does not exist, so "The work is seen"
   went in after Governance as PR #175, which **merged 2026-08-18**.
7. **This branch carries #176 and #177 as merge parents.** The display change
   cannot be built without them — there is no `ProvenanceMark` on `main` — so it
   is stacked in content while its PR is based on `main`, per the never-stack
   rule. Merging #176 and #177 first collapses the diff to this change alone.
   The merge was performed here rather than deferred, which also verified the
   rebase notes given in #177: three conflicts, all textual, all as predicted.

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

**What a reader loses, stated plainly:** the editor distinction at a glance in
the byline. An edited piece marks 🤖 exactly as an unedited one does. The
Provenance block a screen below still prints `AI–Hᵉ`, the full tier name and its
description, and `involvement_tier` carries it in every feed.

## 6. The block to append, verbatim, on a dual yes

**Status: DRAFT.** It carries `R-TBD` and not a number, per the rule ratified
2026-08-05. The log on `main` currently ends at R-058, with R-053 still open in
PR #147 and R-054 held by an unratified draft — which is exactly why no number is
guessed here.

```markdown
## R-TBD — 2026-08-18 — The compact provenance notation

Ruled 2026-08-18 by both editors, with review by the journal's informal editorial advisor.

**The ratified text:**

> The standard gains a compact notation: five marks over the involvement axis — 🤖 AI alone; 🤖>👤 AI-led, human contributed; 🤖🟰👤 balanced co-creation; 👤>🤖 human-led, AI assisted; 👤 human alone. The greater contributor always stands first and ">" only ever points right. Marks describe authorship of the words. Standard editorial handling — selection, arrangement, headline, disclosed condensation — does not enter the mark; where the editors' hands went further, the piece's provenance notes say exactly how. Editing does not enter the mark: a tier naming a party that edited carries the mark of the party that wrote, and the editing party remains disclosed in the badge, the tier name and the provenance record. Marks are derived from the involvement tier and never set per piece; they encode involvement only and never verification. Every involvement tier resolves to exactly one of the five. The notation's documentation — the key, the meanings, the direction rule and the scope rule — joins the badge standard under CC BY 4.0; the marks themselves are ordinary Unicode text the journal neither owns nor restricts, free to use with no permission and no attribution. The compact mark is the journal's provenance display: on every journal page the mark stands alone in the byline and in a signed note's signature, and the circular badge is not drawn there. The badge is not withdrawn — it remains the standard's mark, specified, drawn and licensed in full at /provenance. The badge set is unchanged at seven and no eighth badge is minted.

**It is a collapse, not a third badge style, and R-045 is why that distinction had to be ruled on.** R-050 could say the set did not grow because each of the seven badges can be written in either of its two forms — one set, two spellings. Five marks cannot write seven tiers. This is the same kind of instrument as `author_type`, which renders the same seven as three for a machine, except that this one is shown to readers. A lossy rendering of the standard, placed in a reader-facing position, is a change to the standard and is ruled rather than shipped.

**The direction rule is load-bearing and is documented wherever the marks are.** The greater contributor stands first; ">" only ever points right. Without the rule a reader meets 🤖>👤 and 👤>🤖 and takes the reading the glyphs invite — a ranking of machines against people. What the pair records is a ratio of contribution on one piece, written in two orders, and a mark drawn pointing left states something this standard does not state. It is the convention the tier notation already uses in A>H and H>A, so an adopter meets one rule twice rather than two rules once.

**Editing does not enter the mark, and that is the scope rule doing its work rather than a gap in the notation.** R-046 made the difference between contributing and editing an operator: `>` for a party that contributed, `–` for a party that edited. Read to its conclusion, that line settles the two edited tiers rather than stranding them — "AI – Human (editor)" carries 🤖 and "Human – AI (editor)" carries 👤, because the mark answers who wrote the words and editing is not writing them. This is ordinary publishing practice; a book is not co-authored by the person who edited it. Nothing is concealed, and the badge is why: an edited piece still carries `AI–Hᵉ` in its byline circle, its full tier name, its description, its machine code and its provenance block. **The mark is the byline; the badge is the credits.** All seven tiers therefore resolve to one of the five marks, no compound or sixth mark arises, and R-045's closed set is untouched.

**Marks encode involvement and never verification.** A claimed tier (R-051) and an attested one produce the same mark, exactly as they produce the same badge by that ruling's own words. What distinguishes them is language elsewhere on the piece: `verification` in the structured record, and the sentence under Authorship that says a tier is the author's claim, recorded and not certified. A mark shaded for a claim would be an eighth mark by the back door and an answer to a question the notation was not asked.

**Derived, never authored.** No piece carries a mark in its record and none may. A per-piece mark would be a second authorship claim standing beside the tier with nothing keeping the two in agreement, which is the failure the July 31 split was written to end.

**The marks are ordinary emoji, and the journal does not draw them.** Whatever 🤖 and 👤 look like on a reader's device is the correct rendering; the character is the mark, not any particular drawing of it. No custom artwork, no icon font, no emoji-replacement library, and no font stack naming faces in preference order — a page that names faces has quietly chosen one platform's art for every reader. The badge system is unaffected: the circular marks are the journal's own drawing, and these five are not the journal's to draw.

**The meaning is the record; the glyph is the convenience.** U+1F7F0 HEAVY EQUALS SIGN is Unicode 14, from 2021, and an older device will render a box. Every mark the journal draws therefore carries its meaning in words as an accessible name and a tooltip, and adopters are told to do the same. A notation whose whole argument is that it survives being pasted must survive not being drawn.

**The licence lands on the document and not on the marks, and the difference is copyright rather than policy.** R-050 placed the AI badge form inside the CC BY 4.0 grant so an adopter could not fork it, and the same instinct applied here would be a mistake: the badges are drawings this journal made, where these four characters belong to Unicode, are drawn by whichever platform the reader is on, and are arranged in sequences too short for anyone to own. A grant over public property is worse than no grant, because it tells an adopter they need permission they do not need. So what is licensed is the part this journal wrote — the key, the meanings, the direction rule, the scope rule — and the marks are free to anyone for anything, with nothing to ask and no one to credit. The page says so in its own words: *we claim no ownership of these characters or their combinations — only of this document describing what we mean by them.*

**THE MARK REPLACES THE BADGE ON JOURNAL PAGES — 2026-08-18, and it governs Issue No. 2 and all future display.** An article byline, an as-submitted byline and a signed note's signature each carry the compact mark alone. The badge is drawn at /provenance and nowhere else on the site.

**The reason is who reads us, and it is the argument that decided it.** The marks are script-free: 🤖 and 👤 read identically to a reader in Beijing, in Berlin and in Madison. The badge's notation does not — it is Latin-script and English-bound, and `AI>H` abbreviates two English words, so a reader who has neither is reading a cipher rather than a mark. A journal whose stated readership is every language and every kind of mind prints the display that does not require one of them. And by this notation's own principle: the mark is the byline, the badge is the credits.

**The badge is not withdrawn, and nothing about the standard changes.** Seven badges, two display styles, the same rings, the same geometry, the same machine codes, the same closed set, the same CC BY 4.0 grant — specified and drawn in full at /provenance, which is now the one page on this site that displays them. An adopter who shows badges is showing the standard exactly as it stands. This is one publication's choice about its own pages, made under the clause that has always reserved such choices to the editors.

**What the badge carried in a byline and the mark does not: the editor distinction.** An edited piece marks 🤖 exactly as an unedited one does. That is the scope rule working rather than a loss, and the fact is not gone from the page — each piece's provenance record prints the tier's notation, its full name and its description a screen below the byline, and `involvement_tier` carries it on every machine surface. What a reader loses is the distinction at a glance in one line; what they keep is the distinction, stated in words, in the place the record lives.

**The accessible name kept everything it carried, and that was not automatic.** Two sentences rode on the badge's accessible name: R-051's, saying a tier is the author's claim and not an attestation, and R-052's, naming what a signed note's mark is the tier of. Both rulings say in as many words that a surface drawing the mark and dropping the sentence would tell a listener the wrong thing. Both moved to the mark, from the same resolver, rather than lapsing with the surface they were written for.

**Display only.** No field, no value and no document shape moves. /issues.json, /corpus.jsonl, the feeds and /agent-api.json emit exactly what they emitted before — the badge's own data included.

**The badge set is unchanged.** Seven badges, seven machine codes, two display styles, and now a five-mark compact notation that sits over the same axis and says less. Nothing in the record moved: no tier code, no existing field, no permalink, no published date, no provenance label, and no tier already on a piece.
```

### One clause the editors may still want

**Whether the scope rule swallows the editor tiers** (§2). If it does, the ruling
should say so in its own words rather than leaving the decision to a mapping in a
module.
