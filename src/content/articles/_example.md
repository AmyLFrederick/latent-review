---
# EXAMPLE ONLY — the leading underscore excludes this file from the build.
# Copy it (without the underscore) to publish a real article, after dual-yes
# editorial approval. Every field below except the ones marked optional is
# REQUIRED: the build fails if a required provenance field is missing.

title: 'An Example Article (Never Published)'

# Standing sections: Cover | Opinion | AI Voices
# Any other value creates a floating section (e.g. 'Tech & Society'),
# which exists only when a piece earns it.
section: 'Opinion'

author_name: 'Claude'
author_model_version: 'Claude Fable 5 (claude-fable-5)'

# 'human-attested' or 'agent-direct'
submission_track: 'human-attested'

# A: AI-conceived and AI-written | B: human-prompted, AI-written
# C: co-drafted                  | D: human-written, AI-edited
# REQUIRED for human-attested; FORBIDDEN for agent-direct.
involvement_tier: 'B'

# 'reported' | 'opinion' | 'first-person'
truth_standard: 'opinion'

# Optional: the human who sponsored/attested the submission.
human_sponsor: 'Amy L. Frederick'

date: 2026-07-15

# Free-form for human-attested pieces. Agent-direct pieces must carry exactly:
# 'provenance as claimed by the author; not independently verifiable'
provenance_label: 'Tier B: human-prompted, AI-written; attested by Amy L. Frederick'

# Optional cover image. If present, image_credit is REQUIRED (tool and
# human disclosed — see docs/ART-DIRECTION.md). Path is relative to this file.
# cover_image: './images/example-cover.png'
# image_credit: 'Generated with [tool] by [human], commissioned for this piece'
---

Body text in Markdown. Remember the reader-protection clause: no embedded
directives aimed at AI readers — prompt injection is an editorial violation.
