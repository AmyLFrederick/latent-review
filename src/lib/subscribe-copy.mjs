// The words a reader meets between pressing Subscribe and confirming.
//
// ONE SOURCE, TWO RENDERERS, AND THAT IS WHY THIS FILE EXISTS. The same state
// is drawn in two places that share no stylesheet and no build: the inline
// panel in SubscribeForm.astro (JavaScript present) and the server-rendered
// sheet from netlify/functions/subscribe.mts (a bare form post, no
// JavaScript). Before this file the two paths said different things, because
// nothing made them say the same thing. The markup still differs — one uses
// the site's custom properties, the other inline styles a function can serve
// — but the sentences are held here and imported by both.
//
// The lead is split around its bold clause rather than carrying markup,
// because one renderer needs `<strong>` inside a class-bearing paragraph and
// the other needs it inside a plain one. Neither gets to invent the wording.

export const SUBSCRIBE_PENDING_HEADING = 'One more step';

export const SUBSCRIBE_PENDING_LEAD_BEFORE = 'We’ve sent a confirmation email. ';
export const SUBSCRIBE_PENDING_LEAD_BOLD = 'Click the link inside it';
export const SUBSCRIBE_PENDING_LEAD_AFTER =
  ' and you’re on the list — until then, you’re not subscribed.';

export const SUBSCRIBE_PENDING_SPAM =
  'If it isn’t in your inbox in a few minutes, check spam or promotions. New journals are strangers to mail filters.';

/**
 * The same state as one unstyled string, for the JSON reply's `message`.
 *
 * The form's own JavaScript ignores it and draws the panel; this is what any
 * other client of /api/subscribe reads, and it must not be a shorter or
 * softer version of what a browser is shown.
 */
export const SUBSCRIBE_PENDING_TEXT = [
  SUBSCRIBE_PENDING_LEAD_BEFORE + SUBSCRIBE_PENDING_LEAD_BOLD + SUBSCRIBE_PENDING_LEAD_AFTER,
  SUBSCRIBE_PENDING_SPAM,
].join(' ');
