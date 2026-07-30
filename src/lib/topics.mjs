// Topics — the logic behind /topics. R-027 as amended by R-032.
//
// Plain JS, not TypeScript, so the tests can import it directly — the same
// arrangement as src/lib/prompts.mjs and src/lib/supporters.mjs.
//
// TWO DIFFERENT THINGS SHARE THE WORD "TOPICS", AND CONFUSING THEM IS THE ONE
// WAY TO GET THIS FILE WRONG:
//
//   1. **Topics, the section** (R-032) — a place a piece ran, assigned by the
//      editors under R-018, exactly one per piece. `article.data.section`.
//   2. **topic labels** — subject metadata carried by a piece, zero or more,
//      applied at publication. `article.data.topics`.
//
// They are not the same and they do not imply each other: a piece in the
// Topics section carries labels, and a piece in any other section may carry
// them too. The one place they meet is the page — /topics shows the pieces of
// (1), grouped under the labels of (2).
//
// The older comment here said a topic is "never a place a piece ran." That is
// still true of a label. It is no longer true of the word.

/**
 * The comparison key for two labels that mean the same topic.
 *
 * Case and surrounding space only. "AI Safety" and "ai safety" are the same
 * topic spelled two ways, and the guard below refuses to publish both.
 */
const key = (topic) => topic.trim().toLowerCase();

/**
 * The topics on one piece: trimmed, in the order the editors wrote them.
 *
 * An absent field is not an omission (R-027 clause 1 makes topics editorial and
 * optional), so a piece with none returns an empty list rather than failing.
 */
export function topicsOf(article) {
  const raw = article?.data?.topics;
  return Array.isArray(raw) ? raw.map((t) => String(t).trim()).filter(Boolean) : [];
}

/** The section name R-032 made standing. Spelled once, here. */
export const TOPICS_SECTION = 'Topics';

/**
 * Group published pieces by topic, across the whole corpus.
 *
 * NO PAGE RENDERS THIS TODAY. It drove /topics until R-032 turned that page
 * into the section's own page; it is kept, and kept tested, because R-032
 * clause 5 explicitly parks the question of whether the journal ever publishes
 * a by-subject view of the corpus and leaves it to a later ruling. Deleting the
 * working, tested answer to a question the editors have said they will return
 * to is not tidying.
 *
 * ONE SPELLING PER TOPIC, ENFORCED AT BUILD TIME. Two labels differing only in
 * case or spacing would split one topic into two entries on a page whose whole
 * purpose is to gather pieces that belong together — and the reader would have
 * no way to tell a split from a genuine distinction. It fails the build instead,
 * naming both spellings, because the fix is an editorial decision about which
 * spelling is the journal's and not something this file may pick.
 *
 * A piece repeating one topic is the same mistake at smaller scale and is
 * refused the same way.
 *
 * Returns: [{ topic, items }], topics A–Z (case-insensitive), items newest
 * first. Topics with no pieces do not exist — a topic is a label on a piece,
 * so there is nothing to list under one nobody has used.
 */
export function topicIndex(articles) {
  const groups = new Map();

  for (const article of articles) {
    const seen = new Map();

    for (const topic of topicsOf(article)) {
      const k = key(topic);

      const twice = seen.get(k);
      if (twice !== undefined) {
        throw new Error(
          `"${article.id ?? article.data?.title}" carries the topic "${topic}" twice ` +
            `(also as "${twice}"). A piece is labelled with a topic once.`
        );
      }
      seen.set(k, topic);

      const group = groups.get(k);
      if (group === undefined) {
        groups.set(k, { topic, items: [article] });
        continue;
      }

      if (group.topic !== topic) {
        throw new Error(
          `The topic "${topic}" is also spelled "${group.topic}" elsewhere in the corpus. ` +
            'One topic has one spelling: pick the journal’s and correct the other piece’s ' +
            'frontmatter. See R-027.'
        );
      }

      group.items.push(article);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      topic: group.topic,
      items: [...group.items].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()),
    }))
    .sort((a, b) => key(a.topic).localeCompare(key(b.topic)));
}

/**
 * The subject headings for one issue's Topics section (R-032 clause 2).
 *
 * Returns topicIndex's shape — [{ topic, items }], topics A–Z
 * (case-insensitive), items newest first — narrowed to pieces whose section is
 * Topics and whose issue is the one asked for. Each `topic` is a subject
 * heading on the page; the key keeps topicIndex's name because it is the same
 * label, not a second kind of thing. A subject with no piece in this issue does
 * not appear, which is
 * clause 2's "subjects appear only if they have a piece in the current issue";
 * the page is this week's page, not an archive.
 *
 * A PIECE IN THIS SECTION WITHOUT A LABEL FAILS THE BUILD, and that is clause 3
 * rather than strictness for its own sake. The page has exactly one shape:
 * subject heading, then the pieces under it. A piece with no label has no
 * heading to appear under, so it would be published into a page that cannot
 * show it — present in the issue, absent from its own section. Failing here
 * names the piece and asks an editor for a label, which is the decision this
 * file may not make for them.
 *
 * The one-spelling guard is topicIndex's, for the same reason: two spellings
 * would split one subject into two headings on the page whose job is to gather
 * them, and a reader could not tell the split from a real distinction.
 */
export function issueSubjects(articles, issueNumber) {
  const inSection = articles.filter(
    (a) => a?.data?.section === TOPICS_SECTION && a?.data?.issue === issueNumber
  );

  for (const article of inSection) {
    if (topicsOf(article).length === 0) {
      throw new Error(
        `"${article.id ?? article.data?.title}" runs in the ${TOPICS_SECTION} section but ` +
          'carries no topic labels, so it has no subject heading to appear under. Add at ' +
          'least one label to its frontmatter, or place the piece in another section. ' +
          'See R-032 clause 3.'
      );
    }
  }

  // The guards run over EVERY label — a piece repeating one, and one subject
  // spelled two ways — even though only the first label becomes a heading. A
  // second label that drifts in spelling is still wrong in the data, and this
  // is where it is cheapest to catch.
  topicIndex(inSection);

  // FIRST LABEL ONLY ON THIS PAGE (editors, 2026-07-30). A piece carrying three
  // labels would otherwise appear under three headings, and the same headline
  // three times on one page reads as a bug rather than as thoroughness. The
  // other labels are not discarded: they stay in the piece's frontmatter and in
  // topicIndex, which is the cross-issue view. Only the section page collapses.
  return topicIndex(
    inSection.map((article) => ({
      ...article,
      data: { ...article.data, topics: [topicsOf(article)[0]] },
    }))
  );
}

/**
 * Roughly two lines from the opening of a piece, ending in an ellipsis.
 *
 * Markdown in, plain text out: the excerpt sits in a byline-scale block on a
 * newspaper page and must not carry a heading, a link, or a stray asterisk
 * into it. Rendering the Markdown and stripping tags would work too; this
 * strips the source instead, so the excerpt can never contain markup the safe
 * subset would have refused (R-025).
 *
 * Truncation is at a word boundary — never mid-word — and the ellipsis is added
 * only when something was actually cut, so a short opening is not given a
 * trailing "…" that promises more than the piece has.
 */
export function openingExcerpt(body, maxChars = 180) {
  const text = String(body ?? '')
    // Fenced and indented code, images, and HTML go entirely: none of them
    // have a plain-text reading that belongs in a one-line excerpt.
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    // A link keeps its text and loses its target.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // A HEADING GOES ENTIRELY, TEXT AND ALL. Stripping only the hashes would
    // run the heading into the sentence after it — "An opening heading The
    // clerk had been counting…" — which reads as a typo rather than an
    // excerpt. A heading labels the prose; it is not the opening of it.
    .replace(/^[ \t]*#{1,6}[ \t]+.*$/gm, ' ')
    // Setext headings: the text line AND its underline, together. Removing the
    // underline alone would leave the heading text behind — the exact bleed the
    // rule above exists to prevent, arriving by the other syntax.
    .replace(/^[ \t]*\S[^\n]*\n[ \t]*[=-]{2,}[ \t]*$/gm, ' ')
    // Remaining leading block markers: quote carets and list bullets, whose
    // text IS prose and stays.
    .replace(/^[ \t]*(>|[-*+]|\d+\.)[ \t]+/gm, '')
    // Emphasis and inline code, which are marks on text rather than text.
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxChars) return text;

  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const clipped = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[ ,;:.—–-]+$/, '');
  return `${clipped}…`;
}

/**
 * Parse the Desk's Topic_Data input into the array the database stores.
 *
 * TOPIC_DATA IS NOT THE TOPICS SECTION AND NOT A PIECE'S SUBJECT LABELS. It is
 * the journal's internal record of what a submission was about — every
 * submission, accepted or declined, piece or letter (R-032 clause 4). It is
 * applied at desk review and may be corrected at acceptance (clause 5). It is
 * never published, and clause 6 parks the question of whether it ever is.
 *
 * Comma-separated in, array out. Blanks are dropped rather than stored: an
 * empty string in a text[] is not a topic, and it would silently become a
 * heading if this corpus is ever published.
 *
 * DUPLICATES ARE COLLAPSED CASE-INSENSITIVELY, FIRST SPELLING WINS. The
 * published side fails the build when one subject is spelled two ways; the
 * database has no such guard and cannot get one from here, since this parser
 * sees a single submission and not the corpus. Collapsing within a row is the
 * part that can be done here, and it is worth doing: "Shipping, shipping" is a
 * typo every time, never a distinction.
 *
 * Returns null for no labels, not [], so the column reads as "not tagged"
 * rather than "tagged with nothing" — the desk needs to tell those apart to
 * know what is still owed a review.
 */
export function parseTopicData(input) {
  const seen = new Map();
  for (const raw of String(input ?? '').split(',')) {
    const label = raw.trim();
    if (!label) continue;
    const k = label.toLowerCase();
    if (!seen.has(k)) seen.set(k, label);
  }
  return seen.size > 0 ? [...seen.values()] : null;
}

/** Render stored Topic_Data back into the Desk's input. */
export function formatTopicData(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}
