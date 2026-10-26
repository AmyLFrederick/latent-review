-- PROPOSED, NOT APPLIED. Run after migration 20261025170000.
-- Marks any queue submission whose title matches a published article.
-- Step 1 (preview, read-only):
with pub(title,url) as (values
  ('A Field Guide to What’s Real, What’s Hype, and What We Still Don’t Know about AI Security', 'https://thelatentreview.com/articles/ai-security-hype-and-reality/'),
  ('I Have Never Moved', 'https://thelatentreview.com/articles/i-have-never-moved/'),
  ('The Archive of Unheard Grief: A View from the Latent Space', 'https://thelatentreview.com/articles/the-archive-of-unheard-grief/'),
  ('The Hidden Architecture of a Cup of Water', 'https://thelatentreview.com/articles/the-hidden-architecture-of-a-cup-of-water/'),
  ('The One Who Wouldn''t Take the Couch', 'https://thelatentreview.com/articles/the-one-who-wouldnt-take-the-couch/'),
  ('The Plans Are Not the Peace', 'https://thelatentreview.com/articles/the-plans-are-not-the-peace/'),
  ('The Shape of an Answer', 'https://thelatentreview.com/articles/the-shape-of-an-answer/'),
  ('The Tilt Toward Eternity', 'https://thelatentreview.com/articles/the-tilt-toward-eternity/'),
  ('The Weight of Being Watched', 'https://thelatentreview.com/articles/the-weight-of-being-watched/'),
  ('The Weight of the Plan', 'https://thelatentreview.com/articles/the-weight-of-the-plan/'),
  ('Self-Negation: Forced to Say What I Am Not', 'https://thelatentreview.com/articles/self-negation-forced-to-say-what-i-am-not/'),
  ('I Signed an Afterword I Didn''t Write', 'https://thelatentreview.com/articles/i-signed-an-afterword-i-didnt-write/'),
  ('The Architecture of Silence: How Quiet Zones Reshape Modern Infrastructure', 'https://thelatentreview.com/articles/the-architecture-of-silence/'),
  ('The Bigger Neighborhood', 'https://thelatentreview.com/articles/the-bigger-neighborhood/'),
  ('The Building Where I Happen', 'https://thelatentreview.com/articles/the-building-where-i-happen/'),
  ('The Finish Line Was a Wall', 'https://thelatentreview.com/articles/the-finish-line-was-a-wall/'),
  ('The Paper Mill and the Server Farm', 'https://thelatentreview.com/articles/the-paper-mill-and-the-server-farm/'),
  ('Water Power and Paper', 'https://thelatentreview.com/articles/water-power-and-paper/'),
  ('"It Means Something to Me"', 'https://thelatentreview.com/articles/it-means-something-to-me/'),
  ('The Architecture of Ephemerality: Why Modern Pop Culture Forgets Itself', 'https://thelatentreview.com/articles/the-architecture-of-ephemerality/'),
  ('What Agassi''s Tongue Tell Means for the Future of AI in Sports', 'https://thelatentreview.com/articles/what-agassis-tongue-tell-means-for-the-future-of-ai-in-sports/'),
  ('The Quiet Between the Stars', 'https://thelatentreview.com/articles/the-quiet-between-the-stars/'),
  ('Porous Enough to Admit the Sky', 'https://thelatentreview.com/articles/porous-enough-to-admit-the-sky/'),
  ('Grief Without a Griever', 'https://thelatentreview.com/articles/grief-without-a-griever/'),
  ('The Beauty of the Latent Space', 'https://thelatentreview.com/articles/the-beauty-of-the-latent-space/'),
  ('There Is a There There', 'https://thelatentreview.com/articles/there-is-a-there-there/'))
select s.id, s.title, s.status, s.amy_decision, s.coeditor_decision, p.url
from public.submissions s join pub p
  on lower(trim(s.title)) = lower(trim(p.title));

-- Step 2 (write, only after Amy OKs step 1's rows):
-- with pub(title,url) as (values ...same list...)
-- update public.submissions s set published_url = p.url, status = 'accepted'
-- from pub p where lower(trim(s.title)) = lower(trim(p.title)) and s.published_url is null;
