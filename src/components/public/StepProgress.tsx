import React from 'react';
import { User, GraduationCap, HelpCircle, FileCheck, Check } from 'lucide-react';

interface StepProgressProps {
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  maxAccessibleStep?: number;
}

const STEPS = [
  { label: 'Personal Information', shortLabel: 'Personal', icon: User },
  { label: 'Academic Details', shortLabel: 'Academic', icon: GraduationCap },
  { label: 'Additional Information', shortLabel: 'Additional', icon: HelpCircle },
  { label: 'Review & Submit', shortLabel: 'Review', icon: FileCheck },
];

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  onStepClick,
  maxAccessibleStep = 4,
}) => {
  return (
    <div id="student-form-stepper" className="w-full mb-8">
      {/* Desktop & Tablet Stepper */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Connecting bar background */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 -z-0" />
        {/* Connecting bar progress */}
        <div
          className="absolute top-5 left-8 h-0.5 bg-[#0066A6] transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 88}%`,
          }}
        />

        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = currentStep > stepNum;
          const isActive = currentStep === stepNum;
          const isClickable = onStepClick && stepNum <= maxAccessibleStep;
          const IconComponent = step.icon;

          return (
            <div
              key={step.label}
              id={`step-indicator-${stepNum}`}
              onClick={() => isClickable && onStepClick(stepNum)}
              className={`flex flex-col items-center relative z-10 ${
                isClickable ? 'cursor-pointer group' : 'cursor-default'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 font-semibold text-sm ${
                  isCompleted
                    ? 'bg-[#0066A6] border-[#0066A6] text-white shadow-xs'
                    : isActive
                    ? 'bg-white border-[#F5821F] text-[#F5821F] shadow-md ring-4 ring-orange-100'
                    : 'bg-white border-slate-300 text-slate-400 group-hover:border-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#F5821F]' : 'text-slate-400'}`} />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-semibold tracking-tight transition-colors ${
                  isActive
                    ? 'text-[#0066A6]'
                    : isCompleted
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper Header */}
      <div className="sm:hidden flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-[#0066A6] text-white text-xs font-bold flex items-center justify-center">
            {currentStep} / {STEPS.length}
          </span>
          <div>
            <p className="text-xs text-slate-500 font-medium">Current Step</p>
            <p className="text-sm font-bold text-slate-800">
              {STEPS[currentStep - 1].label}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-1.5 rounded-full transition-all ${
                i + 1 === currentStep
                  ? 'w-6 bg-[#F5821F]'
                  : i + 1 < currentStep
                  ? 'bg-[#0066A6]'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
