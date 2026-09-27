import React, { useState } from 'react';
import { StepProgress } from './StepProgress';
import { Step1PersonalInfo, PersonalInfoData } from './Step1PersonalInfo';
import { Step2AcademicDetails } from './Step2AcademicDetails';
import { Step3AdditionalInfo, AdditionalInfoData } from './Step3AdditionalInfo';
import { Step4ReviewSubmit } from './Step4ReviewSubmit';
import { SubmissionSuccess } from './SubmissionSuccess';
import { AcademicDetails, StudentRecord } from '../../types/student';
import { submitStudentWorkflow, SubmissionWorkflowProgress } from '../../services/studentService';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

const INITIAL_PERSONAL: PersonalInfoData = {
  fullName: '',
  guardianName: '',
  guardianContactNumber: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  mobileNumber: '',
  email: '',
  address: '',
  photoUrl: '',
};

const INITIAL_ACADEMIC: AcademicDetails = {
  see: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
  higherSecondary: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
  bachelor: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
  master: { scoreOrGpa: '', institutionNameAddress: '', passedYear: '' },
};

const INITIAL_ADDITIONAL: AdditionalInfoData = {
  workExperience: '',
  hasEducationGap: '',
  educationGapDuration: '',
  choiceOfProgram: '',
  interestedCountry: '',
  hasAppliedOtherCountries: '',
  previousCountriesApplied: '',
  testsTaken: [],
  testScore: '',
  questionType: '',
  howDidYouKnow: '',
};

export const StudentForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxAccessibleStep, setMaxAccessibleStep] = useState<number>(1);

  // Form States
  const [personalData, setPersonalData] = useState<PersonalInfoData>(INITIAL_PERSONAL);
  const [academicData, setAcademicData] = useState<AcademicDetails>(INITIAL_ACADEMIC);
  const [additionalData, setAdditionalData] = useState<AdditionalInfoData>(INITIAL_ADDITIONAL);

  // Validation errors
  const [personalErrors, setPersonalErrors] = useState<Partial<Record<keyof PersonalInfoData, string>>>({});
  const [academicErrors, setAcademicErrors] = useState<Partial<Record<string, string>>>({});
  const [additionalErrors, setAdditionalErrors] = useState<Partial<Record<keyof AdditionalInfoData, string>>>({});

  // Submission Workflow State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionProgress, setSubmissionProgress] = useState<SubmissionWorkflowProgress | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    leadId: string;
    submittedAt: string;
    studentName: string;
    interestedCountry: string;
    student: StudentRecord;
    pdfDataUri?: string;
  } | null>(null);

  // Handlers for Step 1
  const handlePersonalChange = (field: keyof PersonalInfoData, value: string) => {
    setPersonalData((prev) => ({ ...prev, [field]: value }));
    if (personalErrors[field]) {
      setPersonalErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Handlers for Step 2
  const handleAcademicChange = (
    level: keyof AcademicDetails,
    field: 'scoreOrGpa' | 'institutionNameAddress' | 'passedYear',
    value: string
  ) => {
    setAcademicData((prev) => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value,
      },
    }));
    setAcademicErrors((prev) => ({ ...prev, [`${level}_${field}`]: undefined }));
  };

  // Handlers for Step 3
  const handleAdditionalChange = <K extends keyof AdditionalInfoData>(
    field: K,
    value: AdditionalInfoData[K]
  ) => {
    setAdditionalData((prev) => ({ ...prev, [field]: value }));
    if (additionalErrors[field]) {
      setAdditionalErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof PersonalInfoData, string>> = {};
    if (!personalData.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!personalData.email.trim()) {
      errs.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!personalData.mobileNumber.trim()) errs.mobileNumber = 'Mobile Number is required';
    if (!personalData.guardianName.trim()) errs.guardianName = "Guardian's Name is required";
    if (!personalData.guardianContactNumber.trim()) {
      errs.guardianContactNumber = "Guardian's Contact Number is required";
    }
    if (!personalData.dateOfBirth) errs.dateOfBirth = 'Date of Birth is required';
    if (!personalData.gender) errs.gender = 'Please select Gender';
    if (!personalData.maritalStatus) errs.maritalStatus = 'Please select Marital Status';
    if (!personalData.address.trim()) errs.address = 'Address is required';

    setPersonalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const errs: Partial<Record<string, string>> = {};
    if (!academicData.see.scoreOrGpa.trim()) errs.seeScore = 'SEE score or GPA is required';
    if (!academicData.see.institutionNameAddress.trim()) errs.seeInstitution = 'School name is required';
    if (!academicData.see.passedYear.trim()) errs.seeYear = 'Passed year is required';

    if (!academicData.higherSecondary.scoreOrGpa.trim()) errs.hsScore = '+2 / CTEVT score is required';
    if (!academicData.higherSecondary.institutionNameAddress.trim()) errs.hsInstitution = 'College name is required';
    if (!academicData.higherSecondary.passedYear.trim()) errs.hsYear = 'Passed year is required';

    setAcademicErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const errs: Partial<Record<keyof AdditionalInfoData, string>> = {};
    if (!additionalData.hasEducationGap) errs.hasEducationGap = 'Please specify if you have an education gap';
    if (additionalData.hasEducationGap === 'Yes' && !additionalData.educationGapDuration?.trim()) {
      errs.educationGapDuration = 'Please specify the duration and reason of your gap';
    }

    if (!additionalData.choiceOfProgram.trim()) errs.choiceOfProgram = 'Choice of Program is required';
    if (!additionalData.interestedCountry) errs.interestedCountry = 'Please select your interested country';

    if (!additionalData.hasAppliedOtherCountries) {
      errs.hasAppliedOtherCountries = 'Please select Yes or No';
    }
    if (additionalData.hasAppliedOtherCountries === 'Yes' && !additionalData.previousCountriesApplied?.trim()) {
      errs.previousCountriesApplied = 'Please specify which countries you have previously applied to';
    }

    const hasTests =
      additionalData.testsTaken.length > 0 && !additionalData.testsTaken.includes('None / Not Yet');
    if (hasTests && !additionalData.testScore?.trim()) {
      errs.testScore = 'Please provide your test score breakdown';
    }

    if (!additionalData.questionType) errs.questionType = 'Please select your primary query type';
    if (!additionalData.howDidYouKnow) errs.howDidYouKnow = 'Please let us know how you heard about us';

    setAdditionalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
      setMaxAccessibleStep((prev) => Math.max(prev, 2));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
      setMaxAccessibleStep((prev) => Math.max(prev, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      setCurrentStep(4);
      setMaxAccessibleStep((prev) => Math.max(prev, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionProgress({ step: 1, message: 'Submitting...' });

    try {
      const result = await submitStudentWorkflow(
        {
          ...personalData,
          academicDetails: academicData,
          ...additionalData,
        },
        (progress) => {
          setSubmissionProgress(progress);
        }
      );

      setSubmissionProgress({ step: 10, message: 'Complete' });

      setTimeout(() => {
        setSubmittedResult({
          leadId: result.leadId,
          submittedAt: result.student.submittedAt,
          studentName: personalData.fullName,
          interestedCountry: additionalData.interestedCountry,
          student: result.student,
          pdfDataUri: result.pdfDataUri,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    } catch (err: unknown) {
      console.error('Submission failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Please check your connection and retry.';
      setSubmissionError(`Submission error: ${errMsg}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setPersonalData(INITIAL_PERSONAL);
    setAcademicData(INITIAL_ACADEMIC);
    setAdditionalData(INITIAL_ADDITIONAL);
    setCurrentStep(1);
    setMaxAccessibleStep(1);
    setSubmittedResult(null);
    setSubmissionProgress(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submittedResult) {
    return (
      <SubmissionSuccess
        leadId={submittedResult.leadId}
        submittedAt={submittedResult.submittedAt}
        studentName={submittedResult.studentName}
        interestedCountry={submittedResult.interestedCountry}
        student={submittedResult.student}
        pdfDataUri={submittedResult.pdfDataUri}
        onReset={handleResetForm}
      />
    );
  }

  return (
    <div id="student-public-portal" className="max-w-4xl mx-auto py-6 sm:py-10 px-4">
      {/* Public Form Header with Official Logo */}
      <div id="form-header" className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <img
            src="/pathfinder-logo.png"
            alt="Pathfinder International Education"
            className="h-12 sm:h-14 w-auto object-contain"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0066A6] text-xs font-semibold mb-2">
          <span>Putalisadak, Kathmandu, Nepal &bull; 01-5361805 | 01-5361853</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[#0066A6]">
          STUDENT COUNSELLING &amp; ENQUIRY FORM
        </h1>

        <p className="text-sm text-slate-600 max-w-2xl mx-auto mt-2 leading-relaxed">
          "Please provide your details so our counsellors can understand your academic background, study preferences and future goals and provide appropriate guidance."
        </p>
      </div>

      {/* Progress Stepper */}
      <StepProgress
        currentStep={currentStep}
        onStepClick={handleEditStep}
        maxAccessibleStep={maxAccessibleStep}
      />

      {/* Workflow Loading Overlay */}
      {isSubmitting && (
        <div
          id="submission-loading-overlay"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-200">
            <div className="flex justify-center mb-4">
              <img
                src="/pathfinder-logo.png"
                alt="Pathfinder International Education"
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-[#0066A6] flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Processing Your Enquiry
            </h3>

            {/* Step-by-Step Progress Checklist required by prompt */}
            <div className="mt-4 space-y-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className={`flex items-center gap-2 ${submissionProgress?.step && submissionProgress.step >= 1 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submitting &amp; Validating Form Data...</span>
              </div>
              <div className={`flex items-center gap-2 ${submissionProgress?.step && submissionProgress.step >= 3 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saving response to Firestore...</span>
              </div>
              <div className={`flex items-center gap-2 ${submissionProgress?.step && submissionProgress.step >= 5 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Generating official branded PDF...</span>
              </div>
              <div className={`flex items-center gap-2 ${submissionProgress?.step && submissionProgress.step >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Recording response in spreadsheet...</span>
              </div>
              <div className={`flex items-center gap-2 ${submissionProgress?.step && submissionProgress.step >= 9 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Sending notification to admissions...</span>
              </div>
              <div className={`flex items-center gap-2 ${submissionProgress?.step && submissionProgress.step >= 10 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              {submissionProgress?.message || 'Please wait while we record your application...'}
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {submissionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start justify-between gap-3 shadow-sm">
          <div>
            <p className="font-semibold">Unable to Complete Submission</p>
            <p className="mt-1 text-xs text-red-700">{submissionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setSubmissionError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded border border-red-200 bg-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Multi-Step Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        {currentStep === 1 && (
          <Step1PersonalInfo
            data={personalData}
            onChange={handlePersonalChange}
            errors={personalErrors}
          />
        )}

        {currentStep === 2 && (
          <Step2AcademicDetails
            data={academicData}
            onChange={handleAcademicChange}
            errors={academicErrors}
          />
        )}

        {currentStep === 3 && (
          <Step3AdditionalInfo
            data={additionalData}
            onChange={handleAdditionalChange}
            errors={additionalErrors}
          />
        )}

        {currentStep === 4 && (
          <Step4ReviewSubmit
            personalData={personalData}
            academicData={academicData}
            additionalData={additionalData}
            onEditStep={handleEditStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Step Navigation Controls for Steps 1 - 3 */}
        {currentStep < 4 && (
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                id="btn-step-prev"
                onClick={handlePrev}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              id="btn-step-next"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0066A6] text-white font-bold text-sm hover:bg-[#004F82] shadow-xs active:scale-[0.98] transition-all"
            >
              Continue to {currentStep === 1 ? 'Academic Details' : currentStep === 2 ? 'Additional Info' : 'Review & Submit'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Trust & Support Footer */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <p>
          Need assistance with your counselling form? Contact our admissions desk at{' '}
          <a href="tel:015361805" className="font-semibold text-slate-800 hover:text-[#0066A6] transition-colors">01-5361805</a>
          {' '}|{' '}
          <a href="tel:015361853" className="font-semibold text-slate-800 hover:text-[#0066A6] transition-colors">01-5361853</a>
        </p>
      </div>
    </div>
  );
};
