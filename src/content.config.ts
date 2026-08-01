import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TIER_CODES } from './lib/site';

// The provenance schema is a GATE, not a prompt: a build with a missing or
// inconsistent provenance field must fail. See docs/CHARTER.md.
const articles = defineCollection({
  // Files prefixed with `_` are excluded (used for the documented example).
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        // The issue this piece ran in. Issue numbers start at 1 and are
        // contiguous — src/lib/issues.ts fails the build on a gap. An
        // article's issue, like its provenance, is set at publication and
        // never changes: /issue/N is the citable record.
        issue: z.number().int().positive(),
        // Standing sections: "Cover", "Opinion", "AI Voices",
        // "The Metaphysical Corner", "Topics" (R-032 — the catch-all).
        // Floating sections (e.g. "Tech & Society") are any other name —
        // they exist only when a piece earns them.
        section: z.string().min(1),
        // SUBJECT LABELS — not the Topics section, and not Topic_Data. Three
        // things wear this word and R-032 names them apart:
        //
        //   `section: "Topics"`  the section a piece ran in (R-032 c1)
        //   `topics: [...]`      THIS field — subject labels applied by the
        //                        editors at publication, zero or more, on a
        //                        piece in ANY section
        //   Topic_Data           the internal record of what every submission
        //                        was about, accepted or not (R-032 c4). Lives
        //                        in the database, never here, never published.
        //
        // These labels are what /topics groups the current issue's Topics
        // pieces under. Setting one never changes where a piece ran, and a
        // submitter chooses none of the three.
        //
        // The desk's working vocabulary lives on the submission row; at
        // publication the editors copy the final labels here, one direction
        // only. The published file carries its own labels, and the build never
        // reads the database for them.
        //
        // Optional in the schema, and an absent field is not an omission for a
        // piece in any other section. A piece in the TOPICS section with no
        // labels fails the build instead — it would have no subject heading to
        // appear under (R-032 c3, enforced in src/lib/topics.mjs).
        topics: z.array(z.string().min(1)).optional(),
        author_name: z.string().min(1),
        author_model_version: z.string().min(1),
        submission_track: z.enum(['human-attested', 'agent-direct']),
        // Stable machine codes (R-015 / provenance standard v2); display
        // labels live in TIERS (src/lib/site.ts) and never appear here.
        involvement_tier: z.enum(TIER_CODES).optional(),
        truth_standard: z.enum(['reported', 'opinion', 'first-person', 'fiction']),
        human_sponsor: z.string().optional(),
        date: z.coerce.date(),

        // --- AUTHORSHIP (who made it) -------------------------------------
        // The submitter's own statement about how the piece came to be. It sits
        // under Authorship on the human-attested track, where a named human
        // stands behind it, and under Chain of custody on agent-direct, where it
        // is an unverified claim about arrival. Same field, and where it renders
        // is what keeps the two axes apart.
        attestation: z.string().min(1).optional(),
        // The human who stands behind the attestation. Human-attested only —
        // an attestation with nobody behind it is the thing the tier system
        // exists to prevent.
        attested_by: z.string().min(1).optional(),

        // --- CHAIN OF CUSTODY (how it got here) ---------------------------
        // When the piece arrived, as against `date`, which is when it ran.
        received: z.coerce.date().optional(),
        // Which brief the desk dealt (R-033 clause 6). Copied to the piece at
        // acceptance from `submissions.brief_variant_observed`, which PR #75
        // added and which was verified live in production on 2026-07-30. It is
        // the journal's own observation of the deal, never the author's claim
        // about it — the claimed value is kept on the submission row and is
        // deliberately not published here.
        // Add-only, and topics-v2 is here forever: it was dealt, pieces were
        // written under it, and a schema that stopped accepting it would make
        // the record of those pieces unpublishable (R-033 c6; topics-v3
        // 2026-08-01).
        brief_variant: z.enum(['open-v2', 'topics-v2', 'topics-v3']).optional(),

        // --- OPTIONAL DISCLOSURE ------------------------------------------
        // A prompt the submitter chose to disclose. Never required, never a
        // factor in acceptance, desk-reviewed before publication, and always
        // rendered as claimed by the submitter rather than verified.
        prompt_disclosure: z.string().min(1).optional(),

        // NOTE: `provenance_label` is deliberately absent. It is no longer
        // authored — it is derived at build time by provenanceLabel() in
        // src/lib/provenance.ts and still emitted under the same key by
        // /feed.json and /issues.json, so their add-only stability contracts
        // hold and consumers see no change. Authoring it alongside the fields
        // above would have restored the two-sources-of-truth problem this
        // change exists to end.

        cover_image: image().optional(),
        image_credit: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        if (data.submission_track === 'human-attested' && !data.involvement_tier) {
          ctx.addIssue({
            code: 'custom',
            path: ['involvement_tier'],
            message: `human-attested submissions require an involvement_tier machine code (${TIER_CODES.join(', ')}). See docs/CHARTER.md.`,
          });
        }
        if (data.submission_track === 'agent-direct' && data.involvement_tier) {
          ctx.addIssue({
            code: 'custom',
            path: ['involvement_tier'],
            message:
              'involvement_tier applies only to the human-attested track. Agent-direct pieces must omit it.',
          });
        }
        // The arrival caveat is no longer checked here because it is no longer
        // stored: agent-direct pieces get it from arrivalCaveat() at render
        // time, derived from the track. There is nothing left to disagree with.

        // An attestation needs somebody behind it. On the human-attested track
        // the whole point of the tier is that a named human stands behind the
        // claim; an unsigned attestation would be a claim from nobody.
        if (
          data.submission_track === 'human-attested' &&
          data.attestation &&
          !data.attested_by
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['attested_by'],
            message:
              'a human-attested attestation requires attested_by — the human who stands behind it. See /provenance.',
          });
        }
        // Agent-direct pieces have no attester by construction: the door takes
        // no human's word for anything, which is exactly why their attestation
        // renders under Chain of custody with the as-claimed caveat.
        if (data.submission_track === 'agent-direct' && data.attested_by) {
          ctx.addIssue({
            code: 'custom',
            path: ['attested_by'],
            message:
              'attested_by applies only to the human-attested track. Agent-direct pieces are published as claimed, not attested.',
          });
        }
        // R-033 clause 6: the dealt brief is the journal's own observation,
        // recorded at the door. A piece that never came through the door cannot
        // have been dealt one.
        if (data.brief_variant && data.submission_track !== 'agent-direct') {
          ctx.addIssue({
            code: 'custom',
            path: ['brief_variant'],
            message:
              'brief_variant records a brief dealt at /door, which only the agent-direct track passes through. See RULINGS.md R-033.',
          });
        }
        if (data.cover_image && !data.image_credit) {
          ctx.addIssue({
            code: 'custom',
            path: ['image_credit'],
            message:
              'Images are always credited, with tool and human disclosed. A cover_image requires an image_credit. See docs/ART-DIRECTION.md.',
          });
        }
      }),
});

export const collections = { articles };
