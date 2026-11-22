import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CoursesAPI, APICourseDetail, APILesson } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePurchase } from '../../contexts/PurchaseContext';
import { 
  Play, Pause, CheckCircle2, Bookmark, ArrowLeft, 
  ArrowRight, Download, FileText, MessageSquare, 
  Menu, X, Lock, ShoppingCart, ShieldCheck,
  Maximize2, Loader2
} from 'lucide-react';
import VideoPlayer from '../../components/VideoPlayer';
import { ThemeToggle } from '../../components/common/ThemeToggle';

/** Detect YouTube / Vimeo URLs and return the embed URL + type. */
function getVideoEmbedInfo(url: string): { type: 'youtube' | 'vimeo' | 'native'; embedUrl: string } {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/
  );
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&autoplay=0`,
    };
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1`,
    };
  }
  return { type: 'native', embedUrl: url };
}

export const LearningClassroomPage: React.FC = () => {
  const { courseSlug, lessonId } = useParams<{ courseSlug: string; lessonId: string }>();
  const { user, toggleCompleteLesson, toggleBookmarkLesson } = useAuth();
  const { isCourseOwned, openCheckout } = usePurchase();

  const [course, setCourse] = useState<APICourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<string>('1.0');
  const [activeLectureId, setActiveLectureId] = useState<number | null>(null);
  const [resumePosition, setResumePosition] = useState<number>(0);
  const savingRef = useRef(false);
  const activeLectureIdRef = useRef<number | null>(null);
  activeLectureIdRef.current = activeLectureId;
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'qa'>('overview');
  const [userQuestion, setUserQuestion] = useState('');
  const [qaList, setQaList] = useState([
    {
      author: 'Aarav (You)',
      time: '2 hours ago',
      question: 'Is Cayley-Hamilton theorem applicable for singular matrices as well?',
      answer: 'Yes, Cayley-Hamilton states every square matrix satisfies its characteristic polynomial, regardless of whether determinant is zero.'
    }
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!courseSlug) return;
    setIsLoading(true);
    CoursesAPI.detail(courseSlug)
      .then(data => setCourse(data))
      .catch(err => console.error('Failed to load course details', err))
      .finally(() => setIsLoading(false));
  }, [courseSlug]);

  const saveCurrentPosition = useCallback((lectureId?: number) => {
    const lid = lectureId ?? activeLectureIdRef.current;
    const vid = videoRef.current;
    if (!lid || !vid || !vid.src || vid.currentTime < 1 || savingRef.current) return;
    const pos = Math.floor(vid.currentTime);
    savingRef.current = true;
    CoursesAPI.savePlaybackPosition(lid, pos)
      .catch((err: unknown) => {
        if ((import.meta as any).env?.DEV) console.warn('[SIMS] progress save failed', err);
      })
      .finally(() => {
        savingRef.current = false;
      });
  }, []);

  // Sync active lecture and resume position safely when lessonId or course changes
  useEffect(() => {
    if (!course) return;
    const all = (course.curriculum || []).flatMap(m => m.lessons);
    if (!all.length) return;
    const idx = lessonId ? all.findIndex(l => String(l.id) === String(lessonId)) : 0;
    const target = idx >= 0 ? all[idx] : all[0];
    if (!target) return;

    // Flush current position before switching to a new lecture
    if (activeLectureIdRef.current && activeLectureIdRef.current !== target.id) {
      saveCurrentPosition(activeLectureIdRef.current);
    }

    setActiveLectureId(target.id);
    const savedPos = user?.lecturePositions?.[target.id] ?? target.last_position_seconds ?? 0;
    setResumePosition(savedPos);
    setCurrentTime(savedPos > 4 ? savedPos : 0);
    setIsPlaying(false);
  }, [lessonId, course, user?.lecturePositions, saveCurrentPosition]);

  // Adjust playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(playbackSpeed);
    }
  }, [playbackSpeed]);

  // Periodic position save every 15 seconds during active playback
  useEffect(() => {
    if (!activeLectureId) return;
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveCurrentPosition();
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [activeLectureId, saveCurrentPosition]);

  // Save position on unmount
  useEffect(() => {
    return () => {
      saveCurrentPosition();
    };
  }, [saveCurrentPosition]);

  // Find all lessons flattened to allow prev/next
  const allLessons: (APILesson & { moduleTitle: string })[] = (course?.curriculum || []).flatMap(m =>
    m.lessons.map(l => ({ ...l, moduleTitle: m.title }))
  );

  const currentLessonIndex = lessonId
    ? allLessons.findIndex(l => String(l.id) === String(lessonId))
    : 0;
  const currentLesson = currentLessonIndex >= 0 && allLessons.length > 0
    ? allLessons[currentLessonIndex]
    : allLessons[0];

  const handleToggleComplete = useCallback(() => {
    if (!currentLesson) return;
    const pos = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    toggleCompleteLesson(currentLesson.id, pos);
  }, [currentLesson?.id, toggleCompleteLesson]);

  const handleToggleBookmark = useCallback(() => {
    if (!currentLesson) return;
    toggleBookmarkLesson(currentLesson.id);
  }, [currentLesson?.id, toggleBookmarkLesson]);

  if (isLoading) {
    return (
      <div className="p-8 text-center min-h-screen bg-[#061426] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mb-3" />
        <p className="text-sm text-[#E3D8BE]">Loading classroom...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center min-h-screen bg-[#061426] text-white flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold font-serif">Course Not Found</h2>
        <Link to="/courses" className="text-[#D9A52E] underline mt-3 inline-block text-sm">
          Return to Course Catalog
        </Link>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="p-8 text-center min-h-screen bg-[#061426] text-white flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold font-serif">No Lectures Available</h2>
        <Link to={`/courses/${course.slug}`} className="text-[#D9A52E] underline mt-3 inline-block text-sm">
          Return to Course Details
        </Link>
      </div>
    );
  }

  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const isCompleted = currentLesson.is_completed || (user?.completedLessonIds.includes(currentLesson.id) ?? false);

  // activeLectureId and resumePosition are synchronized via useEffect
  const isBookmarked = user?.bookmarkedLessonIds.includes(currentLesson.id) || false;

  // Access check — server sets is_free_preview; never trust client-side position (isFirstLesson bypass removed)
  const isEnrolled = Boolean(user) && (isCourseOwned(String(course.id)) || (user?.enrolledCourseIds?.includes(course.id)) || Boolean(course.is_enrolled));
  const isLessonAccessible = !course.is_paid || isEnrolled || currentLesson.is_free_preview || Boolean(user?.isStaff || user?.isSuperuser);

  const priceNum = course.price ? parseFloat(course.price) : 0;
  const origPriceNum = course.original_price ? parseFloat(course.original_price) : undefined;

  const handlePlayPause = () => {
    if (!videoRef.current || !isLessonAccessible) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSpeedChange = (speed: string) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(speed);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePostQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    setQaList([
      {
        author: user?.name || 'Student',
        time: 'Just now',
        question: userQuestion,
        answer: 'Pending faculty instructor review (SIMS Raipur doubt cell).'
      },
      ...qaList
    ]);
    setUserQuestion('');
  };

  return (
    <div className="min-h-screen bg-[#061426] text-white flex flex-col font-sans">
      
      {/* Top Bar */}
      <header className="bg-[#091B31] border-b border-[#D9A52E]/30 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            to="/lectures"
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#E3D8BE] hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All Lectures</span>
          </Link>
          <span className="text-white/30 hidden sm:inline">|</span>
          <div className="truncate max-w-xs sm:max-w-md">
            <span className="text-xs text-[#D9A52E] font-medium block truncate">{course.title}</span>
            <span className="font-semibold text-sm text-[#FFF9ED] block truncate">{currentLesson.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Free Preview Badge if applicable */}
          {currentLesson.is_free_preview && course.is_paid && !isEnrolled && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
              Free Preview
            </span>
          )}

          {/* Bookmark Button */}
          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition ${
              isBookmarked
                ? 'bg-[#D9A52E] text-[#061426] border-[#D9A52E]'
                : 'bg-[#102846] text-[#E3D8BE] border-white/10 hover:border-[#D9A52E]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden md:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          {/* Toggle Sidebar (Mobile) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#102846] text-[#E3D8BE]"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Classroom Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Video Area & Lesson Tabs (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Video Player Box */}
          <div className="w-full bg-black rounded-2xl aspect-video relative flex flex-col justify-between border border-[#D9A52E]/30 overflow-hidden shadow-2xl group">
            
            {!isLessonAccessible ? (
              /* Locked Screen for Unenrolled Students */
              <div className="absolute inset-0 bg-[#061426] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#102846] border-2 border-[#D9A52E] flex items-center justify-center shadow-xl">
                  <Lock className="w-8 h-8 text-[#D9A52E]" />
                </div>
                
                <div className="max-w-md space-y-1">
                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#FFF9ED]">
                    Premium Lecture Locked
                  </h3>
                  <p className="text-xs text-[#E3D8BE]/80 leading-relaxed">
                    This video is part of the comprehensive <strong>{course.title}</strong> syllabus.
                    Enroll now to unlock all {(course.curriculum || []).length} modules, video archives, faculty notes, and mock tests.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => openCheckout({
                      id: String(course.id),
                      type: 'course',
                      title: course.title,
                      subtitle: course.subtitle,
                      price: priceNum || 24999,
                      originalPrice: origPriceNum,
                    })}
                    className="btn-sims-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2 shadow-lg"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Enroll Now (₹{(priceNum || 24999).toLocaleString('en-IN')})</span>
                  </button>

                  <Link
                    to={`/courses/${course.slug}`}
                    className="btn-sims-secondary px-4 py-2.5 text-xs font-semibold"
                  >
                    View Full Syllabus
                  </Link>
                </div>

                <p className="text-[10px] text-white/50 flex items-center gap-1 mt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                  Instant access upon verified enrollment · SIMS Raipur Official Portal
                </p>
              </div>
            ) : !currentLesson.video_url ? (
              /* Accessible Lecture But Video URL Missing / Processing */
              <div className="absolute inset-0 bg-[#061426] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#102846] border border-[#D9A52E]/40 flex items-center justify-center text-[#D9A52E] shadow-lg">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="font-serif font-bold text-lg text-[#FFF9ED]">
                    Video Stream Being Prepared
                  </h3>
                  <p className="text-xs text-[#E3D8BE]/80 leading-relaxed">
                    The video for <strong>{currentLesson.title}</strong> is currently being transcoded or updated by the faculty. Please check back shortly or explore the study notes below.
                  </p>
                </div>
              </div>
            ) : (
              <VideoPlayer
                src={currentLesson.video_url}
                lessonId={currentLesson.id}
                isCompleted={isCompleted}
                resumePosition={resumePosition}
                onComplete={handleToggleComplete}
                onPositionChange={(pos) => {
                  CoursesAPI.savePlaybackPosition(currentLesson.id, pos).catch((err: unknown) => {
                    if ((import.meta as any).env?.DEV) console.warn('[SIMS] onPositionChange save failed', err);
                  });
                }}
              />
            )}

          </div>

          {/* Lesson Action Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#091B31] p-4 rounded-xl border border-white/10">
            <div>
              <div className="text-xs text-[#D9A52E] font-medium">{currentLesson.moduleTitle}</div>
              <h2 className="font-serif font-bold text-xl text-[#FFF9ED] mt-0.5">
                {currentLesson.title}
              </h2>
              <p className="text-xs text-[#E3D8BE]/80 mt-1">
                {currentLesson.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
              <button
                onClick={handleToggleComplete}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  isCompleted
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'btn-sims-secondary'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mr-0.5" />
                <span>{isCompleted ? 'Watched' : 'Mark as Watched'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                {prevLesson && (
                  <Link
                    to={`/learn/${course.slug}/${prevLesson.id}`}
                    className="btn-sims-secondary p-2 text-xs"
                    title="Previous Lesson"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                )}
                {nextLesson && (
                  <Link
                    to={`/learn/${course.slug}/${nextLesson.id}`}
                    className="btn-sims-primary px-3 py-2 text-xs font-bold flex items-center gap-1"
                    title="Next Lesson"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Content Tabs (Overview / Notes / Q&A) */}
          <div className="bg-[#091B31] rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex border-b border-white/10 space-x-6 text-sm">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 font-medium transition ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-[#D9A52E] text-[#D9A52E]'
                    : 'text-[#E3D8BE]/70 hover:text-white'
                }`}
              >
                Lesson Overview
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-3 font-medium transition ${
                  activeTab === 'notes'
                    ? 'border-b-2 border-[#D9A52E] text-[#D9A52E]'
                    : 'text-[#E3D8BE]/70 hover:text-white'
                }`}
              >
                Notes &amp; Downloads (1)
              </button>
              <button
                onClick={() => setActiveTab('qa')}
                className={`pb-3 font-medium transition ${
                  activeTab === 'qa'
                    ? 'border-b-2 border-[#D9A52E] text-[#D9A52E]'
                    : 'text-[#E3D8BE]/70 hover:text-white'
                }`}
              >
                Questions &amp; Doubts ({qaList.length})
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-sm text-[#E3D8BE]/90 leading-relaxed">
                <p>
                  {currentLesson.summary} This lecture covers core competitive question variations, derivation steps, and previous year examination trends. Follow along with your formulas sheet and practice the examples worked out on the board.
                </p>
                <div className="p-4 rounded-xl bg-[#102846] border border-[#D9A52E]/20 text-xs text-[#FFF9ED] space-y-1">
                  <strong className="text-[#F0C45B] block">SIMS Faculty Tip:</strong>
                  <span>Always write down the formulas on your study sheet before attempting the associated module quiz.</span>
                </div>
              </div>
            )}

            {/* Tab 2: Notes & Downloads */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#102846] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#D9A52E]" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {currentLesson.title} — Lecture Slide Deck
                      </div>
                      <div className="text-[11px] text-[#E3D8BE]/60">PDF • 3.2 MB</div>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-[#D9A52E] text-[#061426] text-xs font-bold rounded hover:bg-[#F0C45B] transition flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Q&A */}
            {activeTab === 'qa' && (
              <div className="space-y-6">
                <form onSubmit={handlePostQuestion} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Ask a question about this lesson for the faculty team..."
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#102846] border border-white/10 text-white focus:outline-none focus:border-[#D9A52E]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#D9A52E] text-[#061426] rounded-lg text-xs font-bold hover:bg-[#F0C45B] transition flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Submit Doubt
                  </button>
                </form>

                <div className="space-y-3 pt-2">
                  {qaList.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#102846] border border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-white/50 text-[11px]">
                        <strong>{item.author}</strong>
                        <span>{item.time}</span>
                      </div>
                      <p className="text-white font-medium">{item.question}</p>
                      <div className="pl-3 border-l-2 border-[#D9A52E] text-[#E3D8BE]">
                        {item.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Curriculum Navigation Sidebar */}
        <aside className={`
          fixed inset-y-0 right-0 z-30 w-80 bg-[#091B31] border-l border-[#D9A52E]/20 p-5 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 overflow-y-auto
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#F0C45B]">Course Curriculum</h3>
              <p className="text-[11px] text-[#E3D8BE]/70">{(course.curriculum || []).length} Modules in syllabus</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {(course.curriculum || []).map((module, mIdx) => (
              <div key={module.id} className="space-y-1">
                <div className="text-xs font-semibold text-[#D9A52E] px-2 py-1 uppercase tracking-wider">
                  {module.title}
                </div>
                <div className="space-y-1">
                  {module.lessons.map((les, lIdx) => {
                    const isCurrent = les.id === currentLesson.id;
                    // Prefer server is_completed; fall back to local toggle state
                    const isDone = les.is_completed || (user?.completedLessonIds.includes(les.id) ?? false);
                    const isFirstInCourse = mIdx === 0 && lIdx === 0;
                    const canPlay = !les.is_locked;

                    return (
                      <Link
                        key={les.id}
                        to={`/learn/${course.slug}/${les.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition ${
                          isCurrent
                            ? 'bg-[#D9A52E] text-[#061426] font-bold shadow-sm'
                            : 'hover:bg-[#102846] text-[#FFF9ED]/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isDone ? (
                            <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-[#061426]' : 'text-green-400'}`} />
                          ) : canPlay ? (
                            <Play className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-[#061426]' : 'text-[#D9A52E]'}`} />
                          ) : (
                            <Lock className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
                          )}
                          <span className="truncate">{les.title}</span>
                        </div>
                        <span className={`text-[10px] ml-2 flex-shrink-0 ${isCurrent ? 'text-[#061426]' : 'text-white/40'}`}>
                          {les.duration}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>

    </div>
  );
};
