/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { StudentForm } from './components/public/StudentForm';
import { CounsellorDashboard } from './components/dashboard/CounsellorDashboard';
import { AuthModal } from './components/dashboard/AuthModal';
import { StudentStatusModal } from './components/public/StudentStatusModal';
import { StudentRecord } from './types/student';

function MainApp() {
  const { isStaff, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'student' | 'dashboard'>('student');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentRecord | null>(null);

  // Automatically transition to dashboard when staff signs in
  useEffect(() => {
    if (isStaff && currentView === 'dashboard') {
      setIsAuthModalOpen(false);
    }
  }, [isStaff, currentView]);

  // Support direct linking from staff notification email (e.g. ?view=staff&leadId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isStaffRequested =
      params.get('view') === 'staff' ||
      params.get('view') === 'dashboard' ||
      params.has('leadId') ||
      hash.includes('staff-portal') ||
      hash.includes('counsellor');

    if (isStaffRequested) {
      if (isStaff) {
        setCurrentView('dashboard');
      } else if (!authLoading) {
        setIsAuthModalOpen(true);
      }
    }
  }, [isStaff, authLoading]);

  const handleSwitchView = (view: 'student' | 'dashboard') => {
    if (view === 'dashboard' && !isStaff) {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-[#0066A6] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onSwitchView={handleSwitchView}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenStatusCheck={() => setIsStatusModalOpen(true)}
        onSelectStudent={(student) => {
          setCurrentView('dashboard');
          setSelectedStudentForModal(student);
        }}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === 'student' ? (
          <StudentForm />
        ) : isStaff ? (
          <CounsellorDashboard
            onSwitchToPublicForm={() => handleSwitchView('student')}
            externalSelectedStudent={selectedStudentForModal}
            onClearExternalSelectedStudent={() => setSelectedStudentForModal(null)}
          />
        ) : (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
            <h2 className="text-xl font-bold text-slate-900">Staff Authentication Required</h2>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              The counsellor dashboard is restricted to authorized Pathfinder International Education staff members.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-2.5 rounded-lg bg-[#0066A6] text-white font-bold text-xs hover:bg-[#004F82] transition-colors"
            >
              Sign In as Counsellor
            </button>
          </div>
        )}
      </main>

      {/* Student Self-Service Application Status Modal */}
      <StudentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />

      {/* Staff Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          if (isStaff) {
            setCurrentView('dashboard');
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
