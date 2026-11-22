export interface ImportQuestion {
  question_number: number;
  subject: string;
  question_en: string;
  question_hi?: string | null;
  option_a_en: string;
  option_a_hi?: string | null;
  option_b_en: string;
  option_b_hi?: string | null;
  option_c_en: string;
  option_c_hi?: string | null;
  option_d_en: string;
  option_d_hi?: string | null;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation_en?: string;
  explanation_hi?: string | null;
  marks: number;
  negative_marks: number;
  section?: 'A' | 'B';
  type?: 'MCQ' | 'MSQ' | 'NAT';
  has_math?: boolean;
  latex_confidence?: number;
  needs_review?: boolean;
  image_url?: string | null;
  validation_issues?: string[];
}

export interface TestConfig {
  title: string;
  exam: string;
  category: string;
  branch: string;
  test_type: string;
  assigned_package_id?: string | number;
  publishing_status: 'Published' | 'Draft';
  visibility: 'Restricted' | 'Public' | 'Private';
  available_immediately: boolean;
  subject: string;
  topic: string;
  duration_minutes: number;
  language: string;
  instructions: string;
  distribution_strategy: string;
  default_marks: number;
  default_negative_marks: number;
  starts_at?: string;
  ends_at?: string;
  has_schedule: boolean;
  integrity_mode: 'off' | 'warn' | 'strict';
  is_paid: boolean;
  price: string;
  is_published: boolean;
  max_attempts: string;
  is_unlimited_attempts: boolean;
  description: string;
}

export interface PipelineJobState {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  message: string;
  result?: {
    title: string;
    total_questions: number;
    questions: ImportQuestion[];
    extracted_images?: string[];
    warnings?: string[];
    errors?: any[];
  } | null;
  error?: string | null;
}

export type StepNumber = 1 | 2 | 3 | 4 | 5;

