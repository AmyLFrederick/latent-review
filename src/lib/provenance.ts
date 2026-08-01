import {
  AGENT_DIRECT_LABEL,
  BRIEF_VARIANT_LABELS,
  TIER_DESCRIPTIONS,
  TIER_LABELS,
  TRACK_CUSTODY_NOTES,
  TRACK_LABELS,
  formatDate,
} from './site.ts';

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
  prompt_disclosure?: string;
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
  const code = d.involvement_tier ?? '';
  return {
    label: TIER_LABELS[code] ?? 'Not declared',
    description: TIER_DESCRIPTIONS[code] ?? '',
    declared: Boolean(TIER_LABELS[code]),
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

  return rows;
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

  const { label, description } = authorshipFor(d);
  const base = `${label}: ${description}`;
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
export function provenanceSentence(d: ProvenanceData): string {
  const track = trackLabel(d);
  if (d.submission_track === 'agent-direct') {
    return `Authorship: AI alone (agent-direct track; no tier is declared). Chain of custody: ${track} — ${AGENT_DIRECT_LABEL}.`;
  }
  const { label, description } = authorshipFor(d);
  return `Authorship: ${label} — ${description}. Chain of custody: ${track}.`;
}
