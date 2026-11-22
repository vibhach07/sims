import { apiFetch } from '../../../services/api';
import { ImportQuestion, PipelineJobState, TestConfig } from '../types/import.types';

export class ImportService {
  /**
   * Uploads file to pipeline endpoint. Returns job_id and initial state.
   */
  static async uploadDocument(file: File): Promise<PipelineJobState> {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<PipelineJobState>('/api/assessments/pipeline/upload/', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Polls job status until complete or failed.
   */
  static async pollJobStatus(jobId: string): Promise<PipelineJobState> {
    return apiFetch<PipelineJobState>(`/api/assessments/pipeline/status/${jobId}/`);
  }

  /**
   * Re-crops image region.
   */
  static async cropImage(imageFile: File, box: { x: number; y: number; width: number; height: number }): Promise<{ image_url: string }> {
    const fd = new FormData();
    fd.append('image', imageFile);
    fd.append('x', String(box.x));
    fd.append('y', String(box.y));
    fd.append('width', String(box.width));
    fd.append('height', String(box.height));

    return apiFetch<{ image_url: string }>('/api/assessments/pipeline/crop/', {
      method: 'POST',
      body: fd,
    });
  }

  /**
   * Commits the test series and all extracted questions to the database.
   */
  static async publishTestSeries(config: TestConfig, questions: ImportQuestion[]): Promise<{
    success: boolean;
    test_slug: string;
    test_id: number;
    message: string;
  }> {
    const payload = {
      title: config.title,
      exam: config.exam,
      category: config.category,
      duration_minutes: config.duration_minutes,
      default_marks: config.default_marks,
      default_negative_marks: config.default_negative_marks,
      starts_at: config.has_schedule ? config.starts_at : null,
      ends_at: config.has_schedule ? config.ends_at : null,
      integrity_mode: config.integrity_mode,
      is_paid: config.is_paid,
      price: config.price,
      is_published: config.is_published,
      max_attempts: config.is_unlimited_attempts ? null : config.max_attempts,
      description: config.description,
      questions: questions,
    };

    return apiFetch<{ success: boolean; test_slug: string; test_id: number; message: string }>(
      '/api/assessments/pipeline/publish/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  }
}

