"""
Latex & Chemistry Normalizer Service
Clean, normalize and validate LaTeX equations, chemical formulas (mhchem \\ce{...}),
and standard SI units for GATE Chemical Engineering & science papers.
"""
import re
from typing import Tuple, List

# Common chemical formula patterns in GATE Chemical Engineering
CHEMICAL_REACTION_PATTERNS = [
    # Reaction arrows: ->, -->, <=>, <->
    re.compile(r'\b([A-Z][a-z]?\d*(?:\s*\+\s*[A-Z][a-z]?\d*)*\s*(?:->|-->|<=>|<->)\s*[A-Z][a-z]?\d*(?:\s*\+\s*[A-Z][a-z]?\d*)*)\b'),
    # Common compounds: H2SO4, NaOH, CaCO3, CO2, H2O, NH3, C2H5OH, CH4, HCl, etc.
    re.compile(r'\b([A-Z][a-z]?(?:\d+|(?:\([A-Za-z0-9]+\)\d*))+)\b')
]

# Physical Units common in Chemical Eng (kg/m^3, J/mol K, etc.)
UNIT_PATTERNS = [
    (re.compile(r'\bkg[/\s]*m\^?3\b', re.IGNORECASE), r'\\mathrm{kg\\,m^{-3}}'),
    (re.compile(r'\bkg[/\s]*m\^?-3\b', re.IGNORECASE), r'\\mathrm{kg\\,m^{-3}}'),
    (re.compile(r'\bJ[/\s]*mol[/\s]*K\b', re.IGNORECASE), r'\\mathrm{J\\,mol^{-1}\\,K^{-1}}'),
    (re.compile(r'\bcal[/\s]*g\b', re.IGNORECASE), r'\\mathrm{cal\\,g^{-1}}'),
    (re.compile(r'\bm[/\s]*s\^?2\b', re.IGNORECASE), r'\\mathrm{m\\,s^{-2}}'),
    (re.compile(r'\bm[/\s]*s\b', re.IGNORECASE), r'\\mathrm{m\\,s^{-1}}'),
    (re.compile(r'\bW[/\s]*m\^?2[/\s]*K\b', re.IGNORECASE), r'\\mathrm{W\\,m^{-2}\\,K^{-1}}'),
    (re.compile(r'\bkPa\b'), r'\\mathrm{kPa}'),
    (re.compile(r'\bMPa\b'), r'\\mathrm{MPa}'),
    (re.compile(r'\bmol[/\s]*L\b', re.IGNORECASE), r'\\mathrm{mol\\,L^{-1}}'),
]

UNSAFE_COMMANDS = [
    r'\\href', r'\\url', r'\\includegraphics', r'\\input', r'\\include',
    r'\\write', r'\\def', r'\\let', r'\\catcode', r'\\immediate'
]


def sanitize_latex(text: str) -> str:
    """Removes potentially dangerous LaTeX commands for student rendering safety."""
    if not text:
        return ""
    sanitized = text
    for cmd in UNSAFE_COMMANDS:
        sanitized = re.sub(cmd + r'\s*\{[^}]*\}', '', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(cmd + r'\b', '', sanitized, flags=re.IGNORECASE)
    return sanitized


def normalize_chemical_formulas(text: str) -> str:
    """
    Detects chemical formulas and reactions and wraps them into mhchem \\ce{...} syntax.
    Example: Fe + O2 -> Fe2O3 => $\\ce{Fe + O2 -> Fe2O3}$
             H2SO4 => $\\ce{H2SO4}$
    """
    if not text:
        return ""

    # Don't re-wrap if already inside \ce{...}
    def replace_reaction(match):
        expr = match.group(0).strip()
        # Avoid simple English words like "A + B -> C" if ambiguous, but in chem eng equations it's valid
        return f"$\\ce{{{expr}}}$"

    # Only process parts outside existing math markers ($...$ or $$...$$)
    segments = re.split(r'(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)', text)
    result_segments = []

    for seg in segments:
        if seg.startswith('$'):
            # Already math: if contains chemical formulas without \ce, wrap inside
            result_segments.append(seg)
        else:
            # Process outside math
            s = seg
            # Match obvious chemical reactions first
            s = re.sub(
                r'\b([0-9]*[A-Z][a-z]?\d*(?:\s*\+\s*[0-9]*[A-Z][a-z]?\d*)*\s*(?:->|-->|<=>|<->)\s*[0-9]*[A-Z][a-z]?\d*(?:\s*\+\s*[0-9]*[A-Z][a-z]?\d*)*)\b',
                lambda m: f"$\\ce{{{m.group(1).strip()}}}$",
                s
            )
            # Match common standalone chemical formulas: H2O, H2SO4, CO2, etc.
            s = re.sub(
                r'\b(H2O|H2SO4|NaOH|CaCO3|CO2|NH3|CH4|HCl|HNO3|NaCl|Fe2O3|C2H5OH|C6H12O6|KMnO4)\b',
                r"$\\ce{\1}$",
                s
            )
            result_segments.append(s)

    return "".join(result_segments)


def normalize_units(text: str) -> str:
    """Normalizes engineering units to LaTeX \\mathrm{...} inside or outside math."""
    if not text:
        return ""
    result = text
    for pattern, repl in UNIT_PATTERNS:
        result = pattern.sub(f"${repl}$", result)
    # Deduplicate adjacent $$: $$a$$ $$b$$ -> $a$ $b$
    return result


def validate_latex(text: str) -> Tuple[bool, float, List[str]]:
    """
    Validates bracket balance, delimiter balance and confidence score.
    Returns: (is_valid, confidence, issues)
    """
    if not text:
        return True, 1.0, []

    issues = []
    # Check delimiter balance ($ count)
    # Don't count escaped dollars
    unescaped_dollars = re.findall(r'(?<!\\)\$', text)
    if len(unescaped_dollars) % 2 != 0:
        issues.append("Unbalanced math delimiter '$'")

    # Check curly braces
    open_curlies = text.count('{')
    close_curlies = text.count('}')
    if open_curlies != close_curlies:
        issues.append(f"Unbalanced braces: {open_curlies} '{{' vs {close_curlies} '}}'")

    # Check parentheses balance in math blocks
    math_blocks = re.findall(r'\$([^$]+)\$', text)
    for mb in math_blocks:
        if mb.count('(') != mb.count(')'):
            issues.append("Unbalanced parentheses inside math expression")
            break

    confidence = 1.0
    if issues:
        confidence = max(0.4, 1.0 - (len(issues) * 0.25))

    return len(issues) == 0, confidence, issues


def normalize_latex_string(text: str) -> str:
    """Complete normalization pipeline for a question, option, or explanation string."""
    if not text:
        return ""
    sanitized = sanitize_latex(text)
    chem_normalized = normalize_chemical_formulas(sanitized)
    unit_normalized = normalize_units(chem_normalized)
    return unit_normalized.strip()

