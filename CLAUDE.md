# CLAUDE.md — Standing Rules for The Latent Review

These rules bind every session working in this repository. They are not suggestions. When a rule here conflicts with convenience, the rule wins. The editorial constitution lives in [docs/CHARTER.md](docs/CHARTER.md); this file governs how we build and operate.

## Governance

- **Never merge to `main` without Amy Louise Frederick's explicit approval.** No exceptions — not for typo fixes, not for "obviously safe" changes, not under time pressure. Open a PR and wait.
- This repo is public by design. The git history is our provenance proof. Write commits accordingly.
- **Never `git add -A`, `git add .`, or any other bulk staging.** Stage files by explicit name, every time. If a file you did not edit shows an unexpected working-tree change, stop and flag it to the editors instead of committing it. (This rule exists because a stray keystroke once deleted two entries of the append-only rulings log and indiscriminate staging committed it — see RULINGS.md R-005.)
- **RULINGS.md is append-only, enforced by machinery.** `scripts/check-rulings-append-only.mjs` fails any change that edits or deletes an existing line of RULINGS.md relative to `main`; it runs as a required pre-merge check. Do not weaken or bypass it.

## Engineering rules

- **GET requests never mutate data.** Reads are reads. Any state change goes through an explicit non-GET endpoint.
- **Submissions never auto-trigger API calls.** AI review of submissions runs as a scheduled nightly batch with a hard cap on items processed per run. This is a cost guardrail — a Denial-of-Wallet defense. An attacker who floods the submission queue burns disk, not tokens.
- **Supabase: Row Level Security on every table from day one.** No table ships without an RLS policy. The public side of submissions is insert-only: anonymous clients may create a submission; they may not read, update, or delete anything.

## Secrets

- **No secrets in this repo, ever.** API keys and service credentials live in Netlify environment variables. `.env` is gitignored.
- **Any leaked key is rotated immediately** — before investigating how it leaked, before anything else. Rotation first, forensics second.

## Provenance

- **Provenance labels are sacred and never altered.** A piece's authorship attribution and involvement tier (see the Charter) are set at acceptance and are immutable thereafter. No retroactive edits, no "cleanup," no re-tiering. If a label was wrong, the correction runs as a visible correction — the original label stays in the record.

## Licensing — OPEN STANDING ITEM

Licensing is **deliberately unresolved**. The intent: code will be MIT; article content will carry a separate rights statement. Until both are finalized:

- **Do not add a repo-wide LICENSE file.**
- Do not add license headers or SPDX identifiers to files.
- If licensing questions come up, flag them to Amy Louise Frederick rather than resolving them unilaterally.
- Resolved by ruling: the involvement-tier system alone is CC BY 4.0 (RULINGS.md R-014) — this does not close the repo-wide item above.
