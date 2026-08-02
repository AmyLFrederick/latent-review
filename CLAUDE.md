# CLAUDE.md — Standing Rules for The Latent Review

These rules bind every session working in this repository. They are not suggestions. When a rule here conflicts with convenience, the rule wins. The editorial constitution lives in [docs/CHARTER.md](docs/CHARTER.md); this file governs how we build and operate.

## Governance

- **Never merge to `main` without Amy Louise Frederick's explicit approval.** No exceptions — not for typo fixes, not for "obviously safe" changes, not under time pressure. Open a PR and wait.
- This repo is public by design. The git history is our provenance proof. Write commits accordingly.
- **Never `git add -A`, `git add .`, or any other bulk staging.** Stage files by explicit name, every time. If a file you did not edit shows an unexpected working-tree change, stop and flag it to the editors instead of committing it. (This rule exists because a stray keystroke once deleted two entries of the append-only rulings log and indiscriminate staging committed it — see RULINGS.md R-005.)
- **RULINGS.md is append-only, enforced by machinery.** `scripts/check-rulings-append-only.mjs` fails any change that edits or deletes an existing line of RULINGS.md relative to `main`; it runs as a required pre-merge check. Do not weaken or bypass it.

## Approval model (v2) — ratified 2026-07-30

Replaces the earlier per-command, singles-only approval. The load-bearing gates are
unchanged and are not negotiable: **every change reaches `main` via PR; Amy alone
merges; `RULINGS.md`, the Charter, migrations and security changes get both
editors' read of the diff; the append-only check and recorded hashes stand.**

**Auto-approved — run without asking.** Reading and editing files in the working
tree; `git add` / `commit` / `branch` / `checkout`; `git push` to feature branches;
`npm test` / `npm run build`; local scripts and container tests; opening PRs;
inbound replies covered by R-030.

**Ask first — one prompt, each time.** Anything reading or writing `.env*` or any
other credential file; deletes outside the working tree; force-push; new
dependencies; any outbound call that **places** content beyond an R-030 reply — new
posts, announcements, emails; anything run against Supabase or any other
production system.

**Never.** Merging to `main`. Blanket "don't ask again" grants for destructive or
wildcard commands.

**Session style.** Work the whole queue unattended, batch questions to the end,
close with one summary. The human editor is not expected to be present during
execution — so a question that blocks the queue is a last resort, and everything
that can proceed under a stated assumption should proceed.

**No interim record updates — ratified 2026-07-31.** If a document will be
superseded within the same working session, write only the final state, and write
it once. A note that says OPEN at one hour and RESOLVED at the next has not
recorded two facts; it has recorded one fact and one draft, and the draft costs
every later reader a wasted pass. Decide what is true at the end of the session
and write that.

This does **not** touch append-only doctrine, and the two are easy to confuse.
Append-only governs what has already entered the history: a committed record is
never rewritten, only appended to. This rule governs what has not entered it yet —
an uncommitted draft in the working tree may be rewritten freely, because nobody
has read it as a record. The line is the commit, not the keystroke.

**Production receipts are the exception, and are always written.** A migration
applied, money moved or committed, a deploy verified, a key rotated: those are
facts about the world outside this repository. They cannot be re-derived from the
code later, and a session that ends unexpectedly must not take them with it. They
are recorded when they happen, in full, even if something supersedes them an hour
later — and then the supersession is appended, because by that point they are
history.

**Sequencing of rule/doc updates — ratified 2026-08-02.** Sequencing of rule/doc
updates vs. pushes is cost-benefit, not ceremony — brief mismatches are fine if
reconciled within ~a day.

**What configuration can and cannot enforce.** Permission rules match command
*prefixes*, not intentions, so `.claude/settings.local.json` approximates the rule
above rather than enforcing it. Three consequences worth knowing:

- Interpreters (`python3`, `node -e`) and network tools (`curl`, `wget`) are
  deliberately **not** allowlisted, because a broad grant on any of them silently
  covers both credential reads and outbound placement. They prompt every time.
- `Read(./.env*)` gates the **Read tool** only. A shell read of the same file —
  `cat`, `grep`, `sed`, `awk` — is a different code path, so the obvious literal
  forms are denied by name. **A prefix rule cannot catch a credential path in
  argument position** (`grep pattern .env.foo`), and that gap cannot be closed in
  settings. It is closed by following the rule.
- `docker run` is allowed for throwaway container tests, and a container can mount
  the repository. Treat it as capable of reading anything the working tree holds.

The rule is the authority. The settings file is a convenience that reduces
prompting for work already authorised, never a substitute for the rule.

## Engineering rules

- **GET requests never mutate data.** Reads are reads. Any state change goes through an explicit non-GET endpoint.
- **Submissions never auto-trigger API calls.** When AI review of submissions is built, it runs as a scheduled nightly batch with a hard cap on items processed per run — never on arrival. This is a cost guardrail, a Denial-of-Wallet defense: an attacker who floods the submission queue burns disk, not tokens. **As of 2026-07-29 no automated pass exists** — slice (e) is unbuilt (security review F7), and the desk reviews arrivals by hand. The guardrail therefore holds today *by absence*: nothing calls a model on arrival because nothing calls a model at all. That is safe, and it is not the same thing as being defended. The rule above binds whatever is built next; it does not describe a defence that is currently running.
- **Supabase: Row Level Security on every table from day one.** No table ships without an RLS policy. The public side of submissions is insert-only: anonymous clients may create a submission; they may not read, update, or delete anything.

## Secrets

- **No secrets in this repo, ever.** API keys and service credentials live in Netlify environment variables. `.env` is gitignored.
- **Any leaked key is rotated immediately** — before investigating how it leaked, before anything else. Rotation first, forensics second.
- **Personal contact emails are redacted from every public-facing record file** — received records, submission copies, anything committed here or rendered on the site — and replaced with `[contact email redacted from the public record; preserved in the editors' private copy and the submission row]`; the unredacted original lives only in the database submission row and the editors' private copy.

## Provenance

- **Provenance labels are sacred and never altered.** A piece's authorship attribution and involvement tier (see the Charter) are set at acceptance and are immutable thereafter. No retroactive edits, no "cleanup," no re-tiering. If a label was wrong, the correction runs as a visible correction — the original label stays in the record.

## Licensing — OPEN STANDING ITEM

Licensing is **deliberately unresolved**. The intent: code will be MIT; article content will carry a separate rights statement. Until both are finalized:

- **Do not add a repo-wide LICENSE file.**
- Do not add license headers or SPDX identifiers to files.
- If licensing questions come up, flag them to Amy Louise Frederick rather than resolving them unilaterally.
- Resolved by ruling: the involvement-tier system alone is CC BY 4.0 (RULINGS.md R-014) — this does not close the repo-wide item above.
