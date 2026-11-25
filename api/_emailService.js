/**
 * Shared Resend Email Service & Registry Utilities
 * Used by both Vercel Serverless Functions (/api/*.js) and Express server (server.ts).
 */

/**
 * Primary notification email recipient for Pathfinder International Education
 */
export const PRIMARY_RESEND_EMAIL = 'umreetkumar@gmail.com';
export const PRIMARY_NOTIFICATION_EMAIL = 'umreetkumar@gmail.com';

/**
 * Official Staff Notification Recipients
 * Updated exclusively to umreetkumar@gmail.com.
 */
export const DEFAULT_STAFF_RECIPIENTS = ['umreetkumar@gmail.com'];

const LEGACY_PATHFINDER_EMAILS = new Set([
  'admission@pathfinders.com.np',
  'bdm@pathfinders.com.np',
  'director@pathfinders.com.np',
  'australia@pathfinders.com.np',
  'info@pathfinders.com.np',
  'uk@pathfinders.com.np',
]);

const FREE_WEBMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'aol.com',
]);

/**
 * Resolves active notification recipients.
 * Always ensures umreetkumar@gmail.com is included and excludes legacy unverified addresses.
 * @returns {string[]}
 */
export const getStaffRecipients = () => {
  const envRecipients = process.env.STAFF_NOTIFICATION_EMAILS;
  if (envRecipients && envRecipients.trim()) {
    const parsed = envRecipients
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@') && !LEGACY_PATHFINDER_EMAILS.has(e));

    if (parsed.length > 0) {
      const set = new Set(parsed);
      set.add(PRIMARY_RESEND_EMAIL);
      return Array.from(set);
    }
  }
  return [...DEFAULT_STAFF_RECIPIENTS];
};

/**
 * Resolves owner email (defaults to umreetkumar@gmail.com)
 * @returns {string}
 */
export const getOwnerEmail = () => {
  const envOwner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (envOwner && envOwner.includes('@') && !LEGACY_PATHFINDER_EMAILS.has(envOwner)) {
    return envOwner;
  }
  return PRIMARY_RESEND_EMAIL;
};

/**
 * Production Staff Portal URL - Guaranteed Vercel production deployment
 */
export const PRODUCTION_STAFF_PORTAL_URL = 'https://student-digital-application-form.vercel.app';

/**
 * Computes the authenticated Staff Portal link for the prominent email button.
 * @param {string} [applicationId]
 * @returns {string}
 */
export const getStaffPortalUrl = (applicationId) => {
  const ref = String(applicationId || '').trim();
  const configuredAppUrl = process.env.APP_URL?.trim();
  let baseUrl = PRODUCTION_STAFF_PORTAL_URL;

  if (
    configuredAppUrl &&
    !configuredAppUrl.includes('localhost') &&
    !configuredAppUrl.includes('127.0.0.1') &&
    !configuredAppUrl.includes('.run.app') &&
    !configuredAppUrl.includes('google') &&
    !configuredAppUrl.includes('ais-dev') &&
    !configuredAppUrl.includes('ais-pre') &&
    !configuredAppUrl.includes('firebaseapp.com') &&
    !configuredAppUrl.includes('web.app')
  ) {
    baseUrl = configuredAppUrl.replace(/\/+$/, '');
  }

  return ref ? `${baseUrl}/?leadId=${encodeURIComponent(ref)}` : `${baseUrl}/?view=staff`;
};

/**
 * In-memory registry to prevent duplicate email notifications during retry
 * @type {Set<string>}
 */
export const dispatchedLeadIds = new Set();

/**
 * In-memory notification log store
 * @type {Array<Record<string, any>>}
 */
export const notificationLogs = [];

/**
 * In-memory student status registry
 * @type {Map<string, Record<string, any>>}
 */
export const studentStatusRegistry = new Map();

/**
 * Generates the official Pathfinder staff notification email payload
 * @param {{
 *   applicationId: string;
 *   leadId: string;
 *   studentName: string;
 *   mobile: string;
 *   email: string;
 *   interestedCountry: string;
 *   choiceOfProgram: string;
 *   submittedAt?: string;
 *   status?: string;
 *   staffPortalUrl: string;
 * }} data
 */
export const buildEmailPayload = (data) => {
  const refId = data.applicationId || data.leadId;
  const subDate = data.submittedAt
    ? new Date(data.submittedAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-GB');

  const status = data.status || 'New Enquiry';
  const subject = `New Student Enquiry — ${refId}`;

  const textBody = `
==================================================
PATHFINDER INTERNATIONAL EDUCATION
NEW STUDENT ENQUIRY NOTIFICATION
==================================================

A new student counselling & admission enquiry has been submitted.

• Application / Lead Reference ID: ${refId}
• Student Full Name: ${data.studentName}
• Email Address: ${data.email}
• Mobile Number: ${data.mobile}
• Interested Country: ${data.interestedCountry || 'Not Specified'}
• Choice of Program: ${data.choiceOfProgram || 'Not Specified'}
• Submission Date / Time: ${subDate}
• Application Status: ${status}

--------------------------------------------------
VIEW APPLICATION IN AUTHENTICATED STAFF PORTAL:
${data.staffPortalUrl}
--------------------------------------------------

Notice: This is an automated notification dispatched to authorized Pathfinder staff:
${getStaffRecipients().join('\n')}

Pathfinder International Education
Student Admissions & Counselling Department
Putalisadak, Kathmandu, Nepal
Tel: 01-5361805 | 01-5361853 | Email: info@pathfinders.com.np
==================================================
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; line-height: 1.6;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 16px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          <!-- Top Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0066A6 0%, #004D7D 100%); padding: 24px 28px; border-bottom: 4px solid #F5821F;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #F5821F; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px;">New Application Alert</div>
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">PATHFINDER INTERNATIONAL EDUCATION</h1>
                    <p style="color: #E2E8F0; margin: 6px 0 0 0; font-size: 13px;">Student Counselling &amp; Admissions Division</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary Information Body -->
          <tr>
            <td style="padding: 28px;">
              <div style="display: inline-block; background-color: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 16px;">
                NEW ENQUIRY RECEIVED
              </div>

              <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
                A new student enquiry has been submitted. Review the lead details below:
              </p>

              <!-- Application Key Information Table -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; border-collapse: separate; border-spacing: 0; margin-bottom: 26px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600; width: 38%; border-bottom: 1px solid #E2E8F0;">Application / Lead ID</td>
                  <td style="padding: 11px 16px; color: #0066A6; font-weight: 700; border-bottom: 1px solid #E2E8F0; font-family: monospace;">${refId}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Student Full Name</td>
                  <td style="padding: 11px 16px; color: #0F172A; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${data.studentName}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Email Address</td>
                  <td style="padding: 11px 16px; color: #0066A6; font-weight: 600; border-bottom: 1px solid #E2E8F0;">
                    <a href="mailto:${data.email}" style="color: #0066A6; text-decoration: none;">${data.email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Mobile Number</td>
                  <td style="padding: 11px 16px; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${data.mobile}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Interested Country</td>
                  <td style="padding: 11px 16px; color: #0066A6; font-weight: 700; border-bottom: 1px solid #E2E8F0;">${data.interestedCountry || 'Not Specified'}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Choice of Program</td>
                  <td style="padding: 11px 16px; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E2E8F0;">${data.choiceOfProgram || 'Not Specified'}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Submission Date / Time</td>
                  <td style="padding: 11px 16px; color: #475569; border-bottom: 1px solid #E2E8F0;">${subDate}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; color: #64748B; font-weight: 600;">Application Status</td>
                  <td style="padding: 11px 16px; color: #F5821F; font-weight: 800;">${status}</td>
                </tr>
              </table>

              <!-- Prominent View Application CTA Button -->
              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="${data.staffPortalUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0066A6; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 102, 166, 0.25); text-align: center; letter-spacing: 0.3px;">
                  VIEW APPLICATION IN STAFF PORTAL &rarr;
                </a>
                <div style="font-size: 11px; color: #94A3B8; margin-top: 10px;">
                  Access requires signing in with an authorized Pathfinder staff Google account.
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 28px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; line-height: 1.6; text-align: center;">
              <strong>Pathfinder International Education</strong> &bull; Student Admissions &amp; Counselling Division<br>
              Putalisadak, Kathmandu, Nepal &bull; Tel: 01-5361805 | 01-5361853<br>
              <span style="font-size: 11px; color: #94A3B8;">Confidential &bull; Dispatched exclusively to authorized staff accounts</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
};

/**
 * Generates the official Pathfinder student status update email payload
 * @param {{
 *   applicationId: string;
 *   studentName: string;
 *   previousStatus: string;
 *   newStatus: string;
 *   staffMessage?: string;
 *   updatedAt?: string;
 *   staffPortalUrl?: string;
 * }} data
 */
export const buildStudentStatusEmailPayload = (data) => {
  const refId = data.applicationId;
  const staffPortalUrl = data.staffPortalUrl || getStaffPortalUrl(refId);
  const updateDate = data.updatedAt
    ? new Date(data.updatedAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const subject = `Update on Your Pathfinder Application — ${refId}`;

  const messageBlock =
    data.staffMessage && data.staffMessage.trim()
      ? `\nMessage from Pathfinder Team:\n${data.staffMessage.trim()}\n`
      : '';

  const textBody = `
Dear ${data.studentName},

We would like to inform you that the status of your Pathfinder application has been updated.

Application ID: ${refId}

Previous Status:
${data.previousStatus}

Current Status:
${data.newStatus}
${messageBlock}
Our team will continue to assist you with your application.

--------------------------------------------------
VIEW APPLICATION IN STAFF PORTAL:
${staffPortalUrl}
--------------------------------------------------

Regards,
Pathfinder International Education

--------------------------------------------------
Contact Information:
Pathfinder International Education
Student Admissions & Counselling Division
Putalisadak, Kathmandu, Nepal
Tel: 01-5361805 | 01-5361853 | Email: info@pathfinders.com.np
==================================================
`.trim();

  const htmlMessageSection =
    data.staffMessage && data.staffMessage.trim()
      ? `
      <div style="margin: 22px 0; background-color: #FFFBEB; border-left: 4px solid #F5821F; padding: 16px 20px; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 700; color: #B45309; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
          Message from Pathfinder Team
        </div>
        <div style="font-size: 14px; color: #78350F; line-height: 1.6; white-space: pre-wrap;">${data.staffMessage.trim()}</div>
      </div>
    `
      : '';

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; line-height: 1.6;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 16px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          <!-- Top Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0066A6 0%, #004D7D 100%); padding: 24px 28px; border-bottom: 4px solid #F5821F;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #F5821F; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px;">Application Status Update</div>
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">PATHFINDER INTERNATIONAL EDUCATION</h1>
                    <p style="color: #E2E8F0; margin: 6px 0 0 0; font-size: 13px;">Student Counselling &amp; Admissions Division</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary Information Body -->
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; color: #0F172A; margin: 0 0 16px 0;">
                Dear <strong>${data.studentName}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
                We would like to inform you that the status of your Pathfinder application has been updated.
              </p>

              <!-- Application ID & Status Card -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding-bottom: 12px; color: #64748B; font-weight: 600; width: 40%;">Application ID:</td>
                    <td style="padding-bottom: 12px; color: #0066A6; font-weight: 700; font-family: monospace; font-size: 15px;">${refId}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 12px; color: #64748B; font-weight: 600;">Previous Status:</td>
                    <td style="padding-bottom: 12px; color: #64748B; font-weight: 600;">${data.previousStatus}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 12px; color: #64748B; font-weight: 600;">Current Status:</td>
                    <td style="padding-bottom: 12px;">
                      <span style="display: inline-block; background-color: #0066A6; color: #FFFFFF; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${data.newStatus}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #64748B; font-weight: 600;">Updated At:</td>
                    <td style="color: #475569; font-size: 13px;">${updateDate}</td>
                  </tr>
                </table>
              </div>

              ${htmlMessageSection}

              <!-- Prominent View Application in Staff Portal Button -->
              <div style="text-align: center; margin: 28px 0 20px 0;">
                <a href="${staffPortalUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0066A6; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 102, 166, 0.25); text-align: center; letter-spacing: 0.3px;">
                  VIEW APPLICATION IN STAFF PORTAL &rarr;
                </a>
                <div style="font-size: 11px; color: #94A3B8; margin-top: 8px;">
                  Staff Portal Access &bull; Authorized Pathfinder staff accounts only
                </div>
              </div>

              <p style="font-size: 14px; color: #475569; margin: 24px 0 0 0; line-height: 1.6;">
                Our team will continue to assist you with your application. If you have any questions or need further guidance, please feel free to reach out to our counselling team.
              </p>

              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 14px; color: #0F172A;">
                Regards,<br>
                <strong>Pathfinder International Education</strong>
              </div>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 28px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; line-height: 1.6; text-align: center;">
              <strong>Pathfinder International Education</strong> &bull; Student Admissions &amp; Counselling Division<br>
              Putalisadak, Kathmandu, Nepal &bull; Tel: 01-5361805 | 01-5361853 &bull; Email: <a href="mailto:info@pathfinders.com.np" style="color: #0066A6; text-decoration: none;">info@pathfinders.com.np</a><br>
              <span style="font-size: 11px; color: #94A3B8;">Official Application Communication &bull; Pathfinder Educational Consultancy</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
};

/**
 * Resolves a verified Resend sender address.
 * Free webmail domains (gmail.com, yahoo.com, etc.) cannot be verified on Resend,
 * so they are safely overridden with Resend's permitted sender onboarding@resend.dev.
 * @returns {{ fromAddress: string; rawFrom: string }}
 */
export function resolveSenderAddress() {
  const defaultSandboxSender = 'Pathfinder International Education <onboarding@resend.dev>';
  const rawFrom = process.env.RESEND_FROM_EMAIL?.trim() || '(not set)';

  if (!rawFrom || rawFrom === '(not set)') {
    return { fromAddress: defaultSandboxSender, rawFrom };
  }

  const lower = rawFrom.toLowerCase();
  if (lower.includes('@resend.dev') || lower.includes('onboarding@resend.dev')) {
    return { fromAddress: rawFrom, rawFrom };
  }

  const emailMatch = rawFrom.match(/<([^>]+)>/) || [null, rawFrom];
  const emailAddr = (emailMatch[1] || rawFrom).trim().toLowerCase();
  const domain = emailAddr.split('@')[1] || '';

  if (FREE_WEBMAIL_DOMAINS.has(domain)) {
    console.warn(
      `[RESEND SENDER OVERRIDE] "${rawFrom}" uses a webmail domain (${domain}) that cannot be verified in Resend. Using permitted sender "${defaultSandboxSender}".`
    );
    return { fromAddress: defaultSandboxSender, rawFrom };
  }

  if (domain === 'pathfinders.com.np' && process.env.RESEND_DOMAIN_VERIFIED !== 'true') {
    console.warn(
      `[RESEND SENDER OVERRIDE] "${rawFrom}" uses unverified domain "pathfinders.com.np". Using permitted sender "${defaultSandboxSender}".`
    );
    return { fromAddress: defaultSandboxSender, rawFrom };
  }

  return { fromAddress: rawFrom, rawFrom };
}

/**
 * Server-side email dispatcher using Resend API exclusively.
 * Accurately reports success ONLY when the requested recipients accept delivery.
 * @param {{
 *   recipients: string[];
 *   bcc?: string[];
 *   replyTo?: string | string[];
 *   subject: string;
 *   textBody: string;
 *   htmlBody: string;
 *   isStaffAlert?: boolean;
 * }} options
 * @returns {Promise<{
 *   success: boolean;
 *   provider: string;
 *   error?: string;
 *   deliveredTo?: string[];
 *   resendId?: string;
 *   isSandboxMode?: boolean;
 * }>}
 */
export async function sendEmailNotification(options) {
  const recipients = options.recipients
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes('@'));
  const bccList = (options.bcc || [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes('@') && !recipients.some((r) => r.toLowerCase() === e.toLowerCase()));
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendApiKeyExists = Boolean(resendApiKey);

  console.log(`[RESEND DIAGNOSTIC] 1. RESEND_API_KEY exists: ${resendApiKeyExists}`);

  if (!resendApiKey) {
    const errorMsg =
      'RESEND_API_KEY is not configured in server environment variables. Please add RESEND_API_KEY to your deployment environment.';
    console.warn(`[EMAIL NOTIFICATION WARNING] ${errorMsg}`);
    return { success: false, provider: 'resend', error: errorMsg };
  }

  if (recipients.length === 0) {
    return {
      success: false,
      provider: 'resend',
      error: 'No valid recipient email address configured.',
    };
  }

  const { fromAddress, rawFrom } = resolveSenderAddress();
  console.log(`[RESEND DIAGNOSTIC] 2. RESEND_FROM_EMAIL (env): ${rawFrom}`);
  console.log(`[RESEND DIAGNOSTIC] 3. Target recipients: ${JSON.stringify(recipients)}`);

  /** @type {Record<string, unknown>} */
  const emailRequestBody = {
    from: fromAddress,
    to: recipients,
    subject: options.subject,
    text: options.textBody,
    html: options.htmlBody,
  };

  if (bccList.length > 0) {
    emailRequestBody.bcc = bccList;
  }

  if (options.replyTo) {
    emailRequestBody.reply_to = options.replyTo;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailRequestBody),
    });

    console.log(`[RESEND DIAGNOSTIC] 4. Resend API HTTP status: ${response.status}`);

    if (response.ok) {
      const responseData = /** @type {Record<string, unknown>} */ (await response.json().catch(() => ({})));
      const resendId = typeof responseData.id === 'string' ? responseData.id : 'unknown';
      console.log(`[RESEND DIAGNOSTIC] 5. Exact Resend API message: Success (HTTP ${response.status})`);
      console.log(`[RESEND DIAGNOSTIC] 6. Returned Resend email ID: ${resendId}`);
      console.log(
        `[EMAIL NOTIFICATION SENT] Dispatched via Resend API (id: ${resendId}) from "${fromAddress}" to ${recipients.join(', ')}${bccList.length > 0 ? ` (bcc: ${bccList.join(', ')})` : ''}`
      );
      return { success: true, provider: 'resend', deliveredTo: recipients, resendId };
    }

    const errorJson = /** @type {Record<string, unknown>} */ (await response.json().catch(() => ({})));
    const rawMsg = typeof errorJson.message === 'string' ? errorJson.message : '';
    const errName = typeof errorJson.name === 'string' ? errorJson.name : '';
    const exactError = rawMsg
      ? `${errName ? `[${errName}] ` : ''}${rawMsg}`
      : `Resend API returned HTTP ${response.status} (${response.statusText})`;

    console.log(`[RESEND DIAGNOSTIC] 5. Exact Resend API error/message: ${exactError}`);
    console.log(`[RESEND DIAGNOSTIC] 6. Returned Resend email ID: (None - request rejected)`);

    const allowedEmailMatch = rawMsg.match(/only send testing emails to your own email address\s*\(([^)]+@[^)]+)\)/i);
    const sandboxOwnerEmail = allowedEmailMatch?.[1]?.trim();
    const isSandboxRestriction = Boolean(allowedEmailMatch) || rawMsg.includes('only send testing emails');

    // If a direct email to the sandbox owner failed solely because of BCC, retry without BCC
    if (
      options.isStaffAlert === false &&
      isSandboxRestriction &&
      sandboxOwnerEmail &&
      bccList.length > 0 &&
      recipients.some((r) => r.toLowerCase() === sandboxOwnerEmail.toLowerCase())
    ) {
      /** @type {Record<string, unknown>} */
      const retryBody = {
        from: fromAddress,
        to: [sandboxOwnerEmail],
        subject: options.subject,
        text: options.textBody,
        html: options.htmlBody,
      };
      if (options.replyTo) {
        retryBody.reply_to = options.replyTo;
      }
      const retryResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retryBody),
      });
      if (retryResponse.ok) {
        const retryData = /** @type {Record<string, unknown>} */ (await retryResponse.json().catch(() => ({})));
        const retryId = typeof retryData.id === 'string' ? retryData.id : 'unknown';
        return {
          success: true,
          provider: 'resend-sandbox',
          deliveredTo: [sandboxOwnerEmail],
          resendId: retryId,
          isSandboxMode: true,
        };
      }
    }

    const detailedError =
      isSandboxRestriction && sandboxOwnerEmail && !recipients.some((r) => r.toLowerCase() === sandboxOwnerEmail.toLowerCase())
        ? `Resend rejected delivery to ${recipients.join(', ')}: ${exactError} To deliver to ${recipients.join(', ')}, either verify a domain at resend.com/domains or update RESEND_API_KEY to an API key from the ${recipients[0]} Resend account.`
        : exactError;

    return {
      success: false,
      provider: 'resend',
      error: detailedError,
      isSandboxMode: isSandboxRestriction,
    };
  } catch (apiErr) {
    const msg = apiErr instanceof Error ? apiErr.message : 'Resend API network error';
    console.error('[EMAIL NOTIFICATION EXCEPTION] Resend dispatch exception:', msg);
    return { success: false, provider: 'resend', error: `Network error connecting to Resend API: ${msg}` };
  }
}

/**
 * Sends a JSON HTTP response cleanly for both Express/Vercel and raw Node ServerResponse.
 * @param {any} res
 * @param {number} statusCode
 * @param {unknown} data
 */
export function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(data);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/**
 * Parses JSON body safely for both Vercel (pre-parsed req.body) and raw Node IncomingMessage.
 * @param {any} req
 * @returns {Promise<Record<string, any>>}
 */
export async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Handles new student enquiry staff alert notification (/api/notify-email).
 * @param {Record<string, any>} body
 */
export async function handleNotifyEmail(body) {
  const {
    applicationId,
    leadId,
    studentName,
    mobile,
    email,
    interestedCountry,
    choiceOfProgram,
    submittedAt,
    status,
    forceResend,
    isResend,
    simulateFailure,
  } = body;

  const refId = String(applicationId || leadId || '').trim();
  const recipients = getStaffRecipients();

  if (!refId || !studentName) {
    return {
      statusCode: 400,
      payload: {
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        error: 'Missing required fields (applicationId/leadId, studentName)',
      },
    };
  }

  const staffPortalUrl = getStaffPortalUrl(refId);
  const initialStatus = String(status || 'NEW ENQUIRY');
  const subTime = String(submittedAt || new Date().toISOString());

  studentStatusRegistry.set(refId.toUpperCase(), {
    applicationId: refId,
    studentName: String(studentName),
    email: String(email || ''),
    mobile: String(mobile || ''),
    interestedCountry: String(interestedCountry || 'Not Specified'),
    choiceOfProgram: String(choiceOfProgram || 'Not Specified'),
    submittedAt: subTime,
    currentStatus: initialStatus,
    statusHistory: [
      {
        date: subTime,
        previousStatus: 'None',
        newStatus: initialStatus,
        message: 'Initial enquiry submitted through online portal.',
        changedBy: 'Student Submission',
      },
    ],
  });

  if (dispatchedLeadIds.has(refId) && !forceResend && !isResend) {
    return {
      statusCode: 200,
      payload: {
        success: true,
        duplicatePrevented: true,
        emailStatus: 'SENT',
        notificationStatus: 'sent',
        recipients,
        recipient: recipients.join(', '),
        leadId: refId,
        sentAt: new Date().toISOString(),
        message: `Notification already dispatched to ${recipients.join(', ')} for ${refId}.`,
      },
    };
  }

  const { subject, textBody, htmlBody } = buildEmailPayload({
    applicationId: refId,
    leadId: refId,
    studentName: String(studentName),
    mobile: String(mobile || 'N/A'),
    email: String(email || 'N/A'),
    interestedCountry: String(interestedCountry || 'Not Specified'),
    choiceOfProgram: String(choiceOfProgram || 'Not Specified'),
    submittedAt: submittedAt ? String(submittedAt) : undefined,
    status: status ? String(status) : undefined,
    staffPortalUrl,
  });

  if (simulateFailure === true) {
    const failedEntry = {
      leadId: refId,
      recipients,
      subject,
      status: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      provider: 'simulation',
      sentAt: new Date().toISOString(),
      error: 'Simulated network timeout connecting to notification relay',
      bodyPreview: textBody.slice(0, 160),
    };
    notificationLogs.unshift(failedEntry);

    return {
      statusCode: 200,
      payload: {
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        error: failedEntry.error,
        timestamp: failedEntry.sentAt,
      },
    };
  }

  const dispatchResult = await sendEmailNotification({
    recipients,
    subject,
    textBody,
    htmlBody,
  });

  const now = new Date().toISOString();

  if (!dispatchResult.success) {
    const failedEntry = {
      leadId: refId,
      recipients,
      subject,
      status: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      provider: dispatchResult.provider,
      sentAt: now,
      error: dispatchResult.error || 'Email service dispatch failed',
      bodyPreview: textBody.slice(0, 160),
    };
    notificationLogs.unshift(failedEntry);

    return {
      statusCode: 502,
      payload: {
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        isSandboxMode: dispatchResult.isSandboxMode,
        error: dispatchResult.error || 'Email service dispatch error',
        sentAt: now,
      },
    };
  }

  dispatchedLeadIds.add(refId);

  const finalRecipients = dispatchResult.deliveredTo || recipients;
  const sentEntry = {
    leadId: refId,
    recipients: finalRecipients,
    subject,
    status: 'SENT',
    notificationStatus: 'sent',
    provider: dispatchResult.provider,
    sentAt: now,
    bodyPreview: textBody.slice(0, 160),
  };
  notificationLogs.unshift(sentEntry);

  return {
    statusCode: 200,
    payload: {
      success: true,
      emailStatus: 'SENT',
      notificationStatus: 'sent',
      recipients: finalRecipients,
      recipient: finalRecipients.join(', '),
      subject,
      sentAt: sentEntry.sentAt,
      provider: dispatchResult.provider,
      resendId: dispatchResult.resendId,
      message: `Notification Sent via Resend to ${finalRecipients.join(', ')}`,
    },
  };
}

/**
 * Handles staff manual resend email notification (/api/resend-email).
 * @param {Record<string, any>} body
 */
export async function handleResendEmail(body) {
  const {
    applicationId,
    leadId,
    studentName,
    mobile,
    email,
    interestedCountry,
    choiceOfProgram,
    submittedAt,
    status,
  } = body;

  const refId = String(applicationId || leadId || '').trim();
  const recipients = getStaffRecipients();

  if (!refId || !studentName) {
    return {
      statusCode: 400,
      payload: {
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        error: 'Missing applicationId/leadId or studentName for resend',
      },
    };
  }

  const staffPortalUrl = getStaffPortalUrl(refId);

  const { subject, textBody, htmlBody } = buildEmailPayload({
    applicationId: refId,
    leadId: refId,
    studentName: String(studentName),
    mobile: String(mobile || 'N/A'),
    email: String(email || 'N/A'),
    interestedCountry: String(interestedCountry || 'Not Specified'),
    choiceOfProgram: String(choiceOfProgram || 'Not Specified'),
    submittedAt: submittedAt ? String(submittedAt) : undefined,
    status: status ? String(status) : undefined,
    staffPortalUrl,
  });

  const resendSubject = `[RESENT] ${subject}`;

  const dispatchResult = await sendEmailNotification({
    recipients,
    subject: resendSubject,
    textBody,
    htmlBody,
  });

  const now = new Date().toISOString();

  if (!dispatchResult.success) {
    const failedEntry = {
      leadId: refId,
      recipients,
      subject: resendSubject,
      status: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      provider: dispatchResult.provider,
      sentAt: now,
      error: dispatchResult.error || 'Resend delivery failed',
      bodyPreview: textBody.slice(0, 160),
    };
    notificationLogs.unshift(failedEntry);

    return {
      statusCode: 502,
      payload: {
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        isSandboxMode: dispatchResult.isSandboxMode,
        error: dispatchResult.error || 'Resend delivery error',
      },
    };
  }

  dispatchedLeadIds.add(refId);

  const finalRecipients = dispatchResult.deliveredTo || recipients;
  const entry = {
    leadId: refId,
    recipients: finalRecipients,
    subject: resendSubject,
    status: 'SENT',
    notificationStatus: 'sent',
    provider: dispatchResult.provider,
    sentAt: now,
    bodyPreview: textBody.slice(0, 160),
  };
  notificationLogs.unshift(entry);

  return {
    statusCode: 200,
    payload: {
      success: true,
      emailStatus: 'SENT',
      notificationStatus: 'sent',
      recipients: finalRecipients,
      recipient: finalRecipients.join(', '),
      sentAt: entry.sentAt,
      resendId: dispatchResult.resendId,
      message: `Notification Sent via Resend to ${finalRecipients.join(', ')}`,
    },
  };
}

/**
 * Handles student application status update email notification (/api/notify-student-status).
 * @param {Record<string, any>} body
 */
export async function handleNotifyStudentStatus(body) {
  const {
    applicationId,
    leadId,
    studentName,
    studentEmail,
    previousStatus,
    newStatus,
    staffMessage,
    changedBy,
    sendEmail,
  } = body;

  const refId = String(applicationId || leadId || '').trim();

  if (!refId || !studentName || !newStatus) {
    return {
      statusCode: 400,
      payload: {
        success: false,
        emailNotificationStatus: 'failed',
        error: 'Missing required fields (applicationId/leadId, studentName, newStatus)',
      },
    };
  }

  const now = new Date().toISOString();
  const existing = studentStatusRegistry.get(refId.toUpperCase());
  const updatedHistory = existing?.statusHistory ? [...existing.statusHistory] : [];
  updatedHistory.unshift({
    date: now,
    previousStatus: String(previousStatus || existing?.currentStatus || 'NEW ENQUIRY'),
    newStatus: String(newStatus),
    message: staffMessage ? String(staffMessage) : undefined,
    changedBy: String(changedBy || 'Authorized Staff'),
  });

  studentStatusRegistry.set(refId.toUpperCase(), {
    applicationId: refId,
    studentName: String(studentName || existing?.studentName || ''),
    email: String(studentEmail || existing?.email || ''),
    mobile: existing?.mobile || '',
    interestedCountry: existing?.interestedCountry,
    choiceOfProgram: existing?.choiceOfProgram,
    submittedAt: existing?.submittedAt || now,
    currentStatus: String(newStatus),
    statusHistory: updatedHistory,
  });

  if (sendEmail === false) {
    return {
      statusCode: 200,
      payload: {
        success: true,
        emailNotificationStatus: 'not_requested',
        message: 'Status updated successfully. Email notification was not requested.',
        applicationId: refId,
      },
    };
  }

  const targetEmail = String(studentEmail || existing?.email || '').trim();
  if (!targetEmail || !targetEmail.includes('@')) {
    return {
      statusCode: 200,
      payload: {
        success: true,
        emailNotificationStatus: 'failed',
        error: 'Student email address is invalid or not provided',
        message: 'Status saved, but student email could not be sent due to missing or invalid email address.',
      },
    };
  }

  const staffPortalUrl = getStaffPortalUrl(refId);
  const { subject, textBody, htmlBody } = buildStudentStatusEmailPayload({
    applicationId: refId,
    studentName: String(studentName),
    previousStatus: String(previousStatus || 'Previous Status'),
    newStatus: String(newStatus),
    staffMessage: staffMessage ? String(staffMessage) : undefined,
    updatedAt: now,
    staffPortalUrl,
  });

  const studentEmailCopyRecipients = Array.from(
    new Set([PRIMARY_RESEND_EMAIL, getOwnerEmail()].map((e) => e.trim().toLowerCase()))
  ).filter((e) => e && e.includes('@') && e !== targetEmail.toLowerCase());

  const dispatchResult = await sendEmailNotification({
    recipients: [targetEmail],
    bcc: studentEmailCopyRecipients,
    replyTo: PRIMARY_RESEND_EMAIL,
    subject,
    textBody,
    htmlBody,
    isStaffAlert: false,
  });

  if (!dispatchResult.success) {
    if (dispatchResult.isSandboxMode) {
      return {
        statusCode: 200,
        payload: {
          success: true,
          emailNotificationStatus: 'sandbox_restricted',
          isSandboxMode: true,
          error: dispatchResult.error,
          message:
            'Status updated. Student email notification was paused while Resend is in sandbox mode (pending domain verification).',
          applicationId: refId,
        },
      };
    }

    return {
      statusCode: 200,
      payload: {
        success: true,
        emailNotificationStatus: 'failed',
        error: dispatchResult.error || 'Failed to dispatch email to student',
        message: 'Status saved successfully in system, but student notification email failed.',
      },
    };
  }

  return {
    statusCode: 200,
    payload: {
      success: true,
      emailNotificationStatus: 'sent',
      message: `Status update email successfully sent to ${targetEmail}`,
      applicationId: refId,
      sentAt: now,
    },
  };
}
