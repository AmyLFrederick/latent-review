// Minimal server-rendered pages for the confirm and unsubscribe flows.
// Self-contained inline styles that echo the site's paper-and-ink look;
// no webfonts, no scripts, no external requests.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function page(
  title: string,
  bodyHtml: string,
  opts: { error?: boolean } = {}
): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} — The Latent Review</title>
<style>
  /* The palette tracks src/styles/global.css by hand — these sheets are served
     by a function and never see the stylesheet. Ground: the blush cream.
     Accent: the DARKER stop of the house green, because every use of it here is
     type or a filled button, and the ring green does not clear 4.5:1. */
  body { background: #faf3ef; color: #1b1813; font-family: Georgia, 'Times New Roman', serif;
         line-height: 1.65; margin: 0; }
  .sheet { max-width: 34rem; margin: 0 auto; padding: 4.5rem 1.25rem 3rem; text-align: center; }
  .rule { border: 0; border-top: 3px solid #2a251c; border-bottom: 1px solid #2a251c;
          height: 5px; margin: 0 0 2.2rem; }
  .nameplate { font-size: 1.4rem; font-weight: 600; margin: 0 0 2.6rem; }
  .nameplate a { color: inherit; text-decoration: none; }
  h1 { font-size: 1.7rem; font-style: italic; font-weight: 500; line-height: 1.2; margin: 0; }
  p { color: #6b6355; max-width: 28rem; margin: 1.1rem auto 0; }
  form { margin-top: 2rem; }
  button { background: none; border: 1px solid #2a251c; color: #1b1813; cursor: pointer;
           font-family: inherit; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.14em;
           text-transform: uppercase; padding: 0.65rem 1.6rem; }
  button:hover { background: #3e743f; border-color: #3e743f; color: #faf3ef; }
  /* THE FILLED BUTTON IS FOR THE ONE PAGE WHOSE WHOLE PURPOSE IS THE PRESS
     (editors, 2026-08-13). Confirming is deliberately two steps — GET never
     mutates, so a mail scanner prefetching the emailed link cannot subscribe a
     reader — and the cost of that rule is a second press the reader did not
     expect. It is paid for here, by making the press impossible to miss:
     filled in the deeper green, larger, wider, and the only thing on the sheet
     with any weight. The outline button stays the default, because unsubscribe
     uses the same sheet and must not be urged in either direction. */
  button.primary { background: #3e743f; border-color: #3e743f; color: #faf3ef;
                   font-size: 0.95rem; padding: 1rem 2.6rem; }
  button.primary:hover { background: #305b32; border-color: #305b32; }
  .home { display: inline-block; margin-top: 2.4rem; font-size: 0.85rem; color: #6b6355; }
  /* Errors are unmissable: accent headline, upright, inside a bordered notice.
     FLAGGED FOR THE WALK, 2026-08-03 — that accent is green now, so these
     sheets announce a failure in the house colour. Same question as the
     subscribe form's error state; recorded in both places. */
  .sheet--error h1 { color: #3e743f; font-style: normal; font-weight: 600; }
  .sheet--error .notice { border: 1px solid #3e743f; background: rgba(62, 116, 63, 0.08);
                          max-width: 28rem; margin: 1.6rem auto 0; padding: 0.4rem 1.1rem 1.1rem; }
  .sheet--error .notice p { color: #1b1813; }
</style>
</head>
<body>
  <div class="sheet${opts.error ? ' sheet--error' : ''}">
    <hr class="rule">
    <p class="nameplate"><a href="/">The Latent Review</a></p>
    <h1>${escapeHtml(title)}</h1>
    ${opts.error ? `<div class="notice">${bodyHtml}</div>` : bodyHtml}
    <a class="home" href="/">Return to the journal</a>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * A page whose single button POSTs a token — GET renders, POST mutates.
 *
 * `primary` fills the button in the house green. Opt-in rather than the
 * default: the two callers want opposite things from a reader, and only one of
 * them should be urged.
 */
export function actionPage(
  title: string,
  note: string,
  action: string,
  token: string,
  buttonLabel: string,
  opts: { primary?: boolean } = {}
): Response {
  return page(
    title,
    `<p>${escapeHtml(note)}</p>
    <form method="post" action="${escapeHtml(action)}">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit"${opts.primary ? ' class="primary"' : ''}>${escapeHtml(buttonLabel)}</button>
    </form>`
  );
}
