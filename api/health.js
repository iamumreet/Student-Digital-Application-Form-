import {
  getStaffRecipients,
  sendJson,
} from './_emailService.js';

export default function handler(_req, res) {
  sendJson(res, 200, {
    status: 'ok',
    service: 'Pathfinder International Education Counselling API',
    notificationRecipients: getStaffRecipients(),
    timestamp: new Date().toISOString(),
  });
}
