import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AssessmentsAPI, APIInProgressAttempt, APITestQuestionStudent
} from '../../services/api';
import MathText from '../../components/MathText';
import {
  Clock, AlertCircle, CheckCircle2, Bookmark,
  ChevronLeft, ChevronRight, Send, HelpCircle, ArrowLeft, Loader2,
  Menu, X, AlertTriangle, ShieldAlert, Check
} from 'lucide-react';
import { ThemeToggle } from '../../components/common/ThemeToggle';

interface QuestionAnswerState {
  selectedOption: string | null;
  markedForReview: boolean;
}

export const TestTakingPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<APIInProgressAttempt | null>(null);
  const [questions, setQuestions] = useState<APITestQuestionStudent[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswerState>>({});
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [languageMode, setLanguageMode] = useState<'both' | 'en' | 'hi'>('both');
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [integrityWarning, setIntegrityWarning] = useState<string | null>(null);

  const hiddenStartRef = useRef<number | null>(null);
  const clockOffsetRef = useRef<number>(0);
  const autoSubmitTriggeredRef = useRef(false);

  // Initialize attempt
  useEffect(() => {
    if (!testId) return;
    setIsLoading(true);
    autoSubmitTriggeredRef.current = false;

    AssessmentsAPI.start(testId)
      .then((startRes) => {
        return AssessmentsAPI.attempt(startRes.id);
      })
      .then((attemptData) => {
        setAttempt(attemptData);
        setQuestions(attemptData.questions || []);

        // Calculate server time offset
        const serverMs = new Date(attemptData.serverNow).getTime();
        const clientMs = Date.now();
        clockOffsetRef.current = serverMs - clientMs;

        // Initialize saved answers
        const initialAnswers: Record<string, QuestionAnswerState> = {};
        if (attemptData.savedAnswers) {
          Object.entries(attemptData.savedAnswers).forEach(([qId, ans]) => {
            initialAnswers[qId] = {
              selectedOption: ans.selectedOption,
              markedForReview: ans.markedForReview,
            };
          });
        }
        setAnswers(initialAnswers);

        // Initial remaining seconds
        if (attemptData.expiresAt) {
          const expiryMs = new Date(attemptData.expiresAt).getTime();
          const initialRemaining = Math.max(
            0,
            Math.floor((expiryMs - (Date.now() + clockOffsetRef.current)) / 1000)
          );
          setTimeLeft(initialRemaining);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to initialize attempt.');
      })
      .finally(() => setIsLoading(false));
  }, [testId]);

  // Submit attempt helper
  const handleFinalSubmit = useCallback(async (isAuto = false, isIntegrity = false) => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await AssessmentsAPI.submitAttempt(attempt.id);
      const queryParam = isIntegrity ? '?integrity=1' : isAuto ? '?auto=1' : '';
      navigate(`/student/attempts/${attempt.id}/result${queryParam}`, { replace: true });
    } catch (err: any) {
      console.error('Submit error:', err);
      // Even if network error, try redirecting to result endpoint (idempotent on backend)
      navigate(`/student/attempts/${attempt.id}/result`, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, isSubmitting, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!attempt || !attempt.expiresAt || autoSubmitTriggeredRef.current) return;

    const expiryMs = new Date(attempt.expiresAt).getTime();

    const timer = setInterval(() => {
      const nowServerMs = Date.now() + clockOffsetRef.current;
      const remaining = Math.max(0, Math.floor((expiryMs - nowServerMs) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && !autoSubmitTriggeredRef.current) {
        autoSubmitTriggeredRef.current = true;
        clearInterval(timer);
        handleFinalSubmit(true, false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, handleFinalSubmit]);

  // Prevent back navigation & auto-submit on back attempt
  useEffect(() => {
    if (!attempt) return;

    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);

      if (!autoSubmitTriggeredRef.current) {
        autoSubmitTriggeredRef.current = true;
        AssessmentsAPI.integrity(attempt.id, 'hidden').catch(() => {});
        handleFinalSubmit(false, true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [attempt, handleFinalSubmit]);

  // Window visibility & tab change auto-submit
  useEffect(() => {
    if (!attempt) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!autoSubmitTriggeredRef.current) {
          autoSubmitTriggeredRef.current = true;
          AssessmentsAPI.integrity(attempt.id, 'hidden').catch(() => {});
          handleFinalSubmit(false, true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attempt, handleFinalSubmit]);

  // Warn on browser tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Autosave action
  const persistAnswer = async (
    questionId: number,
    selectedOption: string | null,
    markedForReview: boolean
  ) => {
    if (!attempt) return;
    const qKey = String(questionId);
    const prevState = answers[qKey] || { selectedOption: null, markedForReview: false };

    // Optimistic update
    setAnswers((prev) => ({
      ...prev,
      [qKey]: { selectedOption, markedForReview },
    }));
    setIsSaving(true);
    setSaveError(null);

    try {
      await AssessmentsAPI.saveAnswer(attempt.id, {
        question_id: questionId,
        selected_option: selectedOption,
        mark_for_review: markedForReview,
      });
    } catch (err: any) {
      console.warn('Autosave failed:', err);
      // Revert optimistic state
      setAnswers((prev) => ({
        ...prev,
        [qKey]: prevState,
      }));
      setSaveError(err.message || 'Failed to save answer. Retrying on next action.');
    } finally {
      setIsSaving(false);
    }
  };

  // Option select handler
  const handleOptionSelect = (opt: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const currentAns = answers[String(currentQ.id)] || { selectedOption: null, markedForReview: false };
    const nextOption = currentAns.selectedOption === opt ? null : opt;
    persistAnswer(currentQ.id, nextOption, currentAns.markedForReview);
  };

  // Clear current response
  const handleClearResponse = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const currentAns = answers[String(currentQ.id)] || { selectedOption: null, markedForReview: false };
    persistAnswer(currentQ.id, null, currentAns.markedForReview);
  };

  // Toggle mark for review
  const handleToggleReview = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const currentAns = answers[String(currentQ.id)] || { selectedOption: null, markedForReview: false };
    persistAnswer(currentQ.id, currentAns.selectedOption, !currentAns.markedForReview);
  };

  // Palette counts
  const paletteStats = useMemo(() => {
    let answered = 0;
    let reviewOnly = 0;
    let answeredAndReview = 0;
    let unanswered = 0;

    questions.forEach((q) => {
      const a = answers[String(q.id)];
      const hasAns = !!a?.selectedOption;
      const isRev = !!a?.markedForReview;

      if (hasAns && isRev) answeredAndReview++;
      else if (isRev) reviewOnly++;
      else if (hasAns) answered++;
      else unanswered++;
    });

    return { answered, reviewOnly, answeredAndReview, unanswered };
  }, [questions, answers]);

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#D9A52E]" />
        <p className="text-base font-semibold text-[#061426]">Preparing examination runner...</p>
        <p className="text-xs text-[#687386]">Syncing questions and server timer securely</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-xl font-serif font-bold text-[#061426]">Unable to Start Test</h2>
        <p className="text-sm text-red-700">{error || 'Attempt could not be loaded.'}</p>
        <Link
          to="/student/tests"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#061426] text-white text-xs font-semibold hover:bg-[#1C2C42] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Series
        </Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[String(currentQ.id)] : undefined;
  const isUrgentTimer = timeLeft !== null && timeLeft <= 300;

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] -m-4 sm:-m-8 bg-[#FBF9F4]">
      {/* Top Banner & Header */}
      <header className="bg-white border-b border-[#E3D8BE] px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/student/tests"
            onClick={(e) => {
              if (!window.confirm('Leave test? Your progress is saved, but time continues to tick.')) {
                e.preventDefault();
              }
            }}
            className="p-1.5 text-[#687386] hover:text-[#061426] rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif font-bold text-base sm:text-lg text-[#061426] line-clamp-1">
              {attempt.testTitle}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-[#687386]">
              <span>Subject: <strong className="text-[#061426]">{currentQ?.subject || 'General'}</strong></span>
              <span>•</span>
              <span>Q {currentIndex + 1} of {questions.length}</span>
              {isSaving && (
                <>
                  <span>•</span>
                  <span className="text-amber-700 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Autosaving...
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Language Toggle */}
          <div className="hidden sm:flex items-center bg-[#F8F4EA] border border-[#E3D8BE] rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setLanguageMode('en')}
              className={`px-2 py-1 rounded ${languageMode === 'en' ? 'bg-[#061426] text-white' : 'text-[#687386] hover:text-[#061426]'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguageMode('hi')}
              className={`px-2 py-1 rounded ${languageMode === 'hi' ? 'bg-[#061426] text-white' : 'text-[#687386] hover:text-[#061426]'}`}
            >
              HI
            </button>
            <button
              onClick={() => setLanguageMode('both')}
              className={`px-2 py-1 rounded ${languageMode === 'both' ? 'bg-[#061426] text-white' : 'text-[#687386] hover:text-[#061426]'}`}
            >
              Both
            </button>
          </div>

          <ThemeToggle className="text-[#061426] hover:bg-slate-100" />

          {/* Timer Display */}
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold border transition ${
                isUrgentTimer
                  ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                  : 'bg-white text-[#061426] border-[#E3D8BE]'
              }`}
            >
              <Clock className={`w-4 h-4 ${isUrgentTimer ? 'text-red-600' : 'text-[#A87519]'}`} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Palette button for mobile */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="lg:hidden p-2 rounded-xl border border-[#E3D8BE] bg-white text-[#061426] hover:bg-gray-50"
            aria-label="Open question palette"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Submit Test Button */}
          <button
            onClick={() => setConfirmModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow transition"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Submit Test</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </header>

      {/* Warnings & Alerts */}
      {integrityWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{integrityWarning}</span>
          </div>
          <button
            onClick={() => setIntegrityWarning(null)}
            className="text-amber-800 hover:text-amber-950 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Main Runner Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-between">
          {currentQ ? (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* Question Header & Marks */}
              <div className="flex items-center justify-between border-b border-[#E3D8BE] pb-3">
                <span className="text-xs font-bold text-[#A87519] uppercase tracking-wider">
                  Question {currentIndex + 1}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    +{currentQ.marks} Marks
                  </span>
                  <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    -{currentQ.negativeMarks} Negative
                  </span>
                </div>
              </div>

              {/* Question Text with MathText */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-[#E3D8BE] shadow-sm">
                {(() => {
                  const combined = `${currentQ.questionEn || ''} ${currentQ.questionHi || ''} ${currentQ.question || ''}`;
                  const hasEmbeddedImg = /!\[.*?\]\([^)]+\)|\[\[IMG:[^\]]+\]\]/i.test(combined);
                  if (!currentQ.imageUrl || hasEmbeddedImg) return null;

                  const imgSrc = currentQ.imageUrl.startsWith('/')
                    ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')}${currentQ.imageUrl}`
                    : currentQ.imageUrl;

                  return (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center max-h-72 overflow-hidden my-2">
                      <img
                        src={imgSrc}
                        alt="Question figure"
                        className="max-h-64 object-contain rounded shadow-xs"
                      />
                    </div>
                  );
                })()}

                {(languageMode === 'en' || languageMode === 'both') && (
                  <div className="text-base sm:text-lg font-medium text-[#061426]">
                    <MathText text={currentQ.questionEn || currentQ.question} />
                  </div>
                )}

                {currentQ.questionHi && (languageMode === 'hi' || languageMode === 'both') && (
                  <div className="text-base sm:text-lg font-medium text-[#1C2C42] pt-3 border-t border-[#E3D8BE]/40">
                    <MathText text={currentQ.questionHi} />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-[#687386] uppercase tracking-wider">
                  Select an option:
                </p>

                {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                  const optEn = currentQ.optionsEn?.[optKey] || '';
                  const optHi = currentQ.optionsHi?.[optKey];
                  const isSelected = currentAnswer?.selectedOption === optKey;

                  if (!optEn && !optHi) return null;

                  return (
                    <button
                      key={optKey}
                      onClick={() => handleOptionSelect(optKey)}
                      className={`w-full text-left p-4 rounded-xl border transition flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-[#F8F4EA] border-[#A87519] shadow-sm ring-1 ring-[#A87519]'
                          : 'bg-white border-[#E3D8BE] hover:border-[#A87519]/50 hover:bg-gray-50/50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition ${
                          isSelected
                            ? 'bg-[#061426] text-white'
                            : 'bg-[#F8F4EA] text-[#687386] border border-[#E3D8BE]'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : optKey}
                      </div>

                      <div className="flex-1 space-y-1.5 text-sm sm:text-base text-[#061426] pt-0.5">
                        {(languageMode === 'en' || languageMode === 'both' || !optHi) && (
                          <div>
                            <MathText text={optEn} />
                          </div>
                        )}
                        {optHi && optHi !== optEn && (languageMode === 'hi' || languageMode === 'both') && (
                          <div className="text-sm text-[#4E5969] pt-1 border-t border-[#E3D8BE]/30">
                            <MathText text={optHi} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-[#687386]">
              No questions found for this test.
            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="max-w-4xl mx-auto w-full pt-8 pb-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3D8BE] mt-8">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleReview}
                className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
                  currentAnswer?.markedForReview
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-white text-[#263347] border-[#E3D8BE] hover:bg-gray-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${currentAnswer?.markedForReview ? 'fill-purple-700 text-purple-700' : ''}`} />
                {currentAnswer?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
              </button>

              <button
                onClick={handleClearResponse}
                disabled={!currentAnswer?.selectedOption}
                className="px-4 py-2.5 rounded-xl border border-[#E3D8BE] bg-white text-xs sm:text-sm font-semibold text-[#687386] hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear Response
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-[#E3D8BE] bg-white text-xs sm:text-sm font-semibold text-[#061426] hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="px-5 py-2.5 rounded-xl bg-[#061426] hover:bg-[#1C2C42] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save & Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* Right: Question Palette Sidebar (Desktop) */}
        <aside className="hidden lg:flex w-80 bg-white border-l border-[#E3D8BE] flex-col p-6 overflow-y-auto space-y-6">
          <div>
            <h2 className="font-serif font-bold text-base text-[#061426]">Question Palette</h2>
            <p className="text-xs text-[#687386] mt-0.5">Click number to navigate directly</p>
          </div>

          {/* Palette Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4E5969] bg-[#F8F4EA] p-3 rounded-xl border border-[#E3D8BE]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                {paletteStats.answered}
              </span>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-gray-100 text-[#4E5969] border border-gray-300 font-bold flex items-center justify-center text-[10px]">
                {paletteStats.unanswered}
              </span>
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
                {paletteStats.reviewOnly}
              </span>
              <span>Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                {paletteStats.answeredAndReview}
              </span>
              <span>Ans + Review</span>
            </div>
          </div>

          {/* Number Buttons Grid */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {questions.map((q, idx) => {
              const a = answers[String(q.id)];
              const isAnswered = !!a?.selectedOption;
              const isReview = !!a?.markedForReview;
              const isCurrent = idx === currentIndex;

              let btnClasses = 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200';
              if (isAnswered && isReview) {
                btnClasses = 'bg-purple-600 text-white border-purple-700';
              } else if (isReview) {
                btnClasses = 'bg-amber-500 text-white border-amber-600';
              } else if (isAnswered) {
                btnClasses = 'bg-emerald-600 text-white border-emerald-700';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-xl font-bold text-xs border flex items-center justify-center transition relative ${btnClasses} ${
                    isCurrent ? 'ring-2 ring-[#061426] ring-offset-2 scale-105 shadow-sm' : ''
                  }`}
                >
                  {idx + 1}
                  {isReview && isAnswered && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-300" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Mobile Slide-in Drawer */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setPaletteOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3D8BE]">
                <h2 className="font-serif font-bold text-lg text-[#061426]">Question Palette</h2>
                <button
                  onClick={() => setPaletteOpen(false)}
                  className="p-1 rounded-lg text-[#687386] hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Palette Grid */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const a = answers[String(q.id)];
                  const isAnswered = !!a?.selectedOption;
                  const isReview = !!a?.markedForReview;
                  const isCurrent = idx === currentIndex;

                  let btnClasses = 'bg-gray-100 text-gray-700 border-gray-200';
                  if (isAnswered && isReview) btnClasses = 'bg-purple-600 text-white';
                  else if (isReview) btnClasses = 'bg-amber-500 text-white';
                  else if (isAnswered) btnClasses = 'bg-emerald-600 text-white';

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setPaletteOpen(false);
                      }}
                      className={`h-10 rounded-xl font-bold text-xs border flex items-center justify-center ${btnClasses} ${
                        isCurrent ? 'ring-2 ring-[#061426] ring-offset-1' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                setPaletteOpen(false);
                setConfirmModalOpen(true);
              }}
              className="w-full mt-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow"
            >
              Finish & Submit Test
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3D8BE] space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#061426]">Submit Examination?</h3>
                <p className="text-xs text-[#687386]">Review your summary before finalizing</p>
              </div>
            </div>

            <div className="bg-[#F8F4EA] rounded-xl p-4 border border-[#E3D8BE] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E3D8BE]/50">
                <span className="text-[#687386]">Total Questions:</span>
                <span className="font-bold text-[#061426]">{questions.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E3D8BE]/50">
                <span className="text-emerald-700 font-medium">Answered:</span>
                <span className="font-bold text-emerald-700">{paletteStats.answered + paletteStats.answeredAndReview}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E3D8BE]/50">
                <span className="text-amber-700 font-medium">Marked for Review:</span>
                <span className="font-bold text-amber-700">{paletteStats.reviewOnly + paletteStats.answeredAndReview}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-red-700 font-medium">Unanswered:</span>
                <span className="font-bold text-red-700">{paletteStats.unanswered}</span>
              </div>
            </div>

            <p className="text-xs text-[#687386]">
              Once submitted, your answers will be evaluated server-side and your detailed scorecard will be generated.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-[#E3D8BE] text-xs font-semibold text-[#061426] hover:bg-gray-50 transition"
              >
                Back to Test
              </button>
              <button
                onClick={() => {
                  setConfirmModalOpen(false);
                  handleFinalSubmit(false, false);
                }}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestTakingPage;
