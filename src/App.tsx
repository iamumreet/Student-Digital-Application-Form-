/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { StudentForm } from './components/public/StudentForm';
import { CounsellorDashboard } from './components/dashboard/CounsellorDashboard';
import { AuthModal } from './components/dashboard/AuthModal';

function MainApp() {
  const { isStaff } = useAuth();
  const [currentView, setCurrentView] = useState<'student' | 'dashboard'>('student');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

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
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === 'student' ? (
          <StudentForm />
        ) : isStaff ? (
          <CounsellorDashboard onSwitchToPublicForm={() => handleSwitchView('student')} />
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

      {/* Staff Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          // If staff now logged in, automatically switch to dashboard
          if (localStorage.getItem('pf_staff_demo_user')) {
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
