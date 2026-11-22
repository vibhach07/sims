import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CoursesAPI, APICourseDetail } from '../../services/api';
import { Bookmark, PlayCircle, Trash2, Loader2 } from 'lucide-react';

export const BookmarksPage: React.FC = () => {
  const { user, toggleBookmarkLesson } = useAuth();
  const [courses, setCourses] = useState<APICourseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    CoursesAPI.videoDiscovery()
      .then(data => setCourses(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Find all bookmarked lessons
  const bookmarkedItems: { courseSlug: string; courseTitle: string; lesson: any }[] = [];

  courses.forEach(c => {
    (c.curriculum || []).forEach(m => {
      m.lessons.forEach(l => {
        if (user?.bookmarkedLessonIds.includes(l.id)) {
          bookmarkedItems.push({
            courseSlug: c.slug,
            courseTitle: c.title,
            lesson: l
          });
        }
      });
    });
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto mb-3" />
        <p className="text-sm text-[#687386]">Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-bold text-3xl text-[#061426]">
          Bookmarked Lessons &amp; Resources
        </h1>
        <p className="text-sm text-[#687386] mt-1">
          Quickly access lectures and revision notes saved for later review.
        </p>
      </div>

      {bookmarkedItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookmarkedItems.map(({ courseSlug, courseTitle, lesson }) => (
            <div 
              key={lesson.id}
              className="bg-white rounded-2xl border-2 border-[#E3D8BE] hover:border-[#D9A52E] p-6 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[#A87519] uppercase tracking-wide">
                  {courseTitle.split('—')[0]}
                </span>
                <h3 className="font-serif font-bold text-xl text-[#061426]">
                  {lesson.title}
                </h3>
                <p className="text-xs text-[#687386] line-clamp-2">
                  {lesson.summary}
                </p>
                <div className="text-xs text-[#687386] pt-1">
                  Duration: {lesson.duration}
                </div>
              </div>

              <div className="pt-6 border-t border-[#E3D8BE]/50 flex items-center justify-between">
                <button
                  onClick={() => toggleBookmarkLesson(lesson.id)}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>

                <Link
                  to={`/learn/${courseSlug}/${lesson.id}`}
                  className="px-4 py-2 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Resume Lesson
                </Link>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E3D8BE] p-12 text-center space-y-4">
          <Bookmark className="w-12 h-12 text-[#687386] mx-auto opacity-40" />
          <h3 className="font-serif font-bold text-xl text-[#061426]">No Bookmarks Saved Yet</h3>
          <p className="text-xs text-[#687386] max-w-sm mx-auto">
            You can bookmark any video lesson inside the online classroom to quickly revisit it before your exams.
          </p>
          <Link
            to="/student/my-courses"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#061426] text-white text-xs font-semibold"
          >
            Explore Enrolled Courses
          </Link>
        </div>
      )}

    </div>
  );
};
