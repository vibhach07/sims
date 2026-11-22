import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCourses } from '../../contexts/CourseContext';
import { CourseCard } from '../../components/courses/CourseCard';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { CourseCategory } from '../../types';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { courses, categories, getCategoryBySlug, isLoading } = useCourses();

  const categoryFromBackend = slug ? getCategoryBySlug(slug) : undefined;
  const filteredCourses = courses.filter(c => c.category === slug);

  if (isLoading && !categoryFromBackend) {
    return (
      <div className="py-20 text-center text-[#687386]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A87519] mx-auto mb-4" />
        <p className="font-serif text-lg">Loading category details...</p>
      </div>
    );
  }

  const title = categoryFromBackend?.name || (slug ? slug.replace(/-/g, ' ').toUpperCase() : 'Category');
  const description = categoryFromBackend?.description || 'Explore specialized courses and structured learning pathways in this stream.';

  if (!categoryFromBackend && !isLoading && filteredCourses.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="font-serif text-2xl font-bold">Category Not Found</h2>
        <Link to="/courses" className="text-[#A87519] underline mt-3 inline-block">
          View all courses
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 bg-[#FFF9ED] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#687386]">
          <Link to="/" className="hover:text-[#061426]">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/courses" className="hover:text-[#061426]">Courses</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#061426] font-semibold">{title}</span>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-[#061426] via-[#091B31] to-[#102846] text-white p-8 sm:p-12 rounded-2xl border-2 border-[#D9A52E]/30 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D9A52E] px-3 py-1 rounded bg-white/10">
            Category Focus
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#FFF9ED]">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-[#E3D8BE] max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>

        {/* Course Cards Grid */}
        <div>
          <h2 className="font-serif font-bold text-2xl text-[#061426] mb-6">
            Available Courses in this Stream ({filteredCourses.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-6 border-t border-[#E3D8BE]">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#061426] hover:text-[#A87519]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Explore All Categories</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
