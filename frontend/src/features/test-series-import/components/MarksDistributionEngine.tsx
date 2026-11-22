import React from 'react';
import { ImportQuestion } from '../types/import.types';
import { Award, Sparkles, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface MarksDistributionEngineProps {
  questions: ImportQuestion[];
  defaultMarks: number;
  defaultNegativeMarks: number;
}

export const MarksDistributionEngine: React.FC<MarksDistributionEngineProps> = ({
  questions,
  defaultMarks,
  defaultNegativeMarks
}) => {
  const totalQuestions = questions.length;
  const totalCalculatedMarks = questions.reduce((sum, q) => {
    const m = q.marks !== undefined && q.marks !== null ? Number(q.marks) : defaultMarks;
    return sum + (isNaN(m) ? 0 : m);
  }, 0);

  const mathQuestionsCount = questions.filter((q) => q.has_math).length;
  const needsReviewCount = questions.filter((q) => q.needs_review).length;

  // Group by subjects
  const subjectGroups: Record<string, number> = {};
  questions.forEach((q) => {
    const s = q.subject || 'General';
    subjectGroups[s] = (subjectGroups[s] || 0) + 1;
  });

  return (
    <div className="bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#2C3036]">
        <Award className="w-5 h-5 text-[#D9A52E]" />
        <h3 className="font-serif font-bold text-sm text-[#061426] dark:text-[#F1EEE7]">
          Marks & Paper Analysis Engine
        </h3>
      </div>

      {/* Main Totals Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-[#22252A] dark:to-[#2C3036] border border-amber-200/80 dark:border-[#383D44] text-center">
        <span className="text-[11px] uppercase tracking-wider text-amber-800 dark:text-[#D5AD5B] font-bold">
          Total Examination Marks
        </span>
        <div className="text-3xl font-bold font-serif text-[#061426] dark:text-[#F1EEE7] mt-1">
          {totalCalculatedMarks.toFixed(1)}
        </div>
        <span className="text-xs text-slate-500 dark:text-[#85878B] mt-0.5 block">
          across {totalQuestions} questions
        </span>
      </div>

      {/* Stats Breakdown */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#22252A]">
          <span className="text-slate-600 dark:text-[#B8B6B0] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Total Questions
          </span>
          <span className="font-bold text-[#061426] dark:text-[#F1EEE7]">{totalQuestions}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#22252A]">
          <span className="text-slate-600 dark:text-[#B8B6B0] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Equations & Chem \\ce
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">{mathQuestionsCount}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#22252A]">
          <span className="text-slate-600 dark:text-[#B8B6B0] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Flagged for Review
          </span>
          <span className={`font-bold ${needsReviewCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {needsReviewCount}
          </span>
        </div>
      </div>

      {/* Subject Distribution */}
      <div className="pt-2 border-t border-slate-100 dark:border-[#2C3036] space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#85878B] flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> Subject Breakdown
        </span>
        <div className="space-y-1.5">
          {Object.entries(subjectGroups).map(([subj, count]) => (
            <div key={subj} className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-[#B8B6B0] truncate max-w-[140px]">{subj}</span>
              <span className="font-semibold text-slate-900 dark:text-[#F1EEE7]">
                {count} Qs ({Math.round((count / (totalQuestions || 1)) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

