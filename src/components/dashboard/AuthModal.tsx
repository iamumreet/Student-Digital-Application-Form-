import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Lock, Mail, UserCheck, Key, CheckCircle, AlertOctagon } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithEmail, loginAsAuthorizedStaff, accessDeniedError, clearAccessDenied } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    clearAccessDenied();
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Access Denied: You are not authorized to access the Pathfinder Staff Portal.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantStaffLogin = () => {
    loginAsAuthorizedStaff();
    onClose();
  };

  const displayError = accessDeniedError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        id="counsellor-auth-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="bg-linear-to-r from-[#0066A6] to-[#004F82] p-6 text-white text-center relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-xl leading-none"
          >
            ×
          </button>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Pathfinder Staff Portal</h2>
          <p className="text-xs text-blue-100 mt-1">
            Private Staff Authentication &bull; Student Responses CRM
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Access Denied Alert if unauthorized account */}
          {displayError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-rose-900">Access Denied</strong>
                <p className="mt-1 text-rose-700 font-medium">
                  You are not authorized to access the Pathfinder Staff Portal.
                </p>
              </div>
            </div>
          )}

          {/* Quick Authorized Staff Access */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Key className="w-4 h-4 text-[#F5821F]" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Authorized Staff Access
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Restricted to authorized admissions officers to view student enquiry spreadsheets and manage applications.
            </p>
            <button
              type="button"
              id="btn-quick-staff-access"
              onClick={handleInstantStaffLogin}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0066A6] hover:bg-[#004F82] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              Sign In as Authorized Staff
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              Or Sign In with Staff Account
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Staff Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter authorized staff email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter staff password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:border-[#0066A6]"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="btn-submit-auth"
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              {loading ? (
                'Verifying authorization...'
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Sign In to Staff Portal
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
