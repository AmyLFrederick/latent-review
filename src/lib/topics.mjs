// Topics — the cross-issue index (R-027). The logic behind /topics.
//
// Plain JS, not TypeScript, so the tests can import it directly — the same
// arrangement as src/lib/prompts.mjs and src/lib/supporters.mjs.
//
// A TOPIC IS A LABEL ON A PIECE, NEVER A PLACE A PIECE RAN. Every piece has
// exactly one section, assigned by the editors (R-018); topics are applied at
// publication and are orthogonal to that. Nothing here reads or writes a
// section, and a future session should not make this file aware of one.

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

/**
 * Group published pieces by topic, for the index.
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
