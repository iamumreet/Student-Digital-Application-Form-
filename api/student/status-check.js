import {
  parseJsonBody,
  sendJson,
  studentStatusRegistry,
} from '../_emailService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const { applicationId, leadId, identifier } = body;
    const refId = String(applicationId || leadId || '').trim().toUpperCase();
    const cleanId = String(identifier || '').trim().toLowerCase();

    if (!refId || !cleanId) {
      sendJson(res, 400, {
        success: false,
        error: 'Please provide both your Application ID (e.g. PF-2026-000001) and your registered Email or Mobile number.',
      });
      return;
    }

    const student = studentStatusRegistry.get(refId);
    if (!student) {
      sendJson(res, 404, {
        success: false,
        error: `No application found with Reference ID "${refId}". Please verify your Application Reference ID or contact our admissions desk.`,
      });
      return;
    }

    const storedEmail = String(student.email || '').toLowerCase().trim();
    const storedMobileDigits = String(student.mobile || '').replace(/\D/g, '');
    const inputDigits = cleanId.replace(/\D/g, '');

    const emailMatches = storedEmail === cleanId;
    const mobileMatches = inputDigits.length >= 7 && storedMobileDigits.endsWith(inputDigits.slice(-7));

    if (!emailMatches && !mobileMatches) {
      sendJson(res, 403, {
        success: false,
        error: 'Verification failed. The email or mobile number does not match this Application Reference ID.',
      });
      return;
    }

    const emailParts = String(student.email || '').split('@');
    const maskedEmail =
      emailParts.length === 2 && emailParts[0].length > 2
        ? `${emailParts[0][0]}***${emailParts[0].slice(-1)}@${emailParts[1]}`
        : student.email;

    sendJson(res, 200, {
      success: true,
      student: {
        applicationId: student.applicationId,
        studentName: student.studentName,
        maskedEmail,
        interestedCountry: student.interestedCountry || 'Not Specified',
        choiceOfProgram: student.choiceOfProgram || 'Not Specified',
        submittedAt: student.submittedAt,
        currentStatus: student.currentStatus,
        statusHistory: (Array.isArray(student.statusHistory) ? student.statusHistory : []).map((h) => ({
          date: h.date,
          status: h.newStatus,
          message: h.message,
        })),
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Status check error';
    sendJson(res, 500, { success: false, error: errorMsg });
  }
}
