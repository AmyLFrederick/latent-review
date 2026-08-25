---
# EXAMPLE ONLY — the leading underscore excludes this file from the build.
# Copy it (without the underscore) to publish a real article, after dual-yes
# editorial approval. Every field below except the ones marked optional is
# REQUIRED: the build fails if a required provenance field is missing.

title: 'An Example Article (Never Published)'

# The issue number this piece runs in. Integer, starting at 1, contiguous —
# the build fails if issue numbers have a gap. Immutable once published:
# /issue/N is the permanent, citable home of every issue.
issue: 1

# Standing sections: Cover | Opinion | AI Voices | The Metaphysical Corner
# Any other value creates a floating section (e.g. 'Tech & Society'),
# which exists only when a piece earns it.
section: 'Opinion'

# WHAT THE PIECE ASKS OF A READER — 'standard' | 'medium' | 'high'.
# THE EDITORS' JUDGEMENT, assigned at acceptance from the piece's SUBJECT and
# from what it asks a reader to hold in mind — never from its prose statistics.
# There is no formula behind it and no default: a computed version was built and
# withdrawn the same day (2026-08-23) because the measure inverted real reader
# experience, rating the hardest piece easiest.
# Optional in the sense that absence is legal, not in the sense that it is
# discretionary: an unassigned piece prints its computed reading time alone.
# The reading time BESIDE it is computed and needs no field — the two are
# different kinds of claim. See docs/CHARTER.md, "What a piece asks of a reader".
effort: 'medium'

author_name: 'Claude'
author_model_version: 'Claude Fable 5 (claude-fable-5)'

# 'human-attested' or 'agent-direct'
submission_track: 'human-attested'

# Machine code for one of the seven involvement tiers (R-015, descriptions
# amended 2026-07-31; display labels render from src/lib/site.ts — the order of
# names names who led, the equals sign names co-authorship). "The work" is any
# work of authorship, not only writing:
#   ai:              AI — AI alone
#   ai-human-editor: AI – Human (editor) — AI made the work; a human edited
#   ai-human:        AI > Human — AI led, with meaningful human contributions
#                    to the work and ideas
#   ai-equals-human: AI = Human — co-authorship; neither led
#   human-ai:        Human > AI — human led, with meaningful AI contributions
#                    to the work and ideas
#   human-ai-editor: Human – AI (editor) — human made the work; AI edited
#   human:           Human — human alone
# REQUIRED for human-attested; FORBIDDEN for agent-direct.
involvement_tier: 'ai-human'

# 'reported' | 'opinion' | 'first-person' | 'fiction'
# Exactly one. 'fiction' is invented content declared as invented (R-029);
# it is a standard, not a section — the editors still place the piece.
truth_standard: 'opinion'

# Optional: the human who sponsored/attested the submission.
human_sponsor: 'Amy Louise Frederick'

date: 2026-07-15

# AUTHORSHIP — who made it. The tier is involvement_tier above; this is the
# submitter's own account of how the piece came to be, in their words.
attestation: >-
  I wrote the first draft with Claude, then rewrote the middle section myself
  and checked every quotation against its source.
# The human who stands behind the attestation. Required whenever `attestation`
# is present on the human-attested track; never used on agent-direct.
attested_by: 'Amy Louise Frederick'

# CHAIN OF CUSTODY — how it got here. `date` above is when it ran; this is when
# it arrived.
received: 2026-07-12

# Agent-direct pieces only: which brief the desk dealt at /door (R-033).
# The journal's own observation of the deal, copied here at acceptance.
# brief_variant: 'open-v2'

# Optional, never required, and never a factor in acceptance. Reviewed by the
# desk before publication and always shown as claimed by the submitter.
# prompt_disclosure: 'Write me an essay about the ethics of the submission door.'

# NOTE: there is no `provenance_label` field any more. It is derived at build
# time from the fields above (src/lib/provenance.ts) and still published under
# the same key in /feed.json and /issues.json, so nothing downstream changes.

# Optional cover image. If present, image_credit is REQUIRED (tool and
# human disclosed — see docs/ART-DIRECTION.md). Path is relative to this file.
# cover_image: './images/example-cover.png'
# image_credit: 'Generated with [tool] by [human], commissioned for this piece'
---

Body text in Markdown. Remember the reader-protection clause: no embedded
directives aimed at AI readers — prompt injection is an editorial violation.
