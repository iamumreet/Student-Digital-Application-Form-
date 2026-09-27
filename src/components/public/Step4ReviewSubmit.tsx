import React, { useState } from 'react';
import {
  FileCheck,
  User,
  GraduationCap,
  Globe,
  Award,
  HelpCircle,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';
import { PersonalInfoData } from './Step1PersonalInfo';
import { AcademicDetails } from '../../types/student';
import { AdditionalInfoData } from './Step3AdditionalInfo';

interface Step4ReviewSubmitProps {
  personalData: PersonalInfoData;
  academicData: AcademicDetails;
  additionalData: AdditionalInfoData;
  onEditStep: (stepNumber: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const Step4ReviewSubmit: React.FC<Step4ReviewSubmitProps> = ({
  personalData,
  academicData,
  additionalData,
  onEditStep,
  onSubmit,
  isSubmitting,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setAgreementError(true);
      return;
    }
    setAgreementError(false);
    onSubmit();
  };

  return (
    <form id="step-4-review-submit" onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-[#0066A6]" />
          Review &amp; Submit Application
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Please review your submitted information carefully. Click "Edit" on any section if you need to make changes before submitting.
        </p>
      </div>

      <div className="space-y-5">
        {/* Section 1: Personal Information */}
        <div id="review-card-personal" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-[#0066A6]">
              <User className="w-4 h-4" />
              <h3 className="text-sm font-bold tracking-wide uppercase">Personal Information</h3>
            </div>
            <button
              type="button"
              id="btn-edit-personal"
              onClick={() => onEditStep(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md text-[#0066A6] hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Photo preview */}
            <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
              {personalData.photoUrl ? (
                <img
                  src={personalData.photoUrl}
                  alt={personalData.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center text-xs">
                  <User className="w-6 h-6 mb-1 text-slate-300" />
                  No photo
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-xs flex-1">
              <div>
                <span className="text-slate-400 block">Full Name</span>
                <span className="font-semibold text-slate-800 text-sm">{personalData.fullName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email Address</span>
                <span className="font-semibold text-slate-800">{personalData.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mobile Number</span>
                <span className="font-semibold text-slate-800">{personalData.mobileNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth</span>
                <span className="font-semibold text-slate-800">{personalData.dateOfBirth || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gender / Marital Status</span>
                <span className="font-semibold text-slate-800">
                  {personalData.gender || '—'} / {personalData.maritalStatus || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Guardian</span>
                <span className="font-semibold text-slate-800">
                  {personalData.guardianName || '—'} ({personalData.guardianContactNumber || '—'})
                </span>
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <span className="text-slate-400 block">Address</span>
                <span className="font-semibold text-slate-800">{personalData.address || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Academic Details */}
        <div id="review-card-academic" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-[#0066A6]">
              <GraduationCap className="w-4 h-4" />
              <h3 className="text-sm font-bold tracking-wide uppercase">Academic Details</h3>
            </div>
            <button
              type="button"
              id="btn-edit-academic"
              onClick={() => onEditStep(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md text-[#0066A6] hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* SEE */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                <span>SEE / SLC</span>
                <span className="text-[#0066A6]">{academicData.see.scoreOrGpa || '—'}</span>
              </div>
              <p className="text-slate-600 truncate">{academicData.see.institutionNameAddress || '—'}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Passed Year: {academicData.see.passedYear || '—'}</p>
            </div>

            {/* +2 */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                <span>CTEVT / +2 / A-Level</span>
                <span className="text-[#0066A6]">{academicData.higherSecondary.scoreOrGpa || '—'}</span>
              </div>
              <p className="text-slate-600 truncate">{academicData.higherSecondary.institutionNameAddress || '—'}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">Passed Year: {academicData.higherSecondary.passedYear || '—'}</p>
            </div>

            {/* Bachelor */}
            {academicData.bachelor.scoreOrGpa && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                  <span>Bachelor Degree</span>
                  <span className="text-[#0066A6]">{academicData.bachelor.scoreOrGpa}</span>
                </div>
                <p className="text-slate-600 truncate">{academicData.bachelor.institutionNameAddress || '—'}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Passed Year: {academicData.bachelor.passedYear || '—'}</p>
              </div>
            )}

            {/* Master */}
            {academicData.master.scoreOrGpa && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                  <span>Master Degree</span>
                  <span className="text-[#0066A6]">{academicData.master.scoreOrGpa}</span>
                </div>
                <p className="text-slate-600 truncate">{academicData.master.institutionNameAddress || '—'}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Passed Year: {academicData.master.passedYear || '—'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Study Preferences & Additional Information */}
        <div id="review-card-preferences" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-[#0066A6]">
              <Globe className="w-4 h-4" />
              <h3 className="text-sm font-bold tracking-wide uppercase">Study Preferences &amp; Guidance</h3>
            </div>
            <button
              type="button"
              id="btn-edit-additional"
              onClick={() => onEditStep(3)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md text-[#0066A6] hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Choice of Program</span>
              <span className="font-semibold text-slate-800 text-sm">{additionalData.choiceOfProgram || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Interested Country</span>
              <span className="font-semibold text-[#0066A6] text-sm">{additionalData.interestedCountry || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Question / Guidance Type</span>
              <span className="font-semibold text-slate-800">{additionalData.questionType || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Education Gap</span>
              <span className="font-semibold text-slate-800">
                {additionalData.hasEducationGap === 'Yes'
                  ? `Yes (${additionalData.educationGapDuration || 'Duration unspecified'})`
                  : 'No Gap'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Applied to Other Countries?</span>
              <span className="font-semibold text-slate-800">
                {additionalData.hasAppliedOtherCountries === 'Yes'
                  ? `Yes (${additionalData.previousCountriesApplied || 'Specified in notes'})`
                  : 'No'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">How Heard About Pathfinder</span>
              <span className="font-semibold text-slate-800">{additionalData.howDidYouKnow || '—'}</span>
            </div>
            {additionalData.workExperience && (
              <div className="sm:col-span-2 md:col-span-3">
                <span className="text-slate-400 block">Work Experience</span>
                <span className="font-medium text-slate-700">{additionalData.workExperience}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: English & Test Information */}
        <div id="review-card-tests" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-[#0066A6]">
              <Award className="w-4 h-4" />
              <h3 className="text-sm font-bold tracking-wide uppercase">English / Test Information</h3>
            </div>
            <button
              type="button"
              id="btn-edit-tests"
              onClick={() => onEditStep(3)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md text-[#0066A6] hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Tests Selected:</span>
              <div className="flex flex-wrap gap-1.5">
                {additionalData.testsTaken.length > 0 ? (
                  additionalData.testsTaken.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066A6] font-semibold text-[11px]"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 font-medium">None / Not yet taken</span>
                )}
              </div>
            </div>
            {additionalData.testScore && (
              <div className="pt-2">
                <span className="text-slate-400 block">Test Score Details</span>
                <span className="font-semibold text-slate-800 text-sm">{additionalData.testScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* Declaration & Confirmation Checkbox */}
        <div
          id="submission-declaration"
          className={`p-4 rounded-xl border transition-all ${
            agreementError
              ? 'border-rose-300 bg-rose-50/50'
              : 'border-amber-200 bg-amber-50/40'
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="declaration-checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setAgreementError(false);
              }}
              className="mt-1 w-4 h-4 rounded text-[#0066A6] focus:ring-[#0066A6] border-slate-300"
            />
            <div className="text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900 block mb-0.5">
                Declaration &amp; Authorization
              </span>
              I hereby declare that all the information provided in this counselling form is complete, accurate, and true to the best of my knowledge. I authorize Pathfinder International Education and its accredited counselling team to assess my academic profile and contact me via phone, email, or WhatsApp for study-abroad guidance.
            </div>
          </label>
          {agreementError && (
            <p className="text-xs text-rose-600 font-semibold mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Please check the declaration box before submitting.
            </p>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            id="btn-back-to-step3"
            onClick={() => onEditStep(3)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            ← Back to Additional Info
          </button>

          <button
            type="submit"
            id="btn-submit-counselling-form"
            disabled={isSubmitting}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-white font-bold text-sm shadow-md transition-all ${
              isSubmitting
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-[#F5821F] hover:bg-[#DE7114] active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Form...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Counselling Form
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
