import React, { useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { parseMathSegments } from '../lib/mathParse';

// Backend base URL for resolving relative /media/... paths
const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${BACKEND_BASE}${url}`;
  return url;
}

interface MathTextProps {
  text?: string | null;
  className?: string;
}

class SafeBoundary extends React.Component<{ fallbackText: string; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { fallbackText: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("KaTeX render error caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return <span className="font-mono text-red-600 bg-red-50 px-1 rounded">{this.props.fallbackText}</span>;
    }
    return this.props.children;
  }
}

export const MathText: React.FC<MathTextProps> = React.memo(({ text, className = '' }) => {
  if (!text) return null;

  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <span className={`inline-block whitespace-pre-wrap leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={idx}>{seg.content}</React.Fragment>;
        }

        if (seg.type === 'image') {
          const src = resolveMediaUrl(seg.content);
          return (
            <span key={idx} className="block my-3 text-center">
              <img
                src={src}
                alt={seg.alt || 'Question figure'}
                className="inline-block max-w-full max-h-72 object-contain rounded-lg border border-slate-200 dark:border-[#2C3036] shadow-sm bg-white dark:bg-[#101113]"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </span>
          );
        }

        if (seg.type === 'inline-math') {
          return (
            <SafeBoundary key={idx} fallbackText={`$${seg.content}$`}>
              <span className="inline-math-wrapper mx-0.5 align-middle">
                <InlineMath
                  math={seg.content}
                  renderError={() => (
                    <span className="font-mono text-amber-700 bg-amber-50 px-1 rounded text-sm">
                      {seg.content}
                    </span>
                  )}
                />
              </span>
            </SafeBoundary>
          );
        }

        if (seg.type === 'block-math') {
          return (
            <SafeBoundary key={idx} fallbackText={`$$${seg.content}$$`}>
              <div className="block-math-wrapper my-2.5 overflow-x-auto max-w-full text-center py-1">
                <BlockMath
                  math={seg.content}
                  renderError={() => (
                    <div className="font-mono text-amber-700 bg-amber-50 p-2 rounded text-sm my-1 overflow-x-auto">
                      {seg.content}
                    </div>
                  )}
                />
              </div>
            </SafeBoundary>
          );
        }

        return null;
      })}
    </span>
  );
});

export default MathText;
