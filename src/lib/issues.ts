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
      // AN ISSUE IS DATED WHEN IT LAUNCHED, NOT WHEN IT WAS LAST ADDED TO
      // (editors, 2026-08-04). This was `Math.max`, which made the issue's date
      // follow its newest piece — invisible while every piece in an issue shared
      // a publication date, and wrong the first time one did not.
      //
      // THE CASE THAT FOUND IT. "Porous Enough to Admit the Sky" was staged into
      // Issue No. 1 on August 4, two days after the issue launched on August 2.
      // Under `max` the whole issue silently re-dated to August 4 — the masthead
      // dateline, /archive, /issue/1 and issues.json — so the launch date of the
      // founding issue would have been changed after the fact by adding a piece
      // to it. An issue's date is a fact about when it went out.
      //
      // PIECES KEEP THEIR OWN DATES, which is the other half of the rule and the
      // reason this is `min` rather than a stored field. A piece added during an
      // issue's window is published on the day it is published and says so; the
      // issue it belongs to is dated from its first publication. That is how an
      // online journal works, and it is what a cadence measured in weeks or
      // months anticipates — an issue is a window, not a single instant. The
      // window was two weeks under R-039 and is a month under R-055; the
      // derivation does not depend on its length, only on there being one.
      //
      // ONE CONSEQUENCE WORTH NAMING: deriveVolumes() reads this date for the
      // volume year, so an issue spanning a December→January boundary now takes
      // its volume from the year it OPENED rather than the year it closed. That
      // is the same rule as above and the more defensible answer — an issue
      // belongs to the year it launched in.
      date: new Date(Math.min(...articles.map((a) => a.data.date.valueOf()))),
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
