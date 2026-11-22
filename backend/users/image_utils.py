import os
import uuid
from io import BytesIO
from PIL import Image, ImageOps
from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework.exceptions import ValidationError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
MAX_DIMENSION = 4000  # px
TARGET_SIZE = (800, 800)

def validate_and_process_image(uploaded_file):
    """
    Upload hardening:
    - allow jpg/png/webp only
    - max 2 MB
    - verified with Pillow (not only extension)
    - reject animated/huge dimensions (> 4000 px)
    - auto-resize to max 800x800 and re-encode (strips EXIF/GPS)
    - random uuid filenames (never trust client filename)
    """
    if not uploaded_file:
        return None

    # Size check
    if uploaded_file.size > MAX_FILE_SIZE:
        raise ValidationError({"photo": "Image file size exceeds 2MB limit."})

    try:
        img = Image.open(uploaded_file)
        # Pillow verify
        img.verify()
    except Exception:
        raise ValidationError({"photo": "Invalid or corrupt image file."})

    # Re-open after verify()
    uploaded_file.seek(0)
    try:
        img = Image.open(uploaded_file)
    except Exception:
        raise ValidationError({"photo": "Cannot decode image file."})

    if img.format not in ALLOWED_FORMATS:
        raise ValidationError({"photo": f"Image format '{img.format}' is not allowed. Only JPG, PNG, and WEBP are supported."})

    # Reject animated images (GIF/animated WebP)
    if getattr(img, "is_animated", False):
        raise ValidationError({"photo": "Animated images are not allowed."})

    # Reject huge dimensions > 4000px
    if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
        raise ValidationError({"photo": f"Image dimensions ({img.width}x{img.height}) exceed maximum allowed {MAX_DIMENSION}px."})

    # Auto-orient based on EXIF before stripping
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # Resize to max 800x800 preserving aspect ratio
    img.thumbnail(TARGET_SIZE, Image.Resampling.LANCZOS)

    out_format = img.format if img.format in ("PNG", "WEBP") else "JPEG"
    ext = "webp" if out_format == "WEBP" else ("png" if out_format == "PNG" else "jpg")

    # If saving to JPEG, convert RGBA/palette to RGB
    if out_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")

    output = BytesIO()
    # Re-encoding strips EXIF / GPS metadata
    if out_format == "JPEG":
        img.save(output, format="JPEG", quality=85, optimize=True)
    elif out_format == "PNG":
        img.save(output, format="PNG", optimize=True)
    elif out_format == "WEBP":
        img.save(output, format="WEBP", quality=85)

    output.seek(0)
    filename = f"{uuid.uuid4().hex}.{ext}"
    content_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"

    return InMemoryUploadedFile(
        file=output,
        field_name="photo",
        name=filename,
        content_type=content_type,
        size=output.getbuffer().nbytes,
        charset=None
    )
