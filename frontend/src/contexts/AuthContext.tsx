import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthAPI, CoursesAPI, tokenStore, APIUser, APILectureProgress } from '../services/api';

// --------------- Shared types --------------------------------

export interface AuthUser {
  id: number;
  name: string;           // first_name + last_name
  email: string;
  phone: string;
  targetExam: string;
  avatar: string;
  enrolledCourseIds: number[];
  completedLessonIds: number[];
  bookmarkedLessonIds: number[];
  /** lecture_id → last_position_seconds (for resume playback) */
  lecturePositions: Record<number, number>;
  role: 'student' | 'educator' | 'staff' | 'admin' | 'superadmin' | string;
  isStaff: boolean;
  isSuperuser: boolean;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, portal?: 'student' | 'educator') => Promise<AuthUser>;
  loginWithGoogle: (credential: string, portal?: 'student' | 'educator') => Promise<AuthUser>;
  register: (data: { email: string; password: string; first_name: string; last_name?: string; name?: string; phone?: string; target_exam?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updated: Partial<Pick<AuthUser, 'phone' | 'targetExam' | 'avatar' | 'name'>>) => Promise<void>;
  toggleCompleteLesson: (lessonId: number, lastPositionSeconds?: number) => Promise<boolean>;
  toggleBookmarkLesson: (lessonId: number) => void;
}

// --------------- Helpers -------------------------------------

function mapAPIUser(apiUser: APIUser & { is_staff?: boolean; is_superuser?: boolean }): AuthUser {
  return {
    id: apiUser.id,
    name: [apiUser.first_name, apiUser.last_name].filter(Boolean).join(' ') || apiUser.username,
    email: apiUser.email,
    phone: apiUser.profile?.phone ?? '',
    targetExam: apiUser.profile?.target_exam ?? '',
    avatar: apiUser.profile?.avatar ?? '',
    enrolledCourseIds: [],      // refreshed after login
    completedLessonIds: [],     // populated from backend on login
    lecturePositions: {},       // populated from backend on login
    bookmarkedLessonIds: JSON.parse(localStorage.getItem('sims_bookmarks') ?? '[]'),
    role: (apiUser as any).role ?? (apiUser.profile as any)?.role ?? 'student',
    isStaff: (apiUser as any).is_staff ?? false,
    isSuperuser: (apiUser as any).is_superuser ?? false,
    isEmailVerified: apiUser.profile?.is_email_verified ?? false,
  };
}

async function fetchEnrolledIds(): Promise<number[]> {
  try {
    const courses = await CoursesAPI.myCourses();
    return courses.map(c => c.id);
  } catch {
    return [];
  }
}

async function fetchLectureProgress(): Promise<{
  completedIds: number[];
  positions: Record<number, number>;
}> {
  try {
    const records: APILectureProgress[] = await CoursesAPI.myLectureProgress();
    const completedIds = records.filter(r => r.is_completed).map(r => r.lecture_id);
    const positions: Record<number, number> = {};
    records.forEach(r => { positions[r.lecture_id] = r.last_position_seconds; });
    return { completedIds, positions };
  } catch {
    return { completedIds: [], positions: {} };
  }
}

// --------------- Context -------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session if token exists
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    AuthAPI.me()
      .then(async (apiUser) => {
        const mapped = mapAPIUser(apiUser as any);
        const [ids, prog] = await Promise.all([fetchEnrolledIds(), fetchLectureProgress()]);
        setUser({
          ...mapped,
          enrolledCourseIds: ids,
          completedLessonIds: prog.completedIds,
          lecturePositions: prog.positions,
        });
      })
      .catch(() => {
        tokenStore.clear();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, portal?: 'student' | 'educator') => {
    const { token, user: apiUser } = await AuthAPI.login(email, password, portal);
    tokenStore.set(token);
    const mapped = mapAPIUser(apiUser as any);
    const [ids, prog] = await Promise.all([fetchEnrolledIds(), fetchLectureProgress()]);
    const fullUser: AuthUser = {
      ...mapped,
      enrolledCourseIds: ids,
      completedLessonIds: prog.completedIds,
      lecturePositions: prog.positions,
    };
    setUser(fullUser);
    return fullUser;
  }, []);

  const loginWithGoogle = useCallback(async (credential: string, portal?: 'student' | 'educator') => {
    const { token, user: apiUser } = await AuthAPI.googleLogin(credential, portal);
    tokenStore.set(token);
    const mapped = mapAPIUser(apiUser as any);
    const [ids, prog] = await Promise.all([fetchEnrolledIds(), fetchLectureProgress()]);
    const fullUser: AuthUser = {
      ...mapped,
      enrolledCourseIds: ids,
      completedLessonIds: prog.completedIds,
      lecturePositions: prog.positions,
    };
    setUser(fullUser);
    return fullUser;
  }, []);

  const register = useCallback(async (data: { email: string; password: string; first_name: string; last_name?: string; name?: string; phone?: string; target_exam?: string }) => {
    const { token, user: apiUser } = await AuthAPI.register(data);
    tokenStore.set(token);
    const mapped = mapAPIUser(apiUser as any);
    setUser({ ...mapped, enrolledCourseIds: [] });
  }, []);

  const logout = useCallback(() => {
    AuthAPI.logout().catch(() => {});
    tokenStore.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (updated: Partial<Pick<AuthUser, 'phone' | 'targetExam' | 'avatar' | 'name'>>) => {
    const apiUser = await AuthAPI.updateProfile({
      phone: updated.phone,
      target_exam: updated.targetExam,
      avatar: updated.avatar,
      name: updated.name,
    });
    const mapped = mapAPIUser(apiUser as any);
    setUser(prev => prev ? {
      ...prev,
      ...mapped,
      ...(updated.avatar !== undefined ? { avatar: mapped.avatar || updated.avatar } : {})
    } : null);
  }, []);

  const toggleCompleteLesson = useCallback(async (lessonId: number, lastPositionSeconds?: number): Promise<boolean> => {
    try {
      const res = await CoursesAPI.toggleLectureProgress(lessonId, lastPositionSeconds);
      setUser(prev => {
        if (!prev) return prev;
        const completed = prev.completedLessonIds;
        const next = res.is_completed
          ? [...completed, lessonId]
          : completed.filter(id => id !== lessonId);
        return { ...prev, completedLessonIds: next };
      });
      return res.is_completed;
    } catch {
      return false;
    }
  }, []);

  const toggleBookmarkLesson = useCallback((lessonId: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const bookmarks = prev.bookmarkedLessonIds;
      const next = bookmarks.includes(lessonId)
        ? bookmarks.filter(id => id !== lessonId)
        : [...bookmarks, lessonId];
      localStorage.setItem('sims_bookmarks', JSON.stringify(next));
      return { ...prev, bookmarkedLessonIds: next };
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
      toggleCompleteLesson,
      toggleBookmarkLesson,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
