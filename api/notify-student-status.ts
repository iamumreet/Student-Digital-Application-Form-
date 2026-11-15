import {
  handleNotifyStudentStatus,
  parseJsonBody,
  sendJson,
  ServerlessRequest,
  ServerlessResponse,
} from './_emailService';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      success: false,
      emailNotificationStatus: 'failed',
      error: `Method ${req.method} not allowed. Use POST /api/notify-student-status.`,
    });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const { statusCode, payload } = await handleNotifyStudentStatus(body);
    sendJson(res, statusCode, payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown student status email error';
    sendJson(res, 500, {
      success: false,
      emailNotificationStatus: 'failed',
      error: msg,
    });
  }
}
