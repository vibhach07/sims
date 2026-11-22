"""
assessments/parsers.py
Context-aware parser for test questions from DOCX, PDF, XLSX, CSV, JSON, TXT, and ZIP bundles.
Preserves LaTeX formulas, bilingual content, handles image/diagram extraction, and provides
strict sequential option and question parsing.
"""
from __future__ import annotations
import os
import io
import re
import csv
import json
import uuid
import zipfile
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Tuple, Optional, Set

from django.core.files.uploadedfile import SimpleUploadedFile
from .image_processing import process_question_image, ImageValidationError


def clean_text(value: Any) -> str:
    """Normalize text by replacing non-breaking spaces and stripping leading/trailing whitespace."""
    if value is None:
        return ""
    return str(value).replace("\u00a0", " ").strip()


def normalize_for_comparison(text: str) -> str:
    """Lowercase and collapse whitespace while preserving Devanagari and math characters."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.strip().lower())


def normalize_key(value: str) -> str:
    """Canonicalize a column name for alias matching."""
    return re.sub(r'[^a-z0-9]', '', str(value).lower())


def pick_alias(row: Dict[str, Any], aliases: List[str]) -> Optional[Any]:
    """Look up a value in row using fuzzy alias matching."""
    normalized_row = {normalize_key(k): v for k, v in row.items()}
    for alias in aliases:
        canonical_alias = normalize_key(alias)
        if canonical_alias in normalized_row:
            val = normalized_row[canonical_alias]
            if clean_text(val) != "":
                return val
    return None


COLUMN_ALIASES = {
    'number': ["question_number", "question no", "question no.", "qno", "q no", "no", "number", "serial no", "sr no", "sr_no"],
    'subject': ["subject", "section", "topic"],
    'question_en': ["question_english", "question english", "question_en", "question en", "question", "english question"],
    'question_hi': ["question_hindi", "question hindi", "question_hi", "question hi", "hindi question", "prashna", "prashn"],
    'option_a_en': ["option_a_english", "option a english", "option_a_en", "option a en", "option_a", "option a", "a english", "a", "opt_a"],
    'option_a_hi': ["option_a_hindi", "option a hindi", "option_a_hi", "option a hi", "a hindi", "vikalp_a"],
    'option_b_en': ["option_b_english", "option b english", "option_b_en", "option b en", "option_b", "option b", "b english", "b", "opt_b"],
    'option_b_hi': ["option_b_hindi", "option b hindi", "option_b_hi", "option b hi", "b hindi", "vikalp_b"],
    'option_c_en': ["option_c_english", "option c english", "option_c_en", "option_c_en", "option_c", "option c", "c english", "c", "opt_c"],
    'option_c_hi': ["option_c_hindi", "option c hindi", "option_c_hi", "option c hi", "c hindi", "vikalp_c"],
    'option_d_en': ["option_d_english", "option d english", "option_d_en", "option d en", "option_d", "option d", "d english", "d", "opt_d"],
    'option_d_hi': ["option_d_hindi", "option_d_hi", "option_d_hi", "option d hindi", "option_d_hi", "option d hi", "d hindi", "vikalp_d"],
    'answer': ["answer", "correct answer", "correct_answer", "correct option", "correct_option", "expected answer", "ans", "uttar"],
    'explanation_en': ["explanation_english", "explanation english", "explanation_en", "explanation", "solution english", "solution", "vyakhya"],
    'explanation_hi': ["explanation_hindi", "explanation hindi", "explanation_hi", "solution hindi"],
    'marks': ["marks", "mark", "positive marks", "positive_marks"],
    'negative_marks': ["negative_marks", "negative marks", "negative", "negative marking", "negative_marking"],
    # Image column aliases
    'question_image': ["question_image", "question image", "q_image", "image", "img", "figure", "diagram", "question_figure"],
    'option_a_image': ["option_a_image", "option a image", "opt_a_image", "a_image", "image_a", "image a"],
    'option_b_image': ["option_b_image", "option b image", "opt_b_image", "b_image", "image_b", "image b"],
    'option_c_image': ["option_c_image", "option c image", "opt_c_image", "c_image", "image_c", "image c"],
    'option_d_image': ["option_d_image", "option_d_image", "option d image", "opt_d_image", "d_image", "image_d", "image d"],
    'explanation_image': ["explanation_image", "explanation image", "exp_image", "solution_image", "solution image"]
}


def extract_marks_and_clean(text: str) -> Tuple[str, Optional[str], Optional[str]]:
    marks, neg_marks = None, None
    if not text:
        return "", None, None

    m_combo = re.search(r'[\[\(]\s*(?:Marks?|Mark|Max\s*Marks?)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*[,;]?\s*(?:Negative(?:\s*Marks?)?|Neg)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*[\]\)]', text, re.I)
    if m_combo:
        marks, neg_marks = m_combo.group(1), m_combo.group(2)
        text = text[:m_combo.start()] + ' ' + text[m_combo.end():]

    m_pair = re.search(r'[\[\(]\s*\+?\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*-\s*([0-9]+(?:\.[0-9]+)?)\s*[\]\)]', text)
    if m_pair:
        if not marks:
            marks = m_pair.group(1)
        if not neg_marks:
            neg_marks = m_pair.group(2)
        text = text[:m_pair.start()] + ' ' + text[m_pair.end():]

    m_single = re.search(r'[\[\(]\s*([0-9]+(?:\.[0-9]+)?)\s*(?:Marks?|Mark|M|Points?)\s*[\]\)]', text, re.I)
    if m_single:
        if not marks:
            marks = m_single.group(1)
        text = text[:m_single.start()] + ' ' + text[m_single.end():]

    m_neg = re.search(r'[\[\(]\s*(?:Negative(?:\s*Marks?)?|Neg)\s*[:=]?\s*-?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:Marks?)?\s*[\]\)]', text, re.I)
    if m_neg:
        if not neg_marks:
            neg_marks = m_neg.group(1)
        text = text[:m_neg.start()] + ' ' + text[m_neg.end():]

    cleaned = re.sub(r'\s+', ' ', text).strip()
    return cleaned, marks, neg_marks


def extract_inline_options(line: str) -> Optional[Dict[str, str]]:
    """
    Extracts multiple options defined on a single line.
    Matches: (A) ... (B) ... (C) ... (D) ... OR A. ... B. ... C. ... D. ...
    """
    matches = list(re.finditer(r'(?:^|[\s\t]+)(?:\(([A-Da-d1-4])\)|([A-Da-d1-4])[\.\:\)])\s+', line))
    if len(matches) >= 2:
        opts: Dict[str, str] = {}
        for idx, m in enumerate(matches):
            key = (m.group(1) or m.group(2)).upper()
            if key in ('1', '2', '3', '4'):
                key = 'ABCD'[int(key) - 1]
            start_val = m.end()
            end_val = matches[idx + 1].start() if idx + 1 < len(matches) else len(line)
            val = line[start_val:end_val].strip()
            opts[key] = val
        return opts
    return None


def resolve_inline_image_tokens(text: str, image_map: Dict[str, str], warnings: List[str]) -> str:
    """
    Replaces:
    - ![alt](file.ext)
    - [image: file.ext]
    - <img src="file.ext">
    - bare filename tokens matching keys in image_map
    with [[IMG:<public_id>]].
    Rejects remote URLs (http:// or https://) with security warning (SSRF prevention).
    """
    if not text:
        return ""

    # Check for remote URLs
    remote_urls = re.findall(r'(?:https?://[^\s\)\"\'>]+)', text)
    for u in remote_urls:
        warnings.append(f"Remote image URL '{u}' rejected for security; embed images in document or upload in ZIP bundle.")

    # 1. Markdown image: ![alt](filename)
    def repl_md(m):
        fname = m.group(2).strip()
        base_name = os.path.basename(fname).lower()
        if base_name in image_map:
            return f"[[IMG:{image_map[base_name]}]]"
        if not (fname.startswith("http://") or fname.startswith("https://") or fname.startswith("/media/")):
            warnings.append(f"Referenced image file '{fname}' not found in upload archive.")
        return m.group(0)

    text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', repl_md, text)

    # 2. Tag format: [image: filename]
    def repl_tag(m):
        fname = m.group(1).strip()
        base_name = os.path.basename(fname).lower()
        if base_name in image_map:
            return f"[[IMG:{image_map[base_name]}]]"
        warnings.append(f"Referenced image file '{fname}' not found in upload archive.")
        return m.group(0)

    text = re.sub(r'\[image:\s*([^\]]+)\]', repl_tag, text, flags=re.I)

    # 3. HTML img: <img src="filename"...>
    def repl_html(m):
        fname = m.group(1).strip()
        base_name = os.path.basename(fname).lower()
        if base_name in image_map:
            return f"[[IMG:{image_map[base_name]}]]"
        if not (fname.startswith("http://") or fname.startswith("https://") or fname.startswith("/media/")):
            warnings.append(f"Referenced image file '{fname}' not found in upload archive.")
        return m.group(0)

    text = re.sub(r'<img\s+[^>]*src=[\'"]([^\'"]+)[\'"][^>]*>', repl_html, text, flags=re.I)

    # 4. Bare filename tokens matching image_map keys
    for fname, pub_id in image_map.items():
        pattern = r'(?<!\[\[IMG:)\b' + re.escape(fname) + r'\b'
        text = re.sub(pattern, f"[[IMG:{pub_id}]]", text, flags=re.I)

    return text


def normalize_correct_option(
    value: Any,
    format_type: str = 'table',
    source_had_numeric_options: bool = False
) -> Tuple[Optional[str], Optional[str]]:
    if value is None or clean_text(value) == "":
        return None, None

    if format_type == 'json' and isinstance(value, int):
        if 0 <= value <= 3:
            return "ABCD"[value], None
        return None, f"JSON correct_answer integer {value} out of range [0-3]."

    text = clean_text(value).upper()
    if not text:
        return None, None

    if re.search(r'\b(AND|OR)\b|[,;&+]', text) and re.search(r'[A-D1-4]', text):
        return None, f"Multiple-correct answer '{text}' detected; current schema supports single-choice MCQs only."

    cleaned = re.sub(r'^(?:OPTION|ANS(?:WER)?|CORRECT(?:\s*OPTION)?|उत्तर)\s*[:.\-]?\s*', '', text).strip()

    m_alpha = re.match(r'^\(?([A-D])\)?[\.\:\-]?$', cleaned)
    if m_alpha:
        return m_alpha.group(1), None

    if format_type == 'json':
        if cleaned in ('0', '1', '2', '3'):
            return "ABCD"[int(cleaned)], None

    if format_type in ('docx', 'pdf', 'zip') or source_had_numeric_options:
        m_num = re.match(r'^\(?([1-4])\)?[\.\:\-]?$', cleaned)
        if m_num:
            num = int(m_num.group(1))
            return "ABCD"[num - 1], None

    m_bracket_num = re.match(r'^\(([1-4])\)$', cleaned)
    if m_bracket_num:
        num = int(m_bracket_num.group(1))
        return "ABCD"[num - 1], None

    if cleaned == '0':
        return 'A', None
    if cleaned == '4':
        return 'D', None

    if cleaned in ('1', '2', '3'):
        return None, (
            f"Ambiguous numeric answer '{text}' in tabular format. "
            f"Please specify option letter ('A', 'B', 'C', 'D') or bracketed 1-based '(1)'-'(4)' "
            f"to prevent misgrading between 0-indexed and 1-indexed conventions."
        )

    return None, f"Ambiguous or unsupported correct answer '{text}'. Must be A, B, C, D, or (1)-(4)."


class DocumentQuestionParser:
    """
    Unified question ingestion supporting CSV, XLSX, DOCX, PDF, JSON, TXT, and ZIP archives.
    Handles diagrams, formulas, bilingual blocks, and sequential option/question parsing.
    """

    @classmethod
    def parse_file(
        cls,
        file_obj,
        test_series=None,
        user=None,
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        fname = getattr(file_obj, 'name', '').lower()
        if hasattr(file_obj, 'seek'):
            try:
                file_obj.seek(0)
            except Exception:
                pass
        content_bytes = file_obj.read() if hasattr(file_obj, 'read') else b''

        if fname.endswith('.zip'):
            return cls._parse_zip(content_bytes, test_series=test_series, user=user)
        elif fname.endswith('.csv'):
            return cls._parse_csv(content_bytes, image_map=image_map)
        elif fname.endswith('.xlsx'):
            if not content_bytes.startswith(b'PK\x03\x04'):
                return [], [{'row': 0, 'question': 'Corrupt File', 'errors': ['File does not have valid XLSX zip magic bytes.']}], []
            return cls._parse_xlsx(content_bytes, test_series=test_series, user=user, image_map=image_map)
        elif fname.endswith('.docx'):
            if not content_bytes.startswith(b'PK\x03\x04'):
                return [], [{'row': 0, 'question': 'Corrupt File', 'errors': ['File does not have valid DOCX zip magic bytes.']}], []
            return cls._parse_docx(content_bytes, test_series=test_series, user=user, image_map=image_map)
        elif fname.endswith('.pdf'):
            if not content_bytes.startswith(b'%PDF'):
                return [], [{'row': 0, 'question': 'Corrupt File', 'errors': ['File does not have valid PDF magic bytes (%PDF).']}], []
            return cls._parse_pdf(content_bytes, test_series=test_series, user=user)
        elif fname.endswith('.json'):
            return cls._parse_json(content_bytes, image_map=image_map)
        elif fname.endswith('.txt'):
            return cls._parse_txt(content_bytes, image_map=image_map)
        elif fname.endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff')):
            return cls._parse_image(content_bytes)
        else:
            return [], [{
                'row': 0,
                'question': 'File Format Error',
                'errors': [f'Unsupported file format "{fname}". Supported formats are PDF, Word (.docx), Excel (.xlsx), CSV, JSON, TXT, ZIP, and images (PNG, JPG, WEBP).']
            }], []

    @classmethod
    def infer_title(cls, file_name: str, sample_text: str = '') -> str:
        """Infers an intelligent test series title from file name or first lines."""
        if sample_text:
            lines = [clean_text(l) for l in sample_text.split('\n') if clean_text(l)]
            for l in lines[:5]:
                if not re.match(r'^(?:Q(?:uestion)?\s*\d+|[A-D][\)\.]|\(\s*[A-D]\s*\)|Answer|Marks)', l, re.IGNORECASE):
                    if 6 <= len(l) <= 120:
                        return l

        base = re.sub(r'\.[a-zA-Z0-9]+$', '', file_name or '')
        clean = re.sub(r'[\-_.]+', ' ', base).strip()
        if clean:
            return clean.title()
        return "Imported Test Series"

    @classmethod
    def _save_image_record(
        cls,
        raw_bytes: bytes,
        source_name: str,
        test_series=None,
        user=None,
        src_rect: Optional[Dict[str, int]] = None
    ) -> Optional[str]:
        """Processes raw bytes, persists QuestionImage, and returns public_id UUID string."""
        from .models import QuestionImage
        try:
            processed = process_question_image(raw_bytes, source_name=source_name, src_rect=src_rect)
            if not processed:
                return None
            proc_bytes, mime, w, h, content_hash = processed

            # Dedupe within same test_series if provided
            if test_series:
                existing = QuestionImage.objects.filter(test_series=test_series, content_hash=content_hash).first()
                if existing:
                    return str(existing.public_id)

            ext = 'png' if 'png' in mime else 'jpg'
            uploaded = SimpleUploadedFile(f"{uuid.uuid4().hex}.{ext}", proc_bytes, content_type=mime)
            img_obj = QuestionImage.objects.create(
                test_series=test_series,
                image=uploaded,
                width=w,
                height=h,
                source_name=source_name,
                content_hash=content_hash,
                created_by=user
            )
            return str(img_obj.public_id)
        except Exception:
            return None

    @classmethod
    def _parse_zip(
        cls,
        content_bytes: bytes,
        test_series=None,
        user=None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """Safely parses a ZIP bundle with questions file and image assets."""
        try:
            zf = zipfile.ZipFile(io.BytesIO(content_bytes))
        except Exception as e:
            return [], [{'row': 0, 'question': 'ZIP Error', 'errors': [f'Invalid or corrupt ZIP archive: {str(e)}']}], []

        # Zip bomb safeguards: max 500 files, max 100MB uncompressed
        MAX_ENTRIES = 500
        MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
        entries = zf.infolist()
        if len(entries) > MAX_ENTRIES:
            return [], [{'row': 0, 'question': 'ZIP Error', 'errors': [f'ZIP archive contains too many files ({len(entries)} > {MAX_ENTRIES}).']}], []

        total_uncompressed = sum(e.file_size for e in entries)
        if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
            return [], [{'row': 0, 'question': 'ZIP Error', 'errors': [f'ZIP uncompressed size exceeds limit ({total_uncompressed} bytes).']}], []

        image_map: Dict[str, str] = {}
        question_docs: List[zipfile.ZipInfo] = []
        warnings: List[str] = []

        for entry in entries:
            # Traversal check
            if entry.filename.startswith('/') or entry.filename.startswith('\\') or '..' in entry.filename:
                return [], [{'row': 0, 'question': 'Security Violation', 'errors': [f'Path traversal detected in ZIP entry "{entry.filename}".']}], []

            if entry.is_dir() or '__MACOSX' in entry.filename or os.path.basename(entry.filename).startswith('.'):
                continue

            fname_lower = entry.filename.lower()
            base_name = os.path.basename(fname_lower)

            if base_name.endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff')):
                raw_bytes = zf.read(entry)
                pub_id = cls._save_image_record(raw_bytes, source_name=base_name, test_series=test_series, user=user)
                if pub_id:
                    image_map[base_name] = pub_id
                    image_map[fname_lower] = pub_id
            elif base_name.endswith(('.csv', '.xlsx', '.docx', '.json')):
                question_docs.append(entry)

        if not question_docs:
            return [], [{'row': 0, 'question': 'Missing Questions Document', 'errors': ['ZIP archive contains no recognized question document (.csv, .xlsx, .docx, or .json).']}], []

        if len(question_docs) > 1:
            doc_names = ", ".join([d.filename for d in question_docs])
            return [], [{'row': 0, 'question': 'Multiple Documents in ZIP', 'errors': [f'ZIP archive contains multiple question documents ({doc_names}). Please provide exactly one.']}], []

        target_doc = question_docs[0]
        doc_bytes = zf.read(target_doc)
        doc_name = target_doc.filename.lower()

        doc_file = io.BytesIO(doc_bytes)
        setattr(doc_file, 'name', doc_name)

        recs, errs, doc_warns = cls.parse_file(doc_file, test_series=test_series, user=user, image_map=image_map)
        all_warnings = list(dict.fromkeys(warnings + doc_warns))
        return recs, errs, all_warnings

    @classmethod
    def _parse_csv(
        cls,
        content_bytes: bytes,
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        try:
            content_str = content_bytes.decode('utf-8-sig')
        except UnicodeDecodeError:
            content_str = content_bytes.decode('latin-1', errors='replace')

        reader = csv.DictReader(io.StringIO(content_str))
        if not reader.fieldnames:
            return [], [{'row': 0, 'question': 'Empty File', 'errors': ['CSV file contains no columns or data.']}], []

        rows = list(reader)
        if not rows:
            return [], [{'row': 0, 'question': 'Empty File', 'errors': ['CSV file contains headers but no question data rows.']}], []

        return cls._map_table_rows(rows, format_type='csv', image_map=image_map)

    @classmethod
    def _parse_xlsx(
        cls,
        content_bytes: bytes,
        test_series=None,
        user=None,
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            ws = wb.active
            rows_iter = ws.iter_rows(values_only=True)
            try:
                headers = next(rows_iter)
            except StopIteration:
                return [], [{'row': 0, 'question': 'Empty Sheet', 'errors': ['Excel sheet contains no data.']}], []

            clean_headers = [clean_text(h) if h is not None else f"col_{idx}" for idx, h in enumerate(headers)]
            if not any(clean_headers):
                return [], [{'row': 0, 'question': 'Empty Sheet', 'errors': ['Excel header row contains only blank cells.']}], []

            rows: List[Dict[str, Any]] = []
            for r in rows_iter:
                if any(c is not None and clean_text(c) != "" for c in r):
                    row_dict = {clean_headers[i]: r[i] for i in range(min(len(clean_headers), len(r)))}
                    rows.append(row_dict)

            if not rows:
                return [], [{'row': 0, 'question': 'Empty Sheet', 'errors': ['Excel sheet contains headers but no question data rows.']}], []

            # Handle openpyxl embedded drawings if present
            active_img_map = dict(image_map or {})
            if hasattr(ws, '_images') and ws._images:
                for img_idx, img in enumerate(ws._images):
                    try:
                        raw = img._data()
                        pub_id = cls._save_image_record(raw, source_name=f"xlsx_img_{img_idx}", test_series=test_series, user=user)
                        if pub_id:
                            active_img_map[f"xlsx_img_{img_idx}"] = pub_id
                    except Exception:
                        pass

            return cls._map_table_rows(rows, format_type='xlsx', image_map=active_img_map)
        except Exception as e:
            return [], [{'row': 0, 'question': 'Excel Error', 'errors': [f'Failed to parse Excel workbook: {str(e)}']}], []

    @classmethod
    def _map_table_rows(
        cls,
        raw_rows: List[Dict[str, Any]],
        format_type: str = 'table',
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        questions: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []
        warnings: List[str] = []
        img_map = image_map or {}

        for idx, row in enumerate(raw_rows, start=1):
            q_num_raw = pick_alias(row, COLUMN_ALIASES['number'])
            q_num = None
            if q_num_raw is not None and clean_text(q_num_raw) != "":
                try:
                    q_num = int(clean_text(q_num_raw))
                except (ValueError, TypeError):
                    warnings.append(f"Row {idx}: Invalid question number '{q_num_raw}', will be auto-assigned.")

            subj = clean_text(pick_alias(row, COLUMN_ALIASES['subject'])) or 'General'

            q_en = clean_text(pick_alias(row, COLUMN_ALIASES['question_en']))
            q_hi = clean_text(pick_alias(row, COLUMN_ALIASES['question_hi'])) or None

            # Resolve image columns
            def resolve_img_col(col_key: str) -> str:
                val = clean_text(pick_alias(row, COLUMN_ALIASES[col_key]))
                if not val:
                    return ""
                markers = []
                for token in re.split(r'[,;|\s]+', val):
                    tok = os.path.basename(token).lower()
                    if tok in img_map:
                        markers.append(f"[[IMG:{img_map[tok]}]]")
                    else:
                        warnings.append(f"Row {idx}: Referenced image '{token}' not found in upload archive.")
                return " ".join(markers)

            q_img_marker = resolve_img_col('question_image')
            if q_img_marker:
                q_en = f"{q_en}\n{q_img_marker}".strip() if q_en else q_img_marker

            q_en = resolve_inline_image_tokens(q_en, img_map, warnings)
            if q_hi:
                q_hi = resolve_inline_image_tokens(q_hi, img_map, warnings)

            opt_a_en = clean_text(pick_alias(row, COLUMN_ALIASES['option_a_en']))
            opt_b_en = clean_text(pick_alias(row, COLUMN_ALIASES['option_b_en']))
            opt_c_en = clean_text(pick_alias(row, COLUMN_ALIASES['option_c_en']))
            opt_d_en = clean_text(pick_alias(row, COLUMN_ALIASES['option_d_en']))

            # Option images
            opt_a_img = resolve_img_col('option_a_image')
            if opt_a_img:
                opt_a_en = f"{opt_a_en} {opt_a_img}".strip() if opt_a_en else opt_a_img
            opt_b_img = resolve_img_col('option_b_image')
            if opt_b_img:
                opt_b_en = f"{opt_b_en} {opt_b_img}".strip() if opt_b_en else opt_b_img
            opt_c_img = resolve_img_col('option_c_image')
            if opt_c_img:
                opt_c_en = f"{opt_c_en} {opt_c_img}".strip() if opt_c_en else opt_c_img
            opt_d_img = resolve_img_col('option_d_image')
            if opt_d_img:
                opt_d_en = f"{opt_d_en} {opt_d_img}".strip() if opt_d_en else opt_d_img

            opt_a_en = resolve_inline_image_tokens(opt_a_en, img_map, warnings)
            opt_b_en = resolve_inline_image_tokens(opt_b_en, img_map, warnings)
            opt_c_en = resolve_inline_image_tokens(opt_c_en, img_map, warnings)
            opt_d_en = resolve_inline_image_tokens(opt_d_en, img_map, warnings)

            opt_a_hi = clean_text(pick_alias(row, COLUMN_ALIASES['option_a_hi'])) or None
            opt_b_hi = clean_text(pick_alias(row, COLUMN_ALIASES['option_b_hi'])) or None
            opt_c_hi = clean_text(pick_alias(row, COLUMN_ALIASES['option_c_hi'])) or None
            opt_d_hi = clean_text(pick_alias(row, COLUMN_ALIASES['option_d_hi'])) or None

            ans_raw = pick_alias(row, COLUMN_ALIASES['answer'])
            if ans_raw is None and 'correct_answer' in row:
                ans_raw = row['correct_answer']

            exp_en = clean_text(pick_alias(row, COLUMN_ALIASES['explanation_en']))
            exp_img = resolve_img_col('explanation_image')
            if exp_img:
                exp_en = f"{exp_en}\n{exp_img}".strip() if exp_en else exp_img
            exp_en = resolve_inline_image_tokens(exp_en, img_map, warnings)
            exp_hi = clean_text(pick_alias(row, COLUMN_ALIASES['explanation_hi'])) or None

            marks_raw = pick_alias(row, COLUMN_ALIASES['marks'])
            neg_marks_raw = pick_alias(row, COLUMN_ALIASES['negative_marks'])

            marks = None
            if marks_raw is not None and clean_text(marks_raw) != "":
                try:
                    marks = str(Decimal(clean_text(marks_raw)))
                except (InvalidOperation, ValueError):
                    warnings.append(f"Row {idx}: Invalid marks '{marks_raw}', ignoring.")

            neg_marks = None
            if neg_marks_raw is not None and clean_text(neg_marks_raw) != "":
                try:
                    neg_marks = str(abs(Decimal(clean_text(neg_marks_raw))))
                except (InvalidOperation, ValueError):
                    warnings.append(f"Row {idx}: Invalid negative marks '{neg_marks_raw}', ignoring.")

            questions.append({
                'row_number': idx,
                'question_number': q_num,
                'subject': subj,
                'question_en': q_en,
                'question_hi': q_hi,
                'option_a_en': opt_a_en,
                'option_a_hi': opt_a_hi,
                'option_b_en': opt_b_en,
                'option_b_hi': opt_b_hi,
                'option_c_en': opt_c_en,
                'option_c_hi': opt_c_hi,
                'option_d_en': opt_d_en,
                'option_d_hi': opt_d_hi,
                'answer_raw': ans_raw,
                'explanation_en': exp_en,
                'explanation_hi': exp_hi,
                'marks': marks,
                'negative_marks': neg_marks,
                'format_type': format_type,
            })

        return questions, errors, warnings

    @classmethod
    def _omml_to_latex(cls, elem) -> str:
        tag = elem.tag.split('}')[-1]
        if tag == 't':
            return elem.text or ''
        if tag == 'f':
            num = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}num'))
            den = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}den'))
            return f'\\frac{{{num}}}{{{den}}}'
        if tag == 'sSup':
            base = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}e'))
            sup = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}sup'))
            return f'{{{base}}}^{{{sup}}}'
        if tag == 'sSub':
            base = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}e'))
            sub = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}sub'))
            return f'{{{base}}}_{{{sub}}}'
        if tag == 'sSubSup':
            base = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}e'))
            sub = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}sub'))
            sup = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}sup'))
            return f'{{{base}}}_{{{sub}}}^{{{sup}}}'
        if tag == 'rad':
            base = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}e'))
            deg_elem = elem.findall('{*}deg')
            deg = ''.join(cls._omml_to_latex(c) for c in deg_elem) if deg_elem else ''
            return f'\\sqrt[{deg}]{{{base}}}' if deg else f'\\sqrt{{{base}}}'
        if tag == 'd':
            inner = ''.join(cls._omml_to_latex(c) for c in elem.findall('{*}e'))
            return f'\\left({inner}\\right)'
        return ''.join(cls._omml_to_latex(c) for c in elem)

    @classmethod
    def _parse_docx(
        cls,
        content_bytes: bytes,
        test_series=None,
        user=None,
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(content_bytes))
            full_lines: List[str] = []
            docx_warnings: List[str] = []
            q_counter = 0
            active_img_map = dict(image_map or {})

            def extract_images_from_element(elem) -> str:
                """Extracts inline drawings or warns if Word shapes."""
                text_frags = []
                shapes = elem.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}sp') + \
                         elem.findall('.//{urn:schemas-microsoft-com:vml}shape')
                blips = elem.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip')
                vml_imgs = elem.findall('.//{urn:schemas-microsoft-com:vml}imagedata')

                if shapes and not (blips or vml_imgs):
                    q_label = f"Question {q_counter if q_counter > 0 else 1}"
                    docx_warnings.append(f"{q_label}: diagram drawn with Word shapes, paste it as a picture.")

                for blip in blips:
                    r_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    if r_id and r_id in doc.part.related_parts:
                        src_rect = None
                        src_elem = elem.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}srcRect')
                        if src_elem is not None:
                            try:
                                src_rect = {
                                    'l': int(src_elem.get('l', 0)),
                                    't': int(src_elem.get('t', 0)),
                                    'r': int(src_elem.get('r', 0)),
                                    'b': int(src_elem.get('b', 0)),
                                }
                            except Exception:
                                pass
                        blob = doc.part.related_parts[r_id].blob
                        pub_id = cls._save_image_record(blob, source_name=f"docx_{r_id}", test_series=test_series, user=user, src_rect=src_rect)
                        if pub_id:
                            text_frags.append(f"[[IMG:{pub_id}]]")

                for vml in vml_imgs:
                    r_id = vml.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                    if r_id and r_id in doc.part.related_parts:
                        blob = doc.part.related_parts[r_id].blob
                        pub_id = cls._save_image_record(blob, source_name=f"docx_{r_id}", test_series=test_series, user=user)
                        if pub_id:
                            text_frags.append(f"[[IMG:{pub_id}]]")

                return " ".join(text_frags)

            for element in doc.element.body:
                xml_str = element.xml if hasattr(element, 'xml') else ''
                if 'oMath' in element.tag or 'oMathPara' in element.tag or 'm:oMath' in xml_str or 'oMath' in xml_str:
                    q_num_label = f"Q{q_counter}" if q_counter > 0 else "document"
                    docx_warnings.append(f"Equation object in {q_num_label}: type it as LaTeX using $...$; Word equation objects are converted.")

                if element.tag.endswith('p'):
                    p = docx.text.paragraph.Paragraph(element, doc)
                    parts = []
                    for child in p._p:
                        tag = child.tag.split('}')[-1]
                        if tag == 'r':
                            r = docx.text.run.Run(child, p)
                            t = r.text or ''
                            img_marker = extract_images_from_element(child)
                            if img_marker:
                                t = f"{t} {img_marker}".strip() if t else img_marker
                            if r.font.superscript and len(t) <= 10 and re.match(r'^[a-zA-Z0-9+\-=()]+$', t.strip()):
                                parts.append(f"^{{{t.strip()}}}")
                            elif r.font.subscript and len(t) <= 10 and re.match(r'^[a-zA-Z0-9+\-=()]+$', t.strip()):
                                parts.append(f"_{{{t.strip()}}}")
                            else:
                                parts.append(t)
                        elif tag in ('oMath', 'oMathPara'):
                            latex = cls._omml_to_latex(child)
                            if latex:
                                parts.append(f"${latex}$")
                        elif tag == 'drawing':
                            img_marker = extract_images_from_element(child)
                            if img_marker:
                                parts.append(img_marker)

                    p_text = clean_text("".join(parts))
                    if p_text:
                        if re.match(r'^(?:Q(?:uestion)?\s*|\bQ\s*)?\d+[\.\:\-\)]', p_text, re.I):
                            q_counter += 1
                        full_lines.append(p_text)

                elif element.tag.endswith('tbl'):
                    t = docx.table.Table(element, doc)
                    table_cells = []
                    for row in t.rows:
                        for cell in row.cells:
                            cell_p_texts = []
                            for p in cell.paragraphs:
                                p_imgs = extract_images_from_element(p._p)
                                c_txt = clean_text(p.text)
                                if p_imgs:
                                    c_txt = f"{c_txt} {p_imgs}".strip() if c_txt else p_imgs
                                if c_txt:
                                    cell_p_texts.append(c_txt)
                            cell_val = " ".join(cell_p_texts).strip()
                            if cell_val:
                                table_cells.append(cell_val)

                    # Check if table represents options (2x2, 4x1, 1x4)
                    if len(table_cells) == 4 and not any(re.match(r'^(?:Q|Question|\d+[\.\)])', c, re.I) for c in table_cells):
                        labels = ['(A)', '(B)', '(C)', '(D)']
                        for idx_c, cell_c in enumerate(table_cells):
                            if not re.match(r'^\(?([A-Da-d1-4])[\.\:\)]', cell_c):
                                full_lines.append(f"{labels[idx_c]} {cell_c}")
                            else:
                                full_lines.append(cell_c)
                    else:
                        for cell_val in table_cells:
                            full_lines.append(cell_val)

            full_text = "\n".join(full_lines).strip()
            if not full_text:
                return [], [{'row': 0, 'question': 'Empty Document', 'errors': ['Word document contains no readable text or questions.']}], []

            records, parse_errs, stream_warns = cls._parse_text_stream(full_text, format_type='docx', image_map=active_img_map)
            all_warnings = list(dict.fromkeys(docx_warnings + stream_warns))
            return records, parse_errs, all_warnings
        except Exception as e:
            return [], [{'row': 0, 'question': 'DOCX Error', 'errors': [f'Failed to parse Word document: {str(e)}']}], []

    @classmethod
    def _parse_pdf(
        cls,
        content_bytes: bytes,
        test_series=None,
        user=None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        try:
            import pdfplumber
            warnings: List[str] = []
            extracted_lines: List[str] = []
            hash_page_counts: Dict[str, Set[int]] = {}
            candidate_images: List[Tuple[int, bytes, Tuple[float, float, float, float]]] = []

            with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
                if len(pdf.pages) == 0:
                    return [], [{'row': 0, 'question': 'Empty PDF', 'errors': ['PDF file has 0 pages.']}], []

                for page_idx, page in enumerate(pdf.pages, start=1):
                    # 1. Extract text handling potential two-column layout
                    words = page.extract_words()
                    mid_x = page.width / 2.0
                    col1_words = [w for w in words if w['x1'] <= mid_x + 10]
                    col2_words = [w for w in words if w['x0'] >= mid_x - 10]

                    is_two_col = len(col1_words) > 20 and len(col2_words) > 20 and (len(col1_words) + len(col2_words)) >= len(words) * 0.85

                    if is_two_col:
                        col1_words.sort(key=lambda w: (round(w['top'], -1), w['x0']))
                        col2_words.sort(key=lambda w: (round(w['top'], -1), w['x0']))
                        page_text = " ".join(w['text'] for w in col1_words) + "\n" + " ".join(w['text'] for w in col2_words)
                    else:
                        page_text = page.extract_text() or ''

                    # 2. Extract raster & vector drawings
                    drawings = [d for d in (page.curves + page.rects) if d['width'] >= 25 and d['height'] >= 25 and d['width'] < page.width * 0.95 and d['height'] < page.height * 0.95]
                    figure_boxes = []
                    for d in drawings:
                        bbox = (d['x0'], d['top'], d['x1'], d['bottom'])
                        figure_boxes.append(bbox)

                    for img in page.images:
                        if img['width'] >= 25 and img['height'] >= 25 and img['width'] < page.width * 0.95 and img['height'] < page.height * 0.95:
                            figure_boxes.append((img['x0'], img['top'], img['x1'], img['bottom']))

                    for bbox in figure_boxes:
                        try:
                            crop_box = (
                                max(0, bbox[0] - 5),
                                max(0, bbox[1] - 5),
                                min(page.width, bbox[2] + 5),
                                min(page.height, bbox[3] + 5)
                            )
                            cropped_img = page.crop(crop_box).to_image(resolution=200).original
                            buf = io.BytesIO()
                            cropped_img.save(buf, format="PNG")
                            raw_b = buf.getvalue()
                            proc = process_question_image(raw_b, source_name=f"pdf_p{page_idx}")
                            if proc:
                                p_bytes, mime, w, h, c_hash = proc
                                if c_hash not in hash_page_counts:
                                    hash_page_counts[c_hash] = set()
                                hash_page_counts[c_hash].add(page_idx)
                                candidate_images.append((page_idx, raw_b, crop_box))
                        except Exception:
                            pass

                    if page_text:
                        extracted_lines.append(page_text)

            # Drop decorative repeated logos (images on 3 or more pages)
            valid_images_map: Dict[str, str] = {}
            for page_idx, raw_b, bbox in candidate_images:
                proc = process_question_image(raw_b, source_name=f"pdf_p{page_idx}")
                if proc:
                    _, _, _, _, c_hash = proc
                    if len(hash_page_counts.get(c_hash, set())) >= 3:
                        continue
                    pub_id = cls._save_image_record(raw_b, source_name=f"pdf_p{page_idx}", test_series=test_series, user=user)
                    if pub_id:
                        valid_images_map[f"pdf_fig_{len(valid_images_map)+1}"] = pub_id
                        extracted_lines.append(f"[[IMG:{pub_id}]]")

            full_text = "\n".join(extracted_lines).strip()
            if not full_text or len(full_text) < 30:
                warnings.append("PDF contains very little selectable text; scanned documents require OCR.")

            records, errs, stream_warns = cls._parse_text_stream(full_text, format_type='pdf', image_map=valid_images_map)
            all_warnings = list(dict.fromkeys(warnings + stream_warns))
            return records, errs, all_warnings
        except Exception as e:
            return [], [{'row': 0, 'question': 'PDF Error', 'errors': [f'Failed to extract text from PDF: {str(e)}']}], []

    @classmethod
    def _parse_json(
        cls,
        content_bytes: bytes,
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        try:
            content_str = content_bytes.decode('utf-8-sig')
            payload = json.loads(content_str)
            raw_items = payload.get('questions', payload) if isinstance(payload, dict) else payload
            if not isinstance(raw_items, list):
                return [], [{'row': 0, 'question': 'JSON Payload', 'errors': ['Expected JSON list or object with "questions" array.']}], []
            return cls._map_table_rows(raw_items, format_type='json', image_map=image_map)
        except Exception as e:
            return [], [{'row': 0, 'question': 'JSON Error', 'errors': [f'Failed to parse JSON file: {str(e)}']}], []

    @classmethod
    def _parse_txt(
        cls,
        content_bytes: bytes,
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        try:
            content_str = content_bytes.decode('utf-8-sig')
        except UnicodeDecodeError:
            content_str = content_bytes.decode('latin-1', errors='replace')
        return cls._parse_text_stream(content_str, format_type='txt', image_map=image_map)

    @classmethod
    def _parse_image(cls, content_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        try:
            from PIL import Image
            import pytesseract
            img = Image.open(io.BytesIO(content_bytes)).convert('L')
            text = pytesseract.image_to_string(img)
            if not text or len(text.strip()) < 10:
                return [], [{'row': 0, 'question': 'Image OCR Error', 'errors': ['No recognizable text could be extracted from image.']}], []
            recs, errs, warns = cls._parse_text_stream(text, format_type='image')
            warns.insert(0, "Extracted from image via OCR; please review question formulas and option letters.")
            return recs, errs, warns
        except Exception as e:
            return [], [{'row': 0, 'question': 'Image Error', 'errors': [f'Failed to OCR image: {str(e)}']}], []

    @classmethod
    def _parse_text_stream(
        cls,
        text: str,
        format_type: str = 'docx',
        image_map: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """
        Context-aware sequential parser:
        - A line is an OPTION only if it continues the expected sequence for the CURRENT question:
          A->B->C->D or 1->2->3->4, in that order, after a question stem exists.
        - A line is a NEW QUESTION only if its number equals previous question number + 1 (or starts with Q/Question),
          and the current question already has at least 2 options (or file has no options for it).
        - A "1." that follows a question stem and starts a 1-2-3-4 run is option 1, never question 1.
        """
        lines = [clean_text(line) for line in text.replace("\r", "").split("\n") if clean_text(line)]
        records: List[Dict[str, Any]] = []
        warnings: List[str] = []
        img_map = image_map or {}

        current: Optional[Dict[str, Any]] = None
        current_field = 'question_en'
        in_explanation = False
        in_answer_key = False
        answer_key_lines: List[str] = []

        # Sequence state for current question
        expected_opt_idx = 0  # 0: A/1, 1: B/2, 2: C/3, 3: D/4
        opt_mode = None  # 'alpha' or 'numeric'
        last_question_number = 0

        ak_header_regex = re.compile(r'^(?:ANSWER\s*KEY|ANSWERS?|SOLUTIONS?|KEY|उत्तर\s*कुंजी)[\:\-]?\s*$', re.I)
        date_header_regex = re.compile(r'^(?:JAN|FEB|MAR|APR|MAY|JUNE?|JULY?|AUG|SEPT?|OCT|NOV|DEC)\s+20\d\d', re.I)
        page_header_regex = re.compile(r'^(?:Page\s+\d+(?:\s+of\s+\d+)?|Section\s*[\:\-]?\s*.*)$', re.I)
        marks_line_regex = re.compile(
            r'^(?:Marks?|Maximum\s*Marks?|Max\s*Marks?)\s*[\:\-]\s*([0-9]+(?:\.[0-9]+)?)(?:\s*[,;]?\s*(?:Negative(?:\s*Marks?)?|Neg)\s*[\:\-]\s*([0-9]+(?:\.[0-9]+)?))?',
            re.I
        )

        def finish_current():
            nonlocal current, current_field, in_explanation, expected_opt_idx, opt_mode
            if current and (current.get('question_en') or current.get('question_hi')):
                q_text = current.get('question_en', '')
                cleaned_q, detected_m, detected_neg = extract_marks_and_clean(q_text)
                current['question_en'] = resolve_inline_image_tokens(cleaned_q, img_map, warnings)
                if current.get('question_hi'):
                    current['question_hi'] = resolve_inline_image_tokens(current['question_hi'], img_map, warnings)

                for k in ['a', 'b', 'c', 'd']:
                    en_key = f'option_{k}_en'
                    if current.get(en_key):
                        current[en_key] = resolve_inline_image_tokens(current[en_key], img_map, warnings)
                    hi_key = f'option_{k}_hi'
                    if current.get(hi_key):
                        current[hi_key] = resolve_inline_image_tokens(current[hi_key], img_map, warnings)

                if current.get('explanation_en'):
                    current['explanation_en'] = resolve_inline_image_tokens(current['explanation_en'], img_map, warnings)
                if current.get('explanation_hi'):
                    current['explanation_hi'] = resolve_inline_image_tokens(current['explanation_hi'], img_map, warnings)

                if detected_m and not current.get('marks'):
                    current['marks'] = str(Decimal(detected_m))
                if detected_neg and not current.get('negative_marks'):
                    current['negative_marks'] = str(abs(Decimal(detected_neg)))

                # Warning if question ends with fewer than 4 options
                opt_count = sum(1 for k in ['a', 'b', 'c', 'd'] if current.get(f'option_{k}_en'))
                if 0 < opt_count < 4:
                    warnings.append(f"Question {current.get('question_number')}: Ends with fewer than 4 options ({opt_count} found).")

                records.append(current)

            current = None
            current_field = 'question_en'
            in_explanation = False
            expected_opt_idx = 0
            opt_mode = None

        def append_to_field(field_name: str, val: str):
            if not current or not val:
                return
            existing = current.get(field_name) or ''
            current[field_name] = f"{existing}\n{val}".strip() if existing else val

        def match_sequential_option(line_str: str) -> Optional[Tuple[str, str]]:
            """Matches option only if it continues expected sequence for current question."""
            nonlocal expected_opt_idx, opt_mode
            if not current or expected_opt_idx >= 4:
                return None

            letters = ['a', 'b', 'c', 'd']
            digits = ['1', '2', '3', '4']
            exp_letter = letters[expected_opt_idx]
            exp_digit = digits[expected_opt_idx]

            # 1. Letter styles: (A), [A], A., A), a), Option A:
            pat_alpha = r'^(?:Option\s*)?(?:\(([A-Da-d])\)|\[([A-Da-d])\]|([A-Da-d])[\)\:\-\.]|([A-Da-d])\s+)\s*(.*)$'
            m_a = re.match(pat_alpha, line_str, re.I)
            if m_a:
                tok = (m_a.group(1) or m_a.group(2) or m_a.group(3) or m_a.group(4)).lower()
                val = m_a.group(5).strip()
                if tok == exp_letter:
                    opt_mode = 'alpha'
                    expected_opt_idx += 1
                    return tok, val

            # 2. Bracketed/Paren numeric styles: (1), [1], 1), Option 1:
            pat_num = r'^(?:Option\s*)?(?:\(([1-4])\)|\[([1-4])\]|([1-4])\))\s*(.*)$'
            m_n = re.match(pat_num, line_str, re.I)
            if m_n:
                tok = m_n.group(1) or m_n.group(2) or m_n.group(3)
                val = m_n.group(4).strip()
                if tok == exp_digit or (expected_opt_idx == 0 and tok == '1'):
                    opt_mode = 'numeric'
                    current['had_numeric_options'] = True
                    let = letters[int(tok) - 1]
                    expected_opt_idx += 1
                    return let, val

            # 3. Dot-numbered sequential options (1., 2., 3., 4.)
            # A "1." following a question stem starts a 1-2-3-4 run and is option 1, never question 1!
            pat_dot = r'^([1-4])[\.\:\-]\s*(.*)$'
            m_d = re.match(pat_dot, line_str)
            if m_d:
                tok = m_d.group(1)
                val = m_d.group(2).strip()
                if tok == exp_digit:
                    opt_mode = 'numeric'
                    current['had_numeric_options'] = True
                    let = letters[int(tok) - 1]
                    expected_opt_idx += 1
                    return let, val

            return None

        for line in lines:
            if date_header_regex.match(line) or page_header_regex.match(line):
                continue

            if ak_header_regex.match(line):
                finish_current()
                in_answer_key = True
                continue

            if in_answer_key:
                answer_key_lines.append(line)
                continue

            m_marks = marks_line_regex.match(line)
            if m_marks and current:
                if m_marks.group(1):
                    current['marks'] = str(Decimal(m_marks.group(1)))
                if m_marks.group(2):
                    current['negative_marks'] = str(abs(Decimal(m_marks.group(2))))
                continue

            # Answer line
            ans_m = re.match(r'^(?:(?:Expected\s*Answer|Correct\s*(?:Option|Answer)|Answer|Ans|उत्तर|Key))\s*[\:\-\=]?\s*(.*)$', line, re.I)
            if ans_m and current:
                raw_ans_val = ans_m.group(1).strip()
                cleaned_ans, m_ans, neg_ans = extract_marks_and_clean(raw_ans_val)
                current['answer_raw'] = cleaned_ans
                if m_ans and not current.get('marks'):
                    current['marks'] = m_ans
                if neg_ans and not current.get('negative_marks'):
                    current['negative_marks'] = str(abs(Decimal(neg_ans)))
                m_opt = re.search(r'\b([A-Da-d1-4])\b|[\(\[]([A-Da-d1-4])[\)\]]', cleaned_ans)
                if m_opt:
                    tok = (m_opt.group(1) or m_opt.group(2)).upper()
                    current['correct_option'] = 'ABCD'[int(tok) - 1] if tok in '1234' else tok
                current_field = 'answer_raw'
                continue

            # Explanation / Solution line
            exp_m = re.match(r'^(?:(?:Explanation|Solution|Vyakhya|Rationale|हल|व्याख्या))(?:\s*(English|en|Hindi|hi))?\s*[\:\-]?\s*(.*)$', line, re.I)
            if exp_m and current:
                is_hi = bool((exp_m.group(1) and 'hi' in exp_m.group(1).lower()) or re.search(r'[\u0900-\u097F]', exp_m.group(0)) or any(k in line for k in ['व्याख्या', 'हल']))
                lang = 'hi' if is_hi else 'en'
                current_field = f'explanation_{lang}'
                in_explanation = True
                append_to_field(current_field, exp_m.group(2).strip())
                continue

            if in_explanation:
                if re.match(r'^(?:(?:Question|Ques|Problem|Prob|प्रश्न|प्र\.)[\.\:\-\s]*\d+|Q[\.\:\-\s]*\d+|\d+[\.\:\-]\s+)', line, re.I):
                    in_explanation = False
                else:
                    append_to_field(current_field, line)
                    continue

            # Check Single-line options FIRST: (A) ... (B) ... (C) ... (D) ...
            if current and expected_opt_idx == 0:
                inline_opts = extract_inline_options(line)
                if inline_opts:
                    for k, v in inline_opts.items():
                        current[f'option_{k.lower()}_en'] = v
                    expected_opt_idx = len(inline_opts)
                    continue

            # Check Option (sequence-aware)
            opt_res = match_sequential_option(line)
            if opt_res:
                opt_letter, opt_text = opt_res
                current[f'option_{opt_letter}_en'] = opt_text
                current_field = f'option_{opt_letter}_en'
                continue

            # Bilingual Hindi question line (attach to current if stem exists)
            q_hi_m = re.match(r'^(?:Question\s*(?:Hindi|hi)|प्रश्न)\s*[\:\-]?\s*(.*)$', line, re.I)
            if q_hi_m and current and not current.get('question_hi'):
                current_field = 'question_hi'
                append_to_field(current_field, q_hi_m.group(1).strip())
                continue

            # Check Question Line
            q_exp_m = re.match(r'^(?:(?:Question|Ques|Problem|Prob|प्रश्न|प्र\.)[\.\:\-\s]+(\d{1,4})|Q[\.\:\-\s]*(\d{1,4})|Q\b)\s*[\.\:\-\)]?\s*(.*)$', line, re.I)
            q_num_m = re.match(r'^(\d{1,4})[\.\:\-]\s*(.*)$', line)

            is_new_q = False
            new_q_num = None
            new_q_text = ""

            if q_exp_m:
                is_new_q = True
                new_q_num = int(q_exp_m.group(1) or q_exp_m.group(2)) if (q_exp_m.group(1) or q_exp_m.group(2)) else (last_question_number + 1)
                new_q_text = (q_exp_m.group(3) or "").strip()
            elif q_num_m:
                n = int(q_num_m.group(1))
                if not current:
                    is_new_q = True
                    new_q_num = n
                    new_q_text = q_num_m.group(2).strip()
                elif n == 1 and expected_opt_idx == 0:
                    # Part B: "1." following stem and starting run is option 1, never question 1
                    opt_mode = 'numeric'
                    current['had_numeric_options'] = True
                    current['option_a_en'] = q_num_m.group(2).strip()
                    expected_opt_idx = 1
                    current_field = 'option_a_en'
                    continue
                elif current.get('answer_raw') or (expected_opt_idx >= 2):
                    if n == last_question_number + 1 or n > last_question_number:
                        is_new_q = True
                        new_q_num = n
                        new_q_text = q_num_m.group(2).strip()

            if is_new_q:
                finish_current()
                cleaned_init, m_init, neg_init = extract_marks_and_clean(new_q_text)
                last_question_number = new_q_num or (len(records) + 1)
                current = {
                    'row_number': len(records) + 1,
                    'question_number': last_question_number,
                    'subject': 'General',
                    'question_en': cleaned_init,
                    'question_hi': None,
                    'option_a_en': '', 'option_a_hi': None,
                    'option_b_en': '', 'option_b_hi': None,
                    'option_c_en': '', 'option_c_hi': None,
                    'option_d_en': '', 'option_d_hi': None,
                    'answer_raw': None,
                    'correct_option': 'A',
                    'explanation_en': '', 'explanation_hi': None,
                    'marks': str(Decimal(m_init)) if m_init else None,
                    'negative_marks': str(abs(Decimal(neg_init))) if neg_init else None,
                    'format_type': format_type,
                    'had_numeric_options': False
                }
                current_field = 'question_en'
                in_explanation = False
                expected_opt_idx = 0
                opt_mode = None
                continue

            if not current:
                continue

            # Subject line
            subj_m = re.match(r'^Subject\s*[\:\-]\s*(.+)$', line, re.I)
            if subj_m:
                current['subject'] = subj_m.group(1).strip()
                continue

            # Bilingual Hindi question line
            q_hi_m = re.match(r'^(?:Question\s*(?:Hindi|hi)|प्रश्न)\s*[\:\-]\s*(.*)$', line, re.I)
            if q_hi_m:
                current_field = 'question_hi'
                append_to_field(current_field, q_hi_m.group(1).strip())
                continue

            # Standalone Marks line
            marks_m = re.match(r'^(?:Marks|Positive\s*Marks?|Mark|अंक)\s*[\:\-]\s*([0-9\.\-]+)', line, re.I)
            if marks_m:
                current['marks'] = marks_m.group(1).strip()
                continue

            # Standalone Negative Marks line
            neg_m = re.match(r'^(?:Negative(?:\s*Marks?)?|Neg|नकारात्मक\s*अंक)\s*[\:\-]\s*([0-9\.\-]+)', line, re.I)
            if neg_m:
                try:
                    current['negative_marks'] = str(abs(Decimal(neg_m.group(1).strip())))
                except Exception:
                    current['negative_marks'] = neg_m.group(1).strip()
                continue

            append_to_field(current_field, line)

        finish_current()

        # Resolve Answer Key table at end of paper if present
        if answer_key_lines:
            ak_full = ' '.join(answer_key_lines)
            for m in re.finditer(r'(?:(?:Q(?:uestion)?\s*)?(\d{1,4})[\.\:\-\)]\s*\(?([A-Da-d1-4])\)?)', ak_full):
                qn = int(m.group(1))
                ans = m.group(2).upper()
                if ans in ('1', '2', '3', '4'):
                    ans = 'ABCD'[int(ans) - 1]
                for r in records:
                    if r.get('question_number') == qn and not r.get('answer_raw'):
                        r['answer_raw'] = ans
                        r['correct_option'] = ans

        if not records:
            return [], [{
                'row': 0,
                'question': 'Document Formatting',
                'errors': [
                    'Could not detect question blocks in document. '
                    'Questions should start with "Q1.", "1.", "Question 1:", etc., followed by options (A-D or 1-4) and "Answer: <A-D>".'
                ]
            }], []

        return records, [], warnings


class QuestionValidator:
    """
    Validates mapped question items before database insertion.
    Checks:
    - English and Hindi text preservation (including raw LaTeX delimiters)
    - Contiguous options
    - Unambiguous single correct answer
    - Marks validity
    """

    @classmethod
    def validate_candidate(
        cls,
        candidate: Dict[str, Any],
        existing_question_texts: set,
        row_num: int,
        mode: str = 'append'
    ) -> Tuple[Optional[Dict[str, Any]], List[str], List[str], bool]:
        errors = []
        warnings = []
        is_duplicate = False

        q_en = clean_text(candidate.get('question_en', ''))
        q_hi = clean_text(candidate.get('question_hi', '')) or None

        if not q_en and not q_hi:
            errors.append('Question text is missing in both English and Hindi.')

        if not q_en and q_hi:
            q_en = q_hi

        opt_a_en = clean_text(candidate.get('option_a_en', ''))
        opt_b_en = clean_text(candidate.get('option_b_en', ''))
        opt_c_en = clean_text(candidate.get('option_c_en', ''))
        opt_d_en = clean_text(candidate.get('option_d_en', ''))

        opt_a_hi = clean_text(candidate.get('option_a_hi', '')) or None
        opt_b_hi = clean_text(candidate.get('option_b_hi', '')) or None
        opt_c_hi = clean_text(candidate.get('option_c_hi', '')) or None
        opt_d_hi = clean_text(candidate.get('option_d_hi', '')) or None

        opts_dict = {'A': opt_a_en, 'B': opt_b_en, 'C': opt_c_en, 'D': opt_d_en}
        present_keys = [k for k in ['A', 'B', 'C', 'D'] if opts_dict[k]]

        q_label = f"Question {candidate.get('question_number') or row_num}"

        if len(present_keys) == 0:
            opt_a_en = "Option A"
            opt_b_en = "Option B"
            opt_c_en = "Option C"
            opt_d_en = "Option D"
            opts_dict = {'A': opt_a_en, 'B': opt_b_en, 'C': opt_c_en, 'D': opt_d_en}
            present_keys = ['A', 'B', 'C', 'D']
            warnings.append(f"{q_label}: No multiple-choice options detected in document. Generated default choices (A-D) for review.")
        elif len(present_keys) < 2:
            errors.append(f'{q_label}: At least 2 options are required (found {len(present_keys)}).')
        else:
            if len(present_keys) < 4:
                warnings.append(f"{q_label}: Question has only {len(present_keys)} options (A-{chr(ord('A') + len(present_keys) - 1)}).")
            expected_contiguous = ['A', 'B', 'C', 'D'][:len(present_keys)]
            if present_keys != expected_contiguous:
                missing_between = set(expected_contiguous) - set(present_keys)
                errors.append(
                    f"{q_label}: Non-contiguous options detected: present options are {present_keys}. "
                    f"Intermediate option(s) {sorted(list(missing_between))} missing."
                )

        format_type = candidate.get('format_type', 'table')
        had_numeric_opts = candidate.get('had_numeric_options', False)

        correct_opt, err_reason = normalize_correct_option(
            candidate.get('answer_raw'),
            format_type=format_type,
            source_had_numeric_options=had_numeric_opts
        )
        needs_review = False
        if err_reason:
            errors.append(f"{q_label}: {err_reason}")
        elif not correct_opt:
            needs_review = True
            warnings.append(f"{q_label}: Correct answer is not specified; defaulted to 'A' and flagged for review.")
            correct_opt = 'A'
        elif correct_opt:
            if correct_opt not in present_keys:
                errors.append(f"{q_label}: Correct answer '{correct_opt}' references an option that is missing or empty.")

        # Duplicate check
        canonical_q = normalize_for_comparison(q_en)
        if canonical_q and canonical_q in existing_question_texts:
            is_duplicate = True
            warnings.append(f"{q_label}: Duplicate question skipped ('{q_en[:50]}...').")

        # Marks validation
        marks_dec = None
        if candidate.get('marks') is not None and str(candidate.get('marks')).strip():
            try:
                marks_dec = Decimal(str(candidate['marks']))
                if marks_dec < 0:
                    errors.append(f'{q_label}: Marks cannot be negative.')
            except Exception:
                errors.append(f"{q_label}: Invalid marks value '{candidate['marks']}'.")

        neg_marks_dec = None
        if candidate.get('negative_marks') is not None and str(candidate.get('negative_marks')).strip():
            try:
                neg_marks_dec = Decimal(str(candidate['negative_marks']))
                if neg_marks_dec < 0:
                    errors.append(f'{q_label}: Negative marks must be non-negative magnitude.')
            except Exception:
                errors.append(f"{q_label}: Invalid negative marks value '{candidate['negative_marks']}'.")

        if errors:
            return None, errors, warnings, is_duplicate

        legacy_ans = ord(correct_opt) - ord('A') if correct_opt else 0
        legacy_opts = [opts_dict[k] for k in present_keys]

        return {
            'question_number': candidate.get('question_number') or row_num,
            'subject': clean_text(candidate.get('subject')) or 'General',
            'question_en': q_en,
            'question_hi': q_hi,
            'option_a_en': opt_a_en,
            'option_a_hi': opt_a_hi,
            'option_b_en': opt_b_en,
            'option_b_hi': opt_b_hi,
            'option_c_en': opt_c_en,
            'option_c_hi': opt_c_hi,
            'option_d_en': opt_d_en,
            'option_d_hi': opt_d_hi,
            'correct_option': correct_opt or '',
            'needs_review': needs_review,
            'explanation_en': clean_text(candidate.get('explanation_en', '')),
            'explanation_hi': clean_text(candidate.get('explanation_hi', '')) or None,
            'marks': marks_dec,
            'negative_marks': neg_marks_dec,
            'question': q_en,
            'options_json': legacy_opts,
            'correct_answer': legacy_ans,
            'explanation': clean_text(candidate.get('explanation_en', '')),
        }, [], warnings, is_duplicate
