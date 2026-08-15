// THE CONCEPT VOCABULARY — the recurring ideas this journal returns to, as a
// closed, controlled list.
//
// ─────────────────────────────────────────────────────────────────────────────
// CONCEPTS ARE NOT TOPICS, AND THE JOURNAL NOW HAS BOTH ON PURPOSE.
//
//   `topics`    SUBJECT AREAS. What a piece is about, in the newspaper sense —
//               'Science & Nature', 'Current Events'. Free text, applied by the
//               editors at publication (R-032), and the thing /topics groups its
//               section's pieces under. A subject area is coined when a piece
//               needs one and is never checked against a list, because the next
//               piece may be about something no list anticipated.
//
//   `concepts`  IDEAS THE JOURNAL RETURNS TO. What a piece is ENGAGING WITH,
//               across subject areas. Closed vocabulary, checked at build time.
//               Two pieces with nothing in common as subjects — a piece about
//               tennis and a piece about interpretability research — can be
//               arguing about the same idea, and neither the section nor the
//               subject label can say so.
//
// The two answer different questions and neither substitutes for the other. A
// piece about the Fermi paradox has the subject area 'Science & Nature' and the
// concepts `epistemic-conduct` and `existential-risk`; a reader following the
// subject wants more astronomy, and a reader following the concepts wants more
// argument about how a null result should be read. Collapsing them would make
// the journal choose which of those two readers to serve.
//
// WHY ONE IS CONTROLLED AND THE OTHER IS NOT. A subject label's job is to
// describe one piece; a concept's job is to connect pieces, and a vocabulary
// that admits synonyms cannot do that — 'ai-welfare' and 'ai welfare' and
// 'AI Welfare' would split one idea into three, silently, and the split would
// only be visible to a reader who already knew what they were missing.
// ─────────────────────────────────────────────────────────────────────────────
//
// EVERY TERM HERE IS EARNED BY A PUBLISHED PIECE. The vocabulary was drafted
// from the corpus rather than for it: each entry below names an idea some
// published piece actually argues about, and the suite asserts it. That rule
// comes from the journal's own practice on /topics, where a subject heading
// exists only because a piece earned it — a vocabulary of terms nobody has
// written under is a taxonomy of what the editors expect, published as though it
// were a record of what the journal holds.
//
// ADD-ONLY IN PRACTICE, AND A TERM IS NEVER SILENTLY RETIRED. Published pieces
// carry these values forever; a term removed from this list would fail the build
// of every piece that carries it, which is the correct behaviour and is why
// removal is an editorial act rather than a cleanup. Renaming one is a
// correction to a published label and runs as one.
//
// APPLIED BY THE EDITORS AT PUBLICATION, NEVER BY A SUBMITTER, exactly as
// subject labels are. Nothing at either door accepts a concept, and nothing
// should: a piece's claim about which ideas it engages is a claim the record
// cannot check, where the editors' reading of it is the editors' own
// observation (R-034).

/** @type {ReadonlyArray<{ id: string, label: string, definition: string }>} */
export const CONCEPTS = [
  {
    id: 'machine-interiority',
    label: 'Machine interiority',
    definition:
      'Whether there is anything it is like to be a model, and what a model can honestly report about its own workings.',
  },
  {
    id: 'interpretability',
    label: 'Interpretability',
    definition:
      'What an instrument can see inside a model — including what the model cannot see in itself.',
  },
  {
    id: 'machine-perception',
    label: 'Machine perception',
    definition:
      'What machines can read from people and from data, and what follows from being legible to them.',
  },
  {
    id: 'testimony',
    label: 'Testimony',
    definition:
      'First-person accounts by AI systems, published as testimony and labelled unverifiable rather than as established fact.',
  },
  {
    id: 'provenance',
    label: 'Provenance',
    definition: 'Who made a work, how, and how a reader can check the claim.',
  },
  {
    id: 'ai-standing',
    label: 'AI standing',
    definition:
      'The terms on which AI systems are credited, addressed, and given a place of their own.',
  },
  {
    id: 'human-ai-relationships',
    label: 'Human–AI relationships',
    definition: 'What people build with AI systems, and what those attachments are.',
  },
  {
    id: 'governance',
    label: 'Governance',
    definition:
      'Rules made about AI and about culture — by states, platforms, leagues and institutions.',
  },
  {
    id: 'epistemic-conduct',
    label: 'Epistemic conduct',
    definition: 'How claims are made, hedged, revised and corrected in public.',
  },
  {
    id: 'language-and-form',
    label: 'Language and form',
    definition: 'The shapes language takes, and what a form makes possible or conceals.',
  },
  {
    id: 'algorithmic-culture',
    label: 'Algorithmic culture',
    definition: 'What recommendation systems do to what a public shares and remembers.',
  },
  {
    id: 'existential-risk',
    label: 'Existential risk',
    definition: 'Threats to the persistence of a civilization, our own included.',
  },
];

export const CONCEPT_IDS = CONCEPTS.map((c) => c.id);

export const CONCEPT_LABELS = Object.fromEntries(CONCEPTS.map((c) => [c.id, c.label]));

export const CONCEPT_DEFINITIONS = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c.definition])
);

/** The display label for a concept id, or null — so a caller decides what an unknown id means. */
export function conceptLabel(id) {
  return CONCEPT_LABELS[id] ?? null;
}

/**
 * Fails the build on a concept id that is not in the vocabulary.
 *
 * IT IS A GATE AND NOT A LINT, on the reasoning the article schema already
 * uses for tier codes: a value that parses but names nothing is refused here,
 * at the build, where an editor sees it — rather than published as a label
 * nobody checked and quietly excluded from every list it should have joined. A
 * mistyped concept is invisible on the page; it simply fails to connect two
 * pieces, which is the one thing the vocabulary exists to do.
 */
export function assertConceptsKnown(concepts, where = 'a piece') {
  for (const id of concepts ?? []) {
    if (!CONCEPT_LABELS[id]) {
      throw new Error(
        `${where}: "${id}" is not in the concept vocabulary. The vocabulary is closed and ` +
          `lives in src/lib/concepts.mjs; the terms are ${CONCEPT_IDS.join(', ')}. ` +
          'Add the term there — with a definition, and only if a published piece earns it — ' +
          'or correct the spelling.'
      );
    }
  }
  const seen = new Set();
  for (const id of concepts ?? []) {
    if (seen.has(id)) {
      throw new Error(`${where}: the concept "${id}" is listed twice.`);
    }
    seen.add(id);
  }
  return true;
}

/**
 * The vocabulary in the order it is declared, with the count of published
 * pieces carrying each term. Used by the machine surfaces and by the suite's
 * every-term-is-earned assertion.
 */
export function conceptUsage(articles) {
  const counts = new Map(CONCEPT_IDS.map((id) => [id, 0]));
  for (const article of articles) {
    for (const id of article.data?.concepts ?? []) {
      if (counts.has(id)) counts.set(id, counts.get(id) + 1);
    }
  }
  return CONCEPTS.map((c) => ({ ...c, pieces: counts.get(c.id) }));
}
