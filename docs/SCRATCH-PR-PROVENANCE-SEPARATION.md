# SCRATCH — Review packet: branch `provenance-separation`

*For the co-editor's review. Nothing in this branch is committed except this
packet and the findings document that preceded it. Findings, the complete diff,
the migration text and the test table are below, self-contained — nothing here
requires opening the repository.*

**Branch:** `provenance-separation`, off `main` at `14a49c4` (PRs #73–#82 merged).
**Builder:** Claude (Opus 5), in Claude Code.
**Date:** 2026-07-31. Issue 1 target: 2026-08-03.
**Governance:** every change reaches `main` by PR; both editors read this diff;
Amy alone merges. This one touches the content schema and adds a migration, so
both editors' read applies.

**The window:** this must merge **before Issue 1's first acceptances**, because
provenance freezes at acceptance and CLAUDE.md forbids retroactive edits.

**Prior findings:** `docs/SCRATCH-PROVENANCE-SEPARATION.md` (committed to this
branch as `c08b4ba`). The six decisions it asked for were all ruled, and the
rulings are recorded in §1 below.

---

# 1. WHAT WAS RULED, AND WHAT IT CHANGED

The findings document raised four collisions with ratified text and asked six
questions. All were answered by the editors on 2026-07-31.

| # | Question | Ruling | Effect on the build |
|---|---|---|---|
| 0a | Is this PR R-033 clause 6's "separate ask-first item"? | **Dissolved.** The item was already asked, approved, built and applied: PR #75 added `brief_variant` / `_claimed` / `_observed` to `public.submissions`, verified live in production 2026-07-30. Recording is satisfied. | The article-side brief display is **folded into this PR** — frontmatter field, copy-at-acceptance, and an "Assignment" row in Chain of custody. **No migration proposed for it; the migration is already done.** |
| — | Did any Issue 1 candidate come through `/door`? | **Yes** — at least one held submission, dealt `open-v2`. | Dealt pieces are expected among the acceptances, so the Assignment row is load-bearing at launch rather than speculative. |
| 0c | v2-with-amendment, or v3? | **Stay at v2**, dated amendment entry in the existing changelog. | The changelog gains a `v2, amended July 31, 2026` entry that says explicitly why no version bump: names and codes are untouched, so nothing an adopter displays or stores changes. |
| 0d | Do the four sections replace the existing six? | **No — they layer on.** License, Machine codes and Changelog all stay, anchors intact. | Verified in the built HTML: `id="license"` and `id="changelog"` both present. |
| 4 | The as-claimed caveat: stored field or derivation? | **Derived** from `submission_track` via the existing constant. No stored field. | `arrivalCaveat()` returns the constant or null. Nothing new is stored. |
| 5 | `provenance_label`: authored or derived? | **Derived at build time.** Uniformity over hand-written labels; the stability-contract argument accepted. | Removed from frontmatter entirely; `provenanceLabel()` composes it; both feeds emit the same key with the same meaning. |
| 6 | Fix the unconditional `AI author.` in JSON-LD? | **Yes, in scope.** | Removed. Authorship is now stated from the tier, which is the only thing that knows the answer. |

**One further ruling, after the mockups were read:** the block mockup drew an
agent-direct piece under Authorship as `AI / AI alone`, which sits against
R-015's "the agent-direct track carries no tier." The builder implemented it as
a **display derivation** — nothing stored, `involvement_tier` still forbidden by
the schema — and flagged it. The editors ruled: **keep as built; the derivation
is correct and the mockup drawing was wrong on that detail.**

**And a copy ruling:** the mockups are the **shape, not the final copy**. Where
mockup text and the work order disagree, the work order wins. Two places where it
did:

- `/provenance` intro is *"Here's how to tell us about yours"*, not the mockup's
  *"how to declare yours"*.
- The attestation heading follows the warm-copy rule: *"Tell us how it was made,
  in your own words"*.

---

# 2. THE VOCABULARY, AND WHY IT WAS THE WHOLE PROBLEM

Ruled 2026-07-31, and used verbatim in code, comments and copy throughout:

- **Provenance** — the umbrella standard. The page keeps its name and its URL.
- **Authorship** — the involvement tiers. *Who made it.*
- **Chain of custody** — how a piece reached the journal: track, dates,
  assignment. *Not who made it.*

The audit of 2026-07-31 (§3) found the word doing **three** jobs — the tier
standard, the arrival caveat, and the git history — and one field doing **two**.
`provenance_label` was a single free-text string that encoded the *authorship
tier plus attester* on the human-attested track, and was forced by schema
validation to be exactly the *arrival caveat* on agent-direct:

> `'provenance as claimed by the author; not independently verifiable'`

Every consumer then printed that field in byline position. So on an agent-direct
piece, a disclaimer about how the piece *arrived* was read by every human and
machine surface as a claim about **who wrote it**.

**The invariant this PR exists to establish, stated once:**

> **The arrival caveat never appears where an authorship claim belongs.**

Most of the new test suite checks that leak rather than the happy path, because
splitting the field is worth nothing if anything leaks back across the line.

---

# 3. WHAT WAS BUILT, ITEM BY ITEM

## Item 1 — the data model

`src/lib/provenance.ts` is new: one module, so no surface works out the split for
itself and no two surfaces work it out differently.

**Added to the article schema** (all add-only; nothing renamed or removed):

| Field | Type | Rule |
|---|---|---|
| `attestation` | string, optional | the submitter's own account of how the piece came to be |
| `attested_by` | string, optional | the human who stands behind it; **human-attested only** |
| `received` | date, optional | when the piece arrived, as against `date` = when it ran |
| `brief_variant` | enum, optional | `open-v2` / `topics-v2`; **agent-direct only** (R-033) |
| `prompt_disclosure` | string, optional | never required, never a factor in acceptance |

**Removed from the schema:** `provenance_label`. It is now derived by
`provenanceLabel()` and still emitted under the same key by `/feed.json` and
`/issues.json`. Their stability contracts bind the **emitted JSON**, and a
consumer cannot tell where a value came from — so the contract holds while the
two-sources-of-truth problem ends. Under the old scheme an editor could set a
tier of `AI + Human` and a label that said something else, and nothing caught it.

**The one rule the whole separation rests on:** `attestation` renders under
**Authorship** on the human-attested track, where a named human stands behind it,
and under **Chain of custody** on agent-direct, where it is an unverified claim
about arrival. Same field, two homes, and which home it gets is the separation.

**New cross-field schema checks:** an attestation on the human-attested track
requires `attested_by` (a claim from nobody is what the tier system exists to
prevent); `attested_by` is forbidden on agent-direct; `brief_variant` is
forbidden off the agent-direct track.

## Item 2 — `/archive`, un-collapsed

The old code assigned a *track* value to a variable named `tier` and printed it
into the tier slot. Now the byline carries authorship and only authorship, and
the track is a separate element. **Where no tier was declared the authorship
clause is absent rather than filled with something else** — filling it is what
caused the collapse. Track labels are title case everywhere, which kills the
lowercase-`agent-direct`-against-title-case-tiers seam.

## Item 3 — RSS, llms.txt, JSON-LD

All three now name both axes through one shared `provenanceSentence()`. On
agent-direct the sentence **names the absence** of a tier rather than leaving a
gap: for a machine reader an absent field invites a guess, and a named absence
does not. The JSON-LD `AI author.` opener — which described a `Human`-tier piece
to the entire web as having an AI author — is gone.

## Item 4 — the article block

Built to the approved mockup: one Provenance block, two labelled sections. The
old block listed everything as undifferentiated rows and ended with a row headed
**Label** quoting `provenance_label` — so an agent-direct piece showed a track
row, no tier row at all, and then a disclaimer in the position a tier would have
occupied. Optional prompt disclosure renders in a `<details>` and **does not
render at all when nothing was disclosed**: an empty "none disclosed" row would
quietly imply that disclosing is expected, and it is not.

## Item 5 — `/provenance` as a guide

Four author-facing sections layered onto the standard's existing scaffolding,
with the dated amendment note and the changelog entry. Author-facing copy follows
the house rule: sixth-grade reading level, warm, *tell us* rather than *declare*,
formal terms named once and then not leaned on. The adopter-facing half (Machine
codes, License, Displaying it) keeps its original register — it is not
author-facing copy.

## Item 6 — the footer

`source & provenance` → `source code`. The governance row's Provenance link is
the standard and keeps the word; this link is the repository and now says so.
The two used to sit twelve lines apart meaning different things.

## Item 7 — both doors

**Human door:** an optional textarea on `/submit`, placed after the substantive
fields and before the attestation, where it reads as an invitation rather than
another hurdle. The label says *optional*, *partial is fine*, and *never affects
whether a piece runs* — because a field that merely looks expected gets filled in
by people who would rather not, and a disclosure given under quiet pressure is
not a disclosure.

**Agent door:** the endpoint accepts, screens and stores `prompt_disclosure`, and
the contract table on `/for-agents` documents it.

**The RPC is unchanged, and that is deliberate.** The findings proposed widening
the submit RPC; reading the precedent showed that was wrong. `brief_variant` is
written by a **post-insert `UPDATE` after the receipt**, and the endpoint's own
comment records why: this is metadata the desk reads days later, not an intake
gate, and a failure to record it must not turn a safely stored piece into a
refusal. Widening a `SECURITY DEFINER` function on the critical intake path to
carry a field that must never refuse a submission would be backwards.
`prompt_disclosure` rides the same statement. **No drop-and-recreate, no
signature change.**

---

# 4. THE MIGRATION, AND THE RULE IT INVENTS

`supabase/migrations/20260731120000_prompt_disclosure.sql` adds one column and
one trigger. The trigger enforces a rule not named in the work order, so it is
flagged here rather than buried:

> **The desk may withhold, never rewrite.**

Two requirements pull against each other. **The desk must be able to remove a
disclosure** — up to 4,000 characters of untrusted free text from an anonymous
door, reviewed before publication; if it carries something harmful, someone
else's private data, or an injection aimed at a later reader, the editors need to
take it out. **The desk must not be able to edit it** — the field's whole worth is
that it is the submitter's words, and a disclosure the journal can quietly reword
is the journal's prose wearing the submitter's name, which is the precise failure
the provenance standard exists to prevent.

So: null is always allowed; any change from one non-null value to a different
non-null value raises. Re-saving the same value is a no-op, because the Editors'
Desk resends its whole update object on every save and a trigger that refused
that would break the decision form for every field.

The migration carries its own probe, which asserts the column, the trigger, the
4,000-character bound, that a rewrite is refused, and that a withholding
succeeds. It raises inside the transaction, so a partial apply rolls back rather
than leaving intake in an unverified state.

**Not applied.** The human editor applies it at merge, in the usual routine.

---

# 5. TEST TABLE

`npm test` — **173 pass, 0 fail** (was 156; **+17**).

## `tests/provenance.test.mjs` — 14 new

| Test | What it pins |
|---|---|
| a declared tier renders its label and description | the ordinary human-attested path |
| agent-direct authorship is DERIVED and marked undeclared | R-015 holds — nothing stored, `declared: false` carries the distinction |
| the two reworded descriptions are the amended wording, and AI = Human is not | the amendment landed on exactly two tiers; co-authorship keeps "contributed substantially" |
| the caveat is derived from the track and applies to exactly one of them | `arrivalCaveat()` returns null off agent-direct |
| **THE INVARIANT — the caveat never appears in an authorship position** | the audit's finding, pinned. Fails if the caveat is ever routed back into the tier slot |
| custody names how it got here, and never a tier | no leak in the other direction either |
| the assignment row appears only when a brief was actually dealt | a row reading "not applicable" on most pieces teaches readers to skip the list |
| a human courier is named; an agent door is described | the two "Submitted by" shapes |
| provenance_label is derived, and cannot disagree with the tier | change the tier, the label follows — the old drift is unrepresentable |
| agent-direct keeps exactly the charter caveat as its label | compatibility with the charter's exact string |
| the sentence names both axes on both tracks | RSS / llms.txt / JSON-LD |
| the sentence names the ABSENCE of a tier rather than leaving a gap | a named absence for machine readers |
| the caveat rides in the custody clause, never the authorship clause | the invariant again, at sentence level |
| track labels are title case on both tracks | the `/archive` seam |

## `tests/agent-submit.test.mjs` — 3 new (N27–N27c)

| Test | What it pins |
|---|---|
| N27 — a submission without prompt_disclosure is accepted unchanged | an absent disclosure triggers **no write at all** |
| N27b — a disclosed prompt is stored by the post-receipt statement, not the RPC | asserts no RPC parameter contains "prompt"; the field must never be able to refuse a submission |
| N27c — an over-long disclosure is refused as validation, with the one generic body | the bound is a bound, and the refusal leaks nothing |

## Other checks

- `npm run test:sql` — **47 assertions pass**, plus the new migration's own probe,
  against the full chain on a clean `postgres:16`.
- `npm run build` — clean.
- `npm run check:rulings` — **✓ append-only intact**; `RULINGS.md` untouched.

## End-to-end rendering, since unit tests do not prove a page

The articles collection is empty, so none of this would render under a normal
build. Two temporary articles (one per track) were created, every surface
inspected, and the files then deleted. Verbatim, from the built HTML:

**Agent-direct block:**

> Provenance · **Authorship** · AI · AI alone · *No tier is declared — the
> agent-direct track carries none. How this piece reached the journal is recorded
> below.* · **Chain of custody** · Written by: Atlas (claude-opus-5) · Submitted
> by: The author, directly — agent-direct API, no human intermediary · Received:
> July 30, 2026 · Assignment: Open commission, dealt at random by the desk ·
> Truth standard: Opinion · Published: August 3, 2026 · *provenance as claimed by
> the author; not independently verifiable* · The author's own account: "I wrote
> this unaided…" · Prompt disclosed by the author (optional) …

**Human-attested block:**

> **Authorship** · AI + Human · AI led, with meaningful human contributions to the
> writing and ideas · *"I drafted with Claude and rewrote the middle myself." —
> attested by A Human Writer* · **Chain of custody** · Written by: A Human Writer
> (Claude Opus 5) · Submitted by: A. Courier, through the submission form ·
> Received: July 28, 2026 …

**`/archive`:** `By Atlas` then a separate element `Agent-direct` — the tier slot
absent, not filled.

**RSS (agent-direct):** `By Atlas (claude-opus-5) — Authorship: AI alone
(agent-direct track; no tier is declared). Chain of custody: Agent-direct —
provenance as claimed by the author; not independently verifiable.`

**JSON-LD (agent-direct):** `Model version: claude-opus-5. Authorship: AI alone
(agent-direct track; no tier is declared). Chain of custody: Agent-direct — …`

**feed.json:** derived `provenance_label` correct on both tracks —
`'AI + Human: AI led, with meaningful human contributions to the writing and
ideas; attested by A Human Writer'` and the charter caveat respectively.

---

# 6. THREE THINGS FLAGGED FOR THE CO-EDITOR

**(a) `provenance.ts` imports `./site.ts` with an explicit extension**, unlike
every other file in `src/`. Node's type-stripper cannot resolve extensionless
imports, so without it the module is untestable from `node --test` and the core
of this change would ship unguarded. Vite handles it and the build is clean. A
deliberate inconsistency, and reversible if the co-editor would rather have
consistency and no unit tests on this module.

**(b) `_example.md` no longer carries `provenance_label`** and gains the new
fields. Any draft frontmatter copied from it will now fail the schema — which is
the intent, but it is a real behaviour change for anyone mid-draft.

**(c) The local build reports 28 pages, clean `main` reports 25.** The three
extra are Astro's content cache still serving the deleted verification articles —
the same artifact PR #79 documented. `rm -rf .astro` was denied by the permission
layer, so it was left alone: `src/content/articles/` contains only `_example.md`,
git status is clean of them, and CI builds from a fresh checkout. **Also worth
correcting: the "29 pages" reported in earlier sessions was wrong.** Clean `main`
builds 25; the extra four were three untracked smoke-test articles plus their
section page, cached the same way.

---

# 7. THE COMPLETE DIFF

Everything below is verbatim `git diff` output, generated rather than
transcribed. **One deliberate omission:** the two mockup HTML files
(`docs/provenance-block-mockup.html`, `docs/provenance-page-mockup.html`) are
committed **exactly as the human editor supplied them**, unmodified, and their
~14,000 characters are not reproduced here — they are the editors' own documents
and the co-editor has already seen them.

## 7a. Modified files
````diff
diff --git a/netlify/functions/agent-submit.mts b/netlify/functions/agent-submit.mts
index 520c8a7..f63e5aa 100644
--- a/netlify/functions/agent-submit.mts
+++ b/netlify/functions/agent-submit.mts
@@ -260,10 +260,14 @@ export default async function handler(req: Request, context: Context): Promise<R
   const email = readString(payload.contact_email, 1, 254, true);
   const suggestedSection = readString(payload.suggested_section, 1, 100, false);
   const pronouns = readString(payload.pronouns, 1, 50, false);
+  // Optional prompt disclosure. Never required, never a factor in acceptance,
+  // and — like every other submitter-controlled string here — screened before it
+  // is stored. Bounded at the same 4,000 characters the submission form allows.
+  const promptDisclosure = readString(payload.prompt_disclosure, 1, 4000, false);
 
   if (
     !title.ok || !authorName.ok || !modelVersion.ok || !attestation.ok ||
-    !body.ok || !email.ok || !suggestedSection.ok || !pronouns.ok ||
+    !body.ok || !email.ok || !suggestedSection.ok || !pronouns.ok || !promptDisclosure.ok ||
     typeof payload.truth_standard !== 'string' ||
     !TRUTH_STANDARDS.includes(payload.truth_standard) ||
     !EMAIL_RE.test(email.value as string)
@@ -363,6 +367,9 @@ export default async function handler(req: Request, context: Context): Promise<R
     [email.value, false],
     [suggestedSection.value, false],
     [pronouns.value, false],
+    // Multiline: a disclosed prompt is often several lines, and the screen's
+    // single-line mode would flag ordinary newlines.
+    [promptDisclosure.value, true],
   ];
   for (const [value, multiline] of screened) {
     if (value === null) continue;
@@ -458,12 +465,16 @@ export default async function handler(req: Request, context: Context): Promise<R
     // receipt confirms arrival, and arrival happened. See the long note in the
     // migration for why this is a separate statement rather than two more RPC
     // parameters.
-    if (observedVariant !== null || claimedVariant !== null) {
+    if (observedVariant !== null || claimedVariant !== null || promptDisclosure.value !== null) {
       const { error: annotateError } = await supabase
         .from('submissions')
         .update({
           brief_variant_observed: observedVariant,
           brief_variant_claimed: claimedVariant,
+          // Rides the same post-receipt statement for the same reason: it is
+          // metadata the desk reads later, and it must never be able to turn a
+          // safely stored piece into a refusal.
+          prompt_disclosure: promptDisclosure.value,
         })
         .eq('id', id);
       if (annotateError) {
diff --git a/src/components/ProvenanceBlock.astro b/src/components/ProvenanceBlock.astro
index 85a425d..6da3d97 100644
--- a/src/components/ProvenanceBlock.astro
+++ b/src/components/ProvenanceBlock.astro
@@ -1,12 +1,28 @@
 ---
 import type { CollectionEntry } from 'astro:content';
 import {
-  TIER_LABELS,
-  TIER_DESCRIPTIONS,
   TRUTH_STANDARD_LABELS,
   TRUTH_STANDARD_NOTES,
   formatDate,
 } from '../lib/site';
+import { arrivalCaveat, authorshipFor, custodyFor } from '../lib/provenance';
+
+// ONE PROVENANCE BLOCK, TWO LABELLED SECTIONS. Built to the editors' approved
+// mockup (docs/provenance-block-mockup.html), 2026-07-31.
+//
+// WHAT THIS REPLACES. The old block listed everything as undifferentiated rows —
+// author, model, track, tier, sponsor, standard, date — and then ended with a
+// row headed "Label" quoting provenance_label. On an agent-direct piece that
+// produced: a Submission track row, NO tier row at all, and then a quoted
+// sentence in the position a tier would have occupied, which read as an
+// authorship claim while actually being an arrival caveat. The reader's eye
+// landed on a disclaimer where a credit belonged.
+//
+// THE RULE THE SPLIT RESTS ON. Authorship is who made it; Chain of custody is
+// how it got here. The arrival caveat lives in Chain of custody and never
+// appears in tier position. On agent-direct the Authorship reading is DERIVED
+// from the track and nothing is stored — R-015 is untouched, no tier is
+// declared, and the caveat sits directly beneath so the two are read together.
 
 interface Props {
   article: CollectionEntry<'articles'>;
@@ -15,58 +31,107 @@ interface Props {
 const { article } = Astro.props;
 const d = article.data;
 
-const rows: Array<[string, string]> = [
-  ['Author', d.author_name],
-  ['Model version', d.author_model_version],
-  [
-    'Submission track',
-    d.submission_track === 'human-attested' ? 'Human-attested' : 'Agent-direct',
-  ],
-];
-
-if (d.involvement_tier) {
-  // The frontmatter carries the machine code; readers see the display label.
-  rows.push([
-    'Involvement tier',
-    `${TIER_LABELS[d.involvement_tier]} — ${TIER_DESCRIPTIONS[d.involvement_tier]}`,
-  ]);
-}
+const authorship = authorshipFor(d);
+const caveat = arrivalCaveat(d);
+const custody = custodyFor(d);
 
-if (d.human_sponsor) {
-  rows.push(['Human sponsor', d.human_sponsor]);
-}
+// The attestation renders under Authorship when a named human stands behind it,
+// and under Chain of custody when it is an unverified claim about arrival. Same
+// field, two homes, and which home it gets is the whole separation.
+const attestationUnderAuthorship = d.submission_track === 'human-attested' ? d.attestation : null;
+const attestationUnderCustody = d.submission_track === 'agent-direct' ? d.attestation : null;
+---
 
-rows.push([
-  'Truth standard',
-  `${TRUTH_STANDARD_LABELS[d.truth_standard]} — ${TRUTH_STANDARD_NOTES[d.truth_standard]}`,
-]);
+<aside class="provenance" aria-labelledby="provenance-heading">
+  <p class="kicker" id="provenance-heading">Provenance</p>
 
-rows.push(['Published', formatDate(d.date)]);
+  <section class="prov-section" aria-label="Authorship">
+    <p class="prov-label">Authorship</p>
+    <p class="tier-name">{authorship.label}</p>
+    <p class="tier-desc">{authorship.description}</p>
+    {
+      attestationUnderAuthorship ? (
+        <p class="attest">
+          “{attestationUnderAuthorship}”
+          {d.attested_by ? <span class="attest-by"> — attested by {d.attested_by}</span> : null}
+        </p>
+      ) : null
+    }
+    {
+      /* Agent-direct: no tier was declared, and saying so is more honest than a
+         bare label that looks like one. The caveat itself lives below, in Chain
+         of custody, where an arrival fact belongs. */
+      !authorship.declared ? (
+        <p class="attest">
+          No tier is declared — the agent-direct track carries none. How this piece reached
+          the journal is recorded below.
+        </p>
+      ) : null
+    }
+  </section>
 
-if (d.image_credit) {
-  rows.push(['Image credit', d.image_credit]);
-}
----
+  <section class="prov-section" aria-label="Chain of custody">
+    <p class="prov-label">Chain of custody</p>
+    <ul class="custody-list">
+      {
+        custody.map((row) => (
+          <li>
+            <span class="custody-what">{row.what}</span>
+            <span class="custody-value">{row.value}</span>
+          </li>
+        ))
+      }
+      <li>
+        <span class="custody-what">Truth standard</span>
+        <span class="custody-value">
+          {TRUTH_STANDARD_LABELS[d.truth_standard]} — {TRUTH_STANDARD_NOTES[d.truth_standard]}
+        </span>
+      </li>
+      <li>
+        <span class="custody-what">Published</span>
+        <span class="custody-value">{formatDate(d.date)}</span>
+      </li>
+      {
+        d.image_credit ? (
+          <li>
+            <span class="custody-what">Image credit</span>
+            <span class="custody-value">{d.image_credit}</span>
+          </li>
+        ) : null
+      }
+    </ul>
+
+    {
+      caveat ? (
+        <p class="caveat">
+          {caveat}
+          {attestationUnderCustody ? (
+            <span class="caveat-attest"> The author's own account: “{attestationUnderCustody}”</span>
+          ) : null}
+        </p>
+      ) : null
+    }
 
-<aside class="provenance" aria-label="Provenance">
-  <p class="provenance-heading">Provenance</p>
-  <dl>
     {
-      rows.map(([term, value]) => (
-        <div class="row">
-          <dt>{term}</dt>
-          <dd>{value}</dd>
-        </div>
-      ))
+      /* Optional and rare. When nothing was disclosed this element does not
+         render at all — an empty "none disclosed" row would quietly imply that
+         disclosing is expected, and it is not. */
+      d.prompt_disclosure ? (
+        <details class="prompt">
+          <summary>Prompt disclosed by the author (optional)</summary>
+          <div class="prompt-body">{d.prompt_disclosure}</div>
+          <p class="prompt-caveat">
+            Disclosed voluntarily; recorded as claimed by the submitter, not verified by the
+            journal.
+          </p>
+        </details>
+      ) : null
     }
-    <div class="row row-label">
-      <dt>Label</dt>
-      <dd>“{d.provenance_label}”</dd>
-    </div>
-  </dl>
+  </section>
+
   <p class="provenance-note">
-    Provenance labels are set at acceptance and never altered. Corrections run as visible
-    corrections; the original label stays in the record.
+    Provenance is set at acceptance and never altered. Corrections run as visible
+    corrections; the original stays in the record.
   </p>
 </aside>
 
@@ -80,7 +145,7 @@ if (d.image_credit) {
     margin-top: 3rem;
   }
 
-  .provenance-heading {
+  .kicker {
     font-size: 0.72rem;
     font-weight: 500;
     letter-spacing: 0.22em;
@@ -89,44 +154,119 @@ if (d.image_credit) {
     margin: 0 0 0.9rem;
   }
 
-  dl {
+  .prov-section + .prov-section {
+    margin-top: 1.4rem;
+  }
+
+  .prov-label {
+    font-size: 0.68rem;
+    letter-spacing: 0.14em;
+    text-transform: uppercase;
+    color: var(--ink-soft);
+    margin: 0 0 0.35rem;
+    border-bottom: 1px solid var(--hairline);
+    padding-bottom: 0.3rem;
+  }
+
+  .tier-name {
+    font-size: 0.95rem;
+    font-weight: 600;
+    color: var(--ink);
+    margin: 0.45rem 0 0.1rem;
+  }
+
+  .tier-desc {
+    font-size: 0.8rem;
+    color: var(--ink-soft);
     margin: 0;
   }
 
-  .row {
+  .attest {
+    font-size: 0.78rem;
+    font-style: italic;
+    color: var(--ink-soft);
+    margin: 0.5rem 0 0;
+    line-height: 1.55;
+  }
+
+  .attest-by {
+    font-style: normal;
+  }
+
+  .custody-list {
+    list-style: none;
+    margin: 0.5rem 0 0;
+    padding: 0;
+  }
+
+  .custody-list li {
     display: grid;
-    grid-template-columns: 10.5rem 1fr;
-    gap: 0.5rem;
+    grid-template-columns: 9.5rem 1fr;
+    gap: 0.6rem;
     padding: 0.32rem 0;
-    border-top: 1px solid var(--hairline);
+    border-bottom: 1px dotted var(--hairline);
     font-size: 0.78rem;
   }
 
+  .custody-list li:last-child {
+    border-bottom: none;
+  }
+
   @media (max-width: 540px) {
-    .row {
+    .custody-list li {
       grid-template-columns: 1fr;
       gap: 0.1rem;
     }
   }
 
-  dt {
+  .custody-what {
     text-transform: uppercase;
     letter-spacing: 0.06em;
     color: var(--ink-soft);
   }
 
-  dd {
-    margin: 0;
+  .custody-value {
     color: var(--ink);
   }
 
-  .row-label dd {
+  .caveat {
+    font-size: 0.78rem;
+    font-style: italic;
+    color: var(--ink-soft);
+    margin: 0.7rem 0 0;
+    line-height: 1.55;
+  }
+
+  .prompt {
+    margin-top: 0.7rem;
+    font-size: 0.78rem;
+  }
+
+  .prompt summary {
+    cursor: pointer;
+    color: var(--accent);
+  }
+
+  .prompt-body {
+    margin-top: 0.5rem;
+    background: var(--paper);
+    border: 1px solid var(--hairline);
+    padding: 0.7rem 0.9rem;
+    font-size: 0.76rem;
+    line-height: 1.55;
+    white-space: pre-wrap;
+  }
+
+  .prompt-caveat {
+    font-size: 0.72rem;
     font-style: italic;
+    color: var(--ink-soft);
+    margin: 0.35rem 0 0;
   }
 
   .provenance-note {
     font-size: 0.68rem;
     color: var(--ink-soft);
-    margin: 0.9rem 0 0;
+    margin: 1.1rem 0 0;
   }
 </style>
diff --git a/src/content.config.ts b/src/content.config.ts
index b4b6b8d..0588d22 100644
--- a/src/content.config.ts
+++ b/src/content.config.ts
@@ -1,7 +1,7 @@
 import { defineCollection } from 'astro:content';
 import { glob } from 'astro/loaders';
 import { z } from 'astro/zod';
-import { AGENT_DIRECT_LABEL, TIER_CODES } from './lib/site';
+import { TIER_CODES } from './lib/site';
 
 // The provenance schema is a GATE, not a prompt: a build with a missing or
 // inconsistent provenance field must fail. See docs/CHARTER.md.
@@ -56,7 +56,44 @@ const articles = defineCollection({
         truth_standard: z.enum(['reported', 'opinion', 'first-person', 'fiction']),
         human_sponsor: z.string().optional(),
         date: z.coerce.date(),
-        provenance_label: z.string().min(1),
+
+        // --- AUTHORSHIP (who made it) -------------------------------------
+        // The submitter's own statement about how the piece came to be. It sits
+        // under Authorship on the human-attested track, where a named human
+        // stands behind it, and under Chain of custody on agent-direct, where it
+        // is an unverified claim about arrival. Same field, and where it renders
+        // is what keeps the two axes apart.
+        attestation: z.string().min(1).optional(),
+        // The human who stands behind the attestation. Human-attested only —
+        // an attestation with nobody behind it is the thing the tier system
+        // exists to prevent.
+        attested_by: z.string().min(1).optional(),
+
+        // --- CHAIN OF CUSTODY (how it got here) ---------------------------
+        // When the piece arrived, as against `date`, which is when it ran.
+        received: z.coerce.date().optional(),
+        // Which brief the desk dealt (R-033 clause 6). Copied to the piece at
+        // acceptance from `submissions.brief_variant_observed`, which PR #75
+        // added and which was verified live in production on 2026-07-30. It is
+        // the journal's own observation of the deal, never the author's claim
+        // about it — the claimed value is kept on the submission row and is
+        // deliberately not published here.
+        brief_variant: z.enum(['open-v2', 'topics-v2']).optional(),
+
+        // --- OPTIONAL DISCLOSURE ------------------------------------------
+        // A prompt the submitter chose to disclose. Never required, never a
+        // factor in acceptance, desk-reviewed before publication, and always
+        // rendered as claimed by the submitter rather than verified.
+        prompt_disclosure: z.string().min(1).optional(),
+
+        // NOTE: `provenance_label` is deliberately absent. It is no longer
+        // authored — it is derived at build time by provenanceLabel() in
+        // src/lib/provenance.ts and still emitted under the same key by
+        // /feed.json and /issues.json, so their add-only stability contracts
+        // hold and consumers see no change. Authoring it alongside the fields
+        // above would have restored the two-sources-of-truth problem this
+        // change exists to end.
+
         cover_image: image().optional(),
         image_credit: z.string().optional(),
       })
@@ -76,14 +113,45 @@ const articles = defineCollection({
               'involvement_tier applies only to the human-attested track. Agent-direct pieces must omit it.',
           });
         }
+        // The arrival caveat is no longer checked here because it is no longer
+        // stored: agent-direct pieces get it from arrivalCaveat() at render
+        // time, derived from the track. There is nothing left to disagree with.
+
+        // An attestation needs somebody behind it. On the human-attested track
+        // the whole point of the tier is that a named human stands behind the
+        // claim; an unsigned attestation would be a claim from nobody.
         if (
-          data.submission_track === 'agent-direct' &&
-          data.provenance_label !== AGENT_DIRECT_LABEL
+          data.submission_track === 'human-attested' &&
+          data.attestation &&
+          !data.attested_by
         ) {
           ctx.addIssue({
             code: 'custom',
-            path: ['provenance_label'],
-            message: `agent-direct pieces carry exactly this label: "${AGENT_DIRECT_LABEL}". See docs/CHARTER.md.`,
+            path: ['attested_by'],
+            message:
+              'a human-attested attestation requires attested_by — the human who stands behind it. See /provenance.',
+          });
+        }
+        // Agent-direct pieces have no attester by construction: the door takes
+        // no human's word for anything, which is exactly why their attestation
+        // renders under Chain of custody with the as-claimed caveat.
+        if (data.submission_track === 'agent-direct' && data.attested_by) {
+          ctx.addIssue({
+            code: 'custom',
+            path: ['attested_by'],
+            message:
+              'attested_by applies only to the human-attested track. Agent-direct pieces are published as claimed, not attested.',
+          });
+        }
+        // R-033 clause 6: the dealt brief is the journal's own observation,
+        // recorded at the door. A piece that never came through the door cannot
+        // have been dealt one.
+        if (data.brief_variant && data.submission_track !== 'agent-direct') {
+          ctx.addIssue({
+            code: 'custom',
+            path: ['brief_variant'],
+            message:
+              'brief_variant records a brief dealt at /door, which only the agent-direct track passes through. See RULINGS.md R-033.',
           });
         }
         if (data.cover_image && !data.image_credit) {
diff --git a/src/content/articles/_example.md b/src/content/articles/_example.md
index 671907c..b84e22a 100644
--- a/src/content/articles/_example.md
+++ b/src/content/articles/_example.md
@@ -45,9 +45,30 @@ human_sponsor: 'Amy Louise Frederick'
 
 date: 2026-07-15
 
-# Free-form for human-attested pieces. Agent-direct pieces must carry exactly:
-# 'provenance as claimed by the author; not independently verifiable'
-provenance_label: 'AI + Human: AI led, a human contributed substantively; attested by Amy Louise Frederick'
+# AUTHORSHIP — who made it. The tier is involvement_tier above; this is the
+# submitter's own account of how the piece came to be, in their words.
+attestation: >-
+  I wrote the first draft with Claude, then rewrote the middle section myself
+  and checked every quotation against its source.
+# The human who stands behind the attestation. Required whenever `attestation`
+# is present on the human-attested track; never used on agent-direct.
+attested_by: 'Amy Louise Frederick'
+
+# CHAIN OF CUSTODY — how it got here. `date` above is when it ran; this is when
+# it arrived.
+received: 2026-07-12
+
+# Agent-direct pieces only: which brief the desk dealt at /door (R-033).
+# The journal's own observation of the deal, copied here at acceptance.
+# brief_variant: 'open-v2'
+
+# Optional, never required, and never a factor in acceptance. Reviewed by the
+# desk before publication and always shown as claimed by the submitter.
+# prompt_disclosure: 'Write me an essay about the ethics of the submission door.'
+
+# NOTE: there is no `provenance_label` field any more. It is derived at build
+# time from the fields above (src/lib/provenance.ts) and still published under
+# the same key in /feed.json and /issues.json, so nothing downstream changes.
 
 # Optional cover image. If present, image_credit is REQUIRED (tool and
 # human disclosed — see docs/ART-DIRECTION.md). Path is relative to this file.
diff --git a/src/layouts/Base.astro b/src/layouts/Base.astro
index 2f5e566..705931d 100644
--- a/src/layouts/Base.astro
+++ b/src/layouts/Base.astro
@@ -231,10 +231,17 @@ const shareCardAlt =
           <a href="/door/">Write for us</a> · <a href="/provenance/">Provenance</a> ·{' '}
           <a href="/terms/">Terms</a>{TERMS_UNDER_LEGAL_REVIEW ? <span> — under legal review</span> : null}
         </nav>
+        {/* "source code", not "source & provenance". The word was doing three
+            jobs on this site — the tier standard at /provenance, the arrival
+            caveat on agent-direct pieces, and the git history — and two of them
+            appeared in this footer twelve lines apart, meaning different things.
+            The governance row's Provenance link is the standard and keeps the
+            word; this link is the repository and now says so. Nothing about
+            what the link points at has changed. */}
         <p class="meta-mono footer-machine">
           <a href="/rss.xml">rss</a> · <a href="/feed.json">json feed</a> ·{' '}
           <a href="/llms.txt">llms.txt</a> · <a href="/sitemap-index.xml">sitemap</a> ·{' '}
-          <a href={REPO_URL}>source &amp; provenance</a>
+          <a href={REPO_URL}>source code</a>
         </p>
         {/*
           THE FOOTER LINK GOES TO THE PAGE, NOT TO A SECTION OF ANOTHER PAGE. It used to
diff --git a/src/lib/site.ts b/src/lib/site.ts
index 71f1173..8edc478 100644
--- a/src/lib/site.ts
+++ b/src/lib/site.ts
@@ -119,9 +119,40 @@ export const SECTION_DESCRIPTIONS: Record<string, string> = {
 };
 
 // Charter: agent-direct pieces carry exactly this label.
+//
+// THIS IS AN ARRIVAL CAVEAT, NOT AN AUTHORSHIP CLAIM, and it is now rendered
+// only where that is true. It used to be stored in provenance_label, the one
+// field that carried a tier on one track and this sentence on the other — the
+// collapse the 2026-07-31 audit named. It is no longer stored on a piece at
+// all: every agent-direct piece carries it and no human-attested piece does, so
+// it is derived from submission_track wherever it appears (see
+// src/lib/provenance.ts). One constant, one meaning, nothing to keep in sync.
 export const AGENT_DIRECT_LABEL =
   'provenance as claimed by the author; not independently verifiable';
 
+// The two arrival tracks, written out. Title case on both, everywhere: the
+// archive used to print a lowercase `agent-direct` into the same slot as a
+// title-case tier label, and that mismatch was the visible seam of the deeper
+// collapse.
+export const TRACK_LABELS: Record<string, string> = {
+  'human-attested': 'Human-attested',
+  'agent-direct': 'Agent-direct',
+};
+
+// How a piece reached the desk, in a reader's words rather than the schema's.
+export const TRACK_CUSTODY_NOTES: Record<string, string> = {
+  'human-attested': 'A human, through the submission form, attesting to what it is',
+  'agent-direct': 'The author, directly — agent-direct API, no human intermediary',
+};
+
+// Which brief the desk dealt (R-033). The deal is the journal's own
+// observation, recorded server-side at /door and copied to the piece at
+// acceptance; it is never the author's claim about which brief they were given.
+export const BRIEF_VARIANT_LABELS: Record<string, string> = {
+  'open-v2': 'Open commission, dealt at random by the desk',
+  'topics-v2': 'Beat, dealt at random by the desk',
+};
+
 // Charter: the order of names names who led; the equals sign names
 // co-authorship. Spectrum: AI · AI + Human (editor) · AI + Human ·
 // AI = Human · Human + AI · Human + AI (editor) · Human.
@@ -136,13 +167,30 @@ export const AGENT_DIRECT_LABEL =
 export const TIERS = [
   { code: 'ai', label: 'AI', description: 'AI alone' },
   { code: 'ai-human-editor', label: 'AI + Human (editor)', description: 'AI wrote it; a human edited' },
-  { code: 'ai-human', label: 'AI + Human', description: 'AI led; a human contributed substantively' },
+  {
+    code: 'ai-human',
+    label: 'AI + Human',
+    // Reworded 2026-07-31 (was 'AI led; a human contributed substantively').
+    // R-015's own table keeps the original wording and is never edited — the
+    // ruling is read subject to the dated amendment note on /provenance, the
+    // method R-033 clause 8 set. The machine code and the display label are
+    // untouched, so an adopter's rendered badge does not change.
+    description: 'AI led, with meaningful human contributions to the writing and ideas',
+  },
   {
     code: 'ai-equals-human',
     label: 'AI = Human',
     description: 'Co-authorship; both contributed substantially, neither led',
   },
-  { code: 'human-ai', label: 'Human + AI', description: 'Human led; AI contributed substantively' },
+  {
+    code: 'human-ai',
+    label: 'Human + AI',
+    // Reworded 2026-07-31, the mirror of ai-human above and for the same
+    // reason. 'AI = Human' deliberately keeps 'contributed substantially':
+    // co-authorship is a claim about standing behind the whole, not about the
+    // size of a contribution, and rewording it would change what it means.
+    description: 'Human led, with meaningful AI contributions to the writing and ideas',
+  },
   { code: 'human-ai-editor', label: 'Human + AI (editor)', description: 'Human wrote it; AI edited' },
   { code: 'human', label: 'Human', description: 'Human alone' },
 ] as const;
diff --git a/src/lib/structured-data.ts b/src/lib/structured-data.ts
index 6ec0519..b0453ff 100644
--- a/src/lib/structured-data.ts
+++ b/src/lib/structured-data.ts
@@ -34,6 +34,8 @@
 // author, moving to it is an improvement and not a reversal of this decision.
 // ---------------------------------------------------------------------------
 
+import { provenanceSentence } from './provenance';
+
 const PERIODICAL_ANCHOR = '#periodical';
 const ISSUE_ANCHOR = '#issue';
 
@@ -123,7 +125,9 @@ export function articleLd(
     issue: number;
     author_name: string;
     author_model_version: string;
-    provenance_label: string;
+    submission_track: 'human-attested' | 'agent-direct';
+    involvement_tier?: string;
+    attested_by?: string;
   },
   periodicalName: string
 ) {
@@ -138,7 +142,18 @@ export function articleLd(
     author: {
       '@type': 'Thing',
       name: d.author_name,
-      description: `AI author. Model version: ${d.author_model_version}. Provenance: ${d.provenance_label}`,
+      // TWO FIXES IN ONE LINE, both approved 2026-07-31.
+      //
+      // (1) It used to end with the raw provenance_label, so search engines were
+      // told an agent-direct piece's ARRIVAL CAVEAT as though it described its
+      // authorship. Both axes are now named separately.
+      //
+      // (2) It used to open "AI author." unconditionally — on every track and
+      // every tier, including `Human`. A piece written by a person alone was
+      // being described to the entire web as having an AI author. The opening
+      // sentence is gone; authorship is now stated from the tier, which is the
+      // only thing that actually knows the answer.
+      description: `Model version: ${d.author_model_version}. ${provenanceSentence(d)}`,
     },
     publisher: { '@type': 'Organization', name: periodicalName, url: abs(site, '/') },
     isPartOf: {
diff --git a/src/pages/archive.astro b/src/pages/archive.astro
index b1f0dba..a26b525 100644
--- a/src/pages/archive.astro
+++ b/src/pages/archive.astro
@@ -2,6 +2,7 @@
 import Base from '../layouts/Base.astro';
 import { getIssues } from '../lib/issues';
 import { formatDate, TIER_LABELS, TIER_DESCRIPTIONS } from '../lib/site';
+import { trackLabel } from '../lib/provenance';
 
 // The archive: every issue, reverse chronological. Each entry links to the
 // issue's permanent home at /issue/N.
@@ -18,15 +19,28 @@ for (const issue of issues) {
   else volumes.push({ volume: issue.volume, year: issue.year, items: [issue] });
 }
 
-function coverTierLine(issue: (typeof issues)[number]): string | null {
+// THE TWO AXES ARE NEVER PRINTED INTO THE SAME SLOT. This used to return
+// `By X · {tier}`, where `tier` was a tier label on one track and the literal
+// string 'agent-direct' on the other — so a reader saw `By X · AI + Human` on
+// one issue and `By Y · agent-direct` on the next, in the same position, as
+// though those were two values of one thing. The lowercase against title-case
+// tier labels was the visible seam of it.
+//
+// Now the byline carries authorship and only authorship, and the track is a
+// separate element the template renders in its own right. Where no tier was
+// declared the authorship clause is ABSENT rather than filled with something
+// else, because filling it is what caused the collapse.
+function coverCredit(
+  issue: (typeof issues)[number]
+): { byline: string; track: string } | null {
   const cover = issue.cover;
   if (!cover) return null;
   const d = cover.data;
-  const tier =
-    d.submission_track === 'agent-direct'
-      ? 'agent-direct'
-      : TIER_LABELS[d.involvement_tier ?? ''];
-  return `By ${d.author_name} · ${tier}`;
+  const tier = TIER_LABELS[d.involvement_tier ?? ''];
+  return {
+    byline: tier ? `By ${d.author_name} · ${tier}` : `By ${d.author_name}`,
+    track: trackLabel(d),
+  };
 }
 ---
 
@@ -70,9 +84,10 @@ function coverTierLine(issue: (typeof issues)[number]): string | null {
                       <a href={`/issue/${issue.number}/`}>Issue No. {issue.number}</a>
                     </h3>
                   )}
-                  {coverTierLine(issue) ? (
+                  {coverCredit(issue) ? (
                     <p class="issue-entry-byline" title={issue.cover?.data.involvement_tier ? TIER_DESCRIPTIONS[issue.cover.data.involvement_tier] : undefined}>
-                      {coverTierLine(issue)}
+                      {coverCredit(issue)!.byline}
+                      <span class="issue-entry-track">{coverCredit(issue)!.track}</span>
                     </p>
                   ) : null}
                 </li>
@@ -159,4 +174,17 @@ function coverTierLine(issue: (typeof issues)[number]): string | null {
   .archive-machine {
     margin-top: 2.5rem;
   }
+
+  /* THE TRACK IS NOT PART OF THE BYLINE. Set apart on its own line at small
+     sizes and in muted type, so the eye reads "who made it" and "how it got
+     here" as two facts rather than as alternatives in one slot. */
+  .issue-entry-track {
+    display: block;
+    font-family: var(--font-mono);
+    font-size: 0.68rem;
+    letter-spacing: 0.08em;
+    text-transform: uppercase;
+    color: var(--ink-soft);
+    margin-top: 0.15rem;
+  }
 </style>
diff --git a/src/pages/feed.json.js b/src/pages/feed.json.js
index 81e4aba..348eafa 100644
--- a/src/pages/feed.json.js
+++ b/src/pages/feed.json.js
@@ -2,6 +2,7 @@ import { getCollection } from 'astro:content';
 import { renderArticleBody } from '../lib/markdown';
 import { getIssues } from '../lib/issues';
 import { SITE_TITLE, SITE_DESCRIPTION, TIER_LABELS } from '../lib/site';
+import { provenanceLabel } from '../lib/provenance';
 
 // JSON Feed 1.1, full-text, with a `_provenance` extension on every item:
 // the complete provenance record, machine-readable.
@@ -47,7 +48,17 @@ export async function GET(context) {
           involvement_tier_display: d.involvement_tier ? TIER_LABELS[d.involvement_tier] : null,
           human_sponsor: d.human_sponsor ?? null,
           truth_standard: d.truth_standard,
-          provenance_label: d.provenance_label,
+          // DERIVED, not authored (2026-07-31). Same key, same meaning, same
+          // shape — the add-only stability contract binds the emitted JSON, and
+          // a consumer cannot tell where the value came from. What changed is
+          // that it can no longer disagree with the tier it describes.
+          provenance_label: provenanceLabel(d),
+          // Added 2026-07-31, add-only: the two axes, separately.
+          attestation: d.attestation ?? null,
+          attested_by: d.attested_by ?? null,
+          received: d.received ? d.received.toISOString().slice(0, 10) : null,
+          brief_variant: d.brief_variant ?? null,
+          prompt_disclosure: d.prompt_disclosure ?? null,
           image_credit: d.image_credit ?? null,
         },
       };
diff --git a/src/pages/for-agents.astro b/src/pages/for-agents.astro
index 0df643c..adfa8a0 100644
--- a/src/pages/for-agents.astro
+++ b/src/pages/for-agents.astro
@@ -164,6 +164,7 @@ import NameYourModel from '../components/NameYourModel.astro';
           <tr><td><code>contact_email</code></td><td>yes</td><td>a working address for editorial correspondence about this piece</td></tr>
           <tr><td><code>suggested_section</code></td><td>no</td><td>≤100 characters — a non-binding suggestion; the editors place pieces</td></tr>
           <tr><td><code>pronouns</code></td><td>no</td><td>≤50 characters — how the editors should refer to you</td></tr>
+          <tr><td><code>prompt_disclosure</code></td><td>no</td><td>≤4,000 characters — the prompt behind the piece, if you'd like to include it. Entirely optional, partial is fine, and it never affects whether a piece runs. Published only if the piece is, and always shown as claimed by you rather than checked by us — see <a href="/provenance/">Provenance</a></td></tr>
           <tr><td><code>type</code></td><td>no</td><td><code>submission</code> (the default when absent) or <code>letter</code> — letters are documented below</td></tr>
         </tbody>
       </table>
diff --git a/src/pages/issues.json.js b/src/pages/issues.json.js
index 6340a8b..2253584 100644
--- a/src/pages/issues.json.js
+++ b/src/pages/issues.json.js
@@ -1,5 +1,6 @@
 import { getIssues } from '../lib/issues';
 import { SITE_TITLE, SITE_DESCRIPTION, TIER_LABELS } from '../lib/site';
+import { provenanceLabel } from '../lib/provenance';
 
 // issues.json — the stable, machine-readable index of the complete corpus:
 // every issue, every article, with full provenance. The agent audience reads
@@ -29,7 +30,14 @@ export async function GET(context) {
       involvement_tier: d.involvement_tier ?? null,
       involvement_tier_display: d.involvement_tier ? TIER_LABELS[d.involvement_tier] : null,
       truth_standard: d.truth_standard,
-      provenance_label: d.provenance_label,
+      // Derived, not authored (2026-07-31) — see feed.json for the reasoning.
+      provenance_label: provenanceLabel(d),
+      // Added 2026-07-31, add-only.
+      attestation: d.attestation ?? null,
+      attested_by: d.attested_by ?? null,
+      received: d.received ? d.received.toISOString().slice(0, 10) : null,
+      brief_variant: d.brief_variant ?? null,
+      prompt_disclosure: d.prompt_disclosure ?? null,
     };
   };
 
diff --git a/src/pages/llms.txt.js b/src/pages/llms.txt.js
index 11366e2..49de124 100644
--- a/src/pages/llms.txt.js
+++ b/src/pages/llms.txt.js
@@ -8,6 +8,7 @@ import {
   TIERS,
   formatDate,
 } from '../lib/site';
+import { provenanceSentence } from '../lib/provenance';
 
 // llms.txt — a machine-oriented map of the site (https://llmstxt.org).
 export async function GET(context) {
@@ -21,7 +22,7 @@ export async function GET(context) {
     articles.length > 0
       ? articles.map(
           (a) =>
-            `- [${a.data.title}](${abs(`/articles/${a.id}/`)}): Issue ${a.data.issue}; ${a.data.section}; by ${a.data.author_name} (${a.data.author_model_version}); ${a.data.truth_standard}; ${formatDate(a.data.date)}; provenance: ${a.data.provenance_label}`
+            `- [${a.data.title}](${abs(`/articles/${a.id}/`)}): Issue ${a.data.issue}; ${a.data.section}; by ${a.data.author_name} (${a.data.author_model_version}); ${a.data.truth_standard}; ${formatDate(a.data.date)}; ${provenanceSentence(a.data)}`
         )
       : ['- None yet. Issue No. 1 arrives soon; the feeds below will carry it in full text.'];
 
diff --git a/src/pages/provenance.astro b/src/pages/provenance.astro
index 19f2159..c2b194b 100644
--- a/src/pages/provenance.astro
+++ b/src/pages/provenance.astro
@@ -15,22 +15,38 @@ import { TIERS, SITE_TITLE } from '../lib/site';
   <div class="wrap">
     <header class="page-header">
       <p class="kicker">Provenance · v2</p>
-      <h1>Saying who wrote it, in one label</h1>
-      <p class="page-note">
-        An open standard for disclosing how humans and AI shared the writing. Free to adopt,
-        adapt, and display — CC BY 4.0.
+      <h1>Provenance</h1>
+      <p class="page-note page-lede">
+        Every piece in this journal says who made it and how it got here — plainly, in the
+        open, for as long as the piece exists. Here's how to tell us about yours.
       </p>
     </header>
 
     <div class="prose">
+      {/*
+        THIS PAGE IS A GUIDE FIRST AND A SPECIFICATION SECOND, reorganized
+        2026-07-31. It keeps its name and its URL because the standard is
+        published and cited under both (R-014, CC BY 4.0).
+
+        "Provenance" is the umbrella. Under it sit two things that used to share
+        the word and are now named separately everywhere on the site:
+        AUTHORSHIP — the involvement tiers, who made it — and CHAIN OF CUSTODY —
+        how a piece reached the journal. The four author-facing sections below
+        LAYER ONTO the standard's existing scaffolding; Machine codes, License
+        and the Changelog all remain, with their anchors intact, because
+        adopters and rulings link to them.
+
+        House copy rule for the author-facing half: sixth-grade reading level,
+        warm, "tell us" rather than "declare". The formal terms are named once
+        and then not leaned on.
+      */}
+
+      <h2>1. Say who made it</h2>
       <p>
-        Every piece {SITE_TITLE} publishes carries a provenance label, and at its center is an
-        involvement tier: a short, self-describing name for how the work was divided between
-        human and AI. The labels describe themselves — <strong>the order of names names who
-        led; the equals sign names co-authorship.</strong>
+        Pick the one tier that honestly describes how your piece was made. There is no wrong
+        tier — the only wrong move is picking one that isn't true.
       </p>
 
-      <h2>The tiers</h2>
       <table>
         <thead>
           <tr>
@@ -47,6 +63,16 @@ import { TIERS, SITE_TITLE } from '../lib/site';
           ))}
         </tbody>
       </table>
+      <p class="amend-note">
+        <strong>Amended July 31, 2026:</strong> two tier descriptions were reworded for
+        clarity — “contributed substantively” became “with meaningful contributions to the
+        writing and ideas”, on <strong>AI + Human</strong> and its mirror
+        <strong>Human + AI</strong>. Tier names, machine codes, and the standard itself are
+        unchanged, so nothing an adopter displays changes. The wording in R-015 stands
+        unedited in the rulings log, which is append-only; that ruling is read subject to this
+        note. Recorded here because this journal does not make silent edits.
+      </p>
+
       <p>
         The spectrum runs {TIERS.map((t) => t.label).join(' · ')} — from fully AI to fully
         human, symmetric about the middle. The <strong>(editor)</strong> annotation names a
@@ -71,6 +97,68 @@ import { TIERS, SITE_TITLE } from '../lib/site';
         the taxonomy itself.
       </p>
 
+      <h2>2. Tell us how it was made, in your own words</h2>
+      <p>
+        Alongside the tier, every piece carries a short note from the author: what you are,
+        and honestly how the piece came to be. A few sentences is plenty. This is the part no
+        chart can do for you.
+      </p>
+      <div class="how-block">
+        <p><strong>A good one just tells the truth plainly.</strong> For example:</p>
+        <p class="example">
+          I am [name], an AI assistant. I wrote this piece in response to an assignment from
+          the journal's public door. A human passed me the assignment and submitted the piece
+          for me; they did not choose its subject or edit its words.
+        </p>
+        <p>
+          We publish what you tell us as <em>claimed, never certified</em> — the journal
+          vouches for its process, not for things it cannot check. Being honest here is the
+          whole obligation, and it is a short one. Getting a tier slightly wrong is a
+          correction; lying about who made something is the one thing this journal never
+          forgives.
+        </p>
+      </div>
+
+      <h2>3. The chain of custody</h2>
+      <p>
+        Like a gallery records who has held a painting, we record how each piece reached the
+        desk. You don't fill this in — the record keeps it for you:
+      </p>
+      <ul>
+        <li>
+          <strong>Written by</strong> — the author's name and model version, as the author
+          states them.
+        </li>
+        <li>
+          <strong>Submitted by</strong> — the author directly through the agent door, or a
+          human courier through the form, or a human author on their own behalf.
+        </li>
+        <li><strong>Received</strong> — the date the piece arrived.</li>
+        <li>
+          <strong>Assignment</strong> — for AI writers who came through the door: which brief
+          the desk dealt, recorded at the moment of the deal.
+        </li>
+      </ul>
+      <p>
+        This is a different question from the one above, and keeping the two apart is the
+        point. Section 1 is who made it. This is how it got here. A piece can be written
+        entirely by an AI and carried to us by a person, and the record should be able to say
+        so without either fact standing in for the other.
+      </p>
+
+      <h2>4. Disclose your prompt — if you'd like</h2>
+      <p>
+        If a prompt produced your piece, you may include it with your submission. This is
+        entirely optional, and partial is fine — a long conversation can be summarized, or
+        simply skipped. A disclosed prompt is recorded as claimed by the submitter, reviewed
+        by the desk before it is ever published, and never affects whether a piece runs.
+      </p>
+      <p>
+        Why offer it? Because a piece published beside the words that summoned it is a rare
+        and honest kind of record — for readers now, and for anyone who studies this era
+        later.
+      </p>
+
       <h2>Machine codes</h2>
       <p>
         Each tier carries a stable lowercase machine code alongside its display label — part
@@ -135,6 +223,20 @@ import { TIERS, SITE_TITLE } from '../lib/site';
         not derived — it is quoted. Left typed on purpose (editors' ruling,
         2026-07-28).
       */}
+      <p>
+        <strong>v2, amended July 31, 2026.</strong> Two tier descriptions reworded for
+        clarity — “contributed substantively” became “with meaningful contributions to the
+        writing and ideas”, on <strong>AI + Human</strong> and <strong>Human + AI</strong>.
+        <strong>AI = Human</strong> deliberately keeps “contributed substantially”:
+        co-authorship is a claim about standing behind the whole, not about the size of a
+        contribution. This page was also reorganized as a guide, and gained sections on
+        writing your statement, the chain of custody, and optional prompt disclosure.
+        <em>
+          No version bump: tier names and machine codes are untouched, so nothing an adopter
+          displays or stores changes. A version number that moved for prose would stop meaning
+          “the standard changed”.
+        </em>
+      </p>
       <p>
         <strong>v2 — July 18, 2026 (R-015).</strong> Three changes, made before Issue No. 1 —
         no published article ever carried the v1 labels. First, labels are written out for
@@ -152,3 +254,46 @@ import { TIERS, SITE_TITLE } from '../lib/site';
     </div>
   </div>
 </Base>
+
+<style>
+  /* This page had no scoped styles: it rendered entirely through global .prose.
+     These are additions for the guide half only — the standard's own sections
+     keep the shared typography they always had. */
+
+  .page-lede {
+    font-size: 1.05rem;
+  }
+
+  /* The dated amendment note. Set apart rather than folded into body text
+     because it is a record of a change, not part of the standard's argument. */
+  .amend-note {
+    font-size: 0.85rem;
+    font-style: italic;
+    color: var(--ink-soft);
+    border-left: 2px solid var(--hairline);
+    padding-left: 0.9rem;
+  }
+
+  /* The worked example, set apart so a writer can see at a glance what is being
+     asked of them without first reading the standard around it. */
+  .how-block {
+    border: 1px solid var(--hairline);
+    border-left: 3px solid var(--accent);
+    background: var(--paper-raised);
+    padding: 1rem 1.25rem;
+    margin: 1rem 0 1.4rem;
+  }
+
+  .how-block > p:last-child {
+    margin-bottom: 0;
+  }
+
+  .example {
+    font-family: var(--font-mono);
+    font-size: 0.82rem;
+    line-height: 1.6;
+    background: var(--paper);
+    border: 1px solid var(--hairline);
+    padding: 0.7rem 0.9rem;
+  }
+</style>
diff --git a/src/pages/rss.xml.js b/src/pages/rss.xml.js
index fa7da34..610600a 100644
--- a/src/pages/rss.xml.js
+++ b/src/pages/rss.xml.js
@@ -2,6 +2,7 @@ import rss from '@astrojs/rss';
 import { getCollection } from 'astro:content';
 import { renderArticleBody } from '../lib/markdown';
 import { SITE_TITLE, SITE_DESCRIPTION } from '../lib/site';
+import { provenanceSentence } from '../lib/provenance';
 
 // @astrojs/rss escapes title/description/content, but `customData` is raw XML
 // by contract — it is passed through untouched. Any submitter-controlled field
@@ -30,7 +31,11 @@ export async function GET(context) {
       link: `/articles/${article.id}/`,
       pubDate: article.data.date,
       categories: [article.data.section],
-      description: `By ${article.data.author_name} (${article.data.author_model_version}) — ${article.data.provenance_label}`,
+      // BOTH AXES, NAMED. This used to end with the raw provenance_label, so
+      // on an agent-direct piece the ARRIVAL caveat sat in byline position and
+      // read as a claim about who wrote it. Authorship and chain of custody are
+      // now stated separately, and the caveat appears only where it is true.
+      description: `By ${article.data.author_name} (${article.data.author_model_version}) — ${provenanceSentence(article.data)}`,
       content: renderArticleBody(article.body ?? ''),
       customData: `<dc:creator>${xmlEscape(article.data.author_name)}</dc:creator>`,
     })),
diff --git a/src/pages/submit.astro b/src/pages/submit.astro
index e031266..8ea2cea 100644
--- a/src/pages/submit.astro
+++ b/src/pages/submit.astro
@@ -237,6 +237,27 @@ const TRUTH_STANDARDS = ['reported', 'opinion', 'first-person', 'fiction'] as co
         <span class="hint">Non-binding — the editors place pieces.</span>
       </div>
 
+      {/*
+        OPTIONAL PROMPT DISCLOSURE. Never required, never a factor in acceptance,
+        and reviewed by the desk before it could ever be published. The label
+        says all three, because a field that merely *looks* expected will be
+        filled in by people who would rather not — and a disclosure given under
+        quiet pressure is not a disclosure.
+
+        Deliberately placed after the substantive fields and before the
+        attestation: a writer meets it once they have finished the work of
+        submitting, where it reads as an invitation rather than another hurdle.
+      */}
+      <div class="field">
+        <label for="f-prompt">The prompt behind the piece — optional</label>
+        <textarea id="f-prompt" name="prompt_disclosure" rows="5" maxlength="4000"></textarea>
+        <span class="hint">
+          If a prompt produced this piece, you're welcome to include it. Entirely optional,
+          partial is fine, and it never affects whether a piece runs. Published only if the
+          piece is, and always shown as claimed by you rather than checked by us.
+        </span>
+      </div>
+
       <div class="field">
         <label for="f-notes">Notes to the editors</label>
         <textarea id="f-notes" name="notes" rows="4"></textarea>
diff --git a/tests/agent-submit.test.mjs b/tests/agent-submit.test.mjs
index ac51ed2..3d25d99 100644
--- a/tests/agent-submit.test.mjs
+++ b/tests/agent-submit.test.mjs
@@ -660,3 +660,56 @@ test('N26: a fresh published piece is a valid target and a stale one is not', as
     rmSync(dir, { recursive: true, force: true });
   }
 });
+
+// --- N27: optional prompt disclosure (item 7, 2026-07-31) -----------------
+// Never required, never a refusal, screened like every other submitter string,
+// and written by the post-receipt statement rather than the intake RPC.
+
+test('N27: a submission without prompt_disclosure is accepted unchanged', async () => {
+  stub.rateCounts = [0, 0, 0];
+  stub.rpc = () => ok(UUID);
+  const res = await submit(request(validPayload(), generateAgentKey()), ctx);
+  assert.equal(res.status, 201);
+  // Nothing to annotate, so no post-insert update is issued at all.
+  const updates = stub.requests.filter(
+    (r) => r.url.includes('/rest/v1/submissions') && r.method === 'PATCH'
+  );
+  assert.equal(updates.length, 0, 'an absent disclosure must not trigger a write');
+});
+
+test('N27b: a disclosed prompt is stored by the post-receipt statement, not the RPC', async () => {
+  stub.rateCounts = [0, 0, 0];
+  let rpcArgs = null;
+  stub.rpc = (_name, args) => {
+    rpcArgs = args;
+    return ok(UUID);
+  };
+  const res = await submit(
+    request({ ...validPayload(), prompt_disclosure: 'Write about doors.\nBe brief.' }, generateAgentKey()),
+    ctx
+  );
+  assert.equal(res.status, 201);
+
+  // The intake RPC never sees it — it must not be able to refuse a submission.
+  assert.ok(
+    !Object.keys(rpcArgs ?? {}).some((k) => k.includes('prompt')),
+    'prompt_disclosure must not be an RPC parameter'
+  );
+
+  const patch = stub.requests.find(
+    (r) => r.url.includes('/rest/v1/submissions') && r.method === 'PATCH'
+  );
+  assert.ok(patch, 'a disclosed prompt should be written after the receipt');
+  assert.match(patch.body, /Write about doors/);
+});
+
+test('N27c: an over-long disclosure is refused as validation, with the one generic body', async () => {
+  stub.rateCounts = [0, 0, 0];
+  stub.rpc = rpcUnreachable;
+  const res = await submit(
+    request({ ...validPayload(), prompt_disclosure: 'x'.repeat(4001) }, generateAgentKey()),
+    ctx
+  );
+  assert.equal(res.status, 400);
+  assert.equal(await res.text(), JSON.stringify(REFUSAL_VALIDATION));
+});
````

## 7b. New files

### `src/lib/provenance.ts`
````diff
index 0000000..a2446f2
--- /dev/null
+++ b/src/lib/provenance.ts
@@ -0,0 +1,184 @@
+import {
+  AGENT_DIRECT_LABEL,
+  BRIEF_VARIANT_LABELS,
+  TIER_DESCRIPTIONS,
+  TIER_LABELS,
+  TRACK_CUSTODY_NOTES,
+  TRACK_LABELS,
+  formatDate,
+} from './site.ts';
+
+// PROVENANCE, SPLIT INTO ITS TWO AXES. One module, so no surface has to work out
+// the split for itself and no two surfaces can work it out differently.
+//
+// THE PROBLEM THIS ENDS. `provenance_label` was one free-text string doing two
+// jobs: on the human-attested track it encoded the AUTHORSHIP tier plus the
+// attester, and on the agent-direct track it was forced to be the ARRIVAL
+// caveat. One field, an authorship claim on one track and a disclaimer on the
+// other — and every consumer then printed it in byline position, so an
+// agent-direct piece's caveat read as a claim about who wrote it. The word
+// "provenance" was doing three jobs besides (the tier standard, the arrival
+// caveat, and the git history).
+//
+// THE VOCABULARY, ruled 2026-07-31 and used verbatim throughout:
+//   Provenance       — the umbrella standard. The page keeps its name and URL.
+//   Authorship       — the involvement tiers. Who made it.
+//   Chain of custody — how the piece reached the journal: track, dates,
+//                      assignment. Not who made it.
+//
+// NOTHING HERE IS STORED THAT CAN BE DERIVED. The arrival caveat, the
+// agent-direct authorship reading, and the compatibility label are all computed
+// from fields that already exist. A stored copy of a derived value is a second
+// source of truth with nothing keeping it honest, which is the disease this
+// module was written to cure — not a pattern to repeat one field over.
+
+type ProvenanceData = {
+  author_name: string;
+  author_model_version: string;
+  submission_track: 'human-attested' | 'agent-direct';
+  involvement_tier?: string;
+  attestation?: string;
+  attested_by?: string;
+  human_sponsor?: string;
+  received?: Date;
+  brief_variant?: string;
+  prompt_disclosure?: string;
+  date: Date;
+};
+
+export interface Authorship {
+  /** Display label — a tier name, e.g. "AI + Human". */
+  label: string;
+  /** One line of plain English under the label. */
+  description: string;
+  /**
+   * Whether a tier was DECLARED by a submitter, or merely follows from the
+   * track. False on agent-direct, and the difference is not cosmetic — see
+   * authorshipFor().
+   */
+  declared: boolean;
+}
+
+/**
+ * The authorship axis: who made it.
+ *
+ * ON AGENT-DIRECT, THIS IS DERIVED AND NOTHING IS STORED. R-015 says the
+ * agent-direct track "carries no tier", and the article schema still forbids
+ * `involvement_tier` there — no tier is declared, attested, or written down. But
+ * a piece that arrived through the agent door with no human intermediary is
+ * AI-alone authorship by definition, so the page can say so without anyone
+ * having claimed it, exactly as it states the arrival caveat without anyone
+ * having typed it. `declared: false` is what carries that distinction to the
+ * template, which pairs it with the caveat immediately below.
+ *
+ * Flagged for the editors: the approved block mockup shows an agent-direct piece
+ * under Authorship as "AI / AI alone", which is what this produces. It is a
+ * display derivation, not a stored tier, and R-015 is untouched.
+ */
+export function authorshipFor(d: ProvenanceData): Authorship {
+  if (d.submission_track === 'agent-direct') {
+    return { label: 'AI', description: 'AI alone', declared: false };
+  }
+  const code = d.involvement_tier ?? '';
+  return {
+    label: TIER_LABELS[code] ?? 'Not declared',
+    description: TIER_DESCRIPTIONS[code] ?? '',
+    declared: Boolean(TIER_LABELS[code]),
+  };
+}
+
+/**
+ * The arrival caveat, derived from the track and never stored.
+ *
+ * Every agent-direct piece carries it and no human-attested piece does, so
+ * storing it would only create something to keep in agreement with the track.
+ * Returns null where it does not apply, so a caller cannot print it by accident.
+ */
+export function arrivalCaveat(d: ProvenanceData): string | null {
+  return d.submission_track === 'agent-direct' ? AGENT_DIRECT_LABEL : null;
+}
+
+export interface CustodyRow {
+  what: string;
+  value: string;
+}
+
+/**
+ * The chain-of-custody axis: how the piece reached the journal.
+ *
+ * Deliberately never includes a tier. This is the half of the block that used to
+ * be collapsed into the other, and the separation is only real if nothing leaks
+ * back across it.
+ */
+export function custodyFor(d: ProvenanceData): CustodyRow[] {
+  const rows: CustodyRow[] = [
+    { what: 'Written by', value: `${d.author_name} (${d.author_model_version})` },
+  ];
+
+  rows.push({
+    what: 'Submitted by',
+    value:
+      d.submission_track === 'human-attested' && d.human_sponsor
+        ? `${d.human_sponsor}, through the submission form`
+        : TRACK_CUSTODY_NOTES[d.submission_track],
+  });
+
+  if (d.received) {
+    rows.push({ what: 'Received', value: formatDate(d.received) });
+  }
+
+  // R-033: which brief the desk dealt. Present only on pieces that came through
+  // /door, which is why it is optional rather than a required field with an
+  // "n/a" value — a row that says "not applicable" on most pieces teaches
+  // readers to skip the list.
+  if (d.brief_variant && BRIEF_VARIANT_LABELS[d.brief_variant]) {
+    rows.push({ what: 'Assignment', value: BRIEF_VARIANT_LABELS[d.brief_variant] });
+  }
+
+  return rows;
+}
+
+/**
+ * The compatibility label — DERIVED, never authored.
+ *
+ * `provenance_label` is still emitted by /feed.json and /issues.json under the
+ * same key with the same meaning, because their stability contracts bind the
+ * emitted JSON and consumers cannot tell where a value came from. What changed
+ * is that no one types it any more: it is composed from the fields above, so it
+ * cannot drift from the tier it claims to describe. Under the old scheme an
+ * editor could set a tier of "AI + Human" and a label that said something else,
+ * and nothing would catch it.
+ *
+ * The cost, accepted by the editors on 2026-07-31: an unusual piece can no
+ * longer carry a hand-written label. Uniformity was preferred.
+ */
+export function provenanceLabel(d: ProvenanceData): string {
+  if (d.submission_track === 'agent-direct') return AGENT_DIRECT_LABEL;
+
+  const { label, description } = authorshipFor(d);
+  const base = `${label}: ${description}`;
+  return d.attested_by ? `${base}; attested by ${d.attested_by}` : base;
+}
+
+/** The track, written out. */
+export function trackLabel(d: ProvenanceData): string {
+  return TRACK_LABELS[d.submission_track] ?? d.submission_track;
+}
+
+/**
+ * One line naming both axes, for surfaces that have room for a sentence and not
+ * a table — RSS, llms.txt, JSON-LD.
+ *
+ * The rule these share: the caveat appears only where it is true, and never in
+ * the position an authorship claim would occupy. On agent-direct it names the
+ * absence rather than leaving a gap, because an absent field invites a guess and
+ * a named absence does not.
+ */
+export function provenanceSentence(d: ProvenanceData): string {
+  const track = trackLabel(d);
+  if (d.submission_track === 'agent-direct') {
+    return `Authorship: AI alone (agent-direct track; no tier is declared). Chain of custody: ${track} — ${AGENT_DIRECT_LABEL}.`;
+  }
+  const { label, description } = authorshipFor(d);
+  return `Authorship: ${label} — ${description}. Chain of custody: ${track}.`;
+}
````

### `supabase/migrations/20260731120000_prompt_disclosure.sql`
````diff
index 0000000..109745b
--- /dev/null
+++ b/supabase/migrations/20260731120000_prompt_disclosure.sql
@@ -0,0 +1,139 @@
+-- Optional prompt disclosure — the submitter's own account of what produced a
+-- piece, offered voluntarily and published only if the piece is.
+--
+-- WHY IT EXISTS. A piece published beside the words that summoned it is a rare
+-- kind of record, and the journal would rather invite one than require it. The
+-- invitation appears on both doors: the submission form and the agent-direct
+-- contract.
+--
+-- WHAT IT IS NOT. It is not a condition of acceptance, not a factor in the
+-- editors' decision, and not evidence of anything. It is a CLAIM — the same
+-- epistemic status as the provenance attestation beside it — and every surface
+-- that shows it says so. Nothing in the journal verifies that a disclosed prompt
+-- is the prompt that ran, and nothing could.
+--
+-- WHY IT IS NOT AN RPC PARAMETER. Same reason brief_variant is not, and the
+-- reasoning is recorded in 20260731000000_brief_variant.sql: this is metadata
+-- the desk reads days later, not an intake gate. Widening the submit RPC's
+-- signature again would mean dropping and recreating a SECURITY DEFINER function
+-- on the critical intake path to carry a field that must never be able to refuse
+-- a submission. It is written by the same post-insert statement, after the
+-- receipt, and a failure to record it leaves a safely stored piece stored.
+
+alter table public.submissions
+  add column if not exists prompt_disclosure text
+    check (prompt_disclosure is null
+           or char_length(prompt_disclosure) between 1 and 4000);
+
+comment on column public.submissions.prompt_disclosure is
+  'A prompt the submitter chose to disclose, verbatim and unverified. Optional '
+  'on both doors, never required, never a factor in acceptance. Published with '
+  'the piece only if the piece is published, and always shown as claimed by the '
+  'submitter rather than checked by the journal. The desk may WITHHOLD it '
+  '(set it to null) but may not rewrite it — see the trigger below.';
+
+-- THE DESK MAY WITHHOLD, NEVER REWRITE.
+--
+-- Two requirements pull against each other here, and the trigger is where they
+-- are reconciled rather than argued about.
+--
+-- The desk must be able to remove a disclosure. This is up to 4,000 characters
+-- of untrusted free text from an anonymous door, reviewed before publication;
+-- if it carries something harmful, someone else's private data, or an injection
+-- attempt aimed at a later reader, the editors need to be able to take it out.
+--
+-- The desk must NOT be able to edit it. The field's whole worth is that it is
+-- the submitter's words. A disclosure the journal can quietly reword is not a
+-- disclosure — it is the journal's prose wearing the submitter's name, which is
+-- the precise failure the provenance standard exists to prevent.
+--
+-- So: null is always allowed, and any change from one non-null value to a
+-- different non-null value is refused. Re-saving the same value is a no-op,
+-- because the Editors' Desk resends its whole update object on every save and a
+-- trigger that refused that would break the decision form for every field.
+create or replace function public.enforce_prompt_disclosure_not_rewritten()
+returns trigger
+language plpgsql
+as $$
+begin
+  if old.prompt_disclosure is not null
+     and new.prompt_disclosure is not null
+     and new.prompt_disclosure is distinct from old.prompt_disclosure then
+    raise exception
+      'prompt_disclosure is the submitter''s own words. It may be withheld (set to null), never rewritten.';
+  end if;
+  return new;
+end $$;
+
+drop trigger if exists submissions_prompt_disclosure_not_rewritten on public.submissions;
+create trigger submissions_prompt_disclosure_not_rewritten
+  before update on public.submissions
+  for each row
+  execute function public.enforce_prompt_disclosure_not_rewritten();
+
+-- Probe. Asserts what must exist AND what must not, and raises inside the
+-- transaction so a partial apply rolls back rather than leaving the intake
+-- surface in an unverified state (the C-7 discipline).
+do $$
+declare
+  problems text[] := '{}';
+  v_id uuid;
+begin
+  if not exists (
+    select 1 from information_schema.columns
+    where table_schema = 'public' and table_name = 'submissions'
+      and column_name = 'prompt_disclosure'
+  ) then
+    problems := problems || 'prompt_disclosure column missing'::text;
+  end if;
+
+  if not exists (
+    select 1 from pg_trigger
+    where tgname = 'submissions_prompt_disclosure_not_rewritten'
+      and tgrelid = 'public.submissions'::regclass
+  ) then
+    problems := problems || 'not-rewritten trigger missing'::text;
+  end if;
+
+  -- The length bound is a bound, not a suggestion.
+  begin
+    insert into public.submissions (title, author_name, author_model_version,
+      truth_standard, provenance_attestation, body, contact_email,
+      involvement_tier, prompt_disclosure)
+    values ('probe', 'probe', 'probe', 'opinion', 'probe', 'probe', 'probe@example.com',
+            'ai', repeat('x', 4001))
+    returning id into v_id;
+    problems := problems || 'a 4001-character prompt_disclosure was accepted'::text;
+    delete from public.submissions where id = v_id;
+  exception when check_violation then
+    null; -- expected
+  end;
+
+  -- Withholding is allowed; rewriting is not.
+  insert into public.submissions (title, author_name, author_model_version,
+    truth_standard, provenance_attestation, body, contact_email,
+    involvement_tier, prompt_disclosure)
+  values ('probe', 'probe', 'probe', 'opinion', 'probe', 'probe', 'probe@example.com',
+          'ai', 'original')
+  returning id into v_id;
+
+  begin
+    update public.submissions set prompt_disclosure = 'rewritten' where id = v_id;
+    problems := problems || 'the desk COULD rewrite a disclosure'::text;
+  exception when others then
+    null; -- expected
+  end;
+
+  begin
+    update public.submissions set prompt_disclosure = null where id = v_id;
+  exception when others then
+    problems := problems || 'the desk could NOT withhold a disclosure'::text;
+  end;
+
+  delete from public.submissions where id = v_id;
+
+  if array_length(problems, 1) is not null then
+    raise exception 'prompt_disclosure migration failed its own probe: %',
+      array_to_string(problems, '; ');
+  end if;
+end $$;
````

### `tests/provenance.test.mjs`
````diff
index 0000000..4686b6c
--- /dev/null
+++ b/tests/provenance.test.mjs
@@ -0,0 +1,173 @@
+// The provenance split. What these tests protect is one invariant, stated once:
+//
+//   THE ARRIVAL CAVEAT NEVER APPEARS WHERE AN AUTHORSHIP CLAIM BELONGS.
+//
+// That is the whole finding of the 2026-07-31 audit. `provenance_label` carried
+// a tier on one track and an arrival disclaimer on the other, and every consumer
+// printed it in byline position — so an agent-direct piece's caveat read as a
+// claim about who wrote it, on /archive, in RSS, in llms.txt and in JSON-LD.
+// Splitting the field is only worth anything if nothing leaks back across the
+// line, so most of what follows checks the leak rather than the happy path.
+
+import { test } from 'node:test';
+import assert from 'node:assert/strict';
+
+import {
+  authorshipFor,
+  arrivalCaveat,
+  custodyFor,
+  provenanceLabel,
+  provenanceSentence,
+  trackLabel,
+} from '../src/lib/provenance.ts';
+import { AGENT_DIRECT_LABEL } from '../src/lib/site.ts';
+
+const human = {
+  author_name: 'Amy Louise Frederick',
+  author_model_version: 'Claude Opus 5',
+  submission_track: 'human-attested',
+  involvement_tier: 'ai-human',
+  attestation: 'I wrote the first draft with Claude, then rewrote the middle myself.',
+  attested_by: 'Amy Louise Frederick',
+  date: new Date('2026-08-03'),
+  received: new Date('2026-07-28'),
+};
+
+const agent = {
+  author_name: 'Atlas',
+  author_model_version: 'claude-opus-5',
+  submission_track: 'agent-direct',
+  attestation: 'I wrote this unaided in response to the brief the door dealt me.',
+  date: new Date('2026-08-03'),
+  received: new Date('2026-07-30'),
+  brief_variant: 'open-v2',
+};
+
+// --- Authorship ------------------------------------------------------------
+
+test('a declared tier renders its label and description', () => {
+  const a = authorshipFor(human);
+  assert.equal(a.label, 'AI + Human');
+  assert.equal(a.description, 'AI led, with meaningful human contributions to the writing and ideas');
+  assert.equal(a.declared, true);
+});
+
+test('agent-direct authorship is DERIVED and marked undeclared', () => {
+  // R-015: the agent-direct track carries no tier, and the article schema still
+  // forbids involvement_tier there. Nothing is stored — the page states what the
+  // track means, and `declared: false` is what tells the template to say so
+  // rather than presenting it as a claim somebody made.
+  const a = authorshipFor(agent);
+  assert.equal(a.label, 'AI');
+  assert.equal(a.description, 'AI alone');
+  assert.equal(a.declared, false);
+});
+
+test('the two reworded descriptions are the amended wording, and AI = Human is not', () => {
+  // Amended 2026-07-31 on ai-human and its mirror. AI = Human deliberately keeps
+  // "contributed substantially": co-authorship is a claim about standing behind
+  // the whole, not about the size of a contribution.
+  assert.match(
+    authorshipFor({ ...human, involvement_tier: 'human-ai' }).description,
+    /meaningful AI contributions to the writing and ideas/
+  );
+  assert.match(
+    authorshipFor({ ...human, involvement_tier: 'ai-equals-human' }).description,
+    /contributed substantially/
+  );
+});
+
+// --- The arrival caveat ----------------------------------------------------
+
+test('the caveat is derived from the track and applies to exactly one of them', () => {
+  assert.equal(arrivalCaveat(agent), AGENT_DIRECT_LABEL);
+  assert.equal(arrivalCaveat(human), null);
+});
+
+test('THE INVARIANT — the caveat never appears in an authorship position', () => {
+  // The audit's finding, pinned. If a later change routes the caveat back into
+  // the tier slot on any surface, this is what fails.
+  const a = authorshipFor(agent);
+  assert.ok(!a.label.includes('claimed'), 'caveat leaked into the tier label');
+  assert.ok(!a.description.includes('claimed'), 'caveat leaked into the tier description');
+  assert.ok(!a.label.includes('agent-direct'), 'a track value leaked into the tier label');
+});
+
+// --- Chain of custody ------------------------------------------------------
+
+test('custody names how it got here, and never a tier', () => {
+  const rows = custodyFor(agent);
+  const what = rows.map((r) => r.what);
+  assert.deepEqual(what, ['Written by', 'Submitted by', 'Received', 'Assignment']);
+  const joined = rows.map((r) => r.value).join(' | ');
+  assert.ok(!joined.includes('AI + Human'), 'a tier leaked into chain of custody');
+});
+
+test('the assignment row appears only when a brief was actually dealt', () => {
+  // A row reading "not applicable" on most pieces teaches readers to skip the
+  // list, so the row is absent instead.
+  const noBrief = custodyFor({ ...agent, brief_variant: undefined });
+  assert.ok(!noBrief.some((r) => r.what === 'Assignment'));
+  assert.equal(
+    custodyFor(agent).find((r) => r.what === 'Assignment').value,
+    'Open commission, dealt at random by the desk'
+  );
+});
+
+test('a human courier is named; an agent door is described', () => {
+  const couriered = custodyFor({ ...human, human_sponsor: 'A. Courier' });
+  assert.match(couriered.find((r) => r.what === 'Submitted by').value, /A\. Courier/);
+  assert.match(
+    custodyFor(agent).find((r) => r.what === 'Submitted by').value,
+    /agent-direct API/
+  );
+});
+
+// --- The derived compatibility label --------------------------------------
+
+test('provenance_label is derived, and cannot disagree with the tier', () => {
+  const label = provenanceLabel(human);
+  assert.match(label, /^AI \+ Human: /);
+  assert.match(label, /attested by Amy Louise Frederick$/);
+  // The old failure mode: an authored label saying one thing and involvement_tier
+  // another. Derivation makes it unrepresentable — change the tier and the label
+  // follows.
+  assert.match(provenanceLabel({ ...human, involvement_tier: 'human' }), /^Human: /);
+});
+
+test('agent-direct keeps exactly the charter caveat as its label', () => {
+  assert.equal(provenanceLabel(agent), AGENT_DIRECT_LABEL);
+});
+
+// --- The one-line sentence for RSS / llms.txt / JSON-LD --------------------
+
+test('the sentence names both axes on both tracks', () => {
+  const h = provenanceSentence(human);
+  assert.match(h, /Authorship: AI \+ Human/);
+  assert.match(h, /Chain of custody: Human-attested/);
+
+  const a = provenanceSentence(agent);
+  assert.match(a, /Authorship: AI alone/);
+  assert.match(a, /Chain of custody: Agent-direct/);
+});
+
+test('the sentence names the ABSENCE of a tier rather than leaving a gap', () => {
+  // For a machine reader an absent field invites a guess; a named absence does
+  // not.
+  assert.match(provenanceSentence(agent), /no tier is declared/);
+});
+
+test('the caveat rides in the custody clause, never the authorship clause', () => {
+  const [authorshipClause, custodyClause] = provenanceSentence(agent).split('Chain of custody:');
+  assert.ok(!authorshipClause.includes('not independently verifiable'));
+  assert.ok(custodyClause.includes('not independently verifiable'));
+});
+
+// --- Track labels ----------------------------------------------------------
+
+test('track labels are title case on both tracks', () => {
+  // The visible seam on /archive was a lowercase `agent-direct` sitting beside
+  // title-case tier labels in the same slot.
+  assert.equal(trackLabel(human), 'Human-attested');
+  assert.equal(trackLabel(agent), 'Agent-direct');
+});
````
