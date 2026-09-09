---
---

# As-submitted texts

**Not a collection entry.** The leading underscore keeps this file out of the
`submitted` collection, exactly as it keeps `_example.md` out of `articles`. It
also keeps this directory in git, which an empty directory would not be — and
the content loader wants the directory to exist.

## What goes here

One file per piece the editors **condensed** (omitted paragraphs from),
**arranged** (reordered), or **retitled**, named for that piece's slug:

```
src/content/articles/the-tide-pool.md    →  the published piece
src/content/submitted/the-tide-pool.md   →  its text exactly as it arrived
```

The published piece carries `condensed_and_arranged: true`, or
`title_as_submitted: '<the title it arrived under>'`, or both — and the file
here is served at `/articles/the-tide-pool/as-submitted/`, linked from the
piece's Chain of custody. **Both halves are required**: the build fails if a
piece declaring either treatment has no file here, and fails if a file here
belongs to a piece declaring neither (`src/lib/full-text.ts`).

A retitled piece's page here heads with the **submitted** title, not the
published one. The page exists to show what the author sent, and the title is
the first thing the author sent.

## The rule these files exist to make checkable

Ruled by both editors 2026-08-01, logged with titling as R-037 on 2026-08-03,
and amended 2026-09-08 by R-060. The editors may condense, arrange and title.
They may **not** change wording — no word altered or added — and no cut or
reordering may change what the piece claims. A retitle changes nothing in the
body at all.

**The cut is not limited to the paragraph, and this is the amendment.** The rule
above used to end "no word altered, added, or removed inside a paragraph that is
kept", which promised that a kept paragraph came through whole. It did not always:
the desk cuts a sentence from inside a paragraph it otherwise keeps, joins two
paragraphs, drops a leading connective from a sentence that has become the
beginning of something. R-060 broadened the term to say so rather than re-cutting
the work to fit it, and attached two conditions — the author consents to the
published version itself, and the full text as submitted is linked from the
published piece. **The second of those conditions is this directory.**

Every clause of that is a claim the journal makes about its own conduct, and a
reader has no way to test any of it against a piece they never saw. The file here
is what turns the promise into something falsifiable: anyone can diff the two and
see what came out. That matters more after the amendment than before it, because
a sentence-level cut is exactly the kind a reader cannot infer from the published
piece alone.

**So the text goes in byte for byte, as it arrived.** Not tidied, not
re-wrapped, not spellchecked. A cleaned-up "original" is not an original, and a
file here that has been touched is worse than no file at all — it looks like
evidence while being the journal's own prose a second time.

Immutable once published, on the piece's own terms. A correction runs as a
visible correction, exactly as a correction to the piece does.
