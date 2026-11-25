import {
  getStaffRecipients,
  notificationLogs,
  sendJson,
} from './_emailService.js';

export default function handler(_req, res) {
  sendJson(res, 200, {
    recipients: getStaffRecipients(),
    total: notificationLogs.length,
    logs: notificationLogs.slice(0, 50),
  });
}
