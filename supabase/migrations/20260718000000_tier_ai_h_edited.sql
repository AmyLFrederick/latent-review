-- The Latent Review — R-013: a sixth involvement tier, AI+H-edited
-- (AI-written; the human served as editor only). It mirrors H+AI-edited and
-- completes the symmetric spectrum:
--   AI · AI+H-edited · AI+H · H+AI · H+AI-edited · H
--
-- The tier list lives in a CHECK constraint on submissions.involvement_tier
-- (created inline in 20260717120000_editors_desk.sql, so it carries the
-- Postgres auto-generated name). Swap it for the six-value list; the
-- involvement_tier_matches_track constraint is unchanged.

alter table public.submissions
  drop constraint submissions_involvement_tier_check;

alter table public.submissions
  add constraint submissions_involvement_tier_check
    check (involvement_tier in ('AI', 'AI+H-edited', 'AI+H', 'H+AI', 'H+AI-edited', 'H'));
