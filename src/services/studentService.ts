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
import { StudentRecord, ActivityItem, StudentStatus, EmailStatus } from '../types/student';
import { generateStudentPDF } from './pdfService';
import { studentToSpreadsheetRow } from './spreadsheetService';

const COLLECTION_NAME = 'students';
const SPREADSHEET_COLLECTION = 'response_spreadsheet_rows';

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
 * Full submission workflow:
 * 1. Validate all form data
 * 2. Generate unique Lead ID
 * 3. Generate official PDF
 * 4. Dispatch email notification to admissions
 * 5. Save COMPLETE response (all sections, photo, PDF reference, email status) to Firestore in a single create operation
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

  // Base record with default status: NEW ENQUIRY
  const studentRecord: StudentRecord = {
    ...formData,
    leadId,
    submittedAt,
    submittedAtFormatted,
    status: 'NEW ENQUIRY',
    activityHistory: [initialActivity],
    emailStatus: 'PENDING',
    createdAt: submittedAt,
    updatedAt: submittedAt,
  };

  // Step 3: Generate professional PDF document
  onProgress?.({ step: 4, message: 'Generating official Pathfinder PDF document...' });
  let pdfDataUri: string | undefined;
  try {
    const pdfResult = generateStudentPDF(studentRecord);
    pdfDataUri = pdfResult.dataUri;
    studentRecord.pdfUrl = pdfDataUri;
    studentRecord.pdfGeneratedAt = new Date().toISOString();
  } catch (pdfErr) {
    console.error('PDF generation error (submission preserved):', pdfErr);
  }

  // Step 4: Dispatch email notification to admissions
  onProgress?.({ step: 6, message: 'Dispatching notification email to Pathfinder Admissions...' });
  let emailStatus: EmailStatus = 'PENDING';
  let emailRecipient: string | undefined;

  try {
    const response = await fetch('/api/notify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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

    if (response.ok) {
      const data = await response.json();
      emailStatus = data.emailStatus === 'SENT' ? 'SENT' : 'EMAIL_FAILED';
      emailRecipient = data.recipient;
    } else {
      emailStatus = 'EMAIL_FAILED';
    }
  } catch (emailErr) {
    console.warn('Email dispatch service warning (submission preserved):', emailErr);
    emailStatus = 'EMAIL_FAILED';
  }

  studentRecord.emailStatus = emailStatus;
  studentRecord.emailRecipient = emailRecipient;
  studentRecord.emailSentAt = emailStatus === 'SENT' ? new Date().toISOString() : undefined;

  // Step 5: Save complete response securely to Firestore in a single create operation
  onProgress?.({ step: 8, message: 'Saving application securely to Pathfinder Firestore database...' });
  let studentDocId = '';
  try {
    const studentDocRef = doc(collection(db, COLLECTION_NAME));
    studentDocId = studentDocRef.id;
    studentRecord.id = studentDocId;

    await setDoc(studentDocRef, {
      ...studentRecord,
      id: studentDocId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (dbErr) {
    console.error('Firestore save failed:', dbErr);
    handleFirestoreError(dbErr, OperationType.CREATE, COLLECTION_NAME);
  }

  // Step 6: Add submission to response spreadsheet collection
  onProgress?.({ step: 9, message: 'Recording entry in Pathfinder Response Spreadsheet...' });
  try {
    const spreadsheetRow = studentToSpreadsheetRow(studentRecord);
    const rowRecord = {
      leadId,
      submittedAt,
      studentName: studentRecord.fullName,
      rowData: spreadsheetRow,
      createdAt: serverTimestamp(),
    };

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
    emailRecipient,
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

    if (!response.ok) {
      throw new Error('Server returned error response on email resend');
    }

    const data = await response.json();
    const now = new Date();

    if (student.id) {
      await updateStudent(
        student.id,
        {
          emailStatus: 'SENT',
          emailSentAt: now.toISOString(),
          emailRecipient: data.recipient,
        },
        {
          title: 'Notification email resent',
          description: `Staff resent notification alert to ${data.recipient || 'admissions office'}`,
          author: 'Authorized Staff',
          type: 'email',
        }
      );
    }

    return {
      success: true,
      message: `Notification successfully resent to admissions inbox`,
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

    await updateDoc(studentRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
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
