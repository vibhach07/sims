import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, BookOpen, Loader2 } from 'lucide-react';
import { useCourses } from '../../contexts/CourseContext';
import { CourseCard } from '../../components/courses/CourseCard';
import { APICourse } from '../../services/api';

export const CoursesPage: React.FC = () => {
  const { courses, categories, isLoading, error, refreshCourses } = useCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'category'>('title');
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    return courses
      .filter(course => {
        const matchesSearch = 
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.target_exam.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.short_description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = 
          selectedCategory === 'all' || course.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else {
          return a.category_label.localeCompare(b.category_label);
        }
      });
  }, [courses, searchQuery, selectedCategory, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('title');
    setSelectedCourseSlug(null);
  };

  return (
    <div className="py-12 bg-[#FFF9ED] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519] bg-[#F8F4EA] px-3.5 py-1 rounded-full border border-[#E3D8BE]">
            All Official Courses
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-[#061426]">
            Competitive Examination Programs
          </h1>
          <p className="text-[#687386] text-sm sm:text-base">
            Every course offered at SIMS Raipur — including After MSc/B.Tech, Post Graduate Entrance, and Career &amp; Foundation tracks.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
              <input
                type="text"
                placeholder="Search by exam (GATE, NET, IIT-JAM, JEE...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none focus:ring-1 focus:ring-[#D9A52E] text-sm"
              />
            </div>

            {/* Category Select */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none focus:ring-1 focus:ring-[#D9A52E] text-sm bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name} ({cat.courses_count || courses.filter(c => c.category === cat.slug).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'title' | 'category')}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none focus:ring-1 focus:ring-[#D9A52E] text-sm bg-white"
              >
                <option value="title">Sort: Title</option>
                <option value="category">Sort: Category</option>
              </select>
            </div>

          </div>

          {/* Active stats & clear action */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E3D8BE]/50 text-xs text-[#687386]">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Loading courses…</span>
              ) : (
                <span>Showing <strong className="text-[#061426]">{filteredCourses.length}</strong> of {courses.length} courses</span>
              )}
            </div>
            
            {(searchQuery || selectedCategory !== 'all' || selectedCourseSlug) && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[#A87519] hover:text-[#061426] font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center justify-between">
            <span>Failed to load courses: {error}</span>
            <button onClick={() => refreshCourses()} className="text-xs font-semibold underline">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="sims-card overflow-hidden animate-pulse">
                <div className="h-28 bg-[#102846]/40" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-[#E3D8BE] rounded w-3/4" />
                  <div className="h-3 bg-[#E3D8BE] rounded w-1/2" />
                  <div className="h-3 bg-[#E3D8BE] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Course Grid */}
        {!isLoading && filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course}
                isSelected={selectedCourseSlug === course.slug}
                onSelect={(c) => setSelectedCourseSlug(prev => prev === c.slug ? null : c.slug)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredCourses.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E3D8BE] p-12 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-[#687386] mx-auto opacity-50" />
            <h3 className="font-serif font-bold text-xl text-[#061426]">No Courses Match Your Filter</h3>
            <p className="text-sm text-[#687386] max-w-md mx-auto">
              We couldn't find any course matching your current criteria. Try resetting the filters or searching for terms like "GATE", "NET", or "JEE".
            </p>
            <button
              onClick={resetFilters}
              className="btn-sims-secondary px-5 py-2.5 text-xs font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
