import React from 'react';
import { Check } from 'lucide-react';
import { StepNumber } from '../types/import.types';

interface StepperProps {
  currentStep: StepNumber;
  onSelectStep?: (step: StepNumber) => void;
  maxAccessibleStep?: StepNumber;
}

const STEPS: Array<{ step: StepNumber; label: string }> = [
  { step: 1, label: 'Upload Document' },
  { step: 2, label: 'Processing' },
  { step: 3, label: 'Question Review' },
  { step: 4, label: 'Test Configuration' },
  { step: 5, label: 'Preview & Publish' },
];

export const Stepper: React.FC<StepperProps> = ({ currentStep, onSelectStep, maxAccessibleStep = 5 }) => {
  return (
    <div className="w-full bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] rounded-2xl px-6 py-3.5 shadow-xs">
      <div className="flex items-center justify-between max-w-4xl mx-auto relative">
        {/* Background Connector Bar */}
        <div className="absolute left-6 right-6 top-4 h-[2px] bg-slate-200 dark:bg-[#2C3036] z-0" />

        {STEPS.map((s) => {
          const isCompleted = s.step < currentStep;
          const isCurrent = s.step === currentStep;
          const isClickable = Boolean(onSelectStep && s.step <= maxAccessibleStep);

          return (
            <button
              key={s.step}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onSelectStep && onSelectStep(s.step)}
              className={`relative z-10 flex flex-col items-center gap-1.5 focus:outline-none transition ${
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] transition ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-[#1C2C42] text-white ring-4 ring-slate-200 dark:ring-[#2C3036]'
                    : 'bg-slate-200 dark:bg-[#2C3036] text-slate-500 dark:text-[#85878B]'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
              </div>
              <span
                className={`text-[11px] whitespace-nowrap transition ${
                  isCurrent
                    ? 'text-[#061426] dark:text-[#F1EEE7] font-bold'
                    : isCompleted
                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-slate-400 dark:text-[#85878B]'
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

