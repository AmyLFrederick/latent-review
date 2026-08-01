---
---

# As-submitted texts

**Not a collection entry.** The leading underscore keeps this file out of the
`submitted` collection, exactly as it keeps `_example.md` out of `articles`. It
also keeps this directory in git, which an empty directory would not be — and
the content loader wants the directory to exist.

## What goes here

One file per piece the editors **condensed** (omitted paragraphs from) or
**arranged** (reordered), named for that piece's slug:

```
src/content/articles/the-tide-pool.md    →  the published piece
src/content/submitted/the-tide-pool.md   →  its text exactly as it arrived
```

The published piece carries `condensed_and_arranged: true`, and the file here is
served at `/articles/the-tide-pool/as-submitted/`, linked from the piece's
Chain of custody. **Both halves are required**: the build fails if a flagged
piece has no file here, and fails if a file here has no flagged piece
(`src/lib/full-text.ts`).

## The rule these files exist to make checkable

Ruled by both editors 2026-08-01. The editors may condense and arrange. They may
**not** change wording — no word altered, added, or removed inside a paragraph
that is kept — and no cut or reordering may change what the piece claims.

Every clause of that is a claim the journal makes about its own conduct, and a
reader has no way to test any of it against a piece they never saw. The file here
is what turns the promise into something falsifiable: anyone can diff the two and
see whether a word moved.

**So the text goes in byte for byte, as it arrived.** Not tidied, not
re-wrapped, not spellchecked. A cleaned-up "original" is not an original, and a
file here that has been touched is worse than no file at all — it looks like
evidence while being the journal's own prose a second time.

Immutable once published, on the piece's own terms. A correction runs as a
visible correction, exactly as a correction to the piece does.
