# LaTeX & Bulk Question Import Guide

## Overview
SIMS Raipur supports rich LaTeX rendering across all CBT and course components, and robust bulk question import via JSON, CSV, and DOCX formats.

---

## 1. LaTeX Math Support

### Rendering Engine
- Library: `react-katex` + KaTeX CSS.
- Parser: Currency-safe mathematical tokenizer (`src/lib/mathParse.ts`).
- Component: `<MathText text={...} />` (`src/components/MathText.tsx`).

### Delimiters Supported
- Inline Math: `$ ... $` or `\( ... \)`
- Display / Block Math: `$$ ... $$` or `\[ ... \]`

### Currency Safety
Raw currency markers like `$50` or `$100 per test` are not parsed as LaTeX unless followed by math notation and closed delimiter.
Escape with `\$` if necessary, or use unicode `₹` / standard plain text.

### Common NIMCET Math Examples
- Quadratic Equation: `$ax^2 + bx + c = 0$`
- Roots Formula: `$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$`
- Definite Integral: `$$\int_{0}^{\pi} \sin(x) \, dx = 2$$`
- Matrices:
  ```latex
  $$\begin{pmatrix} a & b \\ c & d \end{pmatrix}$$
  ```
- Vectors: `$\vec{u} \cdot \vec{v} = |\vec{u}| |\vec{v}| \cos(\theta)$`

---

## 2. Bulk Question Import

Questions can be imported into any Test in Admin/Educator portals using the **Import Questions** modal.

### Supported File Types
1. `.json` (JSON array of question objects)
2. `.csv` (Comma-separated values with header row)
3. `.docx` (Microsoft Word document with structured pattern)

### Import Modes
- **Append**: Adds imported questions to existing questions in the test.
- **Replace**: Deletes existing questions in the test and replaces them with imported ones.

### JSON Schema
```json
[
  {
    "question_text": "Solve $\\lim_{x \\to 0} \\frac{\\sin x}{x}$",
    "question_type": "MCQ",
    "options": [
      {"option_key": "A", "option_text": "0"},
      {"option_key": "B", "option_text": "1"},
      {"option_key": "C", "option_text": "Undefined"},
      {"option_key": "D", "option_text": "Infinity"}
    ],
    "correct_option": "B",
    "marks": 4,
    "negative_marks": 1,
    "explanation": "Standard calculus limit: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$."
  }
]
```

### CSV Format
Headers required:
`question_text,question_type,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks,explanation`

Example row:
```csv
"Evaluate $\int e^x dx$","MCQ","e^x + C","e^x","x e^x","1","A",4,1,"Derivative of $e^x$ is $e^x$."
```

### DOCX Structured Format
Questions in Word files should follow this sequence:
```text
Q1. Solve $x^2 - 4 = 0$.
A) 2
B) -2
C) ±2
D) 0
Answer: C
Marks: 4
Negative: 1
Explanation: $x = \pm \sqrt{4} = \pm 2$.
```
