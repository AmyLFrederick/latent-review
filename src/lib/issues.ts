import { getCollection, type CollectionEntry } from 'astro:content';
import { STANDING_SECTIONS } from './site';
// @ts-expect-error — plain-JS module shared with scripts/send-issue.mjs and tests
import { deriveVolumes } from './volume.mjs';

// The issue model for The Latent Review.
//
// An issue is derived entirely from the articles that ran in it — there is no
// separate issues collection, so there is exactly one source of truth. The
// homepage is a view of the latest issue; /issue/N is its permanent home.

export type Article = CollectionEntry<'articles'>;

export interface Issue {
  number: number;
  /** Publication date: the latest article date in the issue. */
  date: Date;
  /** Annual volume (R-016): Volume 1 is 2026. Derived from the date, never stored. */
  volume: number;
  /** Within-volume number (R-016): restarts at 1 each January, counted in global order. */
  numberInVolume: number;
  /** The issue's UTC year, which names its volume. */
  year: number;
  /** The Cover-section piece, if the issue has one. */
  cover?: Article;
  /** Every article in the issue, newest first. */
  articles: Article[];
  /** Non-cover articles grouped by section, standing sections first. */
  sections: { section: string; items: Article[] }[];
}

function groupSections(rest: Article[]): Issue['sections'] {
  const floating = [...new Set(rest.map((a) => a.data.section))]
    .filter((s) => !(STANDING_SECTIONS as readonly string[]).includes(s))
    .sort();
  const order = [
    ...(STANDING_SECTIONS as readonly string[]).filter((s) => s !== 'Cover'),
    ...floating,
  ];
  return order
    .map((section) => ({ section, items: rest.filter((a) => a.data.section === section) }))
    .filter((g) => g.items.length > 0);
}

/**
 * All issues, newest first. Fails the build if issue numbers are not
 * contiguous from 1 — a gap almost certainly means a frontmatter typo, and a
 * journal of record must not silently publish issue 7 after issue 5.
 */
export async function getIssues(): Promise<Issue[]> {
  const all = (await getCollection('articles')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  if (all.length === 0) return [];

  const numbers = [...new Set(all.map((a) => a.data.issue))].sort((a, b) => a - b);
  numbers.forEach((n, i) => {
    if (n !== i + 1) {
      throw new Error(
        `Issue numbers must be contiguous starting at 1; found [${numbers.join(', ')}]. ` +
          'Check the `issue` frontmatter of the articles collection.'
      );
    }
  });

  const issues = numbers.map((number) => {
    const articles = all.filter((a) => a.data.issue === number);
    const covers = articles.filter((a) => a.data.section === 'Cover');
    // The Cover is the single piece both editors deem most important that
    // week (Charter). A second one would otherwise be dropped silently.
    if (covers.length > 1) {
      throw new Error(
        `Issue ${number} has ${covers.length} Cover pieces (${covers.map((a) => a.id).join(', ')}); ` +
          'an issue has exactly one Cover. Fix the `section` frontmatter.'
      );
    }
    const cover = covers[0];
    return {
      number,
      date: new Date(Math.max(...articles.map((a) => a.data.date.valueOf()))),
      cover,
      articles,
      sections: groupSections(articles.filter((a) => a !== cover)),
    };
  });

  // Volume and number are display derivations (R-016), never stored facts.
  const volumes = deriveVolumes(issues);
  return issues
    .map((issue) => {
      const v = volumes.get(issue.number);
      return { ...issue, volume: v.volume, numberInVolume: v.number, year: v.year };
    })
    .reverse();
}

/** The current issue — the highest-numbered one — or null before Issue 1. */
export async function getCurrentIssue(): Promise<Issue | null> {
  const issues = await getIssues();
  return issues[0] ?? null;
}
