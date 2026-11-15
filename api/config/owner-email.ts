import {
  getStaffRecipients,
  sendJson,
  ServerlessRequest,
  ServerlessResponse,
} from '../_emailService';

export default function handler(_req: ServerlessRequest, res: ServerlessResponse) {
  sendJson(res, 200, {
    configured: true,
    recipients: getStaffRecipients(),
  });
}
