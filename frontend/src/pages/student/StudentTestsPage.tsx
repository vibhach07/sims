import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AssessmentsAPI, APITestSeries, APIMyAttemptV2 } from '../../services/api';
import {
  FileCheck, ArrowRight, Loader2, AlertCircle, Award, CheckCircle2,
  Clock, PlayCircle, Lock, AlertTriangle, RotateCcw
} from 'lucide-react';

export const StudentTestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<APITestSeries[]>([]);
  const [attempts, setAttempts] = useState<APIMyAttemptV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AssessmentsAPI.list(),
      AssessmentsAPI.myAttemptsV2().catch(() => [] as APIMyAttemptV2[])
    ])
      .then(([testsData, attemptsData]) => {
        setTests(testsData);
        setAttempts(attemptsData);
      })
      .catch(err => setError(err.message || 'Failed to load test series.'))
      .finally(() => setIsLoading(false));
  }, []);

  // Compute stat cards
  const completedAttempts = attempts.filter(
    a => a.status === 'submitted' || a.status === 'auto_submitted'
  );
  const bestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map(a => a.percentage))
    : 0;

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading test series & attempts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800">
        <AlertCircle className="w-6 h-6 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-bold">Unable to fetch tests</p>
          <p className="text-xs text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif font-bold text-3xl text-[#061426]">Mock Test Series</h1>
        <p className="text-sm text-[#687386] mt-1">
          Full-length simulated test series with live server autosave, bilingual Hindi/English questions, and rank analysis.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#687386] font-medium">Best Score</p>
            <p className="text-2xl font-bold text-[#061426] font-serif">
              {completedAttempts.length > 0 ? `${bestScore}%` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#687386] font-medium">Available Tests</p>
            <p className="text-2xl font-bold text-[#061426] font-serif">{tests.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#687386] font-medium">Completed Attempts</p>
            <p className="text-2xl font-bold text-[#061426] font-serif">{completedAttempts.length}</p>
          </div>
        </div>
      </div>

      {/* Tests Grid */}
      {tests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E3D8BE]">
          <p className="text-sm text-[#687386]">No active tests currently published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const hasAttempts = (test.usedAttempts ?? 0) > 0;
            const inProgress = !!test.inProgressAttemptId;

            return (
              <div
                key={test.id}
                className="sims-card p-6 flex flex-col justify-between group outline-none bg-white rounded-2xl border border-[#E3D8BE] hover:shadow-md transition"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#A87519] bg-[#F8F4EA] px-2.5 py-0.5 rounded border border-[#E3D8BE]">
                      {test.exam || 'NIMCET'}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                        test.isEntitled
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}
                    >
                      {test.isEntitled ? 'Enrolled' : `₹${test.price}`}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#061426] group-hover:text-[#A87519] transition">
                      {test.title}
                    </h3>
                    <p className="text-xs text-[#687386] mt-1.5 line-clamp-2">
                      {test.description || 'Full-syllabus mock test designed to benchmark your speed and accuracy.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-[#263347] pt-3 border-t border-[#E3D8BE]/50">
                    <div>
                      <span className="text-[#687386] block text-[10px]">Questions</span>
                      <span className="font-bold">{test.totalQuestions} Qs</span>
                    </div>
                    <div>
                      <span className="text-[#687386] block text-[10px]">Duration</span>
                      <span className="font-bold">{test.durationMinutes} Min</span>
                    </div>
                    <div>
                      <span className="text-[#687386] block text-[10px]">Max Attempts</span>
                      <span className="font-bold">
                        {test.maxAttempts ? `${test.usedAttempts ?? 0}/${test.maxAttempts}` : 'Unlimited'}
                      </span>
                    </div>
                  </div>

                  {test.startsAt && new Date(test.startsAt) > new Date() && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Starts: {new Date(test.startsAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-[#E3D8BE]/40 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-[#687386] block">Total Marks</span>
                    <span className="text-sm font-bold text-[#061426]">{test.totalMarks} Marks</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasAttempts && (
                      <Link
                        to={`/student/results/${test.slug}`}
                        className="px-3 py-2 rounded-lg border border-[#E3D8BE] hover:bg-[#F8F4EA] text-[#061426] text-xs font-semibold transition"
                      >
                        Result
                      </Link>
                    )}

                    {/* Action Button States */}
                    {inProgress ? (
                      <Link
                        to={`/student/tests/${test.slug}`}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Resume Test
                      </Link>
                    ) : test.blockReason === 'not_started' ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 font-semibold text-xs flex items-center gap-1.5 cursor-not-allowed"
                      >
                        <Clock className="w-3.5 h-3.5" /> Not Started
                      </button>
                    ) : test.blockReason === 'ended' ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 font-semibold text-xs flex items-center gap-1.5 cursor-not-allowed"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Ended
                      </button>
                    ) : test.blockReason === 'attempts_used' ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 font-semibold text-xs flex items-center gap-1.5 cursor-not-allowed"
                      >
                        Attempts Used
                      </button>
                    ) : test.blockReason === 'no_questions' ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 font-semibold text-xs flex items-center gap-1.5 cursor-not-allowed"
                      >
                        No Questions
                      </button>
                    ) : test.blockReason === 'purchase_required' ? (
                      <Link
                        to={`/courses`}
                        className="px-4 py-2 rounded-lg bg-[#061426] hover:bg-[#1C2C42] text-[#D9A52E] font-bold text-xs flex items-center gap-1.5 transition shadow"
                      >
                        <Lock className="w-3.5 h-3.5" /> Enroll to Start
                      </Link>
                    ) : (
                      <Link
                        to={`/student/tests/${test.slug}`}
                        className="px-4 py-2 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-1.5 transition shadow"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Start Test
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentTestsPage;
