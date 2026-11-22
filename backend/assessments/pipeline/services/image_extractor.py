"""
Image Extractor Service
Extracts embedded diagrams and crops figure regions from PDFs, Word documents, and image files.
"""
import io
import os
from typing import List, Tuple, Optional
from PIL import Image, ImageDraw
from .storage import save_crop_image


def detect_and_crop_diagrams_from_image(img: Image.Image) -> List[str]:
    """
    Detects non-text drawing / diagram / circuit regions in an image
    and returns public URLs of cropped diagram snippets.
    """
    cropped_urls = []
    try:
        import pytesseract

        w, h = img.size
        scale = 1.0
        proc_img = img
        if w > 1800 or h > 1800:
            scale = 1800.0 / max(w, h)
            proc_img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.BILINEAR)

        # Get text bounding boxes via pytesseract
        data = pytesseract.image_to_data(proc_img.convert('L'), output_type=pytesseract.Output.DICT)

        # Create binary mask for dark ink pixels
        img_gray = proc_img.convert('L')
        mask = img_gray.point(lambda p: 255 if p < 215 else 0)
        draw = ImageDraw.Draw(mask)

        # Erase all text words
        for i in range(len(data['text'])):
            word = data['text'][i].strip()
            if word:
                x = data['left'][i]
                y = data['top'][i]
                bw = data['width'][i]
                bh = data['height'][i]
                pad_x = 6
                pad_y = 6
                draw.rectangle([x - pad_x, y - pad_y, x + bw + pad_x, y + bh + pad_y], fill=0)

        # The remaining mask represents diagrams, formulas, and charts
        bbox = mask.getbbox()
        if bbox:
            bx1, by1, bx2, by2 = bbox
            diag_w = bx2 - bx1
            diag_h = by2 - by1

            # Only keep if substantial (at least 40x40)
            if diag_w >= 40 and diag_h >= 40:
                orig_x1 = max(0, int(bx1 / scale) - 10)
                orig_y1 = max(0, int(by1 / scale) - 10)
                orig_x2 = min(w, int(bx2 / scale) + 10)
                orig_y2 = min(h, int(by2 / scale) + 10)

                cropped = img.crop((orig_x1, orig_y1, orig_x2, orig_y2))
                buf = io.BytesIO()
                cropped.save(buf, format='PNG')
                url = save_crop_image(buf.getvalue(), ext='png')
                cropped_urls.append(url)
    except Exception:
        pass
    return cropped_urls


def extract_pdf_embedded_diagrams(pdf_bytes: bytes) -> List[str]:
    """
    Extracts embedded raster images and diagrams directly from PDF objects.
    """
    results = []
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            for img_file in page.images:
                try:
                    img = Image.open(io.BytesIO(img_file.data))
                    # Ignore tiny spacer pixels / bullet icons
                    if img.width >= 40 and img.height >= 40:
                        ext = img_file.name.split('.')[-1].lower() if '.' in img_file.name else 'png'
                        url = save_crop_image(img_file.data, ext=ext)
                        results.append(url)
                except Exception:
                    pass
    except Exception:
        pass
    return results


def extract_pdf_diagrams(pdf_bytes: bytes, max_pages: int = 20) -> List[str]:
    """
    Extracts diagrams from PDF: first tries embedded images,
    then falls back to rendering pages and auto-cropping diagram regions.
    """
    diagrams = extract_pdf_embedded_diagrams(pdf_bytes)
    if diagrams:
        return diagrams

    # Fallback: render pages with pdf2image and run diagram detector
    try:
        from pdf2image import convert_from_bytes
        pages = convert_from_bytes(
            pdf_bytes,
            dpi=150,
            fmt='jpeg',
            first_page=1,
            last_page=max_pages
        )
        for page in pages:
            page_diagrams = detect_and_crop_diagrams_from_image(page)
            diagrams.extend(page_diagrams)
    except Exception:
        pass
    return diagrams


def extract_docx_images(docx_bytes: bytes) -> List[str]:
    """
    Extracts embedded media images from a Word (.docx) file.
    Returns list of media URLs.
    """
    results = []
    try:
        import zipfile
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
            for filename in z.namelist():
                if filename.startswith('word/media/'):
                    img_data = z.read(filename)
                    try:
                        img = Image.open(io.BytesIO(img_data))
                        if img.width >= 40 and img.height >= 40:
                            ext = filename.split('.')[-1].lower()
                            url = save_crop_image(img_data, ext=ext)
                            results.append(url)
                    except Exception:
                        pass
    except Exception:
        pass
    return results


def extract_image_file_diagrams(image_bytes: bytes) -> List[str]:
    """
    Processes an uploaded image file: attempts to crop the diagram region.
    If no sub-diagram is isolated, saves the entire image as the figure.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        cropped = detect_and_crop_diagrams_from_image(img)
        if cropped:
            return cropped

        # Entire image fallback
        url = save_crop_image(image_bytes, ext='png')
        return [url]
    except Exception:
        return []
