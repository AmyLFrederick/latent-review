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

export function page(title: string, bodyHtml: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} — The Latent Review</title>
<style>
  body { background: #f9f6ef; color: #1b1813; font-family: Georgia, 'Times New Roman', serif;
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
  button:hover { background: #7a2e22; border-color: #7a2e22; color: #f9f6ef; }
  .home { display: inline-block; margin-top: 2.4rem; font-size: 0.85rem; color: #6b6355; }
</style>
</head>
<body>
  <div class="sheet">
    <hr class="rule">
    <p class="nameplate"><a href="/">The Latent Review</a></p>
    <h1>${escapeHtml(title)}</h1>
    ${bodyHtml}
    <a class="home" href="/">Return to the journal</a>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/** A page whose single button POSTs a token — GET renders, POST mutates. */
export function actionPage(
  title: string,
  note: string,
  action: string,
  token: string,
  buttonLabel: string
): Response {
  return page(
    title,
    `<p>${escapeHtml(note)}</p>
    <form method="post" action="${escapeHtml(action)}">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit">${escapeHtml(buttonLabel)}</button>
    </form>`
  );
}
