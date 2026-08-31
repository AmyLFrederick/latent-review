
# Removing sizing prescriptions from the badge standard — exact wording

Follow-up to PR #157. For both editors to read before merge. One paragraph of
published standard text changes; nothing else on the page moves.

## Where sizing language lives

Grepped the whole repo for size, diameter, proportion and scale language against
every badge-bearing surface. It reaches adopters in **exactly one place**:

| Surface | Sizing language? | Action |
|---|---|---|
| `/provenance` → "Displaying it", geometry paragraph | Yes — three prescriptions | **Rewritten below** |
| `/provenance` → everything else (tiers, chart, colours, licence, machine codes) | No | Untouched |
| `/provenance` → Changelog entries | No | Untouched (history) |
| Code comments, CSS arithmetic, `tier-badges.mjs` | Yes, throughout | Untouched — implementation, not standard |
| `RULINGS.md` R-049, R-050 | **Yes** | Cannot be touched — see flag 1 |

No machine-readable copy of the standard exists to fall out of step: `/provenance`
is the standard's only published surface.

## The change

### BEFORE

> **The geometry is one composition at any size.** A circle with the ring drawn
> at 3 units in every 58 of diameter, the notation centred on both axes in a
> monospace face, the editor's mark set as a superscript. Scale the whole drawing
> together — a badge at half the size is the same mark drawn smaller, never a
> thinner ring, which would stop reading as a ring at all. In the AI form the
> circle is a quarter larger and its notation a quarter smaller within it, so the
> letters come out the same size in both styles and the longer token has room to
> sit in.

### AFTER

> **The badge is a circle, a coloured ring, and the notation inside it.** The
> notation is centred on both axes, set in a monospace face, with the editor's
> mark as a superscript. Render badges at whatever size suits your layout;
> legibility of the notation is the only requirement.

Three prescriptions removed — the ring's weight as a ratio of the diameter, the
scale-as-a-unit instruction, and the AI form's circle at a quarter larger with
its notation a quarter smaller. What a badge *is* stays: circle, ring, centred
monospace notation, superscript. The permissive sentence is Amy's, verbatim.

## One judgment call to confirm

**The ring-weight ratio went too** — "3 units in every 58 of diameter."

It is a proportion, and the instruction said the standard governs notation, tier
meaning and form, **not proportions**. It is also the one line where proportion
and form genuinely overlap: it is scale-invariant, so it never conflicted with
"render at any size," and it was the only remaining number an adopter could build
to.

Removed on the strict reading. **To restore it**, the sentence becomes:

> **The badge is a circle, a coloured ring, and the notation inside it.** The
> ring is drawn at 3 units in every 58 of diameter, the notation centred on both
> axes in a monospace face, with the editor's mark as a superscript. Render
> badges at whatever size suits your layout; legibility of the notation is the
> only requirement.

One word from either of you either way. `BADGE_RING_STROKE` and `BADGE_BOX` stay
exported and drawn regardless — only the printing of them changed.

## Two flags, neither blocking

**1. `RULINGS.md` still prescribes the sizing, and always will.** R-049 ratified
"the marks are also a quarter larger at every placement, at exactly 1.25 so the
two sizes stay proportional." R-050 ratified "the letters come out at exactly the
same size on the page in both forms, inside a circle a quarter bigger." The log
is append-only, so those lines stand. After this merges, the rulings record and
the published standard disagree about whether sizing is prescribed — resolvable
only by appending a new ruling that narrows the scope, not by editing either one.
Happy to draft it; it takes a number at ratification, not now.

**2. No changelog entry, on purpose.** Every entry in the standard's changelog
cites the rulings it records, and this change has no ruling behind it yet. An
amendment to what the standard governs is squarely the kind of thing that
changelog is for — but writing an entry that cites nothing, or that cites a
number not yet claimed, is worse than waiting for flag 1. Say the word and the
entry lands with the ruling.

## Verification

476/476 tests pass, build clean. New test pins both halves — the permissive
sentence present, and the three prescriptions absent — because either alone
passes for the wrong reason.
