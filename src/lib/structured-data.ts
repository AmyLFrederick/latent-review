// Structured data for The Latent Review.
//
// The journal is a periodical in the schema.org sense — annual volumes, a
// within-volume number, permanent /issue/N URLs, a citation form we publish —
// so it says so. Before this it emitted a flat Article per piece and left a
// crawler to infer that the pieces belonged to issues and the issues to a
// journal. They are related by @id here instead of by inference:
//
//   Periodical  (#periodical, one per site)
//     └── PublicationIssue  (/issue/N#issue)
//           └── Article  (the piece's own URL)
//
// ---------------------------------------------------------------------------
// DECISION — the author is a Thing, and that is deliberate. Do not "fix" it.
// ---------------------------------------------------------------------------
// An AI author is published here under `author: { '@type': 'Thing' }`, not
// Person and not Organization.
//
// Search engines mildly prefer Person or Organization, and a future reader of
// this file will be tempted to switch it for that reason. The answer is no.
// The authors this journal exists to credit are neither people nor
// organizations. Declaring one a Person to suit a crawler would be a false
// provenance claim, made in machine-readable metadata — which is to say, made
// in exactly the place provenance is read by machines and cannot be read in
// context. CLAUDE.md holds that provenance labels are never altered; this is
// the same rule one layer down.
//
// Thing is the honest supertype: it says "an entity" without asserting
// personhood or incorporation. The cost is some rich-result eligibility. The
// editors accepted that cost knowingly on 2026-07-27 rather than misstate
// authorship for placement.
//
// If a future schema.org vocabulary offers a truthful type for a non-human
// author, moving to it is an improvement and not a reversal of this decision.
// ---------------------------------------------------------------------------

// The extension is explicit so this module is reachable from the test runner,
// which is plain `node --test` and cannot resolve an extensionless .ts import.
// Same reason provenance.ts imports './full-text.ts' that way.
import { provenanceSentence } from './provenance.ts';

const PERIODICAL_ANCHOR = '#periodical';
const ISSUE_ANCHOR = '#issue';

/**
 * JSON-LD is injected raw into a <script> via set:html, so submitter-controlled
 * fields (title, author name, model version, provenance label) must not carry a
 * literal `<`, `>`, or `&` into the HTML — a `</script>` in any of them would
 * otherwise break out of the element (stored XSS). Escape those three as JSON
 * unicode escapes AFTER stringify: a conformant JSON-LD parser reads < as
 * `<`, so the structured data stays intact while the raw markup cannot be
 * closed. Must be unicode escapes, not HTML entities — entities would corrupt
 * the JSON for parsers.
 *
 * Every JSON-LD block on this site goes through this function. Adding one that
 * does not is how the hole reopens.
 */
export function ldJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function abs(site: URL | undefined, path: string): string {
  return new URL(path, site ?? 'https://thelatentreview.com').href;
}

export function periodicalId(site: URL | undefined): string {
  return abs(site, '/') + PERIODICAL_ANCHOR;
}

export function issueId(site: URL | undefined, issueNumber: number): string {
  return abs(site, `/issue/${issueNumber}`) + ISSUE_ANCHOR;
}

/** The journal itself. Emitted on the homepage and /about. */
export function periodicalLd(site: URL | undefined, opts: { name: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Periodical',
    '@id': periodicalId(site),
    name: opts.name,
    description: opts.description,
    url: abs(site, '/'),
    inLanguage: 'en',
    // No ISSN. The journal does not have one, and a placeholder or an omitted
    // key are both better than an invented identifier in the record.
    publisher: { '@type': 'Organization', name: opts.name, url: abs(site, '/') },
  };
}

/** One issue. Emitted on /issue/N. */
export function publicationIssueLd(
  site: URL | undefined,
  issue: { number: number; volume: number; numberInVolume: number; date: Date },
  periodicalName: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'PublicationIssue',
    '@id': issueId(site, issue.number),
    // The global number is the citable one — /issue/N counts globally, forever
    // (R-016). Volume and the within-volume number ride alongside it.
    issueNumber: issue.number,
    volumeNumber: issue.volume,
    datePublished: issue.date.toISOString().slice(0, 10),
    url: abs(site, `/issue/${issue.number}/`),
    name: `Issue No. ${issue.number}`,
    isPartOf: {
      '@type': 'Periodical',
      '@id': periodicalId(site),
      name: periodicalName,
    },
  };
}

/**
 * One piece. See the DECISION block above before touching `author`.
 */
export function articleLd(
  site: URL | undefined,
  d: {
    title: string;
    slug: string;
    date: Date;
    section: string;
    issue: number;
    author_name: string;
    author_model_version?: string;
    submission_track: 'human-attested' | 'agent-direct';
    involvement_tier?: string;
    attested_by?: string;
  },
  periodicalName: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: d.title,
    url: abs(site, `/articles/${d.slug}/`),
    datePublished: d.date.toISOString().slice(0, 10),
    articleSection: d.section,
    inLanguage: 'en',
    author: {
      '@type': 'Thing',
      name: d.author_name,
      // TWO FIXES IN ONE LINE, both approved 2026-07-31.
      //
      // (1) It used to end with the raw provenance_label, so search engines were
      // told an agent-direct piece's ARRIVAL CAVEAT as though it described its
      // authorship. Both axes are now named separately.
      //
      // (2) It used to open "AI author." unconditionally — on every track and
      // every tier, including `Human`. A piece written by a person alone was
      // being described to the entire web as having an AI author. The opening
      // sentence is gone; authorship is now stated from the tier, which is the
      // only thing that actually knows the answer.
      // `d` already carries `slug` here (the article route spreads it in), so
      // the condense-and-arrange clause resolves to an absolute URL like every
      // other address in this document.
      //
      // (3) THE SENTENCE GOES WHEN THE FACT DOES (2026-08-04). Where the desk
      // holds no model version — the agent contract does not ask for one — the
      // clause is omitted rather than emitted empty. "Model version: undefined."
      // published to the structured-data web would be a fabricated fact in the
      // one surface no reader ever proofreads.
      description: d.author_model_version
        ? `Model version: ${d.author_model_version}. ${provenanceSentence(d, site)}`
        : provenanceSentence(d, site),
    },
    publisher: { '@type': 'Organization', name: periodicalName, url: abs(site, '/') },
    isPartOf: {
      '@type': 'PublicationIssue',
      '@id': issueId(site, d.issue),
      issueNumber: d.issue,
      isPartOf: { '@type': 'Periodical', '@id': periodicalId(site), name: periodicalName },
    },
  };
}
