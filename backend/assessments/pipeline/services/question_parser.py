"""
Question Parser Service
Maps raw parsed text and structured rows into validated question objects with LaTeX normalization.
"""
from typing import List, Dict, Any, Tuple
from .latex_normalizer import normalize_latex_string, validate_latex


def map_and_normalize_questions(raw_candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Takes candidates extracted from documents/OCR and applies LaTeX normalization,
    chemical formula detection, and confidence scoring to each question.
    """
    normalized_questions = []

    for idx, c in enumerate(raw_candidates, start=1):
        q_en = normalize_latex_string(c.get('question_en', '') or c.get('question', ''))
        q_hi = normalize_latex_string(c.get('question_hi', '') or '') or None

        opt_a = normalize_latex_string(c.get('option_a_en', '') or 'Option A')
        opt_b = normalize_latex_string(c.get('option_b_en', '') or 'Option B')
        opt_c = normalize_latex_string(c.get('option_c_en', '') or 'Option C')
        opt_d = normalize_latex_string(c.get('option_d_en', '') or 'Option D')

        exp_en = normalize_latex_string(c.get('explanation_en', '') or c.get('explanation', ''))
        exp_hi = normalize_latex_string(c.get('explanation_hi', '') or '') or None

        # Check math presence
        has_math = any('$' in s for s in [q_en, opt_a, opt_b, opt_c, opt_d, exp_en])

        # Validate LaTeX syntax
        is_valid_q, conf_q, issues = validate_latex(q_en)
        is_valid_exp, conf_exp, _ = validate_latex(exp_en)
        latex_confidence = round(min(conf_q, conf_exp), 2)

        needs_review = bool(c.get('needs_review') or (has_math and not is_valid_q) or latex_confidence < 0.7)

        correct_opt = (c.get('correct_option') or 'A').upper()
        if correct_opt not in ['A', 'B', 'C', 'D']:
            correct_opt = 'A'

        normalized_questions.append({
            'question_number': c.get('question_number') or idx,
            'subject': c.get('subject') or 'General',
            'question_en': q_en,
            'question_hi': q_hi,
            'option_a_en': opt_a,
            'option_a_hi': c.get('option_a_hi'),
            'option_b_en': opt_b,
            'option_b_hi': c.get('option_b_hi'),
            'option_c_en': opt_c,
            'option_c_hi': c.get('option_c_hi'),
            'option_d_en': opt_d,
            'option_d_hi': c.get('option_d_hi'),
            'correct_option': correct_opt,
            'explanation_en': exp_en,
            'explanation_hi': exp_hi,
            'marks': c.get('marks') or 4.0,
            'negative_marks': c.get('negative_marks') or 1.0,
            'has_math': has_math,
            'latex_confidence': latex_confidence,
            'needs_review': needs_review,
            'image_url': c.get('image_url') or None,
            'validation_issues': issues
        })

    return normalized_questions

