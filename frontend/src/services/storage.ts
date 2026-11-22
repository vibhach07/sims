import { Course, StudentUser, TestResult, ContactEnquiry } from '../types';
import { COURSES_DATA } from '../data/courses';

const STORAGE_KEYS = {
  USER: 'sims_demo_user',
  COURSES: 'sims_demo_courses',
  RESULTS: 'sims_demo_test_results',
  ENQUIRIES: 'sims_demo_enquiries',
};

const DEFAULT_DEMO_STUDENT: StudentUser = {
  id: 'student-demo-1',
  name: 'Aarav Sharma',
  email: 'student@example.com',
  phone: '9876543210',
  targetExam: 'GATE 2027',
  enrolledCourseIds: ['course-gate', 'course-iit-jam'],
  completedLessonIds: ['les-g1-1'],
  bookmarkedLessonIds: ['les-g1-2', 'les-jam1-1'],
  avatar: ''
};

const DEFAULT_ENQUIRIES: ContactEnquiry[] = [
  {
    id: 'enq-1',
    name: 'Pooja Verma',
    email: 'pooja.v@example.com',
    phone: '8959700011',
    courseInterested: 'GATE — Graduate Aptitude Test in Engineering',
    message: 'Seeking weekend batch details for Engineering Mathematics and CS branch.',
    date: '2026-10-12',
    status: 'new'
  },
  {
    id: 'enq-2',
    name: 'Rohan Dewangan',
    email: 'rohan.d@example.com',
    phone: '9425200022',
    courseInterested: 'NIMCET — NIT MCA Common Entrance Test',
    message: 'Want to know if test series can be taken from home with live doubt sessions.',
    date: '2026-10-14',
    status: 'contacted'
  }
];

export const StorageService = {
  // Auth / User
  getUser(): StudentUser | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    if (!data) {
      // Initialize default logged out state
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  loginDemoUser(): StudentUser {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_DEMO_STUDENT));
    return DEFAULT_DEMO_STUDENT;
  },

  logoutUser(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  updateUserProfile(updated: Partial<StudentUser>): StudentUser {
    const current = this.getUser() || DEFAULT_DEMO_STUDENT;
    const merged = { ...current, ...updated };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
    return merged;
  },

  toggleCompleteLesson(lessonId: string): boolean {
    const user = this.getUser() || DEFAULT_DEMO_STUDENT;
    const exists = user.completedLessonIds.includes(lessonId);
    if (exists) {
      user.completedLessonIds = user.completedLessonIds.filter(id => id !== lessonId);
    } else {
      user.completedLessonIds.push(lessonId);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return !exists;
  },

  toggleBookmarkLesson(lessonId: string): boolean {
    const user = this.getUser() || DEFAULT_DEMO_STUDENT;
    const exists = user.bookmarkedLessonIds.includes(lessonId);
    if (exists) {
      user.bookmarkedLessonIds = user.bookmarkedLessonIds.filter(id => id !== lessonId);
    } else {
      user.bookmarkedLessonIds.push(lessonId);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return !exists;
  },

  // Courses (supports adding/editing by educator/admin)
  getCourses(): Course[] {
    const data = localStorage.getItem(STORAGE_KEYS.COURSES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(COURSES_DATA));
      return COURSES_DATA;
    }
    try {
      return JSON.parse(data);
    } catch {
      return COURSES_DATA;
    }
  },

  saveCourse(course: Course): void {
    const courses = this.getCourses();
    const index = courses.findIndex(c => c.id === course.id);
    if (index >= 0) {
      courses[index] = course;
    } else {
      courses.unshift(course);
    }
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  deleteCourse(courseId: string): void {
    const courses = this.getCourses().filter(c => c.id !== courseId);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  // Test Results
  getTestResults(): TestResult[] {
    const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveTestResult(result: TestResult): void {
    const results = this.getTestResults();
    results.unshift(result);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  },

  // Enquiries
  getEnquiries(): ContactEnquiry[] {
    const data = localStorage.getItem(STORAGE_KEYS.ENQUIRIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(DEFAULT_ENQUIRIES));
      return DEFAULT_ENQUIRIES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_ENQUIRIES;
    }
  },

  saveEnquiry(enquiry: Omit<ContactEnquiry, 'id' | 'date' | 'status'>): ContactEnquiry {
    const enquiries = this.getEnquiries();
    const newEnquiry: ContactEnquiry = {
      ...enquiry,
      id: 'enq-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      status: 'new'
    };
    enquiries.unshift(newEnquiry);
    localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(enquiries));
    return newEnquiry;
  }
};
