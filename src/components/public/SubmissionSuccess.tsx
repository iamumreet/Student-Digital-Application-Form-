import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Check,
  Download,
  Home,
  Clock,
  Building,
  MapPin,
  PhoneCall,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentRecord } from '../../types/student';
import { downloadStudentPDF } from '../../services/pdfService';

interface SubmissionSuccessProps {
  leadId: string;
  submittedAt: string;
  studentName: string;
  interestedCountry?: string;
  student?: StudentRecord;
  pdfDataUri?: string;
  onReset: () => void;
}

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
  leadId,
  submittedAt,
  studentName,
  interestedCountry,
  student,
  pdfDataUri,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0066A6', '#F5821F', '#10B981'],
      });
    } catch {
      // ignore
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(leadId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      if (student) {
        downloadStudentPDF(student);
      } else if (pdfDataUri) {
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = `Pathfinder_${leadId}_${studentName.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div id="submission-success-view" className="max-w-2xl mx-auto py-8 sm:py-12 px-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Brand Accent Top Line */}
        <div className="h-2 bg-linear-to-r from-[#0066A6] via-[#0066A6] to-[#F5821F]" />

        <div className="p-6 sm:p-10 text-center">
          {/* Official Pathfinder Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/pathfinder-logo.png"
              alt="Pathfinder International Education"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>

          {/* Success Icon */}
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border-4 border-emerald-100 shadow-sm mb-4">
            <CheckCircle className="w-9 h-9" />
          </div>

          {/* Prompt Required Heading */}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            SUCCESS
          </h1>

          <p className="text-base sm:text-lg text-slate-700 font-medium max-w-md mx-auto mt-2 leading-snug">
            Your counselling enquiry has been submitted successfully.
          </p>

          {/* Reference ID Card Required by Prompt */}
          <div
            id="reference-id-card"
            className="mt-8 p-6 rounded-xl bg-slate-50 border-2 border-blue-200 shadow-sm max-w-sm mx-auto text-center"
          >
            <span className="text-xs uppercase tracking-widest text-[#0066A6] font-extrabold block mb-1">
              Reference ID
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wider font-mono">
                {leadId}
              </span>
              <button
                type="button"
                id="btn-copy-lead-id"
                onClick={handleCopy}
                title="Copy Reference ID"
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#0066A6] hover:border-[#0066A6] transition-colors shadow-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && (
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
                Copied to clipboard!
              </span>
            )}
          </div>

          {/* Prompt Required Notice */}
          <p className="text-slate-600 text-sm max-w-md mx-auto mt-6 leading-relaxed">
            A Pathfinder counsellor will review your information and contact you regarding your study plans.
          </p>

          {/* Action Buttons Required by Prompt: Download PDF & Return to Home */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 no-print">
            <button
              type="button"
              id="btn-download-pdf"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0066A6] text-white font-bold text-sm hover:bg-[#004F82] transition-colors shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Generating PDF...' : 'Download PDF'}
            </button>

            <button
              type="button"
              id="btn-return-home"
              onClick={onReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Home className="w-4 h-4" />
              Return to Home
            </button>
          </div>

          {/* Submission Info Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <strong>Submitted:</strong> {new Date(submittedAt).toLocaleString()}
              </span>
            </div>
            {interestedCountry && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  <strong>Interested Country:</strong> {interestedCountry}
                </span>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-center justify-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0066A6]" />
              <span>Putalisadak, Kathmandu</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-[#0066A6]" />
              <span>
                <a href="tel:015361805" className="hover:text-[#0066A6] transition-colors">01-5361805</a>
                {' '}|{' '}
                <a href="tel:015361853" className="hover:text-[#0066A6] transition-colors">01-5361853</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
