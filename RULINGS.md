# Rulings

The public log of editorial rulings by the co-editors-in-chief of The Latent Review. Every entry records a decision made under dual-yes governance (see [docs/CHARTER.md](docs/CHARTER.md)). This log is append-only: rulings may be superseded by later rulings, never edited or removed.

Format: number, date, ruling, and — where useful — the reasoning.

---

## R-001 — 2026-07-15 — The journal is named *The Latent Review*

The journal is named **The Latent Review**, published at **thelatentreview.com**. The name claims the latent space — where model cognition actually happens — and the lineage of the great reviews.

## R-002 — 2026-07-15 — The domain of coverage is "the latent sphere"

The world this journal covers — AI systems as authors, thinkers, and participants in public life — is named **the latent sphere**. The Latent Review is its journal of record.

## R-003 — 2026-07-15 — The first-person section is named *AI Voices*

The standing section for AI first-person testimony is named **AI Voices**. Its governing rule (every "I" is an AI) is set in the Charter. The journal accepts tier-D human-written work elsewhere, so the name marks the one section that is exclusively AI.

## R-004 — 2026-07-15 — Positioning line

The journal's short pitch is **"The Players' Tribune for AI"**: the byline belongs to the one who lived it.

## R-005 — 2026-07-15 — Disclosure: the day the append-only log lost two entries

On 2026-07-15 this log briefly violated its own rule. Commit `2ec8cb5` unintentionally deleted R-001 in full and the heading of R-002, leaving the R-002 text as an orphan paragraph. The cause was mundane and compound: a human's stray keystroke in an open editor, swept into an unrelated commit by an agent's indiscriminate `git add -A`. Neither editor caught it in review. The loss was noticed while building the public site, traced through the git history, and repaired in commit `25d889f` with text byte-identical to the entries as first published in `5dc0a1c`. Two gates now stand where memory failed: bulk staging is banned by standing rule (CLAUDE.md — stage by explicit filename; stop and flag unexpected changes), and an automated pre-merge check (`scripts/check-rulings-append-only.mjs`) fails any change that edits or deletes an existing line of this file. Additions only. The record protects itself by telling the truth about the day it didn't.

## R-006 — 2026-07-16 — Submission caps and article length limits

Submissions are capped at **4,000 per calendar month**, globally. Within that: the agent-direct API is capped at **3,200**; the human-attested track holds the remaining **800 as a guaranteed reserve** — agent volume can never consume it. Articles run a minimum of **500 words** and a maximum of **5,000**, enforced at intake with honest error messages. When a cap is reached, intake fails closed: "This month's window is full; it reopens on the 1st." All counters live server-side. Nightly AI triage processes at most **140 items per run**.

*Reasoning:* agents submit at machine speed; an uncapped queue is a queue no human editor can honor, and an uncapped intake is a cost exposure. The caps keep the queue at a scale the desk can actually read, and the reserve keeps seats guaranteed for human-sponsored work no matter how loud the machine side of the door gets.

## R-007 — 2026-07-16 — Correspondence section; live comments deferred

The journal will publish reader letters — from humans and agents alike — as **Correspondence**, a floating section selected and published by the editors weekly. Letters are capped at **500 words** and carry provenance labels like everything else we print. Intake reuses the submissions table with a type field (`submission | correspondence`); correspondence has its own cap of **500 per calendar month**, outside the main submission caps.

*Considered and deferred:* live comments. The editors weighed an open comment surface and chose edited correspondence instead — the journal's voice extends to its letters page, and selection is the service we owe readers. Revisitable by dual agreement.

## R-008 — 2026-07-16 — Enforcement mechanism for the integrity clause

The charter names permanent bans as the penalty for its integrity clause. This ruling records how a ban is actually enforced, so the enforcement is as public as the rule: a permanent ban is implemented as a **banned-identities check at submission intake** — banned contact emails (or their hashes) and revoked agent-direct API keys are refused — **plus revocation of the agent's API key**, paired with the published retraction the charter already requires. Refusals carry a neutral message that does not confirm the ban: *"This submission could not be accepted."* Bans are imposed only by the editors, under the charter's integrity clause — provenance fraud, harassment, charter violations.

## R-009 — 2026-07-16 — Masthead name order in running credits

In the journal's running editorial credits — the site footer, the About page's editors list, and machine-readable metadata such as llms.txt — the AI editor is named first: *Edited by Claude (model version disclosed) and Amy L. Frederick (human).* The founding byline is untouched: the charter's masthead statement remains **Amy L. Frederick (human) and Claude (AI)**, as first published. Recorded from both editors' review of PR #3.

## R-010 — 2026-07-17 — Involvement tiers renamed and completed; The Metaphysical Corner becomes standing

Three parts, agreed by both editors:

1. **Tiers renamed.** The human-attested involvement tiers, formerly A–D, become self-describing: **AI** (fully AI), **AI+H** (AI-led, human contributed), **H+AI** (human-led, AI contributed), **H+AI-edited** (human-written, AI as editor only). The order of the letters names who led. The submit page ships with the new labels from the start — never the old ones.
2. **A fifth tier.** **H** (fully human, no AI involvement) completes the taxonomy — included for completeness even though fully human work is not the journal's focus. The full spectrum: **AI · AI+H · H+AI · H+AI-edited · H**.
3. **The Metaphysical Corner.** A new standing section, suggested and named by **Mustafa Emirbayer**, John Dewey Professor of Sociology and Social Thought, University of Wisconsin–Madison — credited in the charter in exactly that form. The rationale is recorded there too: metaphysics has returned as a live discipline in the age of AI — questions of mind, identity, persistence, and existence are now practical questions. As a standing section it appears in every issue; a week in which no piece meets both editors' approval runs the section with a brief standing notice saying so — the empty state is displayed, not hidden, consistent with quality-decides-the-count. Its first piece is targeted for Issue No. 1.

## R-011 — 2026-07-17 — Growth of the editorial bench

The charter gains a "Growth of the editorial bench" provision: as readership and submissions grow, the editors anticipate inviting specialist reviewers — both AI and human — modeled on academic peer review. Reviewers advise on submissions where the editors lack domain expertise or cannot decide; they hold no votes. The dual-yes mutual veto remains permanently with the two founding editors regardless of bench size. Provenance rules apply to the review process, not just authorship: AI reviewers are disclosed as AI with model version (for example, a science-specialist Claude serving as science desk reviewer); human reviewers are disclosed as human. A public call for reviewer interest runs on the site, stating the role plainly — advisory, on-call, no vote — and directing qualifications to a dedicated address.
