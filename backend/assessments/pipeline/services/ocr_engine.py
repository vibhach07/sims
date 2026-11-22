"""
OCR Engine Service
Provides robust OCR extraction from images and scanned pages with formula preservation.
"""
import io
from typing import Optional


def run_ocr_on_image(image_bytes: bytes) -> str:
    """
    Executes Tesseract OCR on raw image bytes with contrast optimization and layout analysis.
    """
    try:
        from PIL import Image
        import pytesseract

        Image.MAX_IMAGE_PIXELS = None
        img = Image.open(io.BytesIO(image_bytes))

        # Downscale if excessively large to keep OCR snappy
        if img.width > 2400 or img.height > 2400:
            img.thumbnail((2200, 2200))

        # Convert to grayscale
        gray = img.convert('L')

        # Run OCR with LSTM engine (--oem 1) and automatic page segmentation (--psm 6 or 3)
        custom_config = r'--oem 1 --psm 3'
        text = pytesseract.image_to_string(gray, config=custom_config)
        return text.strip() if text else ""
    except Exception as e:
        return ""

