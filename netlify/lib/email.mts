// Outbound email via Resend's REST API. Plain fetch — no SDK dependency.
//
// Every email The Latent Review ever sends includes an unsubscribe link
// (house rule). Callers of sendEmail are expected to build their bodies with
// emailFooter(), which appends it; the helper exists so no template can
// forget.
//
// "NO TRACKING" IS A PUBLIC PROMISE, MADE IN TWO PLACES A READER CAN READ:
// the footer below, on every email, and the note under the signup form itself
// ("No tracking, unsubscribe anytime") — which is now the earlier of the two,
// read before an address is typed rather than after.
//
// IT MOVED AGAIN ON 2026-08-22, and this is the second move. On 2026-08-13 it
// went from the pre-confirm sheet to the post-confirm one. The post-confirm
// sheet is now a page almost nobody reaches, since confirming is not a step any
// more, so the promise would have been technically published and practically
// unread. It is made on the form instead, where a reader meets it while the
// decision is still theirs to make.
//
// Nothing in this file or in scripts/send-issue.mjs asks Resend to track opens
// or clicks — no tracking option is sent with any request, so the behaviour is
// whatever the Resend domain is configured to do.
//
// WHICH MEANS THE PROMISE IS KEPT BY A DASHBOARD SETTING, NOT BY THIS CODE.
// Open and click tracking are per-domain toggles in the Resend console. If
// either is ever switched on, this file will not change and the emails will
// not look different — but the published copy becomes false, and click
// tracking additionally rewrites every link in the digest. So: the copy is
// changed FIRST, in a reviewed PR, and only then is tracking enabled. Turning
// it on and fixing the wording afterwards is publishing a false statement to
// every subscriber in between.

export const SITE_URL = process.env.SITE_URL ?? 'https://thelatentreview.com';

export const FROM =
  process.env.RESEND_FROM ?? 'The Latent Review <notifications@mail.thelatentreview.com>';

interface FooterOptions {
  /**
   * One extra line under the unsubscribe link.
   *
   * THIS EXISTS FOR THE WELCOME EMAIL AND SHOULD STAY RARE. Its line — that a
   * mistyped address is what brought this message here, and the link above is
   * the whole remedy — belongs beside the link rather than in a paragraph of
   * its own (editors, 2026-08-22). It must not reach the digest: "if you
   * didn't ask for this" is nonsense in issue seven to somebody who has been
   * reading since issue one, and a standing footer that said it would be the
   * journal apologising monthly for the subscription it was asked for.
   */
  note?: string;
}

interface EmailArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl: string;
  footer?: FooterOptions;
}

// confirmUrl() was removed on 2026-08-22 along with the step it built links
// for. /api/confirm still answers the links already sitting in inboxes (see
// the header of that function); nothing in this repository mints a new one.

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/unsubscribe?token=${token}`;
}

// #413b33, not the site's --ink-soft #6b6355, and not by accident: muted text
// in mail is two stops darker than muted text on the site (editors,
// 2026-08-13). 5.40:1 → 10.08:1 on the #faf3ef ground. This footer is the
// smallest type in any email the journal sends, at 13px, so it is the line that
// needed it most. The reasoning is written out at the INK_SOFT constant in
// scripts/send-issue.mjs; the three files are kept in step by hand.
const MUTED = '#413b33';

// THE FOOT SITS INSIDE THE PAGE, which it did not until 2026-08-22. This
// helper appended its rule and its line after the caller's markup had closed
// every wrapper, so the foot landed outside the centred 600px column and
// outside the paper ground — full-bleed, left-aligned, on whatever white the
// client paints. Nobody caught it because nobody had rendered the email and
// looked; scripts/send-issue.mjs never used this helper and had quietly solved
// the same problem in its own copy of the footer.
//
// The wrapper below is that fix. It assumes the caller's ground is the
// journal's paper, which is true of the one email that uses sendEmail today and
// of any email the journal is likely to send. A future template on a different
// ground would need this to become an option rather than a constant — better to
// find that out from a rendered message than to make it configurable now.
const PAPER = '#faf3ef';

/**
 * The standing foot of every email the journal sends.
 *
 * "OPT-IN, NO TRACKING" IS NOT OPTIONAL AND HAS NO SWITCH. It is one of the two
 * places the promise is published — the other is the note under the signup form
 * — and an email that drops it removes a public statement from the one document
 * the reader actually keeps. A `standingTerms: false` escape existed for a few
 * hours on 2026-08-22, for the welcome letter, and the editors restored the
 * line rather than use it. The option came out with it: an unused switch that
 * makes a promise conditional is an invitation, and there is no email this
 * journal sends for which the answer is yes.
 */
export function emailFooter(
  unsubUrl: string,
  { note }: FooterOptions = {}
): { text: string; html: string } {
  return {
    text:
      `\n\n—\nThe Latent Review · thelatentreview.com\nOpt-in, no tracking. Unsubscribe anytime: ${unsubUrl}\n` +
      (note ? `${note}\n` : ''),
    html:
      `<div style="background-color:${PAPER};padding:0 12px 28px;"><div style="max-width:600px;margin:0 auto;text-align:center;">` +
      `<hr style="border:0;border-top:1px solid #e0d8c6;margin:0 0 1em"><p style="margin:0;font-family:Georgia, 'Times New Roman', serif;font-size:13px;line-height:1.6;color:${MUTED}">The Latent Review · <a href="${SITE_URL}" style="color:${MUTED}">thelatentreview.com</a><br>Opt-in, no tracking. <a href="${unsubUrl}" style="color:${MUTED}">Unsubscribe anytime</a>.` +
      (note ? `<br>${note}` : '') +
      `</p></div></div>`,
  };
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  unsubscribeUrl: unsubUrl,
  footer: footerOptions,
}: EmailArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY must be set');

  const footer = emailFooter(unsubUrl, footerOptions);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      text: text + footer.text,
      html: html + footer.html,
      headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
  }
}
