import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CoursesAPI, DashboardAPI, AuditAPI, APICourse, APIEducatorStudent, APIAuditLog } from '../../services/api';
import { 
  BookOpen, PlusCircle, Users, Award, 
  ChevronRight, Loader2, AlertCircle, FileText, CheckCircle2,
  Clock, XCircle, ArrowUpRight, Activity as ActivityIcon, FileCheck
} from 'lucide-react';

export const EducatorDashboardPage: React.FC = () => {
  const [courses, setCourses] = useState<APICourse[]>([]);
  const [students, setStudents] = useState<APIEducatorStudent[]>([]);
  const [activity, setActivity] = useState<APIAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      CoursesAPI.list({ my_courses: true }),
      DashboardAPI.educatorStudents(),
      AuditAPI.educatorActivity(),
    ])
      .then(([courseData, studentData, activityData]) => {
        setCourses(courseData);
        setStudents(studentData);
        setActivity(activityData.results || []);
      })
      .catch((err) => setError(err.message || 'Failed to load educator dashboard data.'))
      .finally(() => setIsLoading(false));
  }, []);

  const approvedCourses = courses.filter((c) => c.review_status === 'approved' || (c.is_published && !c.review_status));
  const pendingCourses = courses.filter((c) => c.review_status === 'pending');
  const rejectedCourses = courses.filter((c) => c.review_status === 'rejected');
  const draftCourses = courses.filter((c) => c.review_status === 'draft' || (!c.review_status && !c.is_published));

  const totalAttempts = students.reduce((acc, s) => acc + s.attemptsCount, 0);
  const avgScore = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.avgScore, 0) / students.length)
    : 0;

  const needsAttention = [
    ...rejectedCourses.map((c) => ({
      id: c.id,
      title: c.title,
      type: 'Course',
      status: 'rejected',
      note: c.review_note || 'Revisions required by administrator.',
      link: `/educator/courses/${c.id}/edit`,
    })),
    ...pendingCourses.map((c) => ({
      id: c.id,
      title: c.title,
      type: 'Course',
      status: 'pending',
      note: 'Currently in review queue for administrator approval.',
      link: `/educator/courses/${c.id}/edit`,
    })),
  ];

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Loading Educator Studio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#091B31] text-white p-6 sm:p-8 rounded-2xl border-2 border-[#D9A52E]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#D9A52E]">
            Educator & Faculty Workspace
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#FFF9ED] mt-1">
            Academic Performance & Content Studio
          </h1>
          <p className="text-xs text-[#E3D8BE]/80 mt-1">
            Manage course curriculum, monitor submissions and track content review decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/educator/courses/new"
            className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Course</span>
          </Link>
          <Link
            to="/educator/tests"
            className="px-4 py-2.5 rounded-xl bg-[#102846] hover:bg-[#1a385f] text-white font-semibold text-xs flex items-center gap-2 border border-[#D9A52E]/30"
          >
            <FileCheck className="w-4 h-4 text-[#D9A52E]" />
            <span>My Tests</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Status & Cohort Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E3D8BE] shadow-sm">
          <div className="text-xs text-slate-500">Live / Approved Courses</div>
          <div className="text-2xl font-serif font-bold text-emerald-800 mt-1">{approvedCourses.length}</div>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
            {courses.length} Total Registered
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E3D8BE] shadow-sm">
          <div className="text-xs text-slate-500">Drafts & In-Review</div>
          <div className="text-2xl font-serif font-bold text-amber-700 mt-1">
            {draftCourses.length + pendingCourses.length}
          </div>
          <span className="text-[10px] text-amber-600 font-semibold block mt-1">
            {pendingCourses.length} Pending Approval
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E3D8BE] shadow-sm">
          <div className="text-xs text-slate-500">Assigned Cohort</div>
          <div className="text-2xl font-serif font-bold text-[#061426] mt-1">{students.length}</div>
          <span className="text-[10px] text-blue-700 font-semibold block mt-1">Enrolled Candidates</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E3D8BE] shadow-sm">
          <div className="text-xs text-slate-500">Cohort Average</div>
          <div className="text-2xl font-serif font-bold text-[#061426] mt-1">{avgScore}%</div>
          <span className="text-[10px] text-purple-700 font-semibold block mt-1">{totalAttempts} Evaluated Tests</span>
        </div>
      </div>

      {/* Needs Attention Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-lg text-[#061426] flex items-center gap-2">
            Needs Attention ({needsAttention.length})
          </h2>
          {needsAttention.length > 0 && (
            <span className="text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-semibold">
              Action Items
            </span>
          )}
        </div>

        {needsAttention.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-slate-700">All clear!</span>
            <span>No pending rejection notes or blocked content submissions.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {needsAttention.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border text-xs flex flex-col justify-between gap-3 ${
                  item.status === 'rejected'
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm truncate">{item.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1 leading-relaxed">{item.note}</p>
                </div>

                <Link
                  to={item.link}
                  className="self-start text-xs font-bold text-[#A87519] hover:underline flex items-center gap-1"
                >
                  Edit & Address <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column: Recent Activity & Cohort Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Student Performance */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg text-[#061426]">Enrolled Candidate Snapshot</h2>
            <Link to="/educator/students" className="text-xs font-semibold text-[#A87519] hover:underline flex items-center gap-1">
              Full Student Roster <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {students.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#E3D8BE] text-center text-xs text-slate-500">
              No enrolled candidates in your courses yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E3D8BE] overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                  <tr>
                    <th className="text-left p-3.5">Candidate</th>
                    <th className="text-left p-3.5">Course</th>
                    <th className="text-center p-3.5">Tests</th>
                    <th className="text-center p-3.5">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D8BE]/40">
                  {students.slice(0, 5).map((s) => (
                    <tr key={s.id} className="hover:bg-[#FFF9ED] transition">
                      <td className="p-3.5 font-semibold text-[#061426]">
                        <div>{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{s.email}</div>
                      </td>
                      <td className="p-3.5 text-slate-700">{s.course}</td>
                      <td className="p-3.5 text-center font-bold text-slate-900">{s.attemptsCount}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">{s.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right col: Recent Activity Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg text-[#061426]">Recent Activity</h2>
            <Link to="/educator/activity" className="text-xs font-semibold text-[#A87519] hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] text-center text-xs text-slate-500">
              No recent activity recorded.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E3D8BE] p-3 space-y-3 shadow-sm">
              {activity.slice(0, 5).map((act) => (
                <div key={act.id} className="border-b border-slate-100 last:border-0 pb-2.5 last:pb-0 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-900 capitalize">
                      {act.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-slate-600 truncate mt-0.5">
                    {act.object_type}: <span className="font-medium text-slate-800">{act.object_title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EducatorDashboardPage;
