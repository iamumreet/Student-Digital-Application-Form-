import React, { useState } from 'react';
import {
  X,
  User,
  GraduationCap,
  Globe,
  Briefcase,
  AlertTriangle,
  Award,
  History,
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  UserCheck,
  Tag,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';
import { StudentRecord, StudentStatus, ActivityItem } from '../../types/student';
import { DEFAULT_COUNSELLORS } from '../../data/counsellors';
import { updateStudent, resendStudentNotification } from '../../services/studentService';
import { downloadStudentPDF } from '../../services/pdfService';
import { exportStudentsToExcel } from '../../services/spreadsheetService';
import { useAuth } from '../../context/AuthContext';
import { Download, FileSpreadsheet, RefreshCw, MailCheck } from 'lucide-react';

interface StudentDetailModalProps {
  student: StudentRecord;
  isOpen: boolean;
  onClose: () => void;
  onStudentUpdated: (updated: StudentRecord) => void;
}

const ALL_STATUSES: StudentStatus[] = [
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

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onStudentUpdated,
}) => {
  const { currentUser } = useAuth();
  const staffName = currentUser?.displayName || 'Counsellor';

  // Management State
  const [activeTab, setActiveTab] = useState<'profile' | 'management' | 'timeline'>('profile');
  const [currentStatus, setCurrentStatus] = useState<StudentStatus>(student.status);
  const [assignedCounsellorId, setAssignedCounsellorId] = useState<string>(student.assignedCounsellorId || '');
  const [followUpDate, setFollowUpDate] = useState<string>(student.followUpDate || '');
  const [counsellingNotes, setCounsellingNotes] = useState<string>(student.counsellingNotes || '');
  const [internalRemarks, setInternalRemarks] = useState<string>(student.internalRemarks || '');
  const [newNoteInput, setNewNoteInput] = useState<string>('');
  const [contactAttemptMode, setContactAttemptMode] = useState<string>('Phone Call');
  const [contactSummary, setContactSummary] = useState<string>('');
  const [sessionSummary, setSessionSummary] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isResendingEmail, setIsResendingEmail] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Download PDF
  const handleDownloadPDF = () => {
    setIsDownloadingPdf(true);
    try {
      downloadStudentPDF(student);
      showFeedback('Official PDF downloaded');
    } catch (err) {
      console.error(err);
      showFeedback('PDF generation failed');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      exportStudentsToExcel([student], `Pathfinder_${student.leadId}_Profile`);
      showFeedback('Excel record exported');
    } catch (err) {
      console.error(err);
    }
  };

  // Resend Email Notification
  const handleResendEmail = async () => {
    setIsResendingEmail(true);
    try {
      const result = await resendStudentNotification(student);
      if (result.success) {
        showFeedback(result.message);
        onStudentUpdated({
          ...student,
          emailStatus: 'SENT',
          emailSentAt: new Date().toISOString(),
        });
      } else {
        showFeedback(result.message);
      }
    } catch (err) {
      console.error(err);
      showFeedback('Resend notification failed');
    } finally {
      setIsResendingEmail(false);
    }
  };

  // 1. Change Status
  const handleStatusChange = async (newStatus: StudentStatus) => {
    if (!student.id) return;
    setIsSaving(true);
    try {
      const activity: Omit<ActivityItem, 'id' | 'date'> = {
        title: `Status changed to ${newStatus}`,
        description: `Student progression updated from "${currentStatus}" to "${newStatus}".`,
        author: staffName,
        type: 'status_change',
      };
      await updateStudent(student.id, { status: newStatus }, activity);
      setCurrentStatus(newStatus);
      const updatedStudent: StudentRecord = {
        ...student,
        status: newStatus,
        activityHistory: [
          {
            id: `act-${Date.now()}`,
            date: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...activity,
          },
          ...student.activityHistory,
        ],
      };
      onStudentUpdated(updatedStudent);
      showFeedback(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Assign Counsellor
  const handleAssignCounsellor = async (counsellorId: string) => {
    if (!student.id) return;
    const found = DEFAULT_COUNSELLORS.find((c) => c.id === counsellorId);
    const counsellorName = found ? found.name : 'Unassigned';
    setIsSaving(true);
    try {
      const activity: Omit<ActivityItem, 'id' | 'date'> = {
        title: found ? `Assigned to Counsellor` : 'Counsellor unassigned',
        description: found
          ? `Assigned to ${found.name} (${found.role}).`
          : 'Counsellor assignment removed.',
        author: staffName,
        type: 'assignment',
      };
      await updateStudent(
        student.id,
        { assignedCounsellorId: counsellorId, assignedCounsellorName: counsellorName },
        activity
      );
      setAssignedCounsellorId(counsellorId);
      const updatedStudent: StudentRecord = {
        ...student,
        assignedCounsellorId: counsellorId,
        assignedCounsellorName: counsellorName,
        activityHistory: [
          {
            id: `act-${Date.now()}`,
            date: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...activity,
          },
          ...student.activityHistory,
        ],
      };
      onStudentUpdated(updatedStudent);
      showFeedback(`Assigned to ${counsellorName}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Set Follow-up Date
  const handleSaveFollowUp = async () => {
    if (!student.id) return;
    setIsSaving(true);
    try {
      const activity: Omit<ActivityItem, 'id' | 'date'> = {
        title: 'Follow-up scheduled',
        description: `Next follow-up set for ${new Date(followUpDate).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}.`,
        author: staffName,
        type: 'followup',
      };
      await updateStudent(student.id, { followUpDate }, activity);
      const updatedStudent: StudentRecord = {
        ...student,
        followUpDate,
        activityHistory: [
          {
            id: `act-${Date.now()}`,
            date: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...activity,
          },
          ...student.activityHistory,
        ],
      };
      onStudentUpdated(updatedStudent);
      showFeedback('Follow-up schedule saved.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Save Notes / Remarks
  const handleSaveNotes = async () => {
    if (!student.id) return;
    setIsSaving(true);
    try {
      const activity: Omit<ActivityItem, 'id' | 'date'> = {
        title: 'Counselling notes updated',
        description: 'Updated file counselling notes and internal remarks.',
        author: staffName,
        type: 'note',
      };
      await updateStudent(student.id, { counsellingNotes, internalRemarks }, activity);
      const updatedStudent: StudentRecord = {
        ...student,
        counsellingNotes,
        internalRemarks,
        activityHistory: [
          {
            id: `act-${Date.now()}`,
            date: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...activity,
          },
          ...student.activityHistory,
        ],
      };
      onStudentUpdated(updatedStudent);
      showFeedback('Counselling notes & remarks saved.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Record Contact Attempt
  const handleRecordContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.id || !contactSummary.trim()) return;
    setIsSaving(true);
    try {
      const activity: Omit<ActivityItem, 'id' | 'date'> = {
        title: `Student contacted via ${contactAttemptMode}`,
        description: contactSummary.trim(),
        author: staffName,
        type: 'contact',
      };
      await updateStudent(student.id, {}, activity);
      const updatedStudent: StudentRecord = {
        ...student,
        activityHistory: [
          {
            id: `act-${Date.now()}`,
            date: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...activity,
          },
          ...student.activityHistory,
        ],
      };
      onStudentUpdated(updatedStudent);
      setContactSummary('');
      showFeedback('Contact attempt recorded.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Record Counselling Session
  const handleRecordCounsellingSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.id || !sessionSummary.trim()) return;
    setIsSaving(true);
    try {
      const activity: Omit<ActivityItem, 'id' | 'date'> = {
        title: 'Counselling completed',
        description: sessionSummary.trim(),
        author: staffName,
        type: 'counselling',
      };
      const newStatus: StudentStatus = 'Counselled';
      await updateStudent(student.id, { status: newStatus }, activity);
      setCurrentStatus(newStatus);
      const updatedStudent: StudentRecord = {
        ...student,
        status: newStatus,
        activityHistory: [
          {
            id: `act-${Date.now()}`,
            date: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            ...activity,
          },
          ...student.activityHistory,
        ],
      };
      onStudentUpdated(updatedStudent);
      setSessionSummary('');
      showFeedback('Counselling session recorded.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeColor = (status: StudentStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-[#0066A6] border-blue-200';
      case 'Contacted':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Counselling Scheduled':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Counselled':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'University Shortlisted':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Documents Pending':
        return 'bg-orange-100 text-[#F5821F] border-orange-200';
      case 'Application Started':
      case 'Application Submitted':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Visa Processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Visa Granted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div
        id="student-profile-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Top Header Required by Prompt */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* Student Photo */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-800 border-2 border-white/20 shrink-0">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Student Name, Lead ID, Status, Counsellor */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate text-white">
                  {student.fullName}
                </h1>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white/10 text-orange-300 border border-white/10">
                  {student.leadId}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold border ${getStatusBadgeColor(
                    currentStatus
                  )}`}
                >
                  {currentStatus}
                </span>

                <span className="flex items-center gap-1 text-slate-300">
                  <UserCheck className="w-3.5 h-3.5 text-[#F5821F]" />
                  Assigned:{' '}
                  <strong className="text-white">
                    {DEFAULT_COUNSELLORS.find((c) => c.id === assignedCounsellorId)?.name ||
                      student.assignedCounsellorName ||
                      'Unassigned'}
                  </strong>
                </span>

                <span className="text-slate-400">
                  Target: <strong className="text-white">{student.interestedCountry}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Header: Actions, Logo, and Close */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Official Pathfinder Logo */}
            <div className="hidden md:block bg-white/95 px-2.5 py-1.5 rounded-lg">
              <img
                src="/pathfinder-logo.png"
                alt="Pathfinder International Education"
                className="h-7 w-auto object-contain"
              />
            </div>

            {/* Quick Actions */}
            <button
              type="button"
              id="btn-modal-download-pdf"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPdf}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066A6] text-white text-xs font-bold hover:bg-[#004F82] transition-colors shadow-xs"
              title="Download official Pathfinder application PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'Generating...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              id="btn-modal-export-excel"
              onClick={handleExportExcel}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
              title="Export this student record to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              id="btn-close-student-modal"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex gap-2 text-xs font-bold">
            <button
              type="button"
              id="tab-profile"
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-white text-[#0066A6] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full Student Profile
            </button>
            <button
              type="button"
              id="tab-management"
              onClick={() => setActiveTab('management')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'management'
                  ? 'bg-white text-[#0066A6] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Counselling Management
            </button>
            <button
              type="button"
              id="tab-timeline"
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-white text-[#0066A6] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Activity Timeline ({student.activityHistory?.length || 0})
            </button>
          </div>

          {feedbackMsg && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 animate-fadeIn">
              ✓ {feedbackMsg}
            </span>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {/* TAB 1: FULL STUDENT PROFILE (SEPARATE CARDS AS REQUIRED) */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Submission & Email Notification Status Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    student.emailStatus === 'SENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {student.emailStatus === 'SENT' ? <MailCheck className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Email Notification Status:</span>
                      {student.emailStatus === 'SENT' ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ Notification Sent to Pathfinder Admissions
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          ⚠ Delivery Pending / Failed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {student.emailStatus === 'SENT'
                        ? 'Dispatched to authorized admissions email inbox'
                        : 'Notification could not be dispatched or was queued. Click Resend below.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResendingEmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResendingEmail ? 'animate-spin' : ''}`} />
                    <span>{isResendingEmail ? 'Resending...' : 'Resend Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066A6] text-white text-xs font-bold hover:bg-[#004F82] transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Card 1: Personal Information */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <User className="w-4 h-4 text-[#0066A6]" />
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Full Name</span>
                    <span className="font-bold text-slate-800 text-sm">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email Address</span>
                    <a
                      href={`mailto:${student.email}`}
                      className="font-semibold text-[#0066A6] hover:underline"
                    >
                      {student.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mobile Number</span>
                    <a
                      href={`tel:${student.mobileNumber}`}
                      className="font-semibold text-[#0066A6] hover:underline"
                    >
                      {student.mobileNumber}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date of Birth</span>
                    <span className="font-semibold text-slate-800">{student.dateOfBirth}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Gender &amp; Marital Status</span>
                    <span className="font-semibold text-slate-800">
                      {student.gender || 'Not specified'} / {student.maritalStatus || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Guardian Details</span>
                    <span className="font-semibold text-slate-800">
                      {student.guardianName} ({student.guardianContactNumber})
                    </span>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-slate-400 block">Permanent / Current Address</span>
                    <span className="font-semibold text-slate-800">{student.address}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Academic Details */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <GraduationCap className="w-4 h-4 text-[#0066A6]" />
                  Academic Qualifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* SEE */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                      <span>Secondary Education Examination (SEE)</span>
                      <span className="text-[#0066A6] font-bold text-sm">
                        {student.academicDetails.see.scoreOrGpa}
                      </span>
                    </div>
                    <p className="text-slate-600">{student.academicDetails.see.institutionNameAddress}</p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Passed Year: {student.academicDetails.see.passedYear}
                    </p>
                  </div>

                  {/* CTEVT / +2 / A-Level */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                      <span>CTEVT / +2 / A-Level</span>
                      <span className="text-[#0066A6] font-bold text-sm">
                        {student.academicDetails.higherSecondary.scoreOrGpa}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      {student.academicDetails.higherSecondary.institutionNameAddress}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Passed Year: {student.academicDetails.higherSecondary.passedYear}
                    </p>
                  </div>

                  {/* Bachelor */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                      <span>Bachelor Degree</span>
                      <span className="text-[#0066A6] font-bold text-sm">
                        {student.academicDetails.bachelor.scoreOrGpa || 'Not pursued / Blank'}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      {student.academicDetails.bachelor.institutionNameAddress || '—'}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Passed Year: {student.academicDetails.bachelor.passedYear || '—'}
                    </p>
                  </div>

                  {/* Master */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                      <span>Master Degree</span>
                      <span className="text-[#0066A6] font-bold text-sm">
                        {student.academicDetails.master.scoreOrGpa || 'Not pursued / Blank'}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      {student.academicDetails.master.institutionNameAddress || '—'}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Passed Year: {student.academicDetails.master.passedYear || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Study Preferences & Target Program */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Globe className="w-4 h-4 text-[#0066A6]" />
                  Study Preferences &amp; Guidance Inquiry
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Choice of Program</span>
                    <span className="font-bold text-slate-900 text-sm">{student.choiceOfProgram}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Interested Country</span>
                    <span className="font-bold text-[#0066A6] text-sm">{student.interestedCountry}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target Intake</span>
                    <span className="font-semibold text-slate-800">{student.intake || 'Upcoming Intake'}</span>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-slate-400 block">Primary Query / Guidance Type</span>
                    <span className="font-semibold text-slate-800 text-sm">{student.questionType}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Work Experience & Education Gap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Work Experience */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <Briefcase className="w-4 h-4 text-[#0066A6]" />
                    Work Experience
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {student.workExperience || 'No previous work experience entered.'}
                  </p>
                </div>

                {/* Education Gap */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <AlertTriangle className="w-4 h-4 text-[#F5821F]" />
                    Education Gap Analysis
                  </h2>
                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Education Gap:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-xs ${
                          student.hasEducationGap === 'Yes'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {student.hasEducationGap || 'No'}
                      </span>
                    </div>
                    {student.hasEducationGap === 'Yes' && (
                      <div>
                        <span className="text-slate-500 block">Gap Duration &amp; Reason:</span>
                        <p className="font-semibold text-slate-800 mt-1">
                          {student.educationGapDuration || 'Not detailed'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 5: English / Test Information & Previous Applications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* English / Tests */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <Award className="w-4 h-4 text-[#0066A6]" />
                    English &amp; Standardized Tests
                  </h2>
                  <div className="text-xs space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {student.testsTaken?.length > 0 ? (
                        student.testsTaken.map((test) => (
                          <span
                            key={test}
                            className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0066A6] font-bold text-[11px] border border-blue-200"
                          >
                            {test}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">None / Not yet taken</span>
                      )}
                    </div>
                    {student.testScore && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-400 block text-[11px]">Reported Scores</span>
                        <span className="font-bold text-slate-900 text-sm">{student.testScore}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Previous Applications */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <Globe className="w-4 h-4 text-[#0066A6]" />
                    Previous Country Applications
                  </h2>
                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Ever applied elsewhere?</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-xs ${
                          student.hasAppliedOtherCountries === 'Yes'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {student.hasAppliedOtherCountries || 'No'}
                      </span>
                    </div>
                    {student.hasAppliedOtherCountries === 'Yes' && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-400 block text-[11px]">Applied Countries / Details</span>
                        <span className="font-semibold text-slate-800">
                          {student.previousCountriesApplied || 'Details not provided'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 6: Source & Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <Tag className="w-4 h-4 text-[#0066A6]" />
                    Marketing Source
                  </h2>
                  <p className="text-xs text-slate-700 font-semibold">
                    {student.howDidYouKnow || 'Direct Enquiry'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Submitted on: {student.submittedAtFormatted || student.submittedAt}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <FolderOpen className="w-4 h-4 text-[#0066A6]" />
                    Uploaded Documents &amp; Photo
                  </h2>
                  <div className="flex items-center gap-3">
                    {student.photoUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">Passport Photo</p>
                          <a
                            href={student.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0066A6] font-semibold hover:underline"
                          >
                            View Full Resolution
                          </a>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No documents uploaded yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COUNSELLING MANAGEMENT */}
          {activeTab === 'management' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Management Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Status & Counsellor Assignment */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-[#0066A6]" />
                    Status &amp; Counsellor Assignment
                  </h2>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Change Student Status
                    </label>
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(e.target.value as StudentStatus)}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Handling Staff Member
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <UserCheck className="w-4 h-4 text-[#0066A6]" />
                      <span className="font-semibold text-slate-800">Pathfinder Admissions Staff</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-1.5 py-0.5 rounded ml-auto">Authorized</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Set Follow-up Date &amp; Time
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveFollowUp}
                        disabled={isSaving || !followUpDate}
                        className="px-4 py-2 rounded-lg bg-[#0066A6] text-white text-xs font-bold shrink-0 hover:bg-[#004F82] disabled:opacity-50"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Record Contact Attempt */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Phone className="w-4 h-4 text-[#0066A6]" />
                    Record Contact Attempt
                  </h2>

                  <form onSubmit={handleRecordContact} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Channel
                      </label>
                      <select
                        value={contactAttemptMode}
                        onChange={(e) => setContactAttemptMode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                      >
                        <option value="Phone Call">Phone Call</option>
                        <option value="WhatsApp Message">WhatsApp Message</option>
                        <option value="Email Consultation">Email Consultation</option>
                        <option value="In-Person Walk-in">In-Person Office Walk-in</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Summary of Discussion
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. Spoke with student. Discussed Sydney and Melbourne universities. Requested passport scan."
                        value={contactSummary}
                        onChange={(e) => setContactSummary(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving || !contactSummary.trim()}
                      className="w-full py-2 rounded-lg bg-[#F5821F] hover:bg-[#DE7114] text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Log Contact Attempt
                    </button>
                  </form>
                </div>

                {/* 3. Record Counselling Session */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs md:col-span-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100">
                    <GraduationCap className="w-4 h-4 text-[#0066A6]" />
                    Record Comprehensive Counselling Session
                  </h2>

                  <form onSubmit={handleRecordCounsellingSession} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Session Notes &amp; Shortlisted Universities
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Detail the course recommendations, scholarship eligibility, financial prerequisites, and agreed next steps with the student/parents..."
                        value={sessionSummary}
                        onChange={(e) => setSessionSummary(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving || !sessionSummary.trim()}
                        className="px-6 py-2.5 rounded-lg bg-[#0066A6] hover:bg-[#004F82] text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Complete Counselling Session (Updates Status to Counselled)
                      </button>
                    </div>
                  </form>
                </div>

                {/* 4. Counselling Notes & Internal Remarks */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs md:col-span-2 space-y-4">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100">
                    <FileText className="w-4 h-4 text-[#0066A6]" />
                    Permanent File Notes &amp; Internal Remarks
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Counselling Notes (Visible to all assigned counsellors)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Academic evaluation notes, visa risk profile, test requirements..."
                        value={counsellingNotes}
                        onChange={(e) => setCounsellingNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Internal Remarks (Staff Confidential)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Financial strength, sponsorship details, urgent deadlines..."
                        value={internalRemarks}
                        onChange={(e) => setInternalRemarks(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="px-6 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Save Notes &amp; Remarks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY TIMELINE REQUIRED BY PROMPT */}
          {activeTab === 'timeline' && (
            <div id="student-activity-timeline" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-[#0066A6]" />
                    Complete Activity &amp; Audit Timeline
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chronological record of student interactions, assignments, and status progressions.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                  {student.activityHistory?.length || 0} Events Logged
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {student.activityHistory && student.activityHistory.length > 0 ? (
                  student.activityHistory.map((act) => {
                    const displayTime = act.date
                      ? new Date(act.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';
                    return (
                      <div key={act.id} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            act.type === 'submission'
                              ? 'bg-emerald-500'
                              : act.type === 'status_change'
                              ? 'bg-[#0066A6]'
                              : act.type === 'assignment'
                              ? 'bg-purple-500'
                              : act.type === 'contact'
                              ? 'bg-[#F5821F]'
                              : act.type === 'counselling'
                              ? 'bg-indigo-600'
                              : 'bg-slate-400'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>

                        {/* Content Box */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 group-hover:border-slate-300 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <h3 className="text-xs font-bold text-slate-900">
                              {act.title}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{act.displayDate || new Date(act.date).toLocaleDateString()}</span>
                              {displayTime && <span>• {displayTime}</span>}
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {act.description}
                          </p>

                          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              Logged by: <strong className="text-slate-700">{act.author}</strong>
                            </span>
                            <span className="uppercase text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                              {act.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic">No activity history recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="text-slate-500">
            Student ID:{' '}
            <strong className="text-slate-800 font-mono">{student.leadId}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
