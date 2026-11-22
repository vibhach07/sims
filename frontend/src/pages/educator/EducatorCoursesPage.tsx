import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CoursesAPI, APICourse } from '../../services/api';
import { 
  Edit3, PlusCircle, Eye, CheckCircle2, Clock, XCircle, 
  Send, Search, AlertCircle, Loader2 
} from 'lucide-react';

export const EducatorCoursesPage: React.FC = () => {
  const [coursesList, setCoursesList] = useState<APICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      const data = await CoursesAPI.list({ my_courses: true });
      setCoursesList(data);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load courses.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const handleSubmitReview = async (course: APICourse) => {
    if (course.lecture_count < 1) {
      setMsg({ type: 'error', text: 'Course must have at least 1 lecture before submitting for review.' });
      return;
    }
    setActionLoading(course.id);
    try {
      const res = await CoursesAPI.submitReview(course.id);
      setMsg({ type: 'success', text: res.message || 'Course submitted for review.' });
      await fetchMyCourses();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to submit course for review.' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCourses = coursesList.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.target_exam.toLowerCase().includes(search.toLowerCase());
    const status = c.review_status || (c.is_published ? 'approved' : 'draft');
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderStatusBadge = (c: APICourse) => {
    const status = c.review_status || (c.is_published ? 'approved' : 'draft');
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved (Live)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
          </span>
        );
      case 'rejected':
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
              <XCircle className="w-3 h-3 text-rose-600" /> Rejected
            </span>
            {c.review_note && (
              <div className="text-[10px] text-rose-700 bg-rose-50 p-1 rounded max-w-xs leading-tight">
                Note: {c.review_note}
              </div>
            )}
          </div>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">My Courses</h1>
          <p className="text-sm text-slate-500 mt-1">Manage curriculum, monitor review status and submit courses for admin review.</p>
        </div>
        <Link
          to="/educator/courses/new"
          className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
        >
          <PlusCircle className="w-4 h-4" /> Create New Course
        </Link>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E3D8BE]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search my courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D9A52E]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved (Live)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
              <tr>
                <th className="text-left p-4">Course</th>
                <th className="text-left p-4">Category</th>
                <th className="text-center p-4">Lectures</th>
                <th className="text-left p-4">Review Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D8BE]/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Loading courses...</td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No courses found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => {
                  const status = c.review_status || (c.is_published ? 'approved' : 'draft');
                  const canSubmit = status === 'draft' || status === 'rejected';

                  return (
                    <tr key={c.id} className="hover:bg-[#FFF9ED] transition">
                      <td className="p-4">
                        <div className="font-semibold text-[#061426] text-sm">{c.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{c.target_exam}</div>
                      </td>
                      <td className="p-4 text-slate-600">{c.category_label}</td>
                      <td className="p-4 text-center font-bold text-slate-800">{c.lecture_count}</td>
                      <td className="p-4">{renderStatusBadge(c)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canSubmit && (
                            <button
                              onClick={() => handleSubmitReview(c)}
                              disabled={actionLoading === c.id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-[11px] flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                              title={c.lecture_count < 1 ? 'Needs at least 1 lecture' : 'Submit for Admin Review'}
                            >
                              {actionLoading === c.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Submit Review</span>
                            </button>
                          )}
                          <Link
                            to={`/courses/${c.slug}`}
                            className="p-1.5 rounded bg-slate-50 text-slate-600 hover:text-[#061426] border border-slate-200"
                            title="Preview as Student"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/educator/courses/${c.id}/edit`}
                            className="p-1.5 rounded bg-slate-50 text-slate-600 hover:text-[#061426] border border-slate-200"
                            title="Edit Curriculum"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EducatorCoursesPage;
