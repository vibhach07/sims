import React, { useState, useMemo } from 'react';
import { AssessmentsAPI, APITestSeries } from '../../services/api';
import MathText from '../MathText';
import {
  Upload, FileText, AlertCircle, AlertTriangle, CheckCircle2,
  Calendar, Clock, Loader2, X, Check, HelpCircle,
  FileCheck, ShieldCheck, Tag, ChevronLeft, ChevronRight, Edit3, Trash2
} from 'lucide-react';

interface ImportTestSeriesModalProps {
  onClose: () => void;
  onSuccess: (createdTest?: APITestSeries) => void;
}

interface ParsedQuestion {
  question_number: number;
  subject: string;
  question_en: string;
  question_hi?: string | null;
  option_a_en: string;
  option_a_hi?: string | null;
  option_b_en: string;
  option_b_hi?: string | null;
  option_c_en: string;
  option_c_hi?: string | null;
  option_d_en: string;
  option_d_hi?: string | null;
  correct_option: string;
  marks?: number | string | null;
  negative_marks?: number | string | null;
  explanation_en?: string;
  explanation_hi?: string | null;
  needs_review?: boolean;
}

const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const PAGE_SIZE = 8;

export const ImportTestSeriesModal: React.FC<ImportTestSeriesModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);

  // Test metadata & scheduling form
  const [title, setTitle] = useState('');
  const [exam, setExam] = useState('NIMCET');
  const [category, setCategory] = useState('after-msc-btech');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [defaultMarks, setDefaultMarks] = useState('4.00');
  const [defaultNegativeMarks, setDefaultNegativeMarks] = useState('1.00');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [hasSchedule, setHasSchedule] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<string>('');
  const [isUnlimitedAttempts, setIsUnlimitedAttempts] = useState(true);
  const [integrityMode, setIntegrityMode] = useState<'off' | 'warn' | 'strict'>('off');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('0.00');
  const [isPublished, setIsPublished] = useState(true);
  const [description, setDescription] = useState('');

  // Review pagination & editor state
  const [currentPage, setCurrentPage] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleFileSelect = async (selected: File) => {
    if (selected.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage('Selected file exceeds the maximum 500 MB size limit.');
      return;
    }
    setFile(selected);
    setErrorMessage(null);
    setWarnings([]);
    setQuestions([]);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', selected);
      formData.append('preview', 'true');

      const res = await AssessmentsAPI.importGenerate(formData);
      if (res.suggested_title && !title) {
        setTitle(res.suggested_title);
      }
      if (res.warnings) {
        setWarnings(res.warnings);
      }
      if (res.questions && Array.isArray(res.questions)) {
        setQuestions(
          res.questions.map((q: any, idx: number) => ({
            question_number: q.question_number || idx + 1,
            subject: q.subject || 'General',
            question_en: q.question_en || q.question || '',
            question_hi: q.question_hi || null,
            option_a_en: q.option_a_en || '',
            option_a_hi: q.option_a_hi || null,
            option_b_en: q.option_b_en || '',
            option_b_hi: q.option_b_hi || null,
            option_c_en: q.option_c_en || '',
            option_c_hi: q.option_c_hi || null,
            option_d_en: q.option_d_en || '',
            option_d_hi: q.option_d_hi || null,
            correct_option: (q.correct_option || 'A').toUpperCase(),
            marks: q.marks || defaultMarks,
            negative_marks: q.negative_marks || defaultNegativeMarks,
            explanation_en: q.explanation_en || q.explanation || '',
            explanation_hi: q.explanation_hi || null,
            needs_review: q.needs_review || false,
          }))
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse file. Please verify formatting.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCorrectOptionChange = (idx: number, newOption: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], correct_option: newOption, needs_review: false };
      return copy;
    });
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) setEditingIndex(null);
  };

  const handleGenerateTestSeries = async () => {
    if (!title.trim()) {
      setErrorMessage('Please provide a title for the test series.');
      return;
    }
    if (questions.length === 0) {
      setErrorMessage('Please upload a document with at least one question.');
      return;
    }
    if (hasSchedule && startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setErrorMessage('Scheduled End Time must be strictly after Scheduled Start Time.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('preview', 'false');
      formData.append('title', title.trim());
      formData.append('exam', exam);
      formData.append('category', category);
      formData.append('duration_minutes', String(durationMinutes));
      formData.append('default_marks', defaultMarks);
      formData.append('default_negative_marks', defaultNegativeMarks);
      formData.append('is_paid', String(isPaid));
      formData.append('price', isPaid ? price : '0.00');
      formData.append('is_published', String(isPublished));
      formData.append('integrity_mode', integrityMode);
      formData.append('description', description);

      if (hasSchedule && startsAt) {
        formData.append('starts_at', new Date(startsAt).toISOString());
      }
      if (hasSchedule && endsAt) {
        formData.append('ends_at', new Date(endsAt).toISOString());
      }
      if (!isUnlimitedAttempts && maxAttempts) {
        formData.append('max_attempts', maxAttempts);
      }

      // Send reviewed questions json
      formData.append('questions_json', JSON.stringify(questions));

      const res = await AssessmentsAPI.importGenerate(formData);
      onSuccess(res.test);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate test series.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Pagination for question cards
  const totalPages = Math.ceil(questions.length / PAGE_SIZE) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return questions.slice(start, start + PAGE_SIZE);
  }, [questions, currentPage]);

  const totalCalculatedMarks = useMemo(() => {
    return questions.reduce((sum, q) => {
      const m = parseFloat(String(q.marks || defaultMarks)) || 4;
      return sum + m;
    }, 0);
  }, [questions, defaultMarks]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#181A1D] border border-slate-200 dark:border-[#383D44] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#2C3036] flex items-center justify-between bg-slate-50/50 dark:bg-[#101113]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9A52E]/10 dark:bg-[#D5AD5B]/15 border border-[#D9A52E]/30 flex items-center justify-center text-[#D9A52E] dark:text-[#D5AD5B]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#061426] dark:text-[#F1EEE7]">
                Import & Generate Test Series
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#85878B]">
                Upload PDF, Word (.docx), CSV, Excel, TXT, or scanned image to auto-generate a complete scheduled test
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2C3036] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Warnings Banner */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Parser Notes:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 1. Document Upload Dropzone */}
          <div className="border-2 border-dashed border-[#D9A52E]/40 dark:border-[#383D44] hover:border-[#D9A52E] rounded-2xl p-5 bg-[#FAF7F0]/40 dark:bg-[#101113] text-center transition">
            <input
              type="file"
              id="test-series-document-upload"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.json,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <label
              htmlFor="test-series-document-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-[#D9A52E]/10 dark:bg-[#D5AD5B]/15 flex items-center justify-center text-[#D9A52E] dark:text-[#D5AD5B]">
                {isParsing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#061426] dark:text-[#F1EEE7]">
                  {file ? file.name : 'Click to select or drag & drop question paper'}
                </p>
                <p className="text-xs text-slate-500 dark:text-[#85878B] mt-0.5">
                  Supported formats: PDF (text & scanned OCR), Word (.docx), Excel (.xlsx), CSV, JSON, TXT, Images (PNG, JPG, WEBP)
                </p>
              </div>
              {file && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready</span>
                </div>
              )}
            </label>
          </div>

          {/* 2. Test Configuration & Scheduling Grid */}
          <div className="bg-slate-50/70 dark:bg-[#22252A] p-5 rounded-2xl border border-slate-200/80 dark:border-[#383D44] space-y-4">
            <h4 className="font-serif font-bold text-sm text-[#061426] dark:text-[#F1EEE7] flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#D9A52E]" />
              Test Series Metadata & Exam Configuration
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              {/* Title */}
              <div className="lg:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                  Test Series Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. NIMCET 2026 Mathematics Practice Test 01"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                />
              </div>

              {/* Target Exam */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                  Target Exam *
                </label>
                <select
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                >
                  <option value="NIMCET">NIMCET</option>
                  <option value="GATE">GATE</option>
                  <option value="IIT-JAM">IIT-JAM</option>
                  <option value="CSIR-NET">CSIR-NET</option>
                  <option value="CUET-PG">CUET-PG</option>
                  <option value="SET">SET</option>
                  <option value="General">General / Foundation</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                  Exam Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                >
                  <option value="after-msc-btech">After MSc / B.Tech (GATE / NET)</option>
                  <option value="after-graduation">After Graduation (NIMCET / IIT-JAM)</option>
                  <option value="after-12th">After 12th (Undergraduate)</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                  Duration (Minutes) *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    min="5"
                    max="360"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                  />
                </div>
              </div>

              {/* Marks per Question */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                  Default Marks / Neg Marks
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={defaultMarks}
                    onChange={(e) => setDefaultMarks(e.target.value)}
                    placeholder="+4"
                    title="Marks per question"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                  />
                  <input
                    type="number"
                    step="0.25"
                    value={defaultNegativeMarks}
                    onChange={(e) => setDefaultNegativeMarks(e.target.value)}
                    placeholder="-1"
                    title="Negative marks per wrong answer"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Scheduling Section */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-[#2C3036] space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[#061426] dark:text-[#F1EEE7]">
                  <input
                    type="checkbox"
                    checked={hasSchedule}
                    onChange={(e) => setHasSchedule(e.target.checked)}
                    className="rounded text-[#D9A52E] focus:ring-[#D9A52E] w-4 h-4"
                  />
                  <span>Schedule Test Window (Live Date & Time Window)</span>
                </label>
                {hasSchedule && (
                  <span className="text-[11px] text-[#D9A52E] font-medium">
                    Test can only be taken between start and end times
                  </span>
                )}
              </div>

              {hasSchedule && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                      Scheduled Start Time (Date & Time)
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                      Scheduled End Time (Deadline)
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] focus:ring-1 focus:ring-[#D9A52E] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Options */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-[#2C3036] flex flex-wrap items-center gap-6 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-[#B8B6B0]">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded text-[#D9A52E] focus:ring-[#D9A52E]"
                />
                <span>Active / Published</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-[#B8B6B0]">
                <input
                  type="checkbox"
                  checked={isUnlimitedAttempts}
                  onChange={(e) => setIsUnlimitedAttempts(e.target.checked)}
                  className="rounded text-[#D9A52E] focus:ring-[#D9A52E]"
                />
                <span>Unlimited Student Attempts</span>
              </label>

              {!isUnlimitedAttempts && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400">Max Attempts:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    placeholder="1"
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-xs"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">Proctoring:</span>
                <select
                  value={integrityMode}
                  onChange={(e) => setIntegrityMode(e.target.value as any)}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] text-xs font-medium"
                >
                  <option value="off">Off (Disabled - Recommended)</option>
                  <option value="warn">Warn (Notify on tab switch)</option>
                  <option value="strict">Strict (Auto-submit on tab switch)</option>
                </select>
              </div>
            </div>

          </div>

          {/* 3. Review Parsed Questions List */}
          {questions.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 dark:bg-[#22252A] p-4 rounded-xl border border-slate-200 dark:border-[#383D44]">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs">
                    {questions.length} Questions Extracted
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-[#B8B6B0]">
                    Total Marks: <span className="text-[#D9A52E] dark:text-[#D5AD5B]">{totalCalculatedMarks}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-[#85878B]">
                  Click option letter to change correct answer • All questions will be saved
                </div>
              </div>

              {/* Questions Cards */}
              <div className="space-y-3">
                {paginatedQuestions.map((q, localIdx) => {
                  const globalIdx = (currentPage - 1) * PAGE_SIZE + localIdx;
                  return (
                    <div
                      key={globalIdx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-[#2C3036] bg-white dark:bg-[#181A1D] shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#061426] dark:text-[#F1EEE7]">
                          <span className="w-6 h-6 rounded-full bg-[#D9A52E]/10 dark:bg-[#D5AD5B]/15 text-[#D9A52E] flex items-center justify-center text-xs">
                            {q.question_number}
                          </span>
                          <span>Marks: +{q.marks || defaultMarks} / -{q.negative_marks || defaultNegativeMarks}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(globalIdx)}
                          className="p-1 text-slate-400 hover:text-red-500 transition"
                          title="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Question English */}
                      <div className="text-sm font-medium text-slate-800 dark:text-[#F1EEE7] leading-relaxed">
                        <MathText text={q.question_en} />
                      </div>

                      {/* Question Hindi (if bilingual) */}
                      {q.question_hi && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 italic">
                          <MathText text={q.question_hi} />
                        </div>
                      )}

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                          const optKey = `option_${opt.toLowerCase()}_en` as keyof ParsedQuestion;
                          const optVal = String(q[optKey] || '');
                          const isCorrect = q.correct_option === opt;

                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleCorrectOptionChange(globalIdx, opt)}
                              className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-semibold'
                                  : 'bg-slate-50 dark:bg-[#22252A] border-slate-200 dark:border-[#383D44] text-slate-700 dark:text-[#B8B6B0] hover:border-slate-300'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-[#2C3036] text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {opt}
                              </span>
                              <div className="flex-1 truncate">
                                <MathText text={optVal} />
                              </div>
                              {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation_en && (
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#22252A] border border-slate-100 dark:border-[#2C3036] text-xs text-slate-600 dark:text-[#85878B]">
                          <span className="font-semibold text-slate-700 dark:text-[#B8B6B0]">Explanation: </span>
                          <MathText text={q.explanation_en} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500 dark:text-[#85878B]">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#383D44] text-xs disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4 inline" /> Prev
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#383D44] text-xs disabled:opacity-40"
                    >
                      Next <ChevronRight className="w-4 h-4 inline" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2C3036] bg-slate-50/50 dark:bg-[#101113] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#383D44] text-xs font-semibold text-slate-600 dark:text-[#B8B6B0] hover:bg-slate-100 dark:hover:bg-[#22252A] transition"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={isParsing || isGenerating || questions.length === 0}
            onClick={handleGenerateTestSeries}
            className="px-6 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs shadow-md flex items-center gap-2 disabled:opacity-50 transition"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Test Series & Scheduling...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Generate & Schedule Test Series ({questions.length} Qs)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImportTestSeriesModal;

