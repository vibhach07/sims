import React from 'react';
import { Loader2, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { PipelineJobState } from '../types/import.types';

interface Step2ProcessingProps {
  jobState: PipelineJobState | null;
  onRetry?: () => void;
}

const STAGES = [
  { key: 'reading_file', label: 'Reading & Validating Document' },
  { key: 'extracting_content', label: 'Extracting Pages, Equations & Diagrams' },
  { key: 'ocr_processing', label: 'OCR & Chemical Formula Recognition' },
  { key: 'validating_questions', label: 'Mapping Questions & Option Contiguity' },
  { key: 'normalizing_latex', label: 'Formatting LaTeX & mhchem Chemical Reactions' },
  { key: 'complete', label: 'Question Paper Extraction Finished' },
];

export const Step2Processing: React.FC<Step2ProcessingProps> = ({ jobState, onRetry }) => {
  const progress = jobState?.progress ?? 20;
  const isFailed = jobState?.status === 'failed';
  const currentStage = jobState?.stage || 'reading_file';

  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-6">
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        {isFailed ? (
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600">
            <AlertCircle className="w-10 h-10" />
          </div>
        ) : (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-[#D9A52E]/20 animate-ping" />
            <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-[#22252A] border-2 border-[#D9A52E] flex items-center justify-center text-[#D9A52E] shadow-lg">
              <Cpu className="w-9 h-9 animate-pulse" />
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <h2 className="font-serif font-bold text-2xl text-[#061426] dark:text-[#F1EEE7]">
          {isFailed ? 'Document Ingestion Failed' : 'Processing Question Paper...'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#85878B]">
          {jobState?.message || 'Analyzing layout, formulas, and options...'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 max-w-md mx-auto">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600 dark:text-[#B8B6B0]">Overall Progress</span>
          <span className="text-[#D9A52E] font-bold">{progress}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-[#2C3036] overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-[#D9A52E] to-amber-500'
            }`}
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
      </div>

      {/* Pipeline Stage Checklist */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] text-left space-y-2.5 max-w-md mx-auto shadow-xs">
        {STAGES.map((s, idx) => {
          const isDone = progress >= ((idx + 1) / STAGES.length) * 90;
          const isCurrent = currentStage === s.key;

          return (
            <div key={s.key} className="flex items-center gap-2.5 text-xs">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-[#D9A52E] animate-spin flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-[#383D44] flex-shrink-0" />
              )}
              <span
                className={`transition ${
                  isCurrent
                    ? 'font-bold text-[#061426] dark:text-[#F1EEE7]'
                    : isDone
                    ? 'text-slate-600 dark:text-[#B8B6B0]'
                    : 'text-slate-400 dark:text-[#85878B]'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {isFailed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition"
        >
          Retry Document Upload
        </button>
      )}
    </div>
  );
};

