import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LiveAPI, APILiveClass } from '../../services/api';
import {
  Radio,
  Clock,
  Calendar,
  Lock,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Video,
  Download,
  AlertCircle,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export const StudentLiveClassroomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [liveClass, setLiveClass] = useState<APILiveClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  const fetchClass = async () => {
    if (!id) return;
    try {
      const data = await LiveAPI.detail(Number(id));
      setLiveClass(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load live class.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClass();
    // Auto-refresh polling every 20 seconds
    const interval = setInterval(fetchClass, 20000);
    return () => clearInterval(interval);
  }, [id]);

  // Countdown timer calculation
  useEffect(() => {
    if (!liveClass || liveClass.status !== 'scheduled') {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = new Date(liveClass.scheduled_start).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        // Status may have changed to live
        fetchClass();
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft({ d, h, m, s });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [liveClass?.scheduled_start, liveClass?.status]);

  // .ics Calendar file generator
  const downloadCalendarFile = () => {
    if (!liveClass) return;
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SIMS Raipur//Live Classes//EN',
      'BEGIN:VEVENT',
      `UID:sims-live-${liveClass.id}@simsraipur.com`,
      `DTSTAMP:${formatDate(new Date().toISOString())}`,
      `DTSTART:${formatDate(liveClass.scheduled_start)}`,
      `DTEND:${formatDate(liveClass.scheduled_end)}`,
      `SUMMARY:${liveClass.title}`,
      `DESCRIPTION:${liveClass.description || 'SIMS Raipur live class session.'}`,
      `URL:${window.location.href}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIMS-Live-${liveClass.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatIST = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
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

  const isIframeAllowed = (url?: string | null): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return host === 'www.youtube-nocookie.com' || host === 'player.vimeo.com';
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="py-28 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Connecting to live classroom...</p>
      </div>
    );
  }

  if (error || !liveClass) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="font-serif font-bold text-2xl text-[#061426]">Classroom Unavailable</h2>
        <p className="text-sm text-[#687386]">{error || 'Live class record not found.'}</p>
        <Link
          to="/student/live"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D9A52E] text-[#061426] font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Live Schedule
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top back button & breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/live"
          className="text-xs font-bold text-[#A87519] hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all live classes
        </Link>
        <span className="text-xs text-[#687386]">Auto-syncs every 20s</span>
      </div>

      {/* Main Classroom Container */}
      <div className="bg-white rounded-3xl border border-[#E3D8BE] shadow-md overflow-hidden">
        {/* Stream / Player / Countdown Area */}
        {liveClass.is_locked ? (
          /* LOCKED STATE */
          <div className="py-20 px-6 text-center space-y-4 bg-slate-50 border-b border-[#E3D8BE]">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#A87519] flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-[#061426]">Enrolled Students Access Only</h2>
            <p className="text-xs text-[#687386] max-w-md mx-auto">
              This live session is reserved for students enrolled in{' '}
              <strong>{liveClass.course_title || 'this program'}</strong>. Enroll now to unlock live
              streaming, recordings, and course curriculum.
            </p>
            <div className="pt-2">
              <Link
                to={liveClass.course_slug ? `/courses/${liveClass.course_slug}` : '/courses'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs shadow-md transition"
              >
                Enroll in {liveClass.course_title || 'Course'}
              </Link>
            </div>
          </div>
        ) : liveClass.status === 'scheduled' ? (
          /* COUNTDOWN STATE */
          <div className="py-16 px-6 text-center space-y-6 bg-gradient-to-b from-[#061426] to-[#0A223E] text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-[#F0C45B] text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>Session Scheduled</span>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-white">
                {liveClass.title}
              </h2>
              <p className="text-xs text-[#E3D8BE]/80 max-w-lg mx-auto">
                Starts on {formatIST(liveClass.scheduled_start)}
              </p>
            </div>

            {/* Countdown Blocks */}
            {timeLeft && (
              <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2">
                <div className="w-16 sm:w-20 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="font-serif font-bold text-xl sm:text-2xl text-[#F0C45B]">
                    {String(timeLeft.d).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-300 uppercase font-semibold">Days</div>
                </div>
                <div className="w-16 sm:w-20 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="font-serif font-bold text-xl sm:text-2xl text-[#F0C45B]">
                    {String(timeLeft.h).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-300 uppercase font-semibold">Hours</div>
                </div>
                <div className="w-16 sm:w-20 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="font-serif font-bold text-xl sm:text-2xl text-[#F0C45B]">
                    {String(timeLeft.m).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-300 uppercase font-semibold">Mins</div>
                </div>
                <div className="w-16 sm:w-20 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="font-serif font-bold text-xl sm:text-2xl text-[#F0C45B]">
                    {String(timeLeft.s).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-300 uppercase font-semibold">Secs</div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={downloadCalendarFile}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition"
              >
                <Download className="w-4 h-4 text-[#F0C45B]" />
                <span>Add to Calendar (.ics)</span>
              </button>
            </div>
          </div>
        ) : liveClass.status === 'live' ? (
          /* LIVE NOW STATE */
          <div>
            {isIframeAllowed(liveClass.embed_url) ? (
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`${liveClass.embed_url}?autoplay=1&modestbranding=1&rel=0`}
                  title={liveClass.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="py-16 px-6 text-center space-y-5 bg-gradient-to-r from-emerald-900 to-[#061426] text-white">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Class In Progress</span>
                </div>
                <h2 className="font-serif font-bold text-2xl text-white">
                  {liveClass.title}
                </h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Interactive session is live. Click the button below to join the classroom.
                </p>
                <div className="pt-2">
                  <a
                    href={liveClass.join_url || liveClass.stream_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#061426] font-bold text-sm shadow-xl transition"
                  >
                    <span>Join class</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ENDED / RECORDING STATE */
          <div>
            {isIframeAllowed(liveClass.embed_url) ? (
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={liveClass.embed_url!}
                  title={liveClass.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full border-0"
                />
              </div>
            ) : liveClass.recording_url ? (
              <div className="py-16 px-6 text-center space-y-4 bg-slate-50">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-serif font-bold text-xl text-[#061426]">Session Completed</h3>
                <p className="text-xs text-[#687386] max-w-sm mx-auto">
                  A recording is available for this session. Click below to view.
                </p>
                <div className="pt-2">
                  <a
                    href={liveClass.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-sm shadow-md transition"
                  >
                    <span>Join class</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-16 px-6 text-center space-y-3 bg-slate-50">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-serif font-bold text-xl text-[#061426]">Session Completed</h3>
                <p className="text-xs text-[#687386] max-w-sm mx-auto">
                  This live class has ended. If a lecture recording was published by the educator, it will appear in your course curriculum.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Classroom Info & Metadata */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {liveClass.status === 'live' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    LIVE
                  </span>
                ) : liveClass.status === 'scheduled' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#A87519] text-[10px] font-bold">
                    UPCOMING
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                    COMPLETED
                  </span>
                )}
                <span className="text-[10px] uppercase font-mono text-[#687386]">
                  Provider: {liveClass.provider}
                </span>
              </div>
              <h1 className="font-serif font-bold text-2xl text-[#061426]">{liveClass.title}</h1>
            </div>

            {liveClass.status === 'scheduled' && (
              <button
                onClick={downloadCalendarFile}
                className="px-4 py-2 rounded-xl border border-[#E3D8BE] hover:bg-slate-50 text-xs font-bold text-[#061426] flex items-center gap-1.5 transition self-start"
              >
                <Download className="w-3.5 h-3.5 text-[#A87519]" />
                <span>Add to Calendar</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#687386] pt-1">
            <div>
              <span className="text-[#A87519] font-semibold block mb-0.5">Faculty In Charge</span>
              <span className="font-bold text-[#061426]">{liveClass.educator_name}</span>
            </div>
            <div>
              <span className="text-[#A87519] font-semibold block mb-0.5">Scheduled Time</span>
              <span>{formatIST(liveClass.scheduled_start)}</span>
            </div>
            <div>
              <span className="text-[#A87519] font-semibold block mb-0.5">Course Allocation</span>
              <span>{liveClass.course_title || 'General Academic Session'}</span>
            </div>
          </div>

          {liveClass.description && (
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-[#061426] mb-1">Session Description & Agenda</h4>
              <p className="text-xs text-[#687386] leading-relaxed whitespace-pre-wrap">
                {liveClass.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentLiveClassroomPage;
