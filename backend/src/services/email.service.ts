import { env } from '../config/env.js';

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(message: EmailMessage): Promise<{ skipped: boolean; providerId?: string; error?: string }> {
  if (!env.RESEND_API_KEY) {
    return { skipped: true, error: 'RESEND_API_KEY is not configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return { skipped: false, error: payload?.message || `Resend request failed with ${response.status}` };
  }

  return { skipped: false, providerId: payload?.id };
}
