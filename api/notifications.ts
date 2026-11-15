import {
  getStaffRecipients,
  notificationLogs,
  sendJson,
  ServerlessRequest,
  ServerlessResponse,
} from './_emailService';

export default function handler(_req: ServerlessRequest, res: ServerlessResponse) {
  sendJson(res, 200, {
    recipients: getStaffRecipients(),
    total: notificationLogs.length,
    logs: notificationLogs.slice(0, 50),
  });
}
