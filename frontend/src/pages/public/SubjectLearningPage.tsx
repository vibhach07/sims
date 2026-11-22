import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, Video, FileText, CheckCircle2, ChevronRight,
  ArrowLeft, Lock, PlayCircle, Loader2, Sparkles, AlertCircle
} from 'lucide-react';
import { CoursesAPI } from '../../services/api';
import { APISubjectLearningDetail } from '../../types';

export const SubjectLearningPage: React.FC = () => {
  const { slug, subjectSlug } = useParams<{ slug: string; subjectSlug: string }>();
  const [detail, setDetail] = useState<APISubjectLearningDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'resources' | 'tests'>('modules');

  useEffect(() => {
    if (!slug || !subjectSlug) return;
    setIsLoading(true);
    CoursesAPI.subjectDetail(slug, subjectSlug)
      .then(data => setDetail(data))
      .catch(err => setError(err.message ?? 'Subject details not found'))
      .finally(() => setIsLoading(false));
  }, [slug, subjectSlug]);

  if (isLoading) {
    return (
      <div className="py-24 text-center bg-[#FFF9ED] min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto mb-3" />
        <p className="text-sm text-[#687386]">Loading subject syllabus &amp; learning modules…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-24 text-center max-w-xl mx-auto px-4 bg-[#FFF9ED] min-h-screen">
        <h2 className="font-serif text-2xl font-bold text-[#061426] mb-3">Subject Not Found</h2>
        <p className="text-sm text-[#687386] mb-6">{error ?? 'Unable to find syllabus details for this subject.'}</p>
        <Link to={slug ? `/courses/${slug}` : '/courses'} className="px-5 py-2.5 rounded-lg bg-[#061426] text-white text-sm font-semibold">
          Return to Course
        </Link>
      </div>
    );
  }

  const allLectures = detail.modules.flatMap((m: any) => m.lessons || []);

  return (
    <div className="bg-[#FFF9ED] min-h-screen pb-20">
      
      {/* 1. Header Hero Banner */}
      <section className="bg-gradient-to-r from-[#061426] via-[#091B31] to-[#102846] text-white py-10 lg:py-14 border-b border-[#D9A52E]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#E3D8BE]/70 flex-wrap">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/courses" className="hover:text-white">Courses</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/courses/${slug}`} className="hover:text-white">{detail.course?.title || slug}</Link>
            {detail.track && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#E3D8BE]">{detail.track.name}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#D9A52E] font-medium">{detail.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <div>
              <span className="inline-block px-3 py-1 rounded bg-white/10 text-[#F0C45B] text-xs font-semibold uppercase tracking-wider border border-white/5 mb-2">
                {detail.track?.code ? `Paper: ${detail.track.code}` : 'Subject Focus'}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#FFF9ED]">
                {detail.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#E3D8BE] mt-1.5 max-w-2xl leading-relaxed">
                {detail.description || `Comprehensive syllabus coverage for ${detail.name}.`}
              </p>
            </div>

            <Link
              to={`/courses/${slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 self-start md:self-auto transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Course</span>
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6 pt-4 text-xs text-[#F0C45B]">
            <div><span className="font-bold text-white text-sm">{detail.modules.length}</span> Modules</div>
            <div>•</div>
            <div><span className="font-bold text-white text-sm">{allLectures.length}</span> Lectures</div>
            <div>•</div>
            <div><span className="font-bold text-white text-sm">{detail.study_resources.length}</span> Study Notes</div>
            <div>•</div>
            <div><span className="font-bold text-white text-sm">{detail.test_series.length}</span> Practice Tests</div>
          </div>

        </div>
      </section>

      {/* 2. Main Content Tabs & View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E3D8BE]">
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'modules'
                ? 'border-[#061426] text-[#061426]'
                : 'border-transparent text-[#687386] hover:text-[#061426]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Modules &amp; Lectures ({detail.modules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'resources'
                ? 'border-[#061426] text-[#061426]'
                : 'border-transparent text-[#687386] hover:text-[#061426]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Study Material ({detail.study_resources.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'tests'
                ? 'border-[#061426] text-[#061426]'
                : 'border-transparent text-[#687386] hover:text-[#061426]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Test Series ({detail.test_series.length})</span>
          </button>
        </div>

        {/* Tab 1: Modules & Lectures */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            {detail.modules.map((mod: any) => (
              <div key={mod.id} className="bg-white rounded-2xl border border-[#E3D8BE] shadow-sm overflow-hidden">
                <div className="bg-[#F8F4EA] p-4 sm:p-5 flex items-center justify-between border-b border-[#E3D8BE]">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#061426]">{mod.title}</h3>
                    {mod.description && (
                      <p className="text-xs text-[#687386] mt-0.5">{mod.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-white rounded-lg border border-[#E3D8BE] text-[#A87519]">
                    {mod.lessons?.length || 0} Lessons
                  </span>
                </div>

                <div className="p-4 sm:p-5 space-y-2.5">
                  {mod.lessons && mod.lessons.length > 0 ? (
                    mod.lessons.map((lesson: any, lIdx: number) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFF9ED] border border-[#E3D8BE]/50 hover:border-[#D9A52E] transition"
                      >
                        <div className="flex items-center gap-3">
                          <PlayCircle className="w-4 h-4 text-[#D9A52E] flex-shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-[#061426]">{lesson.title}</h4>
                            {lesson.summary && (
                              <p className="text-[11px] text-[#687386] line-clamp-1">{lesson.summary}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[11px] text-[#687386]">{lesson.duration}</span>
                          <Link
                            to={`/learn/${slug}/${lesson.id}`}
                            className="text-xs font-bold text-[#A87519] hover:underline"
                          >
                            Watch &rarr;
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-[#687386] bg-[#FFF9ED]/40 rounded-xl border border-dashed border-[#E3D8BE]">
                      <Video className="w-8 h-8 text-[#A87519]/50 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-[#061426]">Live Recordings &amp; Lectures in Progress</p>
                      <p className="text-[11px] text-[#687386] mt-0.5">Faculty is recording and curating lectures for this module.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {detail.modules.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#E3D8BE] p-12 text-center text-[#687386]">
                <BookOpen className="w-10 h-10 text-[#A87519]/50 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-lg text-[#061426]">Curriculum Architecture Staged</h3>
                <p className="text-xs text-[#687386] max-w-md mx-auto mt-1">
                  Subject modules for {detail.name} are mapped to official exam syllabus guidelines. Classroom live sessions and lecture video recordings will be unlocked as scheduled.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Study Resources */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            {detail.study_resources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {detail.study_resources.map((res: any) => (
                  <div key={res.id} className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A87519] px-2 py-0.5 rounded bg-[#F8F4EA]">
                      {res.resource_type || 'Study Notes'}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#061426]">{res.title}</h4>
                    <p className="text-xs text-[#687386] line-clamp-2">{res.description}</p>
                    {res.is_entitled !== false && (res.download_url || res.file_url) ? (
                      <a
                        href={res.download_url || res.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs font-bold text-[#A87519] hover:underline"
                      >
                        Download Material &rarr;
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#687386]">
                        <Lock className="w-3 h-3 text-[#A87519]" /> Enrolled Students Only
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E3D8BE] p-12 text-center text-[#687386]">
                <FileText className="w-10 h-10 text-[#A87519]/50 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-lg text-[#061426]">Curated Study Sheets &amp; PYQs In Preparation</h3>
                <p className="text-xs text-[#687386] max-w-md mx-auto mt-1">
                  Topic-wise formula sheets and 10-year question banks for {detail.name} are uploaded in batch synchronizations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Test Series */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            {detail.test_series.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {detail.test_series.map((test: any) => (
                  <div key={test.id} className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A87519] px-2 py-0.5 rounded bg-[#F8F4EA]">
                      {test.exam} CBT Test
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#061426]">{test.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-[#687386]">
                      <span>{test.total_questions || 30} Qs</span>
                      <span>•</span>
                      <span>{test.duration_minutes || 60} Mins</span>
                    </div>
                    <Link
                      to={`/tests/${test.slug}`}
                      className="inline-block text-xs font-bold text-[#A87519] hover:underline"
                    >
                      Take Mock Test &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E3D8BE] p-12 text-center text-[#687386]">
                <CheckCircle2 className="w-10 h-10 text-[#A87519]/50 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-lg text-[#061426]">Topic Diagnostic Drills In Authoring</h3>
                <p className="text-xs text-[#687386] max-w-md mx-auto mt-1">
                  Timed practice quizzes and sectional evaluation tests for {detail.name} will be scheduled as syllabus modules progress.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
