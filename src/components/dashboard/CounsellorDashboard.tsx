import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  RefreshCw,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { StudentRecord } from '../../types/student';
import {
  getAllStudents,
  subscribeToStudents,
} from '../../services/studentService';
import { exportStudentsToExcel } from '../../services/spreadsheetService';
import { StudentDetailModal } from './StudentDetailModal';
import { ResponseSpreadsheetView } from './ResponseSpreadsheetView';
import { useAuth } from '../../context/AuthContext';

interface CounsellorDashboardProps {
  onSwitchToPublicForm: () => void;
}

export const CounsellorDashboard: React.FC<CounsellorDashboardProps> = ({
  onSwitchToPublicForm,
}) => {
  const { currentUser, logout } = useAuth();

  // Primary Data State
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  // Real-time Firestore sync on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    const init = async () => {
      try {
        const initial = await getAllStudents();
        if (isMounted) {
          setStudents(initial);
          setLoading(false);
          setFetchError(null);
        }
      } catch (e: unknown) {
        console.warn('Initial student fetch:', e);
        if (isMounted) {
          setFetchError(e instanceof Error ? e.message : 'Error retrieving applications from Firestore.');
          setLoading(false);
        }
      }

      // Establish real-time Firestore listener
      const unsubscribe = subscribeToStudents(
        (records) => {
          if (isMounted) {
            setStudents(records);
            setLoading(false);
            setFetchError(null);
          }
        },
        (err: unknown) => {
          console.warn('Firestore subscription status:', err);
          if (isMounted) {
            setFetchError(err instanceof Error ? err.message : 'Real-time sync error.');
            setLoading(false);
          }
        }
      );

      return unsubscribe;
    };

    let unsubFn: (() => void) | undefined;
    init().then((fn) => {
      unsubFn = fn;
    });

    return () => {
      isMounted = false;
      if (unsubFn) unsubFn();
    };
  }, []);

  // Manual refresh trigger
  const handleRefresh = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const records = await getAllStudents();
      setStudents(records);
    } catch (err: unknown) {
      console.error('Error refreshing students:', err);
      setFetchError(err instanceof Error ? err.message : 'Error refreshing applications.');
    } finally {
      setLoading(false);
    }
  };

  // Update a student in state after modal edits
  const handleStudentUpdated = (updated: StudentRecord) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
  };

  return (
    <div id="staff-portal-container" className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* 1. TOP AUTHORIZED ACCESS STRIP */}
      <header className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 sm:px-8 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white tracking-wide">
              Pathfinder International Education &bull; Staff Portal
            </span>
            <span className="hidden md:inline-block text-slate-400 border-l border-slate-700 pl-2">
              Putalisadak, Kathmandu
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 text-slate-400 border-l border-slate-700 pl-2">
              <Phone className="w-3 h-3 text-[#F5821F]" />
              01-5361805 | 01-5361853
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white font-semibold">
                Authorized Staff
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-400/30">
                Staff Portal
              </span>
            </div>

            <button
              type="button"
              id="btn-staff-sign-out"
              onClick={logout}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
              title="Sign out of Staff Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* 2. BRANDED NAVIGATION & QUICK ACTIONS BAR */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="h-10 flex items-center">
              <img
                src="/pathfinder-logo.png"
                alt="Pathfinder International Education"
                className="h-9 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block leading-tight">
                Pathfinder International Education &bull; Staff Portal
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  Student Responses
                </h1>
                <span className="text-[10px] font-bold bg-blue-50 text-[#0066A6] px-2 py-0.5 rounded-full border border-blue-200">
                  Google Forms Style Table
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-export-excel-header"
              onClick={() =>
                exportStudentsToExcel(
                  students,
                  `Pathfinder_Responses_${new Date().toISOString().slice(0, 10)}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export .xlsx
            </button>

            <button
              type="button"
              id="btn-switch-to-student-form"
              onClick={onSwitchToPublicForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0066A6] hover:bg-[#004F82] text-white text-xs font-bold transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Student Form
            </button>
          </div>
        </div>
      </nav>

      {/* 3. MAIN CONTENT: BUILT-IN "STUDENT RESPONSES" RESPONSE SPREADSHEET */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <ResponseSpreadsheetView
          students={students}
          onSelectStudent={(student) => setSelectedStudent(student)}
          onRefresh={handleRefresh}
          loading={loading}
          error={fetchError}
        />
      </main>

      {/* 4. COMPLETE STUDENT RESPONSE PROFILE MODAL / DRAWER */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onStudentUpdated={handleStudentUpdated}
        />
      )}
    </div>
  );
};
