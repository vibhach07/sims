import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LiveAPI, APILiveClass } from '../../services/api';
import {
  Radio,
  Calendar,
  Clock,
  User,
  BookOpen,
  Lock,
  PlayCircle,
  ExternalLink,
  Loader2,
  Video,
  CheckCircle2,
} from 'lucide-react';

export const StudentLiveClassesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [classes, setClasses] = useState<APILiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const data = await LiveAPI.list({ status: activeTab });
      setClasses(data);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [activeTab]);

  const formatIST = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST';
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h1 className="font-serif font-bold text-3xl text-[#061426]">Live Interactive Classes</h1>
          </div>
          <p className="text-sm text-[#687386] mt-1">
            Join live lectures, problem solving marathons, and doubt clearances with senior SIMS faculty.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E3D8BE] text-xs font-bold gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('live')}
          className={`pb-3 px-4 flex items-center gap-2 transition ${
            activeTab === 'live'
              ? 'border-b-2 border-rose-500 text-rose-600'
              : 'text-[#687386] hover:text-[#061426]'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-500" />
          <span>Live Now</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 px-4 flex items-center gap-2 transition ${
            activeTab === 'upcoming'
              ? 'border-b-2 border-[#D9A52E] text-[#061426]'
              : 'text-[#687386] hover:text-[#061426]'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#A87519]" />
          <span>Upcoming Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 px-4 flex items-center gap-2 transition ${
            activeTab === 'past'
              ? 'border-b-2 border-[#061426] text-[#061426]'
              : 'text-[#687386] hover:text-[#061426]'
          }`}
        >
          <PlayCircle className="w-4 h-4 text-[#263347]" />
          <span>Past Class Archives</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
          <p className="text-sm text-[#687386]">Loading live classroom schedule...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E3D8BE] p-8 space-y-3">
          <Video className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-[#061426]">No classes found</h3>
          <p className="text-xs text-[#687386] max-w-sm mx-auto">
            {activeTab === 'live'
              ? 'There are no ongoing live sessions at this exact moment. Check the upcoming schedule.'
              : activeTab === 'upcoming'
              ? 'No live classes are currently scheduled for the upcoming days.'
              : 'No recorded live session archives available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className={`bg-white rounded-2xl border transition shadow-sm p-5 flex flex-col justify-between ${
                cls.status === 'live'
                  ? 'border-rose-400 ring-2 ring-rose-100'
                  : 'border-[#E3D8BE]'
              }`}
            >
              <div className="space-y-3">
                {/* Status Badges */}
                <div className="flex items-center justify-between">
                  {cls.status === 'live' ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      LIVE STREAMING
                    </span>
                  ) : cls.status === 'scheduled' ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-[#A87519] text-[10px] font-bold">
                      SCHEDULED
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                      ENDED / RECORDED
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-[#687386] uppercase bg-slate-50 px-2 py-0.5 rounded">
                    {cls.provider}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-serif font-bold text-base text-[#061426] line-clamp-2">
                    {cls.title}
                  </h3>
                  {cls.description && (
                    <p className="text-xs text-[#687386] line-clamp-2 mt-1">
                      {cls.description}
                    </p>
                  )}
                </div>

                {/* Course & Faculty Info */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  {cls.course_title && (
                    <div className="flex items-center gap-1.5 text-[#A87519] font-medium">
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{cls.course_title}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[#687386]">
                    <User className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span>Faculty: {cls.educator_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#687386]">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span>{formatIST(cls.scheduled_start)}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                {cls.is_locked ? (
                  <Link
                    to={cls.course_slug ? `/courses/${cls.course_slug}` : '/courses'}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Enroll to Unlock</span>
                  </Link>
                ) : (
                  <Link
                    to={`/student/live/${cls.id}`}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition ${
                      cls.status === 'live'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426]'
                    }`}
                  >
                    {cls.status === 'live' ? (
                      <>
                        <Radio className="w-4 h-4 animate-spin" />
                        <span>Join Live Classroom</span>
                      </>
                    ) : cls.status === 'scheduled' ? (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Classroom & Timer</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>Watch Recording</span>
                      </>
                    )}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentLiveClassesPage;
