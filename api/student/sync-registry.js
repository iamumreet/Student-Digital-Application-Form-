import {
  parseJsonBody,
  sendJson,
  studentStatusRegistry,
} from '../_emailService.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const students = body.students;

    if (!Array.isArray(students)) {
      sendJson(res, 400, {
        success: false,
        error: 'Invalid payload: expected students array.',
      });
      return;
    }

    for (const s of students) {
      if (!s || typeof s !== 'object') continue;
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
              ? historyArr.map((h) => ({
                  date: String(h?.changedAt || h?.date || new Date().toISOString()),
                  previousStatus: String(h?.previousStatus || ''),
                  newStatus: String(h?.newStatus || ''),
                  message: h?.message ? String(h.message) : undefined,
                  changedBy: h?.changedBy ? String(h.changedBy) : undefined,
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

    sendJson(res, 200, { success: true, count: studentStatusRegistry.size });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Student registry synchronization error';
    sendJson(res, 500, { success: false, error: errorMsg });
  }
}
