import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCourses } from '../../contexts/CourseContext';
import { DashboardAPI, LiveAPI, CoursesAPI, APIStudentProgress, APILiveClass, APICourse } from '../../services/api';
import { WhatsAppCounsellorButton } from '../../components/WhatsAppCounsellorButton';
import { 
  PlayCircle, Clock, CheckCircle2, Bookmark, Award, 
  ArrowRight, FileCheck, AlertTriangle, BookOpen, ChevronRight, Loader2, AlertCircle, Radio
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { courses } = useCourses();

  const [progressData, setProgressData] = useState<APIStudentProgress | null>(null);
  const [liveSessions, setLiveSessions] = useState<APILiveClass[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<APICourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      DashboardAPI.studentProgress().then(data => setProgressData(data)),
      LiveAPI.list({ status: 'live' }).then(lives => setLiveSessions(lives)).catch(() => []),
      CoursesAPI.recommended().then(recs => setRecommendedCourses(recs)).catch(() => []),
    ])
      .catch(err => setError(err.message || 'Failed to load student progress.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading your personalized student dashboard...</p>
      </div>
    );
  }

  const enrolledCourses = progressData?.enrolledCourses || [];
  const recentTests = progressData?.testsAttempted || [];
  const summary = progressData?.summary || { totalCoursesEnrolled: 0, totalTestsAttempted: 0, averageMockScore: 0 };

  return (
    <div className="space-y-8">
      {/* 1. Welcome Header Banner */}
      <div className="bg-gradient-to-r from-[#061426] via-[#091B31] to-[#102846] text-white p-6 sm:p-8 rounded-2xl border-2 border-[#D9A52E]/30 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#D9A52E]">
            Student Learning Portal (Verified Session)
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-4xl text-[#FFF9ED] mt-1">
            Welcome back, {user?.name || progressData?.student.name || 'Candidate'}!
          </h1>
          <p className="text-xs text-[#E3D8BE] mt-2">
            Target Focus: <strong>{user?.targetExam || progressData?.student.targetExam || 'Not specified'}</strong>
            {!(user?.targetExam || progressData?.student.targetExam) && (
              <Link to="/student/profile-setup" className="ml-2 text-[#F0C45B] underline hover:text-white">
                (Set Target Exam)
              </Link>
            )}
            {' • Email: '}{user?.email}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/courses"
            className="px-5 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs shadow transition"
          >
            Explore Catalog
          </Link>
          <Link
            to="/student/tests"
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow transition"
          >
            Take Test
          </Link>
          <WhatsAppCounsellorButton variant="secondary" className="px-4 py-2.5 text-xs font-semibold">
            Academic Help
          </WhatsAppCounsellorButton>
          <Link
            to="/student/live"
            className="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Radio className="w-3.5 h-3.5" /> Live Classes
          </Link>
        </div>
      </div>

      {/* LIVE NOW Banner */}
      {liveSessions.length > 0 && (
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-[#061426] text-white p-5 rounded-2xl border-2 border-rose-500 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-rose-500 text-white rounded-xl">
              <Radio className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 px-2 py-0.5 rounded text-white">
                  LIVE NOW
                </span>
                <span className="text-xs text-rose-200">{liveSessions[0].course_title || 'Interactive Session'}</span>
              </div>
              <h3 className="font-serif font-bold text-lg text-white mt-0.5">{liveSessions[0].title}</h3>
            </div>
          </div>
          <Link
            to={`/student/live/${liveSessions[0].id}`}
            className="px-5 py-2.5 rounded-xl bg-white text-rose-900 font-bold text-xs hover:bg-rose-50 transition shadow self-start sm:self-center"
          >
            Join Live Classroom
          </Link>
        </div>
      )}

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#687386]">Active Enrollments</span>
            <div className="text-2xl font-serif font-bold text-[#061426]">{summary.totalCoursesEnrolled} Courses</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#687386]">Tests Attempted</span>
            <div className="text-2xl font-serif font-bold text-[#061426]">{summary.totalTestsAttempted} Tests</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#687386]">Average Benchmark</span>
            <div className="text-2xl font-serif font-bold text-[#061426]">{summary.averageMockScore} Marks</div>
          </div>
        </div>
      </div>

      {/* 3. Enrolled Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-xl text-[#061426]">Your Academic Courses</h2>
          <Link to="/student/my-courses" className="text-xs font-semibold text-[#A87519] hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border-2 border-[#E3D8BE] text-center space-y-3">
            <BookOpen className="w-10 h-10 text-[#687386] mx-auto" />
            <p className="text-sm font-semibold text-[#061426]">No active course enrollments yet</p>
            <p className="text-xs text-[#687386]">Browse our national exam preparation programs to begin learning.</p>
            <Link
              to="/courses"
              className="mt-2 inline-block px-5 py-2 rounded-lg bg-[#D9A52E] text-[#061426] text-xs font-bold"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrolledCourses.map((c) => (
              <div key={c.id} className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A87519] bg-[#F8F4EA] px-2 py-0.5 rounded border border-[#E3D8BE]">
                    {c.category_label}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#061426] mt-2">{c.title}</h3>
                  <p className="text-xs text-[#687386] mt-1">Format: {c.format}</p>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-[#263347]">
                      <span>Curriculum Completion</span>
                      <strong className="font-bold">{c.progressPercentage}%</strong>
                    </div>
                    <div className="h-2 rounded-full bg-[#F8F4EA] overflow-hidden border border-[#E3D8BE]">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${c.progressPercentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#687386]">
                      {c.completedCount} of {c.lectureCount} lectures completed
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E3D8BE] flex justify-end">
                  <Link
                    to={`/courses/${c.slug}`}
                    className="px-4 py-2 rounded-lg bg-[#061426] hover:bg-[#263347] text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    Open Classroom <PlayCircle className="w-3.5 h-3.5 text-[#F0C45B]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent Test Attempts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-xl text-[#061426]">Recent Mock Assessments</h2>
          <Link to="/student/tests" className="text-xs font-semibold text-[#A87519] hover:underline flex items-center gap-1">
            Test Center <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTests.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] text-center text-xs text-[#687386]">
            No mock tests attempted yet. Test series help you evaluate your national rank and speed.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-[#E3D8BE] overflow-hidden shadow-sm divide-y divide-[#E3D8BE]">
            {recentTests.map((t) => (
              <div key={t.id} className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-[#FFF9ED] transition">
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-base text-[#061426]">{t.testTitle}</h4>
                  <span className="text-xs text-[#687386]">
                    Submitted: {new Date(t.completedAt).toLocaleDateString()} at {new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-[#687386] block">Verified Score</span>
                    <strong className="text-lg font-serif font-bold text-emerald-700">
                      {t.score} / {t.totalMarks}
                    </strong>
                  </div>

                  <Link
                    to={`/student/results/${t.testSlug}`}
                    className="px-4 py-2 rounded-lg border border-[#E3D8BE] bg-white text-xs font-bold text-[#061426] hover:bg-[#F8F4EA]"
                  >
                    Review Attempt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Recommended Learning Pathways */}
      <div className="space-y-4 pt-4 border-t border-[#E3D8BE]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-xl text-[#061426]">
              Personalized Course Recommendations
            </h2>
            <p className="text-xs text-[#687386] mt-0.5">
              Based on your target focus: <span className="font-bold text-[#A87519]">{user?.targetExam || 'All Programs'}</span>
            </p>
          </div>
          <Link to="/courses" className="text-xs font-semibold text-[#A87519] hover:underline flex items-center gap-1">
            View All Courses <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(recommendedCourses.length > 0 ? recommendedCourses : courses).slice(0, 3).map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border-2 border-[#E3D8BE] shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A87519] px-2 py-0.5 rounded bg-[#F8F4EA]">
                  {c.target_exam}
                </span>
                <h4 className="font-serif font-bold text-base text-[#061426] mt-2 line-clamp-2">
                  {c.title}
                </h4>
                <p className="text-xs text-[#687386] mt-1 line-clamp-2">
                  {c.short_description}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#E3D8BE] flex items-center justify-between">
                <span className="text-xs font-bold text-[#061426]">
                  {c.is_paid && c.price ? `₹${parseFloat(c.price).toLocaleString('en-IN')}` : 'Enquire'}
                </span>
                <Link
                  to={`/courses/${c.slug}`}
                  className="px-3 py-1.5 rounded-lg bg-[#061426] text-[#F0C45B] text-xs font-bold hover:bg-[#263347] transition"
                >
                  Explore &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
