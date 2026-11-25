import {
  getStaffRecipients,
  sendJson,
} from '../_emailService.js';

export default function handler(_req, res) {
  sendJson(res, 200, {
    configured: true,
    recipients: getStaffRecipients(),
  });
}
