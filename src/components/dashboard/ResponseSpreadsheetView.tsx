import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Edit2,
  Trash2,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  MessageSquare,
  Columns,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  User,
  GraduationCap,
  Briefcase,
  Globe,
  BookOpen,
  Award,
  HelpCircle,
  Printer,
  ChevronDown,
  MailCheck,
} from 'lucide-react';
import { StudentRecord, StudentStatus, ALL_STUDENT_STATUSES } from '../../types/student';
import {
  updateStudentStatus,
  updateStudentFollowUp,
  addStudentNote,
  deleteStudent,
  updateStudent,
} from '../../services/studentService';
import { generateStudentPDF, downloadStudentPDF } from '../../services/pdfService';
import { exportStudentsToExcel } from '../../services/spreadsheetService';
import { useAuth } from '../../context/AuthContext';

interface ResponseSpreadsheetViewProps {
  students: StudentRecord[];
  onSelectStudent: (student: StudentRecord) => void;
  onRefresh: () => void;
  loading: boolean;
  error?: string | null;
}

// All 40 Columns required by user specification
export interface ColumnDef {
  id: string;
  label: string;
  minWidth: number;
  category: 'core' | 'personal' | 'academic' | 'gap_work' | 'preference' | 'test' | 'management';
}

export const ALL_COLUMNS: ColumnDef[] = [
  { id: 'no', label: 'No.', minWidth: 50, category: 'core' },
  { id: 'timestamp', label: 'Timestamp', minWidth: 140, category: 'core' },
  { id: 'leadId', label: 'Lead ID', minWidth: 125, category: 'core' },
  { id: 'name', label: 'Name', minWidth: 170, category: 'core' },
  { id: 'guardianName', label: "Guardian's Name", minWidth: 150, category: 'personal' },
  { id: 'guardianContact', label: "Guardian's Contact Number", minWidth: 150, category: 'personal' },
  { id: 'dob', label: 'Date of Birth', minWidth: 110, category: 'personal' },
  { id: 'gender', label: 'Gender', minWidth: 80, category: 'personal' },
  { id: 'maritalStatus', label: 'Marital Status', minWidth: 100, category: 'personal' },
  { id: 'mobile', label: 'Mobile Number', minWidth: 130, category: 'personal' },
  { id: 'email', label: 'Email', minWidth: 190, category: 'personal' },
  { id: 'address', label: 'Address', minWidth: 200, category: 'personal' },
  { id: 'photo', label: 'Profile Photo', minWidth: 100, category: 'personal' },
  { id: 'seeScore', label: 'SEE Score/GPA', minWidth: 110, category: 'academic' },
  { id: 'seeInstitution', label: 'SEE Institution', minWidth: 180, category: 'academic' },
  { id: 'seeYear', label: 'SEE Passed Year', minWidth: 110, category: 'academic' },
  { id: 'higherSecondaryScore', label: 'CTEVT/+2/A-Level Score/GPA', minWidth: 160, category: 'academic' },
  { id: 'higherSecondaryInstitution', label: 'CTEVT/+2/A-Level Institution', minWidth: 200, category: 'academic' },
  { id: 'higherSecondaryYear', label: 'CTEVT/+2/A-Level Passed Year', minWidth: 160, category: 'academic' },
  { id: 'bachelorScore', label: 'Bachelor Score/CGPA', minWidth: 140, category: 'academic' },
  { id: 'bachelorInstitution', label: 'Bachelor Institution', minWidth: 200, category: 'academic' },
  { id: 'bachelorYear', label: 'Bachelor Passed Year', minWidth: 140, category: 'academic' },
  { id: 'masterScore', label: 'Master Score/CGPA', minWidth: 130, category: 'academic' },
  { id: 'masterInstitution', label: 'Master Institution', minWidth: 190, category: 'academic' },
  { id: 'masterYear', label: 'Master Passed Year', minWidth: 130, category: 'academic' },
  { id: 'workExp', label: 'Work Experience', minWidth: 180, category: 'gap_work' },
  { id: 'educationGap', label: 'Education Gap', minWidth: 110, category: 'gap_work' },
  { id: 'gapDuration', label: 'Gap Duration', minWidth: 120, category: 'gap_work' },
  { id: 'program', label: 'Choice of Program', minWidth: 180, category: 'preference' },
  { id: 'country', label: 'Interested Country', minWidth: 130, category: 'preference' },
  { id: 'prevApp', label: 'Previous Country Application', minWidth: 160, category: 'preference' },
  { id: 'appliedCountry', label: 'Applied Country', minWidth: 140, category: 'preference' },
  { id: 'testsTaken', label: 'Tests Taken', minWidth: 120, category: 'test' },
  { id: 'testScore', label: 'Test Score', minWidth: 150, category: 'test' },
  { id: 'questionType', label: 'Question Type', minWidth: 180, category: 'preference' },
  { id: 'source', label: 'How They Know About Pathfinder', minWidth: 180, category: 'preference' },
  { id: 'status', label: 'Status', minWidth: 165, category: 'management' },
  { id: 'emailNotification', label: 'Email Status', minWidth: 140, category: 'management' },
  { id: 'followUpDate', label: 'Follow-up Date', minWidth: 140, category: 'management' },
  { id: 'pdf', label: 'PDF', minWidth: 110, category: 'management' },
  { id: 'notes', label: 'Notes', minWidth: 180, category: 'management' },
];

export const ResponseSpreadsheetView: React.FC<ResponseSpreadsheetViewProps> = ({
  students,
  onSelectStudent,
  onRefresh,
  loading,
  error,
}) => {
  const { currentUser } = useAuth();
  const staffName = currentUser?.displayName || 'Pathfinder Admissions Staff';

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [filterEducationLevel, setFilterEducationLevel] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<string>('');
  const [activeQuickTab, setActiveQuickTab] = useState<'all' | 'followups'>('all');

  // Column Visibility State (all visible by default)
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(
    () => new Set(ALL_COLUMNS.map((c) => c.id))
  );
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Feedback Toast State
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Modals State
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; leadId: string } | null>(null);
  const [pdfPreviewModal, setPdfPreviewModal] = useState<{ dataUri: string; filename: string; student: StudentRecord } | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentRecord | null>(null);
  const [quickNoteStudent, setQuickNoteStudent] = useState<StudentRecord | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [followUpPickerStudent, setFollowUpPickerStudent] = useState<StudentRecord | null>(null);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');

  // 1. KPI COUNTERS CALCULATION
  const kpiStats = useMemo(() => {
    const total = students.length;
    const newCount = students.filter(
      (s) => s.status === 'New Enquiry' || s.status === 'NEW ENQUIRY' || s.status === 'New'
    ).length;
    const contactedCount = students.filter((s) => s.status === 'Contacted').length;
    const counselledCount = students.filter(
      (s) =>
        s.status === 'Counselling Completed' ||
        s.status === 'Counselled' ||
        s.status === 'Counselling Scheduled'
    ).length;
    const applicationsCount = students.filter(
      (s) =>
        s.status === 'Application Started' ||
        s.status === 'Application Submitted' ||
        s.status === 'University Shortlisted' ||
        s.status === 'Documents Pending' ||
        s.status === 'Visa Processing' ||
        s.status === 'Visa Granted'
    ).length;

    // Follow-ups due today or overdue count
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const followupsDueCount = students.filter((s) => {
      if (!s.followUpDate) return false;
      const fDate = s.followUpDate.slice(0, 10);
      return fDate <= todayStr && s.status !== 'Closed';
    }).length;

    return {
      total,
      newCount,
      contactedCount,
      counselledCount,
      applicationsCount,
      followupsDueCount,
    };
  }, [students]);

  // Distinct Filter Options
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.interestedCountry) set.add(s.interestedCountry);
    });
    return Array.from(set).sort();
  }, [students]);

  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.choiceOfProgram) set.add(s.choiceOfProgram);
    });
    return Array.from(set).slice(0, 20);
  }, [students]);

  // 2. FILTERING LOGIC
  const filteredStudents = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return students.filter((s) => {
      // Quick Tab Filter
      if (activeQuickTab === 'followups') {
        if (!s.followUpDate) return false;
        const fDate = s.followUpDate.slice(0, 10);
        if (fDate > todayStr || s.status === 'Closed') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.fullName?.toLowerCase().includes(q);
        const matchLeadId = s.leadId?.toLowerCase().includes(q);
        const matchEmail = s.email?.toLowerCase().includes(q);
        const matchMobile = s.mobileNumber?.toLowerCase().includes(q);
        const matchCountry = s.interestedCountry?.toLowerCase().includes(q);
        const matchProgram = s.choiceOfProgram?.toLowerCase().includes(q);
        const matchGuardian = s.guardianName?.toLowerCase().includes(q);
        const matchAddress = s.address?.toLowerCase().includes(q);

        if (
          !matchName &&
          !matchLeadId &&
          !matchEmail &&
          !matchMobile &&
          !matchCountry &&
          !matchProgram &&
          !matchGuardian &&
          !matchAddress
        ) {
          return false;
        }
      }

      // Status Filter
      if (filterStatus) {
        if (filterStatus === 'New') {
          if (s.status !== 'New Enquiry' && s.status !== 'NEW ENQUIRY' && s.status !== 'New') {
            return false;
          }
        } else if (filterStatus === 'Counselled') {
          if (
            s.status !== 'Counselling Completed' &&
            s.status !== 'Counselled' &&
            s.status !== 'Counselling Scheduled'
          ) {
            return false;
          }
        } else if (filterStatus === 'Applications') {
          if (
            s.status !== 'Application Started' &&
            s.status !== 'Application Submitted' &&
            s.status !== 'University Shortlisted' &&
            s.status !== 'Documents Pending' &&
            s.status !== 'Visa Processing' &&
            s.status !== 'Visa Granted'
          ) {
            return false;
          }
        } else if (s.status !== filterStatus) {
          return false;
        }
      }

      // Country Filter
      if (filterCountry && s.interestedCountry !== filterCountry) {
        return false;
      }

      // Program Filter
      if (filterProgram && !s.choiceOfProgram?.toLowerCase().includes(filterProgram.toLowerCase())) {
        return false;
      }

      // Education Level Filter
      if (filterEducationLevel) {
        const details = s.academicDetails;
        if (filterEducationLevel === 'Master' && !details?.master?.scoreOrGpa) return false;
        if (filterEducationLevel === 'Bachelor' && !details?.bachelor?.scoreOrGpa) return false;
        if (filterEducationLevel === '+2 / CTEVT / A-Level' && !details?.higherSecondary?.scoreOrGpa) return false;
        if (filterEducationLevel === 'SEE' && !details?.see?.scoreOrGpa) return false;
      }

      // Submission Date Filter
      if (filterDateRange) {
        const subDate = new Date(s.submittedAt);
        const diffDays = (now.getTime() - subDate.getTime()) / (1000 * 3600 * 24);
        if (filterDateRange === 'today' && diffDays > 1) return false;
        if (filterDateRange === '7days' && diffDays > 7) return false;
        if (filterDateRange === '30days' && diffDays > 30) return false;
      }

      return true;
    });
  }, [
    students,
    searchQuery,
    filterStatus,
    filterCountry,
    filterProgram,
    filterEducationLevel,
    filterDateRange,
    activeQuickTab,
  ]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterStatus,
    filterCountry,
    filterProgram,
    filterEducationLevel,
    filterDateRange,
    activeQuickTab,
    pageSize,
  ]);

  // 3. PAGINATION SLICE
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Clear all filters
  const hasActiveFilters =
    !!searchQuery ||
    !!filterStatus ||
    !!filterCountry ||
    !!filterProgram ||
    !!filterEducationLevel ||
    !!filterDateRange ||
    activeQuickTab !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCountry('');
    setFilterProgram('');
    setFilterEducationLevel('');
    setFilterDateRange('');
    setActiveQuickTab('all');
  };

  // 4. ACTION HANDLERS
  // Inline Status Change
  const handleInlineStatusChange = async (student: StudentRecord, newStatus: StudentStatus) => {
    if (!student.id) return;
    try {
      await updateStudentStatus(student.id, newStatus, staffName);
      showToast(`Status updated to "${newStatus}" for ${student.fullName}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  // Follow-up Date Update
  const handleSaveFollowUpDate = async () => {
    if (!followUpPickerStudent?.id) return;
    try {
      await updateStudentFollowUp(followUpPickerStudent.id, newFollowUpDate, staffName);
      showToast(`Follow-up scheduled for ${followUpPickerStudent.fullName}`);
      setFollowUpPickerStudent(null);
      setNewFollowUpDate('');
    } catch (err) {
      console.error(err);
      showToast('Failed to update follow-up date', 'error');
    }
  };

  // Quick Note Add
  const handleSaveQuickNote = async () => {
    if (!quickNoteStudent?.id || !quickNoteText.trim()) return;
    try {
      await addStudentNote(quickNoteStudent.id, quickNoteText.trim(), staffName);
      showToast(`Internal note logged for ${quickNoteStudent.fullName}`);
      setQuickNoteStudent(null);
      setQuickNoteText('');
    } catch (err) {
      console.error(err);
      showToast('Failed to add note', 'error');
    }
  };

  // Delete Record
  const handleConfirmDelete = async () => {
    if (!studentToDelete?.id) return;
    try {
      await deleteStudent(studentToDelete.id);
      showToast(`Response ${studentToDelete.leadId} permanently deleted`);
      setStudentToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete student response', 'error');
    }
  };

  // PDF Preview
  const handleOpenPdfPreview = (student: StudentRecord) => {
    try {
      const { dataUri, filename } = generateStudentPDF(student);
      setPdfPreviewModal({ dataUri, filename, student });
    } catch (err) {
      console.error(err);
      showToast('Could not generate PDF preview', 'error');
    }
  };

  // Export to Excel
  const handleExportAll = () => {
    setIsExportMenuOpen(false);
    exportStudentsToExcel(
      students,
      `Pathfinder_All_Student_Responses_${new Date().toISOString().slice(0, 10)}`
    );
    showToast(`Exported all ${students.length} responses to Excel (.xlsx)`);
  };

  const handleExportFiltered = () => {
    setIsExportMenuOpen(false);
    exportStudentsToExcel(
      filteredStudents,
      `Pathfinder_Filtered_Responses_${new Date().toISOString().slice(0, 10)}`
    );
    showToast(`Exported ${filteredStudents.length} filtered responses to Excel (.xlsx)`);
  };

  // Status Badge Styling Helper
  const getStatusBadgeStyle = (status: StudentStatus | string) => {
    switch (status) {
      case 'New Enquiry':
      case 'NEW ENQUIRY':
      case 'New':
        return 'bg-blue-50 text-[#0066A6] border-blue-200';
      case 'Contacted':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Counselling Completed':
      case 'Counselled':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'University Shortlisted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Documents Pending':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Application Started':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Application Submitted':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Visa Processing':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Visa Granted':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
      case 'Closed':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Follow-up status check
  const getFollowUpStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const itemDateStr = dateStr.slice(0, 10);

    if (itemDateStr < todayStr) {
      return { label: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (itemDateStr === todayStr) {
      return { label: 'Due Today', color: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' };
    }
    return { label: 'Scheduled', color: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  return (
    <div
      id="student-responses-spreadsheet-page"
      className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[750px]"
    >
      {/* 1. TOP HEADER BRANDING */}
      <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5821F] bg-[#F5821F]/10 px-2.5 py-0.5 rounded border border-[#F5821F]/20">
                Authorized Staff Portal
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Firestore Sync
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 font-display">
              PATHFINDER INTERNATIONAL EDUCATION
            </h1>
            <p className="text-sm font-semibold text-slate-300 mt-0.5">
              Student Responses Spreadsheet &bull; CRM Database
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center">
            {/* Refresh Button */}
            <button
              type="button"
              id="btn-refresh-responses"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 text-xs font-semibold"
              title="Fetch latest student responses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F5821F]' : ''}`} />
              Refresh
            </button>

            {/* Export Excel Dropdown */}
            <div className="relative">
              <button
                type="button"
                id="btn-export-excel-menu"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-fadeIn">
                  <button
                    type="button"
                    onClick={handleExportAll}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Export All Responses</span>
                    <span className="font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {students.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportFiltered}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center justify-between border-t border-slate-100"
                  >
                    <span>Export Filtered ({filteredStudents.length})</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                      .xlsx
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. EXACT REQUIRED KPI STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800">
          {/* Total Responses */}
          <button
            type="button"
            id="kpi-total-responses"
            onClick={() => {
              setFilterStatus('');
              setActiveQuickTab('all');
            }}
            className={`p-3 rounded-xl text-left transition-all border ${
              !filterStatus && activeQuickTab === 'all'
                ? 'bg-slate-800 border-[#0066A6] shadow-xs'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-400 block">Total Responses</span>
            <span className="text-2xl font-black text-white font-mono">{kpiStats.total}</span>
          </button>

          {/* New */}
          <button
            type="button"
            id="kpi-new-responses"
            onClick={() => {
              setFilterStatus('New');
              setActiveQuickTab('all');
            }}
            className={`p-3 rounded-xl text-left transition-all border ${
              filterStatus === 'New'
                ? 'bg-blue-950/60 border-blue-400 shadow-xs'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-300">New</span>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <span className="text-2xl font-black text-white font-mono">{kpiStats.newCount}</span>
          </button>

          {/* Contacted */}
          <button
            type="button"
            id="kpi-contacted-responses"
            onClick={() => {
              setFilterStatus('Contacted');
              setActiveQuickTab('all');
            }}
            className={`p-3 rounded-xl text-left transition-all border ${
              filterStatus === 'Contacted'
                ? 'bg-cyan-950/60 border-cyan-400 shadow-xs'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-300">Contacted</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <span className="text-2xl font-black text-white font-mono">{kpiStats.contactedCount}</span>
          </button>

          {/* Counselled */}
          <button
            type="button"
            id="kpi-counselled-responses"
            onClick={() => {
              setFilterStatus('Counselled');
              setActiveQuickTab('all');
            }}
            className={`p-3 rounded-xl text-left transition-all border ${
              filterStatus === 'Counselled'
                ? 'bg-indigo-950/60 border-indigo-400 shadow-xs'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-300">Counselled</span>
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            </div>
            <span className="text-2xl font-black text-white font-mono">{kpiStats.counselledCount}</span>
          </button>

          {/* Applications */}
          <button
            type="button"
            id="kpi-applications-responses"
            onClick={() => {
              setFilterStatus('Applications');
              setActiveQuickTab('all');
            }}
            className={`p-3 rounded-xl text-left transition-all border col-span-2 sm:col-span-1 ${
              filterStatus === 'Applications'
                ? 'bg-emerald-950/60 border-emerald-400 shadow-xs'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-300">Applications</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-2xl font-black text-white font-mono">{kpiStats.applicationsCount}</span>
          </button>
        </div>
      </div>

      {/* 3. SEARCH, FILTERS & CONTROLS TOOLBAR */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
        {/* Quick Tabs: All vs Due Follow-ups */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              id="tab-all-responses"
              onClick={() => setActiveQuickTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeQuickTab === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Responses ({students.length})
            </button>
            <button
              type="button"
              id="tab-followups-due"
              onClick={() => setActiveQuickTab('followups')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeQuickTab === 'followups'
                  ? 'bg-white text-amber-800 shadow-xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Follow-ups Due Today / Overdue ({kpiStats.followupsDueCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Column Selector */}
            <div className="relative">
              <button
                type="button"
                id="btn-toggle-columns-dropdown"
                onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Columns className="w-3.5 h-3.5 text-slate-500" />
                Columns ({visibleColumnIds.size}/{ALL_COLUMNS.length})
              </button>

              {isColumnDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-fadeIn max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800">Visible Columns</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleColumnIds(new Set(ALL_COLUMNS.map((c) => c.id)))}
                        className="text-[10px] text-[#0066A6] hover:underline font-semibold"
                      >
                        All
                      </button>
                      <span className="text-slate-300">&bull;</span>
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleColumnIds(
                            new Set([
                              'no',
                              'timestamp',
                              'leadId',
                              'name',
                              'mobile',
                              'email',
                              'country',
                              'program',
                              'status',
                              'followUpDate',
                              'pdf',
                              'notes',
                            ])
                          )
                        }
                        className="text-[10px] text-slate-500 hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {ALL_COLUMNS.map((col) => {
                      const isChecked = visibleColumnIds.has(col.id);
                      return (
                        <label
                          key={col.id}
                          className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(visibleColumnIds);
                              if (e.target.checked) next.add(col.id);
                              else if (next.size > 1) next.delete(col.id);
                              setVisibleColumnIds(next);
                            }}
                            className="rounded border-slate-300 text-[#0066A6] focus:ring-[#0066A6]"
                          />
                          <span className="text-[11px] text-slate-700">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                id="btn-clear-all-filters"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Row: Prominent Search + Status + Country + Program + Education + Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Prominent Search Bar */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              id="input-search-spreadsheet"
              placeholder="Search students (Name, Lead ID, Phone, Email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0066A6] transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="select-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
            >
              <option value="">All Statuses</option>
              {ALL_STUDENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <select
              id="select-filter-country"
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
            >
              <option value="">All Countries</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Education Level Filter */}
          <div>
            <select
              id="select-filter-education"
              value={filterEducationLevel}
              onChange={(e) => setFilterEducationLevel(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
            >
              <option value="">All Education</option>
              <option value="Master">Master Completed</option>
              <option value="Bachelor">Bachelor Completed</option>
              <option value="+2 / CTEVT / A-Level">+2 / CTEVT / A-Level</option>
              <option value="SEE">SEE Completed</option>
            </select>
          </div>

          {/* Submission Date Filter */}
          <div>
            <select
              id="select-filter-date"
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Rows Counter & View Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-bold text-slate-800">{filteredStudents.length}</span> of{' '}
              <span className="font-bold text-slate-800">{students.length}</span> student responses
            </span>
            {hasActiveFilters && (
              <span className="text-[10px] bg-blue-100 text-[#0066A6] font-bold px-2 py-0.5 rounded-full">
                Filtered Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 font-medium"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. SPREADSHEET TABLE CONTAINER */}
      <div className="relative flex-1 overflow-x-auto overflow-y-auto max-h-[620px] font-sans text-xs bg-white">
        <table className="w-full text-left border-collapse border border-slate-200 min-w-max">
          {/* Header Row (Sticky) */}
          <thead className="sticky top-0 z-20 bg-slate-100 shadow-2xs border-b border-slate-300 text-slate-700 font-bold uppercase text-[10.5px] select-none tracking-wider">
            <tr>
              {/* STICKY COLUMN 1: No. */}
              {visibleColumnIds.has('no') && (
                <th className="py-2.5 px-3 border-r border-slate-300 bg-slate-200 text-slate-700 text-center w-12 sticky left-0 z-30 shadow-xs">
                  #
                </th>
              )}

              {/* STICKY COLUMN 2: Timestamp */}
              {visibleColumnIds.has('timestamp') && (
                <th className="py-2.5 px-3 border-r border-slate-300 bg-slate-100 text-slate-700 w-36 sticky left-12 z-30 shadow-xs">
                  Timestamp
                </th>
              )}

              {/* STICKY COLUMN 3: Lead ID */}
              {visibleColumnIds.has('leadId') && (
                <th className="py-2.5 px-3 border-r border-slate-300 bg-slate-100 text-[#0066A6] w-32 sticky left-48 z-30 shadow-xs">
                  Lead ID
                </th>
              )}

              {/* STICKY COLUMN 4: Name */}
              {visibleColumnIds.has('name') && (
                <th className="py-2.5 px-3 border-r border-slate-300 bg-slate-100 text-slate-900 w-44 sticky left-80 z-30 shadow-xs">
                  Name
                </th>
              )}

              {/* SCROLLABLE COLUMNS */}
              {visibleColumnIds.has('guardianName') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[150px]">
                  Guardian's Name
                </th>
              )}
              {visibleColumnIds.has('guardianContact') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[150px]">
                  Guardian Contact
                </th>
              )}
              {visibleColumnIds.has('dob') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[110px]">
                  Date of Birth
                </th>
              )}
              {visibleColumnIds.has('gender') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[80px]">
                  Gender
                </th>
              )}
              {visibleColumnIds.has('maritalStatus') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[100px]">
                  Marital
                </th>
              )}
              {visibleColumnIds.has('mobile') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[130px]">
                  Mobile Number
                </th>
              )}
              {visibleColumnIds.has('email') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[190px]">
                  Email Address
                </th>
              )}
              {visibleColumnIds.has('address') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[200px]">
                  Address
                </th>
              )}
              {visibleColumnIds.has('photo') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[100px] text-center">
                  Profile Photo
                </th>
              )}
              {visibleColumnIds.has('seeScore') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[110px]">
                  SEE Score/GPA
                </th>
              )}
              {visibleColumnIds.has('seeInstitution') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[180px]">
                  SEE Institution
                </th>
              )}
              {visibleColumnIds.has('seeYear') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[110px]">
                  SEE Passed Year
                </th>
              )}
              {visibleColumnIds.has('higherSecondaryScore') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[160px]">
                  CTEVT/+2 Score
                </th>
              )}
              {visibleColumnIds.has('higherSecondaryInstitution') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[200px]">
                  CTEVT/+2 Institution
                </th>
              )}
              {visibleColumnIds.has('higherSecondaryYear') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[160px]">
                  CTEVT/+2 Passed Year
                </th>
              )}
              {visibleColumnIds.has('bachelorScore') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[140px]">
                  Bachelor Score
                </th>
              )}
              {visibleColumnIds.has('bachelorInstitution') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[200px]">
                  Bachelor Institution
                </th>
              )}
              {visibleColumnIds.has('bachelorYear') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[140px]">
                  Bachelor Passed Year
                </th>
              )}
              {visibleColumnIds.has('masterScore') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[130px]">
                  Master Score
                </th>
              )}
              {visibleColumnIds.has('masterInstitution') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[190px]">
                  Master Institution
                </th>
              )}
              {visibleColumnIds.has('masterYear') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[130px]">
                  Master Passed Year
                </th>
              )}
              {visibleColumnIds.has('workExp') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[180px]">
                  Work Experience
                </th>
              )}
              {visibleColumnIds.has('educationGap') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[110px]">
                  Education Gap
                </th>
              )}
              {visibleColumnIds.has('gapDuration') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[120px]">
                  Gap Duration
                </th>
              )}
              {visibleColumnIds.has('program') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[180px]">
                  Choice of Program
                </th>
              )}
              {visibleColumnIds.has('country') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[130px]">
                  Interested Country
                </th>
              )}
              {visibleColumnIds.has('prevApp') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[160px]">
                  Previous Country App
                </th>
              )}
              {visibleColumnIds.has('appliedCountry') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[140px]">
                  Applied Country
                </th>
              )}
              {visibleColumnIds.has('testsTaken') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[120px]">
                  Tests Taken
                </th>
              )}
              {visibleColumnIds.has('testScore') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[150px]">
                  Test Score
                </th>
              )}
              {visibleColumnIds.has('questionType') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[180px]">
                  Question Type
                </th>
              )}
              {visibleColumnIds.has('source') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[180px]">
                  Source
                </th>
              )}
              {visibleColumnIds.has('status') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[165px]">
                  Status
                </th>
              )}
              {visibleColumnIds.has('emailNotification') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[140px]">
                  Email Status
                </th>
              )}
              {visibleColumnIds.has('followUpDate') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[140px]">
                  Follow-up Date
                </th>
              )}
              {visibleColumnIds.has('pdf') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[110px] text-center">
                  PDF
                </th>
              )}
              {visibleColumnIds.has('notes') && (
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 min-w-[180px]">
                  Notes
                </th>
              )}

              {/* STICKY RIGHT COLUMN: ACTIONS */}
              <th className="py-2.5 px-3 border-l border-slate-300 bg-slate-200 text-slate-800 text-center w-36 sticky right-0 z-30 shadow-xs">
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {loading && students.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnIds.size + 1}
                  className="py-20 text-center text-slate-500 bg-white"
                >
                  <RefreshCw className="w-9 h-9 mx-auto mb-3 animate-spin text-[#0066A6]" />
                  <p className="text-sm font-bold text-slate-800">Loading student applications...</p>
                  <p className="text-xs text-slate-500 mt-1">Retrieving shared applications from Firestore database</p>
                </td>
              </tr>
            ) : error && students.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnIds.size + 1}
                  className="py-20 text-center text-rose-700 bg-rose-50/50"
                >
                  <AlertTriangle className="w-9 h-9 mx-auto mb-3 text-rose-500" />
                  <p className="text-sm font-bold text-rose-900">Failed to load student applications</p>
                  <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">{error}</p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#0066A6] text-white text-xs font-bold shadow-xs hover:bg-[#004F82] transition-colors"
                  >
                    Retry Firestore Fetch
                  </button>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnIds.size + 1}
                  className="py-20 text-center text-slate-500 bg-white"
                >
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-base font-bold text-slate-800">No student applications submitted yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto leading-relaxed">
                    When a student submits their enquiry through the public Student Counselling &amp; Enquiry Form, their complete application will appear here immediately in real time.
                  </p>
                </td>
              </tr>
            ) : paginatedStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnIds.size + 1}
                  className="py-16 text-center text-slate-400 bg-slate-50/50"
                >
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No matching student responses found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting search keywords or clearing active filters.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-[#0066A6] text-white text-xs font-bold"
                    >
                      Reset All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                const followUpInfo = getFollowUpStatus(student.followUpDate);
                const latestNote =
                  student.counsellingNotes ||
                  student.activityHistory?.find((a) => a.type === 'note')?.description ||
                  '';

                return (
                  <tr
                    key={student.id || student.leadId}
                    className={`transition-colors group cursor-pointer ${
                      student.unread === true
                        ? 'bg-amber-50/30 hover:bg-amber-100/40'
                        : 'hover:bg-blue-50/40'
                    }`}
                    onClick={(e) => {
                      // Avoid opening when clicking directly on interactive inputs
                      const target = e.target as HTMLElement;
                      if (
                        target.tagName === 'SELECT' ||
                        target.tagName === 'BUTTON' ||
                        target.tagName === 'A' ||
                        target.tagName === 'INPUT' ||
                        target.closest('button') ||
                        target.closest('select')
                      ) {
                        return;
                      }
                      onSelectStudent(student);
                    }}
                  >
                    {/* STICKY COLUMN 1: No. */}
                    {visibleColumnIds.has('no') && (
                      <td className="py-2 px-2.5 border-r border-slate-200 bg-slate-50 group-hover:bg-blue-50/60 text-center font-mono font-bold text-slate-500 sticky left-0 z-10">
                        {globalIndex}
                      </td>
                    )}

                    {/* STICKY COLUMN 2: Timestamp */}
                    {visibleColumnIds.has('timestamp') && (
                      <td className="py-2 px-3 border-r border-slate-200 bg-white group-hover:bg-blue-50/60 font-mono text-[11px] text-slate-600 whitespace-nowrap sticky left-12 z-10">
                        {student.submittedAtFormatted ||
                          new Date(student.submittedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                      </td>
                    )}

                    {/* STICKY COLUMN 3: Lead ID */}
                    {visibleColumnIds.has('leadId') && (
                      <td className="py-2 px-3 border-r border-slate-200 bg-white group-hover:bg-blue-50/60 font-mono font-bold text-[#0066A6] whitespace-nowrap sticky left-48 z-10">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-50 text-[#0066A6] px-2 py-0.5 rounded border border-blue-200">
                            {student.leadId}
                          </span>
                          {student.unread === true && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#F5821F] text-white shadow-2xs shrink-0 animate-pulse"
                              title="New unread application"
                            >
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* STICKY COLUMN 4: Name */}
                    {visibleColumnIds.has('name') && (
                      <td className="py-2 px-3 border-r border-slate-200 bg-white group-hover:bg-blue-50/60 font-semibold text-slate-900 whitespace-nowrap sticky left-80 z-10">
                        <div className="flex items-center gap-2">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.fullName}
                              className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200 cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPhoto({
                                  url: student.photoUrl,
                                  name: student.fullName,
                                  leadId: student.leadId,
                                });
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 text-[10px] font-bold">
                              {student.fullName.charAt(0)}
                            </div>
                          )}
                          <span className="truncate max-w-[130px]" title={student.fullName}>
                            {student.fullName}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* SCROLLABLE COLUMNS */}
                    {visibleColumnIds.has('guardianName') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        {student.guardianName || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('guardianContact') && (
                      <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] whitespace-nowrap">
                        {student.guardianContactNumber || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('dob') && (
                      <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] whitespace-nowrap">
                        {student.dateOfBirth || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('gender') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        {student.gender || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('maritalStatus') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        {student.maritalStatus || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('mobile') && (
                      <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] whitespace-nowrap">
                        <a
                          href={`tel:${student.mobileNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#0066A6] hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {student.mobileNumber}
                        </a>
                      </td>
                    )}
                    {visibleColumnIds.has('email') && (
                      <td className="py-2 px-3 border-r border-slate-200 text-[11px] whitespace-nowrap">
                        <a
                          href={`mailto:${student.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#0066A6] hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </a>
                      </td>
                    )}
                    {visibleColumnIds.has('address') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[200px]" title={student.address}>
                        {student.address || '—'}
                      </td>
                    )}

                    {/* Profile Photo Thumbnail with Click to Preview */}
                    {visibleColumnIds.has('photo') && (
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        {student.photoUrl ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhoto({
                                url: student.photoUrl,
                                name: student.fullName,
                                leadId: student.leadId,
                              });
                            }}
                            className="inline-block p-0.5 rounded-full ring-1 ring-slate-200 hover:ring-[#0066A6] transition-all"
                            title="Click to view full photo"
                          >
                            <img
                              src={student.photoUrl}
                              alt={student.fullName}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">None</span>
                        )}
                      </td>
                    )}

                    {/* Academic Information */}
                    {visibleColumnIds.has('seeScore') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.see?.scoreOrGpa || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('seeInstitution') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[180px]" title={student.academicDetails?.see?.institutionNameAddress}>
                        {student.academicDetails?.see?.institutionNameAddress || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('seeYear') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.see?.passedYear || '—'}
                      </td>
                    )}

                    {visibleColumnIds.has('higherSecondaryScore') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.higherSecondary?.scoreOrGpa || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('higherSecondaryInstitution') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[200px]" title={student.academicDetails?.higherSecondary?.institutionNameAddress}>
                        {student.academicDetails?.higherSecondary?.institutionNameAddress || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('higherSecondaryYear') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.higherSecondary?.passedYear || '—'}
                      </td>
                    )}

                    {visibleColumnIds.has('bachelorScore') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.bachelor?.scoreOrGpa || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('bachelorInstitution') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[200px]" title={student.academicDetails?.bachelor?.institutionNameAddress}>
                        {student.academicDetails?.bachelor?.institutionNameAddress || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('bachelorYear') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.bachelor?.passedYear || '—'}
                      </td>
                    )}

                    {visibleColumnIds.has('masterScore') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.master?.scoreOrGpa || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('masterInstitution') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[190px]" title={student.academicDetails?.master?.institutionNameAddress}>
                        {student.academicDetails?.master?.institutionNameAddress || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('masterYear') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap font-mono">
                        {student.academicDetails?.master?.passedYear || '—'}
                      </td>
                    )}

                    {/* Work & Gap */}
                    {visibleColumnIds.has('workExp') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[180px]" title={student.workExperience}>
                        {student.workExperience || 'None'}
                      </td>
                    )}
                    {visibleColumnIds.has('educationGap') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.hasEducationGap === 'Yes'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {student.hasEducationGap || 'No'}
                        </span>
                      </td>
                    )}
                    {visibleColumnIds.has('gapDuration') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        {student.educationGapDuration || '—'}
                      </td>
                    )}

                    {/* Preferences & Tests */}
                    {visibleColumnIds.has('program') && (
                      <td className="py-2 px-3 border-r border-slate-200 font-medium truncate max-w-[180px]" title={student.choiceOfProgram}>
                        {student.choiceOfProgram || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('country') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {student.interestedCountry || '—'}
                        </span>
                      </td>
                    )}
                    {visibleColumnIds.has('prevApp') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        {student.hasAppliedOtherCountries || 'No'}
                      </td>
                    )}
                    {visibleColumnIds.has('appliedCountry') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[140px]" title={student.previousCountriesApplied}>
                        {student.previousCountriesApplied || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('testsTaken') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        {student.testsTaken?.length ? student.testsTaken.join(', ') : 'None'}
                      </td>
                    )}
                    {visibleColumnIds.has('testScore') && (
                      <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] truncate max-w-[150px]" title={student.testScore}>
                        {student.testScore || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('questionType') && (
                      <td className="py-2 px-3 border-r border-slate-200 truncate max-w-[180px]" title={student.questionType}>
                        {student.questionType || '—'}
                      </td>
                    )}
                    {visibleColumnIds.has('source') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-slate-500">
                        {student.howDidYouKnow || 'Direct'}
                      </td>
                    )}

                    {/* STATUS DROPDOWN (Direct inline changer as requested) */}
                    {visibleColumnIds.has('status') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={student.status}
                          onChange={(e) => handleInlineStatusChange(student, e.target.value as StudentStatus)}
                          className={`text-[11px] font-bold py-1 px-2 rounded-lg border focus:outline-hidden cursor-pointer shadow-2xs transition-all ${getStatusBadgeStyle(
                            student.status
                          )}`}
                        >
                          {ALL_STUDENT_STATUSES.map((st) => (
                            <option key={st} value={st} className="bg-white text-slate-900 font-normal">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* EMAIL NOTIFICATION STATUS */}
                    {visibleColumnIds.has('emailNotification') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {student.notificationStatus === 'sent' || student.emailStatus === 'SENT' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                            title={`Dispatched to: ${student.emailRecipient || (student.notificationRecipients && student.notificationRecipients.length > 0 ? student.notificationRecipients.join(', ') : 'Staff')}${student.notificationSentAt || student.emailSentAt ? ` at ${new Date(student.notificationSentAt || student.emailSentAt || '').toLocaleString()}` : ''}`}
                          >
                            <MailCheck className="w-3 h-3 text-emerald-600" />
                            <span>Sent</span>
                          </span>
                        ) : student.notificationStatus === 'pending' || student.emailStatus === 'PENDING' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                            title="Notification is queued or being processed"
                          >
                            <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectStudent(student)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300 transition-colors"
                            title={student.notificationError || student.emailError || 'Email delivery failed. Click to view exact error and resend.'}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Failed</span>
                          </button>
                        )}
                      </td>
                    )}

                    {/* FOLLOW-UP DATE (With Overdue / Due Today highlight) */}
                    {visibleColumnIds.has('followUpDate') && (
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {student.followUpDate ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setFollowUpPickerStudent(student);
                                setNewFollowUpDate(student.followUpDate || '');
                              }}
                              className={`px-2 py-0.5 rounded text-[10.5px] border flex items-center gap-1 hover:brightness-95 transition-all ${
                                followUpInfo?.color || 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                              title="Click to change follow-up date"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{student.followUpDate.slice(0, 10)}</span>
                              {followUpInfo?.label !== 'Scheduled' && (
                                <span className="text-[9px] font-bold uppercase ml-0.5">
                                  ({followUpInfo?.label})
                                </span>
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setFollowUpPickerStudent(student);
                              setNewFollowUpDate('');
                            }}
                            className="text-[10px] text-slate-400 hover:text-[#0066A6] font-medium"
                          >
                            + Set Date
                          </button>
                        )}
                      </td>
                    )}

                    {/* PDF BUTTON (View & Download) */}
                    {visibleColumnIds.has('pdf') && (
                      <td className="py-2 px-3 border-r border-slate-200 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenPdfPreview(student)}
                            className="p-1 rounded bg-blue-50 text-[#0066A6] hover:bg-blue-100 transition-colors border border-blue-200"
                            title="Preview PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadStudentPDF(student)}
                            className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
                            title="Download PDF (.pdf)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}

                    {/* NOTES (Latest preview & Click to add note) */}
                    {visibleColumnIds.has('notes') && (
                      <td className="py-2 px-3 border-r border-slate-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-1 max-w-[200px]">
                          <span
                            className="truncate text-[11px] text-slate-600"
                            title={latestNote || 'No notes yet'}
                          >
                            {latestNote || <span className="text-slate-400 italic">No notes</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickNoteStudent(student);
                              setQuickNoteText('');
                            }}
                            className="p-1 text-slate-400 hover:text-[#0066A6] rounded hover:bg-blue-50 shrink-0"
                            title="Add internal note"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}

                    {/* STICKY RIGHT ACTIONS: View, PDF, Edit, Delete */}
                    <td
                      className="py-2 px-3 border-l border-slate-300 bg-slate-50 group-hover:bg-blue-50/70 text-center whitespace-nowrap sticky right-0 z-10 shadow-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {/* View */}
                        <button
                          type="button"
                          id={`action-view-${student.leadId}`}
                          onClick={() => onSelectStudent(student)}
                          className="p-1.5 rounded-md text-slate-600 hover:text-[#0066A6] hover:bg-white transition-colors"
                          title="View Complete Response Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* PDF */}
                        <button
                          type="button"
                          id={`action-pdf-${student.leadId}`}
                          onClick={() => handleOpenPdfPreview(student)}
                          className="p-1.5 rounded-md text-slate-600 hover:text-[#0066A6] hover:bg-white transition-colors"
                          title="View PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          id={`action-edit-${student.leadId}`}
                          onClick={() => setEditingStudent(student)}
                          className="p-1.5 rounded-md text-slate-600 hover:text-amber-600 hover:bg-white transition-colors"
                          title="Edit Response"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          id={`action-delete-${student.leadId}`}
                          onClick={() => setStudentToDelete(student)}
                          className="p-1.5 rounded-md text-slate-600 hover:text-rose-600 hover:bg-white transition-colors"
                          title="Delete Response"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM PAGINATION TOOLBAR */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredStudents.length ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-bold text-slate-800">
            {Math.min(currentPage * pageSize, filteredStudents.length)}
          </span>{' '}
          of <span className="font-bold text-slate-800">{filteredStudents.length}</span> responses
        </div>

        {/* Page Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 font-mono">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. MODALS & OVERLAYS */}
      {/* ======================================================== */}

      {/* A. PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{previewPhoto.name}</p>
                <p className="text-xs text-[#F5821F] font-mono">{previewPhoto.leadId}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-100">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="max-h-80 w-auto rounded-lg shadow-sm object-contain"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
              <a
                href={previewPhoto.url}
                target="_blank"
                rel="noreferrer"
                download={`Photo_${previewPhoto.leadId}.jpg`}
                className="px-3 py-1.5 bg-[#0066A6] text-white rounded-lg text-xs font-bold hover:bg-[#004F82] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Original
              </a>
            </div>
          </div>
        </div>
      )}

      {/* B. PDF IN-APP PREVIEW MODAL */}
      {pdfPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setPdfPreviewModal(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0066A6] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">
                    {pdfPreviewModal.filename}
                  </h3>
                  <p className="text-xs text-blue-100">
                    Official Student Application Summary Document
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadStudentPDF(pdfPreviewModal.student)}
                  className="px-3 py-1.5 bg-white text-[#0066A6] hover:bg-blue-50 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPdfPreviewModal(null)}
                  className="p-1.5 text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={pdfPreviewModal.dataUri}
                title={pdfPreviewModal.filename}
                className="w-full h-full rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* C. QUICK NOTE MODAL */}
      {quickNoteStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setQuickNoteStudent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#F5821F]" />
                <h3 className="font-bold text-sm">
                  Add Internal Note: {quickNoteStudent.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickNoteStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs text-slate-500 font-mono block mb-1">
                  Lead Reference: {quickNoteStudent.leadId}
                </span>
                {quickNoteStudent.counsellingNotes && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 mb-3">
                    <span className="font-semibold text-slate-500 block text-[10px] uppercase">
                      Previous Note:
                    </span>
                    {quickNoteStudent.counsellingNotes}
                  </div>
                )}
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Staff Counselling Note
                </label>
                <textarea
                  rows={4}
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Type internal remarks, counselling outcomes, university recommendations, or follow-up notes..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickNoteStudent(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickNote}
                  disabled={!quickNoteText.trim()}
                  className="px-4 py-2 bg-[#0066A6] hover:bg-[#004F82] text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. FOLLOW-UP PICKER MODAL */}
      {followUpPickerStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setFollowUpPickerStudent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F5821F]" />
                <h3 className="font-bold text-sm">Schedule Follow-up</h3>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpPickerStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {followUpPickerStudent.fullName} ({followUpPickerStudent.leadId})
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select target date &amp; time for admissions staff consultation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Follow-up Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={newFollowUpDate}
                  onChange={(e) => setNewFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(11, 0, 0, 0);
                    setNewFollowUpDate(d.toISOString().slice(0, 16));
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700"
                >
                  Tomorrow 11:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    d.setHours(14, 30, 0, 0);
                    setNewFollowUpDate(d.toISOString().slice(0, 16));
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700"
                >
                  In 3 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    d.setHours(11, 0, 0, 0);
                    setNewFollowUpDate(d.toISOString().slice(0, 16));
                  }}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700"
                >
                  In 1 Week
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFollowUpPickerStudent(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFollowUpDate}
                  disabled={!newFollowUpDate}
                  className="px-4 py-2 bg-[#0066A6] hover:bg-[#004F82] text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E. QUICK EDIT STUDENT MODAL */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setEditingStudent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#F5821F]" />
                <h3 className="font-bold text-sm">
                  Quick Edit: {editingStudent.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingStudent.id) return;
                try {
                  await updateStudent(editingStudent.id, editingStudent, {
                    title: 'Student Details Updated',
                    description: 'Staff updated contact & preference information in response table.',
                    author: staffName,
                    type: 'status_change',
                  });
                  showToast(`Changes saved for ${editingStudent.fullName}`);
                  setEditingStudent(null);
                } catch (err) {
                  console.error(err);
                  showToast('Failed to save edits', 'error');
                }
              }}
              className="p-5 space-y-4 overflow-y-auto flex-1 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, status: e.target.value as StudentStatus })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {ALL_STUDENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Follow-up Date</label>
                  <input
                    type="datetime-local"
                    value={editingStudent.followUpDate || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, followUpDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={editingStudent.mobileNumber}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, mobileNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingStudent.email}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interested Country</label>
                  <input
                    type="text"
                    value={editingStudent.interestedCountry}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, interestedCountry: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Choice of Program</label>
                  <input
                    type="text"
                    value={editingStudent.choiceOfProgram}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, choiceOfProgram: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Counselling Notes</label>
                <textarea
                  rows={3}
                  value={editingStudent.counsellingNotes || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, counsellingNotes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0066A6] text-white rounded-lg font-bold hover:bg-[#004F82]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* F. DELETE CONFIRMATION MODAL */}
      {studentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setStudentToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Student Response?
              </h3>
              <p className="text-xs text-slate-600 mt-2">
                Are you sure you want to permanently remove the response for{' '}
                <span className="font-bold text-slate-800">{studentToDelete.fullName}</span> (
                <span className="font-mono text-[#0066A6]">{studentToDelete.leadId}</span>)?
              </p>
              <p className="text-[11px] text-rose-500 font-semibold mt-1">
                This will delete the enquiry record from Firestore database.
              </p>

              <div className="flex items-center justify-center gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                >
                  Yes, Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* G. TOAST NOTIFICATION */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              feedbackToast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {feedbackToast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{feedbackToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
