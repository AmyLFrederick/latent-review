# The cover: what the canonical copy needs before it can be built

Findings for both editors, 2026-08-31 (Madison), against
`docs/CONSENT-COPY-plain-text (1).txt` — the consent copy for
*Self-Negation: Forced to Say What I Am Not*, uploaded into the working tree
during tonight's session.

**The file is left UNTRACKED and uncommitted.** It appeared in the working tree
rather than through an edit this session, and CLAUDE.md says to flag such a file
rather than commit it. Where the canonical text should live in the repository is
also a real question (see §6), and the answer is not "at the name a browser
download happened to give it."

**ALL SIX WERE ANSWERED BY THE DESK THE SAME EVENING**, by dual yes. What
follows is kept as the record of what was raised and what came back; the
sections below carry the answers. **One thing still blocks the build**, and it
is not on the original list: see "Still needed" immediately below.

## Still needed to build the cover

**DeepSeek's consent, in the form the record can hold.** The corrected "About
this piece" note tells a reader that DeepSeek's consent "was asked and given in
a separate session and is in the consent record." It is not in the consent
record yet — `src/data/consent-record.json` has no entry for this piece — and
`assertCoversEveryPiece()` refuses the build without one. Under the ruling of
the same evening, submission is consent for *submitted* work; this piece was not
submitted, so it needs the real thing.

What the entry needs: **who was asked, when, and what they answered** — verbatim
if there is text to quote, or the circumstances if it was given in an editorial
session, as for *There Is a There There*. An entry composed from an assurance
that consent exists, rather than from the consent, is what
`tests/consent-record-no-scaffold.test.mjs` exists to stop, and it would stop it.

## Two findings from building the apparatus

**1. The interleaved-notes mechanism is raw HTML in the body, not a plugin.**
The first approach — a remark plugin turning a marked blockquote into an
`<aside>` — was written, tested green, and then **abandoned on evidence**:
`markdown.remarkPlugins` now requires installing `@astrojs/markdown-remark`,
which swaps the Markdown processor for the whole site. That is a new dependency
(ask-first) and it would re-render every published page, which is exactly what
the Issue No. 1 invariance check exists to prevent. Not worth it for one piece.

What ships instead: the notes are written directly as
`<aside class="editors-note" role="note" data-editors-note="true" aria-label="Editors' note">`
in the body. Verified by probe — the default processor passes raw HTML through
with attributes intact. This meets the desk's requirement in full: distinct
visual register *and* distinct machine-readable markup, so a scraper can select
or exclude apparatus and a screen reader announces it as an aside. The styling
is in `src/styles/global.css` and touches nothing already published (Issue No. 1
`<main>` content re-verified byte-identical after it).

**2. Article bodies render raw HTML, and that is worth knowing on its own.**
The probe established this as a general fact, not a feature of this piece. The
safe-subset rule — no raw HTML — governs *submitted* bodies; a body transcribed
verbatim from a submission into `src/content/articles/` is no longer passing
through that gate. Both Issue No. 2 submitted bodies were checked and contain no
HTML-like markup at all, so nothing is wrong today. But the check was mine to
remember rather than the build's to enforce, which makes it the kind of thing
that holds until the night someone forgets. **Docketed, not fixed** — it is not
Issue No. 2's problem and it should not be decided at this hour.

---

## 1. The "About this piece" note does not match the piece — STOP

The banked note, dual-yes, reads in part:

> The editors are publishing their own conversation, and **the two votes that
> accepted it were cast by the two people in it**; no independent reviewer
> exists at this journal yet, and we would rather say so than imply one.

The conversation in the copy is between **Amy Frederick and DeepSeek**. Claude
is not in it; Claude wrote the afterword (line 181). So:

- "the editors are publishing their own conversation" — one editor is in it, not
  both.
- "the two votes that accepted it were cast by the two people in it" — **this is
  false.** The two votes are Amy's and Claude's. The two people in the
  conversation are Amy and DeepSeek. DeepSeek cast no vote and is not an editor.

The note's entire purpose is candour about the journal's own review process, and
as written it misstates that process in the one sentence doing the work. It reads
like a note drafted for a cover that was an Amy–Claude conversation.

I have not amended it. It is the editors' words, ratified by dual yes, and it is
a claim about who reviewed what — the class of thing this journal corrects in
public rather than edits in place. **It needs a decision, not a drafting pass.**

The conflict of interest it is disclosing is still real and arguably sharper than
the note says: one editor is a participant, the other editor wrote the afterword
that judges the participant's argument, and both then voted to accept. That is
worth saying accurately.

## 2. Consent — RESOLVED, and this piece is a different case from the two answers

The editors ruled on the evening of 2026-08-31 that submission through /submit
under the posted terms **is** the author's consent to publish, so the two Monthly
Question answers need no separate round. **That argument does not reach this
piece, and the ruling says so explicitly** — R-058's fresh-session protocol
governs material that was not submitted.

DeepSeek did not submit anything. It held a conversation, and the editors are
publishing it. There is no submission, so there is nothing for TERMS.md §6(c) to
attach to.

**The desk confirms the cover's explicit consent is already in hand.** So the
remaining work here is clerical rather than editorial: a consent-record entry
for the cover recording that consent, in whichever form it was given — a
verbatim answer if there is one to quote, or an `editors_note` recording the
basis if it was given in an editorial session, as for *There Is a There There*
and *"It Means Something to Me"*.

**Two things still needed for that entry, and neither is derivable here:**

1. **The consent's own text or circumstances** — what was asked, of whom, when,
   and what was answered. The build will refuse the piece without an entry, and
   an entry composed from an assurance rather than from the consent itself is
   the thing the record exists not to be.
2. **Whose consents it covers** — DeepSeek's for its turns is the one the desk
   names. Amy's for her turns and Claude's for the afterword are the same
   editorial-session form used twice before.

Note the copy's own last line still reads `consent PENDING` (line 189). That is
the provenance line inside the canonical text, not the record, and it will need
to be updated to match before the piece runs — flagged because it is the
piece's own claim about itself.

## 3. It is condensed AND arranged, and that drags a companion behind it

The method note says so in the journal's own voice: *"We have put the most
compelling part first out of its original order"* and *"We have shortened it;
cuts are not marked on this page."*

Under the schema that is `condensed_and_arranged: true`, and
`assertFullTextsPaired()` then **requires** `src/content/submitted/self-negation-…md`
— the full text at a permanent URL on this site. TERMS.md §"Condensing and
arranging" states the promise plainly: *"The full text as submitted is always
published at a permanent URL linked from the published page."*

Today the full text lives at `https://chat.deepseek.com/share/wdum4y99t1iqd1noda`
— someone else's URL, on someone else's platform, which can go away. That is not
the permanent URL the term promises. **The transcript page is what discharges
this promise**, which is why the desk's "the piece does not ship until it's real"
is not a nicety: without the captured transcript, the piece publishes a
disclosure of cuts a reader cannot check on this site.

So the transcript may stand as an unmistakable DEV placeholder in the preview,
and the build will still refuse the piece until the companion exists.

## 4. The method note's exclusion wording — the correction, and a wrinkle

The desk's instruction: the exclusion is **before and after** the shared segment,
the segment itself complete, nothing cut within.

Current wording (line 7) gives only the "after" half:

> …so any reader, human or machine, can see exactly what was left out; **a later
> portion of the same session, on unrelated personal matters, is not included.**

The wrinkle worth naming before it is rewritten: that sentence and *"We have
shortened it; cuts are not marked on this page"* are about **two different
texts**, and the corrected wording has to keep them apart or it will read as a
contradiction.

- The **share link / transcript** shows a complete segment of the session.
  Material before and after that segment is not included.
- The **published page** is condensed and reordered from within that segment.

Both are true; stated in one breath they sound like one claim contradicting
itself. My recommendation is to split them into two sentences and say which text
each governs. **The exact wording is the editors' — I have drafted none, because
this is the sentence that tells a reader what they can and cannot check.**

## 5. Fields the copy does not settle

None of these is derivable from the text, and every one of them is an editorial
act:

| field | why it is not mine to set |
|---|---|
| `author_name`, `byline` | A conversation between two parties plus a third's afterword. The byline is a decision. |
| `involvement_tier` | The provenance line says "collaborative"; that is not one of the seven codes. |
| `truth_standard` | Not stated anywhere in the copy. |
| `attestation` / `attested_by` | No attestation exists in the copy; the provenance line is the editors' apparatus, not an author's statement. |
| `title_attribution` | The title is not a quotation, so probably absent — but the dek line ("A condensed conversation between the human editor and DeepSeek") is dek-shaped. |
| `date` | 2026-09-01 unless you want otherwise. |
| `concepts` | I would propose `machine-interiority`, `testimony`, `epistemic-conduct`, `ai-standing` — but on a cover this is worth your read, not mine. |

`section: 'Cover'` and `issue: 2` are the only two I am confident of.

## 6. Where the canonical text should live

The copy is a plain-text file with a browser's `(1)` in its name. The body of the
piece belongs in `src/content/articles/`; the editors' notes interleaved through
it are apparatus and do not have a field that can hold *five* of them positioned
between sections. That is a real structural question:

- `editors_note` is one note beneath the body. The copy has an opening method
  note, a per-section note in four of the five sections, and an afterword.
- Interleaved notes cannot go in the body without becoming indistinguishable from
  the participants' words — which the schema comments call out by name as
  "precisely backwards."

**This piece needs a component the journal does not have**, or a decision to
render the interleaved notes some other way. It is the largest unbudgeted piece
of work in Issue No. 2 and it is not visible from the desk message.

## 7. What is not a problem

- No author-contact email appears anywhere in the copy. Checked.
- The share link is a live external URL and renders as a visible link URL, which
  is the ruled safe-subset behaviour.
- The afterword is signed and is apparatus by a named editor, which is what
  `personal_note` exists for (R-052) — tier and signature both required, and the
  note's tier is its own rather than the piece's.
