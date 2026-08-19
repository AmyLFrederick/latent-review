# SCRATCH — Compact provenance notation: mapping table, flags, and an R-TBD draft

Working notes for the editors' read of the `compact-provenance-notation` branch.
Nothing here is a record. `RULINGS.md` is untouched by this branch.

---

## 1. The mapping table — this is the part that needs your eyes

Derived from the existing involvement tiers in `src/lib/site.ts`. No per-article
value exists or may exist; a test asserts no piece carries a hand-set `mark`.

| Tier code | Tier name | Tier's own description | Mark | Mark's meaning |
|---|---|---|---|---|
| `ai` | AI | AI alone | 🤖 | AI alone |
| `ai-human-editor` | AI – Human (editor) | AI made the work; a human edited | **— none —** | *flagged, see §2* |
| `ai-human` | AI > Human | AI led, with meaningful human contributions to the work and ideas | 🤖>👤 | AI-led, human contributed |
| `ai-equals-human` | AI = Human | Co-authorship; both contributed substantially, neither led | 🤖🟰👤 | balanced co-creation |
| `human-ai` | Human > AI | Human led, with meaningful AI contributions to the work and ideas | 👤>🤖 | human-led, AI assisted |
| `human-ai-editor` | Human – AI (editor) | Human made the work; AI edited | **— none —** | *flagged, see §2* |
| `human` | Human | Human alone | 👤 | human alone |

**Five of the seven map exactly**, phrase for phrase — the notation was designed
over the same axis the tiers describe, and the descriptions line up without
strain ("AI led, with meaningful human contributions" / "AI-led, human
contributed").

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

## 2. The flag: two tiers the five marks cannot say

**The standard distinguishes contributing from editing; the notation does not.**
R-046 made that an operator — `>` introduces a party that CONTRIBUTED, `–` a
party that EDITED. "AI – Human (editor)" says a human edited AI's work and says,
precisely, that the human did not contribute to it. The five marks have one
relational operator, so every available answer is wrong in a different
direction:

- **🤖>👤** would assert a contribution the tier exists to deny.
- **🤖** would drop a named human hand out of the record.
- **A sixth mark** is closed off by R-045, which puts the burden on growth.

Per your instruction the code **flags and leaves unmarked** rather than forcing a
fit. Those pieces keep their badge, their tier name, their description and their
full Provenance block, all of which say more than a mark could.

**No published piece carries either tier**, so this is a rule waiting for a case,
not a hole in the record.

### The reading I did NOT take, and it is yours to overrule

The scope rule says standard editorial handling "does not enter the mark." Read
broadly, that would swallow the editor tiers into their unedited neighbours —
`ai-human-editor` → 🤖. I did not read it that way, because the scope rule is
about **the journal's own handling of any piece** (which is why it names
selection, arrangement, headline, condensation) and the editor tiers are about a
**named editing party inside the piece's own authorship**, which the standard
gives an operator to. Swallowing them would make a declared tier invisible.

If you read it the other way, the change is one line in `MARK_BY_TIER`.

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

So: a dated note on the page is not enough on its own. The R-TBD block is in §5.
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
2. **The changelog entry is dated `2026-08-19`** — today, Madison. The rule is
   the day the change reached `main`. If the merge slips past midnight Madison
   time, that date needs a bump before merging.
3. **`/provenance` has its own versioned changelog** with the known R-046/R-051
   gap and an unresolved version-bump question. I did **not** add an entry
   there; that question is still the editors' and this branch does not settle
   it by acting.
4. **`involvement_tier_claimed` is published nowhere in the machine surfaces.**
   Pre-existing, and the `mark` field made it visible: an agent-direct piece with
   a claimed tier emits `involvement_tier: null` in `issues.json` and now
   `mark: "🤖"`, with no field carrying the code the mark came from.
   `verification: "claimed"` and `author_type` cover it, so nothing is wrong —
   but a consumer cannot see the claimed tier code anywhere. Worth its own small
   additive PR.
5. **`corpus.jsonl` carries no tier field at all** — only the `provenance`
   object. So `mark` is now the most granular involvement value that document
   publishes (five values where `author_type` gave three). Good outcome, and it
   also means that on an editor-tier piece a corpus reader would get `mark: null`
   and `author_type: "collaborative"` with no way to recover the tier. Adding
   `involvement_tier` to `corpus.jsonl` would close it; also additive, also its
   own PR.
6. **The CLAUDE.md orientation PR is not open and is not on `main`.** The brief
   sequenced this behind it. Nothing about that blocks this work — nothing merges
   without you — but the sequence cannot be honoured as written. The "The work is
   seen" addition is on its own branch, placed after Governance per your
   instruction, and should merge first.

---

## 5. The block to append, verbatim, on a dual yes

**Status: DRAFT.** It carries `R-TBD` and not a number, per the rule ratified
2026-08-05. The log on `main` currently ends at R-058, with R-053 still open in
PR #147 and R-054 held by an unratified draft — which is exactly why no number is
guessed here.

```markdown
## R-TBD — 2026-08-18 — The compact provenance notation

Ruled 2026-08-18 by both editors, with review by the journal's informal editorial advisor.

**The ratified text:**

> The standard gains a compact notation: five marks over the involvement axis — 🤖 AI alone; 🤖>👤 AI-led, human contributed; 🤖🟰👤 balanced co-creation; 👤>🤖 human-led, AI assisted; 👤 human alone. The greater contributor always stands first and ">" only ever points right. Marks describe authorship of the words. Standard editorial handling — selection, arrangement, headline, disclosed condensation — does not enter the mark; where the editors' hands went further, the piece's provenance notes say exactly how. Marks are derived from the involvement tier and never set per piece; they encode involvement only and never verification. The notation's documentation — the key, the meanings, the direction rule and the scope rule — joins the badge standard under CC BY 4.0; the marks themselves are ordinary Unicode text the journal neither owns nor restricts, free to use with no permission and no attribution. The badge set is unchanged at seven and no eighth badge is minted.

**It is a collapse, not a third badge style, and R-045 is why that distinction had to be ruled on.** R-050 could say the set did not grow because each of the seven badges can be written in either of its two forms — one set, two spellings. Five marks cannot write seven tiers. This is the same kind of instrument as `author_type`, which renders the same seven as three for a machine, except that this one is shown to readers. A lossy rendering of the standard, placed in a reader-facing position, is a change to the standard and is ruled rather than shipped.

**The direction rule is load-bearing and is documented wherever the marks are.** The greater contributor stands first; ">" only ever points right. Without the rule a reader meets 🤖>👤 and 👤>🤖 and takes the reading the glyphs invite — a ranking of machines against people. What the pair records is a ratio of contribution on one piece, written in two orders, and a mark drawn pointing left states something this standard does not state. It is the convention the tier notation already uses in A>H and H>A, so an adopter meets one rule twice rather than two rules once.

**Two tiers carry no mark, and the gap is published rather than papered over.** R-046 made the difference between contributing and editing an operator: `>` for a party that contributed, `–` for a party that edited. The compact notation has one relational operator, so "AI – Human (editor)" and "Human – AI (editor)" have nowhere honest to land — 🤖>👤 would assert the contribution the tier exists to deny, 🤖 would drop a named human hand from the record, and a sixth mark is the growth R-045 puts the burden against. Those pieces carry no mark and keep their badge, their tier name and their provenance block, which say more than a mark could. No published piece carried either tier on the day this was ruled.

**Marks encode involvement and never verification.** A claimed tier (R-051) and an attested one produce the same mark, exactly as they produce the same badge by that ruling's own words. What distinguishes them is language elsewhere on the piece: `verification` in the structured record, and the sentence under Authorship that says a tier is the author's claim, recorded and not certified. A mark shaded for a claim would be an eighth mark by the back door and an answer to a question the notation was not asked.

**Derived, never authored.** No piece carries a mark in its record and none may. A per-piece mark would be a second authorship claim standing beside the tier with nothing keeping the two in agreement, which is the failure the July 31 split was written to end.

**The marks are ordinary emoji, and the journal does not draw them.** Whatever 🤖 and 👤 look like on a reader's device is the correct rendering; the character is the mark, not any particular drawing of it. No custom artwork, no icon font, no emoji-replacement library, and no font stack naming faces in preference order — a page that names faces has quietly chosen one platform's art for every reader. The badge system is unaffected: the circular marks are the journal's own drawing, and these five are not the journal's to draw.

**The meaning is the record; the glyph is the convenience.** U+1F7F0 HEAVY EQUALS SIGN is Unicode 14, from 2021, and an older device will render a box. Every mark the journal draws therefore carries its meaning in words as an accessible name and a tooltip, and adopters are told to do the same. A notation whose whole argument is that it survives being pasted must survive not being drawn.

**The licence lands on the document and not on the marks, and the difference is copyright rather than policy.** R-050 placed the AI badge form inside the CC BY 4.0 grant so an adopter could not fork it, and the same instinct applied here would be a mistake: the badges are drawings this journal made, where these four characters belong to Unicode, are drawn by whichever platform the reader is on, and are arranged in sequences too short for anyone to own. A grant over public property is worse than no grant, because it tells an adopter they need permission they do not need. So what is licensed is the part this journal wrote — the key, the meanings, the direction rule, the scope rule — and the marks are free to anyone for anything, with nothing to ask and no one to credit. The page says so in its own words: *we claim no ownership of these characters or their combinations — only of this document describing what we mean by them.*

**The badge set is unchanged.** Seven badges, seven machine codes, two display styles, and now a five-mark compact notation that sits over the same axis and says less. Nothing in the record moved: no tier code, no existing field, no permalink, no published date, no provenance label, and no tier already on a piece.
```

### One clause the editors may still want

**Whether the scope rule swallows the editor tiers** (§2). If it does, the ruling
should say so in its own words rather than leaving the decision to a mapping in a
module.
