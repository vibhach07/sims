import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Clock, BookOpen, Award, CheckCircle2, FileText, 
  HelpCircle, ChevronRight, Phone, PlayCircle,
  Lock, ShoppingCart, Loader2, ArrowLeft, Layers, Sparkles,
  Calendar, Check, ChevronDown, ChevronUp, Users, Video, HelpCircle as FaqIcon
} from 'lucide-react';
import { CoursesAPI, APICourseDetail, LiveAPI, APILiveClass, FacultyAPI, APIFaculty, AssessmentsAPI, APITestSeries } from '../../services/api';
import { useCourses } from '../../contexts/CourseContext';
import { usePurchase } from '../../contexts/PurchaseContext';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppCounsellorButton } from '../../components/WhatsAppCounsellorButton';
import { FacultyFlipCard } from '../../components/common/FacultyFlipCard';
import { Radio } from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { isCourseOwned, openCheckout, startRazorpayPayment } = usePurchase();
  const { user, isAuthenticated } = useAuth();

  const [course, setCourse] = useState<APICourseDetail | null>(null);
  const [hierarchy, setHierarchy] = useState<import('../../types').APICourseHierarchy | null>(null);
  const [exploredTrackId, setExploredTrackId] = useState<number | null>(null);
  const [liveClass, setLiveClass] = useState<APILiveClass | null>(null);
  const [facultyList, setFacultyList] = useState<APIFaculty[]>([]);
  const [testSeriesList, setTestSeriesList] = useState<APITestSeries[]>([]);
  const [flippedFacultyId, setFlippedFacultyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'syllabus' | 'faculty' | 'tests' | 'faqs'>('overview');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    Promise.all([
      CoursesAPI.detail(slug).then(data => setCourse(data)),
      CoursesAPI.hierarchy(slug).then(data => {
        setHierarchy(data);
        const trackParam = searchParams.get('track');
        if (trackParam && data.tracks) {
          const match = data.tracks.find(t => t.slug === trackParam || t.code?.toLowerCase() === trackParam.toLowerCase());
          if (match) setExploredTrackId(match.id);
        }
      }).catch(() => setHierarchy(null)),
      LiveAPI.list({ status: 'live' })
        .then(lives => {
          const match = lives.find(l => l.course_slug === slug);
          setLiveClass(match || null);
        })
        .catch(() => setLiveClass(null)),
      FacultyAPI.list()
        .then(facs => setFacultyList(facs))
        .catch(() => setFacultyList([])),
      AssessmentsAPI.list()
        .then(tests => setTestSeriesList(tests.slice(0, 4)))
        .catch(() => setTestSeriesList([])),
    ])
      .catch(err => setError(err.message ?? 'Course not found'))
      .finally(() => setIsLoading(false));
  }, [slug, searchParams]);

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto mb-3" />
        <p className="text-sm text-[#687386] dark:text-[#85878B]">Loading course details…</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="py-20 text-center max-w-xl mx-auto px-4">
        <h2 className="font-serif text-2xl font-bold text-[#061426] dark:text-[#F1EEE7] mb-3">Course Not Found</h2>
        <p className="text-sm text-[#687386] dark:text-[#85878B] mb-6">{error ?? 'The requested course does not exist.'}</p>
        <Link to="/courses" className="px-5 py-2.5 rounded-lg bg-[#061426] text-white text-sm font-semibold">
          Return to Course Catalog
        </Link>
      </div>
    );
  }

  const price = course.price ? parseFloat(course.price) : undefined;
  const originalPrice = course.original_price ? parseFloat(course.original_price) : undefined;

  const ownedLocally = isCourseOwned(String(course.id));
  const enrolledViaBackend = user?.enrolledCourseIds?.includes(course.id) ?? false;
  const owned = Boolean(user) && (ownedLocally || enrolledViaBackend || Boolean(course.is_enrolled));

  const handleBuyNow = async () => {
    if (!course) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: `/courses/${course.slug}` } });
      return;
    }
    await startRazorpayPayment(
      {
        id: String(course.id),
        type: 'course',
        title: course.title,
        subtitle: course.subtitle,
        price: price || 0,
        originalPrice,
      },
      {
        onSuccess: (order) => {
          navigate(`/payment/success?order_id=${order.order_id}`);
        },
        onError: (err) => {
          alert(err || 'Could not complete Razorpay transaction.');
        },
      }
    );
  };

  // Filter faculty associated with this course or default all
  const assignedFaculty = facultyList.filter(f => (f.coursesTaught || []).includes(course.slug));
  const displayFaculty = assignedFaculty.length > 0 ? assignedFaculty : facultyList.slice(0, 4);

  // Standard high-yield FAQ items for SIMS courses
  const faqs = [
    {
      q: `What is the batch timing and duration for ${course.target_exam || 'this examination'}?`,
      a: `Classes run across regular weekday and intensive weekend batches with ${course.duration || '10-12 months'} structured coverage, daily live sessions, and full recorded video archive access.`
    },
    {
      q: 'Can I access the course on both mobile and laptop?',
      a: 'Yes! SIMS Raipur provides responsive multi-device access with server-synced playback, downloadable formula notes, and CBT test simulation on web and mobile.'
    },
    {
      q: 'Are full-length mock tests and chapter-wise test series included?',
      a: 'Yes, full enrollment includes the complete national benchmark CBT test series with Section A (1-mark) & Section B (2-mark) GATE/national scoring algorithms.'
    },
    {
      q: 'How does personal doubt resolution work?',
      a: 'Students get dedicated daily doubt clearance sessions with senior faculty, live classroom chat, and personal Telegram/WhatsApp mentor assistance.'
    }
  ];

  const highlights = [
    { title: 'Live + Recorded Sessions', desc: 'Interactive live classes with lifetime recorded backup.', icon: Video },
    { title: 'National CBT Test Series', desc: 'Full length benchmark mock tests with GATE scoring.', icon: Award },
    { title: 'Curated Study Materials', desc: 'High-yield formula books, DPPs, and previous year papers.', icon: FileText },
    { title: 'Dedicated Doubt Support', desc: '1-on-1 mentor guidance and faculty discussion forums.', icon: Users },
  ];

  const bannerImage = (course as any).banner_image || (course as any).image_url;

  return (
    <div className="bg-[#FFF9ED] dark:bg-[#101113] pb-24 min-h-screen">
      
      {/* 1. HERO BANNER SECTION (PW-Style Image Card with readable gradient overlay) */}
      <section className="bg-gradient-to-b from-[#061426] via-[#091B31] to-[#102846] dark:bg-gradient-to-b dark:from-[#101113] dark:via-[#141619] dark:to-[#181A1D] text-white py-8 lg:py-12 border-b border-[#D9A52E]/30 dark:border-[#383D44]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#E3D8BE]/70 flex-wrap">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/courses" className="hover:text-white">Courses</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#D9A52E] font-medium">{course.category_label || course.category}</span>
          </div>

          {/* PW-Style Hero Card: Full-width container with 16:9 banner or fallback */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-[#D9A52E]/30 dark:border-[#383D44] bg-[#091B31] shadow-2xl">
            {/* Background Image / Pattern */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              {bannerImage ? (
                <img
                  src={bannerImage}
                  alt={course.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center filter brightness-[0.4] scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#061426] via-[#091B31] to-[#102846] dark:from-[#141619] dark:to-[#1C1F24] opacity-90" />
              )}
              {/* Gradient Scrim for readable text overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#061426] via-[#061426]/80 to-transparent" />
            </div>

            {/* Content Over Banner */}
            <div className="relative z-10 p-6 sm:p-8 lg:p-10 max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block px-3 py-1 rounded bg-[#D9A52E] text-[#061426] text-xs font-bold uppercase tracking-wider shadow-sm">
                  {course.target_exam || 'Target Exam'}
                </span>
                <span className="inline-block px-2.5 py-1 rounded bg-white/10 backdrop-blur-sm text-[#F0C45B] text-xs font-semibold uppercase tracking-wider border border-white/10">
                  {course.language || 'English & Hindi'}
                </span>
                <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-xs font-semibold border border-emerald-400/30">
                  {course.fee_status || 'Batches Open'}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#FFF9ED] leading-tight drop-shadow-sm">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-[#E3D8BE] leading-relaxed max-w-3xl drop-shadow-xs">
                {course.subtitle || course.short_description}
              </p>

              {/* Meta stats bar */}
              <div className="pt-4 flex flex-wrap gap-4 sm:gap-6 text-xs text-[#FFF9ED]/90 border-t border-white/15">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#D9A52E]" />
                  <span>Duration: <strong>{course.duration}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#D9A52E]" />
                  <span>Format: <strong>{course.format}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#D9A52E]" />
                  <span>Validity: <strong>Full Academic Year</strong></span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. TABS & MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Navigation Tabs (PW Style) */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-[#E3D8BE] dark:border-[#383D44] overflow-x-auto pb-1 mb-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'syllabus', label: 'Syllabus & Curriculum' },
            { id: 'faculty', label: `Expert Faculty (${displayFaculty.length})` },
            { id: 'tests', label: 'Test Series' },
            { id: 'faqs', label: 'FAQs & Guidance' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs sm:text-sm font-bold whitespace-nowrap transition relative ${
                  isActive
                    ? 'text-[#061426] dark:text-[#F1EEE7]'
                    : 'text-[#687386] dark:text-[#85878B] hover:text-[#061426] dark:hover:text-[#F1EEE7]'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D9A52E] dark:bg-[#D5AD5B]" />
                )}
              </button>
            );
          })}
        </div>

        {/* 2-Column Layout: Left Content (8 cols) + Right Sticky Enroll Card (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT COLUMN: Tab Contents */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* LIVE NOW Banner if active live session */}
            {liveClass && (
              <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-[#061426] text-white p-5 rounded-2xl border-2 border-rose-500 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-rose-500 text-white rounded-xl">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </span>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 px-2 py-0.5 rounded text-white">
                      LIVE CLASS IN SESSION
                    </span>
                    <h3 className="font-serif font-bold text-lg text-white mt-1">{liveClass.title}</h3>
                    <p className="text-xs text-rose-200">Instructor: {liveClass.educator_name}</p>
                  </div>
                </div>
                <Link
                  to={`/student/live/${liveClass.id}`}
                  className="px-5 py-2.5 rounded-xl bg-white text-rose-900 font-bold text-xs hover:bg-rose-50 transition shadow self-start sm:self-center"
                >
                  Enter Live Classroom
                </Link>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* What you'll get icon grid (PW style) */}
                <div className="bg-white dark:bg-[#181A1D] p-6 sm:p-8 rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] shadow-xs space-y-5">
                  <h3 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
                    What You'll Get in this Batch
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {highlights.map((h, idx) => {
                      const IconComponent = h.icon;
                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-[#F8F4EA] dark:bg-[#22252A] border border-[#E3D8BE]/70 dark:border-[#383D44] flex items-start gap-3.5"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#061426] text-[#F0C45B] flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#061426] dark:text-[#F1EEE7]">
                              {h.title}
                            </h4>
                            <p className="text-[11px] text-[#687386] dark:text-[#85878B] mt-0.5 leading-relaxed">
                              {h.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Course Narrative */}
                <div className="bg-white dark:bg-[#181A1D] p-6 sm:p-8 rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] shadow-xs space-y-4">
                  <h2 className="font-serif font-bold text-2xl text-[#061426] dark:text-[#F1EEE7]">
                    About this Program
                  </h2>
                  <p className="text-sm sm:text-base text-[#263347] dark:text-[#B8B6B0] leading-relaxed">
                    {course.long_description || course.short_description}
                  </p>

                  {(hierarchy?.exam_overview || hierarchy?.eligibility) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E3D8BE] dark:border-[#383D44]">
                      {hierarchy.exam_overview && (
                        <div className="bg-[#F8F4EA] dark:bg-[#22252A] p-4 rounded-xl border border-[#E3D8BE]/70 dark:border-[#383D44]">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A87519] dark:text-[#D5AD5B] mb-1">
                            <Award className="w-4 h-4" />
                            <span>Exam Overview</span>
                          </div>
                          <p className="text-xs text-[#263347] dark:text-[#B8B6B0] leading-relaxed">{hierarchy.exam_overview}</p>
                        </div>
                      )}
                      {hierarchy.eligibility && (
                        <div className="bg-[#F8F4EA] dark:bg-[#22252A] p-4 rounded-xl border border-[#E3D8BE]/70 dark:border-[#383D44]">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A87519] dark:text-[#D5AD5B] mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Eligibility</span>
                          </div>
                          <p className="text-xs text-[#263347] dark:text-[#B8B6B0] leading-relaxed">{hierarchy.eligibility}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SYLLABUS & CURRICULUM ACCORDION */}
            {activeTab === 'syllabus' && (
              <div className="space-y-6">
                {/* Dynamic Tracks / Branch Syllabus Selection */}
                {hierarchy && hierarchy.tracks && hierarchy.tracks.length > 0 && (
                  <div className="bg-white dark:bg-[#181A1D] p-6 sm:p-8 rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] shadow-xs space-y-6">
                    {exploredTrackId === null ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E3D8BE] dark:border-[#383D44]">
                          <div>
                            <h3 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
                              Specialization Papers &amp; Branches
                            </h3>
                            <p className="text-xs text-[#687386] dark:text-[#85878B] mt-0.5">
                              Select your paper to explore syllabus subjects, modules, and recorded lectures.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {hierarchy.tracks.map((track) => (
                            <div
                              key={track.id}
                              className="p-4 rounded-xl bg-[#FFF9ED] dark:bg-[#22252A] border border-[#E3D8BE] dark:border-[#383D44] hover:border-[#D9A52E] transition flex flex-col justify-between"
                            >
                              <div className="space-y-2">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#061426] text-[#F0C45B] rounded inline-block">
                                  {track.code || track.name}
                                </span>
                                <h4 className="font-serif font-bold text-base text-[#061426] dark:text-[#F1EEE7]">
                                  {track.name}
                                </h4>
                                {track.description && (
                                  <p className="text-xs text-[#687386] dark:text-[#85878B] line-clamp-2">
                                    {track.description}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setExploredTrackId(track.id)}
                                className="mt-3 py-2 px-3 rounded-lg bg-[#061426] text-[#F0C45B] hover:text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                              >
                                <span>Explore {track.subjects.length} Core Subjects</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const currentTrack = hierarchy.tracks.find(t => t.id === exploredTrackId) || hierarchy.tracks[0];
                        return (
                          <div className="space-y-4">
                            <button
                              type="button"
                              onClick={() => setExploredTrackId(null)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A87519] dark:text-[#D5AD5B] hover:underline"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              <span>View All Papers</span>
                            </button>
                            <h3 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
                              {currentTrack.name} ({currentTrack.code})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {currentTrack.subjects.map((sub) => (
                                <Link
                                  key={sub.id}
                                  to={`/courses/${course.slug}/subjects/${sub.slug}`}
                                  className="p-4 rounded-xl border border-[#E3D8BE] dark:border-[#383D44] bg-[#FFF9ED] dark:bg-[#22252A] hover:border-[#D9A52E] transition flex items-center justify-between"
                                >
                                  <div>
                                    <h5 className="text-xs font-bold text-[#061426] dark:text-[#F1EEE7]">{sub.name}</h5>
                                    <span className="text-[10px] text-[#687386] dark:text-[#85878B]">
                                      {sub.modules_count} Modules • {sub.lectures_count} Recorded Lectures
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-[#A87519] dark:text-[#D5AD5B]">Open →</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Modules Curriculum Accordion */}
                <div className="bg-white dark:bg-[#181A1D] p-6 sm:p-8 rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E3D8BE] dark:border-[#383D44]">
                    <div>
                      <h3 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
                        Lecture Curriculum &amp; Modules
                      </h3>
                      <p className="text-xs text-[#687386] dark:text-[#85878B]">
                        Click on any module to view lesson topics and free previews.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-[#F8F4EA] dark:bg-[#22252A] text-[#A87519] dark:text-[#D5AD5B] rounded-md border border-[#E3D8BE] dark:border-[#383D44]">
                      {course.curriculum.length} Modules
                    </span>
                  </div>

                  <div className="space-y-3">
                    {course.curriculum.map((module) => {
                      const isExpanded = expandedModuleId === module.id || expandedModuleId === null;
                      return (
                        <div key={module.id} className="border border-[#E3D8BE] dark:border-[#383D44] rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedModuleId(isExpanded ? 0 : module.id)}
                            className="w-full bg-[#F8F4EA] dark:bg-[#22252A] p-4 font-serif font-bold text-sm text-[#061426] dark:text-[#F1EEE7] flex items-center justify-between text-left"
                          >
                            <span>{module.title}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-sans font-normal text-[#687386] dark:text-[#85878B]">
                                {module.lessons.length} Lessons
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-[#A87519]" /> : <ChevronDown className="w-4 h-4 text-[#A87519]" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-3 space-y-2 bg-white dark:bg-[#181A1D]">
                              {module.lessons.map((lesson, lIdx) => {
                                const isPreview = lesson.is_free_preview || lIdx === 0;
                                const canAccess = !course.is_paid || owned || isPreview;
                                return (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[#FFF9ED] dark:bg-[#22252A] border border-[#E3D8BE]/50 dark:border-[#383D44]"
                                  >
                                    <div className="flex items-center gap-3">
                                      {canAccess ? (
                                        <PlayCircle className="w-4 h-4 text-[#D9A52E] shrink-0" />
                                      ) : (
                                        <Lock className="w-4 h-4 text-[#687386] shrink-0" />
                                      )}
                                      <div>
                                        <div className="text-xs font-medium text-[#061426] dark:text-[#F1EEE7]">{lesson.title}</div>
                                        {lesson.summary && (
                                          <div className="text-[11px] text-[#687386] dark:text-[#85878B] line-clamp-1">{lesson.summary}</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[11px] text-[#687386] dark:text-[#85878B]">{lesson.duration}</span>
                                      {canAccess ? (
                                        <Link
                                          to={`/learn/${course.slug}/${lesson.id}`}
                                          className="text-[11px] font-semibold text-[#A87519] dark:text-[#D5AD5B] hover:underline"
                                        >
                                          {isPreview && course.is_paid && !owned ? 'Free Preview' : 'Watch'}
                                        </Link>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openCheckout({
                                            id: String(course.id),
                                            type: 'course',
                                            title: course.title,
                                            price: price!,
                                            originalPrice,
                                          })}
                                          className="text-[11px] font-semibold text-[#687386] hover:text-[#D9A52E]"
                                        >
                                          Unlock
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {course.curriculum.length === 0 && (
                      <p className="text-sm text-[#687386] dark:text-[#85878B] text-center py-6">
                        Curriculum modules will be published shortly. Contact admissions for the syllabus PDF.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FACULTY FLIP CARDS REUSED */}
            {activeTab === 'faculty' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#181A1D] p-6 sm:p-8 rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] shadow-xs space-y-4">
                  <div className="pb-3 border-b border-[#E3D8BE] dark:border-[#383D44]">
                    <h3 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
                      Instructional Faculty &amp; Academic Leads
                    </h3>
                    <p className="text-xs text-[#687386] dark:text-[#85878B] mt-0.5">
                      Expert educators dedicated to this examination track. Click any card to view their credentials.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    {displayFaculty.map((fac) => (
                      <FacultyFlipCard
                        key={fac.id}
                        faculty={fac}
                        isFlipped={flippedFacultyId === fac.id}
                        onFlipToggle={() => setFlippedFacultyId(flippedFacultyId === fac.id ? null : fac.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TEST SERIES */}
            {activeTab === 'tests' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#181A1D] p-6 sm:p-8 rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E3D8BE] dark:border-[#383D44]">
                    <div>
                      <h3 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
                        Integrated CBT Test Series Packages
                      </h3>
                      <p className="text-xs text-[#687386] dark:text-[#85878B] mt-0.5">
                        CBT simulated mock examinations matching actual national examination interfaces.
                      </p>
                    </div>
                    <Link
                      to="/student/tests"
                      className="text-xs font-bold text-[#A87519] dark:text-[#D5AD5B] hover:underline"
                    >
                      View All Tests →
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {testSeriesList.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl border border-[#E3D8BE] dark:border-[#383D44] bg-[#FFF9ED] dark:bg-[#22252A] flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A87519] dark:text-[#D5AD5B]">
                            {t.exam}
                          </span>
                          <h4 className="font-serif font-bold text-sm text-[#061426] dark:text-[#F1EEE7] mt-0.5">
                            {t.title}
                          </h4>
                          <p className="text-xs text-[#687386] dark:text-[#85878B] line-clamp-2 mt-1">
                            {t.description || 'Full length CBT benchmark mock tests.'}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-[#E3D8BE]/50 dark:border-[#383D44] flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#061426] dark:text-[#F1EEE7]">
                            {t.durationMinutes || t.duration_minutes || 180} Mins
                          </span>
                          <Link
                            to="/student/tests"
                            className="font-bold text-[#A87519] dark:text-[#D5AD5B] hover:underline"
                          >
                            Explore →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: FAQS ACCORDION */}
            {activeTab === 'faqs' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#181A1D] p-6 sm:p-8 rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] shadow-xs space-y-4">
                  <div className="pb-3 border-b border-[#E3D8BE] dark:border-[#383D44]">
                    <h3 className="font-serif font-bold text-xl text-[#061426] dark:text-[#F1EEE7]">
                      Frequently Asked Questions
                    </h3>
                    <p className="text-xs text-[#687386] dark:text-[#85878B] mt-0.5">
                      Everything you need to know about enrollments, payments, and classroom access.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {faqs.map((faq, index) => {
                      const isOpen = expandedFaqIndex === index;
                      return (
                        <div
                          key={index}
                          className="border border-[#E3D8BE] dark:border-[#383D44] rounded-xl overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFaqIndex(isOpen ? null : index)}
                            className="w-full p-4 text-left font-serif font-bold text-sm text-[#061426] dark:text-[#F1EEE7] bg-[#F8F4EA] dark:bg-[#22252A] flex items-center justify-between"
                          >
                            <span>{faq.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-[#A87519]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#A87519]" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="p-4 bg-white dark:bg-[#181A1D] text-xs text-[#263347] dark:text-[#B8B6B0] leading-relaxed">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: STICKY ENROLLMENT CARD (PW Style) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
            
            <div className="bg-white dark:bg-[#181A1D] p-6 rounded-2xl border-2 border-[#D9A52E]/60 dark:border-[#383D44] shadow-xl space-y-5">
              
              {/* Thumbnail / Badge */}
              <div className="relative overflow-hidden rounded-xl aspect-video bg-slate-100 dark:bg-[#22252A] border border-slate-200 dark:border-[#383D44]">
                {bannerImage ? (
                  <img
                    src={bannerImage}
                    alt={course.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#061426] to-[#1C2C42] text-white">
                    <BookOpen className="w-8 h-8 text-[#D9A52E] mb-2" />
                    <span className="font-serif font-bold text-sm text-[#FFF9ED]">{course.title}</span>
                  </div>
                )}
                <div className="absolute top-2.5 right-2.5 bg-[#061426]/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-[#F0C45B]">
                  {course.target_exam || 'National Exam'}
                </div>
              </div>

              {/* Price block */}
              <div className="pb-4 border-b border-slate-100 dark:border-[#383D44] text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-[#85878B] block">
                  Batch Fee &amp; Admissions
                </span>
                {price ? (
                  <div className="mt-2 space-y-1">
                    {originalPrice && (
                      <div className="text-xs text-slate-400 line-through">₹{originalPrice.toLocaleString('en-IN')}</div>
                    )}
                    <div className="text-3xl font-extrabold text-[#061426] dark:text-[#F1EEE7]">
                      ₹{price.toLocaleString('en-IN')}
                    </div>
                    {originalPrice && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {Math.round((1 - price / originalPrice) * 100)}% Instant Scholarship Discount
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xl font-bold text-[#061426] dark:text-[#F1EEE7] mt-1">
                    {course.fee_status || 'Admissions Open'}
                  </div>
                )}
              </div>

              {/* CTA Action Buttons */}
              <div className="space-y-2.5">
                {course.is_paid && price ? (
                  owned ? (
                    <div className="w-full py-3 text-center text-xs font-bold rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Enrolled — Full Access
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="w-full py-3 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Enroll &amp; Buy Now
                    </button>
                  )
                ) : (
                  <Link
                    to={`/contact?course=${encodeURIComponent(course.title)}`}
                    className="w-full py-3 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs text-center block shadow-md transition"
                  >
                    Apply for Admissions
                  </Link>
                )}

                <WhatsAppCounsellorButton
                  course={course.title}
                  variant="secondary"
                  className="w-full py-2.5 text-xs font-semibold"
                >
                  Speak to Academic Counsellor
                </WhatsAppCounsellorButton>
              </div>

              {/* Package Inclusion Bullets */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#383D44] text-[11px] text-[#263347] dark:text-[#B8B6B0]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Comprehensive 100% Syllabus Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited Server Recorded Video Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>GATE/CBT Online National Test Series</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Class Handouts &amp; Formula Compendiums</span>
                </div>
              </div>

            </div>

            {/* Counsellor Helpline Card */}
            <div className="bg-[#091B31] p-5 rounded-2xl text-white border border-[#D9A52E]/30 space-y-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-[#F0C45B] tracking-wider block">
                Raipur Offline Campus Support
              </span>
              <p className="text-xs text-[#E3D8BE]/80 leading-relaxed">
                Visit our Tagore Nagar classroom or contact admissions desk directly for offline batch seat reservation.
              </p>
              <div className="pt-1">
                <a
                  href="tel:+917714000000"
                  className="text-xs font-bold text-[#F0C45B] hover:underline inline-flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" /> Call: +91 771-400-0000
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* MOBILE STICKY ENROLLMENT FOOTER BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#181A1D]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#383D44] p-3 px-4 flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-[#85878B] block">Batch Enrollment</span>
          <span className="text-lg font-extrabold text-[#061426] dark:text-[#F1EEE7]">
            {price ? `₹${price.toLocaleString('en-IN')}` : 'Admissions Open'}
          </span>
        </div>
        <div>
          {course.is_paid && price ? (
            owned ? (
              <span className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600/15 text-emerald-700">
                Enrolled
              </span>
            ) : (
              <button
                type="button"
                onClick={handleBuyNow}
                className="px-5 py-2.5 rounded-xl bg-[#D9A52E] text-[#061426] font-bold text-xs shadow-md cursor-pointer"
              >
                Buy Now
              </button>
            )
          ) : (
            <Link
              to={`/contact?course=${encodeURIComponent(course.title)}`}
              className="px-5 py-2.5 rounded-xl bg-[#D9A52E] text-[#061426] font-bold text-xs inline-block"
            >
              Enroll
            </Link>
          )}
        </div>
      </div>

    </div>
  );
};
