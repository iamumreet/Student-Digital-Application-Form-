import React from 'react';
import { GraduationCap, Award, BookOpen, School, Calendar, Info } from 'lucide-react';
import { AcademicDetails, AcademicLevelDetails } from '../../types/student';

interface Step2AcademicDetailsProps {
  data: AcademicDetails;
  onChange: (level: keyof AcademicDetails, field: keyof AcademicLevelDetails, value: string) => void;
  errors?: Partial<Record<string, string>>;
}

export const Step2AcademicDetails: React.FC<Step2AcademicDetailsProps> = ({
  data,
  onChange,
  errors,
}) => {
  return (
    <div id="step-2-academic-details" className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#0066A6]" />
          Academic Details
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Provide your qualifications below. If you have not completed a Bachelor or Master degree, you may leave those sections blank.
        </p>
      </div>

      <div className="space-y-5">
        {/* Subsection 1: SEE */}
        <div
          id="academic-sub-see"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#EBF4FA] text-[#0066A6] flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Secondary Education Examination (SEE / SLC)
                </h3>
                <p className="text-xs text-slate-400">Class 10 Board details</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0066A6]">
              Mandatory
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-see-score" className="block text-xs font-semibold text-slate-700 mb-1">
                SEE Score / GPA <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-see-score"
                placeholder="e.g. 3.75 GPA or 82%"
                value={data.see.scoreOrGpa}
                onChange={(e) => onChange('see', 'scoreOrGpa', e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors?.seeScore
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors?.seeScore && <p className="text-xs text-rose-500 mt-1">{errors.seeScore}</p>}
            </div>

            <div>
              <label htmlFor="field-see-institution" className="block text-xs font-semibold text-slate-700 mb-1">
                Name and Address of Institution <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-see-institution"
                placeholder="School name, City"
                value={data.see.institutionNameAddress}
                onChange={(e) => onChange('see', 'institutionNameAddress', e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors?.seeInstitution
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors?.seeInstitution && <p className="text-xs text-rose-500 mt-1">{errors.seeInstitution}</p>}
            </div>

            <div>
              <label htmlFor="field-see-year" className="block text-xs font-semibold text-slate-700 mb-1">
                Passed Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-see-year"
                placeholder="e.g. 2019"
                value={data.see.passedYear}
                onChange={(e) => onChange('see', 'passedYear', e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors?.seeYear
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors?.seeYear && <p className="text-xs text-rose-500 mt-1">{errors.seeYear}</p>}
            </div>
          </div>
        </div>

        {/* Subsection 2: CTEVT / +2 / A-Level */}
        <div
          id="academic-sub-higher-sec"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#EBF4FA] text-[#0066A6] flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  CTEVT / +2 / A-Level
                </h3>
                <p className="text-xs text-slate-400">High school or diploma qualification</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0066A6]">
              Mandatory
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-hs-score" className="block text-xs font-semibold text-slate-700 mb-1">
                CTEVT / +2 / A-Level Score / GPA <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-hs-score"
                placeholder="e.g. 3.50 GPA / B+"
                value={data.higherSecondary.scoreOrGpa}
                onChange={(e) => onChange('higherSecondary', 'scoreOrGpa', e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors?.hsScore
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors?.hsScore && <p className="text-xs text-rose-500 mt-1">{errors.hsScore}</p>}
            </div>

            <div>
              <label htmlFor="field-hs-institution" className="block text-xs font-semibold text-slate-700 mb-1">
                Name and Address of Institution <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-hs-institution"
                placeholder="College name, City"
                value={data.higherSecondary.institutionNameAddress}
                onChange={(e) => onChange('higherSecondary', 'institutionNameAddress', e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors?.hsInstitution
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors?.hsInstitution && <p className="text-xs text-rose-500 mt-1">{errors.hsInstitution}</p>}
            </div>

            <div>
              <label htmlFor="field-hs-year" className="block text-xs font-semibold text-slate-700 mb-1">
                Passed Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-hs-year"
                placeholder="e.g. 2021"
                value={data.higherSecondary.passedYear}
                onChange={(e) => onChange('higherSecondary', 'passedYear', e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors?.hsYear
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors?.hsYear && <p className="text-xs text-rose-500 mt-1">{errors.hsYear}</p>}
            </div>
          </div>
        </div>

        {/* Subsection 3: Bachelor */}
        <div
          id="academic-sub-bachelor"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                3
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bachelor Degree
                </h3>
                <p className="text-xs text-slate-400">Undergraduate degree (Leave blank if not applicable)</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Optional / If completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-bachelor-score" className="block text-xs font-semibold text-slate-700 mb-1">
                Bachelor Score / CGPA
              </label>
              <input
                type="text"
                id="field-bachelor-score"
                placeholder="e.g. 3.65 CGPA / 74%"
                value={data.bachelor.scoreOrGpa}
                onChange={(e) => onChange('bachelor', 'scoreOrGpa', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="field-bachelor-institution" className="block text-xs font-semibold text-slate-700 mb-1">
                Name and Address of Institution
              </label>
              <input
                type="text"
                id="field-bachelor-institution"
                placeholder="University / College, City"
                value={data.bachelor.institutionNameAddress}
                onChange={(e) => onChange('bachelor', 'institutionNameAddress', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="field-bachelor-year" className="block text-xs font-semibold text-slate-700 mb-1">
                Passed Year
              </label>
              <input
                type="text"
                id="field-bachelor-year"
                placeholder="e.g. 2024"
                value={data.bachelor.passedYear}
                onChange={(e) => onChange('bachelor', 'passedYear', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Subsection 4: Master */}
        <div
          id="academic-sub-master"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                4
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Master Degree
                </h3>
                <p className="text-xs text-slate-400">Postgraduate degree (Leave blank if not applicable)</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Optional / If completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-master-score" className="block text-xs font-semibold text-slate-700 mb-1">
                Master Score / CGPA
              </label>
              <input
                type="text"
                id="field-master-score"
                placeholder="e.g. 3.80 CGPA / First Division"
                value={data.master.scoreOrGpa}
                onChange={(e) => onChange('master', 'scoreOrGpa', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="field-master-institution" className="block text-xs font-semibold text-slate-700 mb-1">
                Name and Address of Institution
              </label>
              <input
                type="text"
                id="field-master-institution"
                placeholder="University name, City"
                value={data.master.institutionNameAddress}
                onChange={(e) => onChange('master', 'institutionNameAddress', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="field-master-year" className="block text-xs font-semibold text-slate-700 mb-1">
                Passed Year
              </label>
              <input
                type="text"
                id="field-master-year"
                placeholder="e.g. 2026"
                value={data.master.passedYear}
                onChange={(e) => onChange('master', 'passedYear', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
