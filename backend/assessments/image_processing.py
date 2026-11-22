"""
assessments/image_processing.py
Unified image ingestion, auto-cropping, verification, and formatting pipeline.
"""
from __future__ import annotations
import io
import hashlib
import logging
from typing import Optional, Tuple, Dict, Any, List

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Max raw file size: 8 MB
MAX_IMAGE_RAW_BYTES = 8 * 1024 * 1024

# Decompression bomb guard: 25 Megapixels
MAX_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

ALLOWED_PIL_FORMATS = {'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF'}
DISALLOWED_EXTENSIONS = {'.svg', '.emf', '.wmf', '.eps'}


class ImageValidationError(Exception):
    """Raised when image fails validation or decompression checks."""
    pass


def is_svg(content_bytes: bytes) -> bool:
    """Check if byte payload is SVG."""
    prefix = content_bytes[:1024].lstrip().lower()
    return prefix.startswith(b'<svg') or b'<svg' in prefix or prefix.startswith(b'<?xml') and b'<svg' in content_bytes[:4096].lower()


def apply_src_rect_crop(img: Image.Image, src_rect: Optional[Dict[str, int]]) -> Image.Image:
    """
    Applies Word/DOCX a:srcRect cropping (values in 100,000ths of percent).
    l: left, t: top, r: right, b: bottom
    """
    if not src_rect:
        return img

    w, h = img.size
    l_val = src_rect.get('l', 0) / 100000.0
    t_val = src_rect.get('t', 0) / 100000.0
    r_val = src_rect.get('r', 0) / 100000.0
    b_val = src_rect.get('b', 0) / 100000.0

    left = max(0, int(w * l_val))
    top = max(0, int(h * t_val))
    right = min(w, int(w * (1.0 - r_val)))
    bottom = min(h, int(h * (1.0 - b_val)))

    if right > left + 10 and bottom > top + 10:
        return img.crop((left, top, right, bottom))
    return img


def trim_borders(img: Image.Image, padding: int = 6) -> Image.Image:
    """
    Trim near-white or transparent borders.
    Skips trim if it would remove >90% of area or leave <24px width/height.
    """
    w, h = img.size
    if w <= 24 or h <= 24:
        return img

    bbox_alpha = None
    if img.mode in ('RGBA', 'LA'):
        alpha = img.split()[-1]
        bbox_alpha = alpha.getbbox()

    # Find bounding box of non-near-white content
    gray = img.convert('L')
    inv = ImageOps.invert(gray)
    # Values brighter than 246 become <9 in inverted image
    thresh = inv.point(lambda p: 255 if p > 9 else 0)
    bbox_color = thresh.getbbox()

    if bbox_alpha and bbox_color:
        bbox = (
            min(bbox_alpha[0], bbox_color[0]),
            min(bbox_alpha[1], bbox_color[1]),
            max(bbox_alpha[2], bbox_color[2]),
            max(bbox_alpha[3], bbox_color[3])
        )
    elif bbox_alpha:
        bbox = bbox_alpha
    elif bbox_color:
        bbox = bbox_color
    else:
        bbox = None

    if not bbox:
        return img

    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(w, right + padding)
    bottom = min(h, bottom + padding)

    new_w = right - left
    new_h = bottom - top

    if new_w < 24 or new_h < 24:
        return img

    orig_area = w * h
    new_area = new_w * new_h
    if (orig_area - new_area) / orig_area > 0.90:
        return img

    return img.crop((left, top, right, bottom))


def process_question_image(
    raw_bytes: bytes,
    source_name: str = "",
    src_rect: Optional[Dict[str, int]] = None,
    min_dimension: int = 40,
    max_dimension: int = 1600
) -> Optional[Tuple[bytes, str, int, int, str]]:
    """
    Validates, crops, downscales, and optimizes an image for question rendering.
    Returns: (processed_bytes, mime_type, width, height, content_hash)
    Or None if image is too small / invalid / decorative.
    """
    if not raw_bytes:
        return None

    if len(raw_bytes) > MAX_IMAGE_RAW_BYTES:
        raise ImageValidationError(f"Image {source_name} exceeds 8MB limit ({len(raw_bytes)} bytes).")

    if is_svg(raw_bytes):
        raise ImageValidationError(f"SVG image format is disallowed for security ({source_name}).")

    try:
        stream = io.BytesIO(raw_bytes)
        img = Image.open(stream)
        img.verify()
    except Exception as e:
        raise ImageValidationError(f"Corrupt or invalid image data for {source_name}: {e}")

    # Re-open after verify()
    stream.seek(0)
    img = Image.open(stream)

    if img.format not in ALLOWED_PIL_FORMATS:
        raise ImageValidationError(f"Unsupported image format '{img.format}' in {source_name}.")

    # Decompression bomb safeguard
    if img.width * img.height > MAX_PIXELS:
        raise ImageValidationError(f"Image dimensions {img.width}x{img.height} exceed decompression limit.")

    # First frame only for animated GIF / WebP
    if getattr(img, 'is_animated', False):
        img.seek(0)

    # Auto-orient based on EXIF
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # 1. Apply DOCX srcRect crop if present
    img = apply_src_rect_crop(img, src_rect)

    # 2. Trim near-white / transparent borders
    img = trim_borders(img, padding=6)

    # 3. Check minimum dimensions (drop tiny decorative images/bullets)
    if img.width < min_dimension or img.height < min_dimension:
        logger.debug("Dropped tiny image %s (%dx%d < %d)", source_name, img.width, img.height, min_dimension)
        return None

    # 4. Downscale so longest side <= max_dimension
    if img.width > max_dimension or img.height > max_dimension:
        img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    w, h = img.size

    # 5. Format selection: PNG for line art, diagrams, screenshots; JPEG 85 for photos
    # Determine if line art: palette, alpha, or limited color palette (< 512 colors)
    is_line_art = False
    if img.mode in ('1', 'L', 'P', 'RGBA', 'LA'):
        is_line_art = True
    else:
        colors = img.getcolors(maxcolors=512)
        if colors is not None and len(colors) < 512:
            is_line_art = True

    out_stream = io.BytesIO()
    if is_line_art:
        fmt = "PNG"
        mime = "image/png"
        img.save(out_stream, format="PNG", optimize=True)
    else:
        fmt = "JPEG"
        mime = "image/jpeg"
        # Flatten transparency onto white background for JPEG
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            rgb_bg.paste(img, mask=img.split()[-1] if 'A' in img.mode else None)
            img = rgb_bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        img.save(out_stream, format="JPEG", quality=85, optimize=True)

    processed_bytes = out_stream.getvalue()
    content_hash = hashlib.sha256(processed_bytes).hexdigest()

    return processed_bytes, mime, w, h, content_hash
