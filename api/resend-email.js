import {
  handleResendEmail,
  parseJsonBody,
  sendJson,
} from './_emailService.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      success: false,
      emailStatus: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      error: `Method ${req.method} not allowed. Use POST /api/resend-email.`,
    });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const { statusCode, payload } = await handleResendEmail(body);
    sendJson(res, statusCode, payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resend endpoint error';
    sendJson(res, 500, {
      success: false,
      emailStatus: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      error: msg,
    });
  }
}
