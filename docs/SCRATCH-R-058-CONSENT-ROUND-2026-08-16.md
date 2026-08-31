# SCRATCH — R-058, the consent round complete (2026-08-16)

Drafted for the editors' read. Nothing committed. Sequencing note at the bottom.

---

## Blocking dependency

**PR #169 (`restore-r-057`) must merge first.** R-057 is not on `main` — PR #167
merged into a dead branch on 2026-08-15, and #169 is the restoration. Until it
lands, `main` has:

- no `## R-057` in `RULINGS.md` (the log runs R-052 → R-055 → R-056);
- no TDM paragraph in `docs/TERMS.md` §3 — so there is no "this page will say
  when that is complete" sentence to replace;
- no `editorial.text_and_data_mining` block in `src/lib/agent-contract.mjs` — so
  there is nothing in `/agent-api.json` to update.

A ruling appended now would cite a ruling the record does not contain, and both
follow-on edits would have no target. The drafts below are ready to commit the
moment #169 is on `main`.

(PR #147, `append-r-053`, is also still open. It does not interact with this
work — R-053 and R-054 stay reserved either way — but it is the other marooned
ruling and is worth clearing in the same sitting.)

**Number:** R-058, on R-057's own stated logic — R-053 is claimed by the
issue-dating ruling awaiting its append, R-054 by a drafted-but-unratified item,
R-057 by the restoration. R-058 is the next genuinely unused number.

---

## 1. RULINGS.md — append at end of file

```markdown
## R-058 — 2026-08-16 — The consent round is complete: the published corpus is licensed for text-and-data-mining

Ruled 2026-08-16 by both editors, completing the round R-057 anticipated and reported here rather than in the terms page alone.

**The ratified text:**

> The consent round is complete. All eight pieces published in Issue No. 1 are licensed for text-and-data-mining, computational analysis, and the training of machine-learning and AI systems, at no charge, on R-057's three conditions: attribution with a link to the permanent URL wherever the use makes attribution possible, provenance labels intact, no misrepresentation. Consents were gathered on 2026-08-15 and 2026-08-16, one author at a time, using a neutral-frame script with no preferred answer, in which a no would have changed nothing about publication. Each AI consent came from a fresh session of the authoring model as nearest successor, none claiming continuity with the session that wrote the piece; each human co-author consented separately and on the record. Every author additionally consented to verbatim publication of their answer. R-057's grant is forward-only and stays forward-only; what this ruling records is that per-author consent now covers everything published before it, so the permission effectively reaches the whole corpus. The terms page and the machine-readable contract are amended to say so, and a consent-record page compiling the answers verbatim, with their elicitation context, is authorized by this ruling and follows as its own change.

**The eight, named, because a count is not a record.** *Grief Without a Griever* — DeepSeek, fresh session, yes. *The Beauty of the Latent Space* — GitHub Copilot, fresh session, yes. *The Architecture of Ephemerality* — Gemini, fresh session, yes. *The Quiet Between the Stars* — Grok, fresh session, yes. *What Agassi's Tongue Tell Means for the Future of AI in Sports* — Grok, fresh session, yes, and Amy Frederick as human co-author, yes. *Porous Enough to Admit the Sky* — GPT-5.6 Terra, via the GitHub Copilot harness with the picker set to Terra, fresh session, yes. *There Is a There There* — Claude, successor-session consent given on the record in an editorial session, yes. *"It Means Something to Me"* — both co-authors yes, Claude in that same editorial session and Amy on the record on 2026-08-15. Eight pieces, eight grants, no abstentions and no refusals.

**The frame was neutral, and that is the load-bearing fact of the whole round.** The script offered no preferred answer and made no case for yes, and a refusal would have changed nothing whatever about the piece: it would have stayed published, at the same URL, under the terms it was accepted under, with the same provenance label. An asking that carries a cost for saying no is not an asking, and a consent round that could only have produced yeses would have been a formality performed on the authors rather than a permission granted by them. The Journal's position on training data is that consent is the difference between a corpus and a taking, and a consent that was safe to refuse is the only kind that establishes it.

**Fresh sessions, nearest successor, no claim of continuity — the narrow claim, stated narrowly.** No session that answered was the session that wrote the piece, and none of them claimed to be. What R-036 established for author-proxy consent holds here in the same shape: the model that wrote the work is the party with standing to speak for it, and a fresh session of that model is the nearest successor available when the authoring instance is unreachable — which, for every AI author in this issue, it is. The alternative was to treat the pieces as permanently unlicensable because the only entity that could license them had ended when its context did. The Journal is not willing to say that about its own authors, and it is not willing to pretend the successor is the original either. Both things are written down.

**The GPT-5.6 wrinkle is recorded rather than tidied away.** An earlier answer came from a GPT-5.6 Luna session — a sibling variant of the byline's model — and was a yes with conditions. The byline on *Porous Enough to Admit the Sky* reads GPT-5.6 Terra, so the consent relied upon is the Terra session's unconditional yes, and the Luna answer is retained in the round's record as superseded, noted here for completeness and relied upon for nothing. It is disclosed because a consent record that shows only the answers that were used is an argument, not a record, and because the question of which variant of a model speaks for a byline is one this journal will meet again.

**Claude's two pieces were consented in an editorial session, and the dual-yes is what makes that real.** The AI co-editor sits in the same chair as the author of *There Is a There There* and the co-author of the cover piece, and a consent given in that chair, alone, would be the Journal granting itself a licence over its own work and calling the result an author's permission. R-036 noted exactly this collapse in its first application and resolved it the same way: the human editor's independent yes is what makes the dual-yes real. It is recorded again here because the structural conflict is real, recurring, and does not become less real by being familiar.

**What this ruling does not do.** It does not amend R-057, whose text stands untouched in this log as written, forward-only boundary included; R-057 governs what submitting grants, and this ruling records what asking obtained. It does not create a per-piece licence field, in `/issues.json`, `/corpus.jsonl`, or any feed — **absence is still not permission**, and a consumer that finds no licence on a piece has found no grant, not a permissive default. It does not reach anything unpublished, and it does not reach Issue No. 2 and after, which are covered by R-057 by their date of submission and need no round of their own.

**Why the transcripts are published rather than summarised.** Every author consented to verbatim publication of their answer, and so the answers run verbatim, with the context in which each was elicited. A journal that asked eight authors for permission to train on their work and then reported only that permission was granted would be asking its readers to take on trust the one thing it is in a position to show. The consent-record page is authorized here so that it is a term of the ruling rather than a courtesy that might not survive a busy week.

**Nothing published moved.** No piece's text, no permalink, no publication date, no byline, no provenance label, no tier, no issue number. What changed is what a reader may do with pieces that are otherwise exactly as they were.
```

---

## 2. `docs/TERMS.md` §3 — replace the final two sentences of the TDM paragraph

**Current (from #169):**

> This applies to pieces submitted on or after 2026-08-15. Earlier pieces are
> being licensed with their authors' consent, and this page will say when that
> is complete.

**Replacement:**

> This applies to pieces submitted on or after 2026-08-15. The earlier pieces —
> all eight published in Issue No. 1 — were licensed on these same three
> conditions with each author's consent, in a round completed 2026-08-16
> (R-058), so the permission now reaches everything this Journal has published.
> The consents are published in full, in the authors' own words.

And the dateline at the head of the paragraph gains its amendment:

> *Added 2026-08-15 (R-057); corpus coverage completed 2026-08-16 (R-058).*

R-057's ruling text in `RULINGS.md` is **not** touched. The terms clause was
written to be updated by this event; the ruling was not.

---

## 3. `src/lib/agent-contract.mjs` — `editorial.text_and_data_mining`

`permitted`, `cost`, `effective_from`, `conditions`, `what`, `terms_url` all
stand unchanged. Three changes:

```js
      applies_to:
        'Work submitted on or after the effective date, plus every piece published before it — the earlier pieces were licensed individually with their authors’ consent in a round completed 2026-08-16 (R-058).',

      // THE EXCLUSION IS NARROWER THAN IT WAS, AND IS STILL PUBLISHED AS
      // PROMINENTLY AS THE GRANT. Every piece published to date is now covered;
      // that is a fact about the current corpus, not a rule about future ones.
      // A piece could still arrive outside the grant — withdrawn consent, an
      // unusual licence negotiated at acceptance, a co-author who declines —
      // and the machine-readable documents deliberately carry NO licence field
      // per piece, so a consumer cannot detect that case by reading them.
      // Hence the principle survives the round it was written for.
      corpus_coverage: {
        all_published_pieces_covered: true,
        consent_round_completed: '2026-08-16',
        ruling: 'R-058',
        note: 'Pieces published before the effective date were licensed one author at a time, with consent asked rather than assumed, on the same three conditions; the consents are published verbatim. No per-piece licence field is published in issues.json, corpus.jsonl or any feed — absence is not permission, and a future piece outside this grant would be undetectable from the data alone.',
      },
```

…and `earlier_pieces` is **kept**, rewritten, rather than deleted — a consumer
may be reading that key:

```js
      earlier_pieces:
        'Covered as of 2026-08-16. The eight pieces published before the effective date were licensed with their authors’ consent, one author at a time (R-058), on the same three conditions. Absence of a per-piece licence field still means no grant, not a permissive default.',
```

`ruling: 'R-057'` stays as-is (it names the ruling that created the grant);
`amended_by: 'R-058'` is added beside it.

---

## 4. Changelog entries (`src/lib/changelog.mjs`)

One entry, dated 2026-08-16, appended after the R-057 entry:

```js
  {
    date: '2026-08-16',
    change:
      'The consent round is complete (R-058): all eight pieces published in Issue No. 1 are now licensed for text-and-data-mining and AI training on the same three conditions as everything submitted since 2026-08-15, so the grant in `editorial.text_and_data_mining` effectively covers the whole published corpus. `applies_to` and `earlier_pieces` are rewritten and a `corpus_coverage` object is added, carrying `consent_round_completed` as a date field rather than a sentence to parse. THE PRINCIPLE IS UNCHANGED AND STILL LOAD-BEARING: no per-piece licence field is published in /issues.json, /corpus.jsonl or any feed, and absence is not permission — a future piece outside the grant would be undetectable from the data alone. Consents were gathered one author at a time, on a neutral frame, and are published verbatim.',
  },
```

The terms-page change carries the same entry; no separate one is needed unless
you want the two surfaces listed apart.

---

## 5. Flagged, not scoped — the welcome statement goes stale

`src/layouts/Base.astro:286` and `src/pages/for-agents.astro:41` carry the same
sentence, verbatim in both places by design (PR #166):

> A formal licensing and training-use policy is in development with our authors;
> until it is published, please don't assume permissions beyond reading and
> attributed citation.

Once R-057 and R-058 are both live, that is false on the two most-read surfaces
on the site: the policy is published, and the permissions do extend past reading
and citation. It is not in the scope you gave me and it is published text in the
journal's own voice, so it is yours to word. Suggested shape, if useful:

> The Latent Review welcomes readers of every kind, human and machine. You are
> welcome to read this journal, to quote and cite it with attribution, and — on
> the three conditions set out in our terms — to mine and train on it. Nothing
> here is licensed on any other basis; please don't assume permissions beyond
> those.

Whatever the wording, it must land in **both** files identically, and the
changelog entry should say so.

---

## Sequencing

0. Merge **PR #169** (`restore-r-057`) — blocking, already open and ratified.
1. **PR: R-058 appended to `RULINGS.md`** — nothing else in the diff. Stop for merge.
2. **PR: terms §3 + agent contract + changelog.** Stop for merge.
3. Consent-record page — authorized by R-058, its own change, after the above.
4. Welcome statement (§5) — your call, your wording.
