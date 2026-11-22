import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AssessmentsAPI, APITestSeries, APITestQuestion, APIMyAttemptV2
} from '../../services/api';
import MathText from '../MathText';
import ImportQuestions from './ImportQuestions';
import ImportTestSeriesModal from './ImportTestSeriesModal';
import {
  FileCheck, Plus, Edit2, Trash2, Eye, EyeOff, Upload,
  Download, BarChart2, BookOpen, Clock, AlertCircle, Loader2,
  X, Check, AlertTriangle, Search, Filter, CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';

interface TestsManagerProps {
  mode: 'admin' | 'educator';
}

export const TestsManager: React.FC<TestsManagerProps> = ({ mode }) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'results'>('tests');

  // Tests catalog state
  const [tests, setTests] = useState<APITestSeries[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [testSearch, setTestSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Active modals
  const [editTestModal, setEditTestModal] = useState<APITestSeries | 'new' | null>(null);
  const [activeImportTest, setActiveImportTest] = useState<APITestSeries | null>(null);
  const [showImportSeriesModal, setShowImportSeriesModal] = useState(false);
  const [activeQuestionBankTest, setActiveQuestionBankTest] = useState<APITestSeries | null>(null);
  const [deleteConfirmTest, setDeleteConfirmTest] = useState<APITestSeries | null>(null);

  // Question bank state
  const [questions, setQuestions] = useState<APITestQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<APITestQuestion> | 'new' | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Results tab state
  const [attempts, setAttempts] = useState<APIMyAttemptV2[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [selectedResultTest, setSelectedResultTest] = useState<string>('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Load tests catalog
  const loadTests = () => {
    setIsLoadingTests(true);
    AssessmentsAPI.list()
      .then((data) => setTests(data))
      .catch((err) => setError(err.message || 'Failed to load test series.'))
      .finally(() => setIsLoadingTests(false));
  };

  useEffect(() => {
    loadTests();
  }, []);

  // Load results when switching to results tab
  const loadAttempts = (testSlug?: string) => {
    setIsLoadingAttempts(true);
    AssessmentsAPI.adminAttempts(testSlug ? { test: testSlug } : undefined)
      .then((data) => setAttempts(data))
      .catch((err) => console.error('Failed to load attempts:', err))
      .finally(() => setIsLoadingAttempts(false));
  };

  useEffect(() => {
    if (activeTab === 'results') {
      loadAttempts(selectedResultTest);
    }
  }, [activeTab, selectedResultTest]);

  // Load questions for question bank
  const loadQuestionsForTest = (testSlug: string) => {
    setIsLoadingQuestions(true);
    AssessmentsAPI.detail(testSlug)
      .then((detail) => {
        setQuestions((detail.questions as any) || []);
      })
      .catch((err) => console.error('Failed to load questions:', err))
      .finally(() => setIsLoadingQuestions(false));
  };

  useEffect(() => {
    if (activeQuestionBankTest) {
      loadQuestionsForTest(activeQuestionBankTest.slug);
    }
  }, [activeQuestionBankTest]);

  // Filter tests list
  const filteredTests = useMemo(() => {
    return tests.filter(
      (t) =>
        t.title.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.exam.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(testSearch.toLowerCase())
    );
  }, [tests, testSearch]);

  // Handle CSV export
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const blob = await AssessmentsAPI.exportAttemptsCsv(selectedResultTest || undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `sims-results-${selectedResultTest || 'all'}-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (test: APITestSeries) => {
    try {
      await AssessmentsAPI.updateTest(test.slug, {
        is_published: !test.isPublished,
      });
      loadTests();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Delete test
  const handleDeleteTest = async () => {
    if (!deleteConfirmTest) return;
    try {
      await AssessmentsAPI.deleteTest(deleteConfirmTest.slug);
      setDeleteConfirmTest(null);
      loadTests();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#A87519] uppercase tracking-wider">
            {mode === 'educator' ? 'Educator Workspace' : 'Administration'}
          </span>
          <h1 className="font-serif font-bold text-3xl text-[#061426] mt-0.5">
            Test Series & Assessment Center
          </h1>
          <p className="text-xs text-[#687386] mt-1">
            {mode === 'educator'
              ? 'Manage your test series, edit question banks, and review student performance.'
              : 'Full administrative control of mock test catalog, LaTeX question banks, and student scores.'}
          </p>
        </div>

        {/* Tab switch & Create button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-[#E3D8BE] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'tests'
                  ? 'bg-[#061426] text-white shadow'
                  : 'text-[#687386] hover:text-[#061426]'
              }`}
            >
              Test Series
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'results'
                  ? 'bg-[#061426] text-white shadow'
                  : 'text-[#687386] hover:text-[#061426]'
              }`}
            >
              Attempt Results & Export
            </button>
          </div>

          {activeTab === 'tests' && (
            <div className="flex items-center gap-2.5">
              <Link
                to={mode === 'educator' ? '/educator/tests/import' : '/admin/tests/import'}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-[#D9A52E]/20 border border-[#D9A52E] dark:border-[#383D44] hover:bg-[#D9A52E]/20 text-[#061426] dark:text-[#F1EEE7] font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Sparkles className="w-4 h-4 text-[#D9A52E]" /> Bulk Import Wizard
              </Link>
              <button
                onClick={() => setShowImportSeriesModal(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#383D44] bg-[#FAF7F0] dark:bg-[#22252A] hover:bg-slate-100 text-[#061426] dark:text-[#F1EEE7] font-semibold text-xs flex items-center gap-2 transition"
              >
                <Upload className="w-4 h-4 text-slate-500" /> Quick Import
              </button>
              <button
                onClick={() => setEditTestModal('new')}
                className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow transition"
              >
                <Plus className="w-4 h-4" /> Create Test Series
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: TESTS LIST */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#687386]" />
              <input
                type="text"
                placeholder="Search tests by title, exam, category..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-[#E3D8BE] text-xs focus:outline-none focus:border-[#A87519]"
              />
            </div>
            <span className="text-xs text-[#687386]">
              Showing {filteredTests.length} test series
            </span>
          </div>

          {isLoadingTests ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
              <p className="text-xs text-[#687386]">Loading test catalog...</p>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E3D8BE] space-y-3">
              <FileCheck className="w-10 h-10 text-[#A87519] mx-auto" />
              <p className="text-sm font-semibold text-[#061426]">No test series found</p>
              <p className="text-xs text-[#687386]">Create a new test series or clear your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white rounded-2xl border border-[#E3D8BE] p-6 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#A87519] bg-[#F8F4EA] px-2.5 py-0.5 rounded border border-[#E3D8BE]">
                        {test.exam || 'NIMCET'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            test.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}
                        >
                          {test.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            test.isPaid
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {test.isPaid ? `₹${test.price}` : 'Free'}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-[#061426] line-clamp-1">
                      {test.title}
                    </h3>
                    <p className="text-xs text-[#687386] line-clamp-2">
                      {test.description || 'Full mock examination with timed sections and negative marking.'}
                    </p>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-3 gap-2 text-xs bg-[#F8F4EA] p-3 rounded-xl border border-[#E3D8BE]/50 text-[#061426]">
                      <div>
                        <span className="text-[10px] text-[#687386] block">Questions</span>
                        <strong className="font-bold">{test.totalQuestions} Qs</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#687386] block">Duration</span>
                        <strong className="font-bold">{test.durationMinutes} Min</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#687386] block">Attempts</span>
                        <strong className="font-bold">{test.usedAttempts ?? 0} Done</strong>
                      </div>
                    </div>

                    {/* Proctoring info */}
                    <div className="text-[11px] text-[#687386] flex items-center justify-between">
                      <span>Proctoring: <strong className="text-[#061426] uppercase">{test.integrityMode || 'strict'}</strong></span>
                      <span>Marks: <strong className="text-[#061426]">+{test.defaultMarks ?? 4} / -{test.defaultNegativeMarks ?? 1}</strong></span>
                    </div>

                    {test.reviewStatus && (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-[10px] text-slate-500 font-semibold">Review Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          test.reviewStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          test.reviewStatus === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          test.reviewStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {test.reviewStatus}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Grid */}
                  <div className="pt-3 border-t border-[#E3D8BE]/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveQuestionBankTest(test)}
                        title="Question Bank"
                        className="p-2 rounded-lg bg-gray-50 border border-[#E3D8BE] text-[#061426] hover:bg-[#F8F4EA] text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#A87519]" /> Questions
                      </button>

                      <button
                        onClick={() => setActiveImportTest(test)}
                        title="Import Questions"
                        className="p-2 rounded-lg bg-gray-50 border border-[#E3D8BE] text-[#061426] hover:bg-[#F8F4EA] text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#A87519]" /> Import
                      </button>

                      {mode === 'educator' && (test.reviewStatus === 'draft' || test.reviewStatus === 'rejected' || !test.reviewStatus) && (
                        <button
                          onClick={async () => {
                            if (test.totalQuestions < 1) {
                              alert('Test must have at least 1 question before submitting for review.');
                              return;
                            }
                            try {
                              const res = await AssessmentsAPI.submitReview(test.slug);
                              alert(res.message || 'Submitted for review.');
                              loadTests();
                            } catch (e: any) {
                              alert(e.message || 'Failed to submit review.');
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold transition shadow-sm"
                        >
                          Submit Review
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {mode === 'admin' && (
                        <button
                          onClick={() => handleTogglePublish(test)}
                          title={test.isPublished ? 'Unpublish test' : 'Publish test'}
                          className="p-2 rounded-lg text-[#687386] hover:text-[#061426] hover:bg-gray-100 transition"
                        >
                          {test.isPublished ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        onClick={() => setEditTestModal(test)}
                        title="Edit Settings"
                        className="p-2 rounded-lg text-[#687386] hover:text-[#061426] hover:bg-gray-100 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmTest(test)}
                        title="Delete Test"
                        className="p-2 rounded-lg text-[#687386] hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESULTS & ATTEMPTS TABLE */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E3D8BE] shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#061426]">Filter by Test:</span>
              <select
                value={selectedResultTest}
                onChange={(e) => setSelectedResultTest(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E3D8BE] text-xs bg-white text-[#061426] focus:outline-none focus:border-[#A87519]"
              >
                <option value="">All Tests ({tests.length})</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="px-4 py-2 rounded-xl bg-[#061426] hover:bg-[#1C2C42] text-white font-bold text-xs flex items-center gap-2 shadow transition disabled:opacity-50"
            >
              {isExportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#F0C45B]" />}
              Export CSV (Excel Compatible)
            </button>
          </div>

          {/* Results Table */}
          {isLoadingAttempts ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
              <p className="text-xs text-[#687386]">Loading attempt records...</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E3D8BE] space-y-2">
              <BarChart2 className="w-10 h-10 text-[#A87519] mx-auto" />
              <p className="text-sm font-semibold text-[#061426]">No attempt records found</p>
              <p className="text-xs text-[#687386]">Student attempts will appear here with score breakdowns.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#061426]">
                  <thead className="bg-[#F8F4EA] text-[#687386] uppercase font-bold text-[10px] tracking-wider border-b border-[#E3D8BE]">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Test Series</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">%</th>
                      <th className="py-3 px-4 text-center text-emerald-700">Correct</th>
                      <th className="py-3 px-4 text-center text-red-600">Wrong</th>
                      <th className="py-3 px-4 text-center text-[#687386]">Unanswered</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D8BE]/50">
                    {attempts.map((att) => (
                      <tr key={att.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <strong className="block text-[#061426]">{att.userName || 'Student'}</strong>
                          <span className="text-[11px] text-[#687386]">{att.userEmail}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#061426]">
                          {att.testTitle}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#A87519]">
                          {att.score} / {att.totalMarks}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {att.percentage}%
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">
                          {att.correctCount}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-red-600">
                          {att.wrongCount}
                        </td>
                        <td className="py-3 px-4 text-center text-[#687386]">
                          {att.unattemptedCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              att.status === 'submitted'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : att.status === 'auto_submitted'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-[#687386] text-[11px]">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'In Progress'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT TEST SETTINGS */}
      {editTestModal && (
        <TestFormModal
          mode={mode}
          test={editTestModal === 'new' ? null : editTestModal}
          onClose={() => setEditTestModal(null)}
          onSuccess={() => {
            setEditTestModal(null);
            loadTests();
          }}
        />
      )}

      {/* MODAL 2: BULK IMPORT MODAL */}
      {activeImportTest && (
        <ImportQuestions
          test={activeImportTest}
          onClose={() => setActiveImportTest(null)}
          onSuccess={() => {
            loadTests();
          }}
        />
      )}

      {/* MODAL 2B: IMPORT & GENERATE NEW TEST SERIES */}
      {showImportSeriesModal && (
        <ImportTestSeriesModal
          onClose={() => setShowImportSeriesModal(false)}
          onSuccess={() => {
            loadTests();
          }}
        />
      )}

      {/* MODAL 3: QUESTION BANK DRAWER */}
      {activeQuestionBankTest && (
        <QuestionBankDrawer
          test={activeQuestionBankTest}
          questions={questions}
          isLoading={isLoadingQuestions}
          onClose={() => setActiveQuestionBankTest(null)}
          onReload={() => loadQuestionsForTest(activeQuestionBankTest.slug)}
        />
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deleteConfirmTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-serif font-bold text-xl text-[#061426]">Delete Test Series?</h3>
              <p className="text-xs text-[#687386]">
                Are you sure you want to delete <strong>{deleteConfirmTest.title}</strong>? All associated questions will be deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setDeleteConfirmTest(null)}
                className="px-4 py-2 rounded-xl border border-[#E3D8BE] text-xs font-semibold text-[#061426] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTest}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow"
              >
                Delete Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Test Form Modal ──────────────────────────────────────────────────────────

interface TestFormModalProps {
  test: APITestSeries | null;
  mode?: 'admin' | 'educator';
  onClose: () => void;
  onSuccess: () => void;
}

const TestFormModal: React.FC<TestFormModalProps> = ({ test, mode = 'admin', onClose, onSuccess }) => {
  const isEditing = !!test;

  const [formData, setFormData] = useState({
    title: test?.title || '',
    slug: test?.slug || '',
    exam: test?.exam || 'NIMCET',
    category: test?.category || 'Mock Tests',
    description: test?.description || '',
    durationMinutes: test?.durationMinutes ?? 120,
    defaultMarks: test?.defaultMarks ?? 4,
    defaultNegativeMarks: test?.defaultNegativeMarks ?? 1,
    maxAttempts: test?.maxAttempts ?? '',
    startsAt: test?.startsAt ? test.startsAt.substring(0, 16) : '',
    endsAt: test?.endsAt ? test.endsAt.substring(0, 16) : '',
    integrityMode: test?.integrityMode || 'off',
    showRank: test?.showRank ?? true,
    showReview: test?.showReview ?? true,
    price: test?.price || '0',
    originalPrice: test?.originalPrice || '',
    isPaid: test?.isPaid ?? false,
    isPublished: test?.isPublished ?? false,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-slug from title if creating
  const handleTitleChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: !isEditing
        ? val
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate endsAt > startsAt
    if (formData.startsAt && formData.endsAt) {
      if (new Date(formData.endsAt) <= new Date(formData.startsAt)) {
        setError('End date & time must be strictly after start date & time.');
        return;
      }
    }

    setIsSaving(true);
    const payload: any = {
      title: formData.title,
      slug: formData.slug,
      exam: formData.exam,
      category: formData.category,
      description: formData.description,
      durationMinutes: Number(formData.durationMinutes),
      defaultMarks: Number(formData.defaultMarks),
      defaultNegativeMarks: Number(formData.defaultNegativeMarks),
      maxAttempts: formData.maxAttempts === '' ? null : Number(formData.maxAttempts),
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
      endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : null,
      integrityMode: formData.integrityMode,
      showRank: formData.showRank,
      showReview: formData.showReview,
    };

    if (mode === 'admin') {
      payload.price = formData.price;
      payload.originalPrice = formData.originalPrice || null;
      payload.isPaid = formData.isPaid;
      payload.isPublished = formData.isPublished;
    }

    try {
      if (isEditing) {
        await AssessmentsAPI.updateTest(test.slug, payload);
      } else {
        await AssessmentsAPI.createTest(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save test series settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3D8BE] my-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3D8BE]">
          <h2 className="font-serif font-bold text-2xl text-[#061426]">
            {isEditing ? 'Edit Test Series Settings' : 'Create New Test Series'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-[#687386] hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#061426] mb-1">Test Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. NIMCET All India Mock 01"
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">Slug URL Identifier *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#061426] mb-1">Target Exam</label>
              <input
                type="text"
                value={formData.exam}
                onChange={(e) => setFormData({ ...formData, exam: e.target.value })}
                placeholder="e.g. NIMCET / CUET MCA"
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Mock Tests / Topic Tests"
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#061426] mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
            />
          </div>

          {/* Exam Timing & Scoring Defaults */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#061426] mb-1">Duration (Mins) *</label>
              <input
                type="number"
                min={1}
                required
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">Default Marks *</label>
              <input
                type="number"
                step="0.25"
                min={0}
                required
                value={formData.defaultMarks}
                onChange={(e) => setFormData({ ...formData, defaultMarks: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">Negative Marks *</label>
              <input
                type="number"
                step="0.25"
                min={0}
                required
                value={formData.defaultNegativeMarks}
                onChange={(e) => setFormData({ ...formData, defaultNegativeMarks: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
          </div>

          {/* Max Attempts and Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#061426] mb-1">Max Attempts (Blank = Unlimited)</label>
              <input
                type="number"
                min={1}
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
                placeholder="Unlimited"
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">Starts At (Optional)</label>
              <input
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">Ends At (Optional)</label>
              <input
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none"
              />
            </div>
          </div>

          {/* Proctoring & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#061426] mb-1">Integrity Proctoring Mode</label>
              <select
                value={formData.integrityMode}
                onChange={(e) => setFormData({ ...formData, integrityMode: e.target.value as any })}
                className="w-full p-2.5 rounded-xl border border-[#E3D8BE] focus:border-[#A87519] outline-none bg-white"
              >
                <option value="off">Off (No proctoring - Recommended)</option>
                <option value="warn">Warn (Flag violation, continue)</option>
                <option value="strict">Strict (Auto-submit on switch &gt; 2s)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">
                Price (₹) {mode === 'educator' && <span className="text-[10px] text-slate-400 font-normal">(Admin only)</span>}
              </label>
              <input
                type="text"
                disabled={mode === 'educator'}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={`w-full p-2.5 rounded-xl border ${
                  mode === 'educator' ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-[#E3D8BE] focus:border-[#A87519]'
                } outline-none`}
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">
                Original Price (₹) {mode === 'educator' && <span className="text-[10px] text-slate-400 font-normal">(Admin only)</span>}
              </label>
              <input
                type="text"
                disabled={mode === 'educator'}
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                placeholder="Optional strike price"
                className={`w-full p-2.5 rounded-xl border ${
                  mode === 'educator' ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-[#E3D8BE] focus:border-[#A87519]'
                } outline-none`}
              />
            </div>
          </div>

          {/* Checkbox Gates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {mode === 'admin' ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded text-[#A87519]"
                />
                <span className="font-semibold text-[#061426]">Published</span>
              </label>
            ) : (
              <div className="text-[11px] text-slate-400 font-semibold self-center">
                Review Gate: {formData.isPublished ? 'Published' : 'Draft'}
              </div>
            )}

            {mode === 'admin' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                  className="rounded text-[#A87519]"
                />
                <span className="font-semibold text-[#061426]">Paid Test</span>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showRank}
                onChange={(e) => setFormData({ ...formData, showRank: e.target.checked })}
                className="rounded text-[#A87519]"
              />
              <span className="font-semibold text-[#061426]">Show Rank</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showReview}
                onChange={(e) => setFormData({ ...formData, showReview: e.target.checked })}
                className="rounded text-[#A87519]"
              />
              <span className="font-semibold text-[#061426]">Show Review</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3D8BE]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-[#E3D8BE] text-xs font-semibold text-[#061426]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-[#061426] hover:bg-[#1C2C42] text-white font-bold text-xs shadow flex items-center gap-2 transition"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Save Settings' : 'Create Test Series'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Question Bank Drawer & Editor ─────────────────────────────────────────────

interface QuestionBankDrawerProps {
  test: APITestSeries;
  questions: APITestQuestion[];
  isLoading: boolean;
  onClose: () => void;
  onReload: () => void;
}

const QuestionBankDrawer: React.FC<QuestionBankDrawerProps> = ({
  test,
  questions,
  isLoading,
  onClose,
  onReload,
}) => {
  const [editorQuestion, setEditorQuestion] = useState<Partial<APITestQuestion> | 'new' | null>(null);

  const handleDelete = async (qId: number) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await AssessmentsAPI.deleteQuestion(qId);
      onReload();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#E3D8BE] flex items-center justify-between bg-[#F8F4EA]">
          <div>
            <span className="text-[10px] font-bold text-[#A87519] uppercase tracking-wider">Question Bank</span>
            <h2 className="font-serif font-bold text-xl text-[#061426] mt-0.5">{test.title}</h2>
            <p className="text-xs text-[#687386]">{questions.length} Questions loaded</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditorQuestion('new')}
              className="px-4 py-2 rounded-xl bg-[#061426] text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-[#687386] hover:bg-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body: Questions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
              <p className="text-xs text-[#687386]">Loading question items...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 rounded-2xl border border-[#E3D8BE] space-y-2">
              <BookOpen className="w-8 h-8 text-[#A87519] mx-auto" />
              <p className="font-serif font-bold text-sm text-[#061426]">No Questions Added Yet</p>
              <p className="text-xs text-[#687386]">Add individual questions or bulk-import via CSV/XLSX/DOCX/JSON.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-5 rounded-2xl border border-[#E3D8BE] bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E3D8BE]/50">
                    <span className="text-xs font-bold text-[#A87519]">
                      Q{idx + 1} • {q.subject || 'General'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Correct: Option {q.correctOption || String.fromCharCode(65 + (q.correctAnswer ?? 0))}
                      </span>
                      <button
                        onClick={() => setEditorQuestion(q)}
                        className="p-1.5 rounded-lg text-[#687386] hover:bg-gray-100"
                        title="Edit Question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 rounded-lg text-[#687386] hover:text-red-600 hover:bg-red-50"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question with MathText */}
                  <div className="space-y-1 text-xs sm:text-sm text-[#061426]">
                    <div>
                      <MathText text={q.questionEn || q.question} />
                    </div>
                    {q.questionHi && (
                      <div className="text-[#4E5969] pt-1 border-t border-gray-100">
                        <MathText text={q.questionHi} />
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    {(['A', 'B', 'C', 'D'] as const).map((lettr) => {
                      const optEn = (q as any)[`option${lettr}En`] || (q.options ? q.options[lettr.charCodeAt(0) - 65] : '');
                      const optHi = (q as any)[`option${lettr}Hi`];
                      const isCorrect = (q.correctOption?.toUpperCase() === lettr) || (q.correctAnswer === lettr.charCodeAt(0) - 65);

                      if (!optEn && !optHi) return null;

                      return (
                        <div
                          key={lettr}
                          className={`p-2 rounded-lg border text-[11px] ${
                            isCorrect ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900' : 'bg-gray-50 border-gray-200 text-[#4E5969]'
                          }`}
                        >
                          <span className="font-bold mr-1">{lettr}.</span>
                          <MathText text={optEn} />
                          {optHi && optHi !== optEn && (
                            <span className="block text-[10px] text-[#687386] pt-0.5">
                              <MathText text={optHi} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question Add / Edit Modal with Live LaTeX Preview */}
        {editorQuestion && (
          <QuestionEditorModal
            testId={test.id}
            question={editorQuestion === 'new' ? null : editorQuestion}
            onClose={() => setEditorQuestion(null)}
            onSuccess={() => {
              setEditorQuestion(null);
              onReload();
            }}
          />
        )}
      </div>
    </div>
  );
};

// ── Question Editor Modal with Live LaTeX Preview ────────────────────────────

interface QuestionEditorModalProps {
  testId: number;
  question: Partial<APITestQuestion> | null;
  onClose: () => void;
  onSuccess: () => void;
}

const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  testId,
  question,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!question?.id;

  const [formData, setFormData] = useState({
    subject: question?.subject || 'Mathematics',
    questionEn: question?.questionEn || question?.question || '',
    questionHi: question?.questionHi || '',
    optionAEn: question?.optionAEn || (question?.options?.[0] ?? ''),
    optionAHi: question?.optionAHi || '',
    optionBEn: question?.optionBEn || (question?.options?.[1] ?? ''),
    optionBHi: question?.optionBHi || '',
    optionCEn: question?.optionCEn || (question?.options?.[2] ?? ''),
    optionCHi: question?.optionCHi || '',
    optionDEn: question?.optionDEn || (question?.options?.[3] ?? ''),
    optionDHi: question?.optionDHi || '',
    correctOption: question?.correctOption || (question?.correctAnswer !== undefined ? String.fromCharCode(65 + question.correctAnswer) : 'A'),
    explanationEn: question?.explanationEn || question?.explanation || '',
    explanationHi: question?.explanationHi || '',
    marks: question?.marks ?? '',
    negativeMarks: question?.negativeMarks ?? '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload: any = {
      test_series: testId,
      subject: formData.subject,
      questionEn: formData.questionEn,
      questionHi: formData.questionHi || null,
      question: formData.questionEn,
      optionAEn: formData.optionAEn,
      optionAHi: formData.optionAHi || null,
      optionBEn: formData.optionBEn,
      optionBHi: formData.optionBHi || null,
      optionCEn: formData.optionCEn,
      optionCHi: formData.optionCHi || null,
      optionDEn: formData.optionDEn,
      optionDHi: formData.optionDHi || null,
      correctOption: formData.correctOption,
      explanationEn: formData.explanationEn,
      explanationHi: formData.explanationHi || null,
      explanation: formData.explanationEn,
      marks: formData.marks === '' ? null : Number(formData.marks),
      negativeMarks: formData.negativeMarks === '' ? null : Number(formData.negativeMarks),
    };

    try {
      if (isEditing && question?.id) {
        await AssessmentsAPI.updateQuestion(question.id, payload);
      } else {
        await AssessmentsAPI.createQuestion(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save question.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3D8BE] my-8 space-y-6 max-h-[90vh] overflow-y-auto text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3D8BE]">
          <h3 className="font-serif font-bold text-xl text-[#061426]">
            {isEditing ? 'Edit Question' : 'Add New Question'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-[#687386] hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#061426] mb-1">Subject</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-2 rounded-xl border border-[#E3D8BE] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#061426] mb-1">Correct Option</label>
              <select
                value={formData.correctOption}
                onChange={(e) => setFormData({ ...formData, correctOption: e.target.value })}
                className="w-full p-2 rounded-xl border border-[#E3D8BE] outline-none bg-white font-bold"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-[#061426] mb-1">Marks</label>
                <input
                  type="number"
                  step="0.25"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                  placeholder="Default"
                  className="w-full p-2 rounded-xl border border-[#E3D8BE] outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#061426] mb-1">Negative</label>
                <input
                  type="number"
                  step="0.25"
                  value={formData.negativeMarks}
                  onChange={(e) => setFormData({ ...formData, negativeMarks: e.target.value })}
                  placeholder="Default"
                  className="w-full p-2 rounded-xl border border-[#E3D8BE] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Question Text with Live LaTeX Preview */}
          <div className="space-y-2">
            <label className="block font-bold text-[#061426]">
              Question (English, supports LaTeX $...$ and $$...$$) *
            </label>
            <textarea
              rows={2}
              required
              value={formData.questionEn}
              onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })}
              className="w-full p-2 rounded-xl border border-[#E3D8BE] outline-none font-mono text-xs"
            />
            {formData.questionEn && (
              <div className="p-2.5 rounded-lg bg-[#F8F4EA] border border-[#E3D8BE]/70">
                <span className="text-[10px] font-bold text-[#A87519] block mb-0.5">Live Math Preview:</span>
                <MathText text={formData.questionEn} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-[#061426]">
              Question (Hindi Translation, Optional)
            </label>
            <textarea
              rows={2}
              value={formData.questionHi}
              onChange={(e) => setFormData({ ...formData, questionHi: e.target.value })}
              className="w-full p-2 rounded-xl border border-[#E3D8BE] outline-none text-xs"
            />
            {formData.questionHi && (
              <div className="p-2.5 rounded-lg bg-[#F8F4EA] border border-[#E3D8BE]/70">
                <span className="text-[10px] font-bold text-[#A87519] block mb-0.5">Live Hindi Math Preview:</span>
                <MathText text={formData.questionHi} />
              </div>
            )}
          </div>

          {/* Options A - D */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
              <div key={letter} className="p-3 rounded-xl border border-[#E3D8BE] bg-gray-50/50 space-y-1.5">
                <label className="font-bold text-[#061426] block">Option {letter} (English & LaTeX)</label>
                <input
                  type="text"
                  required
                  value={(formData as any)[`option${letter}En`]}
                  onChange={(e) => setFormData({ ...formData, [`option${letter}En`]: e.target.value })}
                  className="w-full p-1.5 rounded-lg border border-[#E3D8BE] bg-white outline-none font-mono"
                />
                <input
                  type="text"
                  placeholder={`Option ${letter} Hindi (Optional)`}
                  value={(formData as any)[`option${letter}Hi`]}
                  onChange={(e) => setFormData({ ...formData, [`option${letter}Hi`]: e.target.value })}
                  className="w-full p-1.5 rounded-lg border border-[#E3D8BE] bg-white outline-none"
                />
                {((formData as any)[`option${letter}En`] || (formData as any)[`option${letter}Hi`]) && (
                  <div className="text-[11px] pt-1 text-[#061426]">
                    <span className="text-[9px] text-[#A87519] block">Preview:</span>
                    <MathText text={(formData as any)[`option${letter}En`]} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="space-y-2 pt-2">
            <label className="block font-bold text-[#061426]">Explanation (English)</label>
            <textarea
              rows={2}
              value={formData.explanationEn}
              onChange={(e) => setFormData({ ...formData, explanationEn: e.target.value })}
              className="w-full p-2 rounded-xl border border-[#E3D8BE] outline-none"
            />
            {formData.explanationEn && (
              <div className="p-2 rounded-lg bg-[#F8F4EA] border border-[#E3D8BE]/70">
                <MathText text={formData.explanationEn} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3D8BE]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E3D8BE] text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-[#061426] hover:bg-[#1C2C42] text-white font-bold text-xs shadow flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Save Question' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestsManager;
