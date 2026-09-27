import React, { useState } from 'react';
import { useAuth, AUTHORIZED_STAFF_PRIMARY_EMAIL } from '../../context/AuthContext';
import { ShieldAlert, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, accessDeniedError, clearAccessDenied } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    clearAccessDenied();
    setError(null);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    clearAccessDenied();
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const msg = err instanceof Error ? err.message : 'Sign-in failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Pathfinder Staff Portal</h2>
          <p className="text-xs text-blue-100 mt-1">
            Private Staff Authentication &bull; Student Enquiry CRM
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
                  {displayError}
                </p>
              </div>
            </div>
          )}

          {/* Access Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <AlertCircle className="w-4 h-4 text-[#0066A6]" />
              <span>Restricted Staff Portal</span>
            </div>
            <p>
              Access to student enquiry records, response spreadsheets, and counselling notes is restricted to authorized Pathfinder International Education staff members.
            </p>
            <div className="pt-1 text-[11px] text-slate-500">
              Authorized Accounts: <span className="font-semibold text-slate-700">Pathfinder Staff &amp; Admissions Accounts</span>
            </div>
          </div>

          {/* Google Sign-In Action */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-google-staff-signin"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:border-[#0066A6] hover:bg-blue-50/40 text-slate-800 font-semibold text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-sm transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0066A6]" />
                  <span>Verifying authorization...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Return to Public Student Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
