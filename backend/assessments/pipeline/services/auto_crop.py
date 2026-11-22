"""
Auto Crop Service
Handles figure detection and bounding box cropping for questions with diagrams.
"""
import io
from typing import Optional
from .storage import save_crop_image


def crop_image_box(image_bytes: bytes, box: dict) -> Optional[str]:
    """
    Crops an image region based on normalized coordinates:
    box: { 'x': float, 'y': float, 'width': float, 'height': float } (percentages 0-100 or 0-1)
    Returns public media URL of cropped snippet.
    """
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size

        # Support both 0-100 percentage or 0-1 float coordinates
        bx = box.get('x', 0)
        by = box.get('y', 0)
        bw = box.get('width', 100)
        bh = box.get('height', 100)

        if bw > 1.0 or bh > 1.0:
            left = int((bx / 100.0) * w)
            top = int((by / 100.0) * h)
            right = int(((bx + bw) / 100.0) * w)
            bottom = int(((by + bh) / 100.0) * h)
        else:
            left = int(bx * w)
            top = int(by * h)
            right = int((bx + bw) * w)
            bottom = int((by + bh) * h)

        # Bounds safety
        left = max(0, min(w - 1, left))
        top = max(0, min(h - 1, top))
        right = max(left + 1, min(w, right))
        bottom = max(top + 1, min(h, bottom))

        cropped = img.crop((left, top, right, bottom))
        buf = io.BytesIO()
        cropped.save(buf, format='PNG')
        return save_crop_image(buf.getvalue(), ext='png')
    except Exception:
        return None

