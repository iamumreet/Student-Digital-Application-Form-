import {
  getOwnerEmail,
  getStaffRecipients,
  resolveSenderAddress,
  sendEmailNotification,
  sendJson,
  ServerlessRequest,
  ServerlessResponse,
} from '../_emailService';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { success: false, error: 'Method not allowed' });
    return;
  }

  const resendApiKeyExists = Boolean(process.env.RESEND_API_KEY?.trim());
  const { fromAddress, rawFrom } = resolveSenderAddress();
  const staffRecipients = getStaffRecipients();

  const testResult = await sendEmailNotification({
    recipients: staffRecipients,
    subject: 'Pathfinder Diagnostic Verification Email',
    textBody: 'This is a diagnostic verification email from the Pathfinder Student Application System.',
    htmlBody:
      '<p>This is a <strong>diagnostic verification email</strong> from the Pathfinder Student Application System.</p>',
  });

  sendJson(res, testResult.success ? 200 : 502, {
    timestamp: new Date().toISOString(),
    resendApiKeyExists,
    configuredFromEmail: rawFrom,
    effectiveSender: fromAddress,
    parsedStaffRecipients: staffRecipients,
    success: testResult.success,
    provider: testResult.provider,
    deliveredTo: testResult.deliveredTo,
    resendEmailId: testResult.resendId,
    error: testResult.error,
    isSandboxMode: testResult.isSandboxMode,
    sandboxGuidance: testResult.isSandboxMode
      ? `Resend sandbox mode is active on the current API key. Configure a RESEND_API_KEY owned by ${getOwnerEmail()} or verify a domain at resend.com/domains.`
      : undefined,
  });
}
