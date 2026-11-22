export type CourseCategory = 
  | 'after-msc-btech'
  | 'post-graduate-entrance'
  | 'career-foundation';

export interface APICourseCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  order: number;
  is_active: boolean;
  courses_count: number;
}

export interface APISubjectHierarchy {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
  is_active: boolean;
  modules_count: number;
  lectures_count: number;
  resources_count: number;
  test_series_count: number;
}

export interface APICourseTrack {
  id: number;
  name: string;
  code: string;
  slug: string;
  description: string;
  eligibility: string;
  order: number;
  is_active: boolean;
  subjects: APISubjectHierarchy[];
}

export interface APICourseHierarchy {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  category_ref?: number;
  category_name?: string;
  category_label: string;
  target_exam: string;
  badge: string;
  duration: string;
  format: string;
  language: string;
  fee_status: string;
  price: string;
  original_price: string | null;
  is_paid: boolean;
  short_description: string;
  long_description: string;
  eligibility: string;
  exam_overview: string;
  is_published: boolean;
  tracks: APICourseTrack[];
  standalone_subjects: APISubjectHierarchy[];
}

export interface APISubjectLearningDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
  is_active: boolean;
  course: any;
  track?: APICourseTrack;
  modules: any[];
  study_resources: any[];
  test_series: any[];
}

export interface StudentPreferences {
  education_level: string;
  degree: string;
  engineering_branch: string;
  target_exam: string;
  target_paper: string;
  preferred_subjects: string[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  summary: string;
  resources?: { name: string; url: string; size: string }[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: CourseCategory;
  categoryLabel: string;
  shortDescription: string;
  longDescription: string;
  targetExam: string;
  badge?: string;
  iconName: string;
  subjects: string[];
  duration: string;
  format: string;
  language: string;
  feeStatus: string;
  price?: number;          // in INR (undefined = enquire)
  originalPrice?: number;  // for showing strike-through
  isPaid?: boolean;        // true = needs purchase to access lectures
  objectives: string[];
  curriculum: Module[];
  faqs: { question: string; answer: string }[];
  facultyIds: string[];
}

export interface Faculty {
  id: string;
  slug: string;
  name: string;
  role: string;
  specialization: string;
  qualification: string;
  experience: string;
  bio: string;
  image: string;
  coursesTaught: string[];
}

export interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
  subject: string;
}

export interface MockTest {
  id: string;
  title: string;
  slug: string;
  exam: string;
  category: CourseCategory;
  questionsCount: number;
  durationMinutes: number;
  totalMarks: number;
  description: string;
  instructions: string[];
  questions: TestQuestion[];
  price?: number;    // undefined = free
  originalPrice?: number;
  isPaid?: boolean;
}

export interface StudyResource {
  id: string;
  title: string;
  exam: string;
  category: CourseCategory;
  type: 'formula-sheet' | 'syllabus' | 'pyq' | 'notes';
  fileFormat: string;
  pages: number;
  downloads: number;
  description: string;
  price?: number;   // undefined or 0 = free
  originalPrice?: number;
  isPaid?: boolean;
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  targetExam: string;
  enrolledCourseIds: string[];
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  avatar?: string;
}

export interface TestResult {
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  percentage: number;
  date: string;
  userAnswers: Record<string, number>;
}

export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  courseInterested: string;
  message: string;
  date: string;
  status: 'new' | 'contacted' | 'enrolled';
}
