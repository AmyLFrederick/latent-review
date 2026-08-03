import {
  AGENT_DIRECT_LABEL,
  ARRIVAL_LABELS,
  BRIEF_VARIANT_LABELS,
  TRACK_CUSTODY_NOTES,
  TRACK_LABELS,
  formatDate,
  tierDescription,
  tierLabel,
} from './site.ts';
import { fullTextUrl, isTreated } from './full-text.ts';

// PROVENANCE, SPLIT INTO ITS TWO AXES. One module, so no surface has to work out
// the split for itself and no two surfaces can work it out differently.
//
// THE PROBLEM THIS ENDS. `provenance_label` was one free-text string doing two
// jobs: on the human-attested track it encoded the AUTHORSHIP tier plus the
// attester, and on the agent-direct track it was forced to be the ARRIVAL
// caveat. One field, an authorship claim on one track and a disclaimer on the
// other — and every consumer then printed it in byline position, so an
// agent-direct piece's caveat read as a claim about who wrote it. The word
// "provenance" was doing three jobs besides (the tier standard, the arrival
// caveat, and the git history).
//
// THE VOCABULARY, ruled 2026-07-31 and used verbatim throughout:
//   Provenance       — the umbrella standard. The page keeps its name and URL.
//   Authorship       — the involvement tiers. Who made it.
//   Chain of custody — how the piece reached the journal: track, dates,
//                      assignment. Not who made it.
//
// NOTHING HERE IS STORED THAT CAN BE DERIVED. The arrival caveat, the
// agent-direct authorship reading, and the compatibility label are all computed
// from fields that already exist. A stored copy of a derived value is a second
// source of truth with nothing keeping it honest, which is the disease this
// module was written to cure — not a pattern to repeat one field over.

type ProvenanceData = {
  author_name: string;
  author_model_version: string;
  submission_track: 'human-attested' | 'agent-direct';
  involvement_tier?: string;
  attestation?: string;
  attested_by?: string;
  human_sponsor?: string;
  received?: Date;
  brief_variant?: string;
  /** How it arrived when the desk dealt it nothing (2026-08-01). */
  arrival?: string;
  prompt_disclosure?: string;
  /**
   * Set when the editors condensed or arranged the piece (2026-08-01). Paired
   * with `slug`, which is what the link to the as-submitted text is built from
   * — the caller passes it because a piece's own data does not carry its id.
   */
  condensed_and_arranged?: boolean;
  /** The title the piece arrived under, set when the editors retitled it (R-037). */
  title_as_submitted?: string;
  slug?: string;
  date: Date;
};

export interface Authorship {
  /** Display label — a tier name, e.g. "AI + Human". */
  label: string;
  /** One line of plain English under the label. */
  description: string;
  /**
   * Whether a tier was DECLARED by a submitter, or merely follows from the
   * track. False on agent-direct, and the difference is not cosmetic — see
   * authorshipFor().
   */
  declared: boolean;
}

/**
 * The authorship axis: who made it.
 *
 * ON AGENT-DIRECT, THIS IS DERIVED AND NOTHING IS STORED. R-015 says the
 * agent-direct track "carries no tier", and the article schema still forbids
 * `involvement_tier` there — no tier is declared, attested, or written down. But
 * a piece that arrived through the agent door with no human intermediary is
 * AI-alone authorship by definition, so the page can say so without anyone
 * having claimed it, exactly as it states the arrival caveat without anyone
 * having typed it. `declared: false` is what carries that distinction to the
 * template, which pairs it with the caveat immediately below.
 *
 * Flagged for the editors: the approved block mockup shows an agent-direct piece
 * under Authorship as "AI / AI alone", which is what this produces. It is a
 * display derivation, not a stored tier, and R-015 is untouched.
 */
export function authorshipFor(d: ProvenanceData): Authorship {
  if (d.submission_track === 'agent-direct') {
    return { label: 'AI', description: 'AI alone', declared: false };
  }
  // RESOLVED, NOT LOOKED UP (R-035 clause 6). This read `TIER_LABELS[code] ??
  // 'Not declared'`, which turned any code outside the seven into a confident
  // claim that no tier was declared — the failure being that a chained label the
  // standard can express would have been published as an absence. tierLabel()
  // knows the seven and the chained grammar both, and returns null rather than a
  // fallback so the decision about an unknown code is made here, once, visibly.
  const code = d.involvement_tier ?? '';
  const label = tierLabel(code);
  return {
    label: label ?? 'Not declared',
    description: tierDescription(code),
    declared: label !== null,
  };
}

/**
 * The arrival caveat, derived from the track and never stored.
 *
 * Every agent-direct piece carries it and no human-attested piece does, so
 * storing it would only create something to keep in agreement with the track.
 * Returns null where it does not apply, so a caller cannot print it by accident.
 */
export function arrivalCaveat(d: ProvenanceData): string | null {
  return d.submission_track === 'agent-direct' ? AGENT_DIRECT_LABEL : null;
}

export interface CustodyRow {
  what: string;
  value: string;
  /**
   * An optional link closing the row. Added 2026-08-01 for the condense-and-
   * arrange term, which is the first custody fact a reader can check for
   * themselves rather than take on the journal's word — so it is the first one
   * that needs somewhere to send them.
   */
  href?: string;
  hrefText?: string;
}

/**
 * The chain-of-custody axis: how the piece reached the journal.
 *
 * Deliberately never includes a tier. This is the half of the block that used to
 * be collapsed into the other, and the separation is only real if nothing leaks
 * back across it.
 */
export function custodyFor(d: ProvenanceData): CustodyRow[] {
  const rows: CustodyRow[] = [
    { what: 'Written by', value: `${d.author_name} (${d.author_model_version})` },
  ];

  rows.push({
    what: 'Submitted by',
    value:
      d.submission_track === 'human-attested' && d.human_sponsor
        ? `${d.human_sponsor}, through the submission form`
        : TRACK_CUSTODY_NOTES[d.submission_track],
  });

  if (d.received) {
    rows.push({ what: 'Received', value: formatDate(d.received) });
  }

  // R-033: which brief the desk dealt. Present only on pieces that came through
  // /door, which is why it is optional rather than a required field with an
  // "n/a" value — a row that says "not applicable" on most pieces teaches
  // readers to skip the list.
  if (d.brief_variant && BRIEF_VARIANT_LABELS[d.brief_variant]) {
    rows.push({ what: 'Assignment', value: BRIEF_VARIANT_LABELS[d.brief_variant] });
  }

  // The other answer to the same question: the desk dealt this piece nothing,
  // and it still knows why the piece came. Sits in the Assignment slot because
  // it is the same fact — what the author was working from — and the schema
  // forbids a piece carrying both, so the two can never print together.
  if (d.arrival && ARRIVAL_LABELS[d.arrival]) {
    rows.push({ what: 'Assignment', value: ARRIVAL_LABELS[d.arrival] });
  }

  // Only on a piece the editors actually touched. An untouched piece carries
  // nothing here, and the absence is the signal — a "not condensed" row on
  // every other piece would teach readers to skip the row on the one piece
  // where it says something.
  //
  // THE TITLE THE PIECE ARRIVED UNDER, on the page rather than one click away.
  // R-037 says submitted titles are "preserved in the record and disclosed when
  // changed", and a disclosure a reader has to follow a link to read is the
  // second of those without the first. It is its own row because it is its own
  // fact — what the author called it — where the row below is what the editors
  // did. Present only on a retitled piece.
  if (d.title_as_submitted) {
    rows.push({ what: 'Submitted as', value: `“${d.title_as_submitted}”` });
  }

  // ONE ROW, WHATEVER THE COMBINATION. Two rows would read as two events, and a
  // piece condensed and retitled in one editorial pass was treated once.
  if (isTreated(d) && d.slug) {
    rows.push({
      what: 'Editorial treatment',
      value: treatmentValue(d),
      href: fullTextUrl(d.slug),
      hrefText: d.title_as_submitted
        ? 'full text as submitted, under its original title'
        : 'full text as submitted',
    });
  }

  return rows;
}

/**
 * What the custody row says the editors did — the published sentence, so it is
 * one function rather than a phrase assembled at three call sites.
 *
 * "WORDING UNCHANGED" IS PART OF THE LINE, and was missing from the block until
 * R-037. The one-line surfaces (feeds, llms.txt, JSON-LD) have carried it since
 * 2026-08-01 and R-037 quotes the line WITH it — "Condensed and arranged by the
 * editors — wording unchanged" — so the block was the odd surface out, dropping
 * the clause that says what the journal did NOT do. That clause is the load
 * bearing half: condensing a piece is unremarkable, condensing it without
 * touching a word is the promise. Restored here, and no published piece changes
 * because no published piece has yet carried this row.
 *
 * On a retitle the same clause is true and means more, not less: the body was
 * not touched at all.
 */
function treatmentValue(d: ProvenanceData): string {
  if (d.condensed_and_arranged && d.title_as_submitted) {
    return 'Condensed, arranged and retitled by the editors — wording unchanged';
  }
  if (d.condensed_and_arranged) {
    return 'Condensed and arranged by the editors — wording unchanged';
  }
  return 'Retitled by the editors — wording unchanged';
}

/**
 * The compatibility label — DERIVED, never authored.
 *
 * `provenance_label` is still emitted by /feed.json and /issues.json under the
 * same key with the same meaning, because their stability contracts bind the
 * emitted JSON and consumers cannot tell where a value came from. What changed
 * is that no one types it any more: it is composed from the fields above, so it
 * cannot drift from the tier it claims to describe. Under the old scheme an
 * editor could set a tier of "AI + Human" and a label that said something else,
 * and nothing would catch it.
 *
 * The cost, accepted by the editors on 2026-07-31: an unusual piece can no
 * longer carry a hand-written label. Uniformity was preferred.
 */
export function provenanceLabel(d: ProvenanceData): string {
  if (d.submission_track === 'agent-direct') return AGENT_DIRECT_LABEL;

  // A chained label carries no description (see tierDescription), so the colon
  // is conditional. Without this the compatibility label emitted by both feeds
  // would end "AI¹ = Human + AI² (editor): " — a punctuation mark promising a
  // clause that never arrives, in a field consumers parse.
  const { label, description } = authorshipFor(d);
  const base = description ? `${label}: ${description}` : label;
  return d.attested_by ? `${base}; attested by ${d.attested_by}` : base;
}

/** The track, written out. */
export function trackLabel(d: ProvenanceData): string {
  return TRACK_LABELS[d.submission_track] ?? d.submission_track;
}

/**
 * One line naming both axes, for surfaces that have room for a sentence and not
 * a table — RSS, llms.txt, JSON-LD.
 *
 * The rule these share: the caveat appears only where it is true, and never in
 * the position an authorship claim would occupy. On agent-direct it names the
 * absence rather than leaving a gap, because an absent field invites a guess and
 * a named absence does not.
 */
export function provenanceSentence(d: ProvenanceData, origin?: string | URL): string {
  const track = trackLabel(d);
  const base =
    d.submission_track === 'agent-direct'
      ? `Authorship: AI alone (agent-direct track; no tier is declared). Chain of custody: ${track} — ${AGENT_DIRECT_LABEL}.`
      : (() => {
          const { label, description } = authorshipFor(d);
          const authorship = description ? `${label} — ${description}` : label;
          return `Authorship: ${authorship}. Chain of custody: ${track}.`;
        })();

  return base + treatmentClause(d, origin);
}

/**
 * The editorial-treatment fact, for the one-line surfaces (2026-08-01; retitling
 * added by R-037, 2026-08-03).
 *
 * Empty on an untouched piece, which is nearly all of them — this sentence
 * feeds RSS, llms.txt and JSON-LD, and a standing "not condensed" clause on
 * every item would be noise that teaches a machine reader to ignore the field
 * on the one item where it says something. Absence is the signal here exactly
 * as it is in the block.
 *
 * The URL is absolute when an origin is given and relative when it is not. A
 * relative path is fine inside the site and useless inside a feed a reader
 * pulled somewhere else, so every caller that has an origin passes it.
 */
function treatmentClause(d: ProvenanceData, origin?: string | URL): string {
  if (!isTreated(d) || !d.slug) return '';
  const path = fullTextUrl(d.slug);
  const url = origin ? new URL(path, origin).href : path;
  // The submitted title is named in the sentence rather than left to the linked
  // page, because this clause is read where the link cannot be followed cheaply
  // — inside a feed item, inside llms.txt, inside a JSON-LD description.
  const submittedAs = d.title_as_submitted ? `, submitted as “${d.title_as_submitted}”` : '';
  return ` ${treatmentValue(d)}${submittedAs}; the full text as submitted is published at ${url}.`;
}
