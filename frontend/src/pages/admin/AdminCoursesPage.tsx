import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CoursesAPI, AdminApprovalsAPI, APICourse } from '../../services/api';
import { 
  Edit3, Eye, PlusCircle, Trash2, CheckCircle2, Clock, 
  XCircle, AlertCircle, Loader2, Search, Filter, RefreshCw, 
  BookOpen, Check, X, ShieldAlert 
} from 'lucide-react';

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<APICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'pending' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      // As admin, my_courses=true fetches all courses (published, draft, pending, rejected)
      const data = await CoursesAPI.list({ my_courses: true });
      setCourses(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to fetch course catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleTogglePublish = async (course: APICourse) => {
    setActionLoadingId(course.id);
    try {
      const nextPublishState = !course.is_published;
      await CoursesAPI.updateCourse(course.id, {
        is_published: nextPublishState,
      });
      setMsg({
        type: 'success',
        text: `Course "${course.title}" is now ${nextPublishState ? 'Published' : 'Unpublished (Draft)'}.`
      });
      fetchCourses();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update course status.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReviewDecision = async (id: number, decision: 'approve' | 'reject') => {
    setActionLoadingId(id);
    try {
      const note = decision === 'reject' ? prompt('Provide rejection reason for educator:') : undefined;
      if (decision === 'reject' && (!note || !note.trim())) {
        setActionLoadingId(null);
        return;
      }
      const res = await AdminApprovalsAPI.reviewCourse(id, decision, note || undefined);
      setMsg({ type: 'success', text: res.message || `Course review marked as ${decision}.` });
      fetchCourses();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Review action failed.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCourse = async (course: APICourse) => {
    if (!confirm(`Are you sure you want to permanently delete course "${course.title}"? This action cannot be undone.`)) {
      return;
    }
    setActionLoadingId(course.id);
    try {
      await CoursesAPI.deleteCourse(course.id);
      setMsg({ type: 'success', text: `Course "${course.title}" deleted successfully.` });
      setCourses(courses.filter(c => c.id !== course.id));
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete course.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered courses
  const filteredCourses = courses.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.target_exam && c.target_exam.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = 
      categoryFilter === 'all' || c.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'published') matchesStatus = !!c.is_published;
    else if (statusFilter === 'draft') matchesStatus = !c.is_published && c.review_status !== 'pending';
    else if (statusFilter === 'pending') matchesStatus = c.review_status === 'pending';
    else if (statusFilter === 'rejected') matchesStatus = c.review_status === 'rejected';

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean)));
  const publishedCount = courses.filter(c => c.is_published).length;
  const pendingCount = courses.filter(c => c.review_status === 'pending').length;
  const draftCount = courses.filter(c => !c.is_published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#061426]">Course Administration</h1>
          <p className="text-xs sm:text-sm text-[#687386] mt-1">
            Centralized course catalog management with live publishing and review state controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCourses}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-[#E3D8BE] hover:bg-slate-50 text-slate-700 transition"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D9A52E]' : ''}`} />
          </button>
          <Link
            to="/educator/courses/new"
            className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
          >
            <PlusCircle className="w-4 h-4" /> Add Course
          </Link>
        </div>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Total Courses</span>
          <div className="text-2xl font-bold text-[#061426] mt-1">{courses.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600">Published Live</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
          <span className="text-[11px] font-semibold text-amber-600">Pending Review</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Drafts / Unpublished</span>
          <div className="text-2xl font-bold text-slate-700 mt-1">{draftCount}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by course title, slug, or target exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="pending">Pending Review</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none uppercase"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Course Table */}
      <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
              <tr>
                <th className="text-left p-4">Course Details</th>
                <th className="text-center p-4">Category / Exam</th>
                <th className="text-center p-4">Price</th>
                <th className="text-center p-4">Review State</th>
                <th className="text-center p-4">Catalog Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D8BE]/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D9A52E] mb-2" />
                    Loading course administration catalog...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    No courses found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FFF9ED]/40 transition">
                    <td className="p-4 max-w-sm">
                      <div className="font-semibold text-[#061426] text-sm line-clamp-1">{c.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>slug: {c.slug}</span>
                        <span>•</span>
                        <span>{c.lecture_count} lectures</span>
                        {c.badge && (
                          <>
                            <span>•</span>
                            <span className="text-[#D9A52E] font-medium">{c.badge}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                        {c.category_label || c.category}
                      </span>
                      {c.target_exam && (
                        <div className="text-[10px] text-slate-500 mt-1">{c.target_exam}</div>
                      )}
                    </td>

                    <td className="p-4 text-center font-bold text-slate-800">
                      {Number(c.price) > 0 ? (
                        <div>
                          <div>₹{c.price}</div>
                          {c.original_price && Number(c.original_price) > Number(c.price) && (
                            <div className="text-[10px] text-slate-400 line-through">₹{c.original_price}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-bold">Free</span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.review_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        c.review_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        c.review_status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {c.review_status || 'draft'}
                      </span>
                      {c.review_note && (
                        <div className="text-[10px] text-rose-600 line-clamp-1 mt-0.5" title={c.review_note}>
                          {c.review_note}
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleTogglePublish(c)}
                        disabled={actionLoadingId === c.id}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 mx-auto ${
                          c.is_published
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Click to toggle publish status"
                      >
                        {c.is_published ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" /> Published
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 text-slate-400" /> Draft
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.review_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReviewDecision(c.id, 'approve')}
                              disabled={actionLoadingId === c.id}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold"
                              title="Approve & Publish"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewDecision(c.id, 'reject')}
                              disabled={actionLoadingId === c.id}
                              className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold"
                              title="Reject with note"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <Link
                          to={`/courses/${c.slug}`}
                          className="p-1.5 rounded bg-[#F8F4EA] text-[#687386] hover:text-[#061426] border border-[#E3D8BE]"
                          title="View Catalog Page"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          to={`/educator/courses/${c.id}/edit`}
                          className="p-1.5 rounded bg-[#F8F4EA] text-[#687386] hover:text-[#061426] border border-[#E3D8BE]"
                          title="Edit Curriculum & Pricing"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteCourse(c)}
                          disabled={actionLoadingId === c.id}
                          className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCoursesPage;
