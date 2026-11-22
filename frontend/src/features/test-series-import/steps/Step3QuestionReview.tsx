import React, { useState } from 'react';
import { ImportQuestion } from '../types/import.types';
import { QuestionCard } from '../components/QuestionCard';
import { MarksDistributionEngine } from '../components/MarksDistributionEngine';
import { Plus, Filter, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

interface Step3QuestionReviewProps {
  questions: ImportQuestion[];
  onQuestionsChange: (questions: ImportQuestion[]) => void;
  defaultMarks: number;
  defaultNegativeMarks: number;
  onProceed: () => void;
  onBack: () => void;
}

const PAGE_SIZE = 8;

export const Step3QuestionReview: React.FC<Step3QuestionReviewProps> = ({
  questions,
  onQuestionsChange,
  defaultMarks,
  defaultNegativeMarks,
  onProceed,
  onBack,
}) => {
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'math'>('all');
  const [page, setPage] = useState(1);

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'needs_review') return q.needs_review;
    if (filter === 'math') return q.has_math;
    return true;
  });

  const totalPages = Math.ceil(filteredQuestions.length / PAGE_SIZE) || 1;
  const paginated = filteredQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleUpdateQuestion = (updated: ImportQuestion, index: number) => {
    const next = [...questions];
    const targetIdx = questions.findIndex((q) => q.question_number === updated.question_number);
    if (targetIdx !== -1) {
      next[targetIdx] = updated;
    } else {
      next[index] = updated;
    }
    onQuestionsChange(next);
  };

  const handleDeleteQuestion = (qNumber: number) => {
    const next = questions
      .filter((q) => q.question_number !== qNumber)
      .map((q, idx) => ({ ...q, question_number: idx + 1 }));
    onQuestionsChange(next);
  };

  const handleAddNewQuestion = () => {
    const newQ: ImportQuestion = {
      question_number: questions.length + 1,
      subject: 'General',
      question_en: 'New question statement with optional LaTeX formula...',
      option_a_en: 'Option A',
      option_b_en: 'Option B',
      option_c_en: 'Option C',
      option_d_en: 'Option D',
      correct_option: 'A',
      explanation_en: '',
      marks: defaultMarks,
      negative_marks: defaultNegativeMarks,
      has_math: false,
      needs_review: true,
    };
    onQuestionsChange([...questions, newQ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#181A1D] p-4 rounded-2xl border border-slate-200 dark:border-[#383D44] shadow-xs">
        <div>
          <h2 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
            Question Review & LaTeX Verification
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#85878B] mt-0.5">
            Review parsed questions, verify KaTeX formulas, and adjust correct options.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-[#061426] dark:bg-[#D5AD5B] text-white dark:text-[#061426]'
                : 'bg-slate-100 dark:bg-[#22252A] text-slate-700 dark:text-[#B8B6B0]'
            }`}
          >
            All Questions ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('needs_review');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filter === 'needs_review'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Needs Review (
            {questions.filter((q) => q.needs_review).length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('math');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filter === 'math'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Math / Chem ({questions.filter((q) => q.has_math).length})
          </button>

          <button
            type="button"
            onClick={handleAddNewQuestion}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>
      </div>

      {/* Main Grid: Left Questions List, Right Marks Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Questions (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          {paginated.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#181A1D] rounded-2xl border border-slate-200 dark:border-[#383D44]">
              <p className="text-xs text-slate-500">No questions match the selected filter.</p>
            </div>
          ) : (
            paginated.map((q, idx) => (
              <QuestionCard
                key={q.question_number}
                question={q}
                index={(page - 1) * PAGE_SIZE + idx}
                onUpdate={(updated) => handleUpdateQuestion(updated, (page - 1) * PAGE_SIZE + idx)}
                onDelete={() => handleDeleteQuestion(q.question_number)}
              />
            ))
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#181A1D] rounded-xl border border-slate-200 dark:border-[#383D44] text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#383D44] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-600 dark:text-[#B8B6B0]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#383D44] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: Marks Distribution Engine & Actions */}
        <div className="space-y-4 sticky top-6">
          <MarksDistributionEngine
            questions={questions}
            defaultMarks={defaultMarks}
            defaultNegativeMarks={defaultNegativeMarks}
          />

          <div className="p-4 rounded-2xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] shadow-xs space-y-3">
            <button
              type="button"
              onClick={onProceed}
              className="w-full py-3 rounded-xl bg-[#D9A52E] hover:bg-[#B8871B] text-[#061426] font-bold text-xs shadow transition flex items-center justify-center gap-2"
            >
              <span>Continue to Test Configuration</span>
              <span>&rarr;</span>
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] hover:bg-slate-100 dark:hover:bg-[#22252A] text-slate-700 dark:text-[#F1EEE7] font-semibold text-xs transition"
            >
              &larr; Back to Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

