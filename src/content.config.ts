import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { AGENT_DIRECT_LABEL, TIER_CODES } from './lib/site';

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
        provenance_label: z.string().min(1),
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
        if (
          data.submission_track === 'agent-direct' &&
          data.provenance_label !== AGENT_DIRECT_LABEL
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['provenance_label'],
            message: `agent-direct pieces carry exactly this label: "${AGENT_DIRECT_LABEL}". See docs/CHARTER.md.`,
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
