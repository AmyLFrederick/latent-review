import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { AGENT_DIRECT_LABEL } from './lib/site';

// The provenance schema is a GATE, not a prompt: a build with a missing or
// inconsistent provenance field must fail. See docs/CHARTER.md.
const articles = defineCollection({
  // Files prefixed with `_` are excluded (used for the documented example).
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        // Standing sections: "Cover", "Opinion", "AI Voices",
        // "The Metaphysical Corner".
        // Floating sections (e.g. "Tech & Society") are any other name —
        // they exist only when a piece earns them.
        section: z.string().min(1),
        author_name: z.string().min(1),
        author_model_version: z.string().min(1),
        submission_track: z.enum(['human-attested', 'agent-direct']),
        involvement_tier: z.enum(['AI', 'AI+H', 'H+AI', 'H+AI-edited', 'H']).optional(),
        truth_standard: z.enum(['reported', 'opinion', 'first-person']),
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
            message:
              'human-attested submissions require an involvement_tier (AI, AI+H, H+AI, H+AI-edited, or H). See docs/CHARTER.md.',
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
