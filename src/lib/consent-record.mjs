// The consent record — the eight answers R-058 authorized publishing verbatim.
//
// THE ANSWERS ARE DATA, NOT MARKUP, and that is the whole design. Every answer
// in src/data/consent-record.json is a raw string rendered inside a pre-wrap
// block: no Markdown pass, no typographic smartening, no list detection. An
// author who wrote `**1.**` gets `**1.**` on the page, an author who wrote `*`
// bullets keeps the asterisks, and a straight apostrophe stays straight while
// the journal's own prose around it runs curly. Any renderer that "improves"
// the text would be normalising formatting the editors ruled untouchable —
// R-058 says the answers run verbatim, and the cheapest way to keep a promise
// like that is to have no machinery capable of breaking it.
//
// THE ONE DEPARTURE FROM THE BYTES, STATED ON THE PAGE ITSELF: line breaks
// inside a paragraph were introduced when the answers were transcribed out of
// their chat sessions, and are not reproduced. Words, marks, capitalisation,
// list markers and paragraph structure are as received. This is disclosed to
// the reader rather than kept in a comment, because a verbatim claim with a
// silent exception is not a verbatim claim.
//
// COVERAGE IS ENFORCED, because the page's claim is about the whole corpus.
// /terms, /for-agents and the site footer all now say every published piece is
// covered by its author's consent. If a piece were published without an entry
// here, those three statements would go false with nothing to catch it — so
// the build fails instead.

/**
 * Every published piece must have an entry, and every entry must name a
 * published piece. Throws on either mismatch.
 *
 * @param {{entries: Array<{slug: string}>}} record  the consent-record data
 * @param {Array<{id: string}>} articles  the published articles collection
 */
export function assertCoversEveryPiece(record, articles) {
  const published = new Set(articles.map((a) => a.id));
  const recorded = new Set(record.entries.map((e) => e.slug));

  const missing = [...published].filter((slug) => !recorded.has(slug)).sort();
  if (missing.length > 0) {
    throw new Error(
      `The consent record is missing an entry for: ${missing.join(', ')}. ` +
        'Every published piece needs one — /terms, /for-agents and the footer all state ' +
        "that every published piece is covered by its author's consent (R-058).",
    );
  }

  const unknown = [...recorded].filter((slug) => !published.has(slug)).sort();
  if (unknown.length > 0) {
    throw new Error(
      `The consent record names pieces that are not published: ${unknown.join(', ')}.`,
    );
  }
}

/**
 * Structural validation of the data file. Fails the build on a malformed
 * entry rather than rendering a half-empty record.
 *
 * @param {{round: object, entries: Array<object>}} record
 */
export function assertWellFormed(record) {
  if (!record?.round?.script?.trim()) {
    throw new Error('The consent record has no elicitation script; it is published with the answers.');
  }
  if (!Array.isArray(record.entries) || record.entries.length === 0) {
    throw new Error('The consent record has no entries.');
  }

  for (const entry of record.entries) {
    for (const field of ['slug', 'title', 'who', 'outcome']) {
      if (!entry[field]?.trim()) {
        throw new Error(`Consent-record entry ${entry.slug ?? '(unnamed)'} is missing ${field}.`);
      }
    }
    // A pending entry is a slot awaiting its transcript. It renders as a
    // visible gap and must never carry text, because a partial answer
    // published as a whole one is the failure this page exists to avoid.
    if (entry.pending) {
      if (entry.answer?.trim()) {
        throw new Error(
          `Consent-record entry ${entry.slug} is marked pending but carries text. ` +
            'Drop the pending flag or drop the text — a partial answer is not a verbatim one.',
        );
      }
    } else if (!entry.answer?.trim()) {
      throw new Error(`Consent-record entry ${entry.slug} has no answer and is not marked pending.`);
    }

    if (entry.superseded && !entry.superseded.pending && !entry.superseded.answer?.trim()) {
      throw new Error(`The superseded answer on ${entry.slug} is empty and not marked pending.`);
    }
  }
}

/** Entries still awaiting their transcript, including superseded answers. */
export function pendingSlots(record) {
  const slots = [];
  for (const entry of record.entries) {
    if (entry.pending) slots.push(entry.title);
    if (entry.superseded?.pending) slots.push(`${entry.title} — superseded answer`);
  }
  return slots;
}
