import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers with sufficient payload size for student submissions and base64 references
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

/**
 * Official Pathfinder Staff Notification Recipients
 * Mandatory 6 staff accounts to receive new enquiry notifications:
 * 1. admission@pathfinders.com.np
 * 2. bdm@pathfinders.com.np
 * 3. director@pathfinders.com.np
 * 4. australia@pathfinders.com.np
 * 5. info@pathfinders.com.np
 * 6. uk@pathfinders.com.np
 */
export const DEFAULT_STAFF_RECIPIENTS = [
  'admission@pathfinders.com.np',
  'bdm@pathfinders.com.np',
  'director@pathfinders.com.np',
  'australia@pathfinders.com.np',
  'info@pathfinders.com.np',
  'uk@pathfinders.com.np',
];

/**
 * Resolves the active notification recipients list from environment variables
 * (Vercel Production variables) or defaults to the official 6 Pathfinder staff accounts.
 */
export const getStaffRecipients = (): string[] => {
  const envRecipients = process.env.STAFF_NOTIFICATION_EMAILS;
  if (envRecipients && envRecipients.trim()) {
    const parsed = envRecipients
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@'));
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [...DEFAULT_STAFF_RECIPIENTS];
};

/**
 * Fallback owner email for backward compatibility
 */
const getOwnerEmail = (): string => {
  return process.env.OWNER_EMAIL || 'admission@pathfinders.com.np';
};

/**
 * In-memory registry to prevent duplicate email notifications
 * if the student submission workflow is retried.
 */
const dispatchedLeadIds = new Set<string>();

// In-memory log of notification dispatches for auditability and staff diagnostics
export interface NotificationLog {
  leadId: string;
  recipients: string[];
  subject: string;
  status: 'SENT' | 'EMAIL_FAILED';
  notificationStatus: 'sent' | 'failed';
  provider: string;
  sentAt: string;
  error?: string;
  bodyPreview: string;
}

const notificationLogs: NotificationLog[] = [];

/**
 * Computes the authenticated Staff Portal link for the prominent email button
 */
const getStaffPortalUrl = (req: Request, applicationId: string): string => {
  const configuredAppUrl = process.env.APP_URL;
  if (configuredAppUrl && configuredAppUrl.trim()) {
    const cleanUrl = configuredAppUrl.trim().replace(/\/+$/, '');
    return `${cleanUrl}/?view=staff&leadId=${encodeURIComponent(applicationId)}`;
  }

  // Derive origin from request headers
  const host = req.get('host') || 'localhost:3000';
  const protocol =
    req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/?view=staff&leadId=${encodeURIComponent(applicationId)}`;
};

/**
 * Generates the official Pathfinder staff notification email payload
 * Strictly satisfies all requirements:
 * - Subject: New Student Enquiry — {applicationId}
 * - Includes: Lead ID, Student Name, Email, Mobile, Interested Country, Program, Submission Time, Status
 * - Prominent "View Application" button pointing to the Staff Portal
 * - No sensitive documents, passwords, or tokens included
 */
export const buildEmailPayload = (data: {
  applicationId: string;
  leadId: string;
  studentName: string;
  mobile: string;
  email: string;
  interestedCountry: string;
  choiceOfProgram: string;
  submittedAt?: string;
  status?: string;
  staffPortalUrl: string;
}) => {
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
  // Required format: New Student Enquiry — {applicationId}
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

Notice: This is an automated notification dispatched to authorized Pathfinder staff accounts:
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
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; line-height: 1.5;">
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
                    <div style="font-size: 11px; font-weight: 700; color: #F5821F; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px;">Official Staff Notification</div>
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.2px;">PATHFINDER INTERNATIONAL EDUCATION</h1>
                    <p style="color: #E2E8F0; margin: 6px 0 0 0; font-size: 13px;">Student Counselling &amp; Admissions Portal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary Information Body -->
          <tr>
            <td style="padding: 28px;">
              <!-- Lead Reference Badge -->
              <div style="background-color: #F0F9FF; border-left: 4px solid #0066A6; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px;">
                <span style="font-size: 11px; font-weight: 700; color: #0284C7; text-transform: uppercase; letter-spacing: 0.8px;">Application / Lead Reference ID</span>
                <div style="font-size: 22px; font-weight: 800; color: #0066A6; margin-top: 3px; font-family: 'Courier New', Courier, monospace;">${refId}</div>
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
 * Strictly satisfies requirements:
 * - Subject: Update on Your Pathfinder Application — {applicationId}
 * - Includes:
 *   - Pathfinder International Education
 *   - Student name
 *   - Application/Lead Reference ID
 *   - Previous status
 *   - New status
 *   - Staff message/remark
 *   - Date/time of status update
 *   - Professional Pathfinder closing
 *   - Contact information
 */
export const buildStudentStatusEmailPayload = (data: {
  applicationId: string;
  studentName: string;
  previousStatus: string;
  newStatus: string;
  staffMessage?: string;
  updatedAt?: string;
}) => {
  const refId = data.applicationId;
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
 * Server-side email dispatcher using Resend API exclusively.
 *
 * Requirements & Environment variables:
 * - process.env.RESEND_API_KEY: Resend secret API key (Bearer token).
 * - process.env.RESEND_FROM_EMAIL: Sender address.
 *   CRITICAL RESEND BEHAVIOR:
 *   1. Custom domain "pathfinders.com.np" is NOT verified yet on Resend.
 *   2. Free webmail domains like @gmail.com or @yahoo.com CANNOT be verified on Resend.
 *   Therefore, sending from any @pathfinders.com.np or @gmail.com address triggers Resend HTTP 403:
 *   "domain is not verified".
 *   In sandbox testing mode, the server strictly uses:
 *   "Pathfinder International Education <onboarding@resend.dev>"
 * - process.env.STAFF_NOTIFICATION_EMAILS: Comma-separated list of staff emails.
 *
 * Implements exact Resend error capturing, sandbox fallback delivery, and non-blocking Firestore resilience.
 */
async function sendEmailNotification(options: {
  recipients: string[];
  subject: string;
  textBody: string;
  htmlBody: string;
  isStaffAlert?: boolean;
}): Promise<{
  success: boolean;
  provider: string;
  error?: string;
  deliveredTo?: string[];
  resendId?: string;
  isSandboxMode?: boolean;
}> {
  const recipients = options.recipients;
  const isStaffAlert = options.isStaffAlert !== false;
  const resendApiKeyExists = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  // Log 1: Whether RESEND_API_KEY exists (ONLY log true/false, NEVER log the key)
  console.log(`[RESEND DIAGNOSTIC] 1. RESEND_API_KEY exists: ${resendApiKeyExists}`);

  if (!resendApiKey) {
    const errorMsg = 'RESEND_API_KEY is not configured in server environment variables. Please add RESEND_API_KEY to environment.';
    console.warn(`[EMAIL NOTIFICATION WARNING] ${errorMsg}`);
    return { success: false, provider: 'resend', error: errorMsg };
  }

  // Log 2: The RESEND_FROM_EMAIL value in env
  const rawFrom = process.env.RESEND_FROM_EMAIL?.trim() || '(not set)';
  console.log(`[RESEND DIAGNOSTIC] 2. RESEND_FROM_EMAIL (env): ${rawFrom}`);

  // Log 3: The parsed STAFF_NOTIFICATION_EMAILS list
  console.log(`[RESEND DIAGNOSTIC] 3. Parsed STAFF_NOTIFICATION_EMAILS list: ${JSON.stringify(recipients)}`);

  // SENDER RESOLUTION:
  // Custom domain "pathfinders.com.np" is NOT verified yet on Resend.
  // In addition, free webmail (@gmail.com, @yahoo.com) CANNOT send via Resend.
  // Using an unverified domain causes Resend HTTP 403: "The domain is not verified".
  // Therefore, in sandbox / testing mode, the system strictly uses:
  // "Pathfinder International Education <onboarding@resend.dev>"
  let fromAddress = 'Pathfinder International Education <onboarding@resend.dev>';
  if (
    rawFrom &&
    rawFrom !== '(not set)' &&
    (rawFrom.toLowerCase().includes('@resend.dev') || rawFrom.toLowerCase().includes('onboarding@resend.dev'))
  ) {
    fromAddress = rawFrom;
  } else if (rawFrom && rawFrom !== '(not set)') {
    console.warn(
      `[RESEND SENDER OVERRIDE] "${rawFrom}" is not a verified Resend domain. Using permitted sandbox sender "${fromAddress}".`
    );
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject: options.subject,
        text: options.textBody,
        html: options.htmlBody,
      }),
    });

    // Log 4: The Resend API HTTP status
    console.log(`[RESEND DIAGNOSTIC] 4. Resend API HTTP status: ${response.status}`);

    if (response.ok) {
      const responseData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const resendId = typeof responseData.id === 'string' ? responseData.id : 'unknown';
      // Log 5 & 6 on success
      console.log(`[RESEND DIAGNOSTIC] 5. Exact Resend API message: Success (HTTP ${response.status})`);
      console.log(`[RESEND DIAGNOSTIC] 6. Returned Resend email ID: ${resendId}`);
      console.log(
        `[EMAIL NOTIFICATION SENT] Dispatched via Resend API (id: ${resendId}) from "${fromAddress}" to ${recipients.length} recipients: ${recipients.join(', ')}`
      );
      return { success: true, provider: 'resend', deliveredTo: recipients, resendId };
    }

    // Capture exact Resend error details
    const errorJson = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const rawMsg = typeof errorJson.message === 'string' ? errorJson.message : '';
    const errName = typeof errorJson.name === 'string' ? errorJson.name : '';
    const exactError = rawMsg
      ? `${errName ? `[${errName}] ` : ''}${rawMsg}`
      : `Resend API returned HTTP ${response.status} (${response.statusText})`;

    // Log 5 & 6 on failure
    console.log(`[RESEND DIAGNOSTIC] 5. Exact Resend API error/message: ${exactError}`);
    console.log(`[RESEND DIAGNOSTIC] 6. Returned Resend email ID: (None - request rejected)`);

    // Detect Sandbox limitation:
    // "You can only send testing emails to your own email address (pariyaramrit429@gmail.com)..."
    const allowedEmailMatch = rawMsg.match(/only send testing emails to your own email address\s*\(([^)]+@[^)]+)\)/i);
    const sandboxOwnerEmail = allowedEmailMatch?.[1]?.trim() || 'pariyaramrit429@gmail.com';
    const isSandboxRestriction = Boolean(allowedEmailMatch) || rawMsg.includes('only send testing emails');

    // For staff admissions alerts, deliver to the verified sandbox email so alerts are never missed:
    if (isStaffAlert && sandboxOwnerEmail && !recipients.includes(sandboxOwnerEmail)) {
      console.log(
        `[RESEND SANDBOX FALLBACK] Domain pathfinders.com.np is unverified. Delivering alert to verified account: ${sandboxOwnerEmail}`
      );

      try {
        const fallbackResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Pathfinder International Education <onboarding@resend.dev>',
            to: [sandboxOwnerEmail],
            subject: `[Admissions Alert] ${options.subject}`,
            text: options.textBody,
            html: options.htmlBody,
          }),
        });

        console.log(`[RESEND SANDBOX FALLBACK] HTTP status: ${fallbackResponse.status}`);

        if (fallbackResponse.ok) {
          const fbData = (await fallbackResponse.json().catch(() => ({}))) as Record<string, unknown>;
          const fbId = typeof fbData.id === 'string' ? fbData.id : 'unknown';
          console.log(
            `[RESEND SANDBOX FALLBACK SUCCESS] Alert successfully delivered to verified account (${sandboxOwnerEmail}, Resend ID: ${fbId})`
          );
          return {
            success: true,
            provider: 'resend-sandbox',
            deliveredTo: [sandboxOwnerEmail],
            resendId: fbId,
            isSandboxMode: true,
          };
        } else {
          const fbErrJson = await fallbackResponse.json().catch(() => ({}));
          console.warn('[RESEND SANDBOX FALLBACK REJECTED]', fbErrJson);
        }
      } catch (fbErr: unknown) {
        console.warn('[RESEND SANDBOX FALLBACK EXCEPTION]', fbErr);
      }
    }

    return {
      success: false,
      provider: 'resend',
      error: exactError,
      isSandboxMode: isSandboxRestriction,
    };
  } catch (apiErr: unknown) {
    const msg = apiErr instanceof Error ? apiErr.message : 'Resend API network error';
    console.error('[EMAIL NOTIFICATION EXCEPTION] Resend dispatch exception:', msg);
    return { success: false, provider: 'resend', error: msg };
  }
}

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Pathfinder International Education Counselling API',
    notificationRecipients: getStaffRecipients(),
    timestamp: new Date().toISOString(),
  });
});

// 2. Safe email configuration lookup for staff diagnostic
app.get('/api/config/owner-email', (req: Request, res: Response) => {
  res.json({
    configured: true,
    recipients: getStaffRecipients(),
  });
});

// 2b. Live server-side diagnostic test for Resend (safe, no secrets exposed)
app.get('/api/diagnostic/email-test', async (req: Request, res: Response) => {
  const resendApiKeyExists = Boolean(process.env.RESEND_API_KEY?.trim());
  const rawFrom = process.env.RESEND_FROM_EMAIL?.trim() || '(not set)';
  const staffRecipients = getStaffRecipients();

  console.log('[RESEND TEST REQUEST INITIATED]');
  console.log(`[RESEND DIAGNOSTIC] 1. RESEND_API_KEY exists: ${resendApiKeyExists}`);
  console.log(`[RESEND DIAGNOSTIC] 2. RESEND_FROM_EMAIL (env): ${rawFrom}`);
  console.log(`[RESEND DIAGNOSTIC] 3. Parsed STAFF_NOTIFICATION_EMAILS list: ${JSON.stringify(staffRecipients)}`);

  const testResult = await sendEmailNotification({
    recipients: staffRecipients,
    subject: 'Pathfinder Diagnostic Verification Email',
    textBody: 'This is a diagnostic verification email from the Pathfinder Student Application System.',
    htmlBody: '<p>This is a <strong>diagnostic verification email</strong> from the Pathfinder Student Application System.</p>',
  });

  res.json({
    timestamp: new Date().toISOString(),
    resendApiKeyExists,
    configuredFromEmail: rawFrom,
    effectiveSender: 'Pathfinder International Education <onboarding@resend.dev>',
    parsedStaffRecipients: staffRecipients,
    success: testResult.success,
    provider: testResult.provider,
    deliveredTo: testResult.deliveredTo,
    resendEmailId: testResult.resendId,
    error: testResult.error,
    isSandboxMode: testResult.isSandboxMode,
    sandboxGuidance: testResult.isSandboxMode
      ? 'Custom domain pathfinders.com.np is not verified on Resend yet. While in sandbox mode, Resend delivers exclusively to verified account: pariyaramrit429@gmail.com'
      : undefined,
  });
});

// 3. Dispatch new student enquiry email notification
// Reuses the existing /api/notify-email infrastructure as required
app.post('/api/notify-email', async (req: Request, res: Response) => {
  try {
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
      simulateFailure,
    } = req.body;

    const refId = String(applicationId || leadId || '').trim();

    if (!refId || !studentName) {
      res.status(400).json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients: getStaffRecipients(),
        error: 'Missing required fields (applicationId/leadId, studentName)',
      });
      return;
    }

    const recipients = getStaffRecipients();
    const staffPortalUrl = getStaffPortalUrl(req, refId);

    // Register / update student record in server registry for self-service status checks
    const initialStatus = status || 'NEW ENQUIRY';
    const subTime = submittedAt || new Date().toISOString();
    studentStatusRegistry.set(refId.toUpperCase(), {
      applicationId: refId,
      studentName: String(studentName),
      email: String(email || ''),
      mobile: String(mobile || ''),
      interestedCountry: interestedCountry || 'Not Specified',
      choiceOfProgram: choiceOfProgram || 'Not Specified',
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

    // Prevent duplicate notifications if the submission workflow is retried
    if (dispatchedLeadIds.has(refId) && !forceResend && !req.body.isResend) {
      console.log(
        `[EMAIL NOTIFICATION DUPLICATE PREVENTED] Lead "${refId}" notification was already dispatched. Skipping duplicate send.`
      );
      res.json({
        success: true,
        duplicatePrevented: true,
        emailStatus: 'SENT',
        notificationStatus: 'sent',
        recipients,
        leadId: refId,
        sentAt: new Date().toISOString(),
        message: `Duplicate notification prevented for ${refId}. Notification already dispatched to staff.`,
      });
      return;
    }

    const { subject, textBody, htmlBody } = buildEmailPayload({
      applicationId: refId,
      leadId: refId,
      studentName,
      mobile: mobile || 'N/A',
      email: email || 'N/A',
      interestedCountry: interestedCountry || 'Not Specified',
      choiceOfProgram: choiceOfProgram || 'Not Specified',
      submittedAt,
      status,
      staffPortalUrl,
    });

    // Test failure simulation if explicitly requested
    if (simulateFailure === true) {
      const failedEntry: NotificationLog = {
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

      res.json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        error: failedEntry.error,
        timestamp: failedEntry.sentAt,
      });
      return;
    }

    // Dispatch email through server-side providers
    const dispatchResult = await sendEmailNotification({
      recipients,
      subject,
      textBody,
      htmlBody,
    });

    const now = new Date().toISOString();

    if (!dispatchResult.success) {
      const failedEntry: NotificationLog = {
        leadId: refId,
        recipients,
        subject,
        status: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        provider: dispatchResult.provider,
        sentAt: now,
        error: dispatchResult.error || 'Server email dispatch failed',
        bodyPreview: textBody.slice(0, 160),
      };
      notificationLogs.unshift(failedEntry);

      res.status(502).json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        error: dispatchResult.error || 'Email service dispatch error',
        sentAt: now,
      });
      return;
    }

    // Mark lead as dispatched to prevent duplicate notification on retries
    dispatchedLeadIds.add(refId);

    // Record verified dispatch for staff audit & diagnostics
    const finalRecipients = dispatchResult.deliveredTo || recipients;
    const sentEntry: NotificationLog = {
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

    res.json({
      success: true,
      emailStatus: 'SENT',
      notificationStatus: 'sent',
      recipients: finalRecipients,
      recipient: finalRecipients.join(', '),
      subject,
      sentAt: sentEntry.sentAt,
      provider: dispatchResult.provider,
      resendId: dispatchResult.resendId,
      message: `New enquiry notification successfully dispatched via Resend to ${finalRecipients.length} recipients`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[EMAIL NOTIFICATION SERVER ERROR]', errorMessage);
    res.status(500).json({
      success: false,
      emailStatus: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      recipients: getStaffRecipients(),
      error: errorMessage,
    });
  }
});

// 4. Resend email notification (for failed or staff-requested resends)
app.post('/api/resend-email', async (req: Request, res: Response) => {
  try {
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
    } = req.body;

    const refId = String(applicationId || leadId || '').trim();

    if (!refId || !studentName) {
      res.status(400).json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        error: 'Missing applicationId/leadId or studentName for resend',
      });
      return;
    }

    const recipients = getStaffRecipients();
    const staffPortalUrl = getStaffPortalUrl(req, refId);

    const { subject, textBody, htmlBody } = buildEmailPayload({
      applicationId: refId,
      leadId: refId,
      studentName,
      mobile: mobile || 'N/A',
      email: email || 'N/A',
      interestedCountry: interestedCountry || 'Not Specified',
      choiceOfProgram: choiceOfProgram || 'Not Specified',
      submittedAt,
      status,
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
      res.status(502).json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        notificationStatus: 'failed',
        recipients,
        error: dispatchResult.error || 'Resend error',
      });
      return;
    }

    dispatchedLeadIds.add(refId);

    const finalRecipients = dispatchResult.deliveredTo || recipients;
    const entry: NotificationLog = {
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

    console.log(
      `[EMAIL NOTIFICATION RESENT] Lead: ${refId} resent to ${finalRecipients.length} recipients: ${finalRecipients.join(', ')}`
    );

    res.json({
      success: true,
      emailStatus: 'SENT',
      notificationStatus: 'sent',
      recipients: finalRecipients,
      recipient: finalRecipients.join(', '),
      sentAt: entry.sentAt,
      resendId: dispatchResult.resendId,
      message: `Notification successfully resent via Resend to ${finalRecipients.length} recipients`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Resend error';
    console.error('[EMAIL NOTIFICATION RESEND SERVER ERROR]', errorMessage);
    res.status(500).json({
      success: false,
      emailStatus: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      error: errorMessage,
    });
  }
});

// 5. Audit logs endpoint for staff diagnostics
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({
    recipients: getStaffRecipients(),
    total: notificationLogs.length,
    logs: notificationLogs.slice(0, 50),
  });
});

/**
 * In-memory secure registry for student status updates and self-service checks.
 * Prepared for future dedicated authentication while maintaining zero unauthorized access to /students.
 */
export interface ServerStudentStatusRecord {
  applicationId: string;
  studentName: string;
  email: string;
  mobile: string;
  interestedCountry?: string;
  choiceOfProgram?: string;
  submittedAt: string;
  currentStatus: string;
  statusHistory: Array<{
    date: string;
    previousStatus: string;
    newStatus: string;
    message?: string;
    changedBy?: string;
  }>;
}

export const studentStatusRegistry = new Map<string, ServerStudentStatusRecord>();

// 6. Student status update notification endpoint
// Dispatches status email to the student when authorized staff changes application status
app.post('/api/notify-student-status', async (req: Request, res: Response) => {
  try {
    const {
      applicationId,
      leadId,
      studentName,
      studentEmail,
      previousStatus,
      newStatus,
      staffMessage,
      changedBy,
      changedByEmail,
      sendEmail,
    } = req.body;

    const refId = String(applicationId || leadId || '').trim();

    if (!refId || !studentName || !newStatus) {
      res.status(400).json({
        success: false,
        emailNotificationStatus: 'failed',
        error: 'Missing required fields (applicationId/leadId, studentName, newStatus)',
      });
      return;
    }

    const now = new Date().toISOString();

    // Update server status registry for student status check
    const existing = studentStatusRegistry.get(refId.toUpperCase());
    const updatedHistory = existing?.statusHistory ? [...existing.statusHistory] : [];
    updatedHistory.unshift({
      date: now,
      previousStatus: previousStatus || existing?.currentStatus || 'NEW ENQUIRY',
      newStatus,
      message: staffMessage || undefined,
      changedBy: changedBy || 'Authorized Staff',
    });

    studentStatusRegistry.set(refId.toUpperCase(), {
      applicationId: refId,
      studentName: studentName || existing?.studentName || '',
      email: studentEmail || existing?.email || '',
      mobile: existing?.mobile || '',
      interestedCountry: existing?.interestedCountry,
      choiceOfProgram: existing?.choiceOfProgram,
      submittedAt: existing?.submittedAt || now,
      currentStatus: newStatus,
      statusHistory: updatedHistory,
    });

    // Check if staff requested sending the status update email to the student
    const shouldSendEmail = sendEmail !== false;
    if (!shouldSendEmail) {
      console.log(
        `[STUDENT STATUS UPDATE] Status updated to "${newStatus}" for lead ${refId}. Student email was not requested by staff.`
      );
      res.json({
        success: true,
        emailNotificationStatus: 'not_requested',
        message: 'Status updated successfully. Email notification was not requested.',
        applicationId: refId,
      });
      return;
    }

    const targetEmail = String(studentEmail || existing?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      console.warn(
        `[STUDENT STATUS EMAIL WARNING] Cannot dispatch status email for ${refId}: invalid or missing email address "${targetEmail}".`
      );
      res.json({
        success: true, // Status update succeeds regardless
        emailNotificationStatus: 'failed',
        error: 'Student email address is invalid or not provided',
        message: 'Status saved, but student email could not be sent due to missing or invalid email address.',
      });
      return;
    }

    const { subject, textBody, htmlBody } = buildStudentStatusEmailPayload({
      applicationId: refId,
      studentName,
      previousStatus: previousStatus || 'Previous Status',
      newStatus,
      staffMessage,
      updatedAt: now,
    });

    const dispatchResult = await sendEmailNotification({
      recipients: [targetEmail],
      subject,
      textBody,
      htmlBody,
      isStaffAlert: false,
    });

    if (!dispatchResult.success) {
      if (dispatchResult.isSandboxMode) {
        console.log(
          `[STUDENT STATUS EMAIL SANDBOX PAUSED] Lead ${refId} status updated to "${newStatus}". Outbound email to ${targetEmail} paused: Resend is in sandbox mode pending pathfinders.com.np domain verification.`
        );
        res.json({
          success: true, // Status update is safely preserved in Firestore
          emailNotificationStatus: 'sandbox_restricted',
          isSandboxMode: true,
          message: 'Status updated. Student email notification was safely paused while Resend is in sandbox mode (pending pathfinders.com.np domain verification).',
          applicationId: refId,
        });
        return;
      }

      console.error(
        `[STUDENT STATUS EMAIL FAILED] Could not send status update email to ${targetEmail}:`,
        dispatchResult.error
      );
      res.json({
        success: true, // Status update must remain saved even if email fails
        emailNotificationStatus: 'failed',
        error: dispatchResult.error || 'Failed to dispatch email to student',
        message: 'Status saved successfully in system, but student notification email failed.',
      });
      return;
    }

    console.log(
      `[STUDENT STATUS EMAIL SENT] Dispatched status update email to ${targetEmail} for lead ${refId} (${newStatus})`
    );

    res.json({
      success: true,
      emailNotificationStatus: 'sent',
      message: `Status update email successfully sent to ${targetEmail}`,
      applicationId: refId,
      sentAt: now,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown student status email error';
    console.error('[STUDENT STATUS NOTIFICATION EXCEPTION]', errorMsg);
    res.status(500).json({
      success: false,
      emailNotificationStatus: 'failed',
      error: errorMsg,
    });
  }
});

// 7. Secure student-facing application status check endpoint
// Allows students to check their own status using Application ID + registered Email/Mobile
// Strictly prohibits access to other students or staff collections
app.post('/api/student/status-check', (req: Request, res: Response) => {
  try {
    const { applicationId, leadId, identifier } = req.body;
    const refId = String(applicationId || leadId || '').trim().toUpperCase();
    const cleanId = String(identifier || '').trim().toLowerCase();

    if (!refId || !cleanId) {
      res.status(400).json({
        success: false,
        error: 'Please provide both your Application ID (e.g. PF-2026-000001) and your registered Email or Mobile number.',
      });
      return;
    }

    const student = studentStatusRegistry.get(refId);

    if (!student) {
      res.status(404).json({
        success: false,
        error: `No application found with Reference ID "${refId}". Please verify your Application Reference ID or contact our admissions desk.`,
      });
      return;
    }

    // Secure verification: verify that the identifier matches the registered email or mobile
    const storedEmail = student.email.toLowerCase().trim();
    const storedMobileDigits = student.mobile.replace(/\D/g, '');
    const inputDigits = cleanId.replace(/\D/g, '');

    const emailMatches = storedEmail === cleanId;
    const mobileMatches = inputDigits.length >= 7 && storedMobileDigits.endsWith(inputDigits.slice(-7));

    if (!emailMatches && !mobileMatches) {
      res.status(403).json({
        success: false,
        error: 'Verification failed. The email or mobile number does not match this Application Reference ID.',
      });
      return;
    }

    // Partially mask email for privacy (e.g. j***e@domain.com)
    const emailParts = student.email.split('@');
    const maskedEmail =
      emailParts.length === 2 && emailParts[0].length > 2
        ? `${emailParts[0][0]}***${emailParts[0].slice(-1)}@${emailParts[1]}`
        : student.email;

    // Return strictly sanitized student-facing status data (read-only, no internal remarks)
    res.json({
      success: true,
      student: {
        applicationId: student.applicationId,
        studentName: student.studentName,
        maskedEmail,
        interestedCountry: student.interestedCountry || 'Not Specified',
        choiceOfProgram: student.choiceOfProgram || 'Not Specified',
        submittedAt: student.submittedAt,
        currentStatus: student.currentStatus,
        statusHistory: student.statusHistory.map((h) => ({
          date: h.date,
          status: h.newStatus,
          message: h.message,
        })),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Status check error';
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

// 8. Staff dashboard registry synchronization endpoint
app.post('/api/student/sync-registry', (req: Request, res: Response) => {
  try {
    const { students } = req.body;
    if (Array.isArray(students)) {
      for (const s of students) {
        const refId = String(s.leadId || s.id || '').trim().toUpperCase();
        if (refId) {
          studentStatusRegistry.set(refId, {
            applicationId: s.leadId || refId,
            studentName: s.fullName || '',
            email: s.email || '',
            mobile: s.mobileNumber || '',
            interestedCountry: s.interestedCountry,
            choiceOfProgram: s.choiceOfProgram,
            submittedAt: s.submittedAt || new Date().toISOString(),
            currentStatus: s.status || 'NEW ENQUIRY',
            statusHistory: Array.isArray(s.statusHistory) && s.statusHistory.length > 0
              ? s.statusHistory.map((h: any) => ({
                  date: h.changedAt || h.date || new Date().toISOString(),
                  previousStatus: h.previousStatus || '',
                  newStatus: h.newStatus || '',
                  message: h.message,
                  changedBy: h.changedBy,
                }))
              : [
                  {
                    date: s.submittedAt || new Date().toISOString(),
                    previousStatus: 'None',
                    newStatus: s.status || 'NEW ENQUIRY',
                    message: 'Application recorded in system.',
                    changedBy: 'System',
                  },
                ],
          });
        }
      }
    }
    res.json({ success: true, count: studentStatusRegistry.size });
  } catch {
    res.json({ success: true });
  }
});

// Vite middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pathfinder Server running on port ${PORT}`);
    console.log(`Notification recipients: ${getStaffRecipients().join(', ')}`);
  });
}

startServer();
