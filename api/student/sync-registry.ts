import {
  parseJsonBody,
  sendJson,
  ServerlessRequest,
  ServerlessResponse,
  studentStatusRegistry,
} from '../_emailService';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const body = await parseJsonBody<{ students?: Array<Record<string, unknown>> }>(req);
    const students = body.students;
    if (Array.isArray(students)) {
      for (const s of students) {
        const refId = String(s.leadId || s.id || '').trim().toUpperCase();
        if (refId) {
          const historyArr = Array.isArray(s.statusHistory) ? s.statusHistory : [];
          studentStatusRegistry.set(refId, {
            applicationId: String(s.leadId || refId),
            studentName: String(s.fullName || ''),
            email: String(s.email || ''),
            mobile: String(s.mobileNumber || ''),
            interestedCountry: s.interestedCountry ? String(s.interestedCountry) : undefined,
            choiceOfProgram: s.choiceOfProgram ? String(s.choiceOfProgram) : undefined,
            submittedAt: String(s.submittedAt || new Date().toISOString()),
            currentStatus: String(s.status || 'NEW ENQUIRY'),
            statusHistory:
              historyArr.length > 0
                ? historyArr.map((h: Record<string, unknown>) => ({
                    date: String(h.changedAt || h.date || new Date().toISOString()),
                    previousStatus: String(h.previousStatus || ''),
                    newStatus: String(h.newStatus || ''),
                    message: h.message ? String(h.message) : undefined,
                    changedBy: h.changedBy ? String(h.changedBy) : undefined,
                  }))
                : [
                    {
                      date: String(s.submittedAt || new Date().toISOString()),
                      previousStatus: 'None',
                      newStatus: String(s.status || 'NEW ENQUIRY'),
                      message: 'Application recorded in system.',
                      changedBy: 'System',
                    },
                  ],
          });
        }
      }
    }
    sendJson(res, 200, { success: true, count: studentStatusRegistry.size });
  } catch {
    sendJson(res, 200, { success: true });
  }
}
