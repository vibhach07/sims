import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LiveAPI, APILiveClass } from '../../services/api';
import {
  Radio,
  Clock,
  Calendar,
  BookOpen,
  User,
  Filter,
  Play,
  Square,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const AdminLiveClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<APILiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const data = await LiveAPI.manageList();
      setClasses(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load live sessions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleForceEnd = async (cls: APILiveClass) => {
    if (!confirm(`Force-end live session "${cls.title}"?`)) return;
    try {
      await LiveAPI.end(cls.id);
      setMsg({ type: 'success', text: `Session "${cls.title}" marked as ended.` });
      await fetchClasses();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to end live class.' });
    }
  };

  const handleCancel = async (cls: APILiveClass) => {
    if (!confirm(`Cancel live session "${cls.title}"?`)) return;
    try {
      await LiveAPI.update(cls.id, { status: 'cancelled' });
      setMsg({ type: 'success', text: `Session "${cls.title}" cancelled.` });
      await fetchClasses();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to cancel live class.' });
    }
  };

  const handleDelete = async (cls: APILiveClass) => {
    if (!confirm(`Permanently delete "${cls.title}"?`)) return;
    try {
      await LiveAPI.delete(cls.id);
      setMsg({ type: 'success', text: 'Live class permanently deleted.' });
      setClasses(prev => prev.filter(c => c.id !== cls.id));
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete record.' });
    }
  };

  const filtered = classes.filter((cls) => {
    if (statusFilter !== 'all' && cls.status !== statusFilter) return false;
    if (providerFilter !== 'all' && cls.provider !== providerFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = cls.title.toLowerCase().includes(q);
      const matchEd = (cls.educator_name || '').toLowerCase().includes(q);
      const matchCourse = (cls.course_title || '').toLowerCase().includes(q);
      return matchTitle || matchEd || matchCourse;
    }
    return true;
  });

  const formatIST = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading all institute live classes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif font-bold text-3xl text-[#061426]">Live Classes Control Center</h1>
        <p className="text-sm text-[#687386] mt-1">
          Monitor all scheduled, active and archived live broadcasts across SIMS faculties.
        </p>
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3D8BE] flex flex-col sm:flex-row gap-3 items-center justify-between text-xs shadow-sm">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by class title, faculty, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 rounded-lg border border-[#E3D8BE] bg-white text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="live">Live Now</option>
            <option value="scheduled">Scheduled</option>
            <option value="ended">Ended</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="p-2.5 rounded-lg border border-[#E3D8BE] bg-white text-xs font-semibold"
          >
            <option value="all">All Providers</option>
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="zoom">Zoom</option>
            <option value="meet">Meet</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F4EA] border-b border-[#E3D8BE] text-[#061426] font-bold">
              <tr>
                <th className="p-3.5">Session Details</th>
                <th className="p-3.5">Faculty</th>
                <th className="p-3.5">Schedule (IST)</th>
                <th className="p-3.5">Provider & Gate</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 max-w-xs">
                    <div className="font-bold text-[#061426] truncate">{cls.title}</div>
                    <div className="text-[11px] text-[#A87519] truncate">{cls.course_title || 'General Stream'}</div>
                  </td>

                  <td className="p-3.5 whitespace-nowrap">
                    <span className="font-semibold text-[#061426]">{cls.educator_name}</span>
                  </td>

                  <td className="p-3.5 whitespace-nowrap text-[#687386]">
                    <div>{formatIST(cls.scheduled_start)}</div>
                  </td>

                  <td className="p-3.5 whitespace-nowrap">
                    <div className="font-mono uppercase text-[10px] text-slate-700 font-bold">{cls.provider}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{cls.access.replace('_', ' ')}</div>
                  </td>

                  <td className="p-3.5 whitespace-nowrap">
                    {cls.status === 'live' ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px] flex items-center gap-1 w-fit animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        LIVE
                      </span>
                    ) : cls.status === 'scheduled' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#A87519] font-bold text-[10px]">
                        SCHEDULED
                      </span>
                    ) : cls.status === 'cancelled' ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-bold text-[10px]">
                        CANCELLED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        ENDED
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/student/live/${cls.id}`}
                        className="p-1.5 rounded-lg border border-[#E3D8BE] hover:bg-[#F8F4EA] text-[#061426]"
                        title="Open Classroom"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      {cls.status === 'live' && (
                        <button
                          onClick={() => handleForceEnd(cls)}
                          className="px-2 py-1 rounded bg-slate-900 text-white font-bold text-[10px]"
                          title="Force End"
                        >
                          Force End
                        </button>
                      )}

                      {cls.status === 'scheduled' && (
                        <button
                          onClick={() => handleCancel(cls)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                          title="Cancel Session"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(cls)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveClassesPage;
