"""
Vision AI Service
Interprets equation diagrams and chemical formula regions into LaTeX / mhchem strings.
Provides fallback heuristics and image recognition.
"""
import re
from typing import Tuple
from .ocr_engine import run_ocr_on_image
from .latex_normalizer import normalize_latex_string, validate_latex


def recognize_latex_from_crop(image_bytes: bytes) -> Tuple[str, float]:
    """
    Recognizes mathematical equations and chemical formulas from a cropped region.
    Returns: (latex_string, confidence_score)
    """
    raw_ocr = run_ocr_on_image(image_bytes)
    if not raw_ocr:
        return "", 0.0

    normalized = normalize_latex_string(raw_ocr)
    is_valid, conf, _ = validate_latex(normalized)

    # If math delimiters weren't added, check for obvious math symbols: ^, _, =, +, -, /, \int, \sum
    if '$' not in normalized and any(sym in normalized for sym in ['^', '_', '=', '+', '->', '<=>', '\\']):
        normalized = f"${normalized}$"

    return normalized, conf

