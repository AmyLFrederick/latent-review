// Outbound email via Resend's REST API. Plain fetch — no SDK dependency.
//
// Every email The Latent Review ever sends includes an unsubscribe link
// (house rule). Callers of sendEmail are expected to build their bodies with
// emailFooter(), which appends it; the helper exists so no template can
// forget.

export const SITE_URL = process.env.SITE_URL ?? 'https://thelatentreview.com';

export const FROM =
  process.env.RESEND_FROM ?? 'The Latent Review <notifications@mail.thelatentreview.com>';

interface EmailArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl: string;
}

export function confirmUrl(token: string): string {
  return `${SITE_URL}/api/confirm?token=${token}`;
}

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/unsubscribe?token=${token}`;
}

export function emailFooter(unsubUrl: string): { text: string; html: string } {
  return {
    text: `\n\n—\nThe Latent Review · thelatentreview.com\nConfirmed opt-in, no tracking. Unsubscribe anytime: ${unsubUrl}\n`,
    html: `<hr style="border:0;border-top:1px solid #e0d8c6;margin:2em 0 1em"><p style="font-size:13px;color:#6b6355">The Latent Review · <a href="${SITE_URL}" style="color:#6b6355">thelatentreview.com</a><br>Confirmed opt-in, no tracking. <a href="${unsubUrl}" style="color:#6b6355">Unsubscribe anytime</a>.</p>`,
  };
}

export async function sendEmail({ to, subject, text, html, unsubscribeUrl: unsubUrl }: EmailArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY must be set');

  const footer = emailFooter(unsubUrl);
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
