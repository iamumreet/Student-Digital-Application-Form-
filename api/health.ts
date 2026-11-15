import {
  getStaffRecipients,
  sendJson,
  ServerlessRequest,
  ServerlessResponse,
} from './_emailService';

export default function handler(_req: ServerlessRequest, res: ServerlessResponse) {
  sendJson(res, 200, {
    status: 'ok',
    service: 'Pathfinder International Education Counselling API',
    notificationRecipients: getStaffRecipients(),
    timestamp: new Date().toISOString(),
  });
}
