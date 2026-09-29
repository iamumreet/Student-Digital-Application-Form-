export type EducationLevel = 'SEE' | '+2 / CTEVT / A-Level' | 'Bachelor' | 'Master';

/**
 * Standard Flexible Student Application Statuses:
 * - NEW ENQUIRY
 * - UNDER REVIEW
 * - DOCUMENTS REQUIRED
 * - APPLICATION IN PROGRESS
 * - OFFER RECEIVED
 * - VISA PROCESSING
 * - VISA GRANTED
 * - COMPLETED
 * - ON HOLD
 * - NOT ELIGIBLE
 */
export type StudentStatus =
  | 'NEW ENQUIRY'
  | 'UNDER REVIEW'
  | 'DOCUMENTS REQUIRED'
  | 'APPLICATION IN PROGRESS'
  | 'OFFER RECEIVED'
  | 'VISA PROCESSING'
  | 'VISA GRANTED'
  | 'COMPLETED'
  | 'ON HOLD'
  | 'NOT ELIGIBLE'
  // Backward compatibility with previous records:
  | 'New Enquiry'
  | 'Contacted'
  | 'Counselling Completed'
  | 'University Shortlisted'
  | 'Documents Pending'
  | 'Application Started'
  | 'Application Submitted'
  | 'Closed'
  | 'New'
  | 'Counselling Scheduled'
  | 'Counselled';

export const STANDARD_STUDENT_STATUSES: StudentStatus[] = [
  'NEW ENQUIRY',
  'UNDER REVIEW',
  'DOCUMENTS REQUIRED',
  'APPLICATION IN PROGRESS',
  'OFFER RECEIVED',
  'VISA PROCESSING',
  'VISA GRANTED',
  'COMPLETED',
  'ON HOLD',
  'NOT ELIGIBLE',
];

export const ALL_STUDENT_STATUSES: StudentStatus[] = [
  ...STANDARD_STUDENT_STATUSES,
  'New Enquiry',
  'Contacted',
  'Counselling Completed',
  'University Shortlisted',
  'Documents Pending',
  'Application Started',
  'Application Submitted',
  'Closed',
];

export type EmailStatus = 'SENT' | 'EMAIL_FAILED' | 'PENDING';

export interface AcademicLevelDetails {
  scoreOrGpa: string;
  institutionNameAddress: string;
  passedYear: string;
}

export interface AcademicDetails {
  see: AcademicLevelDetails;
  higherSecondary: AcademicLevelDetails; // CTEVT / +2 / A-Level
  bachelor: AcademicLevelDetails;
  master: AcademicLevelDetails;
}

export interface ActivityItem {
  id: string;
  date: string; // ISO string
  displayDate?: string;
  title: string;
  description: string;
  author: string;
  type: 'submission' | 'status_change' | 'assignment' | 'contact' | 'counselling' | 'followup' | 'note' | 'email' | 'pdf';
}

/**
 * Two-way notification status history entry for student records
 */
export interface StatusHistoryEntry {
  previousStatus: StudentStatus | string;
  newStatus: StudentStatus | string;
  message?: string;
  changedBy: string;
  changedByEmail?: string;
  changedAt: string; // ISO string
  emailNotificationRequested: boolean;
  emailNotificationStatus: 'sent' | 'failed' | 'not_requested' | 'pending' | 'sandbox_restricted';
  emailNotificationError?: string;
}

export interface StudentRecord {
  id?: string;
  leadId: string; // e.g. PF-2026-000001
  
  // Step 1: Personal Information
  fullName: string;
  guardianName: string;
  guardianContactNumber: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  maritalStatus: 'Single' | 'Married' | 'Other' | '';
  mobileNumber: string;
  email: string;
  address: string;
  photoUrl?: string; // base64 or secure data reference

  // Step 2: Academic Details
  academicDetails: AcademicDetails;

  // Step 3: Additional Information
  workExperience: string;
  hasEducationGap: 'Yes' | 'No' | '';
  educationGapDuration?: string;
  choiceOfProgram: string;
  interestedCountry: string;
  hasAppliedOtherCountries: 'Yes' | 'No' | '';
  previousCountriesApplied?: string;
  testsTaken: string[]; // e.g. ['IELTS', 'PTE', 'TOEFL', 'SAT', 'GRE', 'GMAT', 'None']
  testScore?: string;
  questionType: string;
  howDidYouKnow: string;

  // Metadata & Counselling
  submittedAt: string; // ISO
  submittedAtFormatted?: string;
  status: StudentStatus;
  assignedCounsellorId?: string;
  assignedCounsellorName?: string;
  followUpDate?: string;
  counsellingNotes?: string;
  internalRemarks?: string;
  intake?: string;
  activityHistory: ActivityItem[];

  // Two-way Notification & Production workflow fields
  unread?: boolean; // In-dashboard notification system: true when unread by staff
  notificationStatus?: 'sent' | 'failed' | 'pending';
  staffNotificationStatus?: 'sent' | 'failed' | 'pending';
  studentNotificationStatus?: 'sent' | 'failed' | 'not_requested' | 'pending' | 'sandbox_restricted';
  statusHistory?: StatusHistoryEntry[];
  notificationSentAt?: string;
  notificationRecipients?: string[];
  notificationError?: string;
  emailStatus?: EmailStatus;
  emailSentAt?: string;
  emailRecipient?: string;
  emailError?: string;
  pdfUrl?: string; // Generated PDF reference/data URI
  pdfGeneratedAt?: string;
  spreadsheetSynced?: boolean;
  spreadsheetSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Counsellor {
  id: string;
  name: string;
  email: string;
  role: 'Senior Counsellor' | 'Education Advisor' | 'Visa Officer' | 'Admin';
  avatar?: string;
  phone?: string;
  activeStudentsCount?: number;
}
