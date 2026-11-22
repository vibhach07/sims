import React, { useRef } from 'react';
import { MathRenderer } from './MathRenderer';
import { Sparkles, Code2, Eye } from 'lucide-react';

interface MathEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  rows?: number;
  placeholder?: string;
  originalImageUrl?: string | null;
}

const QUICK_TOOLBAR = [
  { label: 'Fraction', insert: '\\frac{a}{b}' },
  { label: '√ Sqrt', insert: '\\sqrt{x}' },
  { label: 'Subscript', insert: 'x_{1}' },
  { label: 'Superscript', insert: 'x^{2}' },
  { label: '∫ Integral', insert: '\\int_{a}^{b} f(x)\\,dx' },
  { label: '∑ Sum', insert: '\\sum_{i=1}^{n} x_i' },
  { label: '⚗ Chem \\ce{}', insert: '\\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}' },
  { label: 'α Alpha', insert: '\\alpha' },
  { label: 'β Beta', insert: '\\beta' },
  { label: 'Δ Delta', insert: '\\Delta' },
  { label: 'π Pi', insert: '\\pi' },
  { label: 'Units', insert: '\\mathrm{kg\\,m^{-3}}' },
];

export const MathEditor: React.FC<MathEditorProps> = ({
  value,
  onChange,
  label,
  rows = 3,
  placeholder = 'Type text or LaTeX math ($x^2$, \\ce{H2O})...',
  originalImageUrl
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value} $${snippet}$` : `$${snippet}$`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const isAlreadyMath = value.slice(0, start).lastIndexOf('$') > value.slice(0, start).lastIndexOf('$$');
    const textToInsert = isAlreadyMath ? snippet : `$${snippet}$`;

    const newVal = value.substring(0, start) + textToInsert + value.substring(end);
    onChange(newVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  return (
    <div className="space-y-2 border border-slate-300 dark:border-[#383D44] rounded-xl p-3 bg-white dark:bg-[#181A1D]">
      {label && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#F1EEE7]">
          <span>{label}</span>
          <span className="text-[11px] font-normal text-slate-500 dark:text-[#85878B] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#D9A52E]" /> LaTeX & mhchem enabled
          </span>
        </div>
      )}

      {/* Quick Insert Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200/70 dark:border-[#2C3036] text-[11px]">
        {QUICK_TOOLBAR.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => insertSnippet(item.insert)}
            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#22252A] dark:hover:bg-[#2C3036] text-slate-700 dark:text-[#B8B6B0] transition font-medium cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Editor & Live Preview Grid */}
      <div className={`grid grid-cols-1 ${originalImageUrl ? 'lg:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
        {/* Raw LaTeX Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#85878B] flex items-center gap-1">
            <Code2 className="w-3 h-3" /> Raw LaTeX Input
          </label>
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-[#2C3036] bg-slate-50/50 dark:bg-[#101113] text-[#061426] dark:text-[#F1EEE7] font-mono text-xs focus:ring-1 focus:ring-[#D9A52E] outline-none resize-y"
          />
        </div>

        {/* Live KaTeX Render Preview */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#85878B] flex items-center gap-1">
            <Eye className="w-3 h-3" /> Live KaTeX Preview
          </label>
          <div className="min-h-[72px] p-2.5 rounded-lg border border-slate-200/60 dark:border-[#2C3036] bg-slate-50/30 dark:bg-[#101113]/60 text-xs text-[#061426] dark:text-[#F1EEE7] overflow-x-auto flex items-center">
            {value ? (
              <MathRenderer text={value} />
            ) : (
              <span className="text-slate-400 italic text-xs">Preview will appear here...</span>
            )}
          </div>
        </div>

        {/* Optional Original Image Side-by-Side Comparison */}
        {originalImageUrl && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#85878B]">
              Original Cropped Figure
            </label>
            <div className="p-1 rounded-lg border border-slate-200 dark:border-[#2C3036] bg-slate-50 dark:bg-[#101113] flex items-center justify-center max-h-36 overflow-hidden">
              <img src={originalImageUrl} alt="Original snippet" className="max-h-32 object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

