import React from 'react';
import { HelpCircle, Globe, Briefcase, Award, CheckSquare, MessageSquare } from 'lucide-react';

export interface AdditionalInfoData {
  workExperience: string;
  hasEducationGap: 'Yes' | 'No' | '';
  educationGapDuration?: string;
  choiceOfProgram: string;
  interestedCountry: string;
  hasAppliedOtherCountries: 'Yes' | 'No' | '';
  previousCountriesApplied?: string;
  testsTaken: string[];
  testScore?: string;
  questionType: string;
  howDidYouKnow: string;
}

interface Step3AdditionalInfoProps {
  data: AdditionalInfoData;
  onChange: <K extends keyof AdditionalInfoData>(field: K, value: AdditionalInfoData[K]) => void;
  errors: Partial<Record<keyof AdditionalInfoData, string>>;
}

const AVAILABLE_TESTS = [
  'IELTS',
  'PTE',
  'TOEFL',
  'SAT',
  'GRE',
  'GMAT',
  'Duolingo English Test',
  'None / Not Yet',
];

const POPULAR_COUNTRIES = [
  'Australia',
  'United Kingdom (UK)',
  'United States of America (USA)',
  'Canada',
  'New Zealand',
  'Japan',
  'Germany',
  'Ireland',
  'France',
  'Netherlands',
  'Other',
];

const QUESTION_TYPES = [
  'General Study Abroad Guidance',
  'University & Course Selection',
  'Scholarship & Financial Aid Evaluation',
  'Visa Documentation & GTE / Financial Proofs',
  'Offer Letter & Application Fee Waiver',
  'Post-Study Work Rights & PR Pathways',
  'Visa Refusal Re-application Guidance',
  'Other Specific Query',
];

const HOW_DID_YOU_KNOW_OPTIONS = [
  'Social Media (Facebook / Instagram / TikTok)',
  'Friend or Family Member Referral',
  'Education Fair / Information Seminar',
  'Google Search / Pathfinder Website',
  'College / High School Visit',
  'Newspaper / Radio / Billboard',
  'Direct Walk-in',
  'Other',
];

export const Step3AdditionalInfo: React.FC<Step3AdditionalInfoProps> = ({
  data,
  onChange,
  errors,
}) => {
  const handleTestToggle = (test: string) => {
    let current = [...data.testsTaken];
    if (test === 'None / Not Yet') {
      onChange('testsTaken', current.includes('None / Not Yet') ? [] : ['None / Not Yet']);
      return;
    }

    // Remove 'None' if another test is selected
    current = current.filter((t) => t !== 'None / Not Yet');

    if (current.includes(test)) {
      current = current.filter((t) => t !== test);
    } else {
      current.push(test);
    }
    onChange('testsTaken', current);
  };

  const hasTestsSelected =
    data.testsTaken.length > 0 && !data.testsTaken.includes('None / Not Yet');

  return (
    <div id="step-3-additional-info" className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#0066A6]" />
          Additional Information
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Provide your study preferences, testing background, and specific guidance needs so we can customize your counselling session.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Work Experience */}
        <div>
          <label htmlFor="field-workExperience" className="block text-sm font-semibold text-slate-700 mb-1.5">
            1. Work Experience
          </label>
          <textarea
            id="field-workExperience"
            rows={2}
            placeholder="Mention company name, job role, and duration (e.g. 1.5 years as Marketing Officer at XYZ Ltd.). Leave blank if none."
            value={data.workExperience}
            onChange={(e) => onChange('workExperience', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0066A6] focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* 2. Education Gap * & 3. Conditional Duration */}
        <div id="group-education-gap" className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              2. Education Gap <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Do you have a gap after your last completed qualification?
            </p>
            <div className="flex gap-4">
              {(['Yes', 'No'] as const).map((gapChoice) => (
                <label
                  key={gapChoice}
                  id={`gap-choice-${gapChoice.toLowerCase()}`}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer transition-all ${
                    data.hasEducationGap === gapChoice
                      ? 'border-[#0066A6] bg-white text-[#0066A6] ring-2 ring-blue-100 shadow-xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="hasEducationGap"
                    value={gapChoice}
                    checked={data.hasEducationGap === gapChoice}
                    onChange={() => onChange('hasEducationGap', gapChoice)}
                    className="sr-only"
                  />
                  <span>{gapChoice}</span>
                </label>
              ))}
            </div>
            {errors.hasEducationGap && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.hasEducationGap}</p>
            )}
          </div>

          {/* Conditional 3: If there's an educational gap, how long? */}
          {data.hasEducationGap === 'Yes' && (
            <div id="field-gap-duration-container" className="pt-2 border-t border-slate-200 animate-fadeIn">
              <label
                htmlFor="field-educationGapDuration"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                3. If there's an educational gap, how long? <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-educationGapDuration"
                placeholder="e.g. 2 years (Reason: working as accountant and IELTS preparation)"
                value={data.educationGapDuration || ''}
                onChange={(e) => onChange('educationGapDuration', e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.educationGapDuration
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors.educationGapDuration && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.educationGapDuration}</p>
              )}
            </div>
          )}
        </div>

        {/* 4. Your Choice of Program & 5. Interested Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 4. Your Choice of Program */}
          <div>
            <label htmlFor="field-choiceOfProgram" className="block text-sm font-semibold text-slate-700 mb-1.5">
              4. Your Choice of Program <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="field-choiceOfProgram"
              placeholder="e.g. Master of IT, Bachelor of Nursing, MBA..."
              value={data.choiceOfProgram}
              onChange={(e) => onChange('choiceOfProgram', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                errors.choiceOfProgram
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            />
            {errors.choiceOfProgram && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.choiceOfProgram}</p>
            )}
          </div>

          {/* 5. Interested Country? */}
          <div>
            <label htmlFor="field-interestedCountry" className="block text-sm font-semibold text-slate-700 mb-1.5">
              5. Interested Country? <span className="text-rose-500">*</span>
            </label>
            <select
              id="field-interestedCountry"
              value={data.interestedCountry}
              onChange={(e) => onChange('interestedCountry', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 transition-all ${
                errors.interestedCountry
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            >
              <option value="">Select country of preference</option>
              {POPULAR_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {errors.interestedCountry && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.interestedCountry}</p>
            )}
          </div>
        </div>

        {/* 6. Have you ever applied to any other countries? & 7. Conditional */}
        <div id="group-previous-applications" className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              6. Have you ever applied to any other countries? <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-4">
              {(['Yes', 'No'] as const).map((appliedChoice) => (
                <label
                  key={appliedChoice}
                  id={`applied-choice-${appliedChoice.toLowerCase()}`}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer transition-all ${
                    data.hasAppliedOtherCountries === appliedChoice
                      ? 'border-[#0066A6] bg-white text-[#0066A6] ring-2 ring-blue-100 shadow-xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="hasAppliedOtherCountries"
                    value={appliedChoice}
                    checked={data.hasAppliedOtherCountries === appliedChoice}
                    onChange={() => onChange('hasAppliedOtherCountries', appliedChoice)}
                    className="sr-only"
                  />
                  <span>{appliedChoice}</span>
                </label>
              ))}
            </div>
            {errors.hasAppliedOtherCountries && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.hasAppliedOtherCountries}</p>
            )}
          </div>

          {/* Conditional 7: If you applied to any other countries, which country? */}
          {data.hasAppliedOtherCountries === 'Yes' && (
            <div id="field-applied-country-container" className="pt-2 border-t border-slate-200 animate-fadeIn">
              <label
                htmlFor="field-previousCountriesApplied"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                7. If you applied to any other countries, which country? <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-previousCountriesApplied"
                placeholder="e.g. Applied for USA F-1 in 2024, or Australia student visa"
                value={data.previousCountriesApplied || ''}
                onChange={(e) => onChange('previousCountriesApplied', e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.previousCountriesApplied
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors.previousCountriesApplied && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.previousCountriesApplied}</p>
              )}
            </div>
          )}
        </div>

        {/* 8. Have you taken any of the following tests? & 9. Test Score? */}
        <div id="group-tests" className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              8. Have you taken any of the following tests?
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Select all exams you have taken or are currently registered for.
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TESTS.map((test) => {
                const isSelected = data.testsTaken.includes(test);
                return (
                  <button
                    key={test}
                    type="button"
                    id={`test-pill-${test.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => handleTestToggle(test)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'border-[#0066A6] bg-[#0066A6] text-white shadow-xs'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {test}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional 9: Test Score? (Shown if any test taken) */}
          {hasTestsSelected && (
            <div id="field-test-score-container" className="pt-2 border-t border-slate-200 animate-fadeIn">
              <label htmlFor="field-testScore" className="block text-sm font-semibold text-slate-800 mb-1.5">
                9. Test Score? <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="field-testScore"
                placeholder="e.g. Overall 7.0 (L 7.5, R 7.0, W 6.5, S 6.5) or PTE Overall 65"
                value={data.testScore || ''}
                onChange={(e) => onChange('testScore', e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.testScore
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
                }`}
              />
              {errors.testScore && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.testScore}</p>
              )}
            </div>
          )}
        </div>

        {/* 10. Question Type */}
        <div>
          <label htmlFor="field-questionType" className="block text-sm font-semibold text-slate-700 mb-1.5">
            10. Question Type <span className="text-rose-500">*</span>
          </label>
          <select
            id="field-questionType"
            value={data.questionType}
            onChange={(e) => onChange('questionType', e.target.value)}
            className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 transition-all ${
              errors.questionType
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
            }`}
          >
            <option value="">Select your primary guidance requirement</option>
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.questionType && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.questionType}</p>
          )}
        </div>

        {/* 11. How do you know about Pathfinder? */}
        <div>
          <label htmlFor="field-howDidYouKnow" className="block text-sm font-semibold text-slate-700 mb-1.5">
            11. How do you know about Pathfinder? <span className="text-rose-500">*</span>
          </label>
          <select
            id="field-howDidYouKnow"
            value={data.howDidYouKnow}
            onChange={(e) => onChange('howDidYouKnow', e.target.value)}
            className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 transition-all ${
              errors.howDidYouKnow
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
            }`}
          >
            <option value="">Select source</option>
            {HOW_DID_YOU_KNOW_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.howDidYouKnow && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.howDidYouKnow}</p>
          )}
        </div>
      </div>
    </div>
  );
};
