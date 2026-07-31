# SCRATCH — Findings: provenance separation (items 1–3)

*Findings only. No code has been written. Items 1–3 carry schema and display
proposals below; items 4–7 are specified but not started, and §5 records what is
needed before item 4 can be built.*

**Approved by:** the human editor, 2026-07-31 — one PR, provenance separation and
reorganization.
**Builder:** Claude (Opus 5), in Claude Code.
**Baseline:** `main` at `14a49c4` (PRs #73–#82 merged). Branch
`provenance-separation`.
**The window:** this must merge **before Issue 1's first acceptances**, because
`provenance_label` freezes at acceptance and CLAUDE.md forbids retroactive edits.
Issue 1 is 2026-08-03.
**Map:** `docs/SCRATCH-FINDINGS-2026-07-31.md` §3.

---

# 0. THE COLLISIONS — flagged, not resolved

Four places where this build meets ratified text. **One of them blocks part of
item 4.** None is resolved here.

## 0a. R-033 clause 6 vs. item 4's "assignment dealt" — BLOCKING

Item 4 puts **"assignment dealt"** inside Chain of custody. That needs a
published brief-variant field on the article. R-033 clause 6 already governs that
field, and it says two things that pull in opposite directions:

> *"Publication follows a field set at acceptance and immutable thereafter, in
> the discipline of provenance labels… **That field and its migration are out of
> the door PRs and are queued as a separate ask-first item.**"*

and

> *"**No piece may be published under this model with its brief unrecorded.**"*

So the field was deliberately held back **and** it is a precondition of
publishing anything dealt a brief. Issue 1 acceptances are the moment both
clauses come due, and that is the same window this PR must beat.

**The question for the editors, which is not mine to answer:** is this PR the
"separate ask-first item" R-033 anticipated? It plausibly is — it is a separate,
asked-for, approved provenance-field PR. But the approval I have does not name
R-033 or the brief field, and clause 6 chose those words deliberately.

**Three ways forward, and the consequence of each:**

1. **Fold the field in here.** Chain of custody ships complete. Scope grows by
   one frontmatter field plus its display; the migration question is separate
   and is **not** proposed here.
2. **Ship Chain of custody without it**, with the other two elements. Then
   clause 6's bar — no publication with the brief unrecorded — is unmet at Issue
   1 unless no Issue 1 piece came through a dealt brief.
3. **Confirm no Issue 1 piece was dealt a brief**, in which case clause 6 does
   not bite yet and (2) is safe. **I cannot check this** — it is a fact about the
   held submissions, which live in the database.

**Recommendation: (1) if any Issue 1 candidate came through `/door`, (2) if
none did.** The editors know which; I do not.

## 0b. R-015's tier meanings vs. item 5's reworded descriptions

R-015 ratifies a table headed **"Display label | Meaning"** — the meanings are
*in the ruling*, not just in the code. Item 5 rewords two of them.

This is permitted and already has a method: **R-033 clause 8** says prior rulings
are never edited, ratified records carry a dated one-line amendment note at the
point of change, and the ruling is thereafter read subject to the amendment —
exactly what R-033 clause 3 did to R-006's word count. Item 5's dated amendment
note is that instrument, so the mechanism is sound.

**What must be stated so nobody "fixes" it later:** after this ships, RULINGS.md
line 88 will say *"AI led; a human contributed substantively"* and the page will
say *"AI led, with meaningful human contributions to the writing and ideas."*
That divergence is correct and permanent. RULINGS.md is append-only and machine-
enforced; it does not get edited to match.

## 0c. The version number — a real question, because the standard is licensed

R-014 publishes the tier system under **CC BY 4.0** for anyone to adopt. R-015
versioned it to **v2** for a labels change. Item 5 changes two *descriptions*.

Codes and display labels are untouched, so an adopter's rendered badge does not
change — but an adopter who copied the descriptions is now out of step.

**Proposal: stay at v2 and add a dated amendment entry to the existing changelog,
rather than minting v3.** The reasoning: v2 was cut for a change to the labels
themselves; this changes explanatory prose around unchanged labels. Minting v3
for prose would make the version number stop meaning "the standard changed."
**Flagged as the editors' call**, because CC BY 4.0 means third parties may be
carrying the old wording and version numbers are how they find out.

## 0d. "Four sections" must not drop three that rulings require

Item 5 names four sections for `/provenance`. The page currently has six, and
three are ruling-required or ruling-created:

| Current section | Status |
|---|---|
| The tiers | Item 5 keeps it (chart) |
| Machine codes | The adoptable substance of the standard |
| **License** (`#license`) | **Required by R-014** — CC BY 4.0 statement |
| Displaying it | Adopter guidance |
| **Changelog** (`#changelog`) | **Created by R-015**, and where 0c's entry goes |
| — | Item 5 adds: attestation, chain of custody, prompt disclosure |

**Reading item 5 as "four author-facing sections layered onto the existing
standard scaffolding," not as a replacement of six by four.** The `#license` and
`#changelog` anchors are also linked from elsewhere and would 404 in-page if
dropped. Flagged for confirmation rather than assumed.

---

# 1. ITEM 1 — THE DATA MODEL

## What is true today

`src/content.config.ts:59` — `provenance_label: z.string().min(1)`, one free-text
string doing two jobs, exactly as §3 of the audit described:

- **Human-attested:** it encodes the *authorship* claim plus the attester, as
  prose — `'AI + Human: AI led, a human contributed substantively; attested by
  Amy Louise Frederick'`.
- **Agent-direct:** `:80-86` forces it to be exactly the *arrival* caveat —
  `'provenance as claimed by the author; not independently verifiable'`.

One field, an authorship claim on one track and an arrival disclaimer on the
other. Present since the initial scaffold; never introduced by a later PR.

## Proposed additions — all add-only, nothing renamed or removed

### Authorship

| Field | Type | Rule |
|---|---|---|
| `involvement_tier` | **exists, unchanged** | machine code; human-attested only |
| `attestation` | `string`, optional | the submitter's own sentence about who did what |
| `attested_by` | `string`, optional | the human who stands behind it; human-attested only |

`attestation` is allowed on **both** tracks, and where it renders is what keeps
the axes apart:

- **Human-attested** → renders under **Authorship**. It is an authorship claim
  and a named human stands behind it.
- **Agent-direct** → renders under **Chain of custody**, with the caveat. It is
  an unverified claim about how the piece arrived, and no tier attaches to it.

That rule is the whole separation in one sentence, and it is why `attestation`
does not need to be split into two differently-named fields.

**Proposed constraint:** `attested_by` is required when `attestation` is present
on the human-attested track, and forbidden on agent-direct. An attestation with
nobody behind it is the thing the tier system exists to prevent.

### Chain of custody

| Field | Type | Rule |
|---|---|---|
| `submission_track` | **exists, unchanged** | `human-attested` \| `agent-direct` |
| `received` | `date`, optional | when the piece arrived, as against `date` = published |
| `brief_variant` | — | **NOT PROPOSED — blocked by §0a** |

### Disclosure

| Field | Type | Rule |
|---|---|---|
| `prompt_disclosure` | `string`, optional | never required; desk-reviewed before publication; always rendered with "as claimed by the submitter, not verified" |

## The as-claimed caveat — a recommendation against storing it

The brief says the caveat becomes its own clearly named field. **I recommend it
becomes a derivation instead, and I want the editors to overrule me deliberately
if they disagree.**

The caveat is not an independent fact. It is what `agent-direct` *means*:
every agent-direct piece carries it, no human-attested piece does, and the schema
already enforces that by forcing the exact string. Storing it again in a second
field re-creates the precise failure §3 identified — a stored value that must be
kept in agreement with the field it is derived from, with nothing enforcing the
agreement.

**Proposal:** render the caveat from `submission_track`, from one named constant
(`AGENT_DIRECT_LABEL`, which already exists at `site.ts:122`). No new field, no
drift possible, and the caveat appears in exactly one place in the code.

**If the editors prefer a stored field anyway**, the safe form is a boolean —
`provenance_verified: false` — rather than a second copy of the sentence: a
boolean can be checked against the track by the schema, a prose duplicate cannot.

## `provenance_label` — keep the name, change where the value comes from

The brief keeps `provenance_label` for compatibility. **Recommendation: keep the
emitted field exactly as it is, and make it *derived at build time* from the new
fields rather than authored in frontmatter.**

Why: if it stays authored alongside the new fields, an editor can set a tier of
`AI + Human` and a label that says something else, and nothing catches it. That
is two sources of truth for one fact, which is what this PR exists to end.

**The stability contract is unaffected.** `issues.json.js:9` and
`agent-api.json.js:7` bind the *emitted JSON* — fields may be added, never
renamed, removed, or given new meanings. A derived `provenance_label` emits the
same key with the same meaning and the same string shape. Consumers cannot tell.

**The cost, stated plainly:** deriving it means the exact prose is generated, so
the editors lose the ability to hand-write an unusual label for an unusual piece.
If that freedom matters, the alternative is to keep it authored and add a schema
check that the label's tier prefix matches `involvement_tier`. **Flagged as a
choice, with derivation recommended.**

## Feed emission — flat additions, not nested

`feed.json.js:41-53` and `issues.json.js:20-33` already separate the axes.
Proposal: **add new flat keys inside the existing `_provenance` object** —
`attestation`, `attested_by`, `prompt_disclosure`, `received` — and leave every
existing key byte-identical.

**Not proposing** nested `authorship` / `chain_of_custody` sub-objects, though
they would read better. Nesting would mean either duplicating `involvement_tier`
into a sub-object (two sources again) or moving it (a rename, which the contract
forbids). Flat and slightly less elegant beats nested and ambiguous.

---

# 2. ITEM 2 — `/archive`, un-collapsing the slot

## What is true today

`src/pages/archive.astro:21-30`:

```js
const tier =
  d.submission_track === 'agent-direct'
    ? 'agent-direct'
    : TIER_LABELS[d.involvement_tier ?? ''];
return `By ${d.author_name} · ${tier}`;
```

A variable named `tier`, a function named `coverTierLine`, and an *arrival-track*
value printed into it. A reader sees `By X · AI + Human` on one issue and
`By Y · agent-direct` on the next, in the same visual slot, as though those were
two values of one thing. The lowercase `agent-direct` against title-case tier
labels is the visible seam.

## Proposal

**The invariant: the authorship slot never contains a track value.** When there
is no tier, the slot is absent — not filled with something else.

| Track | Rendered |
|---|---|
| Human-attested | `By Amy Louise Frederick · AI + Human` + track marker `Human-attested` |
| Agent-direct | `By Atlas` + track marker `Agent-direct` |

- The **byline + tier** stay in the existing position and style.
- The **track marker** becomes a separate element, visually distinct (smaller,
  `--ink-soft`, its own element rather than a `·`-joined clause), so the eye does
  not read it as an alternative value of the same thing.
- **Track labels are title-case everywhere** — `Human-attested` / `Agent-direct`
  — matching what `ProvenanceBlock.astro:22-24` already renders, which kills the
  case seam.
- `coverTierLine` is renamed to something that does not claim the line is a tier.

**Not proposed:** printing the as-claimed caveat on `/archive`. It belongs on the
article page, where there is room to label it; in a one-line index entry it would
land in exactly the byline position this item exists to clear.

---

# 3. ITEM 3 — RSS, llms.txt, JSON-LD

All three currently emit the raw label, so on agent-direct pieces the *arrival
caveat* reads as an authorship claim in byline position.

**None of the three is under an add-only field contract** — RSS `description` and
the llms.txt line are prose, and JSON-LD `description` is free text. Verified:
the contracts live in `issues.json.js:9`, `agent-api.json.js:7` and
`feed.json.js:15`. So the prose can change; only the JSON field *names* are
frozen.

### `src/pages/rss.xml.js:33`

Now: `By X (model) — {provenance_label}`

| Track | Proposed |
|---|---|
| Human-attested | `By {author} ({model}) — Authorship: AI + Human · Human-attested` |
| Agent-direct | `By {author} ({model}) — Agent-direct; provenance as claimed by the author, not independently verified` |

Both axes named; the caveat only where it is true, and never where a tier would sit.

### `src/pages/llms.txt.js:24`

Now: `…; provenance: {provenance_label}`

Proposed: `…; authorship: {tier label}; chain of custody: {track label}` — and on
agent-direct, `authorship: not declared (agent-direct track carries no tier);
chain of custody: Agent-direct, provenance as claimed`.

Spelling out *why* there is no tier matters more for a machine reader than a
human one: an absent field invites a guess, and a named absence does not.

### `src/lib/structured-data.ts:141`

Now: `AI author. Model version: X. Provenance: {label}`

Proposed: `Model version: {X}. Authorship: {tier or "not declared — agent-direct
track"}. Chain of custody: {track label}{caveat when agent-direct}.`

**Also flagged:** the string opens `AI author.` unconditionally, on both tracks
and every tier including `Human`. That is a separate, pre-existing inaccuracy in
the same sentence — a `Human` tier piece is currently described to search engines
as having an AI author. It is in scope to fix here only because I am rewriting
the line; say if it should be left alone.

---

# 4. What is NOT proposed here

Items 4–7 are specified in the brief and are not started. Item 4 is blocked on
§0a and on §5 below; items 5–7 are copy and form work that follows once 1–3 are
ruled.

---

# 5. What I need before building item 4

**The approved mockups.** The brief says the human editor holds them for the
Provenance block's shape. I have not searched for them and will not guess at the
layout — the block is the surface the whole build is judged on. **Please paste
them.**

Everything in items 1–3, 5, 6 and 7 can proceed without them.

---

# 6. Decisions requested

1. **§0a — the blocking one.** Is this PR R-033 clause 6's "separate ask-first
   item"? And did any Issue 1 candidate come through `/door`? That second fact
   decides whether clause 6 binds at these acceptances.
2. **§0c** — v2-with-amendment, or v3?
3. **§0d** — confirm "four sections" layers onto the existing scaffolding and
   does not drop License, Machine codes, or Changelog.
4. **§1** — the as-claimed caveat: derived from the track (recommended), or a
   stored field?
5. **§1** — `provenance_label`: derived at build time (recommended), or stays
   authored with a consistency check?
6. **§3** — fix the unconditional `AI author.` in the JSON-LD description, or
   leave it as a separate item?

Nothing is committed. No file outside this one has been modified.
