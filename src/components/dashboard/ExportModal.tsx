import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Filter, Calendar, Users } from 'lucide-react';
import { StudentRecord, StudentStatus } from '../../types/student';
import { exportStudentsToExcel } from '../../services/spreadsheetService';
import { DEFAULT_COUNSELLORS } from '../../data/counsellors';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStudents: StudentRecord[];
  currentFilteredStudents: StudentRecord[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  allStudents,
  currentFilteredStudents,
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'custom'>('filtered');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCounsellor, setFilterCounsellor] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const computeExportDataset = (): StudentRecord[] => {
    if (exportScope === 'all') return allStudents;
    if (exportScope === 'filtered') return currentFilteredStudents;

    // Custom filtering
    return allStudents.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterCounsellor && s.assignedCounsellorId !== filterCounsellor) return false;
      if (startDate) {
        const sDate = s.submittedAt ? s.submittedAt.slice(0, 10) : '';
        if (sDate < startDate) return false;
      }
      if (endDate) {
        const sDate = s.submittedAt ? s.submittedAt.slice(0, 10) : '';
        if (sDate > endDate) return false;
      }
      return true;
    });
  };

  const candidateStudents = computeExportDataset();

  const handleExport = () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Pathfinder_Students_${exportScope}_${timestamp}`;
      exportStudentsToExcel(candidateStudents, filename);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Export error:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export to Excel (.xlsx)</h3>
              <p className="text-xs text-slate-400">Generate formatted workbook with full response columns</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Scope Options */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Export Scope
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  exportScope === 'filtered'
                    ? 'border-[#0066A6] bg-blue-50 text-[#0066A6] font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold">Current View</div>
                <div className="text-sm font-extrabold mt-0.5">{currentFilteredStudents.length} records</div>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  exportScope === 'all'
                    ? 'border-[#0066A6] bg-blue-50 text-[#0066A6] font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold">All Students</div>
                <div className="text-sm font-extrabold mt-0.5">{allStudents.length} records</div>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('custom')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  exportScope === 'custom'
                    ? 'border-[#0066A6] bg-blue-50 text-[#0066A6] font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold">Custom Filter</div>
                <div className="text-sm font-extrabold mt-0.5">{candidateStudents.length} records</div>
              </button>
            </div>
          </div>

          {/* Custom Filters if Scope is 'custom' */}
          {exportScope === 'custom' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs animate-fadeIn">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value="">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Counselling Scheduled">Counselling Scheduled</option>
                    <option value="Counselled">Counselled</option>
                    <option value="Application Started">Application Started</option>
                    <option value="Application Submitted">Application Submitted</option>
                    <option value="Visa Processing">Visa Processing</option>
                    <option value="Visa Granted">Visa Granted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Assigned Counsellor</label>
                  <select
                    value={filterCounsellor}
                    onChange={(e) => setFilterCounsellor(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value="">All Counsellors</option>
                    {DEFAULT_COUNSELLORS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Export Summary Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Ready to export <strong className="font-bold">{candidateStudents.length} student records</strong> with all 39 columns.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-export-excel"
            onClick={handleExport}
            disabled={candidateStudents.length === 0 || isExporting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : `Download .xlsx (${candidateStudents.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
