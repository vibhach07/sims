// ============================================================
// SIMS Raipur — Centralized API Client
// All backend communication goes through this module.
// Base URL is read from Vite env (VITE_API_BASE_URL) or
// defaults to localhost:8000 for local development.
// ============================================================

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:8000';

// --------------- Token helpers --------------------------------
const TOKEN_KEY = 'sims_auth_token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// --------------- Core fetch wrapper --------------------------
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) headers['Authorization'] = `Token ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    // If token is invalid or expired, automatically purge stale tokenStore session
    if (res.status === 401) {
      tokenStore.clear();
    }
    let errorMsg = `API error ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) {
        errorMsg = body.error;
      } else if (body.detail) {
        errorMsg = body.detail;
      } else if (body.message) {
        errorMsg = body.message;
      } else if (typeof body === 'object') {
        // Collect field validation errors
        const errValues = Object.entries(body)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        if (errValues) errorMsg = errValues;
      }
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ============================================================
// API TYPE DEFINITIONS — matching Django serializers
// ============================================================

export interface APICourse {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  category_label: string;
  target_exam: string;
  badge: string;
  duration: string;
  format: string;
  language: string;
  fee_status: string;
  price: string;         // Decimal from DRF → string
  original_price: string | null;
  is_paid: boolean;
  short_description: string;
  banner_image?: string | null;
  image_url?: string | null;
  is_enrolled: boolean;
  lecture_count: number;
  is_published?: boolean;
  is_owner?: boolean;
  review_status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_note?: string;
}

export interface APINotification {
  id: number;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface APIAuditLog {
  id: number;
  actor: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  object_type: string;
  object_id: string;
  object_title: string;
  owner: number | null;
  owner_name: string | null;
  changes: Record<string, any>;
  created_at: string;
  timestamp?: string;
}

export interface APIEducatorApplication {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subjects: string;
  qualification: string;
  experience: string;
  bio: string;
  demo_link: string;
  resume_link?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
}

export interface APIStudyResource {
  id: number;
  slug: string;
  title: string;
  exam: string;
  category: string;
  resource_type: string;
  file_format: string;
  pages: number;
  downloads_count: number;
  description: string;
  file_url: string;
  is_published: boolean;
  review_status: 'draft' | 'pending' | 'approved' | 'rejected';
  review_note: string;
  price: string;
  original_price: string | null;
  is_paid: boolean;
  is_entitled?: boolean;
  download_url?: string | null;
  created_by_email?: string | null;
}

export interface APILesson {
  id: number;
  title: string;
  duration: string;
  video_url: string | null;      // null when lecture is locked
  summary: string;
  order: number;
  is_free_preview: boolean;
  instructor_name: string;
  is_locked: boolean;
  is_completed: boolean;
  last_position_seconds: number;
}

export interface APILectureProgress {
  lecture_id: number;
  is_completed: boolean;
  last_position_seconds: number;
  updated_at: string;
}

export interface APIModule {
  id: number;
  title: string;
  description: string;
  order: number;
  lessons: APILesson[];
}

export interface APICourseDetail extends APICourse {
  long_description: string;
  curriculum: APIModule[];
  is_enrolled: boolean;
}

export interface APIUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: {
    phone: string;
    target_exam: string;
    avatar: string;
    role?: string;
    is_email_verified?: boolean;
  };
  role?: string;
  is_staff?: boolean;
}

export interface APITestSeries {
  id: number;
  slug: string;
  title: string;
  exam: string;
  category: string;
  duration_minutes?: number;
  durationMinutes: number;
  total_marks?: number;
  totalMarks: number;
  questions_count?: number;
  totalQuestions: number;
  description: string;
  price: string;
  original_price?: string | null;
  originalPrice: string | null;
  is_paid?: boolean;
  isPaid: boolean;
  is_published?: boolean;
  isPublished?: boolean;
  is_entitled?: boolean;
  isEntitled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  maxAttempts?: number | null;
  defaultMarks?: number;
  defaultNegativeMarks?: number;
  integrityMode?: 'strict' | 'warn' | 'off';
  showRank?: boolean;
  showReview?: boolean;
  reviewStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  usedAttempts?: number;
  inProgressAttemptId?: number | null;
  canStart?: boolean;
  blockReason?: 'not_started' | 'ended' | 'attempts_used' | 'no_questions' | 'purchase_required' | 'unpublished' | null;
}

export interface APITestQuestionStudent {
  id: number;
  number: number;
  subject: string;
  question: string;
  questionEn: string;
  questionHi: string | null;
  options: string[];
  optionsEn: { A: string; B: string; C: string; D: string };
  optionsHi: { A: string; B: string; C: string; D: string } | null;
  marks: number;
  negativeMarks: number;
  order: number;
  imageUrl?: string | null;
  images?: Record<string, { url: string; width?: number | null; height?: number | null; alt?: string }>;
}

export interface APITestQuestion {
  id: number;
  subject: string;
  question: string;
  options: string[];
  options_json?: string[];
  correctAnswer?: number;
  correct_answer?: number;
  correctOption?: string;
  explanation?: string;
  explanationEn?: string;
  explanationHi?: string | null;
  order: number;
  questionEn?: string;
  questionHi?: string | null;
  optionAEn?: string;
  optionAHi?: string | null;
  optionBEn?: string;
  optionBHi?: string | null;
  optionCEn?: string;
  optionCHi?: string | null;
  optionDEn?: string;
  optionDHi?: string | null;
  marks?: number | null;
  negativeMarks?: number | null;
}

export interface APITestSeriesDetail extends APITestSeries {
  questions: APITestQuestionStudent[];
}

export interface APIStartAttemptResponse {
  id: number;
  test_series: number;
  testSlug: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  durationMinutes: number;
}

export interface APISaveAnswerResponse {
  questionId: number;
  selectedOption: string | null;
  markedForReview: boolean;
  savedAt: string;
}

export interface APIInProgressAttempt {
  id: number;
  test_series: number;
  testTitle: string;
  testSlug: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  durationMinutes: number;
  serverNow: string;
  integrityMode: 'strict' | 'warn' | 'off';
  showRank: boolean;
  savedAnswers: Record<string, { selectedOption: string | null; markedForReview: boolean }>;
  questions: APITestQuestionStudent[];
}

export interface APISubjectAnalysis {
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  maxMarks: number;
}

export interface APIQuestionReviewItem {
  questionId: number;
  questionNumber: number;
  subject: string;
  question: string;
  questionEn: string;
  questionHi: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionAHi: string | null;
  optionBHi: string | null;
  optionCHi: string | null;
  optionDHi: string | null;
  correctOption: string;
  explanation: string;
  explanationEn: string;
  explanationHi: string | null;
  selectedOption: string | null;
  verdict: 'correct' | 'wrong' | 'unattempted';
  marks: number;
  negativeMarks: number;
}

export interface APIAttemptResult {
  id: number;
  test_series: number;
  testTitle: string;
  testSlug: string;
  status: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  timeTakenSeconds: number;
  startedAt: string;
  submittedAt: string;
  showReview: boolean;
  showRank: boolean;
  integrityViolation: boolean;
  rank: number | null;
  participants: number | null;
  subjectAnalysis: APISubjectAnalysis[];
  review: APIQuestionReviewItem[];
}

export interface APIMyAttemptV2 {
  id: number;
  user: number;
  userName: string;
  userEmail: string;
  test_series: number;
  testTitle: string;
  testSlug: string;
  status: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  timeTakenSeconds: number;
  startedAt: string;
  submittedAt: string | null;
  completedAt: string;
}

export interface APIBulkImportResult {
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  skipped_duplicates: number;
  total_detected?: number;
  successfully_extracted?: number;
  needs_review?: number;
  extraction_errors?: number;
  errors: { row: number; question: string; errors: string[] }[];
  warnings: string[];
  is_preview: boolean;
  mode: 'append' | 'replace';
  will_delete_count?: number;
  preview_questions?: any[];
  imported_count?: number;
  new_total_questions?: number;
  error?: string;
}

export interface APITestAttempt {
  id: number;
  test_series: number;
  test_title?: string;
  testTitle: string;
  score: number;
  total_marks?: number;
  totalMarks: number;
  correct_count?: number;
  correctCount: number;
  wrong_count?: number;
  wrongCount: number;
  unattempted_count?: number;
  unattemptedCount: number;
  answers_json?: Record<string, number>;
  answers: Record<string, number>;
  completed_at?: string;
  completedAt: string;
}

export interface APIResource {
  id: number;
  slug: string;
  title: string;
  exam: string;
  category: string;
  resource_type: string;
  file_format: string;
  pages: number;
  downloads: number;
  description: string;
  price: string;
  original_price: string | null;
  is_paid: boolean;
  is_entitled: boolean;
}

export interface APIOrder {
  id: number;
  order_id: string;
  item_type: string;
  item_id: string;
  item_title: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  entitlement_granted: boolean;
  failure_reason: string;
  created_at: string;
  updated_at?: string;
}

export interface APICreateOrderResponse {
  order: APIOrder;
  razorpay_key_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  is_sandbox: boolean;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface APIAuthResponse {
  token: string;
  user: APIUser;
}

// ============================================================
// AUTH API
// ============================================================
export const AuthAPI = {
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
    name?: string;
    phone?: string;
    target_exam?: string;
  }) =>
    apiFetch<APIAuthResponse>('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        name: data.name || [data.first_name, data.last_name].filter(Boolean).join(' ').trim(),
      }),
    }),

  login: (email: string, password: string, portal?: 'student' | 'educator') =>
    apiFetch<APIAuthResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password, portal }),
    }),

  verifyPassword: async (email: string, password: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || data.detail || 'Incorrect password. Access denied.');
    }
    return true;
  },

  googleConfig: () =>
    apiFetch<{ client_id: string }>('/api/auth/google/config/'),

  googleLogin: (credential: string, portal: 'student' | 'educator' = 'student') =>
    apiFetch<APIAuthResponse>('/api/auth/google/', {
      method: 'POST',
      body: JSON.stringify({ credential, portal }),
    }),

  logout: () =>
    apiFetch<{ message: string }>('/api/auth/logout/', {
      method: 'POST',
    }),

  applyEducator: (data: {
    name: string;
    email: string;
    phone: string;
    subjects: string;
    qualification: string;
    experience: string;
    bio: string;
    demo_link: string;
    resume_link?: string;
  }) =>
    apiFetch<any>('/api/auth/educator/apply/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => apiFetch<APIUser>('/api/auth/me/'),

  updateProfile: (data: { phone?: string; target_exam?: string; avatar?: string; name?: string }) =>
    apiFetch<APIUser>('/api/auth/me/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getPreferences: () =>
    apiFetch<import('../types').StudentPreferences>('/api/auth/profile/preferences/'),

  updatePreferences: (data: Partial<import('../types').StudentPreferences>) =>
    apiFetch<import('../types').StudentPreferences>('/api/auth/profile/preferences/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  verifyEmail: (token: string) =>
    apiFetch<{ message: string; token: string; user: APIUser }>('/api/auth/verify-email/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/resend-verification/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  requestPasswordReset: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  confirmPasswordReset: (token: string, new_password: string) =>
    apiFetch<{ message: string; token: string; user: APIUser }>('/api/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),
};

// ============================================================
// COURSES API
// ============================================================
export const CoursesAPI = {
  list: (params?: { category?: string; search?: string; my_courses?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.my_courses) qs.set('my_courses', 'true');
    const q = qs.toString();
    return apiFetch<APICourse[]>(`/api/courses/${q ? '?' + q : ''}`);
  },

  categories: () =>
    apiFetch<import('../types').APICourseCategory[]>('/api/courses/categories/'),

  categoryDetail: (slug: string) =>
    apiFetch<import('../types').APICourseCategory>(`/api/courses/categories/${slug}/`),

  hierarchy: (slug: string) =>
    apiFetch<import('../types').APICourseHierarchy>(`/api/courses/${slug}/hierarchy/`),

  trackDetail: (slug: string, trackSlug: string) =>
    apiFetch<import('../types').APICourseTrack>(`/api/courses/${slug}/tracks/${trackSlug}/`),

  subjectDetail: (slug: string, subjectSlug: string) =>
    apiFetch<import('../types').APISubjectLearningDetail>(`/api/courses/${slug}/subjects/${subjectSlug}/`),

  recommended: (params?: { target_exam?: string; education_level?: string; branch?: string }) => {
    const qs = new URLSearchParams();
    if (params?.target_exam) qs.set('target_exam', params.target_exam);
    if (params?.education_level) qs.set('education_level', params.education_level);
    if (params?.branch) qs.set('branch', params.branch);
    const q = qs.toString();
    return apiFetch<APICourse[]>(`/api/courses/recommended/${q ? '?' + q : ''}`);
  },

  detail: (slug: string) =>
    apiFetch<APICourseDetail>(`/api/courses/${slug}/`),

  myCourses: () => apiFetch<APICourse[]>('/api/courses/my-courses/'),

  videoDiscovery: (params?: { category?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return apiFetch<APICourseDetail[]>(`/api/courses/video-discovery/${q ? '?' + q : ''}`);
  },

  lectureDetail: (lectureId: number) =>
    apiFetch<APILesson>(`/api/courses/lectures/${lectureId}/`),

  toggleLectureProgress: (lectureId: number, lastPositionSeconds?: number) =>
    apiFetch<APILectureProgress>(
      `/api/courses/lectures/${lectureId}/progress/`,
      {
        method: 'POST',
        body: JSON.stringify({ last_position_seconds: lastPositionSeconds ?? 0 }),
      }
    ),

  getLectureProgress: (lectureId: number) =>
    apiFetch<APILectureProgress>(`/api/courses/lectures/${lectureId}/progress/`),

  savePlaybackPosition: (lectureId: number, lastPositionSeconds: number) =>
    apiFetch<APILectureProgress>(
      `/api/courses/lectures/${lectureId}/progress/`,
      {
        method: 'PATCH',
        body: JSON.stringify({ last_position_seconds: lastPositionSeconds }),
      }
    ),

  myLectureProgress: () =>
    apiFetch<APILectureProgress[]>('/api/courses/progress/'),

  createCourse: (data: Partial<APICourseDetail>) =>
    apiFetch<APICourseDetail>('/api/courses/manage/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCourse: (id: number, data: Partial<APICourseDetail>) =>
    apiFetch<APICourseDetail>(`/api/courses/manage/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCourse: (id: number) =>
    apiFetch<void>(`/api/courses/manage/${id}/`, {
      method: 'DELETE',
    }),

  submitReview: (id: number) =>
    apiFetch<{ message: string; review_status: string }>(`/api/courses/manage/${id}/submit-review/`, {
      method: 'POST',
    }),

  // Modules CRUD
  createModule: (data: { course: number; title: string; description?: string; order?: number }) =>
    apiFetch<{ id: number; course: number; title: string; description: string; order: number }>(
      '/api/courses/manage/modules/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  updateModule: (id: number, data: Partial<{ title: string; description: string; order: number }>) =>
    apiFetch<{ id: number; course: number; title: string; description: string; order: number }>(
      `/api/courses/manage/modules/${id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    ),

  deleteModule: (id: number) =>
    apiFetch<void>(`/api/courses/manage/modules/${id}/`, {
      method: 'DELETE',
    }),

  // Lectures CRUD
  createLecture: (data: {
    module: number;
    title: string;
    duration?: string;
    video_url?: string;
    summary?: string;
    order?: number;
    is_free_preview?: boolean;
    instructor_name?: string;
  }) =>
    apiFetch<APILesson>('/api/courses/manage/lectures/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLecture: (id: number, data: Partial<APILesson & { module: number }>) =>
    apiFetch<APILesson>(`/api/courses/manage/lectures/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteLecture: (id: number) =>
    apiFetch<void>(`/api/courses/manage/lectures/${id}/`, {
      method: 'DELETE',
    }),
};

// ============================================================
// ASSESSMENTS API
// ============================================================
export const AssessmentsAPI = {
  list: (params?: { category?: string; exam?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.exam) qs.set('exam', params.exam);
    const q = qs.toString();
    return apiFetch<APITestSeries[]>(`/api/assessments/${q ? '?' + q : ''}`);
  },

  detail: (slug: string) =>
    apiFetch<APITestSeriesDetail>(`/api/assessments/${slug}/`),

  // Phase 1B Attempt Lifecycle
  start: (slug: string) =>
    apiFetch<APIStartAttemptResponse>(`/api/assessments/${slug}/start/`, {
      method: 'POST',
    }),

  attempt: (id: number) =>
    apiFetch<APIInProgressAttempt>(`/api/assessments/attempts/${id}/`),

  saveAnswer: (
    id: number,
    data: { question_id: number; selected_option: string | null; mark_for_review?: boolean }
  ) =>
    apiFetch<APISaveAnswerResponse>(`/api/assessments/attempts/${id}/answer/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitAttempt: (id: number) =>
    apiFetch<APIAttemptResult>(`/api/assessments/attempts/${id}/submit/`, {
      method: 'POST',
    }),

  result: (id: number) =>
    apiFetch<APIAttemptResult>(`/api/assessments/attempts/${id}/result/`),

  integrity: (id: number, event: 'hidden' | 'visible') =>
    apiFetch<{ autoSubmitted: boolean; warning?: boolean; integrityViolation?: boolean }>(
      `/api/assessments/attempts/${id}/integrity/`,
      {
        method: 'POST',
        body: JSON.stringify({ event }),
      }
    ),

  myAttempts: () => apiFetch<APITestAttempt[]>('/api/assessments/my-attempts/'),

  myAttemptsV2: () => apiFetch<APIMyAttemptV2[]>('/api/assessments/my-attempts/v2/'),

  // Admin & Educator Management
  createTest: (data: Partial<APITestSeries>) =>
    apiFetch<APITestSeries>('/api/assessments/manage/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTest: (slug: string, data: Partial<APITestSeries>) =>
    apiFetch<APITestSeries>(`/api/assessments/manage/${slug}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTest: (slug: string) =>
    apiFetch<void>(`/api/assessments/manage/${slug}/`, {
      method: 'DELETE',
    }),

  submitReview: (slug: string) =>
    apiFetch<{ message: string; review_status: string }>(`/api/assessments/manage/${slug}/submit-review/`, {
      method: 'POST',
    }),

  createQuestion: (data: Partial<APITestQuestion> & { test_series: number }) =>
    apiFetch<APITestQuestion>('/api/assessments/manage/questions/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuestion: (id: number, data: Partial<APITestQuestion>) =>
    apiFetch<APITestQuestion>(`/api/assessments/manage/questions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteQuestion: (id: number) =>
    apiFetch<void>(`/api/assessments/manage/questions/${id}/`, {
      method: 'DELETE',
    }),

  adminAttempts: (params?: { test?: string }) => {
    const qs = new URLSearchParams();
    if (params?.test) qs.set('test', params.test);
    const q = qs.toString();
    return apiFetch<APIMyAttemptV2[]>(`/api/assessments/manage/attempts/${q ? '?' + q : ''}`);
  },

  getExportAttemptsCsvUrl: (slug?: string) => {
    const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:8000';
    const qs = slug ? `?test=${encodeURIComponent(slug)}` : '';
    return `${API_BASE}/api/assessments/manage/attempts/export/${qs}`;
  },

  exportAttemptsCsv: async (slug?: string) => {
    const token = tokenStore.get();
    const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:8000';
    const qs = slug ? `?test=${encodeURIComponent(slug)}` : '';
    const res = await fetch(`${API_BASE}/api/assessments/manage/attempts/export/${qs}`, {
      headers: token ? { 'Authorization': `Token ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
    return res.blob();
  },

  // Legacy client-side submit (deprecated, kept for backward compat)
  submit: (
    slug: string,
    answers: Record<string, number>
  ) =>
    apiFetch<APITestAttempt>(`/api/assessments/${slug}/submit/`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  bulkImport: async (slug: string, formData: FormData) => {
    const token = tokenStore.get();
    const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:8000';
    const res = await fetch(`${API_BASE}/api/assessments/${slug}/bulk-import/`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Token ${token}` } : {},
      body: formData,
    });
    try {
      const data = await res.json();
      return data as APIBulkImportResult;
    } catch {
      throw new Error(`Server returned status ${res.status} with non-JSON body`);
    }
  },

  importGenerate: async (formData: FormData) => {
    const token = tokenStore.get();
    const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:8000';
    const res = await fetch(`${API_BASE}/api/assessments/manage/import-generate/`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Token ${token}` } : {},
      body: formData,
    });
    try {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import and generate test series.');
      }
      return data;
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') {
        throw e;
      }
      throw new Error(`Server returned status ${res.status}`);
    }
  },
};

// ============================================================
// RESOURCES API
// ============================================================
export const ResourcesAPI = {
  list: (params?: { category?: string; resource_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.resource_type) qs.set('resource_type', params.resource_type);
    const q = qs.toString();
    return apiFetch<APIResource[]>(`/api/resources/${q ? '?' + q : ''}`);
  },

  download: (id: number) =>
    apiFetch<{ url: string }>(`/api/resources/${id}/download/`),
};

// ============================================================
// ORDERS / PAYMENTS API
// ============================================================
export const OrdersAPI = {
  create: (itemType: 'course' | 'test' | 'resource', itemId: string | number) =>
    apiFetch<APICreateOrderResponse>('/api/orders/create/', {
      method: 'POST',
      body: JSON.stringify({ item_type: itemType, item_id: String(itemId) }),
    }),

  verify: (data: {
    order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    apiFetch<{ success: boolean; order: APIOrder; message: string }>(
      '/api/orders/verify/',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  myOrders: () => apiFetch<APIOrder[]>('/api/orders/'),

  status: (orderId: string) =>
    apiFetch<{ order: APIOrder; is_accessible: boolean }>(`/api/orders/${orderId}/status/`),
};

// ============================================================
// ENQUIRIES API
// ============================================================
export interface APIEnquiry {
  id: number;
  name: string;
  email: string;
  phone: string;
  courseInterested: string;
  message: string;
  status: 'new' | 'contacted' | 'enrolled';
  createdAt: string;
  date: string;
}

export const EnquiriesAPI = {
  create: (data: { name: string; email: string; phone: string; courseInterested: string; message?: string }) =>
    apiFetch<APIEnquiry>('/api/auth/enquiries/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () =>
    apiFetch<APIEnquiry[]>('/api/auth/admin/enquiries/'),

  updateStatus: (id: number, status: 'new' | 'contacted' | 'enrolled') =>
    apiFetch<APIEnquiry>(`/api/auth/admin/enquiries/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ============================================================
// ADMIN STATS API
// ============================================================
export interface APIAdminStats {
  totalCourses: number;
  totalFaculty: number;
  totalTests: number;
  totalResources: number;
  totalEnquiries: number;
  openEnquiries: number;
  totalStudents: number;
  totalEnrollments: number;
  totalPaidOrders: number;
}

export const AdminStatsAPI = {
  get: () => apiFetch<APIAdminStats>('/api/auth/admin/stats/'),
};

// ============================================================
// PROGRESS API
// ============================================================
export interface APIStudentProgress {
  student: {
    id: number;
    username: string;
    name: string;
    email: string;
    targetExam: string;
  };
  enrolledCourses: Array<{
    id: number;
    slug: string;
    title: string;
    category_label: string;
    format: string;
    lectureCount: number;
    completedCount: number;
    progressPercentage: number;
    enrolledAt: string;
  }>;
  testsAttempted: Array<{
    id: number;
    testId: number;
    testSlug: string;
    testTitle: string;
    score: number;
    totalMarks: number;
    correctCount: number;
    wrongCount: number;
    unattemptedCount: number;
    completedAt: string;
  }>;
  summary: {
    totalCoursesEnrolled: number;
    totalTestsAttempted: number;
    averageMockScore: number;
  };
}

export interface APIEducatorStudentItem {
  id: string;
  userId: number;
  name: string;
  email: string;
  course: string;
  avgScore: number;
  attemptsCount: number;
  lastActive: string;
  status: string;
}

export const ProgressAPI = {
  myProgress: () => apiFetch<APIStudentProgress>('/api/auth/progress/'),
  educatorStudents: () => apiFetch<APIEducatorStudentItem[]>('/api/auth/educator/students/'),
};

export interface APISubject {
  id: number;
  name: string;
  slug: string;
  description: string;
  course?: number | null;
  courseTitle?: string;
  order: number;
  is_active: boolean;
}

export const SubjectsAPI = {
  list: (courseId?: number) =>
    apiFetch<APISubject[]>(`/api/courses/subjects/${courseId ? '?course=' + courseId : ''}`),
  detail: (slug: string) =>
    apiFetch<APISubject>(`/api/courses/subjects/${slug}/`),
  create: (data: Partial<APISubject>) =>
    apiFetch<APISubject>('/api/courses/subjects/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<APISubject>) =>
    apiFetch<APISubject>(`/api/courses/subjects/${slug}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (slug: string) =>
    apiFetch<void>(`/api/courses/subjects/${slug}/`, {
      method: 'DELETE',
    }),
};

export interface APIAdminStats {
  totalCourses: number;
  totalSubjects: number;
  totalFaculty: number;
  totalTests: number;
  totalResources: number;
  totalEnquiries: number;
  openEnquiries: number;
  totalStudents: number;
  totalEnrollments: number;
  totalTestAttempts: number;
  totalPaidOrders: number;
  totalVerifiedRevenue: number;
  pendingOrders: number;
  failedOrders: number;
  pendingApprovals?: number;
  newApplications?: number;
  activeEducators?: number;
}

export interface APIEducatorStudent {
  id: string;
  userId: number;
  name: string;
  email: string;
  course: string;
  avgScore: number;
  attemptsCount: number;
  lastActive: string;
  status: string;
}

export const DashboardAPI = {
  studentProgress: () => apiFetch<APIStudentProgress>('/api/auth/progress/'),
  adminStats: () => apiFetch<APIAdminStats>('/api/auth/admin/stats/'),
  educatorStudents: () => apiFetch<APIEducatorStudent[]>('/api/auth/educator/students/'),
};

export interface APIFaculty {
  id: number;
  slug: string;
  name: string;
  role: string;
  specialization: string;
  qualification: string;
  experience: string;
  bio: string;
  image: string;
  coursesTaught: string[];
  displayOrder?: number;
  emailPublic?: string;
  isActive?: boolean;
  photo?: string | null;
  account?: {
    userId: number;
    email: string;
    role: string;
    status: 'active' | 'suspended' | 'invited' | 'none';
  } | null;
  created_at?: string;
}

export const FacultyAPI = {
  list: () => apiFetch<APIFaculty[]>('/api/auth/faculty/'),
  detail: (slug: string) => apiFetch<APIFaculty>(`/api/auth/faculty/${slug}/`),
  create: (data: FormData | Partial<APIFaculty>) =>
    apiFetch<APIFaculty>('/api/auth/faculty/', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  update: (slug: string, data: FormData | Partial<APIFaculty>) =>
    apiFetch<APIFaculty>(`/api/auth/faculty/${slug}/`, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  delete: (slug: string) =>
    apiFetch<void>(`/api/auth/faculty/${slug}/`, {
      method: 'DELETE',
    }),
};

export const AdminFacultyAPI = {
  list: () => apiFetch<APIFaculty[]>('/api/auth/admin/faculty/'),
  detail: (id: number) => apiFetch<APIFaculty>(`/api/auth/admin/faculty/${id}/`),
  create: (data: FormData | Partial<APIFaculty>) =>
    apiFetch<APIFaculty>('/api/auth/admin/faculty/', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  update: (id: number, data: FormData | Partial<APIFaculty>) =>
    apiFetch<APIFaculty>(`/api/auth/admin/faculty/${id}/`, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/auth/admin/faculty/${id}/`, {
      method: 'DELETE',
    }),
  grantEducator: (id: number, email: string) =>
    apiFetch<{ message: string; faculty: APIFaculty }>(`/api/auth/admin/faculty/${id}/grant-educator/`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  revokeEducator: (id: number) =>
    apiFetch<{ message: string; faculty: APIFaculty }>(`/api/auth/admin/faculty/${id}/revoke-educator/`, {
      method: 'POST',
    }),
};

export const EducatorProfileAPI = {
  get: () => apiFetch<APIFaculty>('/api/auth/educator/profile/'),
  update: (data: FormData | Partial<APIFaculty>) =>
    apiFetch<APIFaculty>('/api/auth/educator/profile/', {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
};

export interface APILiveClass {
  id: number;
  title: string;
  description: string;
  course: number | null;
  course_title?: string | null;
  course_slug?: string | null;
  module: number | null;
  educator?: number;
  educator_name?: string;
  scheduled_start: string;
  scheduled_end: string;
  provider: 'youtube' | 'vimeo' | 'zoom' | 'meet' | 'other';
  stream_url?: string;
  recording_url?: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  access: 'course_students' | 'free_for_all' | 'logged_in';
  is_locked?: boolean;
  embed_url?: string | null;
  join_url?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string;
}

export const LiveAPI = {
  list: (params?: { status?: 'upcoming' | 'live' | 'past' }) => {
    const qs = params?.status ? `?status=${params.status}` : '';
    return apiFetch<APILiveClass[]>(`/api/live/${qs}`);
  },
  detail: (id: number) => apiFetch<APILiveClass>(`/api/live/${id}/`),
  manageList: () => apiFetch<APILiveClass[]>('/api/live/manage/'),
  manageDetail: (id: number) => apiFetch<APILiveClass>(`/api/live/manage/${id}/`),
  create: (data: Partial<APILiveClass>) =>
    apiFetch<APILiveClass>('/api/live/manage/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<APILiveClass>) =>
    apiFetch<APILiveClass>(`/api/live/manage/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/live/manage/${id}/`, {
      method: 'DELETE',
    }),
  goLive: (id: number, streamUrl?: string) =>
    apiFetch<APILiveClass>(`/api/live/manage/${id}/go-live/`, {
      method: 'POST',
      body: JSON.stringify({ stream_url: streamUrl }),
    }),
  end: (id: number, recordingUrl?: string) =>
    apiFetch<APILiveClass>(`/api/live/manage/${id}/end/`, {
      method: 'POST',
      body: JSON.stringify({ recording_url: recordingUrl }),
    }),
  convertToLecture: (
    id: number,
    data: { module_id: number; title?: string; summary?: string; recording_url?: string }
  ) =>
    apiFetch<{ message: string; lecture_id: number; course_slug: string }>(
      `/api/live/manage/${id}/convert-to-lecture/`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
};

export const NotificationsAPI = {
  list: () => apiFetch<APINotification[]>('/api/auth/notifications/'),
  unreadCount: () => apiFetch<{ unread_count: number }>('/api/auth/notifications/unread-count/'),
  markRead: (id: number) =>
    apiFetch<{ message: string }>(`/api/auth/notifications/${id}/read/`, { method: 'POST' }),
  markAllRead: () =>
    apiFetch<{ message: string }>('/api/auth/notifications/mark-all-read/', { method: 'POST' }),
};

export const AuditAPI = {
  educatorActivity: () =>
    apiFetch<{ count: number; results: APIAuditLog[] }>('/api/auth/educator/activity/'),
  adminAudit: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ count: number; results: APIAuditLog[] }>(`/api/auth/admin/audit/${qs}`);
  },
};

export const StudyResourcesAPI = {
  list: (params?: { my_resources?: boolean; exam?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.my_resources) query.set('my_resources', 'true');
    if (params?.exam) query.set('exam', params.exam);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<APIStudyResource[]>(`/api/resources/${qs}`);
  },
  detail: (slug: string) => apiFetch<APIStudyResource>(`/api/resources/${slug}/`),
  create: (data: Partial<APIStudyResource>) =>
    apiFetch<APIStudyResource>('/api/resources/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<APIStudyResource>) =>
    apiFetch<APIStudyResource>(`/api/resources/${slug}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (slug: string) =>
    apiFetch<void>(`/api/resources/${slug}/`, {
      method: 'DELETE',
    }),
  submitReview: (slug: string) =>
    apiFetch<{ message: string; review_status: string }>(`/api/resources/${slug}/submit-review/`, {
      method: 'POST',
    }),
};

export interface APIAdminEducatorItem {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  courses_count: number;
  tests_count: number;
  pending_count: number;
  students_count: number;
  counts?: {
    courses: number;
    tests: number;
    pending_items: number;
    students: number;
  };
}

export interface APIAdminEducatorDetail {
  educator: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    last_login: string | null;
    date_joined: string | null;
  };
  faculty: {
    id: number;
    slug: string;
    name: string;
    role: string;
    specialization: string;
    qualification: string;
    experience: string;
    bio: string;
    image: string;
    is_active: boolean;
  } | null;
  courses: Array<{
    id: number;
    title: string;
    slug: string;
    category: string;
    price: string;
    is_published: boolean;
    review_status: string;
    created_at: string | null;
  }>;
  tests: Array<{
    id: number;
    title: string;
    slug: string;
    category: string;
    price: string;
    is_published: boolean;
    review_status: string;
    created_at: string | null;
  }>;
  resources: Array<{
    id: number;
    title: string;
    slug: string;
    category: string;
    file_type: string;
    is_published: boolean;
    review_status: string;
    created_at: string | null;
  }>;
  students: Array<{
    id: number;
    name: string;
    email: string;
    date_joined: string | null;
  }>;
  activity: APIAuditLog[];
  counts: {
    courses: number;
    tests: number;
    resources: number;
    students: number;
    pending_items: number;
  };
}

export interface APIApprovalsQueue {
  courses: Array<{
    id: number;
    type: string;
    title: string;
    slug: string;
    created_by: string | null;
    created_by_name: string;
    created_at: string;
    review_status: string;
    review_note: string;
  }>;
  tests: Array<{
    id: number;
    type: string;
    title: string;
    slug: string;
    created_by: string | null;
    created_by_name: string;
    created_at: string;
    review_status: string;
    review_note: string;
  }>;
  resources: Array<{
    id: number;
    type: string;
    title: string;
    slug: string;
    created_by: string | null;
    created_by_name: string;
    created_at: string;
    review_status: string;
    review_note: string;
  }>;
  total_pending: number;
}

export const AdminEducatorsAPI = {
  list: () => apiFetch<APIAdminEducatorItem[]>('/api/auth/admin/educators/'),
  add: (data: { name: string; email: string }) =>
    apiFetch<APIAdminEducatorItem>('/api/auth/admin/educators/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  suspend: (id: number) =>
    apiFetch<{ message: string }>(`/api/auth/admin/educators/${id}/suspend/`, { method: 'POST' }),
  reactivate: (id: number) =>
    apiFetch<{ message: string }>(`/api/auth/admin/educators/${id}/reactivate/`, { method: 'POST' }),
  remove: (id: number) =>
    apiFetch<{ message: string }>(`/api/auth/admin/educators/${id}/remove/`, { method: 'POST' }),
  sendInvite: (id: number) =>
    apiFetch<{ message: string }>(`/api/auth/admin/educators/${id}/send-invite/`, { method: 'POST' }),
  getEducator: (id: number) =>
    apiFetch<APIAdminEducatorDetail>(`/api/auth/admin/educators/${id}/`),
  updateFaculty: (id: number, data: Partial<{
    name: string;
    role: string;
    specialization: string;
    qualification: string;
    experience: string;
    bio: string;
    image: string;
    is_active: boolean;
  }>) =>
    apiFetch<{ message: string; faculty: any }>(`/api/auth/admin/educators/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Applications
  listApplications: (status?: string) =>
    apiFetch<APIEducatorApplication[]>(
      `/api/auth/admin/educator-applications/${status ? '?status=' + status : ''}`
    ),
  approveApplication: (id: number) =>
    apiFetch<APIEducatorApplication>(`/api/auth/admin/educator-applications/${id}/approve/`, {
      method: 'POST',
    }),
  rejectApplication: (id: number, admin_note: string) =>
    apiFetch<APIEducatorApplication>(`/api/auth/admin/educator-applications/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ admin_note }),
    }),
};

export const AdminApprovalsAPI = {
  getQueue: () => apiFetch<APIApprovalsQueue>('/api/auth/admin/approvals/'),
  reviewCourse: (id: number, decision: 'approve' | 'reject', note?: string) =>
    apiFetch<{ message: string; review_status: string; is_published: boolean }>(
      `/api/courses/manage/${id}/review/`,
      { method: 'POST', body: JSON.stringify({ decision, note }) }
    ),
  reviewTest: (slug: string, decision: 'approve' | 'reject', note?: string) =>
    apiFetch<{ message: string; review_status: string; is_published: boolean }>(
      `/api/assessments/manage/${slug}/review/`,
      { method: 'POST', body: JSON.stringify({ decision, note }) }
    ),
  reviewResource: (slug: string, decision: 'approve' | 'reject', note?: string) =>
    apiFetch<{ message: string; review_status: string; is_published: boolean }>(
      `/api/resources/${slug}/review/`,
      { method: 'POST', body: JSON.stringify({ decision, note }) }
    ),
};

export const TransferAPI = {
  transferCourse: (id: number, to_user: number) =>
    apiFetch<{ message: string }>(`/api/courses/manage/${id}/transfer/`, {
      method: 'POST',
      body: JSON.stringify({ to_user }),
    }),
  transferCoursesBulk: (ids: number[], to_user: number) =>
    apiFetch<{ message: string }>('/api/courses/manage/transfer/', {
      method: 'POST',
      body: JSON.stringify({ ids, to_user }),
    }),
  transferTest: (slug: string, to_user: number) =>
    apiFetch<{ message: string }>(`/api/assessments/manage/${slug}/transfer/`, {
      method: 'POST',
      body: JSON.stringify({ to_user }),
    }),
  transferTestsBulk: (slugs: string[], to_user: number) =>
    apiFetch<{ message: string }>('/api/assessments/manage/transfer/', {
      method: 'POST',
      body: JSON.stringify({ slugs, to_user }),
    }),
  transferResource: (slug: string, to_user: number) =>
    apiFetch<{ message: string }>(`/api/resources/${slug}/transfer/`, {
      method: 'POST',
      body: JSON.stringify({ to_user }),
    }),
  transferResourcesBulk: (slugs: string[], to_user: number) =>
    apiFetch<{ message: string }>('/api/resources/transfer/', {
      method: 'POST',
      body: JSON.stringify({ slugs, to_user }),
    }),
};

export interface APISiteSettings {
  site_name: string;
  whatsapp_counsellor_number: string;
  whatsapp_group_url: string;
  whatsapp_counsellor_message: string;
  floating_whatsapp_enabled: boolean;
  floating_whatsapp_target: 'counsellor' | 'group';
  floating_whatsapp_message: string;
  support_phone: string;
  support_email: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  website_url: string;
  updated_at?: string;
}

export interface APICentre {
  id: number;
  name: string;
  address: string;
  city: string;
  phone: string;
  maps_url: string;
  latitude: number | string | null;
  longitude: number | string | null;
  embed_url: string;
  is_primary: boolean;
  is_active?: boolean;
  order: number;
  map_link: string;
  directions_link: string;
}

export interface APISiteConfig {
  settings: APISiteSettings;
  centres: APICentre[];
  counsellor_chat_url: string | null;
  floating_target_url: string | null;
}

export const SiteConfigAPI = {
  getPublicConfig: () => apiFetch<APISiteConfig>('/api/site/'),
  getAdminSettings: () => apiFetch<APISiteSettings>('/api/site/admin/settings/'),
  updateAdminSettings: (data: Partial<APISiteSettings>) =>
    apiFetch<APISiteSettings>('/api/site/admin/settings/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listAdminCentres: () => apiFetch<APICentre[]>('/api/site/admin/centres/'),
  createAdminCentre: (data: Partial<APICentre>) =>
    apiFetch<APICentre>('/api/site/admin/centres/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminCentre: (id: number, data: Partial<APICentre>) =>
    apiFetch<APICentre>(`/api/site/admin/centres/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminCentre: (id: number) =>
    apiFetch<void>(`/api/site/admin/centres/${id}/`, {
      method: 'DELETE',
    }),
};


