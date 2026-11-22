import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  AdminEducatorsAPI, TransferAPI, AdminApprovalsAPI,
  APIAdminEducatorDetail, APIAdminEducatorItem 
} from '../../services/api';
import { 
  ArrowLeft, BookOpen, FileCheck, Layers, Users, Clock, 
  UserCheck, ShieldAlert, ShieldCheck, Mail, CheckCircle2, 
  XCircle, AlertCircle, Loader2, RefreshCw, Send, Check, X,
  ArrowRightLeft, Edit3, Eye, EyeOff
} from 'lucide-react';

export const AdminEducatorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const educatorId = Number(id);

  const [data, setData] = useState<APIAdminEducatorDetail | null>(null);
  const [allEducators, setAllEducators] = useState<APIAdminEducatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'tests' | 'resources' | 'students' | 'activity' | 'profile'>('overview');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transfer state
  const [targetUserId, setTargetUserId] = useState<number | ''>('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [selectedTestSlugs, setSelectedTestSlugs] = useState<string[]>([]);
  const [selectedResourceSlugs, setSelectedResourceSlugs] = useState<string[]>([]);
  const [transferring, setTransferring] = useState(false);

  // Faculty profile form state
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    role: '',
    specialization: '',
    qualification: '',
    experience: '',
    bio: '',
    image: '',
    is_active: true,
  });
  const [savingFaculty, setSavingFaculty] = useState(false);

  const loadData = async () => {
    if (!educatorId) return;
    setLoading(true);
    try {
      const [detailRes, educatorsRes] = await Promise.all([
        AdminEducatorsAPI.getEducator(educatorId),
        AdminEducatorsAPI.list()
      ]);
      setData(detailRes);
      setAllEducators(educatorsRes);

      if (detailRes.faculty) {
        setFacultyForm({
          name: detailRes.faculty.name || '',
          role: detailRes.faculty.role || '',
          specialization: detailRes.faculty.specialization || '',
          qualification: detailRes.faculty.qualification || '',
          experience: detailRes.faculty.experience || '',
          bio: detailRes.faculty.bio || '',
          image: detailRes.faculty.image || '',
          is_active: detailRes.faculty.is_active ?? true,
        });
      } else {
        setFacultyForm({
          name: detailRes.educator.name,
          role: 'Faculty Educator',
          specialization: '',
          qualification: '',
          experience: '',
          bio: '',
          image: '',
          is_active: true,
        });
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load educator details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [educatorId]);

  const handleAction = async (action: 'suspend' | 'reactivate' | 'remove' | 'sendInvite') => {
    if (!educatorId) return;
    try {
      let res;
      if (action === 'suspend') res = await AdminEducatorsAPI.suspend(educatorId);
      else if (action === 'reactivate') res = await AdminEducatorsAPI.reactivate(educatorId);
      else if (action === 'remove') res = await AdminEducatorsAPI.remove(educatorId);
      else if (action === 'sendInvite') res = await AdminEducatorsAPI.sendInvite(educatorId);
      setMsg({ type: 'success', text: res?.message || 'Action executed successfully.' });
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Action failed.' });
    }
  };

  // Bulk transfers
  const handleBulkTransferCourses = async () => {
    if (!targetUserId || selectedCourseIds.length === 0) {
      alert('Select target educator and at least one course.');
      return;
    }
    setTransferring(true);
    try {
      const res = await TransferAPI.transferCoursesBulk(selectedCourseIds, Number(targetUserId));
      setMsg({ type: 'success', text: res.message });
      setSelectedCourseIds([]);
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Transfer failed.' });
    } finally {
      setTransferring(false);
    }
  };

  const handleSingleTransferCourse = async (courseId: number, toUser: number) => {
    try {
      const res = await TransferAPI.transferCourse(courseId, toUser);
      setMsg({ type: 'success', text: res.message });
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Transfer failed.' });
    }
  };

  const handleBulkTransferTests = async () => {
    if (!targetUserId || selectedTestSlugs.length === 0) {
      alert('Select target educator and at least one test.');
      return;
    }
    setTransferring(true);
    try {
      const res = await TransferAPI.transferTestsBulk(selectedTestSlugs, Number(targetUserId));
      setMsg({ type: 'success', text: res.message });
      setSelectedTestSlugs([]);
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Transfer failed.' });
    } finally {
      setTransferring(false);
    }
  };

  const handleBulkTransferResources = async () => {
    if (!targetUserId || selectedResourceSlugs.length === 0) {
      alert('Select target educator and at least one resource.');
      return;
    }
    setTransferring(true);
    try {
      const res = await TransferAPI.transferResourcesBulk(selectedResourceSlugs, Number(targetUserId));
      setMsg({ type: 'success', text: res.message });
      setSelectedResourceSlugs([]);
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Transfer failed.' });
    } finally {
      setTransferring(false);
    }
  };

  // Approval / Review decisions
  const handleReview = async (type: 'course' | 'test' | 'resource', idOrSlug: number | string, decision: 'approve' | 'reject') => {
    try {
      let res;
      if (type === 'course') res = await AdminApprovalsAPI.reviewCourse(Number(idOrSlug), decision);
      else if (type === 'test') res = await AdminApprovalsAPI.reviewTest(String(idOrSlug), decision);
      else if (type === 'resource') res = await AdminApprovalsAPI.reviewResource(String(idOrSlug), decision);
      setMsg({ type: 'success', text: res?.message || 'Updated status.' });
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Review failed.' });
    }
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!educatorId) return;
    setSavingFaculty(true);
    try {
      const res = await AdminEducatorsAPI.updateFaculty(educatorId, facultyForm);
      setMsg({ type: 'success', text: res.message || 'Faculty profile updated.' });
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to update faculty profile.' });
    } finally {
      setSavingFaculty(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E]" />
        <span className="text-sm">Loading educator workspace...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600 mb-4">Educator record not found.</p>
        <Link to="/admin/educators" className="px-4 py-2 bg-[#061426] text-[#F0C45B] rounded-lg text-xs font-bold">
          Back to Educators
        </Link>
      </div>
    );
  }

  const { educator, faculty, courses, tests, resources, students, activity, counts } = data;
  const otherEducators = allEducators.filter(e => e.id !== educatorId);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E3D8BE]">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/educators"
            className="p-2 rounded-xl bg-white border border-[#E3D8BE] hover:bg-slate-50 text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-[#061426]">{educator.name}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                educator.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {educator.is_active ? 'Active' : 'Suspended'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                {educator.role}
              </span>
            </div>
            <p className="text-xs text-slate-500">{educator.email}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAction('sendInvite')}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Mail className="w-3.5 h-3.5" /> Re-send Invite
          </button>
          {educator.is_active ? (
            <button
              onClick={() => handleAction('suspend')}
              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Suspend Educator
            </button>
          ) : (
            <button
              onClick={() => handleAction('reactivate')}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Reactivate
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Demote ${educator.name} to student? Content will remain for ownership transfer.`)) {
                handleAction('remove');
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
          >
            Demote to Student
          </button>
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

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E3D8BE] pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'courses', label: `Courses (${courses.length})` },
          { key: 'tests', label: `Tests (${tests.length})` },
          { key: 'resources', label: `Study Material (${resources.length})` },
          { key: 'students', label: `Students (${students.length})` },
          { key: 'activity', label: 'Activity Logs' },
          { key: 'profile', label: 'Faculty Profile' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition ${
              activeTab === t.key
                ? 'bg-[#061426] text-[#F0C45B] font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Total Courses</span>
              <div className="text-2xl font-bold text-[#061426] mt-1">{counts.courses}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Total Tests</span>
              <div className="text-2xl font-bold text-[#061426] mt-1">{counts.tests}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Study Resources</span>
              <div className="text-2xl font-bold text-[#061426] mt-1">{counts.resources}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Active Students</span>
              <div className="text-2xl font-bold text-[#061426] mt-1">{counts.students}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Pending Review</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{counts.pending_items}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#061426]">Educator Credentials</h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between"><span className="text-slate-500">User ID</span><span className="font-semibold text-slate-800">#{educator.id}</span></div>
                <div className="py-2 flex justify-between"><span className="text-slate-500">Full Name</span><span className="font-semibold text-slate-800">{educator.name}</span></div>
                <div className="py-2 flex justify-between"><span className="text-slate-500">Email Address</span><span className="font-semibold text-slate-800">{educator.email}</span></div>
                <div className="py-2 flex justify-between"><span className="text-slate-500">Role</span><span className="font-semibold text-slate-800 uppercase">{educator.role}</span></div>
                <div className="py-2 flex justify-between"><span className="text-slate-500">Joined Platform</span><span className="font-semibold text-slate-800">{educator.date_joined || 'N/A'}</span></div>
                <div className="py-2 flex justify-between"><span className="text-slate-500">Last Login</span><span className="font-semibold text-slate-800">{educator.last_login || 'Never'}</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#061426]">Public Faculty Profile Status</h3>
              {faculty ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img 
                      src={faculty.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                      alt={faculty.name} 
                      className="w-12 h-12 rounded-xl object-cover border border-[#E3D8BE]"
                    />
                    <div>
                      <div className="font-bold text-slate-900">{faculty.name}</div>
                      <div className="text-slate-500">{faculty.role || 'Faculty Educator'}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        faculty.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {faculty.is_active ? 'Publicly Visible' : 'Hidden from Directory'}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {faculty.bio || 'No public biography supplied yet.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-[#D9A52E] hover:underline font-bold text-xs"
                  >
                    Edit Public Profile →
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-6 text-center space-y-2">
                  <p>No public faculty directory profile created for this educator yet.</p>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="px-3 py-1.5 rounded-lg bg-[#061426] text-[#F0C45B] font-bold text-xs"
                  >
                    Create Faculty Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSES */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {/* Bulk Transfer Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                {selectedCourseIds.length} course(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value ? Number(e.target.value) : '')}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">Select target educator/admin...</option>
                {otherEducators.map(oe => (
                  <option key={oe.id} value={oe.id}>{oe.name} ({oe.email})</option>
                ))}
              </select>
              <button
                onClick={handleBulkTransferCourses}
                disabled={transferring || selectedCourseIds.length === 0 || !targetUserId}
                className="px-3 py-1.5 rounded-lg bg-[#061426] text-[#F0C45B] hover:bg-[#0c2340] font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Ownership
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                <tr>
                  <th className="p-3 text-center w-10">
                    <input 
                      type="checkbox"
                      checked={courses.length > 0 && selectedCourseIds.length === courses.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCourseIds(courses.map(c => c.id));
                        else setSelectedCourseIds([]);
                      }}
                    />
                  </th>
                  <th className="text-left p-3">Course</th>
                  <th className="text-center p-3">Category</th>
                  <th className="text-center p-3">Price</th>
                  <th className="text-center p-3">Review Status</th>
                  <th className="text-center p-3">Published</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D8BE]/40">
                {courses.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">No courses owned by this educator.</td></tr>
                ) : (
                  courses.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCourseIds([...selectedCourseIds, c.id]);
                            else setSelectedCourseIds(selectedCourseIds.filter(id => id !== c.id));
                          }}
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{c.title}</td>
                      <td className="p-3 text-center text-slate-500 uppercase">{c.category}</td>
                      <td className="p-3 text-center font-bold text-slate-800">₹{c.price}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.review_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          c.review_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          c.review_status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {c.review_status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {c.is_published ? (
                          <span className="text-emerald-700 font-bold">Published</span>
                        ) : (
                          <span className="text-slate-400">Draft</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.review_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReview('course', c.id, 'approve')}
                                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview('course', c.id, 'reject')}
                                className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleSingleTransferCourse(c.id, Number(e.target.value));
                            }}
                            defaultValue=""
                            className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none"
                          >
                            <option value="" disabled>Transfer to...</option>
                            {otherEducators.map(oe => (
                              <option key={oe.id} value={oe.id}>{oe.name}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TESTS */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{selectedTestSlugs.length} test(s) selected</span>
            <div className="flex items-center gap-2">
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value ? Number(e.target.value) : '')}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">Select target educator/admin...</option>
                {otherEducators.map(oe => (
                  <option key={oe.id} value={oe.id}>{oe.name} ({oe.email})</option>
                ))}
              </select>
              <button
                onClick={handleBulkTransferTests}
                disabled={transferring || selectedTestSlugs.length === 0 || !targetUserId}
                className="px-3 py-1.5 rounded-lg bg-[#061426] text-[#F0C45B] hover:bg-[#0c2340] font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Tests
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                <tr>
                  <th className="p-3 text-center w-10">
                    <input 
                      type="checkbox"
                      checked={tests.length > 0 && selectedTestSlugs.length === tests.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTestSlugs(tests.map(t => t.slug));
                        else setSelectedTestSlugs([]);
                      }}
                    />
                  </th>
                  <th className="text-left p-3">Test Series</th>
                  <th className="text-center p-3">Category</th>
                  <th className="text-center p-3">Price</th>
                  <th className="text-center p-3">Review Status</th>
                  <th className="text-center p-3">Published</th>
                  <th className="text-right p-3">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D8BE]/40">
                {tests.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">No test series owned by this educator.</td></tr>
                ) : (
                  tests.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTestSlugs.includes(t.slug)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTestSlugs([...selectedTestSlugs, t.slug]);
                            else setSelectedTestSlugs(selectedTestSlugs.filter(s => s !== t.slug));
                          }}
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{t.title}</td>
                      <td className="p-3 text-center text-slate-500 uppercase">{t.category}</td>
                      <td className="p-3 text-center font-bold text-slate-800">₹{t.price}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.review_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          t.review_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          t.review_status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {t.review_status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {t.is_published ? (
                          <span className="text-emerald-700 font-bold">Published</span>
                        ) : (
                          <span className="text-slate-400">Draft</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {t.review_status === 'pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleReview('test', t.slug, 'approve')}
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview('test', t.slug, 'reject')}
                              className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RESOURCES */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{selectedResourceSlugs.length} resource(s) selected</span>
            <div className="flex items-center gap-2">
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value ? Number(e.target.value) : '')}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">Select target educator/admin...</option>
                {otherEducators.map(oe => (
                  <option key={oe.id} value={oe.id}>{oe.name} ({oe.email})</option>
                ))}
              </select>
              <button
                onClick={handleBulkTransferResources}
                disabled={transferring || selectedResourceSlugs.length === 0 || !targetUserId}
                className="px-3 py-1.5 rounded-lg bg-[#061426] text-[#F0C45B] hover:bg-[#0c2340] font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Resources
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                <tr>
                  <th className="p-3 text-center w-10">
                    <input 
                      type="checkbox"
                      checked={resources.length > 0 && selectedResourceSlugs.length === resources.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedResourceSlugs(resources.map(r => r.slug));
                        else setSelectedResourceSlugs([]);
                      }}
                    />
                  </th>
                  <th className="text-left p-3">Resource Title</th>
                  <th className="text-center p-3">Type</th>
                  <th className="text-center p-3">Category</th>
                  <th className="text-center p-3">Review Status</th>
                  <th className="text-center p-3">Published</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D8BE]/40">
                {resources.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">No resources created by this educator.</td></tr>
                ) : (
                  resources.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedResourceSlugs.includes(r.slug)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedResourceSlugs([...selectedResourceSlugs, r.slug]);
                            else setSelectedResourceSlugs(selectedResourceSlugs.filter(s => s !== r.slug));
                          }}
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{r.title}</td>
                      <td className="p-3 text-center text-slate-500 uppercase">{r.file_type}</td>
                      <td className="p-3 text-center text-slate-500 uppercase">{r.category}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.review_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          r.review_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          r.review_status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {r.review_status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {r.is_published ? (
                          <span className="text-emerald-700 font-bold">Published</span>
                        ) : (
                          <span className="text-slate-400">Draft</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {r.review_status === 'pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleReview('resource', r.slug, 'approve')}
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview('resource', r.slug, 'reject')}
                              className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                <tr>
                  <th className="text-left p-4">Student Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-right p-4">Enrolled / Attempt Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D8BE]/40">
                {students.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-400">No students currently enrolled in this educator's courses or tests.</td></tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-900">{s.name}</td>
                      <td className="p-4 text-slate-600">{s.email}</td>
                      <td className="p-4 text-right text-slate-500">{s.date_joined || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E3D8BE] p-4 shadow-sm">
            <div className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No recent recorded audit actions for this educator.</p>
              ) : (
                activity.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {log.actor_name} • <span className="uppercase text-[10px] text-[#D9A52E] font-bold">{log.action}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp || log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-600">
                      Target: <span className="font-semibold">{log.object_type}</span> {log.object_title && `"${log.object_title}"`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-[#E3D8BE] p-6 shadow-sm max-w-2xl">
          <form onSubmit={handleSaveFaculty} className="space-y-4 text-xs">
            <h3 className="font-serif font-bold text-sm text-[#061426] mb-2">Edit Public Faculty Directory Profile</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academic Role / Designation</label>
                <input
                  type="text"
                  value={facultyForm.role}
                  onChange={(e) => setFacultyForm({ ...facultyForm, role: e.target.value })}
                  placeholder="e.g. Senior Faculty - Mining Engineering"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  value={facultyForm.specialization}
                  onChange={(e) => setFacultyForm({ ...facultyForm, specialization: e.target.value })}
                  placeholder="e.g. Mine Ventilation & Safety"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Qualification</label>
                <input
                  type="text"
                  value={facultyForm.qualification}
                  onChange={(e) => setFacultyForm({ ...facultyForm, qualification: e.target.value })}
                  placeholder="e.g. M.Tech (IIT ISM Dhanbad)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teaching Experience</label>
                <input
                  type="text"
                  value={facultyForm.experience}
                  onChange={(e) => setFacultyForm({ ...facultyForm, experience: e.target.value })}
                  placeholder="e.g. 10+ Years"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Profile Image URL</label>
                <input
                  type="url"
                  value={facultyForm.image}
                  onChange={(e) => setFacultyForm({ ...facultyForm, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Biography</label>
              <textarea
                rows={4}
                value={facultyForm.bio}
                onChange={(e) => setFacultyForm({ ...facultyForm, bio: e.target.value })}
                placeholder="Detailed educator biography displayed on student-facing faculty pages..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="faculty-active"
                checked={facultyForm.is_active}
                onChange={(e) => setFacultyForm({ ...facultyForm, is_active: e.target.checked })}
                className="rounded border-slate-300 text-[#D9A52E] focus:ring-[#D9A52E]"
              />
              <label htmlFor="faculty-active" className="text-slate-700 font-semibold cursor-pointer">
                Publicly Active (Display profile on public faculty page)
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingFaculty}
                className="px-5 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
              >
                {savingFaculty && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Faculty Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default AdminEducatorDetailPage;
