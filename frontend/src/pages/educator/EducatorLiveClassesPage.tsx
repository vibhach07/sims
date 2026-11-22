import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LiveAPI,
  CoursesAPI,
  APILiveClass,
  APICourse,
  APICourseDetail,
} from '../../services/api';
import {
  Radio,
  PlusCircle,
  Play,
  Square,
  Video,
  Clock,
  Calendar,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  FilePlus,
} from 'lucide-react';

export const EducatorLiveClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<APILiveClass[]>([]);
  const [courses, setCourses] = useState<APICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Help box accordion
  const [showHelp, setShowHelp] = useState(false);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<APILiveClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '' as string | number,
    scheduled_start: '',
    scheduled_end: '',
    provider: 'youtube' as 'youtube' | 'vimeo' | 'zoom' | 'meet' | 'other',
    stream_url: '',
    access: 'course_students' as 'course_students' | 'free_for_all' | 'logged_in',
  });

  // Convert to lecture modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [targetClass, setTargetClass] = useState<APILiveClass | null>(null);
  const [courseModules, setCourseModules] = useState<any[]>([]);
  const [convertData, setConvertData] = useState({
    module_id: '',
    title: '',
    summary: '',
    recording_url: '',
  });
  const [converting, setConverting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [liveData, courseData] = await Promise.all([
        LiveAPI.manageList(),
        CoursesAPI.list({ my_courses: true }).catch(() => [] as APICourse[]),
      ]);
      setClasses(liveData);
      setCourses(courseData);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load live sessions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingClass(null);
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const inTwoHours = new Date(now.getTime() + 120 * 60 * 1000);

    const toLocalISO = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    setFormData({
      title: '',
      description: '',
      course: courses.length > 0 ? courses[0].id : '',
      scheduled_start: toLocalISO(inOneHour),
      scheduled_end: toLocalISO(inTwoHours),
      provider: 'youtube',
      stream_url: '',
      access: 'course_students',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: APILiveClass) => {
    setEditingClass(cls);
    const toLocalISO = (isoStr: string) => {
      const d = new Date(isoStr);
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    setFormData({
      title: cls.title,
      description: cls.description,
      course: cls.course || '',
      scheduled_start: toLocalISO(cls.scheduled_start),
      scheduled_end: toLocalISO(cls.scheduled_end),
      provider: cls.provider,
      stream_url: cls.stream_url || '',
      access: cls.access,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        course: formData.course ? Number(formData.course) : null,
        scheduled_start: new Date(formData.scheduled_start).toISOString(),
        scheduled_end: new Date(formData.scheduled_end).toISOString(),
        provider: formData.provider,
        stream_url: formData.stream_url,
        access: formData.access,
      };

      if (editingClass) {
        await LiveAPI.update(editingClass.id, payload);
        setMsg({ type: 'success', text: 'Live class updated successfully.' });
      } else {
        await LiveAPI.create(payload);
        setMsg({ type: 'success', text: 'Live class scheduled successfully.' });
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save live class.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoLive = async (cls: APILiveClass) => {
    let streamUrl = cls.stream_url;
    if (!streamUrl) {
      const input = prompt('Enter your live stream URL (YouTube / Vimeo / Zoom / Meet):');
      if (!input) return;
      streamUrl = input.trim();
    }

    try {
      await LiveAPI.goLive(cls.id, streamUrl);
      setMsg({ type: 'success', text: `Session "${cls.title}" is now LIVE! Notifications sent to enrolled students.` });
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to go live.' });
    }
  };

  const handleEndClass = async (cls: APILiveClass) => {
    const recPrompt = prompt('Session ending. Enter recording URL if already available (optional):');
    try {
      await LiveAPI.end(cls.id, recPrompt ? recPrompt.trim() : undefined);
      setMsg({ type: 'success', text: `Class "${cls.title}" ended.` });
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to end live session.' });
    }
  };

  const handleDelete = async (cls: APILiveClass) => {
    if (!confirm(`Delete live class "${cls.title}"?`)) return;
    try {
      await LiveAPI.delete(cls.id);
      setMsg({ type: 'success', text: 'Live class removed.' });
      setClasses(prev => prev.filter(c => c.id !== cls.id));
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete live class.' });
    }
  };

  const handleOpenConvert = async (cls: APILiveClass) => {
    setTargetClass(cls);
    setConvertData({
      module_id: '',
      title: `[Live Class Archive] ${cls.title}`,
      summary: cls.description || '',
      recording_url: cls.recording_url || cls.stream_url || '',
    });

    // Fetch modules for this course
    if (cls.course_slug) {
      try {
        const fullCourse = await CoursesAPI.detail(cls.course_slug);
        setCourseModules(fullCourse.curriculum || []);
        if (fullCourse.curriculum && fullCourse.curriculum.length > 0) {
          setConvertData(p => ({ ...p, module_id: String(fullCourse.curriculum[0].id) }));
        }
      } catch {
        setCourseModules([]);
      }
    }
    setConvertModalOpen(true);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClass || !convertData.module_id) return;
    setConverting(true);
    try {
      await LiveAPI.convertToLecture(targetClass.id, {
        module_id: Number(convertData.module_id),
        title: convertData.title,
        summary: convertData.summary,
        recording_url: convertData.recording_url,
      });
      setMsg({ type: 'success', text: 'Live session successfully converted into course lecture!' });
      setConvertModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to convert to course lecture.' });
    } finally {
      setConverting(false);
    }
  };

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
        <p className="text-sm text-[#687386]">Loading live classes studio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">Live Classes Studio</h1>
          <p className="text-sm text-[#687386] mt-1">
            Broadcast interactive lectures, start live YouTube/Zoom rooms, and archive recordings to course modules.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" /> Schedule Live Class
        </button>
      </div>

      {/* Notifications */}
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

      {/* Collapsible Help Card */}
      <div className="bg-[#F8F4EA] border border-[#E3D8BE] rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-[#061426]"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#A87519]" />
            <span>How to setup an Unlisted YouTube Live Broadcast (Zero Server Cost)</span>
          </div>
          {showHelp ? <ChevronUp className="w-4 h-4 text-[#A87519]" /> : <ChevronDown className="w-4 h-4 text-[#A87519]" />}
        </button>

        {showHelp && (
          <div className="px-5 pb-5 text-xs text-[#687386] space-y-3 border-t border-[#E3D8BE]/50 pt-3">
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 font-medium">
              <strong>Notice for first-time broadcasters:</strong> YouTube live streaming activation can take up to <strong>24 hours</strong> on a new channel. Please enable live streaming in YouTube Studio well in advance of your first class.
            </div>
            <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
              <li>Open <strong>YouTube Studio</strong> (studio.youtube.com) and click <strong>Go Live</strong> in top right.</li>
              <li>Choose <strong>Streaming Software</strong> (OBS/Webcam) or schedule for later.</li>
              <li>Under <strong>Visibility</strong>, select <strong>Unlisted</strong>. This ensures only students on SIMS Raipur platform can view the session.</li>
              <li>Copy the generated watch link (e.g. <code>https://youtube.com/live/xxx</code> or <code>https://youtu.be/xxx</code>) and paste it into the Stream URL field below.</li>
              <li>When class begins, start your stream in OBS, then click <strong>"Go Live"</strong> here to notify all enrolled students.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Classes List */}
      {classes.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-[#E3D8BE] p-8 space-y-3">
          <Video className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-[#061426]">No Live Classes Scheduled</h3>
          <p className="text-xs text-[#687386]">
            Click "Schedule Live Class" above to set up your first online interactive session.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                cls.status === 'live' ? 'border-rose-400 ring-2 ring-rose-100' : 'border-[#E3D8BE]'
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {cls.status === 'live' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      LIVE STREAMING
                    </span>
                  ) : cls.status === 'scheduled' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#A87519] text-[10px] font-bold">
                      SCHEDULED
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                      ENDED
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[#687386] uppercase bg-slate-50 px-2 py-0.5 rounded">
                    {cls.provider}
                  </span>
                  <span className="text-[10px] text-[#A87519] font-semibold bg-amber-50/50 px-2 py-0.5 rounded">
                    {cls.access === 'course_students' ? 'Enrolled Students' : cls.access === 'free_for_all' ? 'Public' : 'Logged-In'}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-base text-[#061426] truncate">
                  {cls.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#687386]">
                  {cls.course_title && (
                    <div className="flex items-center gap-1 text-[#A87519]">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{cls.course_title}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatIST(cls.scheduled_start)} - {formatIST(cls.scheduled_end)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                {cls.status === 'scheduled' && (
                  <button
                    onClick={() => handleGoLive(cls)}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Go Live</span>
                  </button>
                )}

                {cls.status === 'live' && (
                  <button
                    onClick={() => handleEndClass(cls)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-current text-rose-500" />
                    <span>End Class</span>
                  </button>
                )}

                {cls.status === 'ended' && cls.course && (
                  <button
                    onClick={() => handleOpenConvert(cls)}
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Add to Course as Lecture</span>
                  </button>
                )}

                <Link
                  to={`/student/live/${cls.id}`}
                  className="p-2 rounded-xl border border-[#E3D8BE] hover:bg-[#F8F4EA] text-[#061426] transition"
                  title="Preview Student Classroom"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => handleOpenEdit(cls)}
                  className="p-2 rounded-xl border border-[#E3D8BE] hover:bg-[#F8F4EA] text-[#061426] transition"
                  title="Edit details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(cls)}
                  className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 border-2 border-[#E3D8BE] space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3D8BE]">
              <h3 className="font-serif font-bold text-xl text-[#061426]">
                {editingClass ? 'Edit Live Session' : 'Schedule Live Class'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#263347] mb-1">Classroom Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masterclass: Thermodynamics & Fluid Mechanics"
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#263347] mb-1">Associated Course</label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData(p => ({ ...p, course: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE] bg-white focus:outline-none focus:border-[#D9A52E]"
                >
                  <option value="">Standalone / General Academic Stream</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#263347] mb-1">Start Time (IST) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_start}
                    onChange={(e) => setFormData(p => ({ ...p, scheduled_start: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-[#E3D8BE]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#263347] mb-1">End Time (IST) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_end}
                    onChange={(e) => setFormData(p => ({ ...p, scheduled_end: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-[#E3D8BE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#263347] mb-1">Streaming Provider *</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData(p => ({ ...p, provider: e.target.value as any }))}
                    className="w-full p-2 rounded-lg border border-[#E3D8BE] bg-white"
                  >
                    <option value="youtube">YouTube Live (Recommended)</option>
                    <option value="vimeo">Vimeo Live</option>
                    <option value="zoom">Zoom Meeting</option>
                    <option value="meet">Google Meet</option>
                    <option value="other">Other Stream</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#263347] mb-1">Access Gate *</label>
                  <select
                    value={formData.access}
                    onChange={(e) => setFormData(p => ({ ...p, access: e.target.value as any }))}
                    className="w-full p-2 rounded-lg border border-[#E3D8BE] bg-white"
                  >
                    <option value="course_students">Enrolled Course Students</option>
                    <option value="free_for_all">Free for All (Public)</option>
                    <option value="logged_in">All Logged-in Users</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#263347] mb-1">Stream / Meeting URL (HTTPS) *</label>
                <input
                  type="url"
                  required
                  placeholder={
                    formData.provider === 'youtube'
                      ? 'https://youtube.com/live/xxx or https://youtu.be/xxx'
                      : formData.provider === 'zoom'
                      ? 'https://zoom.us/j/xxx'
                      : 'https://meet.google.com/xxx'
                  }
                  value={formData.stream_url}
                  onChange={(e) => setFormData(p => ({ ...p, stream_url: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#263347] mb-1">Session Agenda & Notes</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Key derivation topics, formula review, or problem numbers to be solved..."
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E3D8BE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#D9A52E] font-bold text-[#061426] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingClass ? 'Save Changes' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Lecture Modal */}
      {convertModalOpen && targetClass && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 border-2 border-[#E3D8BE] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3D8BE]">
              <h3 className="font-serif font-bold text-xl text-[#061426]">
                Add to Course as Lecture
              </h3>
              <button onClick={() => setConvertModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#263347] mb-1">Target Module in Curriculum *</label>
                <select
                  required
                  value={convertData.module_id}
                  onChange={(e) => setConvertData(p => ({ ...p, module_id: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE] bg-white"
                >
                  <option value="">Select Curriculum Module</option>
                  {courseModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#263347] mb-1">Lecture Title *</label>
                <input
                  type="text"
                  required
                  value={convertData.title}
                  onChange={(e) => setConvertData(p => ({ ...p, title: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#263347] mb-1">Recording URL *</label>
                <input
                  type="url"
                  required
                  value={convertData.recording_url}
                  onChange={(e) => setConvertData(p => ({ ...p, recording_url: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#263347] mb-1">Summary / Notes</label>
                <textarea
                  rows={3}
                  value={convertData.summary}
                  onChange={(e) => setConvertData(p => ({ ...p, summary: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[#E3D8BE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E3D8BE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save as Course Lecture</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducatorLiveClassesPage;
