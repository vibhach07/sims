import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, Lock, Clock, Search, User, 
  ChevronRight, CheckCircle2, PlayCircle, Sparkles, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePurchase } from '../../contexts/PurchaseContext';
import { CoursesAPI, APICourseDetail } from '../../services/api';

export const VideoLecturesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isCourseOwned, openCheckout } = usePurchase();

  const [courses, setCourses] = useState<APICourseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    CoursesAPI.videoDiscovery()
      .then(data => setCourses(data))
      .catch(err => console.error('Failed to load video catalog', err))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = [
    { id: 'all', label: 'All Disciplines' },
    { id: 'after-msc-btech', label: 'After MSc / B.Tech (GATE, NET)' },
    { id: 'post-graduate-entrance', label: 'PG Entrance (JAM, NIMCET, CAT)' },
    { id: 'career-foundation', label: 'Foundation & NEET/JEE' },
  ];

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.target_exam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.curriculum && c.curriculum.some(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.lessons.some(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
      ));
    return matchesCat && matchesSearch;
  });

  // Collect all flattened lessons across courses
  const allFlattenedLessons = courses.flatMap(c => 
    (c.curriculum || []).flatMap(m => 
      m.lessons.map(l => ({
        ...l,
        courseSlug: c.slug,
        courseTitle: c.title,
        targetExam: c.target_exam,
        courseId: c.id,
        isPaidCourse: !!c.is_paid,
        coursePrice: c.price ? parseFloat(c.price) : 0,
        courseOriginalPrice: c.original_price ? parseFloat(c.original_price) : undefined,
        moduleTitle: m.title
      }))
    )
  );

  // Resume / Continue learning lessons for user
  const inProgressLessons = isAuthenticated && user ? allFlattenedLessons.filter(l => 
    !user.completedLessonIds.includes(l.id) && 
    (user.enrolledCourseIds.includes(l.courseId) || isCourseOwned(String(l.courseId)) || !l.isPaidCourse)
  ).slice(0, 3) : [];

  return (
    <div className="bg-[#FFF9ED] min-h-screen pb-20">
      
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-[#061426] via-[#091B31] to-[#102846] text-white py-12 md:py-16 border-b border-[#D9A52E]/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#D9A52E_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          
          <div className="flex items-center gap-2 text-xs text-[#E3D8BE]/70">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#D9A52E] font-medium">Video Lectures &amp; Classroom Discovery</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102846] text-[#F0C45B] text-xs font-semibold border border-[#D9A52E]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#D9A52E]" />
              Structured Visual Pedagogy
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#FFF9ED] leading-tight">
              SIMS Raipur Digital Classroom
            </h1>
            <p className="text-sm sm:text-base text-[#E3D8BE] leading-relaxed">
              Explore subject-wise video modules, concept derivations, and high-yield problem solving taught by senior SIMS faculty. Watch free preview lectures or continue your enrolled syllabus.
            </p>
          </div>

          {/* Search bar & Filter Pills */}
          <div className="pt-2 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-[#D9A52E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search lectures by topic, formula, or exam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#061426]/80 text-white placeholder-white/50 text-xs sm:text-sm rounded-xl border border-white/15 focus:outline-none focus:border-[#D9A52E] transition shadow-inner"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-[#D9A52E] text-[#061426] shadow'
                      : 'bg-[#102846] text-[#E3D8BE] hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-12">
        
        {/* Continue Learning Bar (For Authenticated Students) */}
        {inProgressLessons.length > 0 && (
          <section className="bg-white rounded-2xl p-6 border border-[#E3D8BE] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#D9A52E]" />
                <h2 className="font-serif font-bold text-xl text-[#061426]">Continue Learning</h2>
              </div>
              <Link to="/student/dashboard" className="text-xs font-semibold text-[#A87519] hover:underline flex items-center gap-1">
                Go to Learning Dashboard <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inProgressLessons.map((les) => (
                <div key={les.id} className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E3D8BE] flex flex-col justify-between hover:border-[#D9A52E] transition">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#A87519] uppercase tracking-wider">
                      {les.targetExam}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#061426] line-clamp-1">{les.title}</h4>
                    <p className="text-xs text-[#687386] line-clamp-1">{les.moduleTitle}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E3D8BE]/60 flex items-center justify-between">
                    <span className="text-[11px] text-[#687386] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#D9A52E]" /> {les.duration}
                    </span>
                    <Link
                      to={`/learn/${les.courseSlug}/${les.id}`}
                      className="px-3 py-1.5 bg-[#061426] text-white hover:bg-[#D9A52E] hover:text-[#061426] rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Resume
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Demo Notice */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <strong>Interactive Educational Player Integration:</strong> Video lectures utilize authorized sample streaming nodes with real-time scrubbers, duration counters, lesson notes, and enrollment entitlement gates.
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto mb-3" />
            <p className="text-sm text-[#687386]">Loading lectures catalog...</p>
          </div>
        )}

        {/* Course-Wise Lecture Catalog */}
        {!isLoading && (
          <div className="space-y-12">
            {filteredCourses.map((course) => {
              const owned = Boolean(user) && (isCourseOwned(String(course.id)) || (user?.enrolledCourseIds?.includes(course.id)) || Boolean(course.is_enrolled));
              const allLessonsInCourse = (course.curriculum || []).flatMap(m => m.lessons.map(l => ({ ...l, moduleName: m.title })));
              const priceNum = course.price ? parseFloat(course.price) : 0;
              const origPriceNum = course.original_price ? parseFloat(course.original_price) : undefined;

              return (
                <div key={course.id} className="bg-white rounded-2xl border border-[#E3D8BE] shadow-sm p-6 sm:p-8 space-y-6">
                  
                  {/* Course Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3D8BE]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#A87519] uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#F8F4EA] border border-[#E3D8BE]">
                          {course.target_exam}
                        </span>
                        {course.badge && (
                          <span className="text-[10px] font-bold bg-[#D9A52E] text-[#061426] px-2 py-0.5 rounded">
                            {course.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-bold text-2xl text-[#061426]">
                        {course.title}
                      </h3>
                      <p className="text-xs text-[#687386]">
                        {(course.curriculum || []).length} Modules • {allLessonsInCourse.length} HD Lectures • Bilingual Delivery
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {course.is_paid && priceNum > 0 && !owned && (
                        <div className="text-right">
                          <div className="text-xs text-[#687386]">Batch Enrollment</div>
                          <div className="font-serif font-bold text-lg text-[#061426]">₹{priceNum.toLocaleString('en-IN')}</div>
                        </div>
                      )}
                      <Link
                        to={`/courses/${course.slug}`}
                        className="btn-sims-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1"
                      >
                        <span>View Course Syllabus</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Grid of Lecture Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {allLessonsInCourse.map((lesson, lIdx) => {
                      const canAccess = !course.is_paid || owned || lesson.is_free_preview || lesson.is_locked === false;
                      const isCompleted = user?.completedLessonIds.includes(lesson.id) || false;

                      return (
                        <div
                          key={lesson.id}
                          className="bg-[#FFF9ED] rounded-xl border border-[#E3D8BE] overflow-hidden flex flex-col justify-between hover:border-[#D9A52E] transition-all duration-200 group shadow-sm hover:shadow-md"
                        >
                          {/* Video Thumbnail Simulation */}
                          <div className="aspect-video bg-gradient-to-tr from-[#061426] to-[#1A365D] relative p-4 flex flex-col justify-between text-white overflow-hidden">
                            <div className="flex items-center justify-between text-[11px] relative z-10">
                              <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur text-white/80">
                                Lec {lIdx + 1}
                              </span>
                              <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur text-white/80 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#D9A52E]" /> {lesson.duration}
                              </span>
                            </div>

                            {/* Center Play / Lock Button */}
                            <div className="relative z-10 flex items-center justify-center py-2">
                              {canAccess ? (
                                <Link
                                  to={`/learn/${course.slug}/${lesson.id}`}
                                  className="w-12 h-12 rounded-full bg-[#D9A52E] text-[#061426] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#F0C45B] transition shadow-lg"
                                  aria-label={`Play ${lesson.title}`}
                                >
                                  <Play className="w-5 h-5 ml-0.5" />
                                </Link>
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 text-white/70 flex items-center justify-center shadow">
                                  <Lock className="w-5 h-5 text-[#D9A52E]" />
                                </div>
                              )}
                            </div>

                            <div className="relative z-10 flex items-center justify-between text-[10px]">
                              <span className="text-[#F0C45B] truncate max-w-[150px]">
                                {lesson.moduleName}
                              </span>
                              {isCompleted && (
                                <span className="bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                                  <CheckCircle2 className="w-3 h-3" /> Watched
                                </span>
                              )}
                              {!canAccess && (
                                <span className="bg-black/70 text-[#E3D8BE] px-1.5 py-0.5 rounded">
                                  Enrolled Only
                                </span>
                              )}
                              {lesson.is_free_preview && course.is_paid && !owned && (
                                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold shadow-sm">
                                  Free Preview
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Info */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <h4 className="font-serif font-bold text-sm text-[#061426] group-hover:text-[#A87519] transition leading-snug line-clamp-2">
                                {lesson.title}
                              </h4>
                              <p className="text-xs text-[#687386] mt-1 line-clamp-2 font-normal">
                                {lesson.summary}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-[#E3D8BE]/60 flex items-center justify-between text-xs">
                              <span className="text-[#687386] flex items-center gap-1 text-[11px]">
                                <User className="w-3.5 h-3.5 text-[#D9A52E]" /> {lesson.instructor_name || 'SIMS Faculty'}
                              </span>

                              {canAccess ? (
                                <Link
                                  to={`/learn/${course.slug}/${lesson.id}`}
                                  className="font-bold text-[#A87519] hover:underline flex items-center gap-1"
                                >
                                  <span>{lesson.is_free_preview && course.is_paid && !owned ? 'Watch Preview' : 'Watch Lecture'}</span>
                                  <Play className="w-3 h-3" />
                                </Link>
                              ) : (
                                <button
                                  onClick={() => openCheckout({
                                    id: String(course.id),
                                    type: 'course',
                                    title: course.title,
                                    subtitle: course.subtitle,
                                    price: priceNum,
                                    originalPrice: origPriceNum,
                                  })}
                                  className="font-bold text-[#061426] hover:text-[#A87519] flex items-center gap-1 transition"
                                >
                                  <Lock className="w-3 h-3 text-[#D9A52E]" />
                                  <span>Unlock Course</span>
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
