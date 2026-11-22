"""
PDF Parser Service
Extracts text streams and page bounds from PDFs with OCR fallback.
"""
import io
from typing import Tuple, List, Dict, Any


def extract_pdf_pages_and_text(pdf_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Extracts text per page, returning (list_of_page_texts, page_metadata).
    If pages have no selectable text, triggers OCR extraction.
    """
    page_texts = []
    metadata = []

    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        total = len(reader.pages)

        for idx, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or '').strip()
            page_texts.append(text)
            metadata.append({
                'page': idx,
                'total_pages': total,
                'has_selectable_text': len(text) > 30,
                'char_count': len(text)
            })

        # If selectable text is empty or sparse, OCR scanned pages
        total_chars = sum(len(t) for t in page_texts)
        if total_chars < 50:
            from pdf2image import convert_from_bytes
            import pytesseract

            images = convert_from_bytes(pdf_bytes, dpi=150, fmt='jpeg', first_page=1, last_page=min(total, 50))
            page_texts = []
            for idx, img in enumerate(images, start=1):
                txt = pytesseract.image_to_string(img.convert('L')) or ''
                page_texts.append(txt.strip())
                if idx - 1 < len(metadata):
                    metadata[idx - 1]['has_selectable_text'] = False
                    metadata[idx - 1]['char_count'] = len(txt)

    except Exception as e:
        page_texts = [f"PDF extraction error: {str(e)}"]

    return page_texts, metadata

