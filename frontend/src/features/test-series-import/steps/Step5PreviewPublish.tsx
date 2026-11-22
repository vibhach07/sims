import React, { useState } from 'react';
import { ImportQuestion, TestConfig } from '../types/import.types';
import { MathRenderer } from '../components/math/MathRenderer';
import { formatISTDisplay } from '../utils/scheduling';
import { CheckCircle2, Award, Clock, ShieldCheck, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Step5PreviewPublishProps {
  config: TestConfig;
  questions: ImportQuestion[];
  onPublish: () => Promise<void>;
  isPublishing: boolean;
  publishResult?: { success: boolean; test_slug: string; test_id: number; message: string } | null;
  error?: string | null;
  onBack: () => void;
}

export const Step5PreviewPublish: React.FC<Step5PreviewPublishProps> = ({
  config,
  questions,
  onPublish,
  isPublishing,
  publishResult,
  error,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + Number(q.marks || config.default_marks), 0);
  const mathQuestionsCount = questions.filter((q) => q.has_math).length;

  if (publishResult && publishResult.success) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6 bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] rounded-3xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif font-bold text-2xl text-[#061426] dark:text-[#F1EEE7]">
            Test Series Published Successfully!
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#85878B]">
            {publishResult.message}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#22252A] border border-slate-200 dark:border-[#383D44] text-xs space-y-2 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Exam Target:</span>
            <span className="font-bold">{config.exam}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Questions:</span>
            <span className="font-bold">{questions.length} Questions</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Marks:</span>
            <span className="font-bold text-[#D9A52E]">{totalCalculatedMarks} Marks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Live Test URL:</span>
            <span className="font-mono text-[11px] text-[#061426] dark:text-[#F1EEE7]">/student/tests/{publishResult.test_slug}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to={`/student/tests/${publishResult.test_slug}`}
            className="px-6 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#B8871B] text-[#061426] font-bold text-xs shadow flex items-center gap-1.5"
          >
            Take Test as Student <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/admin/tests"
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] hover:bg-slate-100 dark:hover:bg-[#22252A] text-slate-700 dark:text-[#F1EEE7] font-semibold text-xs"
          >
            Manage in Test Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#181A1D] p-5 rounded-2xl border border-slate-200 dark:border-[#383D44] shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A87519] bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
            {config.exam} • Step 5 of 5
          </span>
          <h2 className="font-serif font-bold text-2xl text-[#061426] dark:text-[#F1EEE7] mt-1">
            {config.title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isPublishing}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] text-slate-700 dark:text-[#F1EEE7] font-semibold text-xs"
          >
            &larr; Back
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing Test...' : `Confirm & Publish (${questions.length} Qs)`}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#383D44] pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl font-bold transition ${
            activeTab === 'overview'
              ? 'bg-[#061426] dark:bg-[#D5AD5B] text-white dark:text-[#061426]'
              : 'text-slate-600 dark:text-[#85878B] hover:bg-slate-100 dark:hover:bg-[#22252A]'
          }`}
        >
          Examination Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 rounded-xl font-bold transition ${
            activeTab === 'questions'
              ? 'bg-[#061426] dark:bg-[#D5AD5B] text-white dark:text-[#061426]'
              : 'text-slate-600 dark:text-[#85878B] hover:bg-slate-100 dark:hover:bg-[#22252A]'
          }`}
        >
          Preview Questions ({questions.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-[#85878B] block">Total Questions</span>
            <div className="text-2xl font-bold font-serif text-[#061426] dark:text-[#F1EEE7]">{questions.length} Qs</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-[#85878B] block">Total Marks</span>
            <div className="text-2xl font-bold font-serif text-[#D9A52E]">{totalCalculatedMarks} Marks</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-[#85878B] block">Duration</span>
            <div className="text-2xl font-bold font-serif text-[#061426] dark:text-[#F1EEE7]">{config.duration_minutes} Mins</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-[#85878B] block">Proctoring Mode</span>
            <div className="text-sm font-bold uppercase text-slate-700 dark:text-[#F1EEE7] pt-1">{config.integrity_mode}</div>
          </div>
        </div>
      )}

      {/* Tab 2: Full Questions Preview */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.question_number}
              className="p-5 rounded-2xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] space-y-3 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#2C3036]">
                <span className="font-bold text-[#061426] dark:text-[#F1EEE7]">
                  Question #{q.question_number} ({q.subject})
                </span>
                <span className="text-slate-500">
                  +{q.marks}m / -{q.negative_marks}m
                </span>
              </div>

              {q.image_url && (
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#101113] max-h-44 flex items-center justify-center overflow-hidden">
                  <img src={q.image_url} alt="Figure" className="max-h-40 object-contain" />
                </div>
              )}

              <div className="text-sm text-[#061426] dark:text-[#F1EEE7] leading-relaxed">
                <MathRenderer text={q.question_en} block />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const optKey = `option_${opt.toLowerCase()}_en` as keyof ImportQuestion;
                  const isCorrect = q.correct_option === opt;
                  return (
                    <div
                      key={opt}
                      className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 font-semibold'
                          : 'border-slate-200 dark:border-[#2C3036]'
                      }`}
                    >
                      <span className="w-5 h-5 rounded font-bold text-[11px] flex items-center justify-center bg-slate-200 dark:bg-[#2C3036]">
                        {opt}
                      </span>
                      <MathRenderer text={q[optKey] as string} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

