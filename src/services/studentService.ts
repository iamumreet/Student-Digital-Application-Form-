import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { StudentRecord, ActivityItem, StudentStatus, EmailStatus, StatusHistoryEntry } from '../types/student';
import { generateStudentPDF } from './pdfService';
import { studentToSpreadsheetRow } from './spreadsheetService';

const COLLECTION_NAME = 'students';
const SPREADSHEET_COLLECTION = 'response_spreadsheet_rows';

/**
 * Default fallback admissions email derived from system configuration
 */
export const DEFAULT_ADMISSIONS_EMAIL = 'admission@pathfinders.com.np';

/**
 * Official Pathfinder Staff Notification Recipients
 */
export const DEFAULT_STAFF_NOTIFICATION_RECIPIENTS: string[] = [
  'admission@pathfinders.com.np',
  'bdm@pathfinders.com.np',
  'director@pathfinders.com.np',
  'australia@pathfinders.com.np',
  'info@pathfinders.com.np',
  'uk@pathfinders.com.np',
];

/**
 * Recursively removes any undefined values from objects and arrays
 * while strictly preserving null, false, 0, empty strings, empty arrays, Dates,
 * and Firestore FieldValues (such as serverTimestamp()).
 */
export function cleanForFirestore<T>(value: T): T {
  if (value === undefined) {
    return undefined as unknown as T;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Preserve Date objects
  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }

  // Check if it's a plain JavaScript object
  const proto = Object.getPrototypeOf(value);
  const isPlainObject = proto === null || proto === Object.prototype;

  if (!isPlainObject) {
    // Preserve Firestore FieldValue (serverTimestamp, deleteField) or custom SDK classes
    return value;
  }

  const cleanedObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) {
      cleanedObj[key] = cleanForFirestore(val);
    }
  }

  return cleanedObj as unknown as T;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SubmissionWorkflowProgress {
  step: number;
  message: string;
}

export interface SubmissionResult {
  success: boolean;
  leadId: string;
  student: StudentRecord;
  pdfDataUri?: string;
  emailStatus: EmailStatus;
  notificationStatus?: 'sent' | 'failed' | 'pending';
  emailRecipient?: string;
  errorMessage?: string;
}

/**
 * Generates the next sequential Lead ID (format: PF-2026-000001)
 * Guaranteed unique and sequential via Firestore transaction.
 */
export async function getNextLeadId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterRef = doc(db, 'counters', 'students');

  try {
    const nextSeq = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let count = 1;
      if (counterSnap.exists()) {
        count = (counterSnap.data().currentCount || 0) + 1;
      }
      transaction.set(counterRef, { currentCount: count, updatedAt: serverTimestamp() }, { merge: true });
      return count;
    });

    const padded = String(nextSeq).padStart(6, '0');
    return `PF-${currentYear}-${padded}`;
  } catch (err) {
    console.warn('Firestore transaction for counter fallback:', err);
    // Reliable timestamp fallback if offline
    const randomSeq = Math.floor(Date.now() % 900000) + 100000;
    const padded = String(randomSeq).padStart(6, '0');
    return `PF-${currentYear}-${padded}`;
  }
}

/**
 * Resilient submission workflow:
 * 1. Validate all form data
 * 2. Generate unique Lead ID
 * 3. Write core student application to Firestore /students immediately
 * 4. Generate official PDF and attach to application
 * 5. Dispatch optional email notification to admissions
 * 6. Add submission to response spreadsheet collection
 * 7. Return complete result for successful submission screen
 */
export async function submitStudentWorkflow(
  formData: Omit<StudentRecord, 'leadId' | 'submittedAt' | 'status' | 'activityHistory'>,
  onProgress?: (progress: SubmissionWorkflowProgress) => void
): Promise<SubmissionResult> {
  // Step 1: Validate
  onProgress?.({ step: 1, message: 'Validating student enquiry data...' });
  if (!formData.fullName?.trim()) throw new Error('Student full name is required');
  if (!formData.mobileNumber?.trim()) throw new Error('Mobile number is required');
  if (!formData.email?.trim()) throw new Error('Email address is required');

  // Step 2: Generate unique Pathfinder Lead ID
  onProgress?.({ step: 2, message: 'Generating unique Pathfinder Lead ID...' });
  const leadId = await getNextLeadId();
  const now = new Date();
  const submittedAt = now.toISOString();
  const submittedAtFormatted = now.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const initialActivity: ActivityItem = {
    id: `act-${Date.now()}-1`,
    date: submittedAt,
    displayDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    title: 'Enquiry submitted',
    description: 'Student submitted the online counselling & enquiry form.',
    author: formData.fullName || 'Student',
    type: 'submission',
  };

  const studentDocRef = doc(collection(db, COLLECTION_NAME));
  const studentDocId = studentDocRef.id;

  const initialStatusHistoryEntry: StatusHistoryEntry = {
    previousStatus: 'None',
    newStatus: 'NEW ENQUIRY',
    message: 'Initial enquiry submitted through online portal.',
    changedBy: formData.fullName || 'Student',
    changedAt: submittedAt,
    emailNotificationRequested: true,
    emailNotificationStatus: 'pending',
  };

  // Base record with safe default status and admissions recipient
  const studentRecord: StudentRecord = {
    ...formData,
    id: studentDocId,
    leadId,
    submittedAt,
    submittedAtFormatted,
    status: 'NEW ENQUIRY',
    unread: true, // Mark as unread for the staff dashboard notification system
    activityHistory: [initialActivity],
    notificationStatus: 'pending',
    staffNotificationStatus: 'pending',
    studentNotificationStatus: 'not_requested',
    statusHistory: [initialStatusHistoryEntry],
    notificationRecipients: [...DEFAULT_STAFF_NOTIFICATION_RECIPIENTS],
    emailStatus: 'PENDING',
    emailRecipient: DEFAULT_STAFF_NOTIFICATION_RECIPIENTS.join(', '),
  };

  // Step 3: Save primary application securely to Firestore /students FIRST
  onProgress?.({ step: 3, message: 'Saving application securely to Pathfinder Firestore database...' });
  try {
    const primaryPayload = cleanForFirestore({
      ...studentRecord,
      id: studentDocId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(studentDocRef, primaryPayload);
  } catch (dbErr) {
    console.error('Firestore save failed:', dbErr);
    handleFirestoreError(dbErr, OperationType.CREATE, COLLECTION_NAME);
  }

  // Step 4: Generate professional PDF document
  onProgress?.({ step: 5, message: 'Generating official Pathfinder PDF document...' });
  let pdfDataUri: string | undefined;
  try {
    const pdfResult = generateStudentPDF(studentRecord);
    pdfDataUri = pdfResult.dataUri;
    studentRecord.pdfUrl = pdfDataUri;
    studentRecord.pdfGeneratedAt = new Date().toISOString();

    await updateDoc(
      studentDocRef,
      cleanForFirestore({
        pdfUrl: pdfDataUri,
        pdfGeneratedAt: studentRecord.pdfGeneratedAt,
        updatedAt: serverTimestamp(),
      })
    ).catch((pdfUpdateErr) => {
      console.warn('PDF Firestore reference update warning (application preserved):', pdfUpdateErr);
    });
  } catch (pdfErr) {
    console.error('PDF generation warning (application preserved):', pdfErr);
  }

  // Step 5: Send new-enquiry email notification only AFTER Firestore write succeeds
  onProgress?.({ step: 7, message: 'Dispatching notification email to Pathfinder Admissions...' });
  let emailStatus: EmailStatus = 'PENDING';
  let notificationStatus: 'sent' | 'failed' | 'pending' = 'pending';
  let notificationRecipients: string[] = [...DEFAULT_STAFF_NOTIFICATION_RECIPIENTS];
  let notificationError: string | undefined;

  try {
    const response = await fetch('/api/notify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: studentRecord.leadId,
        leadId: studentRecord.leadId,
        studentName: studentRecord.fullName,
        mobile: studentRecord.mobileNumber,
        email: studentRecord.email,
        interestedCountry: studentRecord.interestedCountry,
        choiceOfProgram: studentRecord.choiceOfProgram,
        submittedAt: studentRecord.submittedAt,
        status: studentRecord.status,
      }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.success) {
      emailStatus = 'SENT';
      notificationStatus = 'sent';
      if (Array.isArray(data.recipients) && data.recipients.length > 0) {
        notificationRecipients = data.recipients;
      }
    } else {
      emailStatus = 'EMAIL_FAILED';
      notificationStatus = 'failed';
      notificationError = data?.error || 'Email service returned failure';
      console.warn('Email dispatch warning (student application safely preserved):', notificationError);
    }
  } catch (emailErr) {
    console.warn('Email dispatch service warning (student application safely preserved):', emailErr);
    emailStatus = 'EMAIL_FAILED';
    notificationStatus = 'failed';
    notificationError = emailErr instanceof Error ? emailErr.message : 'Network error communicating with email API';
  }

  studentRecord.notificationStatus = notificationStatus;
  studentRecord.staffNotificationStatus = notificationStatus;
  studentRecord.notificationRecipients = notificationRecipients;
  studentRecord.notificationSentAt = notificationStatus === 'sent' ? new Date().toISOString() : undefined;
  studentRecord.notificationError = notificationError;
  studentRecord.emailStatus = emailStatus;
  studentRecord.emailRecipient = notificationRecipients.join(', ');
  studentRecord.emailSentAt = notificationStatus === 'sent' ? new Date().toISOString() : undefined;
  studentRecord.emailError = notificationError;

  if (studentRecord.statusHistory && studentRecord.statusHistory[0]) {
    studentRecord.statusHistory[0].emailNotificationStatus = notificationStatus;
    studentRecord.statusHistory[0].emailNotificationError = notificationError;
  }

  // Persist notification status back to Firestore doc (non-blocking for student application)
  // If email failed, the application remains safely saved in Firestore /students
  try {
    await updateDoc(
      studentDocRef,
      cleanForFirestore({
        notificationStatus: studentRecord.notificationStatus,
        staffNotificationStatus: studentRecord.staffNotificationStatus,
        notificationRecipients: studentRecord.notificationRecipients,
        notificationSentAt: studentRecord.notificationSentAt,
        notificationError: studentRecord.notificationError,
        emailStatus: studentRecord.emailStatus,
        emailRecipient: studentRecord.emailRecipient,
        emailSentAt: studentRecord.emailSentAt,
        emailError: studentRecord.emailError,
        statusHistory: studentRecord.statusHistory,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (emailUpdateErr) {
    console.warn('Email status Firestore update warning (application preserved):', emailUpdateErr);
  }

  // Step 6: Add submission to response spreadsheet collection (non-blocking)
  onProgress?.({ step: 9, message: 'Recording entry in Pathfinder Response Spreadsheet...' });
  try {
    const spreadsheetRow = studentToSpreadsheetRow(studentRecord);
    const rowRecord = cleanForFirestore({
      leadId,
      submittedAt,
      studentName: studentRecord.fullName,
      rowData: spreadsheetRow,
      createdAt: serverTimestamp(),
    });

    const rowRef = doc(collection(db, SPREADSHEET_COLLECTION));
    await setDoc(rowRef, rowRecord);

    studentRecord.spreadsheetSynced = true;
    studentRecord.spreadsheetSyncedAt = new Date().toISOString();
  } catch (sheetErr) {
    console.warn('Response spreadsheet logging warning:', sheetErr);
  }

  // Step 7: Complete
  onProgress?.({ step: 10, message: 'Application submitted successfully.' });

  return {
    success: true,
    leadId,
    student: studentRecord,
    pdfDataUri,
    emailStatus,
    notificationStatus,
    emailRecipient: studentRecord.emailRecipient,
  };
}

/**
 * Resend email notification for an existing student (from Counsellor Dashboard)
 */
export async function resendStudentNotification(student: StudentRecord): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await fetch('/api/resend-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: student.leadId,
        leadId: student.leadId,
        studentName: student.fullName,
        mobile: student.mobileNumber,
        email: student.email,
        interestedCountry: student.interestedCountry,
        choiceOfProgram: student.choiceOfProgram,
        submittedAt: student.submittedAt,
        status: student.status,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Server returned error response on email resend');
    }

    const now = new Date();
    const recipients =
      Array.isArray(data.recipients) && data.recipients.length > 0
        ? data.recipients
        : DEFAULT_STAFF_NOTIFICATION_RECIPIENTS;

    if (student.id) {
      await updateStudent(
        student.id,
        cleanForFirestore({
          notificationStatus: 'sent',
          notificationSentAt: now.toISOString(),
          notificationRecipients: recipients,
          notificationError: null,
          emailStatus: 'SENT',
          emailSentAt: now.toISOString(),
          emailRecipient: recipients.join(', '),
          emailError: null,
        }),
        {
          title: 'Notification email resent',
          description: `Staff resent enquiry alert to ${recipients.length} authorized staff recipients.`,
          author: 'Authorized Staff',
          type: 'email',
        }
      );
    }

    return {
      success: true,
      message: `Notification successfully resent to ${recipients.length} authorized staff inboxes`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Resend failed';
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Fetch all students from Firestore (Real applications only, no mock data)
 */
export async function getAllStudents(): Promise<StudentRecord[]> {
  try {
    const studentsCol = collection(db, COLLECTION_NAME);
    const q = query(studentsCol, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<StudentRecord, 'id'>),
    }));
  } catch (error) {
    console.error('Error fetching students from Firestore:', error);
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  }
}

/**
 * Fetch response spreadsheet rows
 */
export async function getSpreadsheetRows(): Promise<(string | number)[][]> {
  try {
    const rowsCol = collection(db, SPREADSHEET_COLLECTION);
    const q = query(rowsCol, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((d) => d.data().rowData as (string | number)[]);
  } catch (error) {
    console.error('Error fetching spreadsheet rows:', error);
    handleFirestoreError(error, OperationType.GET, SPREADSHEET_COLLECTION);
  }
}

/**
 * Update student record and append an activity log entry
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<StudentRecord>,
  activity?: Omit<ActivityItem, 'id' | 'date'>
): Promise<void> {
  try {
    const studentRef = doc(db, COLLECTION_NAME, studentId);
    const snap = await getDoc(studentRef);

    let currentActivities: ActivityItem[] = [];
    if (snap.exists()) {
      currentActivities = snap.data().activityHistory || [];
    }

    if (activity) {
      const now = new Date();
      const newAct: ActivityItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: now.toISOString(),
        displayDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        ...activity,
      };
      currentActivities.unshift(newAct);
      updates.activityHistory = currentActivities;
    }

    const cleanedUpdates = cleanForFirestore({
      ...updates,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(studentRef, cleanedUpdates);
  } catch (error) {
    console.error('Error updating student in Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${studentId}`);
  }
}

/**
 * Realtime listener for all students (newest first).
 * Automatically fires whenever a student submits or staff edits.
 */
export function subscribeToStudents(
  callback: (students: StudentRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    const studentsCol = collection(db, COLLECTION_NAME);
    const q = query(studentsCol, orderBy('submittedAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<StudentRecord, 'id'>),
        }));
        callback(records);
      },
      (err) => {
        console.error('Firestore onSnapshot subscription error:', err);
        onError?.(err);
        handleFirestoreError(err, OperationType.GET, COLLECTION_NAME);
      }
    );
  } catch (err) {
    console.error('Could not establish Firestore subscription:', err);
    onError?.(err);
    handleFirestoreError(err, OperationType.GET, COLLECTION_NAME);
  }
}

/**
 * Permanently delete a student record from Firestore
 */
export async function deleteStudent(studentId: string): Promise<void> {
  try {
    const studentRef = doc(db, COLLECTION_NAME, studentId);
    await deleteDoc(studentRef);
  } catch (err) {
    console.error('Error deleting student from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${studentId}`);
  }
}

/**
 * Change student status directly from response table or profile
 */
export async function updateStudentStatus(
  studentId: string,
  newStatus: StudentStatus,
  author = 'Admissions Staff'
): Promise<void> {
  await updateStudent(
    studentId,
    { status: newStatus },
    {
      title: 'Status Updated',
      description: `Status changed to "${newStatus}"`,
      author,
      type: 'status_change',
    }
  );
}

/**
 * Update follow-up date for a student
 */
export async function updateStudentFollowUp(
  studentId: string,
  followUpDate: string,
  author = 'Admissions Staff'
): Promise<void> {
  await updateStudent(
    studentId,
    { followUpDate },
    {
      title: 'Follow-up Scheduled',
      description: `Follow-up set for ${followUpDate}`,
      author,
      type: 'followup',
    }
  );
}

/**
 * Add an internal note to a student
 */
export async function addStudentNote(
  studentId: string,
  noteText: string,
  author = 'Admissions Staff'
): Promise<void> {
  await updateStudent(
    studentId,
    { counsellingNotes: noteText },
    {
      title: 'Staff Note Added',
      description: noteText,
      author,
      type: 'note',
    }
  );
}

/**
 * Changes a student's application status with optional message/remark and email dispatch to the student.
 * Non-destructive: If email dispatch fails, the Firestore status update is still successfully preserved.
 */
export async function updateStudentStatusWithNotification(options: {
  student: StudentRecord;
  newStatus: StudentStatus;
  staffMessage?: string;
  sendEmailToStudent: boolean;
  staffUser: { name: string; email?: string | null };
}): Promise<{
  success: boolean;
  emailSent: boolean;
  message: string;
  updatedStudent: StudentRecord;
}> {
  const { student, newStatus, staffMessage, sendEmailToStudent, staffUser } = options;
  if (!student.id) {
    throw new Error('Student document ID is required to update status');
  }

  const previousStatus = student.status;
  const now = new Date();
  const nowIso = now.toISOString();

  let emailNotificationStatus: 'sent' | 'failed' | 'not_requested' | 'sandbox_restricted' = 'not_requested';
  let emailNotificationError: string | undefined;
  let emailSent = false;

  // Step 1: If staff requested email notification, attempt dispatch via server API
  if (sendEmailToStudent) {
    try {
      const response = await fetch('/api/notify-student-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: student.leadId,
          leadId: student.leadId,
          studentName: student.fullName,
          studentEmail: student.email,
          previousStatus,
          newStatus,
          staffMessage: staffMessage?.trim(),
          changedBy: staffUser.name || 'Admissions Staff',
          changedByEmail: staffUser.email,
          sendEmail: true,
        }),
      });

      const resData = await response.json().catch(() => null);

      if (response.ok && resData?.emailNotificationStatus === 'sent') {
        emailNotificationStatus = 'sent';
        emailSent = true;
      } else if (response.ok && resData?.emailNotificationStatus === 'sandbox_restricted') {
        emailNotificationStatus = 'sandbox_restricted';
        emailNotificationError = 'Student email paused while Resend is in sandbox mode (pending pathfinders.com.np domain verification)';
      } else {
        emailNotificationStatus = 'failed';
        emailNotificationError = resData?.error || 'Student email notification could not be delivered';
      }
    } catch (err: unknown) {
      emailNotificationStatus = 'failed';
      emailNotificationError = err instanceof Error ? err.message : 'Network failure contacting email service';
      console.warn('Student status email warning (status change preserved):', emailNotificationError);
    }
  }

  // Step 2: Build new StatusHistoryEntry
  const newHistoryEntry: StatusHistoryEntry = {
    previousStatus,
    newStatus,
    message: staffMessage?.trim() || undefined,
    changedBy: staffUser.name || 'Admissions Staff',
    changedByEmail: staffUser.email || undefined,
    changedAt: nowIso,
    emailNotificationRequested: sendEmailToStudent,
    emailNotificationStatus,
    emailNotificationError,
  };

  const existingHistory = student.statusHistory || [];
  const updatedStatusHistory = [newHistoryEntry, ...existingHistory];

  // Step 3: Append activity timeline item
  const activityDescription = staffMessage?.trim()
    ? `Status changed from "${previousStatus}" to "${newStatus}". Staff remark: "${staffMessage.trim()}". Student email: ${emailNotificationStatus}.`
    : `Status changed from "${previousStatus}" to "${newStatus}". Student email: ${emailNotificationStatus}.`;

  const newActivityItem: ActivityItem = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: nowIso,
    displayDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    title: `Status changed to ${newStatus}`,
    description: activityDescription,
    author: staffUser.name || 'Admissions Staff',
    type: 'status_change',
  };

  const updatedActivities = [newActivityItem, ...(student.activityHistory || [])];

  const updates: Partial<StudentRecord> = {
    status: newStatus,
    statusHistory: updatedStatusHistory,
    studentNotificationStatus: emailNotificationStatus,
    activityHistory: updatedActivities,
    updatedAt: nowIso,
  };

  if (staffMessage?.trim()) {
    updates.internalRemarks = staffMessage.trim();
  }

  // Step 4: Persist update to Firestore
  try {
    const studentRef = doc(db, COLLECTION_NAME, student.id);
    await updateDoc(
      studentRef,
      cleanForFirestore({
        ...updates,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (dbErr) {
    console.error('Error updating status in Firestore:', dbErr);
    handleFirestoreError(dbErr, OperationType.UPDATE, `${COLLECTION_NAME}/${student.id}`);
  }

  const updatedStudent: StudentRecord = {
    ...student,
    ...updates,
  };

  let resultMsg = `Status successfully updated to ${newStatus}.`;
  if (sendEmailToStudent) {
    if (emailSent) {
      resultMsg += ` Status update email sent to ${student.email}.`;
    } else if (emailNotificationStatus === 'sandbox_restricted') {
      resultMsg += ` (Student email paused: Resend sandbox mode active until pathfinders.com.np verification).`;
    } else {
      resultMsg += ` (Note: Email notification failed: ${emailNotificationError || 'delivery issue'})`;
    }
  }

  return {
    success: true,
    emailSent,
    message: resultMsg,
    updatedStudent,
  };
}

/**
 * Mark a student enquiry as read/unread for in-dashboard notifications
 * Persisted in Firestore so page refresh does not lose state.
 */
export async function markEnquiryAsRead(studentId: string, isRead = true): Promise<void> {
  try {
    const studentRef = doc(db, COLLECTION_NAME, studentId);
    await updateDoc(
      studentRef,
      cleanForFirestore({
        unread: !isRead,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    console.warn('Error marking enquiry as read in Firestore:', err);
  }
}

/**
 * Mark all specified enquiry IDs as read
 */
export async function markAllEnquiriesAsRead(studentIds: string[]): Promise<void> {
  const promises = studentIds.map((id) => markEnquiryAsRead(id, true));
  await Promise.allSettled(promises);
}

/**
 * Silently synchronizes loaded students to server registry for student self-service status checks
 */
export async function syncStudentsWithRegistry(students: StudentRecord[]): Promise<void> {
  if (!students || students.length === 0) return;
  try {
    await fetch('/api/student/sync-registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
  } catch {
    // Non-blocking background sync
  }
}
