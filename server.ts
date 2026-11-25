import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  DEFAULT_STAFF_RECIPIENTS,
  PRIMARY_RESEND_EMAIL,
  PRODUCTION_STAFF_PORTAL_URL,
  buildEmailPayload,
  buildStudentStatusEmailPayload,
  dispatchedLeadIds,
  getOwnerEmail,
  getStaffPortalUrl as computeStaffPortalUrl,
  getStaffRecipients,
  handleNotifyEmail,
  handleNotifyStudentStatus,
  handleResendEmail,
  notificationLogs,
  resolveSenderAddress,
  sendEmailNotification,
  studentStatusRegistry,
} from './api/_emailService.js';

dotenv.config();

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

export {
  DEFAULT_STAFF_RECIPIENTS,
  PRIMARY_RESEND_EMAIL,
  PRODUCTION_STAFF_PORTAL_URL,
  buildEmailPayload,
  buildStudentStatusEmailPayload,
  getStaffRecipients,
  studentStatusRegistry,
};

export const getStaffPortalUrl = (_req?: Request, applicationId?: string): string =>
  computeStaffPortalUrl(applicationId);

const app = express();
const PORT = 3000;

// Body parsers with sufficient payload size for student submissions and base64 references
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
  const { fromAddress, rawFrom } = resolveSenderAddress();
  const staffRecipients = getStaffRecipients();

  console.log('[RESEND TEST REQUEST INITIATED]');
  console.log(`[RESEND DIAGNOSTIC] 1. RESEND_API_KEY exists: ${resendApiKeyExists}`);
  console.log(`[RESEND DIAGNOSTIC] 2. RESEND_FROM_EMAIL (env): ${rawFrom}`);
  console.log(`[RESEND DIAGNOSTIC] 3. Target notification recipients: ${JSON.stringify(staffRecipients)}`);

  const testResult = await sendEmailNotification({
    recipients: staffRecipients,
    subject: 'Pathfinder Diagnostic Verification Email',
    textBody: 'This is a diagnostic verification email from the Pathfinder Student Application System.',
    htmlBody:
      '<p>This is a <strong>diagnostic verification email</strong> from the Pathfinder Student Application System.</p>',
  });

  res.status(testResult.success ? 200 : 502).json({
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
});

// 3. Dispatch new student enquiry email notification
app.post('/api/notify-email', async (req: Request, res: Response) => {
  try {
    const { statusCode, payload } = await handleNotifyEmail(req.body || {});
    res.status(statusCode).json(payload);
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
    const { statusCode, payload } = await handleResendEmail(req.body || {});
    if (statusCode === 200) {
      console.log(
        `[EMAIL NOTIFICATION RESENT] Lead: ${req.body?.leadId || req.body?.applicationId} resent to ${getStaffRecipients().join(', ')}`
      );
    }
    res.status(statusCode).json(payload);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Resend error';
    console.error('[EMAIL NOTIFICATION RESEND SERVER ERROR]', errorMessage);
    res.status(500).json({
      success: false,
      emailStatus: 'EMAIL_FAILED',
      notificationStatus: 'failed',
      recipients: getStaffRecipients(),
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

// 6. Student status update notification endpoint
app.post('/api/notify-student-status', async (req: Request, res: Response) => {
  try {
    const { statusCode, payload } = await handleNotifyStudentStatus(req.body || {});
    res.status(statusCode).json(payload);
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

    const emailParts = student.email.split('@');
    const maskedEmail =
      emailParts.length === 2 && emailParts[0].length > 2
        ? `${emailParts[0][0]}***${emailParts[0].slice(-1)}@${emailParts[1]}`
        : student.email;

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
            statusHistory:
              Array.isArray(s.statusHistory) && s.statusHistory.length > 0
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

// Keep dispatchedLeadIds referenced for module parity
void dispatchedLeadIds;

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
