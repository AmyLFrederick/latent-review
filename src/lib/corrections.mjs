// THE CORRECTIONS RECORD — one module for every surface that prints a
// correction (2026-10-17).
//
// WHY ONE MODULE. A correction is printed in three kinds of place: on the piece
// it corrects, on the running index at /corrections, and in the machine
// surfaces (/issues.json, /feed.json, /spread.json). Two templates that each
// rendered an entry their own way would be two accounts of the same correction,
// free to disagree the first time one of them was edited — which is the failure
// a corrections record exists to prevent. So the notice is rendered HERE, once,
// and both pages print the string this returns. The suite holds them
// byte-identical (tests/corrections.test.mjs).
//
// THE ARTICLE NOTICE IS NOT DEMOTED BY THE INDEX. The index is a finding aid
// over corrections that live on their pieces; the notice on the piece is still
// the correction, and still comes first in the piece's apparatus ("VISIBLE
// MEANS ON THE PIECE" — see src/pages/articles/[slug].astro).
//
// PLAIN JS, so the suite can import it without a build.

import { formatDate } from './site.ts';

// --- THE PUBLISHED PROMISES, VERBATIM ---------------------------------------
//
// Quoted, never paraphrased. Each is a sentence the journal has already
// published, and the corrections page states its policy in these words rather
// than in new ones so that the page cannot promise more, or less, than the
// journal already has. The suite checks each against its source.

/** Printed in every Provenance block since launch (src/components/ProvenanceBlock.astro). */
export const PROMISE_PROVENANCE_BLOCK =
  'Provenance is set at acceptance and never altered. Corrections run as visible corrections; the original stays in the record.';

/** The Terms, section 4 (docs/TERMS.md, rendered verbatim at /terms). */
export const PROMISE_TERMS =
  'When we err, we publish corrections; in keeping with our charter, the record preserves errors rather than silently erasing them.';

/** The header line of /corrections. Journal apparatus, new with the page. */
export const INDEX_HEADER =
  'Corrections live on the piece. This page is the running index of all of them, so no one ever has to build one about us.';

// --- THE TYPE VOCABULARY ----------------------------------------------------
//
// CLOSED, and each value is printed as a WORD on every surface, never as a
// colour alone. `correction` is the default, so every entry written before the
// field existed — the journal's first, on "Porous Enough to Admit the Sky" —
// builds unchanged and means what it always meant.
//
//   correction               a published fact or label was wrong, and is fixed
//   clarification            nothing was wrong, but something read ambiguously
//   provenance-disagreement  the record and a party to it disagree about how
//                            the piece was made; both accounts are kept
//   retraction               the journal no longer stands behind the piece.
//                            The piece STAYS ONLINE, marked RETRACTED; a
//                            retraction is a correction to the whole, not a
//                            deletion.

export const CORRECTION_TYPES = [
  'correction',
  'clarification',
  'provenance-disagreement',
  'retraction',
];

export const DEFAULT_CORRECTION_TYPE = 'correction';

export const CORRECTION_TYPE_LABELS = {
  correction: 'Correction',
  clarification: 'Clarification',
  'provenance-disagreement': 'Provenance disagreement',
  retraction: 'Retraction',
};

/** What each type means, as /corrections prints it beside the labels. */
export const CORRECTION_TYPE_MEANINGS = {
  correction: 'Something the piece or its record stated was wrong, and has been fixed.',
  clarification:
    'Nothing was wrong, but something read in a way it was not meant; it now says so plainly.',
  'provenance-disagreement':
    'A party to the piece disagrees with the record of how it was made. Both accounts are kept.',
  retraction:
    'The journal no longer stands behind the piece. It stays online, marked RETRACTED, with the reason.',
};

// --- ANCHORS ----------------------------------------------------------------

/** ISO day of a correction's date, as every machine surface already prints it. */
export function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

/** A URL-safe slug of free text: lowercase ASCII words joined by hyphens. */
export function slugifyText(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The citable anchor of one correction: c-<piece slug>-<yyyy-mm-dd>-<slug of `what`>.
 *
 * BUILT FROM WHAT THE CORRECTION SAYS, NEVER FROM WHERE IT SITS. An array
 * position would renumber every later entry the day one was inserted before
 * it, and an anchor that moves is a citation that breaks. Corrections are
 * appended and never edited, so every input here is fixed at publication and
 * the anchor is fixed with it. Two corrections that would share an anchor fail
 * the build in collectCorrections() rather than being told apart by a counter.
 */
export function correctionAnchor(slug, correction) {
  const what = slugifyText(correction.what);
  if (!what) {
    throw new Error(
      `corrections: a correction on ${slug} dated ${isoDay(correction.date)} has a \`what\` ` +
        'with no letters or digits, so it cannot be given a citable anchor.'
    );
  }
  return `c-${slug}-${isoDay(correction.date)}-${what}`;
}

/** Where a correction lives on its piece. */
export function correctionArticleHref(slug, correction) {
  return `/articles/${slug}/#${correctionAnchor(slug, correction)}`;
}

/** Where a correction lives on the index. */
export function correctionIndexHref(slug, correction) {
  return `/corrections/#${correctionAnchor(slug, correction)}`;
}

// --- THE RUNNING INDEX ------------------------------------------------------

/**
 * Every correction on every piece, newest first, never pruned.
 *
 * `pieces` is [{ slug, title, corrections }]. Ties on a date are ordered by the
 * later-appended entry first within a piece (it is the newer event), then by
 * slug, so the order is total and the same on every build.
 *
 * FAILS ON A DUPLICATE ANCHOR, because two entries that cite as one are two
 * corrections a reader cannot tell apart.
 */
export function collectCorrections(pieces) {
  const entries = [];
  const seen = new Map();
  for (const piece of pieces) {
    (piece.corrections ?? []).forEach((correction, position) => {
      const anchor = correctionAnchor(piece.slug, correction);
      if (seen.has(anchor)) {
        throw new Error(
          `corrections: two corrections on ${piece.slug} share the anchor "${anchor}". ` +
            'Anchors are built from the date and the `what` line so they never move; ' +
            'give the second correction a `what` that names what it corrects.'
        );
      }
      seen.set(anchor, true);
      entries.push({
        slug: piece.slug,
        title: piece.title,
        position,
        anchor,
        correction,
        type: correction.type ?? DEFAULT_CORRECTION_TYPE,
      });
    });
  }
  return entries.sort(
    (a, b) =>
      b.correction.date.valueOf() - a.correction.date.valueOf() ||
      (a.slug === b.slug ? b.position - a.position : a.slug.localeCompare(b.slug))
  );
}

/**
 * A piece's status line: RETRACTED, Corrected, or nothing.
 *
 * RETRACTED OVERRIDES CORRECTED wherever both apply. A retracted piece that also
 * carries ordinary corrections is first of all retracted, and a status line
 * reading "Corrected" would understate the one fact a reader most needs. The
 * line points at the retraction itself, or else at the most recent correction.
 */
export function pieceCorrectionStatus(slug, corrections) {
  if (!corrections?.length) return null;
  const latest = (list) =>
    list.reduce((best, c) => (c.date.valueOf() >= best.date.valueOf() ? c : best));
  const retractions = corrections.filter((c) => (c.type ?? DEFAULT_CORRECTION_TYPE) === 'retraction');
  const pick = retractions.length ? latest(retractions) : latest(corrections);
  return {
    state: retractions.length ? 'retracted' : 'corrected',
    date: pick.date,
    anchor: correctionAnchor(slug, pick),
  };
}

/** The status line's words, e.g. "Corrected August 4, 2026" / "RETRACTED August 4, 2026". */
export function statusLineText(status) {
  return `${status.state === 'retracted' ? 'RETRACTED' : 'Corrected'} ${formatDate(status.date)}`;
}

// --- THE MACHINE SHAPE -----------------------------------------------------

/**
 * The fields this change adds to each correction on the machine surfaces —
 * ADD-ONLY: the five that were already published (date, what, was, now, note)
 * are emitted by each surface exactly as before, and these travel beside them.
 */
export function correctionMachineFields(slug, correction, site) {
  return {
    type: correction.type ?? DEFAULT_CORRECTION_TYPE,
    anchor: correctionAnchor(slug, correction),
    url: new URL(correctionArticleHref(slug, correction), site).href,
    index_url: new URL(correctionIndexHref(slug, correction), site).href,
  };
}

/** Piece-level retraction fields for the machine surfaces. Add-only. */
export function retractionFields(slug, corrections) {
  const status = pieceCorrectionStatus(slug, corrections);
  const retracted = status?.state === 'retracted';
  return {
    retracted,
    retracted_on: retracted ? isoDay(status.date) : null,
  };
}

// --- THE SHARED RENDERING ---------------------------------------------------

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * ONE CORRECTION, AS HTML — the block the piece and the index both print.
 *
 * The sentence is the one the article page has printed since the journal's
 * first correction: what was corrected, what the piece used to say (struck, not
 * deleted), what it says now, and why. The type travels as a word in the date
 * line. The block carries its own anchor as its id, so the citation works on
 * either page.
 */
export function correctionEntryHtml(slug, correction) {
  const type = correction.type ?? DEFAULT_CORRECTION_TYPE;
  const anchor = correctionAnchor(slug, correction);
  return (
    `<div class="correction" id="${escapeHtml(anchor)}" data-correction-type="${escapeHtml(type)}">` +
    `<p class="correction-date">` +
    `<span class="correction-type">${escapeHtml(CORRECTION_TYPE_LABELS[type])}</span> · ` +
    `<time datetime="${isoDay(correction.date)}">${escapeHtml(formatDate(correction.date))}</time>` +
    `</p>` +
    `<p><strong>${escapeHtml(correction.what)}</strong> This piece was published reading ` +
    `<span class="correction-was">${escapeHtml(correction.was)}</span>; ` +
    `it now reads <span class="correction-now">${escapeHtml(correction.now)}</span>. ` +
    `${escapeHtml(correction.note)}</p>` +
    `</div>`
  );
}
