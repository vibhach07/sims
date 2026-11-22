import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AdminEducatorsAPI, AdminApprovalsAPI, AuditAPI, 
  APIAdminEducatorItem, APIEducatorApplication, APIApprovalsQueue, APIAuditLog 
} from '../../services/api';
import { 
  Users, FileText, CheckCircle2, Clock, XCircle, AlertCircle, 
  Loader2, UserPlus, ShieldAlert, ShieldCheck, Mail, ArrowUpRight, 
  Search, ExternalLink, RefreshCw, Send, Check, X, Filter
} from 'lucide-react';

export const AdminEducatorsControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'educators' | 'applications' | 'approvals' | 'activity'>('educators');

  // Educators state
  const [educators, setEducators] = useState<APIAdminEducatorItem[]>([]);
  const [loadingEducators, setLoadingEducators] = useState(false);
  const [educatorSearch, setEducatorSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEducatorName, setNewEducatorName] = useState('');
  const [newEducatorEmail, setNewEducatorEmail] = useState('');
  const [isAddingEducator, setIsAddingEducator] = useState(false);

  // Applications state
  const [applications, setApplications] = useState<APIEducatorApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [rejectingAppId, setRejectingAppId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Approvals queue state
  const [approvals, setApprovals] = useState<APIApprovalsQueue | null>(null);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<{ id: number | string; type: 'course' | 'test' | 'resource' } | null>(null);
  const [itemRejectNote, setItemRejectNote] = useState('');

  // Activity audit state
  const [auditLogs, setAuditLogs] = useState<APIAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilterType, setAuditFilterType] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch functions
  const loadEducators = async () => {
    setLoadingEducators(true);
    try {
      const data = await AdminEducatorsAPI.list();
      setEducators(data);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load educators list.' });
    } finally {
      setLoadingEducators(false);
    }
  };

  const loadApplications = async () => {
    setLoadingApps(true);
    try {
      const statusParam = appStatusFilter === 'all' ? undefined : appStatusFilter;
      const data = await AdminEducatorsAPI.listApplications(statusParam);
      setApplications(data);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load educator applications.' });
    } finally {
      setLoadingApps(false);
    }
  };

  const loadApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const data = await AdminApprovalsAPI.getQueue();
      setApprovals(data);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load approvals queue.' });
    } finally {
      setLoadingApprovals(false);
    }
  };

  const loadAudit = async () => {
    setLoadingAudit(true);
    try {
      const params: Record<string, string> = {};
      if (auditFilterType) params.type = auditFilterType;
      if (auditFilterAction) params.action = auditFilterAction;
      const data = await AuditAPI.adminAudit(params);
      setAuditLogs(data.results || []);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load audit feed.' });
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'educators') loadEducators();
    if (activeTab === 'applications') loadApplications();
    if (activeTab === 'approvals') loadApprovals();
    if (activeTab === 'activity') loadAudit();
  }, [activeTab, appStatusFilter, auditFilterType, auditFilterAction]);

  // Educator actions
  const handleAddEducator = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingEducator(true);
    try {
      await AdminEducatorsAPI.add({ name: newEducatorName, email: newEducatorEmail });
      setMsg({ type: 'success', text: `Educator account created for ${newEducatorEmail} and invite sent.` });
      setAddModalOpen(false);
      setNewEducatorName('');
      setNewEducatorEmail('');
      await loadEducators();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to add educator.' });
    } finally {
      setIsAddingEducator(false);
    }
  };

  const handleAction = async (id: number, action: 'suspend' | 'reactivate' | 'remove' | 'sendInvite') => {
    try {
      if (action === 'suspend') await AdminEducatorsAPI.suspend(id);
      if (action === 'reactivate') await AdminEducatorsAPI.reactivate(id);
      if (action === 'remove') await AdminEducatorsAPI.remove(id);
      if (action === 'sendInvite') await AdminEducatorsAPI.sendInvite(id);
      setMsg({ type: 'success', text: `Action ${action} completed successfully.` });
      await loadEducators();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || `Failed to perform ${action}.` });
    }
  };

  // Application actions
  const handleApproveApp = async (id: number) => {
    try {
      await AdminEducatorsAPI.approveApplication(id);
      setMsg({ type: 'success', text: 'Application approved. Educator user created & set-password email sent.' });
      await loadApplications();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to approve application.' });
    }
  };

  const handleRejectApp = async (id: number) => {
    if (!rejectNote.trim()) {
      alert('Rejection note is required.');
      return;
    }
    try {
      await AdminEducatorsAPI.rejectApplication(id, rejectNote);
      setMsg({ type: 'success', text: 'Application rejected.' });
      setRejectingAppId(null);
      setRejectNote('');
      await loadApplications();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to reject application.' });
    }
  };

  // Review decisions
  const handleReviewDecision = async (
    type: 'course' | 'test' | 'resource',
    idOrSlug: number | string,
    decision: 'approve' | 'reject',
    note?: string
  ) => {
    try {
      if (type === 'course') await AdminApprovalsAPI.reviewCourse(Number(idOrSlug), decision, note);
      if (type === 'test') await AdminApprovalsAPI.reviewTest(String(idOrSlug), decision, note);
      if (type === 'resource') await AdminApprovalsAPI.reviewResource(String(idOrSlug), decision, note);
      setMsg({ type: 'success', text: `${type.toUpperCase()} marked as ${decision}.` });
      setRejectingItem(null);
      setItemRejectNote('');
      await loadApprovals();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || `Failed to review ${type}.` });
    }
  };

  const filteredEducators = educators.filter((ed) =>
    ed.name.toLowerCase().includes(educatorSearch.toLowerCase()) ||
    ed.email.toLowerCase().includes(educatorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">Educators Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Godfather command dashboard: Manage educator staff, review applications, approve content queues, and inspect audit trails.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
        >
          <UserPlus className="w-4 h-4" /> Add Educator Directly
        </button>
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
      <div className="flex items-center gap-2 border-b border-[#E3D8BE] pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('educators')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'educators'
              ? 'bg-[#061426] text-[#F0C45B] font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Educators Roster ({educators.length})
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'applications'
              ? 'bg-[#061426] text-[#F0C45B] font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Applications
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'approvals'
              ? 'bg-[#061426] text-[#F0C45B] font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Approvals {approvals && approvals.total_pending > 0 && `(${approvals.total_pending})`}
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'activity'
              ? 'bg-[#061426] text-[#F0C45B] font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Global Activity Feed
        </button>
      </div>

      {/* TAB 1: EDUCATORS */}
      {activeTab === 'educators' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search educators by name or email..."
                value={educatorSearch}
                onChange={(e) => setEducatorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                  <tr>
                    <th className="text-left p-4">Educator</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-center p-4">Courses</th>
                    <th className="text-center p-4">Tests</th>
                    <th className="text-center p-4">Pending</th>
                    <th className="text-center p-4">Students</th>
                    <th className="text-left p-4">Last Login</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D8BE]/40">
                  {loadingEducators ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">Loading educators...</td>
                    </tr>
                  ) : filteredEducators.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">No educators found.</td>
                    </tr>
                  ) : (
                    filteredEducators.map((ed) => (
                      <tr key={ed.id} className="hover:bg-[#FFF9ED] transition">
                        <td className="p-4">
                          <div className="font-semibold text-slate-900 text-sm">{ed.name}</div>
                          <div className="text-[11px] text-slate-400">{ed.email}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ed.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {ed.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800">{ed.courses_count ?? ed.counts?.courses ?? 0}</td>
                        <td className="p-4 text-center font-bold text-slate-800">{ed.tests_count ?? ed.counts?.tests ?? 0}</td>
                        <td className="p-4 text-center">
                          {(ed.pending_count ?? ed.counts?.pending_items ?? 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              {ed.pending_count ?? ed.counts?.pending_items} pending
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800">{ed.students_count ?? ed.counts?.students ?? 0}</td>
                        <td className="p-4 text-slate-500">
                          {ed.last_login ? new Date(ed.last_login).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/admin/educators/${ed.id}`}
                              className="px-2.5 py-1 rounded bg-[#061426] text-[#F0C45B] hover:bg-[#0c2340] font-semibold text-[10px] inline-flex items-center gap-1"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleAction(ed.id, 'sendInvite')}
                              className="p-1.5 rounded bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                              title="Send Set-Password Invite"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            {ed.is_active ? (
                              <button
                                onClick={() => handleAction(ed.id, 'suspend')}
                                className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold text-[10px]"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(ed.id, 'reactivate')}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-[10px]"
                              >
                                Reactivate
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Demote ${ed.name} to student? Content ownership will remain for transfer.`)) {
                                  handleAction(ed.id, 'remove');
                                }
                              }}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-semibold"
                            >
                              Demote
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
      )}

      {/* TAB 2: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Filter Status:</span>
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                  <tr>
                    <th className="text-left p-4">Applicant</th>
                    <th className="text-left p-4">Subjects & Qualification</th>
                    <th className="text-left p-4">Demo & Resume</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-right p-4">Review Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D8BE]/40">
                  {loadingApps ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">Loading applications...</td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">No educator applications found.</td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id} className="hover:bg-[#FFF9ED] transition">
                        <td className="p-4">
                          <div className="font-semibold text-slate-900 text-sm">{app.name}</div>
                          <div className="text-[11px] text-slate-400">{app.email}</div>
                          <div className="text-[11px] text-slate-500">{app.phone}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">{app.subjects}</div>
                          <div className="text-[11px] text-slate-500">{app.qualification} ({app.experience})</div>
                        </td>
                        <td className="p-4 space-y-1">
                          <a
                            href={app.demo_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#A87519] hover:underline font-semibold block"
                          >
                            Demo Lecture <ExternalLink className="w-3 h-3" />
                          </a>
                          {app.resume_link && (
                            <a
                              href={app.resume_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-500 hover:underline block"
                            >
                              Resume / CV <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                            app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            app.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {app.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveApp(app.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingAppId(app.id)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[11px]"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reject Note Modal */}
          {rejectingAppId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
                <h3 className="font-serif font-bold text-lg text-slate-900">Rejection Note Required</h3>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain reason for rejection..."
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => { setRejectingAppId(null); setRejectNote(''); }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRejectApp(rejectingAppId)}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PENDING APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {loadingApprovals ? (
            <div className="py-20 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
              <p className="text-xs text-slate-400">Loading pending queues...</p>
            </div>
          ) : !approvals || approvals.total_pending === 0 ? (
            <div className="bg-white p-16 rounded-2xl border border-[#E3D8BE] text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="font-serif font-bold text-lg text-slate-900">All Queues Clear</div>
              <p className="text-xs text-slate-500">No courses, tests, or study materials currently awaiting administrator approval.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Courses Queue */}
              {approvals.courses.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E3D8BE] p-5 space-y-3 shadow-sm">
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Courses Awaiting Approval ({approvals.courses.length})
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {approvals.courses.map((c) => (
                      <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{c.title}</div>
                          <div className="text-slate-500 mt-0.5">
                            Educator: <span className="font-semibold text-slate-700">{c.created_by_name}</span> ({c.created_by})
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewDecision('course', c.id, 'approve')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                          >
                            Approve (Go Live)
                          </button>
                          <button
                            onClick={() => setRejectingItem({ id: c.id, type: 'course' })}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[11px]"
                          >
                            Reject with Note
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tests Queue */}
              {approvals.tests.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E3D8BE] p-5 space-y-3 shadow-sm">
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Test Series Awaiting Approval ({approvals.tests.length})
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {approvals.tests.map((t) => (
                      <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{t.title}</div>
                          <div className="text-slate-500 mt-0.5">
                            Educator: <span className="font-semibold text-slate-700">{t.created_by_name}</span> ({t.created_by})
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewDecision('test', t.slug, 'approve')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                          >
                            Approve (Go Live)
                          </button>
                          <button
                            onClick={() => setRejectingItem({ id: t.slug, type: 'test' })}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[11px]"
                          >
                            Reject with Note
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources Queue */}
              {approvals.resources.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E3D8BE] p-5 space-y-3 shadow-sm">
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Study Materials Awaiting Approval ({approvals.resources.length})
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {approvals.resources.map((r) => (
                      <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{r.title}</div>
                          <div className="text-slate-500 mt-0.5">
                            Educator: <span className="font-semibold text-slate-700">{r.created_by_name}</span> ({r.created_by})
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewDecision('resource', r.slug, 'approve')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                          >
                            Approve (Go Live)
                          </button>
                          <button
                            onClick={() => setRejectingItem({ id: r.slug, type: 'resource' })}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[11px]"
                          >
                            Reject with Note
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reject Content Modal */}
          {rejectingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  Reject {rejectingItem.type.toUpperCase()} with Revisions Note
                </h3>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain what needs fixing (curriculum gaps, formatting, explanation details)..."
                  value={itemRejectNote}
                  onChange={(e) => setItemRejectNote(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => { setRejectingItem(null); setItemRejectNote(''); }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!itemRejectNote.trim()) return alert('Note required.');
                      handleReviewDecision(rejectingItem.type, rejectingItem.id, 'reject', itemRejectNote);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                  >
                    Send Rejection Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GLOBAL ACTIVITY FEED */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>
            <select
              value={auditFilterType}
              onChange={(e) => setAuditFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
            >
              <option value="">All Object Types</option>
              <option value="course">Course</option>
              <option value="test_series">Test Series</option>
              <option value="study_resource">Study Resource</option>
              <option value="educator_application">Educator Application</option>
              <option value="user">User</option>
            </select>

            <select
              value={auditFilterAction}
              onChange={(e) => setAuditFilterAction(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="submit_review">Submit Review</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="transfer_ownership">Transfer Ownership</option>
              <option value="suspend">Suspend</option>
              <option value="reactivate">Reactivate</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
            {loadingAudit ? (
              <div className="py-20 text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
                <p className="text-xs text-slate-400">Loading audit feed...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-500">No audit logs matching filters.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-50 transition">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {log.object_type.replace('_', ' ')}: {log.object_title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          by <strong className="text-slate-700">{log.actor_name}</strong> ({log.actor_role})
                        </span>
                      </div>

                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-mono text-[11px] text-slate-600">
                          {Object.entries(log.changes).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="font-semibold text-slate-700">{k}:</span>{' '}
                              {Array.isArray(v) && v.length === 2 ? (
                                <span>
                                  <span className="text-rose-600 line-through">{String(v[0] ?? 'empty')}</span>
                                  {' → '}
                                  <span className="text-emerald-700 font-bold">{String(v[1] ?? 'empty')}</span>
                                </span>
                              ) : (
                                <span>{JSON.stringify(v)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[10px] text-slate-400 flex-shrink-0">
                      <div>{new Date(log.created_at).toLocaleDateString()}</div>
                      <div>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Add Educator Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-serif font-bold text-lg text-slate-900">Direct Add Educator</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEducator} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newEducatorName}
                  onChange={(e) => setNewEducatorName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEducatorEmail}
                  onChange={(e) => setNewEducatorEmail(e.target.value)}
                  placeholder="rajesh@simsraipuredu.in"
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px]">
                Account will be created with role Educator. A set-password invite link will automatically be dispatched to this email.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingEducator}
                  className="px-4 py-1.5 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold shadow flex items-center gap-1.5"
                >
                  {isAddingEducator && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Educator & Send Invite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEducatorsControlPage;
