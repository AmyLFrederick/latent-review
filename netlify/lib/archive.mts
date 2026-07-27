import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STANDING_SECTIONS, slugifySection } from '../../src/lib/site.ts';

// The published archive, as the agent-direct door sees it — slice (c2),
// per the marked-up findings (docs/SCRATCH-SLICE-C2.md, C2-2 / C2-3
// CONFIRMED 2026-07-27).
//
// Why this file exists: a letter must declare its target, and a target that
// is a published piece is validated for existence and for the two-month
// freshness window (R-024 §4). The design doc said those checks run "against
// the database" — they cannot: the published archive is markdown in
// src/content/articles, and the section roster is src/lib/site.ts plus
// whatever floating sections published pieces have earned. Both are repo
// artifacts. So validation happens HERE, at the endpoint, against files
// bundled with the function at deploy time.
//
// The property that makes this sound (recorded for C-11): pieces publish BY
// DEPLOY. The function bundle and the public archive are built from the same
// commit, so the door's index is exactly as current as the archive a reader
// sees — they cannot disagree.
//
// FAIL CLOSED, everywhere: a file we cannot read or parse is treated as
// absent, and an unreadable directory yields an empty archive. The
// consequence of a fault is that letters about pieces are refused (the
// generic LR400), never that an unvalidated target is accepted. Submissions
// are untouched by any of it.
//
// The files reach production through netlify.toml [functions].included_files.

const ARTICLES_RELATIVE = 'src/content/articles';

export type ArchiveEntry = {
  /** The permalink slug — Astro's content id, i.e. the filename without .md. */
  slug: string;
  /** Publication date read as UTC midnight (C2-2: the confirmed reading). */
  publishedAt: Date;
  /** The section name exactly as the frontmatter carries it. */
  section: string;
};

// Test seam. Nothing in the deployed code path calls this, and it reads no
// environment variable, so production has no way to be pointed at another
// archive — the alternative (an env override) would have added a
// configuration surface to a fail-closed refusal path for the sake of the
// suite. Tests use it to exercise the accept path against fixture files,
// because the real archive is the published record and fabricating an
// article inside it to make a test pass is not a thing we do.
let testRoot: string | null = null;
export function __setArchiveRootForTests(dir: string | null): void {
  testRoot = dir;
  cached = null;
}

// Bundled functions see the repo layout from a few possible roots depending
// on runtime — the same candidate list the criteria loader uses.
function candidateRoots(): string[] {
  if (testRoot) return [testRoot];
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(process.cwd(), ARTICLES_RELATIVE),
    join(here, '..', '..', ARTICLES_RELATIVE),
    join('/var/task', ARTICLES_RELATIVE),
  ];
}

// Minimal frontmatter reader: the leading `---` block, `key: value` lines,
// surrounding quotes stripped. Deliberately not a YAML parser — we need two
// scalar fields, and a real parser would be a large dependency reachable
// from the refusal path. Anything it cannot understand makes the piece
// absent, which is the safe direction.
export function parseFrontmatter(text: string): Record<string, string> | null {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;

  const out: Record<string, string> = {};
  for (const line of text.slice(3, end).split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2) ||
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (key !== '') out[key] = value;
  }
  return out;
}

// A plain YYYY-MM-DD is read as UTC midnight — the deterministic reading the
// editors confirmed (C2-2), and the one /for-agents states so an agent's
// arithmetic matches ours. Anything else is unreadable, so absent.
export function parseUtcDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  // Reject impossible dates that Date.UTC would silently roll over
  // (2026-02-31 becoming March 3rd, and the like).
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

// R-024 §4 is written as `published_at + interval '2 months'`, so we
// implement Postgres's interval arithmetic, not JavaScript's: Postgres
// CLAMPS to the end of the target month (Dec 31 + 2 months = Feb 28/29),
// where Date.UTC would roll over into March. The window's edge is a ruled
// number; it should not move because of a language's overflow habit.
export function addTwoMonthsUtc(from: Date): Date {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const d = from.getUTCDate();
  const targetMonth = m + 2;
  const targetYear = y + Math.floor(targetMonth / 12);
  const monthInYear = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, monthInYear + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      monthInYear,
      Math.min(d, lastDay),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds()
    )
  );
}

/** R-024 §4: accepted while now < published_at + 2 months, UTC, no grace. */
export function isFresh(publishedAt: Date, now: Date): boolean {
  return now.getTime() < addTwoMonthsUtc(publishedAt).getTime();
}

// Built once per process: the archive changes only at deploy, so re-reading
// it per invocation would buy nothing. Only a successful read is memoized —
// a transient failure must not pin an empty archive for the process's life.
let cached: Map<string, ArchiveEntry> | null = null;

export function loadArchive(): Map<string, ArchiveEntry> {
  if (cached) return cached;

  let dir: string | null = null;
  let files: string[] = [];
  for (const candidate of candidateRoots()) {
    try {
      files = readdirSync(candidate);
      dir = candidate;
      break;
    } catch {
      // try the next root
    }
  }

  if (dir === null) {
    // Fail closed: no archive means no piece target can be validated, so
    // letters about pieces are refused. Submissions are unaffected.
    console.error('archive: no articles directory found; piece targets will refuse');
    return new Map();
  }

  const entries = new Map<string, ArchiveEntry>();
  for (const file of files) {
    // The build excludes files prefixed with `_` (the documented example),
    // so the door must not treat them as published either.
    if (!file.endsWith('.md') || file.startsWith('_')) continue;

    try {
      const fm = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
      if (!fm) continue;
      const publishedAt = fm.date ? parseUtcDate(fm.date) : null;
      if (!publishedAt || !fm.section) continue;

      const slug = file.slice(0, -3);
      entries.set(slug, { slug, publishedAt, section: fm.section });
    } catch {
      // Unreadable file: absent, not fatal.
    }
  }

  cached = entries;
  return entries;
}

/**
 * Valid `section` letter targets: the standing sections plus every floating
 * section a published piece has earned, slugified (C2-3). A section that
 * exists only in the desk's topic metadata is NOT a target — it has no
 * section page to point a reader at.
 */
export function sectionSlugs(): Set<string> {
  const slugs = new Set<string>(STANDING_SECTIONS.map((s) => slugifySection(s)));
  for (const entry of loadArchive().values()) {
    slugs.add(slugifySection(entry.section));
  }
  return slugs;
}

/** Test seam: drop the memoized archive. */
export function resetArchiveCache(): void {
  cached = null;
}
