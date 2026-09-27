import * as XLSX from 'xlsx';
import { StudentRecord } from '../types/student';

export const SPREADSHEET_COLUMNS = [
  'No.',
  'Timestamp',
  'Lead ID',
  'Name',
  "Guardian's Name",
  "Guardian's Contact Number",
  'Date of Birth',
  'Gender',
  'Marital Status',
  'Mobile Number',
  'Email',
  'Address',
  'Profile Photo',
  'SEE Score/GPA',
  'SEE Institution',
  'SEE Passed Year',
  'CTEVT/+2/A-Level Score/GPA',
  'CTEVT/+2/A-Level Institution',
  'CTEVT/+2/A-Level Passed Year',
  'Bachelor Score/CGPA',
  'Bachelor Institution',
  'Bachelor Passed Year',
  'Master Score/CGPA',
  'Master Institution',
  'Master Passed Year',
  'Work Experience',
  'Education Gap',
  'Gap Duration',
  'Choice of Program',
  'Interested Country',
  'Previous Country Application',
  'Applied Country',
  'Tests Taken',
  'Test Score',
  'Question Type',
  'How They Know About Pathfinder',
  'Status',
  'Follow-up Date',
  'PDF',
  'Notes',
];

/**
 * Maps a StudentRecord to the exact spreadsheet row schema.
 */
export const studentToSpreadsheetRow = (student: StudentRecord, index: number = 1): (string | number)[] => {
  const photoRef = student.photoUrl
    ? student.photoUrl.startsWith('data:')
      ? `[Photo Attached]`
      : student.photoUrl
    : 'No photo';

  const pdfRef = student.pdfUrl
    ? `Available (${student.leadId}.pdf)`
    : 'PDF Document';

  // Latest note extraction
  const latestNote = student.counsellingNotes || 
    (student.activityHistory?.find((a) => a.type === 'note')?.description) || 
    '';

  return [
    index,
    student.submittedAtFormatted || student.submittedAt || new Date().toISOString(),
    student.leadId,
    student.fullName,
    student.guardianName || '',
    student.guardianContactNumber || '',
    student.dateOfBirth || '',
    student.gender || '',
    student.maritalStatus || '',
    student.mobileNumber || '',
    student.email || '',
    student.address || '',
    photoRef,
    student.academicDetails?.see?.scoreOrGpa || '',
    student.academicDetails?.see?.institutionNameAddress || '',
    student.academicDetails?.see?.passedYear || '',
    student.academicDetails?.higherSecondary?.scoreOrGpa || '',
    student.academicDetails?.higherSecondary?.institutionNameAddress || '',
    student.academicDetails?.higherSecondary?.passedYear || '',
    student.academicDetails?.bachelor?.scoreOrGpa || '',
    student.academicDetails?.bachelor?.institutionNameAddress || '',
    student.academicDetails?.bachelor?.passedYear || '',
    student.academicDetails?.master?.scoreOrGpa || '',
    student.academicDetails?.master?.institutionNameAddress || '',
    student.academicDetails?.master?.passedYear || '',
    student.workExperience || '',
    student.hasEducationGap || 'No',
    student.educationGapDuration || '',
    student.choiceOfProgram || '',
    student.interestedCountry || '',
    student.hasAppliedOtherCountries || 'No',
    student.previousCountriesApplied || '',
    (student.testsTaken || []).join(', '),
    student.testScore || '',
    student.questionType || '',
    student.howDidYouKnow || '',
    student.status || 'New Enquiry',
    student.followUpDate || '',
    pdfRef,
    latestNote,
  ];
};

/**
 * Generates an actual, binary .xlsx Excel workbook from student records.
 */
export const generateExcelWorkbook = (
  students: StudentRecord[],
  sheetName = 'Student Responses'
): XLSX.WorkBook => {
  const rows = [SPREADSHEET_COLUMNS, ...students.map((s, idx) => studentToSpreadsheetRow(s, idx + 1))];

  // Create worksheet from 2D array
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set explicit column widths for readability
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 20 }, // Timestamp
    { wch: 16 }, // Lead ID
    { wch: 24 }, // Name
    { wch: 20 }, // Guardian Name
    { wch: 16 }, // Guardian Contact
    { wch: 12 }, // DOB
    { wch: 10 }, // Gender
    { wch: 12 }, // Marital
    { wch: 16 }, // Mobile
    { wch: 26 }, // Email
    { wch: 30 }, // Address
    { wch: 16 }, // Photo
    { wch: 14 }, // SEE Score
    { wch: 28 }, // SEE Institution
    { wch: 12 }, // SEE Year
    { wch: 16 }, // +2 Score
    { wch: 28 }, // +2 Institution
    { wch: 12 }, // +2 Year
    { wch: 16 }, // Bachelor Score
    { wch: 28 }, // Bachelor Institution
    { wch: 12 }, // Bachelor Year
    { wch: 16 }, // Master Score
    { wch: 28 }, // Master Institution
    { wch: 12 }, // Master Year
    { wch: 30 }, // Work Exp
    { wch: 14 }, // Gap
    { wch: 20 }, // Gap Dur
    { wch: 24 }, // Program
    { wch: 20 }, // Country
    { wch: 16 }, // Prev App
    { wch: 20 }, // Applied Country
    { wch: 20 }, // Tests
    { wch: 16 }, // Score
    { wch: 24 }, // Question Type
    { wch: 20 }, // Source
    { wch: 18 }, // Status
    { wch: 16 }, // Follow-up
    { wch: 24 }, // PDF
    { wch: 35 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
};

/**
 * Downloads a real .xlsx file to the user's browser.
 */
export const downloadExcelExport = (
  students: StudentRecord[],
  customSuffix = ''
) => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = customSuffix ? `_${customSuffix}` : '';
  const filename = `Pathfinder_Student_Responses_${dateStr}${suffix}.xlsx`;

  const workbook = generateExcelWorkbook(students);
  XLSX.writeFile(workbook, filename);
};

/**
 * Flexible export function used across dashboard, modals, and response sheet.
 */
export const exportStudentsToExcel = (
  students: StudentRecord[],
  filename = 'Pathfinder_Student_Responses'
) => {
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const workbook = generateExcelWorkbook(students);
  XLSX.writeFile(workbook, finalFilename);
};
