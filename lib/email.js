// ==========================================
// EMAIL SENDER (Resend API)
// ==========================================
// Sends alert emails through the Resend API using plain fetch, so no extra
// dependency is added to the project.
//
// Required environment variables (set in Vercel, never in code):
//   RESEND_API_KEY    - API key from resend.com
//   ALERT_FROM_EMAIL  - A sender address on a domain verified in Resend,
//                       e.g. "Energy Monitor <alerts@yourdomain.com>"
//
// If either variable is missing the send is reported as a dry run instead of
// failing silently, so a misconfigured deployment is easy to spot in the
// alert check response.

export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      sent: false,
      dryRun: true,
      reason:
        'RESEND_API_KEY and/or ALERT_FROM_EMAIL is not configured, so no email was sent.',
      to,
      subject,
    };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Email provider returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  return { sent: true, dryRun: false, id: data.id || null, to, subject };
}
