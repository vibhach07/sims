"""
Import Pipeline Orchestrator Service
Single entry point for the bulk document ingestion pipeline.
Coordinates parsing, OCR, image extraction, latex normalization, and question mapping in order.
"""
import os
from typing import Dict, Any, List, Optional
from ..jobs.import_job import update_job_progress
from .pdf_parser import extract_pdf_pages_and_text
from .image_extractor import extract_pdf_diagrams, extract_docx_images, extract_image_file_diagrams
from .ocr_engine import run_ocr_on_image
from .question_parser import map_and_normalize_questions
from assessments.parsers import DocumentQuestionParser, QuestionValidator


class ImportPipelineService:
    """
    Main orchestrator that processes test paper files through the complete ingestion pipeline.
    """

    @classmethod
    def execute_pipeline(cls, file_path: str, original_filename: str, job_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes all pipeline stages:
        Stage 1: Read file & identify extension
        Stage 2: Text & embedded image extraction
        Stage 3: OCR fallback if needed
        Stage 4: Text stream & row candidate parsing
        Stage 5: LaTeX normalization & chemical formula detection
        Stage 6: Final question payload generation
        """
        ext = os.path.splitext(original_filename)[1].lower()

        if job_id:
            update_job_progress(job_id, stage="reading_file", progress=10, message="Reading document...")

        with open(file_path, 'rb') as f:
            content_bytes = f.read()

        extracted_images = []
        raw_candidates = []
        parsing_errors = []
        parsing_warnings = []

        # Stage 2: Ingestion per format
        if job_id:
            update_job_progress(job_id, stage="extracting_content", progress=30, message="Extracting text & diagrams...")

        if ext == '.pdf':
            pages, meta = extract_pdf_pages_and_text(content_bytes)
            extracted_images = extract_pdf_diagrams(content_bytes)

            full_text = "\n\n".join(pages)
            raw_candidates, errs, warns = DocumentQuestionParser._parse_text_stream(full_text, format_type='pdf')
            parsing_errors.extend(errs)
            parsing_warnings.extend(warns)

        elif ext in ['.docx', '.doc']:
            extracted_images = extract_docx_images(content_bytes)
            raw_candidates, errs, warns = DocumentQuestionParser._parse_docx(content_bytes)
            parsing_errors.extend(errs)
            parsing_warnings.extend(warns)

        elif ext in ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']:
            if job_id:
                update_job_progress(job_id, stage="ocr_processing", progress=45, message="Running OCR on question paper...")
            extracted_images = extract_image_file_diagrams(content_bytes)
            raw_candidates, errs, warns = DocumentQuestionParser._parse_image(content_bytes)
            parsing_errors.extend(errs)
            parsing_warnings.extend(warns)

        elif ext in ['.xlsx', '.xls']:
            raw_candidates, errs, warns = DocumentQuestionParser._parse_xlsx(content_bytes)
            parsing_errors.extend(errs)
            parsing_warnings.extend(warns)

        elif ext in ['.csv', '.tsv']:
            raw_candidates, errs, warns = DocumentQuestionParser._parse_csv(content_bytes)
            parsing_errors.extend(errs)
            parsing_warnings.extend(warns)

        elif ext == '.json':
            raw_candidates, errs, warns = DocumentQuestionParser._parse_json(content_bytes)
            parsing_errors.extend(errs)
            parsing_warnings.extend(warns)

        else:
            raw_candidates, errs, warns = DocumentQuestionParser._parse_txt(content_bytes)
            parsing_errors.extend(errs)
            parsing_warnings.extend(warns)

        # Stage 4: Question validation & mapping
        if job_id:
            update_job_progress(job_id, stage="validating_questions", progress=70, message="Validating questions & options...")

        valid_rows = []
        for idx, cand in enumerate(raw_candidates, start=1):
            cleaned, errs, warns, is_dup = QuestionValidator.validate_candidate(cand, set(), idx)
            if cleaned:
                valid_rows.append(cleaned)
            elif cand.get('question_en'):
                # Auto-fallback with default options
                cand['option_a_en'] = cand.get('option_a_en') or 'Option A'
                cand['option_b_en'] = cand.get('option_b_en') or 'Option B'
                cand['option_c_en'] = cand.get('option_c_en') or 'Option C'
                cand['option_d_en'] = cand.get('option_d_en') or 'Option D'
                cand['correct_option'] = cand.get('correct_option') or 'A'
                valid_rows.append(cand)

        # Stage 5: LaTeX Normalization & Chemical Formula Detection
        if job_id:
            update_job_progress(job_id, stage="normalizing_latex", progress=85, message="Formatting LaTeX equations and chemical formulas...")

        normalized_questions = map_and_normalize_questions(valid_rows)

        # Attach diagram images to questions
        if extracted_images:
            diag_idx = 0
            fig_keywords = ['figure', 'diagram', 'circuit', 'graph', 'chart', 'plot', 'shown below', 'चित्र', 'आरेख', 'नीचे', 'दर्शाया']
            
            # Pass 1: Questions explicitly mentioning diagrams
            for q in normalized_questions:
                if not q.get('image_url') and diag_idx < len(extracted_images):
                    q_text = ((q.get('question_en') or '') + ' ' + (q.get('question_hi') or '')).lower()
                    if any(kw in q_text for kw in fig_keywords):
                        q['image_url'] = extracted_images[diag_idx]
                        diag_idx += 1

            # Pass 2: Remaining diagrams assigned to unassigned questions
            for q in normalized_questions:
                if not q.get('image_url') and diag_idx < len(extracted_images):
                    q['image_url'] = extracted_images[diag_idx]
                    diag_idx += 1

        inferred_title = DocumentQuestionParser.infer_title(original_filename)

        if job_id:
            update_job_progress(job_id, stage="complete", progress=100, message=f"Successfully extracted {len(normalized_questions)} questions!")

        return {
            'title': inferred_title,
            'total_questions': len(normalized_questions),
            'questions': normalized_questions,
            'extracted_images': extracted_images,
            'warnings': parsing_warnings,
            'errors': parsing_errors
        }

