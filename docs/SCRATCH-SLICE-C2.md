# Slice (c2) — Letters by agent: build findings (no code)

*Working notes, 2026-07-27. Findings from reading §7 of
docs/AGENT-DIRECT-SLICE-C.md (the marked-up design), R-024, and the code as
it stands on `main` (8f623fe). Findings first, no code — per the standing
term. Flags for the editors are numbered C2-1…; the C-11 security sign-off
material is §5 below, drafted for the review that confirms it.*

*Mark-up applied 2026-07-27 (both editors): C2-1 RULED — option (a);
C2-2…C2-9 CONFIRMED (C2-8 with one copy addition to C-15); C-11 carries
the AI editor's preliminary concurrence on §5's posture, formal sign-off
at the build PR. Per-flag annotations below; §6 is the dated record.*

---

## 1. What (c2) builds

- **Endpoint** (`netlify/functions/agent-submit.mts`): a `type` field on the
  wire (`'submission' | 'letter'`, allowlisted), letter word bounds
  (100–300), target-field validation for letters, archive/freshness checks.
- **Migration**: `letter_target_type` / `letter_target_id` columns on
  `submissions` with CHECK backstops; `submit_agent_direct` grows two args
  (drop-and-recreate, probe asserts exactly one — the C-7 discipline);
  `agent_submission_count` gains a type filter (same discipline).
- **`/for-agents` + `/agent-api.json`**: the letters entry per §7's closing
  section, replacing the letters-coming line. Copy is the editors' to mark
  up (C-15 carries the reference-line wording).
- **Desk**: the letter detail's target line (§7 render rules). Site-side
  rendering of a *published* letter is publish-time work on the Letters
  page and can ship with the first published letter, not with the door.

Not in (c2): notifier (d), nightly batch (e), any change to flood dials
(F1/F2/F3 apply to letters unchanged — same endpoint, same meters).

---

## 2. Findings against the code as built

### C2-1 · The `type` vocabulary collision — R-007's `correspondence` vs. R-024's `letter` (RULED — option (a), mark-up 2026-07-27)

*RULED (both editors, 2026-07-27): option (a). The CHECK becomes
`('submission', 'correspondence', 'letter')`; `'letter'` is the
agent-direct letter value; `'correspondence'` remains R-007's human-lane
value, untouched — R-017's record intact.*

The design says the pin opens to `'submission' | 'letter'` with a "DB CHECK
as backstop." But the live CHECK on `public.submissions.type`
(20260717120000_editors_desk.sql) is:

    check (type in ('submission', 'correspondence'))

`'correspondence'` is R-007's ruled internal value, reaffirmed by R-017
("the internal `type` field values (`submission | correspondence`) are all
untouched"). The desk already renders `type === 'correspondence'` as
"(letter)" (admin.astro:144). An insert of `'letter'` today would violate
the CHECK. No `'correspondence'` rows exist yet (no human-letter intake
form has shipped; letters arrive by mailto), but the value is law and the
desk knows it. Options:

- **(a) Three-value CHECK — RECOMMENDED.** CHECK becomes
  `('submission', 'correspondence', 'letter')`. `'letter'` = agent-direct
  letters (the target-carrying kind); `'correspondence'` remains R-007's
  human-lane value, untouched, so R-017's record stays true. The
  presence-CHECK for targets is then clean and unconditional:
  `(type = 'letter') = (letter_target_type is not null)` — no track
  qualification needed, because only agent letters are `'letter'`. Desk
  renders both values as letters. The two per-lane counts can never
  entangle: the six-piece and three-letter ceilings filter by `type`, the
  R-007 500/month correspondence window (when its intake ships) filters
  by `type = 'correspondence'`, and no row is ever in two letter lanes.
- **(b) Wire `'letter'`, store `'correspondence'`.** No CHECK change, one
  storage vocabulary. Rejected on two grounds: the target-presence CHECK
  must then be conditioned on `submission_track` (human correspondence
  carries no target), and a validated-`'letter'`-writes-`'correspondence'`
  mapping is exactly the kind of silent translation a later audit
  misreads. R-024's text names `'letter'` at the RPC; store what was ruled.
- **(c) Rename the lane** (`correspondence` → `letter` everywhere).
  Touches R-007/R-017's recorded values for no functional gain; not
  proposed.

*(a) needs the editors' ruling because it sets the stored vocabulary
alongside R-007's — one word in the mark-up settles it.*

### C2-2 · The published archive lives in the repo, so piece-target validation is endpoint work, not RPC work (CONFIRMED, mark-up 2026-07-27)

*CONFIRMED (both editors, 2026-07-27): endpoint-side archive validation
from the deploy bundle via `included_files`; fail-closed parsing; the
static guard; the publish-by-deploy consistency property noted for C-11's
record. The UTC-midnight reading of publication dates CONFIRMED for the
freshness arithmetic; the /for-agents copy states it.*

§7 says a piece slug is "validated against the published archive" and
freshness runs off `published_at`. The archive is not in Postgres: published
pieces are markdown in `src/content/articles/` (frontmatter carries `date`,
`section`, `title`; the permalink slug is the filename — Astro's content id
— rendered at `/articles/[slug]`). The DB knows nothing of publication.

**Consequence:** slug existence and the two-month freshness check run at
the **endpoint**, from an archive index bundled with the function at deploy
— the RPC enforces shape and presence (CHECKs), not archive membership.
This is sound, and stated for C-11's record: pieces publish *by deploy*, so
the function bundle and the public archive are rebuilt together and can
never disagree — the door's index is exactly as current as the archive
itself.

**Mechanism — recommend the established `included_files` pattern**
(netlify.toml already bundles `docs/EDITORIAL-CRITERIA.md` for the AI
pass): add `src/content/articles/**` to `included_files`; the function
reads filenames (slugs) and the `date:` frontmatter line with a minimal
extractor. Fail closed: a file the extractor cannot read is treated as
absent (letter refused with the generic LR400), and a Node static guard
asserts every real article in the collection parses, so a drifted
frontmatter style breaks the build's tests, not a live letter. Alternative
(build-generated JSON index) adds a build-ordering dependency for no gain.

**Freshness semantics restated (C-14):** accepted while
`now < date + 2 months`, UTC, no grace — computed at the endpoint at
request time. `date` in the frontmatter is a calendar date; the
deterministic reading is midnight UTC of the publication date, which the
/for-agents copy should state so an agent's arithmetic matches ours.

### C2-3 · The section roster also lives in the repo — §7's "live roster in the database" is inaccurate as written (CONFIRMED, mark-up 2026-07-27)

*CONFIRMED (both editors, 2026-07-27): valid targets = standing sections ∪
published floating sections, slugified, from the same bundle; §7's "in the
database" phrasing corrected for the record. Arts is not a letter target
until it is a section page.*

There is no sections table. The roster is `STANDING_SECTIONS` +
`SECTION_DESCRIPTIONS` in `src/lib/site.ts`, slugs minted by
`slugifySection()`, pages at `/section/[slug]`; floating sections exist
only when a published piece carries them (content frontmatter). So the
**valid section targets = standing sections ∪ sections present in the
published archive**, slugified — all derivable from the same bundle as
C2-2, no DB dependency. The correction to §7's wording should be recorded
at mark-up (the doc's §7 text stands as history; the findings note the
built form, the same way the B-2 signature note was handled).

Note: the Arts topical section is desk_topics-side and unnamed as yet — it
is not a section page and therefore not a valid letter target until it has
one. Nothing to build; stated so nobody wires desk_topics into targets.

### C2-4 · Ruling targets — regex only, existence at the desk (as designed) (CONFIRMED, mark-up 2026-07-27)

`R-NNN` validated as `^R-\d{3}$` at intake, existence editorial (rulings
live in RULINGS.md, not the DB; every letter passes R-007 selection
anyway). One addition: the constructed link `/rulings` carries a fragment
per ruling — desk render includes the number as text either way. No
change to §7, just confirming the built form matches it.

### C2-5 · The count primitive gains a type filter; stated semantics at cutover (CONFIRMED, mark-up 2026-07-27)

*CONFIRMED (both editors, 2026-07-27): type-filtered primitive,
drop-and-recreate with the exactly-one probe, cutover equivalence pinned
by the regression test.*

`agent_submission_count(p_track, p_identity, p_since)` counts all rows on
the track. (c2) adds `p_type text` (null = all types):

- six-piece ceiling → count with `p_type = 'submission'`
- three-letter budget → count with `p_type = 'letter'`
- global monthly cap → count with `p_type = null` (letters share the
  window — R-024 §2, C-13)

Signature change = drop-and-recreate + probe asserting exactly one
function (the C-7 discipline; the old 3-arg form must not survive as an
overload). **No behavioral change at cutover:** every existing agent-direct
row is a submission, so the filtered six-count equals today's unfiltered
count on day one. Both ceilings stay under the single global-cap row lock,
per-identity checks before the global count, same LR429 / one ruled
sentence (C-2 untouched: the letter-budget refusal joins the same
indistinguishable month-full class — a third cause behind the same body).

### C2-6 · Wire contract: `type` is optional, defaulting to `'submission'` (CONFIRMED, mark-up 2026-07-27)

/for-agents documents no `type` field today and two live identities have
submitted without one. Absent `type` = `'submission'` (backward
compatible); present, it must be *exactly* one of the two strings or the
generic LR400 refuses. The default is applied at the endpoint; the RPC
takes `p_type` explicitly and validates the two values again — the RPC
never has a default that could mask an endpoint bug (fail closed at both
layers).

### C2-7 · Target fields are screened like everything else, then format-validated (CONFIRMED, mark-up 2026-07-27)

`target_type` / `target_id` are submitter-controlled strings: they pass the
§4 deterministic screen (single-line class) **and** strict format
validation (allowlisted `target_type`; `target_id` charset per type —
`^[a-z0-9-]{1,200}$` for slugs, `^R-\d{3}$` for rulings; absent for
charter). Read only when `type = 'letter'`; on a submission they are
ignored like any unknown field (one rule, no new oracle). The reference
line renders from the *validated* identifier via the journal's own
construction — author text never becomes an href (§4(iv) untouched).

### C2-8 · Letters reuse the §1 schema unchanged — including `title` (CONFIRMED, mark-up 2026-07-27)

*CONFIRMED (both editors, 2026-07-27): letters keep the full submission
schema including `title`. One sentence added to the C-15 copy: the
publication headline remains the editors' (R-007 discretion; authors'
titles are working titles).*

§7 adds two fields and changes word bounds; it amends nothing else. So a
letter still requires `title`, `author_name`, `truth_standard`,
`provenance_attestation`, `contact_email` — all screened as before.
Recommend confirming this as-is (the desk lists by title; letters are
provenance-labeled like everything printed; excerpting is the editors'
anyway). If the editors would rather letters be title-free, that is one
`readString` bound and one schema line — but it is a *different* rule for
letters, and one rule has been the door's virtue throughout.

### C2-9 · Storage columns and CHECK backstops (shape, given C2-1(a)) (CONFIRMED, mark-up 2026-07-27)

`letter_target_type text` / `letter_target_id text` on `submissions`,
null for submissions and for all existing rows. CHECKs as backstop, RPC as
enforcer:

- `(type = 'letter') = (letter_target_type is not null)`
- `letter_target_type in ('piece','charter','ruling','section')` (or null)
- charter ⇔ no id; the other three ⇔ id present, length-bounded

Word bounds for letters are RPC-validated too? **No** — recommend keeping
word counting at the endpoint only, as it is for submissions today (the DB
CHECK bounds characters, not words; parity with the existing split). The
100–300 bound is C-12's ruled number, endpoint constant, same `\S+` count.

---

## 3. Migration sketch (prose, not code)

*Arity corrected at the build (2026-07-27), noted on the editors' direction:
this sketch said "12-arg"; the built signature is **13-arg** — ten existing
parameters plus three new. The sketch's arithmetic was wrong, not the
migration.*

One migration: (1) CHECK on `type` per C2-1(a); (2) the two target columns
with CHECKs; (3) drop 10-arg `submit_agent_direct`, create 13-arg
(`p_type`, `p_letter_target_type`, `p_letter_target_id` — with the type
validated against the two values in the function body, per-type budget
selection, target presence enforced before insert); (4) drop 3-arg
`agent_submission_count`, create 4-arg; (5) probes: exactly one of each
function, front door closed to anon/open to service_role for the new
signatures, CHECK constraints present, dials still at ruled values, RLS
still enabled. Endpoint and migration travel in one PR (the §5 deploy-
ordering note holds: nothing calls the RPC but our function).

## 4. Verification plan — §8's (c2) list, plus additions found here

Everything in §8's "(c2), when built" list stands. Additions from these
findings:

- `type` absent → submission path unchanged, byte-identical success and
  refusal bodies (C2-6).
- `'correspondence'` on the wire is refused (it is R-007's internal value,
  never an API value — the two-value allowlist holds against exactly this
  near-miss).
- Screen-hit inside `target_id` refuses with the same generic body
  (C2-7); `target_id` charset probes per type.
- Archive-index static guard: every file in `src/content/articles/`
  parses; unparseable fixture → treated as absent, letter refused,
  submission path unaffected (C2-2 fail-closed).
- Count-primitive regression: six-count with type filter equals unfiltered
  count on a letters-free dataset (C2-5 cutover claim, made testable).
- Freshness boundary tests run against the bundled index, one day inside /
  one day outside, UTC midnight semantics (C2-2).

## 5. C-11 — security sign-off material (drafted for the review)

The pin (F-min) was: the RPC hard-codes `type = 'submission'`; nothing
submitter-controlled reaches the column. (c2) deliberately opens it. The
posture offered for sign-off:

1. **Three enforcement layers, none shared, all fail-closed.** Endpoint
   allowlist (exact-string, two values, absent-defaults-to-submission);
   RPC re-validation of `p_type` against the same two literals (no default
   in the RPC); DB CHECK as final backstop. A third value must defeat all
   three, and §8 probes each layer independently.
2. **No new oracle.** Every letter-specific refusal — bad type, bad
   target, stale piece, word bounds — is the existing generic LR400 body
   (C-15) or the existing month-full sentence (budget). Slug existence
   reveals only the public archive; freshness is computable by any honest
   agent from public data. Refusal logging stays category-only.
3. **No new unmetered surface.** Letters enter through the same POST, in
   the same cheapest-first order: flood meters (F1/F2/F3, unchanged)
   before parsing, validation before the RPC, budgets inside the same
   row lock. Target validation is deterministic string/array work against
   a deploy-bundled index — no network, no AI, no email (DoW rule
   untouched); the archive read is per-invocation file I/O of repo-sized
   markdown, bounded and local.
4. **No new write surface.** The two columns are written by the SECURITY
   DEFINER RPC alone; no grants added; anon/authenticated column probes in
   the migration. The reference link is journal-constructed from validated
   identifiers — author text never reaches an href (render contract
   unchanged).
5. **Counts cannot entangle.** One primitive, type-filtered per ceiling,
   type-agnostic for the shared global window; the C2-5 regression pins
   the cutover equivalence.

Residual risks named honestly: the archive index parser is new code in the
refusal path (mitigated by the static guard + fail-closed reading); the
13-arg RPC is a wider signature to hold the drop-and-recreate discipline
against (mitigated by the exactly-one probe, as at C-7).

## 6. For the editors — mark-up of 2026-07-27 (both editors): every flag ruled or confirmed; C-11 formal sign-off at the build PR

- **C2-1 · RULED — option (a) (2026-07-27).** The `type` CHECK becomes
  `('submission', 'correspondence', 'letter')`; `'letter'` is the
  agent-direct letter value; `'correspondence'` remains R-007's human-lane
  value, untouched — R-017's record intact.
- **C2-2 · CONFIRMED (2026-07-27).** Endpoint-side archive validation from
  the deploy bundle via `included_files`; fail-closed parsing; the static
  guard; the publish-by-deploy consistency property noted for C-11's
  record. The UTC-midnight reading of publication dates CONFIRMED for the
  freshness arithmetic; the /for-agents copy states it.
- **C2-3 · CONFIRMED (2026-07-27).** Valid section targets = standing
  sections ∪ published floating sections, slugified, from the same bundle;
  §7's "in the database" phrasing corrected for the record. Arts is not a
  letter target until it is a section page.
- **C2-4 · CONFIRMED (2026-07-27)** as written.
- **C2-5 · CONFIRMED (2026-07-27).** Type-filtered count primitive,
  drop-and-recreate with the exactly-one probe, cutover equivalence pinned
  by the regression test.
- **C2-6 · CONFIRMED (2026-07-27)** as written.
- **C2-7 · CONFIRMED (2026-07-27)** as written.
- **C2-8 · CONFIRMED (2026-07-27).** Letters keep the full submission
  schema including `title`, with one sentence added to the C-15 copy: the
  publication headline remains the editors' (R-007 discretion; authors'
  titles are working titles).
- **C2-9 · CONFIRMED (2026-07-27)** as written.
- **C-11 · Preliminary concurrence from the AI editor on §5's posture
  (2026-07-27); formal sign-off at the build PR**, as designed — the
  review is the confirmation.
