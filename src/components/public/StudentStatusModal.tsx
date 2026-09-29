import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  GraduationCap,
  Globe,
  FileText,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

interface StudentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLeadId?: string;
}

interface StatusCheckResult {
  applicationId: string;
  studentName: string;
  maskedEmail: string;
  interestedCountry: string;
  choiceOfProgram: string;
  submittedAt: string;
  currentStatus: string;
  statusHistory: Array<{
    date: string;
    status: string;
    message?: string;
  }>;
}

const STAGES = [
  { id: 'enquiry', label: 'Enquiry Received', match: ['NEW ENQUIRY', 'New Enquiry', 'New'] },
  { id: 'review', label: 'Under Review', match: ['UNDER REVIEW', 'Contacted', 'Counselling Completed', 'Counselled'] },
  { id: 'docs', label: 'Documents / In Progress', match: ['DOCUMENTS REQUIRED', 'Documents Pending', 'APPLICATION IN PROGRESS', 'Application Started'] },
  { id: 'offer', label: 'Offer Received', match: ['OFFER RECEIVED', 'University Shortlisted'] },
  { id: 'visa', label: 'Visa Processing', match: ['VISA PROCESSING'] },
  { id: 'granted', label: 'Visa Granted / Completed', match: ['VISA GRANTED', 'COMPLETED'] },
];

export const StudentStatusModal: React.FC<StudentStatusModalProps> = ({
  isOpen,
  onClose,
  initialLeadId = '',
}) => {
  const [applicationId, setApplicationId] = useState(initialLeadId);
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<StatusCheckResult | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId.trim() || !identifier.trim()) {
      setErrorMsg('Please enter both your Application ID and registered Email or Mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch('/api/student/status-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: applicationId.trim(),
          identifier: identifier.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setErrorMsg(
          data?.error ||
            'Could not find an application with the provided credentials. Please verify your Reference ID and Email/Mobile.'
        );
        return;
      }

      setResult(data.student);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Network error communicating with the status check service.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setErrorMsg(null);
  };

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('GRANTED') || s.includes('COMPLETED')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s.includes('REQUIRED') || s.includes('PENDING')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (s.includes('PROGRESS') || s.includes('STARTED')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (s.includes('OFFER')) return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    if (s.includes('VISA')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (s.includes('NOT ELIGIBLE') || s.includes('CLOSED')) return 'bg-rose-100 text-rose-800 border-rose-300';
    return 'bg-blue-100 text-[#0066A6] border-blue-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0066A6] to-[#004D7D] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Search className="w-5 h-5 text-[#F5821F]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
                Track Application Status
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Pathfinder International Education &bull; Putalisadak, Kathmandu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!result ? (
            /* Search Form */
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#0066A6] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-[#0066A6]">Secure Application Verification:</span>
                  <p className="mt-0.5 text-slate-600">
                    To safeguard student privacy, please enter both your <strong>Application / Lead Reference ID</strong> (e.g. <code>PF-2026-000001</code>) and your registered <strong>Email Address</strong> or <strong>Mobile Number</strong>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Application / Lead Reference ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PF-2026-000001"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:border-[#0066A6] uppercase placeholder:font-sans placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Registered Email Address or Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@gmail.com or 9841XXXXXX"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-[#0066A6]"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[#0066A6] hover:bg-[#004F82] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Verifying Application Status...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Check Application Status</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Status Results Display */
            <div className="space-y-5 animate-fadeIn">
              {/* Application Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Student Full Name
                    </span>
                    <h3 className="text-lg font-black text-slate-900">{result.studentName}</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Lead Reference ID
                    </span>
                    <span className="font-mono text-sm font-black text-[#0066A6] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {result.applicationId}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Destination</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Globe className="w-3.5 h-3.5 text-[#0066A6]" />
                      {result.interestedCountry}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Program</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#F5821F]" />
                      {result.choiceOfProgram}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Submitted</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(result.submittedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Status Highlight */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Current Application Status
                  </span>
                  <span
                    className={`inline-block text-sm font-extrabold px-3.5 py-1 rounded-full border uppercase tracking-wide ${getStatusColor(
                      result.currentStatus
                    )}`}
                  >
                    {result.currentStatus}
                  </span>
                </div>

                <div className="text-xs text-slate-500 max-w-xs text-center sm:text-right">
                  Updates are emailed automatically to{' '}
                  <strong className="text-slate-700">{result.maskedEmail}</strong>.
                </div>
              </div>

              {/* Status Update History */}
              {result.statusHistory && result.statusHistory.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-[#0066A6]" />
                    Status Update History
                  </h4>

                  <div className="space-y-3 pt-1">
                    {result.statusHistory.map((item, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] border ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.date).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {item.message && (
                          <div className="mt-2 p-2 bg-white rounded border-l-2 border-[#F5821F] text-slate-700 text-[11px]">
                            <strong className="text-amber-800 block text-[10px]">Message from Pathfinder:</strong>
                            <p className="whitespace-pre-wrap mt-0.5">{item.message}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Assistance Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 block">Need further assistance with your application?</span>
                  <span className="text-slate-500 text-[11px]">Visit our office in Putalisadak or reach out to our counselling team.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="tel:015361805"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-[11px]"
                  >
                    <Phone className="w-3 h-3 text-[#F5821F]" />
                    01-5361805
                  </a>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0066A6] text-white font-bold hover:bg-[#004F82] text-[11px]"
                  >
                    Check Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-slate-500">
            Pathfinder International Education &bull; Admissions Division
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
