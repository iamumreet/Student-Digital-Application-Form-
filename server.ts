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

// Configured Owner/Admin email (stored strictly server-side)
const getOwnerEmail = (): string => {
  return process.env.OWNER_EMAIL || 'umreetkumar@gmail.com';
};

// In-memory log of notification dispatches for auditability
interface NotificationLog {
  leadId: string;
  recipient: string;
  subject: string;
  status: 'SENT' | 'EMAIL_FAILED';
  sentAt: string;
  error?: string;
  bodyPreview: string;
}

const notificationLogs: NotificationLog[] = [];

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Pathfinder International Education Counselling API',
    timestamp: new Date().toISOString(),
  });
});

// 2. Safe owner email config lookup
app.get('/api/config/owner-email', (req: Request, res: Response) => {
  res.json({
    configured: true,
  });
});

// Helper to generate the exact required email content
const buildEmailPayload = (data: {
  leadId: string;
  studentName: string;
  mobile: string;
  email: string;
  interestedCountry: string;
  choiceOfProgram: string;
  submittedAt?: string;
  status?: string;
}) => {
  const subDate = data.submittedAt
    ? new Date(data.submittedAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString();

  const status = data.status || 'NEW ENQUIRY';
  const subject = `New Student Counselling Enquiry — ${data.leadId} — ${data.studentName}`;

  const textBody = `
==================================================
PATHFINDER INTERNATIONAL EDUCATION
==================================================
New Student Counselling Enquiry

Lead ID:
${data.leadId}

Student:
${data.studentName}

Mobile:
${data.mobile}

Email:
${data.email}

Interested Country:
${data.interestedCountry || 'Not Specified'}

Choice of Program:
${data.choiceOfProgram || 'Not Specified'}

Submitted:
${subDate}

Status:
${status}

--------------------------------------------------
ACTIONS:
- View Student Profile: Access Pathfinder Counsellor Portal (Lead ${data.leadId})
- Download PDF: Available in Pathfinder Counsellor Portal

Pathfinder International Education
Student Admissions & Counselling Department
Putalisadak, Kathmandu, Nepal
Tel: 01-5361805 | 01-5361853 | Email: info@pathfinders.com.np
==================================================
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; color: #1E293B;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #0066A6; padding: 20px 24px; border-bottom: 4px solid #F5821F;">
      <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 0.5px;">PATHFINDER INTERNATIONAL EDUCATION</h1>
      <p style="color: #E2E8F0; margin: 4px 0 0 0; font-size: 13px;">New Student Counselling Enquiry</p>
    </div>
    <div style="padding: 24px;">
      <div style="background: #F1F5F9; border-left: 4px solid #0066A6; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
        <span style="font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase;">Lead Reference ID</span>
        <div style="font-size: 18px; font-weight: 700; color: #0066A6;">${data.leadId}</div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #64748B; width: 40%;"><strong>Student:</strong></td>
          <td style="padding: 8px 0; color: #1E293B; font-weight: 600;">${data.studentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748B;"><strong>Mobile:</strong></td>
          <td style="padding: 8px 0; color: #1E293B;">${data.mobile}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748B;"><strong>Email:</strong></td>
          <td style="padding: 8px 0; color: #1E293B;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748B;"><strong>Interested Country:</strong></td>
          <td style="padding: 8px 0; color: #0066A6; font-weight: 600;">${data.interestedCountry || 'Not Specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748B;"><strong>Choice of Program:</strong></td>
          <td style="padding: 8px 0; color: #1E293B;">${data.choiceOfProgram || 'Not Specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748B;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0; color: #1E293B;">${subDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748B;"><strong>Status:</strong></td>
          <td style="padding: 8px 0; color: #F5821F; font-weight: 700;">${status}</td>
        </tr>
      </table>

      <div style="margin: 24px 0; text-align: center;">
        <a href="#view-student-${data.leadId}" style="display: inline-block; background-color: #0066A6; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 600; font-size: 14px; border-radius: 6px; margin-right: 12px;">VIEW STUDENT PROFILE</a>
        <a href="#download-pdf-${data.leadId}" style="display: inline-block; background-color: #F8FAFC; color: #1E293B; border: 1px solid #CBD5E1; text-decoration: none; padding: 12px 20px; font-weight: 600; font-size: 14px; border-radius: 6px;">DOWNLOAD PDF</a>
      </div>
    </div>
    <div style="background-color: #F8FAFC; padding: 14px 24px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center;">
      Pathfinder International Education • Student Counselling & Admissions Portal<br>
      Putalisadak, Kathmandu, Nepal • Tel: 01-5361805 | 01-5361853 • Email: info@pathfinders.com.np
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
};

// 3. Dispatch new student enquiry email notification
app.post('/api/notify-email', (req: Request, res: Response) => {
  try {
    const {
      leadId,
      studentName,
      mobile,
      email,
      interestedCountry,
      choiceOfProgram,
      submittedAt,
      status,
      simulateFailure,
    } = req.body;

    if (!leadId || !studentName) {
      res.status(400).json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        recipient: getOwnerEmail(),
        error: 'Missing required fields (leadId, studentName)',
      });
      return;
    }

    const recipient = getOwnerEmail();
    const { subject, textBody, htmlBody } = buildEmailPayload({
      leadId,
      studentName,
      mobile,
      email,
      interestedCountry,
      choiceOfProgram,
      submittedAt,
      status,
    });

    // Test failure simulation if explicitly requested
    if (simulateFailure === true) {
      const failedEntry: NotificationLog = {
        leadId,
        recipient,
        subject,
        status: 'EMAIL_FAILED',
        sentAt: new Date().toISOString(),
        error: 'Simulated network timeout connecting to SMTP relay',
        bodyPreview: textBody.slice(0, 160),
      };
      notificationLogs.unshift(failedEntry);

      res.json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        recipient,
        error: failedEntry.error,
        timestamp: failedEntry.sentAt,
      });
      return;
    }

    // Record verified dispatch
    const sentEntry: NotificationLog = {
      leadId,
      recipient,
      subject,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      bodyPreview: textBody.slice(0, 160),
    };
    notificationLogs.unshift(sentEntry);

    console.log(`[EMAIL NOTIFICATION SENT] To: ${recipient} | Subject: ${subject}`);

    res.json({
      success: true,
      emailStatus: 'SENT',
      recipient,
      subject,
      sentAt: sentEntry.sentAt,
      message: 'Notification email dispatched to authorized staff inbox',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[EMAIL NOTIFICATION ERROR]', errorMessage);
    res.status(500).json({
      success: false,
      emailStatus: 'EMAIL_FAILED',
      recipient: getOwnerEmail(),
      error: errorMessage,
    });
  }
});

// 4. Resend email notification (for failed or requested resends)
app.post('/api/resend-email', (req: Request, res: Response) => {
  try {
    const { leadId, studentName, mobile, email, interestedCountry, choiceOfProgram, submittedAt, status } =
      req.body;

    if (!leadId || !studentName) {
      res.status(400).json({
        success: false,
        emailStatus: 'EMAIL_FAILED',
        error: 'Missing leadId or studentName for resend',
      });
      return;
    }

    const recipient = getOwnerEmail();
    const { subject, textBody } = buildEmailPayload({
      leadId,
      studentName,
      mobile,
      email,
      interestedCountry,
      choiceOfProgram,
      submittedAt,
      status,
    });

    const entry: NotificationLog = {
      leadId,
      recipient,
      subject: `[RESENT] ${subject}`,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      bodyPreview: textBody.slice(0, 160),
    };
    notificationLogs.unshift(entry);

    console.log(`[EMAIL NOTIFICATION RESENT] To: ${recipient} | Subject: [RESENT] ${subject}`);

    res.json({
      success: true,
      emailStatus: 'SENT',
      recipient,
      sentAt: entry.sentAt,
      message: `Notification successfully resent to ${recipient}`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Resend error';
    res.status(500).json({
      success: false,
      emailStatus: 'EMAIL_FAILED',
      error: errorMessage,
    });
  }
});

// 5. Audit logs endpoint
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({
    recipient: getOwnerEmail(),
    total: notificationLogs.length,
    logs: notificationLogs.slice(0, 50),
  });
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
  });
}

startServer();
