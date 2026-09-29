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
  Bell,
  AlertCircle,
} from 'lucide-react';
import {
  StudentRecord,
  StudentStatus,
  ActivityItem,
  STANDARD_STUDENT_STATUSES,
  ALL_STUDENT_STATUSES,
  StatusHistoryEntry,
} from '../../types/student';
import { DEFAULT_COUNSELLORS } from '../../data/counsellors';
import {
  updateStudent,
  resendStudentNotification,
  updateStudentStatusWithNotification,
  markEnquiryAsRead,
} from '../../services/studentService';
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

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onStudentUpdated,
}) => {
  const { currentUser } = useAuth();
  const staffName = currentUser?.displayName || 'Pathfinder Admissions Staff';

  // Management State
  const [activeTab, setActiveTab] = useState<'profile' | 'management' | 'history' | 'timeline'>('profile');
  const [currentStatus, setCurrentStatus] = useState<StudentStatus>(student.status);
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus>(student.status);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [sendEmailToStudent, setSendEmailToStudent] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

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
          notificationStatus: 'sent',
          notificationSentAt: new Date().toISOString(),
          notificationError: undefined,
          emailStatus: 'SENT',
          emailSentAt: new Date().toISOString(),
          emailError: undefined,
        });
      } else {
        showFeedback(result.message);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Resend notification failed';
      console.error('Email resend error:', err);
      showFeedback(`Resend failed: ${errMsg}`);
      onStudentUpdated({
        ...student,
        notificationStatus: 'failed',
        notificationError: errMsg,
        emailStatus: 'EMAIL_FAILED',
        emailError: errMsg,
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Toggle read/unread state in Firestore
  const handleToggleReadState = async () => {
    if (!student.id) return;
    const isCurrentlyRead = student.unread === false;
    const targetIsRead = !isCurrentlyRead;
    await markEnquiryAsRead(student.id, targetIsRead);
    const updated: StudentRecord = { ...student, unread: !targetIsRead };
    onStudentUpdated(updated);
    showFeedback(targetIsRead ? 'Enquiry marked as read' : 'Enquiry marked as unread');
  };

  // Two-way Status Management & Student Email Notification
  const handleUpdateStatusAndNotify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!student.id) return;
    setIsUpdatingStatus(true);
    try {
      const result = await updateStudentStatusWithNotification({
        student,
        newStatus: selectedStatus,
        staffMessage: statusMessage,
        sendEmailToStudent,
        staffUser: {
          name: staffName,
          email: currentUser?.email,
        },
      });

      setCurrentStatus(selectedStatus);
      setStatusMessage('');
      onStudentUpdated(result.updatedStudent);
      showFeedback(result.message);
    } catch (err: unknown) {
      console.error('Status update failed:', err);
      showFeedback('Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 1. Change Status (Quick update)
  const handleStatusChange = async (newStatus: StudentStatus) => {
    if (!student.id) return;
    setSelectedStatus(newStatus);
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

  const getStatusBadgeColor = (status: StudentStatus | string) => {
    switch (status) {
      case 'NEW ENQUIRY':
      case 'New Enquiry':
      case 'New':
        return 'bg-blue-100 text-[#0066A6] border-blue-200';
      case 'UNDER REVIEW':
      case 'Contacted':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DOCUMENTS REQUIRED':
      case 'Documents Pending':
        return 'bg-orange-100 text-[#F5821F] border-orange-200';
      case 'APPLICATION IN PROGRESS':
      case 'Application Started':
      case 'Application Submitted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OFFER RECEIVED':
      case 'University Shortlisted':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'VISA PROCESSING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'VISA GRANTED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'COMPLETED':
      case 'Counselled':
      case 'Counselling Completed':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'ON HOLD':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'NOT ELIGIBLE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
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
            {student.id && (
              <button
                type="button"
                id="btn-modal-toggle-read"
                onClick={handleToggleReadState}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  student.unread !== false
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/20'
                }`}
                title={student.unread !== false ? 'Mark this enquiry as read' : 'Mark this enquiry as unread'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {student.unread !== false ? 'Mark as Read' : 'Read'}
                </span>
              </button>
            )}

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
          <div className="flex flex-wrap gap-2 text-xs font-bold">
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
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-[#0066A6] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Status &amp; Notification History</span>
              {student.statusHistory && student.statusHistory.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-blue-100 text-[#0066A6]">
                  {student.statusHistory.length}
                </span>
              )}
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
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                      student.notificationStatus === 'sent' || student.emailStatus === 'SENT'
                        ? 'bg-emerald-100 text-emerald-700'
                        : student.notificationStatus === 'pending' || student.emailStatus === 'PENDING'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {student.notificationStatus === 'sent' || student.emailStatus === 'SENT' ? (
                      <MailCheck className="w-5 h-5" />
                    ) : student.notificationStatus === 'pending' || student.emailStatus === 'PENDING' ? (
                      <Clock className="w-5 h-5 animate-pulse" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Staff Notification Status:</span>
                      {student.notificationStatus === 'sent' || student.emailStatus === 'SENT' ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ Notification Delivered via Resend
                        </span>
                      ) : student.notificationStatus === 'pending' || student.emailStatus === 'PENDING' ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          ◷ Notification Pending
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          ⚠ Notification Delivery Failed
                        </span>
                      )}
                      {(student.notificationSentAt || student.emailSentAt) && (
                        <span className="text-[11px] text-slate-500">
                          ({new Date(student.notificationSentAt || student.emailSentAt || '').toLocaleString('en-GB')})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Recipients:{' '}
                      <span className="font-mono text-slate-700">
                        {student.emailRecipient ||
                          (student.notificationRecipients && student.notificationRecipients.length > 0
                            ? student.notificationRecipients.join(', ')
                            : 'admission@pathfinders.com.np, bdm@pathfinders.com.np, director@pathfinders.com.np, australia@pathfinders.com.np, info@pathfinders.com.np, uk@pathfinders.com.np')}
                      </span>
                    </p>
                    {(student.notificationError || student.emailError) && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-800">
                        <strong className="block text-rose-900 font-semibold mb-0.5">Exact Resend Error Diagnostic:</strong>
                        <span className="font-mono">{student.notificationError || student.emailError}</span>
                        {String(student.notificationError || student.emailError).includes('only send testing emails to your own email address') && (
                          <div className="mt-1 text-slate-600 text-[10.5px]">
                            💡 <em>While <strong>pathfinders.com.np</strong> domain verification is pending on Resend, Resend's free test mode only allows sending to the Resend account owner's email address. Set that email in <code>STAFF_NOTIFICATION_EMAILS</code> or complete domain DNS verification at resend.com/domains.</em>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
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
                {/* 1. Status Management & Email Notification */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0066A6]" />
                      Status Management &amp; Notification
                    </h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeColor(currentStatus)}`}>
                      Current: {currentStatus}
                    </span>
                  </div>

                  <form onSubmit={handleUpdateStatusAndNotify} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select New Application Status
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as StudentStatus)}
                        disabled={isUpdatingStatus}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#0066A6] bg-white shadow-2xs"
                      >
                        <optgroup label="Standard Pathfinder Statuses">
                          {STANDARD_STUDENT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </optgroup>
                        {ALL_STUDENT_STATUSES.filter((st) => !STANDARD_STUDENT_STATUSES.includes(st)).length > 0 && (
                          <optgroup label="Legacy / Previous Statuses">
                            {ALL_STUDENT_STATUSES.filter((st) => !STANDARD_STUDENT_STATUSES.includes(st)).map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Message / Remark for Student (Included in status email)
                      </label>
                      <textarea
                        rows={3}
                        value={statusMessage}
                        onChange={(e) => setStatusMessage(e.target.value)}
                        placeholder="e.g. Please provide your updated academic transcript and passport copy."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6]"
                      />
                    </div>

                    {/* Requirement 5: Checkbox toggle for sending status update email */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="chk-send-email-to-student"
                        checked={sendEmailToStudent}
                        onChange={(e) => setSendEmailToStudent(e.target.checked)}
                        className="w-4 h-4 rounded text-[#0066A6] focus:ring-[#0066A6] mt-0.5 cursor-pointer"
                      />
                      <label htmlFor="chk-send-email-to-student" className="text-xs text-slate-700 font-medium cursor-pointer">
                        <span className="font-bold text-slate-900 block">Send status update email to student</span>
                        <span className="text-[11px] text-slate-500">
                          Dispatches update email to <strong>{student.email || 'student email'}</strong> via Resend.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingStatus}
                      className="w-full py-2.5 rounded-lg bg-[#0066A6] hover:bg-[#004F82] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpdatingStatus ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating Status &amp; Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {sendEmailToStudent
                              ? `Update Status to "${selectedStatus}" & Send Email`
                              : `Update Status to "${selectedStatus}" (No Email)`}
                          </span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Handling Staff Member
                      </label>
                      <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <UserCheck className="w-4 h-4 text-[#0066A6]" />
                        <span className="font-semibold text-slate-800">{staffName}</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-1.5 py-0.5 rounded ml-auto">
                          Authorized
                        </span>
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
                          className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold shrink-0 hover:bg-slate-900 disabled:opacity-50"
                        >
                          Set
                        </button>
                      </div>
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

          {/* TAB 3: CHRONOLOGICAL STATUS & NOTIFICATION HISTORY */}
          {activeTab === 'history' && (
            <div id="student-status-history-panel" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs animate-fadeIn space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0066A6]" />
                    Status &amp; Notification History
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chronological audit record of application status changes and student email notification delivery.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeColor(currentStatus)}`}>
                    Current Status: {currentStatus}
                  </span>
                </div>
              </div>

              {student.statusHistory && student.statusHistory.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {student.statusHistory.map((entry, idx) => {
                    const isSent = entry.emailNotificationStatus === 'sent';
                    const isFailed = entry.emailNotificationStatus === 'failed';
                    const isSandboxRestricted = entry.emailNotificationStatus === 'sandbox_restricted';
                    const isNotRequested = entry.emailNotificationStatus === 'not_requested';
                    const formattedDate = entry.changedAt
                      ? new Date(entry.changedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A';

                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            isSent
                              ? 'bg-emerald-500'
                              : isSandboxRestricted
                              ? 'bg-blue-500'
                              : isFailed
                              ? 'bg-rose-500'
                              : 'bg-[#0066A6]'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>

                        {/* Content Card */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4.5 hover:border-slate-300 transition-colors space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-400">
                                {entry.previousStatus || 'Initial'}
                              </span>
                              <span className="text-xs text-slate-300 font-bold">&rarr;</span>
                              <span
                                className={`text-xs font-black px-2.5 py-0.5 rounded-md border ${getStatusBadgeColor(
                                  entry.newStatus as StudentStatus
                                )}`}
                              >
                                {entry.newStatus}
                              </span>
                            </div>

                            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {formattedDate}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600">
                            Changed by: <strong className="text-slate-800">{entry.changedBy || 'Staff'}</strong>
                            {entry.changedByEmail && (
                              <span className="text-slate-400 ml-1">({entry.changedByEmail})</span>
                            )}
                          </div>

                          {/* Staff message if provided */}
                          {entry.message && (
                            <div className="p-3 bg-white border-l-3 border-[#F5821F] rounded-r-lg text-xs text-slate-700 shadow-2xs">
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-0.5">
                                Staff Message to Student:
                              </span>
                              <p className="whitespace-pre-wrap">{entry.message}</p>
                            </div>
                          )}

                          {/* Email notification outcome badge */}
                          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-slate-500 text-[11px]">Student Email Dispatch:</span>
                            {isSent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <MailCheck className="w-3.5 h-3.5" />
                                Email Successfully Dispatched to Student
                              </span>
                            ) : isSandboxRestricted ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                title="Outbound email to student address was withheld while Resend is in sandbox testing mode. Once pathfinders.com.np domain verification completes, student emails will dispatch automatically."
                              >
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                Paused: Resend Sandbox Mode (Domain Pending)
                              </span>
                            ) : isFailed ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                                title={entry.emailNotificationError}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Email Failed: {entry.emailNotificationError || 'Delivery error'}
                              </span>
                            ) : isNotRequested ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                <Mail className="w-3.5 h-3.5" />
                                Email Not Requested
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <Clock className="w-3.5 h-3.5" />
                                Pending Dispatch
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">No status changes recorded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    When you update the application status in the &quot;Counselling Management&quot; tab, chronological records will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIVITY TIMELINE REQUIRED BY PROMPT */}
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
