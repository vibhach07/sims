import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FacultyAPI, APIFaculty } from '../../services/api';
import { useCourses } from '../../contexts/CourseContext';
import { CourseCard } from '../../components/courses/CourseCard';
import { ChevronRight, ArrowLeft, GraduationCap, Award, BookOpen, Loader2, AlertCircle } from 'lucide-react';

export const FacultyProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { courses } = useCourses();

  const [faculty, setFaculty] = useState<APIFaculty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    FacultyAPI.detail(slug)
      .then(data => setFaculty(data))
      .catch(err => setError(err.message || 'Faculty member not found.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading faculty profile...</p>
      </div>
    );
  }

  if (error || !faculty) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#061426]">Faculty Member Not Found</h2>
        <p className="text-xs text-[#687386]">{error || 'The requested educator profile does not exist.'}</p>
        <Link to="/faculty" className="text-[#A87519] font-bold underline inline-block">
          Return to Faculty Directory
        </Link>
      </div>
    );
  }

  // Find courses taught by this faculty member
  const taughtCourses = courses.filter(c => (faculty.coursesTaught || []).includes(c.slug));

  return (
    <div className="py-12 bg-[#FFF9ED] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#687386]">
          <Link to="/" className="hover:text-[#061426]">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/faculty" className="hover:text-[#061426]">Faculty</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#061426] font-semibold">{faculty.name}</span>
        </div>

        {/* Profile Hero Card */}
        <div className="bg-white rounded-3xl border-2 border-[#E3D8BE] overflow-hidden shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="aspect-[4/5] bg-gray-100">
              <img 
                src={faculty.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.name)}&background=061426&color=D9A52E&size=400`} 
                alt={faculty.name} 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.name)}&background=061426&color=D9A52E&size=400`;
                }}
                className="w-full h-full object-cover object-top" 
              />
            </div>

            <div className="p-8 sm:p-10 md:col-span-2 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#A87519] uppercase tracking-wider">
                    {faculty.role}
                  </span>
                  <h1 className="font-serif font-extrabold text-3xl sm:text-4xl text-[#061426]">
                    {faculty.name}
                  </h1>
                  <p className="text-sm font-semibold text-[#687386]">
                    {faculty.qualification}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F4EA] border border-[#E3D8BE] text-xs font-semibold text-[#263347]">
                    <Award className="w-4 h-4 text-[#A87519]" />
                    <span>{faculty.experience} Experience</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F4EA] border border-[#E3D8BE] text-xs font-semibold text-[#263347]">
                    <GraduationCap className="w-4 h-4 text-[#A87519]" />
                    <span>Specialization: {faculty.specialization}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E3D8BE]/50">
                  <h3 className="font-serif font-bold text-lg text-[#061426] mb-2">
                    Academic Biography & Pedagogy
                  </h3>
                  <p className="text-sm text-[#263347] leading-relaxed whitespace-pre-line">
                    {faculty.bio}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E3D8BE]/50 flex items-center justify-between">
                <Link
                  to="/faculty"
                  className="inline-flex items-center gap-1.5 text-xs text-[#A87519] font-bold hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to all faculty
                </Link>
                <Link
                  to="/contact"
                  className="px-5 py-2.5 rounded-xl bg-[#061426] hover:bg-[#263347] text-white font-bold text-xs shadow transition"
                >
                  Enquire for Mentorship
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Courses Taught by Faculty */}
        {taughtCourses.length > 0 && (
          <div className="space-y-6 pt-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A87519]">Curriculum Portfolio</span>
              <h2 className="font-serif font-bold text-2xl text-[#061426] mt-1">
                Courses Led by {faculty.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {taughtCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
