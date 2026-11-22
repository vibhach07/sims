"""
Storage Service
Handles saving extracted figures, question images, and uploaded question files
locally in MEDIA_ROOT under /media/assessments/imports/
"""
import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile


def get_import_media_dir() -> str:
    """Returns absolute path to assessment imports media directory."""
    media_dir = os.path.join(settings.MEDIA_ROOT, 'assessments', 'imports')
    os.makedirs(media_dir, exist_ok=True)
    return media_dir


def save_crop_image(image_bytes: bytes, ext: str = 'png') -> str:
    """
    Saves a cropped question figure/image and returns its accessible media URL.
    """
    filename = f"crop_{uuid.uuid4().hex[:12]}.{ext.lstrip('.')}"
    relative_path = os.path.join('assessments', 'imports', filename)
    saved_path = default_storage.save(relative_path, ContentFile(image_bytes))
    return default_storage.url(saved_path)


def save_uploaded_file(file_obj) -> str:
    """
    Saves an uploaded raw test file to disk and returns its absolute path.
    """
    ext = os.path.splitext(file_obj.name)[1]
    filename = f"upload_{uuid.uuid4().hex[:10]}{ext}"
    media_dir = get_import_media_dir()
    filepath = os.path.join(media_dir, filename)

    with open(filepath, 'wb+') as dest:
        for chunk in file_obj.chunks():
            dest.write(chunk)

    return filepath

