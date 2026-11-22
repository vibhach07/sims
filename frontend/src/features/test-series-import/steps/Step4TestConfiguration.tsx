import React, { useState, useEffect } from 'react';
import { TestConfig, ImportQuestion } from '../types/import.types';
import { AssessmentsAPI } from '../../../services/api';
import { Sparkles, Calendar, Clock, FileText, CheckCircle2, Layers } from 'lucide-react';

interface Step4TestConfigurationProps {
  config: TestConfig;
  questions: ImportQuestion[];
  onChange: (updated: TestConfig) => void;
  onProceed: () => void;
  onBack: () => void;
}

export const Step4TestConfiguration: React.FC<Step4TestConfigurationProps> = ({
  config,
  questions,
  onChange,
  onProceed,
  onBack,
}) => {
  const [packages, setPackages] = useState<Array<{ id: number; title: string; price: string | number }>>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingPackages(true);
    AssessmentsAPI.list()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setPackages(data.map((t: any) => ({
            id: t.id,
            title: t.title,
            price: t.price || '0.00',
          })));
          if (data.length > 0 && !config.assigned_package_id) {
            onChange({ ...config, assigned_package_id: data[0].id });
          }
        }
      })
      .catch(() => {
        // Fallback default mock
        if (isMounted) {
          setPackages([
            { id: 1, title: 'GATE Chemical Engineering (CH) CBT Test Series [CH - ₹1999.00]', price: '1999.00' },
            { id: 2, title: 'GATE All India Chemical Engineering Mock Series [CH - ₹999.00]', price: '999.00' },
          ]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingPackages(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Compute live marks distribution breakdown
  const totalQuestions = questions.length;
  
  // Strategy calculations
  let secACount = questions.filter(q => q.marks === 1 || q.section === 'A').length;
  let secBCount = questions.filter(q => q.marks === 2 || q.section === 'B').length;

  if (config.distribution_strategy === 'balanced_50_50' || (!secACount && !secBCount)) {
    secACount = Math.ceil(totalQuestions / 2);
    secBCount = Math.floor(totalQuestions / 2);
  } else if (config.distribution_strategy === 'all_1m') {
    secACount = totalQuestions;
    secBCount = 0;
  } else if (config.distribution_strategy === 'all_2m') {
    secACount = 0;
    secBCount = totalQuestions;
  }

  const secAMarks = secACount * 1;
  const secBMarks = secBCount * 2;
  const totalCalculatedMarks = secAMarks + secBMarks;

  const secAPercent = totalQuestions > 0 ? Math.round((secACount / totalQuestions) * 100) : 50;
  const secBPercent = totalQuestions > 0 ? 100 - secAPercent : 50;

  // Counts by question type
  const mcqCount = questions.filter(q => !q.type || q.type === 'MCQ').length || totalQuestions;
  const msqCount = questions.filter(q => q.type === 'MSQ').length;
  const natCount = questions.filter(q => q.type === 'NAT').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-12">
      {/* LEFT COLUMN: Examination Parameters Form */}
      <div className="lg:col-span-7 bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="font-serif font-bold text-lg text-[#061426] dark:text-[#F1EEE7]">
            Step 4 — Examination Parameters
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#85878B]">
            Define paper metadata, exam discipline, and test guidelines.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          {/* Test Paper Title */}
          <div>
            <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
              Test Paper Title *
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              placeholder="e.g. GATE Chemical Engineering CBT Test Series — Mock Test #03"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none focus:ring-1 focus:ring-[#D9A52E] font-medium"
            />
          </div>

          {/* Discipline / Branch & Test Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Discipline / Branch *
              </label>
              <select
                value={config.branch}
                onChange={(e) => onChange({ ...config, branch: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              >
                <option value="CH">CH (Chemical Engineering)</option>
                <option value="CS">CS (Computer Science & IT)</option>
                <option value="ME">ME (Mechanical Engineering)</option>
                <option value="EC">EC (Electronics & Comm.)</option>
                <option value="EE">EE (Electrical Engineering)</option>
                <option value="CE">CE (Civil Engineering)</option>
                <option value="GEN">General Aptitude / Engineering</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Test Type *
              </label>
              <select
                value={config.test_type}
                onChange={(e) => onChange({ ...config, test_type: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              >
                <option value="All-India Open Mock">All-India Open Mock</option>
                <option value="Full Length Grand CBT">Full Length Grand CBT</option>
                <option value="Sectional Speed Test">Sectional Speed Test</option>
                <option value="Topic-Wise Diagnostic">Topic-Wise Diagnostic</option>
              </select>
            </div>
          </div>

          {/* Assigned Test Series Package */}
          <div>
            <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
              Assigned Test Series Package (Purchase Dependency) *
            </label>
            <select
              value={config.assigned_package_id || ''}
              onChange={(e) => onChange({ ...config, assigned_package_id: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-[#85878B] mt-1">
              Students must purchase this specific test series to unlock and attempt this examination.
            </p>
          </div>

          {/* Publishing Status & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Publishing Status *
              </label>
              <select
                value={config.publishing_status}
                onChange={(e) => onChange({ ...config, publishing_status: e.target.value as any, is_published: e.target.value === 'Published' })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              >
                <option value="Published">Published (Visible to eligible students)</option>
                <option value="Draft">Draft (Educator / Admin review only)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Visibility & Access Control *
              </label>
              <select
                value={config.visibility}
                onChange={(e) => onChange({ ...config, visibility: e.target.value as any })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              >
                <option value="Restricted">🔒 Restricted (Matching Branch + Purchased Series)</option>
                <option value="Public">🌐 Public (All Enrolled Students)</option>
                <option value="Private">👁️ Private (Invite / Direct Link Only)</option>
              </select>
            </div>
          </div>

          {/* Scheduling Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Test Start Date (Unlocks)
              </label>
              <input
                type="datetime-local"
                disabled={config.available_immediately}
                value={config.starts_at || ''}
                onChange={(e) => onChange({ ...config, starts_at: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none disabled:bg-slate-100 dark:disabled:bg-[#1C1F24] disabled:text-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Test End Date (Submissions Close)
              </label>
              <input
                type="datetime-local"
                value={config.ends_at || ''}
                onChange={(e) => onChange({ ...config, ends_at: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              />
              <span className="text-[10px] text-slate-500 dark:text-[#85878B] block mt-1">
                Leave blank for open-ended access.
              </span>
            </div>
          </div>

          {/* Available Immediately Checkbox */}
          <div className="p-3 bg-amber-50/60 dark:bg-[#22252A] rounded-xl border border-amber-200/60 dark:border-[#383D44]">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-[#A87519] dark:text-[#D5AD5B]">
              <input
                type="checkbox"
                checked={config.available_immediately}
                onChange={(e) => onChange({ ...config, available_immediately: e.target.checked })}
                className="w-4 h-4 rounded text-[#D9A52E] focus:ring-0 cursor-pointer"
              />
              ⚡ Available Immediately (No date/time lock for students)
            </label>
          </div>

          {/* Subject & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">Subject</label>
              <input
                type="text"
                value={config.subject}
                onChange={(e) => onChange({ ...config, subject: e.target.value })}
                placeholder="e.g. Chemical Reaction Engineering / Thermodynamics"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">Topic</label>
              <input
                type="text"
                value={config.topic}
                onChange={(e) => onChange({ ...config, topic: e.target.value })}
                placeholder="e.g. Kinetics, Reactor Design & Catalysis"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              />
            </div>
          </div>

          {/* Duration & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={360}
                value={config.duration_minutes}
                onChange={(e) => onChange({ ...config, duration_minutes: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
                Examination Language
              </label>
              <select
                value={config.language}
                onChange={(e) => onChange({ ...config, language: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Bilingual">Bilingual (English + Hindi)</option>
              </select>
            </div>
          </div>

          {/* Examination Instructions */}
          <div>
            <label className="block font-bold text-[#061426] dark:text-[#F1EEE7] mb-1">
              Examination Instructions • Section Details
            </label>
            <textarea
              rows={5}
              value={config.instructions}
              onChange={(e) => onChange({ ...config, instructions: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-mono text-[11px] leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Live Marks Distribution Engine */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-serif font-bold text-base text-[#061426] dark:text-[#F1EEE7]">
              Live Marks Distribution Engine
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#85878B]">
              Intelligent calculation of 1-mark & 2-mark categories.
            </p>
          </div>

          {/* Strategy Selector */}
          <div className="text-xs space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-[#B8B6B0]">Distribution Strategy:</label>
            <select
              value={config.distribution_strategy}
              onChange={(e) => onChange({ ...config, distribution_strategy: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A] text-[#061426] dark:text-[#F1EEE7] outline-none font-medium text-xs"
            >
              <option value="balanced_50_50">Balanced 50/50 ({secACount}×1M + {secBCount}×2M)</option>
              <option value="all_1m">Uniform 1-Mark All Sections</option>
              <option value="all_2m">Uniform 2-Marks All Sections</option>
              <option value="custom">Custom Preserved from Ingestion</option>
            </select>
          </div>

          {/* 4 Stat Tiles Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#2C3036] bg-slate-50 dark:bg-[#22252A]">
              <span className="block text-lg font-bold text-[#061426] dark:text-[#F1EEE7]">
                {totalQuestions}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#85878B] font-medium leading-tight block mt-0.5">
                Total Questions
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#2C3036] bg-slate-50 dark:bg-[#22252A]">
              <span className="block text-lg font-bold text-[#061426] dark:text-[#F1EEE7]">
                {secACount}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#85878B] font-medium leading-tight block mt-0.5">
                1-Mark Qs (Sec A)
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#2C3036] bg-slate-50 dark:bg-[#22252A]">
              <span className="block text-lg font-bold text-[#061426] dark:text-[#F1EEE7]">
                {secBCount}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#85878B] font-medium leading-tight block mt-0.5">
                2-Mark Qs (Sec B)
              </span>
            </div>

            <div className="p-2.5 rounded-xl border-2 border-amber-300 dark:border-[#D5AD5B] bg-amber-50/50 dark:bg-[#2A261E]">
              <span className="block text-lg font-bold text-amber-700 dark:text-[#D5AD5B]">
                {totalCalculatedMarks.toFixed(2)}
              </span>
              <span className="text-[10px] text-amber-800 dark:text-[#D5AD5B] font-bold leading-tight block mt-0.5">
                Total Marks
              </span>
            </div>
          </div>

          {/* Progress Split Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#2C3036] overflow-hidden flex">
              <div
                style={{ width: `${secAPercent}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
              />
              <div
                style={{ width: `${secBPercent}%` }}
                className="bg-amber-500 h-full transition-all duration-300"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-[#85878B]">
              <span className="text-emerald-700 dark:text-emerald-400">
                Section A (1-Mark): {secAPercent}% ({secACount} Qs)
              </span>
              <span className="text-amber-700 dark:text-amber-400">
                Section B (2-Mark): {secBPercent}% ({secBCount} Qs)
              </span>
            </div>
          </div>

          {/* Type Chips */}
          <div className="flex items-center gap-2 pt-1 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-[#1E2530] text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900/50">
              MCQ: {mcqCount} Single Correct
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-[#251F30] text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-900/50">
              MSQ: {msqCount} Multi-Select
            </span>
            <span className="px-2.5 py-1 rounded-full bg-orange-50 dark:bg-[#2D211A] text-orange-700 dark:text-orange-300 font-semibold border border-orange-200 dark:border-orange-900/50">
              NAT: {natCount} Numerical
            </span>
          </div>

          {/* Calculation Summary Box */}
          <div className="p-3 bg-slate-50 dark:bg-[#22252A] rounded-xl border border-slate-200 dark:border-[#2C3036] text-center text-xs font-semibold text-[#061426] dark:text-[#F1EEE7]">
            {secACount} Questions × 1 Mark ({secAMarks} M) + {secBCount} Questions × 2 Marks ({secBMarks} M) = {totalCalculatedMarks.toFixed(2)} Total Marks
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-[#383D44] text-[#061426] dark:text-[#F1EEE7] font-semibold text-xs hover:bg-slate-50 dark:hover:bg-[#22252A] transition"
          >
            ← Back to Questions Review
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="w-1/2 py-2.5 px-4 rounded-xl bg-[#061426] hover:bg-[#1C2C42] text-white font-bold text-xs shadow-md transition"
          >
            Proceed to Examination Preview →
          </button>
        </div>

        {/* Bottom Sidebar: Target CBT Test Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-[#2A261E] border border-amber-300 text-amber-800 dark:text-[#D5AD5B] flex items-center justify-center font-bold text-xs">
            {config.branch || 'CH'}
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Target CBT Test
            </span>
            <span className="text-xs font-bold text-[#061426] dark:text-[#F1EEE7] truncate block">
              {config.title || 'GATE Chemical Engineering (CH) CBT Test Series'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
