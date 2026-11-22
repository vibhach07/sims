import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AssessmentsAPI, APIAttemptResult } from '../../services/api';
import MathText from '../../components/MathText';
import {
  CheckCircle2, XCircle, AlertCircle, ArrowLeft,
  RotateCcw, Award, Check, X, BookOpen, Loader2,
  Clock, ShieldAlert, BarChart3, HelpCircle, Trophy, Users
} from 'lucide-react';

export const TestResultsPage: React.FC = () => {
  const { attemptId, testId } = useParams<{ attemptId?: string; testId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [result, setResult] = useState<APIAttemptResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuto = searchParams.get('auto') === '1';
  const isIntegrityParam = searchParams.get('integrity') === '1';

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (attemptId) {
      // Direct attempt result lookup
      AssessmentsAPI.result(Number(attemptId))
        .then((data) => setResult(data))
        .catch((err) => setError(err.message || 'Failed to load test evaluation results.'))
        .finally(() => setIsLoading(false));
    } else if (testId) {
      // Slug lookup: resolve latest completed attempt
      AssessmentsAPI.myAttemptsV2()
        .then((allAttempts) => {
          const matching = allAttempts.filter(
            (a) =>
              (a.testSlug === testId || String(a.test_series) === testId) &&
              (a.status === 'submitted' || a.status === 'auto_submitted')
          );
          if (matching.length > 0) {
            // Redirect to canonical attempt result route
            navigate(`/student/attempts/${matching[0].id}/result`, { replace: true });
          } else {
            setResult(null);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to look up attempts for this test.');
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [attemptId, testId, navigate]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-base font-semibold text-[#061426]">Loading authoritative evaluation...</p>
        <p className="text-xs text-[#687386]">Retrieving server scores, ranking, and answer review</p>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes('not found') || error.includes('404') || error.includes('403');
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-[#E3D8BE] rounded-2xl shadow-sm text-center space-y-4">
        {isNotFound ? (
          <div className="w-14 h-14 rounded-full bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center mx-auto">
            <HelpCircle className="w-8 h-8 text-[#D97706]" />
          </div>
        ) : (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
        <h2 className="text-xl font-serif font-bold text-[#061426]">
          {isNotFound ? 'Scorecard Not Available' : 'Unable to View Scorecard'}
        </h2>
        <p className="text-sm text-[#687386]">
          {isNotFound
            ? "We couldn't find a completed attempt for this scorecard. If you haven't taken the test yet, please start it below. If you believe this is an error, please try again or contact support."
            : error}
        </p>
        {!isNotFound && (
          <p className="text-xs text-red-500 font-mono bg-red-50 rounded px-3 py-1.5 inline-block">{error}</p>
        )}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/student/tests"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#061426] text-white text-xs font-semibold hover:bg-[#1C2C42] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Test Catalog
          </Link>
          {testId && (
            <Link
              to={`/student/tests/${testId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold transition shadow"
            >
              Start / Take Test
            </Link>
          )}
          {attemptId && (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E3D8BE] text-[#061426] text-xs font-semibold hover:bg-[#F8F4EA] transition"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto my-16 p-10 bg-white border border-[#E3D8BE] rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#F8F4EA] border border-[#E3D8BE] flex items-center justify-center mx-auto text-[#A87519]">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="font-serif font-bold text-2xl text-[#061426]">No Test Attempt Found</h2>
        <p className="text-xs text-[#687386] max-w-sm mx-auto">
          You haven't completed an attempt for this test series yet. Take the test to view server-validated scoring and ranks.
        </p>
        <div className="pt-2">
          {testId ? (
            <Link
              to={`/student/tests/${testId}`}
              className="px-6 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold shadow inline-block"
            >
              Start This Test Now
            </Link>
          ) : (
            <Link
              to="/student/tests"
              className="px-6 py-2.5 rounded-xl bg-[#061426] text-white text-xs font-bold inline-block"
            >
              Explore Test Catalog
            </Link>
          )}
        </div>
      </div>
    );
  }

  const isPassed = result.percentage >= 50;
  const isIntegrityViolated = isIntegrityParam || (result.integrityViolation && result.status === 'auto_submitted');
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/tests"
          className="inline-flex items-center gap-2 text-xs text-[#A87519] hover:underline font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to mock tests catalog
        </Link>
        <span className="text-xs text-[#687386]">
          Attempt #{result.id} • Submitted: {new Date(result.submittedAt).toLocaleString()}
        </span>
      </div>

      {/* Auto-Submit Notice Banner */}
      {isAuto && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-900 text-xs shadow-sm">
          <Clock className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <div>
            <p className="font-bold">Time Expired</p>
            <p className="text-amber-800">Your examination time elapsed. All saved responses were automatically evaluated.</p>
          </div>
        </div>
      )}

      {/* Integrity Violation Banner */}
      {isIntegrityViolated && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3 text-red-900 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-700 flex-shrink-0" />
            <div>
              <p className="font-bold">Proctoring Notice — Integrity Event Recorded</p>
              <p className="text-red-800">
                A window switch or prolonged tab inactivity was detected during strict proctoring mode. Your test was auto-submitted.
              </p>
            </div>
          </div>
          {result?.testSlug && (
            <Link
              to={`/student/tests/${result.testSlug}`}
              className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-attempt Test
            </Link>
          )}
        </div>
      )}

      {/* Hero Scorecard */}
      <div className="bg-white rounded-3xl border-2 border-[#E3D8BE] overflow-hidden shadow-sm">
        <div className={`p-8 text-center text-white ${isPassed ? 'bg-[#061426]' : 'bg-[#151B24]'}`}>
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Award className="w-8 h-8 text-[#F0C45B]" />
          </div>

          <span className="text-xs uppercase tracking-widest text-[#F0C45B] font-bold">
            Examination Scorecard
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl mt-1.5">{result.testTitle}</h1>

          <div className="mt-6 flex justify-center items-baseline gap-2">
            <span className="font-serif font-bold text-5xl sm:text-6xl text-[#F0C45B]">{result.score}</span>
            <span className="text-base text-white/70 font-semibold">/ {result.totalMarks} Marks</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/20">
              {result.percentage}% • {isPassed ? 'Qualified' : 'Under Review'}
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-white/10 border border-white/20">
              Time: {formatTime(result.timeTakenSeconds)}
            </span>
          </div>

          {/* Rank Badge */}
          {result.showRank && result.rank !== null && (
            <div className="mt-5 inline-flex items-center gap-2.5 px-5 py-2 rounded-xl bg-amber-400/20 border border-amber-400/30 text-[#F0C45B]">
              <Trophy className="w-5 h-5 text-[#F0C45B]" />
              <span className="text-sm font-bold">
                National Rank: #{result.rank}
              </span>
              {result.participants !== null && (
                <span className="text-xs text-white/70">
                  (out of {result.participants} participants)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Breakdown Summary Stats */}
        <div className="p-6 grid grid-cols-3 divide-x divide-[#E3D8BE] bg-[#F8F4EA] text-center">
          <div>
            <span className="text-xs text-[#687386] block font-medium">Correct</span>
            <strong className="text-2xl text-emerald-700 block mt-1">{result.correctCount}</strong>
          </div>
          <div>
            <span className="text-xs text-[#687386] block font-medium">Incorrect</span>
            <strong className="text-2xl text-red-600 block mt-1">{result.wrongCount}</strong>
          </div>
          <div>
            <span className="text-xs text-[#687386] block font-medium">Unattempted</span>
            <strong className="text-2xl text-[#687386] block mt-1">{result.unattemptedCount}</strong>
          </div>
        </div>
      </div>

      {/* Subject Analysis Section */}
      {result.subjectAnalysis && result.subjectAnalysis.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E3D8BE] p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E3D8BE]">
            <BarChart3 className="w-5 h-5 text-[#A87519]" />
            <h3 className="font-serif font-bold text-lg text-[#061426]">Subject-wise Performance Breakdown</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#061426]">
              <thead>
                <tr className="bg-[#F8F4EA] text-[#687386] uppercase font-bold text-[10px] tracking-wider border-b border-[#E3D8BE]">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 text-center">Questions</th>
                  <th className="py-2.5 px-3 text-center text-emerald-700">Correct</th>
                  <th className="py-2.5 px-3 text-center text-red-600">Wrong</th>
                  <th className="py-2.5 px-3 text-center text-[#687386]">Unanswered</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-right">Max Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D8BE]/50">
                {result.subjectAnalysis.map((sub, sIdx) => (
                  <tr key={sIdx} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-semibold text-[#061426]">{sub.subject}</td>
                    <td className="py-3 px-3 text-center">{sub.total}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{sub.correct}</td>
                    <td className="py-3 px-3 text-center font-bold text-red-600">{sub.wrong}</td>
                    <td className="py-3 px-3 text-center text-[#687386]">{sub.unanswered}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#A87519]">{sub.score}</td>
                    <td className="py-3 px-3 text-right text-[#687386]">{sub.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Answer Review Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#E3D8BE]">
          <h3 className="font-serif font-bold text-2xl text-[#061426]">Detailed Question Review</h3>
          <span className="text-xs text-[#687386]">
            {result.showReview ? `${result.review?.length || 0} Questions Evaluated` : 'Review Restricted'}
          </span>
        </div>

        {!result.showReview ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E3D8BE] space-y-2">
            <HelpCircle className="w-8 h-8 text-[#A87519] mx-auto" />
            <h4 className="font-serif font-bold text-lg text-[#061426]">Review Not Available</h4>
            <p className="text-xs text-[#687386] max-w-md mx-auto">
              Question review and explanations for this examination have been kept confidential by the administrator.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {result.review?.map((q, idx) => {
              const isCorrect = q.verdict === 'correct';
              const isWrong = q.verdict === 'wrong';
              const isUnattempted = q.verdict === 'unattempted';

              return (
                <div
                  key={q.questionId || idx}
                  className="bg-white rounded-2xl border border-[#E3D8BE] p-6 space-y-4 shadow-sm"
                >
                  {/* Question Review Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E3D8BE]/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#A87519] uppercase tracking-wider">
                        Question {idx + 1}
                      </span>
                      <span className="text-[11px] text-[#687386] bg-gray-100 px-2 py-0.5 rounded">
                        {q.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#687386]">
                        +{q.marks} / -{q.negativeMarks} Marks
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded flex items-center gap-1 ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : isWrong
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isCorrect && <Check className="w-3.5 h-3.5" />}
                        {isWrong && <X className="w-3.5 h-3.5" />}
                        {isCorrect
                          ? `Correct (+${q.marks})`
                          : isWrong
                          ? `Incorrect (-${q.negativeMarks})`
                          : 'Unattempted (0)'}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-2">
                    {(q as any).imageUrl && !((q.questionEn || q.question || '').includes((q as any).imageUrl)) && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center max-h-72 overflow-hidden my-2">
                        <img
                          src={(q as any).imageUrl.startsWith('/') ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')}${(q as any).imageUrl}` : (q as any).imageUrl}
                          alt="Question figure"
                          className="max-h-64 object-contain rounded shadow-xs"
                        />
                      </div>
                    )}
                    <div className="text-base font-medium text-[#061426]">
                      <MathText text={q.questionEn || q.question} />
                    </div>
                    {q.questionHi && (
                      <div className="text-sm text-[#4E5969] pt-2 border-t border-[#E3D8BE]/30">
                        <MathText text={q.questionHi} />
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pt-2">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const optEn = (q as any)[`option${letter}`];
                      const optHi = (q as any)[`option${letter}Hi`];
                      const isCorrectKey = q.correctOption?.toUpperCase() === letter;
                      const isUserChoice = q.selectedOption?.toUpperCase() === letter;

                      if (!optEn && !optHi) return null;

                      let rowClass = 'border-gray-200 bg-white text-[#263347]';
                      if (isCorrectKey) {
                        rowClass = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold';
                      } else if (isUserChoice && !isCorrectKey) {
                        rowClass = 'border-red-400 bg-red-50/80 text-red-950 font-semibold';
                      }

                      return (
                        <div
                          key={letter}
                          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm ${rowClass}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="font-bold w-5">{letter}.</span>
                            <div className="space-y-1">
                              <div>
                                <MathText text={optEn} />
                              </div>
                              {optHi && optHi !== optEn && (
                                <div className="text-xs text-[#687386]">
                                  <MathText text={optHi} />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isCorrectKey && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                                Correct Answer
                              </span>
                            )}
                            {isUserChoice && !isCorrectKey && (
                              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase">
                                Your Choice
                              </span>
                            )}
                            {isUserChoice && isCorrectKey && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded uppercase">
                                Your Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation with MathText */}
                  {(q.explanation || q.explanationEn || q.explanationHi) && (
                    <div className="p-4 bg-[#F8F4EA] rounded-xl border border-[#E3D8BE]/70 space-y-1.5 text-xs text-[#263347] mt-3">
                      <strong className="block text-[#061426] font-bold">Explanation:</strong>
                      {(q.explanationEn || q.explanation) && (
                        <div>
                          <MathText text={q.explanationEn || q.explanation} />
                        </div>
                      )}
                      {q.explanationHi && (
                        <div className="pt-1.5 border-t border-[#E3D8BE]/40 text-[#4E5969]">
                          <MathText text={q.explanationHi} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-6 border-t border-[#E3D8BE] flex items-center justify-between gap-3">
        <Link
          to="/student/tests"
          className="px-6 py-2.5 rounded-xl bg-[#061426] hover:bg-[#1C2C42] text-white text-xs font-bold transition shadow"
        >
          Return to Test Catalog
        </Link>
        {result?.testSlug && (
          <Link
            to={`/student/tests/${result.testSlug}`}
            className="px-6 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#B8871B] text-[#061426] text-xs font-bold transition shadow flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Re-take Test
          </Link>
        )}
      </div>
    </div>
  );
};

export default TestResultsPage;
