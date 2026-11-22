import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CoursesAPI, APICourse, APICourseDetail } from '../services/api';

// ----------------------------------------------------------------
// CourseContext — wraps the backend courses API.
// Components that previously consumed StorageService/hardcoded data
// now consume this context without changing their JSX structure.
// ----------------------------------------------------------------

interface CourseContextType {
  courses: APICourse[];
  categories: import('../types').APICourseCategory[];
  isLoading: boolean;
  error: string | null;
  getCourseBySlug: (slug: string) => APICourse | undefined;
  getCourseById: (id: string | number) => APICourse | undefined;
  getCategoryBySlug: (slug: string) => import('../types').APICourseCategory | undefined;
  fetchCourseDetail: (slug: string) => Promise<APICourseDetail>;
  refreshCourses: (params?: { category?: string; search?: string; my_courses?: boolean }) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<APICourse[]>([]);
  const [categories, setCategories] = useState<import('../types').APICourseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCategories = useCallback(async () => {
    try {
      const data = await CoursesAPI.categories();
      setCategories(data);
    } catch (err: any) {
      console.warn('Failed to load course categories:', err);
    }
  }, []);

  const refreshCourses = useCallback(async (params?: { category?: string; search?: string; my_courses?: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await CoursesAPI.list(params);
      setCourses(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCourses();
    refreshCategories();
  }, [refreshCourses, refreshCategories]);

  const getCourseBySlug = useCallback((slug: string) =>
    courses.find(c => c.slug.toLowerCase() === slug.toLowerCase()),
  [courses]);

  const getCourseById = useCallback((id: string | number) =>
    courses.find(c => c.id === Number(id)),
  [courses]);

  const getCategoryBySlug = useCallback((slug: string) =>
    categories.find(c => c.slug.toLowerCase() === slug.toLowerCase()),
  [categories]);

  const fetchCourseDetail = useCallback((slug: string) =>
    CoursesAPI.detail(slug),
  []);

  return (
    <CourseContext.Provider value={{
      courses,
      categories,
      isLoading,
      error,
      getCourseBySlug,
      getCourseById,
      getCategoryBySlug,
      fetchCourseDetail,
      refreshCourses,
      refreshCategories,
    }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (!context) throw new Error('useCourses must be used within CourseProvider');
  return context;
};
