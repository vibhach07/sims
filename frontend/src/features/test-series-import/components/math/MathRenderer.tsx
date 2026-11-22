import React, { useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { AlertCircle } from 'lucide-react';
import { parseMathSegments } from '../../../../lib/mathParse';

interface MathRendererProps {
  text?: string | null;
  className?: string;
  block?: boolean;
}

class KaTeXErrorBoundary extends React.Component<
  { fallbackText: string; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallbackText: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('KaTeX math parsing warning:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{this.props.fallbackText}</span>
        </span>
      );
    }
    return this.props.children;
  }
}

export const MathRenderer: React.FC<MathRendererProps> = React.memo(({ text, className = '', block = false }) => {
  if (!text) return null;

  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <div className={`overflow-x-auto max-w-full math-content ${block ? 'my-2' : 'inline-block'} ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <span key={idx} className="whitespace-pre-wrap">
              {seg.content}
            </span>
          );
        }

        if (seg.type === 'inline-math') {
          return (
            <KaTeXErrorBoundary key={idx} fallbackText={`$${seg.content}$`}>
              <span className="inline-math-container mx-0.5 align-middle">
                <InlineMath
                  math={seg.content}
                  renderError={() => (
                    <span className="font-mono text-amber-700 bg-amber-50 dark:bg-amber-900/40 px-1 py-0.5 rounded text-xs">
                      ${seg.content}$
                    </span>
                  )}
                />
              </span>
            </KaTeXErrorBoundary>
          );
        }

        if (seg.type === 'block-math') {
          return (
            <KaTeXErrorBoundary key={idx} fallbackText={`$$${seg.content}$$`}>
              <div className="my-2.5 overflow-x-auto py-1 px-2 rounded-lg bg-slate-50/80 dark:bg-[#181A1D]/60 border border-slate-200/50 dark:border-[#383D44]/50">
                <BlockMath
                  math={seg.content}
                  renderError={() => (
                    <div className="font-mono text-amber-700 bg-amber-50 dark:bg-amber-900/40 p-2 rounded text-xs">
                      $${seg.content}$$
                    </div>
                  )}
                />
              </div>
            </KaTeXErrorBoundary>
          );
        }

        return null;
      })}
    </div>
  );
});

