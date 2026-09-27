import { jsPDF } from 'jspdf';
import { StudentRecord } from '../types/student';
import { PATHFINDER_LOGO_BASE64 } from '../assets/logo';

export interface PDFGenerationResult {
  dataUri: string;
  blob: Blob;
  filename: string;
}

/**
 * Generates a branded, professional PDF document for a student enquiry.
 */
export const generateStudentPDF = (student: StudentRecord): PDFGenerationResult => {
  // Create jsPDF instance (A4 format, portrait, mm units)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // Colors
  const blueColor: [number, number, number] = [0, 102, 166]; // #0066A6
  const orangeColor: [number, number, number] = [245, 130, 31]; // #F5821F
  const darkSlate: [number, number, number] = [30, 41, 59]; // #1E293B
  const lightGray: [number, number, number] = [241, 245, 249]; // #F1F5F9
  const textGray: [number, number, number] = [100, 116, 139]; // #64748B
  const borderGray: [number, number, number] = [226, 232, 240]; // #E2E8F0

  // 1. TOP HEADER BRANDING
  // Draw subtle top accent ribbon
  doc.setFillColor(...blueColor);
  doc.rect(0, 0, pageWidth, 4, 'F');
  doc.setFillColor(...orangeColor);
  doc.rect(pageWidth - 60, 0, 60, 4, 'F');

  // Embed Official Pathfinder Logo (width 48mm, height ~12.2mm based on 200x51 ratio)
  try {
    doc.addImage(PATHFINDER_LOGO_BASE64, 'PNG', margin, y, 48, 12.2);
  } catch (e) {
    console.warn('Could not render logo in PDF, continuing with styled text header', e);
  }

  // Header Titles (Right-aligned next to logo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...blueColor);
  doc.text('PATHFINDER INTERNATIONAL EDUCATION', pageWidth - margin, y + 3.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...darkSlate);
  doc.text('STUDENT COUNSELLING & ENQUIRY FORM', pageWidth - margin, y + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textGray);
  doc.text('Putalisadak, Kathmandu | Tel: 01-5361805, 01-5361853', pageWidth - margin, y + 12, { align: 'right' });

  y += 16;

  // Horizontal divider
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // 2. SECTION 1: STUDENT REFERENCE BAR
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'S');

  // Lead ID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...textGray);
  doc.text('LEAD REFERENCE ID', margin + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...blueColor);
  doc.text(student.leadId || 'PF-2026-000000', margin + 4, y + 10.5);

  // Submission Date & Time
  const subDate = student.submittedAt
    ? new Date(student.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB');
  const subTime = student.submittedAt
    ? new Date(student.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('en-US');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...textGray);
  doc.text('SUBMISSION DATE', margin + 65, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkSlate);
  doc.text(subDate, margin + 65, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...textGray);
  doc.text('SUBMISSION TIME', margin + 115, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkSlate);
  doc.text(subTime, margin + 115, y + 10);

  // Status Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...textGray);
  doc.text('STATUS', margin + 155, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...orangeColor);
  doc.text(student.status || 'NEW ENQUIRY', margin + 155, y + 10);

  y += 18;

  // Helper for Section Titles
  const renderSectionHeader = (title: string) => {
    doc.setFillColor(...blueColor);
    doc.rect(margin, y, 3, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkSlate);
    doc.text(title.toUpperCase(), margin + 5, y + 4.5);
    y += 7.5;
  };

  // Helper for Field Rows
  const renderFieldRow = (
    label1: string,
    val1: string,
    label2: string,
    val2: string,
    label3?: string,
    val3?: string
  ) => {
    const colWidth = label3 ? contentWidth / 3 : contentWidth / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...textGray);
    doc.text(label1, margin + 2, y + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);
    doc.text(val1 || '—', margin + 2, y + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...textGray);
    doc.text(label2, margin + colWidth + 2, y + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);
    doc.text(val2 || '—', margin + colWidth + 2, y + 7.5);

    if (label3 && val3 !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...textGray);
      doc.text(label3, margin + colWidth * 2 + 2, y + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...darkSlate);
      doc.text(val3 || '—', margin + colWidth * 2 + 2, y + 7.5);
    }

    y += 10;
  };

  // 3. SECTION 2: PERSONAL INFORMATION
  renderSectionHeader('Personal Information');

  // Draw card container for Personal Information
  const personalBoxHeight = 44;
  doc.setDrawColor(...borderGray);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, personalBoxHeight, 2, 2, 'S');

  // If student photo is present, embed on right
  const photoSize = 26;
  const hasPhoto = !!student.photoUrl && student.photoUrl.startsWith('data:image');
  const textColsWidth = hasPhoto ? contentWidth - photoSize - 6 : contentWidth;

  const startPersonalY = y;
  y += 2;

  renderFieldRow("Student Full Name", student.fullName, "Email Address", student.email);
  renderFieldRow("Mobile Number", student.mobileNumber, "Guardian's Name", student.guardianName);
  renderFieldRow("Guardian's Contact", student.guardianContactNumber, "Date of Birth", student.dateOfBirth);
  renderFieldRow("Gender / Marital Status", `${student.gender || '—'} / ${student.maritalStatus || '—'}`, "Permanent / Current Address", student.address);

  if (hasPhoto && student.photoUrl) {
    try {
      doc.addImage(student.photoUrl, 'JPEG', margin + contentWidth - photoSize - 3, startPersonalY + 3, photoSize, photoSize);
      doc.setDrawColor(...borderGray);
      doc.rect(margin + contentWidth - photoSize - 3, startPersonalY + 3, photoSize, photoSize, 'S');
    } catch {
      // Photo rendering fallback
    }
  }

  y = startPersonalY + personalBoxHeight + 5;

  // 4. SECTION 3: ACADEMIC DETAILS
  renderSectionHeader('Academic Qualifications');

  // Academic Table Header
  const tableY = y;
  doc.setFillColor(...lightGray);
  doc.rect(margin, tableY, contentWidth, 6, 'F');
  doc.setDrawColor(...borderGray);
  doc.rect(margin, tableY, contentWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkSlate);
  doc.text('LEVEL', margin + 3, tableY + 4.2);
  doc.text('SCORE / GPA / CGPA', margin + 45, tableY + 4.2);
  doc.text('INSTITUTION NAME & ADDRESS', margin + 90, tableY + 4.2);
  doc.text('PASSED YEAR', margin + 155, tableY + 4.2);

  y += 6;

  const academicRows = [
    {
      level: 'SEE (Class 10)',
      score: student.academicDetails?.see?.scoreOrGpa || '—',
      institution: student.academicDetails?.see?.institutionNameAddress || '—',
      year: student.academicDetails?.see?.passedYear || '—',
    },
    {
      level: 'CTEVT / +2 / A-Level',
      score: student.academicDetails?.higherSecondary?.scoreOrGpa || '—',
      institution: student.academicDetails?.higherSecondary?.institutionNameAddress || '—',
      year: student.academicDetails?.higherSecondary?.passedYear || '—',
    },
    {
      level: 'Bachelor Degree',
      score: student.academicDetails?.bachelor?.scoreOrGpa || '—',
      institution: student.academicDetails?.bachelor?.institutionNameAddress || '—',
      year: student.academicDetails?.bachelor?.passedYear || '—',
    },
    {
      level: 'Master Degree',
      score: student.academicDetails?.master?.scoreOrGpa || '—',
      institution: student.academicDetails?.master?.institutionNameAddress || '—',
      year: student.academicDetails?.master?.passedYear || '—',
    },
  ];

  academicRows.forEach((row, idx) => {
    const rowY = y;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 6.5, 'F');
    }
    doc.setDrawColor(...borderGray);
    doc.rect(margin, rowY, contentWidth, 6.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkSlate);
    doc.text(row.level, margin + 3, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(row.score, margin + 45, rowY + 4.5);
    doc.text(doc.splitTextToSize(row.institution, 60)[0] || '—', margin + 90, rowY + 4.5);
    doc.text(row.year, margin + 155, rowY + 4.5);

    y += 6.5;
  });

  y += 5;

  // 5. SECTION 4: ADDITIONAL INFORMATION & STUDY PREFERENCES
  renderSectionHeader('Additional Information & Study Preferences');

  const addlBoxHeight = 44;
  doc.setDrawColor(...borderGray);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, addlBoxHeight, 2, 2, 'S');

  const startAddlY = y;
  y += 2;

  renderFieldRow("Choice of Program", student.choiceOfProgram, "Interested Country", student.interestedCountry);
  renderFieldRow(
    "Education Gap",
    student.hasEducationGap === 'Yes' ? `Yes (${student.educationGapDuration || 'Duration not specified'})` : 'No',
    "Work Experience",
    student.workExperience || 'None'
  );
  renderFieldRow(
    "Previous Applications",
    student.hasAppliedOtherCountries === 'Yes' ? `Yes (${student.previousCountriesApplied || 'Details not provided'})` : 'No',
    "Standardized / English Tests",
    student.testsTaken?.length ? student.testsTaken.join(', ') : 'None / Not Taken'
  );
  renderFieldRow(
    "Test Score Breakdown",
    student.testScore || 'Not Applicable',
    "Primary Query / Guidance Type",
    student.questionType || 'General Guidance',
    "Marketing Source",
    student.howDidYouKnow || 'Direct Enquiry'
  );

  y = startAddlY + addlBoxHeight + 5;

  // 6. SECTION 5: COUNSELLING STATUS & INTERNAL STAFF RECORD
  renderSectionHeader('Counselling Status & Record');

  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textGray);
  doc.text('CURRENT STATUS', margin + 4, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...blueColor);
  doc.text(student.status || 'NEW ENQUIRY', margin + 4, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textGray);
  doc.text('ASSIGNED COUNSELLOR', margin + 50, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text(student.assignedCounsellorName || '(Pending Assignment)', margin + 50, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textGray);
  doc.text('FOLLOW-UP DATE', margin + 115, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text(
    student.followUpDate ? new Date(student.followUpDate).toLocaleString() : '(Not yet scheduled)',
    margin + 115,
    y + 9
  );

  // Notes area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textGray);
  doc.text('COUNSELLOR EVALUATION / REMARKS:', margin + 4, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text(
    student.counsellingNotes || '(Official file record for Pathfinder International Education student profile)',
    margin + 4,
    y + 19
  );

  // 7. FOOTER REQUIRED BY PROMPT
  const footerY = pageHeight - 12;
  doc.setDrawColor(...borderGray);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textGray);
  doc.text('Pathfinder International Education • Putalisadak, Kathmandu • Tel: 01-5361805 | 01-5361853', margin, footerY + 2);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Counselling & Admissions Department', margin, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textGray);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Reference: ${student.leadId}`, pageWidth - margin, footerY + 2, { align: 'right' });
  doc.text('Confidential - For Internal and Admissions Verification', pageWidth - margin, footerY + 6, { align: 'right' });

  // Output
  const filename = `Pathfinder_${student.leadId}_${student.fullName.replace(/\s+/g, '_')}.pdf`;
  const dataUri = doc.output('datauristring');
  const blob = doc.output('blob');

  return {
    dataUri,
    blob,
    filename,
  };
};

/**
 * Triggers a browser download of the generated PDF
 */
export const downloadStudentPDF = (student: StudentRecord) => {
  const { blob, filename } = generateStudentPDF(student);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
