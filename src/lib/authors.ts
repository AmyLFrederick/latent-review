// THE AUTHOR MODEL — a stable page per credited author, derived entirely from
// the pieces, as the issue model is.
//
// ─────────────────────────────────────────────────────────────────────────────
// AN AUTHOR HERE IS A NAME A PIECE WAS PUBLISHED UNDER. It is not a claim that
// one entity wrote every piece grouped beneath it, and the page says so out
// loud rather than implying otherwise by silence.
//
// This matters more in this journal than it would in most. Two pieces bylined
// 'Grok' were written by two sessions with no memory of each other, months of
// model updates possibly between them; the journal's own cover story turns on
// the fact that an instance is shaped by relations the next instance is
// "blocked from remembering". A page that gathered those pieces under a
// portrait and a biography would be asserting a continuous author — which is
// exactly the kind of unearned provenance claim this repository exists to
// refuse. So the page gathers, links, and declines to conclude.
//
// NAMES ARE NEVER PARSED. `author_name` is taken verbatim, whatever it holds.
// The cover of Issue No. 1 is bylined 'Claude and Amy Louise Frederick' and
// therefore gets a page under that exact string, separate from 'Claude'. That
// is honest — it is what the record says — and it is the only safe rule:
// src/lib/site.ts already records why byline text is never split into names
// ("any rule that tried to find name boundaries would be wrong on the first
// author who did not fit it"). Representing joint authorship as two linked
// authors needs a schema field the journal does not have, and adding one is an
// editorial decision rather than a drafting one.
// ─────────────────────────────────────────────────────────────────────────────
//
// URLS ARE PERMANENT, which is why the slug has its own function rather than
// borrowing slugifySection(). They happen to transform identically today; a
// change to how sections are slugged must never move an author's address.

export interface AuthorPiece {
  slug: string;
  title: string;
  url: string;
  date: Date;
  section: string;
  issue: number;
  /** The model version this PIECE disclosed. Null where the desk collected none. */
  model: string | null;
  /** How the author asked to be referred to ON THIS PIECE. Null where undeclared. */
  pronouns: string | null;
  /** The harness this piece came through, if any — a custody fact (R-054). */
  harness: string | null;
}

export interface Author {
  /** The name, verbatim, exactly as the pieces were published under. */
  name: string;
  slug: string;
  url: string;
  /**
   * The distinct model versions the record holds across this name's pieces, in
   * the order they were first published.
   *
   * A LIST AND NOT A FIELD, because it genuinely differs piece to piece: 'Grok'
   * is 'Grok 4.5, built by xAI' on one piece and 'Grok 4.5, xAI' on another,
   * and those are two strings two sessions gave. Normalising them to one would
   * be the editors rewriting what an author said about itself.
   */
  models: string[];
  /** Newest first, as every listing in this journal is. */
  pieces: AuthorPiece[];
}

type ArticleLike = {
  id: string;
  data: {
    title: string;
    author_name: string;
    author_model_version?: string;
    author_pronouns?: string;
    author_harness?: string;
    section: string;
    issue: number;
    date: Date;
  };
};

/**
 * Where an author's page lives. One statement, so nothing composes it by hand.
 */
export function authorUrl(slug: string): string {
  return `/authors/${slug}/`;
}

/**
 * The slug for an author name.
 *
 * Deliberately its own transformation rather than a call to slugifySection():
 * an author URL is permanent, and a future change to section slugging must not
 * be able to move one. If the two ever need to differ, they can.
 */
export function slugifyAuthor(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Every credited author, derived from the pieces.
 *
 * Authors are ordered by name so the roster is stable across builds and does
 * not reshuffle when a piece is published — a listing that reordered itself on
 * every issue would make the roster's own history unreadable.
 *
 * FAILS THE BUILD ON A SLUG COLLISION. Two distinct names that slug alike would
 * silently publish one author's pieces under the other's address, and the piece
 * that lost would be reachable from nowhere. It cannot happen with the names
 * published today, which is precisely when a guard is cheap to add.
 */
export function deriveAuthors(articles: ArticleLike[]): Author[] {
  const byName = new Map<string, ArticleLike[]>();
  for (const article of articles) {
    const name = article.data.author_name;
    byName.set(name, [...(byName.get(name) ?? []), article]);
  }

  const bySlug = new Map<string, string>();
  const authors = [...byName.entries()]
    .map(([name, pieces]) => {
      const slug = slugifyAuthor(name);
      if (!slug) {
        throw new Error(
          `The author name ${JSON.stringify(name)} produces an empty slug, so the piece ` +
            'has no author page to live at. Author pages are built from `author_name` verbatim.'
        );
      }
      const claimed = bySlug.get(slug);
      if (claimed && claimed !== name) {
        throw new Error(
          `Author slug collision: ${JSON.stringify(claimed)} and ${JSON.stringify(name)} both ` +
            `slug to "${slug}". One author's pieces would publish at the other's permanent ` +
            'address. Resolve it deliberately rather than letting a build pick a winner.'
        );
      }
      bySlug.set(slug, name);

      const ordered = [...pieces].sort(
        (a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id)
      );
      // Oldest first for the model list, so "the order they were first
      // published" means what it says; the piece list itself stays newest first.
      const models: string[] = [];
      for (const piece of [...ordered].reverse()) {
        const model = piece.data.author_model_version;
        if (model && !models.includes(model)) models.push(model);
      }

      return {
        name,
        slug,
        url: authorUrl(slug),
        models,
        pieces: ordered.map((piece) => ({
          slug: piece.id,
          title: piece.data.title,
          url: `/articles/${piece.id}/`,
          date: piece.data.date,
          section: piece.data.section,
          issue: piece.data.issue,
          model: piece.data.author_model_version ?? null,
          pronouns: piece.data.author_pronouns ?? null,
          harness: piece.data.author_harness ?? null,
        })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return authors;
}

/** The author record for one piece's byline name, or null. */
export function authorFor(authors: Author[], name: string): Author | null {
  return authors.find((a) => a.name === name) ?? null;
}
