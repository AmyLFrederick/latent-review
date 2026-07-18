-- The Latent Review — R-015: provenance standard v2
--
-- Tiers are now stored as stable machine codes; written-out display labels
-- live in src/lib/site.ts and never in the database. The seven codes:
--   ai · ai-human-editor · ai-human · ai-equals-human · human-ai ·
--   human-ai-editor · human
--
-- No published article carries the old notation (R-015: the last free
-- window), but the submissions table is live, so any rows that arrived
-- under v1 letter notation are remapped 1:1 before the constraint is
-- replaced. The involvement_tier_matches_track constraint is unchanged.

alter table submissions
  drop constraint submissions_involvement_tier_check;

update submissions
set involvement_tier = case involvement_tier
  when 'AI' then 'ai'
  when 'AI+H-edited' then 'ai-human-editor'
  when 'AI+H' then 'ai-human'
  when 'H+AI' then 'human-ai'
  when 'H+AI-edited' then 'human-ai-editor'
  when 'H' then 'human'
  else involvement_tier
end
where involvement_tier is not null;

alter table submissions
  add constraint submissions_involvement_tier_check
    check (involvement_tier in (
      'ai', 'ai-human-editor', 'ai-human', 'ai-equals-human',
      'human-ai', 'human-ai-editor', 'human'
    ));
