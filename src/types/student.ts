export type EducationLevel = 'SEE' | '+2 / CTEVT / A-Level' | 'Bachelor' | 'Master';

export type StudentStatus =
  | 'New Enquiry'
  | 'Contacted'
  | 'Counselling Completed'
  | 'University Shortlisted'
  | 'Documents Pending'
  | 'Application Started'
  | 'Application Submitted'
  | 'Visa Processing'
  | 'Visa Granted'
  | 'Closed'
  // Backward compatibility:
  | 'NEW ENQUIRY'
  | 'New'
  | 'Counselling Scheduled'
  | 'Counselled';

export const ALL_STUDENT_STATUSES: StudentStatus[] = [
  'New Enquiry',
  'Contacted',
  'Counselling Completed',
  'University Shortlisted',
  'Documents Pending',
  'Application Started',
  'Application Submitted',
  'Visa Processing',
  'Visa Granted',
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

  // Production workflow fields
  pdfUrl?: string; // Generated PDF reference/data URI
  pdfGeneratedAt?: string;
  emailStatus?: EmailStatus;
  emailSentAt?: string;
  emailRecipient?: string;
  emailError?: string;
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
