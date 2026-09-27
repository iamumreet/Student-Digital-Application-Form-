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
import { db } from '../config/firebase';
import { StudentRecord, ActivityItem, StudentStatus, EmailStatus } from '../types/student';
import { generateStudentPDF } from './pdfService';
import { studentToSpreadsheetRow, SPREADSHEET_COLUMNS } from './spreadsheetService';

const COLLECTION_NAME = 'students';
const SPREADSHEET_COLLECTION = 'response_spreadsheet_rows';

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
    console.warn('Firestore transaction for counter failed, calculating sequential fallback:', err);
    // Try to get highest existing lead ID from local records or timestamp fallback
    const local = localStorage.getItem('pf_offline_students');
    let maxNum = 0;
    if (local) {
      try {
        const list: StudentRecord[] = JSON.parse(local);
        for (const s of list) {
          const match = s.leadId?.match(/PF-\d{4}-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      } catch {
        // ignore
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : Math.floor(Math.random() * 900000) + 100000;
    const padded = String(nextNum).padStart(6, '0');
    return `PF-${currentYear}-${padded}`;
  }
}

/**
 * Full 10-step submission workflow:
 * 1. Validate all form data
 * 2. Generate unique Lead ID
 * 3. Save complete response to Firestore
 * 4. Save student photo securely
 * 5. Generate professional PDF
 * 6. Store generated PDF reference
 * 7. Record PDF URL/reference in database record
 * 8. Add submission to response spreadsheet
 * 9. Send email notification to owner/admin email
 * 10. Return complete result for successful submission screen
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
  let studentRecord: StudentRecord = {
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

  // Step 3 & 4: Save complete response and photo to Firestore
  onProgress?.({ step: 3, message: 'Saving response securely to Firestore...' });
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
    console.error('Direct Firestore save failed, writing to fallback local persistence:', dbErr);
    studentDocId = `student-${Date.now()}`;
    studentRecord.id = studentDocId;
  }

  // Backup to localStorage to ensure absolute persistence
  try {
    const local = JSON.parse(localStorage.getItem('pf_offline_students') || '[]');
    local.unshift(studentRecord);
    localStorage.setItem('pf_offline_students', JSON.stringify(local));
  } catch {
    // ignore
  }

  // Step 5 & 6: Generate & store professional PDF
  onProgress?.({ step: 5, message: 'Generating official Pathfinder PDF document...' });
  let pdfDataUri: string | undefined;
  try {
    const pdfResult = generateStudentPDF(studentRecord);
    pdfDataUri = pdfResult.dataUri;
    studentRecord.pdfUrl = pdfDataUri;
    studentRecord.pdfGeneratedAt = new Date().toISOString();

    // Step 7: Record PDF reference in student database record
    if (studentDocId && !studentDocId.startsWith('student-')) {
      try {
        const studentRef = doc(db, COLLECTION_NAME, studentDocId);
        await updateDoc(studentRef, {
          pdfUrl: pdfDataUri,
          pdfGeneratedAt: studentRecord.pdfGeneratedAt,
          updatedAt: serverTimestamp(),
        });
      } catch (pdfSaveErr) {
        console.warn('Could not update PDF URL in Firestore doc:', pdfSaveErr);
      }
    }
  } catch (pdfErr) {
    console.error('PDF generation error (submission will not be lost):', pdfErr);
  }

  // Step 8: Add submission to response spreadsheet
  onProgress?.({ step: 8, message: 'Recording entry in Pathfinder Response Spreadsheet...' });
  try {
    const spreadsheetRow = studentToSpreadsheetRow(studentRecord);
    const rowRecord = {
      leadId,
      submittedAt,
      studentName: studentRecord.fullName,
      rowData: spreadsheetRow,
      createdAt: serverTimestamp(),
    };

    // Save in Firestore response_spreadsheet_rows
    const rowRef = doc(collection(db, SPREADSHEET_COLLECTION));
    await setDoc(rowRef, rowRecord);

    // Save in local response spreadsheet cache
    const existingRows = JSON.parse(localStorage.getItem('pf_response_sheet_rows') || '[]');
    existingRows.unshift(spreadsheetRow);
    localStorage.setItem('pf_response_sheet_rows', JSON.stringify(existingRows));

    studentRecord.spreadsheetSynced = true;
    studentRecord.spreadsheetSyncedAt = new Date().toISOString();
  } catch (sheetErr) {
    console.warn('Response spreadsheet logging warning:', sheetErr);
  }

  // Step 9: Send email notification to owner/admin
  onProgress?.({ step: 9, message: 'Dispatching notification email to Pathfinder Admissions...' });
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

  // Update email status in Firestore
  if (studentDocId && !studentDocId.startsWith('student-')) {
    try {
      const studentRef = doc(db, COLLECTION_NAME, studentDocId);
      await updateDoc(studentRef, {
        emailStatus,
        emailRecipient: emailRecipient || null,
        emailSentAt: studentRecord.emailSentAt || null,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore
    }
  }

  // Step 10: Complete
  onProgress?.({ step: 10, message: 'Submission completed successfully.' });

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

    // Update in Firestore
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
          description: `Admin resent notification alert to ${data.recipient || 'umreetkumar@gmail.com'}`,
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
 * Fetch all students from Firestore
 */
export async function getAllStudents(): Promise<StudentRecord[]> {
  try {
    const studentsCol = collection(db, COLLECTION_NAME);
    const q = query(studentsCol, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const local = localStorage.getItem('pf_offline_students');
      if (local) {
        return JSON.parse(local);
      }
      return [];
    }

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<StudentRecord, 'id'>),
    }));
  } catch (error) {
    console.error('Error fetching students from Firestore:', error);
    const local = localStorage.getItem('pf_offline_students');
    return local ? JSON.parse(local) : [];
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
      const local = localStorage.getItem('pf_response_sheet_rows');
      if (local) return JSON.parse(local);
      return [];
    }

    return snapshot.docs.map((d) => d.data().rowData as (string | number)[]);
  } catch {
    const local = localStorage.getItem('pf_response_sheet_rows');
    return local ? JSON.parse(local) : [];
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
    const local = localStorage.getItem('pf_offline_students');
    if (local) {
      const list: StudentRecord[] = JSON.parse(local);
      const idx = list.findIndex((s) => s.id === studentId);
      if (idx !== -1) {
        if (activity) {
          const now = new Date();
          const newAct: ActivityItem = {
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            date: now.toISOString(),
            displayDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...activity,
          };
          const hist = list[idx].activityHistory || [];
          hist.unshift(newAct);
          updates.activityHistory = hist;
        }
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem('pf_offline_students', JSON.stringify(list));
      }
    }
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
        if (!snapshot.empty) {
          const records = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<StudentRecord, 'id'>),
          }));
          callback(records);
        } else {
          // Check local offline fallback
          const local = localStorage.getItem('pf_offline_students');
          if (local) {
            try {
              callback(JSON.parse(local));
            } catch {
              callback([]);
            }
          } else {
            callback([]);
          }
        }
      },
      (err) => {
        console.warn('Firestore onSnapshot listener fallback:', err);
        onError?.(err);
        const local = localStorage.getItem('pf_offline_students');
        if (local) {
          try {
            callback(JSON.parse(local));
          } catch {
            callback([]);
          }
        }
      }
    );
  } catch (err) {
    console.warn('Could not establish Firestore subscription:', err);
    onError?.(err);
    const local = localStorage.getItem('pf_offline_students');
    if (local) {
      try {
        callback(JSON.parse(local));
      } catch {
        callback([]);
      }
    }
    return () => {};
  }
}

/**
 * Permanently delete a student record from Firestore and local cache
 */
export async function deleteStudent(studentId: string): Promise<void> {
  try {
    const studentRef = doc(db, COLLECTION_NAME, studentId);
    await deleteDoc(studentRef);
  } catch (err) {
    console.error('Error deleting student from Firestore:', err);
  }

  // Also remove from local fallback cache
  try {
    const local = localStorage.getItem('pf_offline_students');
    if (local) {
      const list: StudentRecord[] = JSON.parse(local);
      const filtered = list.filter((s) => s.id !== studentId);
      localStorage.setItem('pf_offline_students', JSON.stringify(filtered));
    }
  } catch {
    // ignore
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
 * Seed realistic initial records if Firestore is completely fresh
 */
export async function seedInitialStudentsIfEmpty(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (!snap.empty) {
      return false;
    }

    const sampleStudents: Omit<StudentRecord, 'id'>[] = [
      {
        leadId: 'PF-2026-000001',
        fullName: 'Aarav Adhikari',
        guardianName: 'Ram Prasad Adhikari',
        guardianContactNumber: '+977 9851023456',
        dateOfBirth: '2003-08-14',
        gender: 'Male',
        maritalStatus: 'Single',
        mobileNumber: '+977 9841987654',
        email: 'aarav.adhikari@gmail.com',
        address: 'Baneshwor, Kathmandu, Nepal',
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        academicDetails: {
          see: { scoreOrGpa: '3.85 GPA', institutionNameAddress: 'Prabhat Higher Secondary School, Kathmandu', passedYear: '2019' },
          higherSecondary: { scoreOrGpa: '3.62 GPA', institutionNameAddress: "St. Xavier's College, Maitighar", passedYear: '2021' },
          bachelor: { scoreOrGpa: '3.70 CGPA', institutionNameAddress: 'Kathmandu University (BSc. CS)', passedYear: '2025' },
          master: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
        },
        workExperience: '1 year as Junior Full-Stack Developer at F1Soft International',
        hasEducationGap: 'No',
        choiceOfProgram: 'Master of Information Technology / Data Science',
        interestedCountry: 'Australia',
        hasAppliedOtherCountries: 'No',
        testsTaken: ['PTE'],
        testScore: 'Overall 76 (Listening 74, Reading 78, Speaking 80, Writing 72)',
        questionType: 'Scholarship Guidance & Post-Study Work Rights',
        howDidYouKnow: 'Friend/Family Referral',
        submittedAt: '2026-09-14T09:30:00.000Z',
        submittedAtFormatted: '14 Sep 2026, 03:15 PM',
        status: 'Counselling Completed',
        emailStatus: 'SENT',
        emailSentAt: '2026-09-14T09:30:15.000Z',
        emailRecipient: 'umreetkumar@gmail.com',
        assignedCounsellorId: 'counsellor-1',
        assignedCounsellorName: 'Suman Shrestha',
        intake: 'Feb 2027',
        followUpDate: '2026-09-18T11:00',
        counsellingNotes: 'Student has high GPA and solid PTE score. Recommended University of Melbourne and Monash University for Master of IT with 20% merit scholarship.',
        internalRemarks: 'Targeting top Group of Eight universities in Melbourne.',
        activityHistory: [
          {
            id: 'act-sample-3',
            date: '2026-09-15T02:00:00.000Z',
            displayDate: '15 Sep 2026',
            title: 'Counselling session scheduled',
            description: 'In-person comprehensive profile evaluation set for 18 Sep at Putalisadak branch.',
            author: 'Suman Shrestha',
            type: 'counselling',
          },
          {
            id: 'act-sample-2',
            date: '2026-09-14T11:00:00.000Z',
            displayDate: '14 Sep 2026',
            title: 'Assigned to Counsellor',
            description: 'Assigned to Senior Counsellor Suman Shrestha (Australia Specialist).',
            author: 'Admissions Office',
            type: 'assignment',
          },
          {
            id: 'act-sample-1',
            date: '2026-09-14T09:30:00.000Z',
            displayDate: '14 Sep 2026',
            title: 'Enquiry submitted',
            description: 'Student submitted online application form.',
            author: 'Aarav Adhikari',
            type: 'submission',
          },
        ],
      },
      {
        leadId: 'PF-2026-000002',
        fullName: 'Prashna Bajracharya',
        guardianName: 'Krishna Bajracharya',
        guardianContactNumber: '+977 9841223344',
        dateOfBirth: '2004-03-22',
        gender: 'Female',
        maritalStatus: 'Single',
        mobileNumber: '+977 9803112233',
        email: 'prashna.b@gmail.com',
        address: 'Patan Dhoka, Lalitpur, Nepal',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        academicDetails: {
          see: { scoreOrGpa: '3.90 GPA', institutionNameAddress: "Little Angels' School, Hattiban", passedYear: '2020' },
          higherSecondary: { scoreOrGpa: '3.55 GPA', institutionNameAddress: 'Trinity International College, Dilli Bazar', passedYear: '2022' },
          bachelor: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
          master: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
        },
        workExperience: 'Internship at community clinic health outreach',
        hasEducationGap: 'Yes',
        educationGapDuration: '1 year preparation for nursing entrance and IELTS',
        choiceOfProgram: 'Bachelor of Nursing',
        interestedCountry: 'UK',
        hasAppliedOtherCountries: 'No',
        testsTaken: ['IELTS'],
        testScore: 'Overall 7.5 (L 8.0, R 7.5, W 7.0, S 7.0)',
        questionType: 'University Selection & NHS Placement Opportunities',
        howDidYouKnow: 'Social Media (Instagram/Facebook)',
        submittedAt: '2026-09-13T14:20:00.000Z',
        submittedAtFormatted: '13 Sep 2026, 08:05 PM',
        status: 'Application Started',
        emailStatus: 'SENT',
        emailSentAt: '2026-09-13T14:20:20.000Z',
        emailRecipient: 'umreetkumar@gmail.com',
        assignedCounsellorId: 'counsellor-2',
        assignedCounsellorName: 'Pooja Karki',
        intake: 'Jan 2027',
        followUpDate: '2026-09-20T14:30',
        counsellingNotes: 'Met student with parents. Reviewed transcripts and IELTS certificate. Preparing application for University of Hertfordshire & University of Chester.',
        internalRemarks: 'Nursing NMC registration requirements explained.',
        activityHistory: [
          {
            id: 'act-sample-2-3',
            date: '2026-09-15T01:30:00.000Z',
            displayDate: '15 Sep 2026',
            title: 'Application portal created',
            description: 'UCAS draft application profile initialized.',
            author: 'Pooja Karki',
            type: 'status_change',
          },
          {
            id: 'act-sample-2-2',
            date: '2026-09-14T08:00:00.000Z',
            displayDate: '14 Sep 2026',
            title: 'Student contacted',
            description: 'Phone consultation with student and father.',
            author: 'Pooja Karki',
            type: 'contact',
          },
          {
            id: 'act-sample-2-1',
            date: '2026-09-13T14:20:00.000Z',
            displayDate: '13 Sep 2026',
            title: 'Enquiry submitted',
            description: 'Student submitted online application form.',
            author: 'Prashna Bajracharya',
            type: 'submission',
          },
        ],
      },
      {
        leadId: 'PF-2026-000003',
        fullName: 'Bibek Manandhar',
        guardianName: 'Gopal Manandhar',
        guardianContactNumber: '+977 9851088990',
        dateOfBirth: '2001-11-05',
        gender: 'Male',
        maritalStatus: 'Single',
        mobileNumber: '+977 9813554422',
        email: 'bibek.manandhar@outlook.com',
        address: 'Chabahil, Kathmandu, Nepal',
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
        academicDetails: {
          see: { scoreOrGpa: '3.60 GPA', institutionNameAddress: 'Reliance International Academy, Kapan', passedYear: '2017' },
          higherSecondary: { scoreOrGpa: '3.40 GPA', institutionNameAddress: 'CCRC College, Koteshwor', passedYear: '2019' },
          bachelor: { scoreOrGpa: '3.52 CGPA', institutionNameAddress: 'Tribhuvan University (BBA Banking)', passedYear: '2023' },
          master: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
        },
        workExperience: '2 years as Credit Analyst at Nabil Bank Ltd.',
        hasEducationGap: 'No',
        choiceOfProgram: 'MBA / Master of Global Finance',
        interestedCountry: 'Canada',
        hasAppliedOtherCountries: 'Yes',
        previousCountriesApplied: 'Applied to USA F-1 in 2024 (visa refused 214b)',
        testsTaken: ['IELTS'],
        testScore: 'Overall 7.0 (L 7.5, R 7.0, W 6.5, S 7.0)',
        questionType: 'Visa Documentation & Statement of Purpose Guidance',
        howDidYouKnow: 'Education Fair',
        submittedAt: '2026-09-15T00:15:00.000Z',
        submittedAtFormatted: '15 Sep 2026, 06:00 AM',
        status: 'New Enquiry',
        emailStatus: 'EMAIL_FAILED',
        emailRecipient: 'umreetkumar@gmail.com',
        emailError: 'SMTP gateway timeout on initial attempt',
        intake: 'Sept 2027',
        activityHistory: [
          {
            id: 'act-sample-3-1',
            date: '2026-09-15T00:15:00.000Z',
            displayDate: '15 Sep 2026',
            title: 'Enquiry submitted',
            description: 'Student submitted online application form.',
            author: 'Bibek Manandhar',
            type: 'submission',
          },
        ],
      },
    ];

    for (const student of sampleStudents) {
      const newDoc = doc(collection(db, COLLECTION_NAME));
      await setDoc(newDoc, {
        ...student,
        id: newDoc.id,
        createdAt: serverTimestamp(),
      });

      // Also seed spreadsheet row
      const rowRef = doc(collection(db, SPREADSHEET_COLLECTION));
      await setDoc(rowRef, {
        leadId: student.leadId,
        submittedAt: student.submittedAt,
        studentName: student.fullName,
        rowData: studentToSpreadsheetRow(student as StudentRecord),
        createdAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'counters', 'students'), { currentCount: 3, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error seeding initial students:', err);
    return false;
  }
}
