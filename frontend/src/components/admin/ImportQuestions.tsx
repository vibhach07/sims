import React, { useState, useMemo } from 'react';
import { AssessmentsAPI, APITestSeries, APIBulkImportResult } from '../../services/api';
import MathText from '../MathText';
import {
  Upload, FileText, AlertCircle, AlertTriangle, CheckCircle2,
  Download, Loader2, X, HelpCircle, ArrowRight, Trash2, Edit3,
  ChevronLeft, ChevronRight, Check, ArrowUp, ArrowDown, Filter
} from 'lucide-react';

interface ImportQuestionsProps {
  test: APITestSeries;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditableQuestion {
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
  needs_review?: boolean;
  explanation_en?: string;
  explanation_hi?: string | null;
  marks?: number | string | null;
  negative_marks?: number | string | null;
}

const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const PAGE_SIZE = 10;

export const ImportQuestions: React.FC<ImportQuestionsProps> = ({ test, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [confirmReplace, setConfirmReplace] = useState(false);

  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [previewResult, setPreviewResult] = useState<APIBulkImportResult | null>(null);
  const [editableQuestions, setEditableQuestions] = useState<EditableQuestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<APIBulkImportResult | null>(null);

  // Review stage state
  const [filterMode, setFilterMode] = useState<'all' | 'needs_review'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const hasAttempts = (test.usedAttempts ?? 0) > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > MAX_UPLOAD_SIZE_BYTES) {
        setErrorMessage('Selected file exceeds the maximum allowed upload limit of 500 MB.');
        return;
      }
      setFile(selected);
      setPreviewResult(null);
      setEditableQuestions([]);
      setErrorMessage(null);
      setSuccessResult(null);
      setCurrentPage(1);
      setEditingIndex(null);
    }
  };

  const handleValidatePreview = async () => {
    if (!file) return;
    setIsValidating(true);
    setErrorMessage(null);
    setPreviewResult(null);
    setEditableQuestions([]);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('preview', 'true');
    fd.append('mode', mode);

    try {
      const res = await AssessmentsAPI.bulkImport(test.slug, fd);
      setPreviewResult(res);
      if (res.preview_questions && Array.isArray(res.preview_questions)) {
        const mapped: EditableQuestion[] = res.preview_questions.map((q: any, idx: number) => ({
          question_number: q.question_number || (idx + 1),
          subject: q.subject || 'General',
          question_en: q.question_en || q.question || '',
          question_hi: q.question_hi || null,
          option_a_en: q.option_a_en || (q.options_json?.[0] ?? ''),
          option_a_hi: q.option_a_hi || null,
          option_b_en: q.option_b_en || (q.options_json?.[1] ?? ''),
          option_b_hi: q.option_b_hi || null,
          option_c_en: q.option_c_en || (q.options_json?.[2] ?? ''),
          option_c_hi: q.option_c_hi || null,
          option_d_en: q.option_d_en || (q.options_json?.[3] ?? ''),
          option_d_hi: q.option_d_hi || null,
          correct_option: (q.correct_option || '').toUpperCase(),
          needs_review: Boolean(q.needs_review || !q.correct_option),
          explanation_en: q.explanation_en || q.explanation || '',
          explanation_hi: q.explanation_hi || null,
          marks: q.marks !== undefined && q.marks !== null ? q.marks : null,
          negative_marks: q.negative_marks !== undefined && q.negative_marks !== null ? q.negative_marks : null,
        }));
        setEditableQuestions(mapped);
      }
      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Validation request failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpdateQuestion = (index: number, field: keyof EditableQuestion, val: any) => {
    setEditableQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[index], [field]: val };
      if (field === 'correct_option') {
        q.correct_option = String(val).toUpperCase();
        q.needs_review = !q.correct_option;
      }
      updated[index] = q;
      return updated;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setEditableQuestions(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    setEditableQuestions(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    });
  };

  const handleExecuteImport = async () => {
    if (!editableQuestions.length) return;

    if (mode === 'replace' && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    const fd = new FormData();
    fd.append('questions_json', JSON.stringify(editableQuestions));
    fd.append('preview', 'false');
    fd.append('mode', mode);

    try {
      const res = await AssessmentsAPI.bulkImport(test.slug, fd);
      if (res.error || (res.errors && res.errors.length > 0)) {
        setErrorMessage(res.error || 'Import failed with validation errors.');
        setPreviewResult(res);
      } else {
        setSuccessResult(res);
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Execution error during question import.');
    } finally {
      setIsImporting(false);
      setConfirmReplace(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    if (filterMode === 'needs_review') {
      return editableQuestions
        .map((q, origIdx) => ({ ...q, origIdx }))
        .filter(q => q.needs_review || !q.correct_option);
    }
    return editableQuestions.map((q, origIdx) => ({ ...q, origIdx }));
  }, [editableQuestions, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const displayedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, currentPage]);

  const needsReviewCount = useMemo(() => {
    return editableQuestions.filter(q => q.needs_review || !q.correct_option).length;
  }, [editableQuestions]);

  const downloadSampleTemplate = () => {
    const csvContent =
      "subject,question,question_hi,option_a,option_b,option_c,option_d,option_a_hi,option_b_hi,option_c_hi,option_d_hi,correct_answer,explanation,explanation_hi,marks,negative_marks\n" +
      'Mathematics,"Evaluate the determinant of a 3x3 identity matrix. [2 Marks]","3x3 तत्समक आव्यूह का सारणिक ज्ञात कीजिए।","0","1","3","-1","0","1","3","-1","B","The determinant of any identity matrix is 1.","किसी भी तत्समक आव्यूह का सारणिक सदैव 1 होता है।",2.0,0.66\n' +
      'Algebra,"Find the roots of equation $x^2 - 5x + 6 = 0$. [1 Mark]","समीकरण $x^2 - 5x + 6 = 0$ के मूल ज्ञात कीजिए।","$x = 2, 3$","$x = 1, 6$","$x = -2, -3$","$x = -1, -6$","2, 3","1, 6","-2, -3","-1, -6","A","Factoring the quadratic yields $(x-2)(x-3)=0 \\implies x=2,3$.","द्विघात समीकरण का गुणनखंड $(x-2)(x-3)=0$ देता है।",1.0,0.33\n' +
      'Calculus,"Evaluate $$\\int_0^1 x^2\\,dx$$ [2 Marks]","मान ज्ञात कीजिए: $$\\int_0^1 x^2\\,dx$$","1/3","1/2","1/4","1","1/3","1/2","1/4","1","A","Using fundamental theorem of calculus: $[x^3/3]_0^1 = 1/3$.","समाकलन करने पर $x^3/3$ प्राप्त होता है।",2.0,0.66\n';

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sims_bilingual_template_${test.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3D8BE] my-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E3D8BE]">
          <div>
            <span className="text-[11px] font-bold text-[#A87519] uppercase tracking-wider">
              Bulk Question Paper Importer & OCR Engine
            </span>
            <h2 className="font-serif font-bold text-2xl text-[#061426] mt-0.5">
              {test.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#687386] hover:bg-gray-100 hover:text-[#061426] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {successResult ? (
          <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-serif font-bold text-2xl text-emerald-950">
              Questions Imported Successfully!
            </h3>
            <p className="text-sm text-emerald-800">
              Successfully imported <strong>{successResult.imported_count}</strong> question(s). Total questions in test series: <strong>{successResult.new_total_questions}</strong>.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 transition"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <>
            {/* Format & Guidelines Box */}
            <div className="p-4 rounded-2xl bg-[#F8F4EA] border border-[#E3D8BE] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-xs text-[#263347]">
                <p className="font-bold text-[#061426] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#A87519]" /> Supported Formats & Capabilities
                </p>
                <p className="text-[#687386]">
                  Upload PDF, Word (.docx), CSV, XLSX or JSON (Up to <strong>50 MB</strong>). Extracts all questions, options (A-D or 1-4), per-question marks, negative marking, and LaTeX formulas.
                </p>
              </div>

              <button
                onClick={downloadSampleTemplate}
                className="px-4 py-2 rounded-xl bg-white border border-[#E3D8BE] hover:bg-gray-50 text-[#061426] font-bold text-xs flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4 text-[#A87519]" />
                Download Template (CSV)
              </button>
            </div>

            {/* Mode Selector & File Dropzone */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#061426] mb-2 uppercase tracking-wider">
                  Import Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      mode === 'append'
                        ? 'border-[#A87519] bg-[#F8F4EA] ring-1 ring-[#A87519]'
                        : 'border-[#E3D8BE] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="append"
                      checked={mode === 'append'}
                      onChange={() => {
                        setMode('append');
                        setConfirmReplace(false);
                      }}
                      className="mt-0.5 text-[#A87519]"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#061426] block">Append Mode (Default)</span>
                      <span className="text-[11px] text-[#687386]">
                        Appends new questions. Duplicate questions are skipped with warnings.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-4 rounded-xl border flex items-start gap-3 transition ${
                      hasAttempts ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : 'cursor-pointer hover:bg-gray-50'
                    } ${
                      mode === 'replace'
                        ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500'
                        : 'border-[#E3D8BE] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="replace"
                      disabled={hasAttempts}
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      className="mt-0.5 text-red-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-red-900 block">Replace Mode</span>
                      <span className="text-[11px] text-red-700">
                        {hasAttempts
                          ? 'Disabled: attempts already exist for this test.'
                          : 'Deletes existing questions and re-indexes from 1.'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-[#061426] mb-2 uppercase tracking-wider">
                  Select Question Paper Document
                </label>
                <div className="border-2 border-dashed border-[#E3D8BE] rounded-2xl p-6 text-center hover:border-[#A87519] bg-white transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.csv,.xlsx,.json"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-xl bg-[#F8F4EA] border border-[#E3D8BE] flex items-center justify-center text-[#A87519]">
                      <Upload className="w-6 h-6" />
                    </div>
                    {file ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-[#061426]">{file.name}</p>
                        <p className="text-xs text-[#687386]">{(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-[#061426]">Click or drag & drop question paper here</p>
                        <p className="text-xs text-[#687386]">Supports .pdf, .docx, .csv, .xlsx, .json (Maximum 50 MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 text-xs">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Notice</p>
                  <p className="text-red-800">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Preview & Review Section */}
            {previewResult && (
              <div className="space-y-4 pt-2 border-t border-[#E3D8BE]">
                {/* Stats Summary Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-[#F8F4EA] p-3 rounded-xl border border-[#E3D8BE]">
                    <span className="text-[#687386] block text-[10px] uppercase font-bold">Total Detected</span>
                    <strong className="text-lg text-[#061426]">{previewResult.total_detected ?? previewResult.total_rows}</strong>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Extracted</span>
                    <strong className="text-lg text-emerald-800">{editableQuestions.length}</strong>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <span className="text-amber-700 block text-[10px] uppercase font-bold">Needs Review</span>
                    <strong className="text-lg text-amber-800">{needsReviewCount}</strong>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                    <span className="text-red-700 block text-[10px] uppercase font-bold">Errors</span>
                    <strong className="text-lg text-red-800">{previewResult.invalid_count}</strong>
                  </div>
                </div>

                {/* Warnings List */}
                {previewResult.warnings && previewResult.warnings.length > 0 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900 max-h-28 overflow-y-auto">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" /> System Notices ({previewResult.warnings.length})
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                      {previewResult.warnings.map((w, wIdx) => (
                        <li key={wIdx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Interactive Question Review List Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#061426] uppercase tracking-wider">
                      Extracted Questions ({editableQuestions.length})
                    </span>
                    <div className="inline-flex rounded-lg border border-[#E3D8BE] p-0.5 bg-gray-50 text-[11px]">
                      <button
                        type="button"
                        onClick={() => { setFilterMode('all'); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          filterMode === 'all' ? 'bg-white shadow text-[#061426] font-bold' : 'text-[#687386]'
                        }`}
                      >
                        All ({editableQuestions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFilterMode('needs_review'); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          filterMode === 'needs_review' ? 'bg-amber-100 shadow text-amber-900 font-bold' : 'text-[#687386]'
                        }`}
                      >
                        Needs Answer ({needsReviewCount})
                      </button>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded-lg border border-[#E3D8BE] hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[#687386]">
                        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded-lg border border-[#E3D8BE] hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Question Cards Listing */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto border border-[#E3D8BE] rounded-2xl p-3 bg-gray-50/50">
                  {displayedQuestions.map((q) => {
                    const origIdx = q.origIdx;
                    const isEditing = editingIndex === origIdx;

                    return (
                      <div
                        key={origIdx}
                        className={`p-4 rounded-xl border transition shadow-sm bg-white ${
                          !q.correct_option
                            ? 'border-amber-300 ring-1 ring-amber-200'
                            : 'border-[#E3D8BE]'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#F8F4EA] border border-[#E3D8BE] font-bold text-[#A87519]">
                              Q{q.question_number}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[#4E5969] text-[11px]">
                              {q.subject || 'General'}
                            </span>
                            {q.marks !== null && q.marks !== undefined && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                                +{q.marks} {q.negative_marks ? `/ -${q.negative_marks}` : ''}
                              </span>
                            )}
                            {!q.correct_option ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                                Needs Answer
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ans: {q.correct_option}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(origIdx, 'up')}
                              disabled={origIdx === 0}
                              className="p-1 rounded text-gray-500 hover:text-black disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(origIdx, 'down')}
                              disabled={origIdx === editableQuestions.length - 1}
                              className="p-1 rounded text-gray-500 hover:text-black disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(isEditing ? null : origIdx)}
                              className={`p-1 rounded transition ${
                                isEditing ? 'bg-[#A87519] text-white' : 'text-gray-500 hover:text-[#A87519]'
                              }`}
                              title={isEditing ? 'Close Edit' : 'Edit Question'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(origIdx)}
                              className="p-1 rounded text-gray-500 hover:text-red-600 transition"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Read-Only or Edit Mode */}
                        {isEditing ? (
                          <div className="space-y-3 pt-1 text-xs">
                            <div>
                              <label className="block font-bold text-[#061426] mb-1">Question (English)</label>
                              <textarea
                                value={q.question_en}
                                onChange={(e) => handleUpdateQuestion(origIdx, 'question_en', e.target.value)}
                                rows={2}
                                className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs focus:ring-1 focus:ring-[#A87519]"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block font-semibold text-[#687386] mb-1">Option A</label>
                                <input
                                  type="text"
                                  value={q.option_a_en}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'option_a_en', e.target.value)}
                                  className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold text-[#687386] mb-1">Option B</label>
                                <input
                                  type="text"
                                  value={q.option_b_en}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'option_b_en', e.target.value)}
                                  className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold text-[#687386] mb-1">Option C</label>
                                <input
                                  type="text"
                                  value={q.option_c_en}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'option_c_en', e.target.value)}
                                  className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold text-[#687386] mb-1">Option D</label>
                                <input
                                  type="text"
                                  value={q.option_d_en}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'option_d_en', e.target.value)}
                                  className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block font-semibold text-[#687386] mb-1">Correct Answer</label>
                                <select
                                  value={q.correct_option}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'correct_option', e.target.value)}
                                  className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs font-bold"
                                >
                                  <option value="">(Select Answer)</option>
                                  <option value="A">Option A</option>
                                  <option value="B">Option B</option>
                                  <option value="C">Option C</option>
                                  <option value="D">Option D</option>
                                </select>
                              </div>
                              <div>
                                <label className="block font-semibold text-[#687386] mb-1">Marks</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={q.marks ?? ''}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'marks', e.target.value)}
                                  className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs"
                                  placeholder="e.g. 2.0"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold text-[#687386] mb-1">Negative Marks</label>
                                <input
                                  type="number"
                                  step="0.25"
                                  value={q.negative_marks ?? ''}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'negative_marks', e.target.value)}
                                  className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs"
                                  placeholder="e.g. 0.66"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-semibold text-[#687386] mb-1">Explanation</label>
                              <input
                                type="text"
                                value={q.explanation_en || ''}
                                onChange={(e) => handleUpdateQuestion(origIdx, 'explanation_en', e.target.value)}
                                className="w-full p-2 rounded-lg border border-[#E3D8BE] text-xs"
                                placeholder="Solution explanation..."
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-1.5 rounded-lg bg-[#061426] text-white text-[11px] font-bold"
                            >
                              Done Editing
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            <div className="font-medium text-[#061426] leading-relaxed">
                              <MathText text={q.question_en} />
                            </div>

                            {/* Options with quick click to set correct answer */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                                const optKey = `option_${letter.toLowerCase()}_en` as keyof EditableQuestion;
                                const optVal = String(q[optKey] || '');
                                if (!optVal) return null;
                                const isSelected = q.correct_option === letter;

                                return (
                                  <button
                                    key={letter}
                                    type="button"
                                    onClick={() => handleUpdateQuestion(origIdx, 'correct_option', letter)}
                                    className={`p-2.5 rounded-xl border text-left text-xs transition flex items-start gap-2 ${
                                      isSelected
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600 font-semibold'
                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-[#263347]'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className="flex-1">
                                      <MathText text={optVal} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {q.explanation_en && (
                              <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 italic">
                                <strong>Explanation:</strong> {q.explanation_en}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Replace Mode Confirm Box */}
            {confirmReplace && (
              <div className="p-4 bg-red-100 border border-red-300 rounded-2xl text-xs text-red-950 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-700" /> Confirm Question Deletion
                </p>
                <p>
                  Replace mode will permanently delete all existing questions in <strong>{test.title}</strong> and re-index questions from 1. This action is irreversible.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E3D8BE]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[#E3D8BE] text-xs font-semibold text-[#061426] hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleValidatePreview}
                  disabled={!file || isValidating || isImporting}
                  className="px-5 py-2.5 rounded-xl border border-[#A87519] bg-[#F8F4EA] hover:bg-[#EFE8D6] text-[#061426] font-bold text-xs flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isValidating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Validate & Extract All Questions
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={
                    !editableQuestions.length ||
                    isImporting ||
                    isValidating
                  }
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    mode === 'replace'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {confirmReplace ? 'Confirm & Replace All' : `Import All (${editableQuestions.length}) Questions`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportQuestions;
