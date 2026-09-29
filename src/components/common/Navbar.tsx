import React from 'react';
import { Compass, ShieldCheck, UserCheck, LogIn, ExternalLink, FileText, Lock, Phone, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../dashboard/NotificationBell';
import { StudentRecord } from '../../types/student';

interface NavbarProps {
  currentView: 'student' | 'dashboard';
  onSwitchView: (view: 'student' | 'dashboard') => void;
  onOpenAuthModal: () => void;
  onOpenStatusCheck?: () => void;
  onSelectStudent?: (student: StudentRecord) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSwitchView,
  onOpenAuthModal,
  onOpenStatusCheck,
  onSelectStudent,
}) => {
  const { currentUser, isStaff, logout } = useAuth();

  const handleCounsellorClick = () => {
    if (isStaff) {
      onSwitchView('dashboard');
    } else {
      onOpenAuthModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Official Logo */}
        <div
          id="brand-logo"
          onClick={() => onSwitchView('student')}
          className="flex items-center gap-3 cursor-pointer group py-1"
        >
          <img
            src="/pathfinder-logo.png"
            alt="Pathfinder International Education"
            className="h-10 w-auto max-w-[210px] object-contain group-hover:opacity-95 transition-opacity"
          />
          <div className="hidden lg:block pl-3 border-l border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 tracking-tight block leading-tight uppercase">
              Admissions &amp; Counselling
            </span>
            <span className="text-[10px] text-slate-500 font-medium block leading-tight">
              Putalisadak &bull; 01-5361805 | 01-5361853
            </span>
          </div>
        </div>

        {/* Navigation Switchers & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Switch: Student Form */}
          <button
            type="button"
            id="nav-btn-student-form"
            onClick={() => onSwitchView('student')}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'student'
                ? 'bg-blue-50 text-[#0066A6] border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#0066A6]" />
            <span className="hidden sm:inline">Student</span> Form
          </button>

          {/* Student Status Check Self-Service */}
          {onOpenStatusCheck && (
            <button
              type="button"
              id="nav-btn-check-status"
              onClick={onOpenStatusCheck}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              title="Track your application status"
            >
              <Search className="w-3.5 h-3.5 text-[#F5821F]" />
              <span>Check Status</span>
            </button>
          )}

          {/* View Switch: Staff Portal / Login */}
          <button
            type="button"
            id="nav-btn-counsellor-portal"
            onClick={handleCounsellorClick}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'dashboard'
                ? 'bg-[#0066A6] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {isStaff ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                <span>Staff Portal</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Staff Login</span>
              </>
            )}
          </button>

          {/* If staff user is logged in, show authorized role badge, notification bell, & sign out */}
          {isStaff && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  Authorized Staff
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block leading-tight">
                  Portal Access
                </span>
              </div>

              {/* Clearly visible notification Bell icon: next to Authorized Staff and before Sign Out */}
              <NotificationBell
                theme="light"
                onSelectStudent={onSelectStudent}
                onViewAllApplications={() => onSwitchView('dashboard')}
              />

              <button
                type="button"
                id="nav-btn-staff-sign-out"
                onClick={logout}
                className="text-xs text-slate-400 hover:text-slate-700 ml-1 font-medium transition-colors cursor-pointer"
                title="Sign out of Staff Portal"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
