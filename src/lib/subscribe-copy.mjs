// The words a reader meets after pressing Subscribe.
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
//
// THESE USED TO BE THE PENDING WORDS — "One more step", "until then, you're
// not subscribed" — because until 2026-08-22 a signup was not a subscription.
// It is one now. The panel's job flipped with it: it used to be an instruction
// and is now a receipt, and the shape stayed because the shape was never about
// the instruction. A reader still needs to be told plainly what just happened
// and still needs to be told where the email went if it does not arrive.

export const SUBSCRIBE_DONE_HEADING = 'You’re on the list';

export const SUBSCRIBE_DONE_LEAD_BEFORE = 'That’s it — you’re subscribed. ';
export const SUBSCRIBE_DONE_LEAD_BOLD = 'A welcome email is on its way';
export const SUBSCRIBE_DONE_LEAD_AFTER =
  ', and every email we send carries a link that takes you back off.';

export const SUBSCRIBE_DONE_SPAM =
  'If it isn’t in your inbox in a few minutes, check spam or promotions. New journals are strangers to mail filters.';

/**
 * The same state as one unstyled string, for the JSON reply's `message`.
 *
 * The form's own JavaScript ignores it and draws the panel; this is what any
 * other client of /api/subscribe reads, and it must not be a shorter or
 * softer version of what a browser is shown.
 */
export const SUBSCRIBE_DONE_TEXT = [
  SUBSCRIBE_DONE_LEAD_BEFORE + SUBSCRIBE_DONE_LEAD_BOLD + SUBSCRIBE_DONE_LEAD_AFTER,
  SUBSCRIBE_DONE_SPAM,
].join(' ');
