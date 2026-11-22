export interface MathSegment {
  type: 'text' | 'inline-math' | 'block-math' | 'image';
  content: string;
  /** Only for type='image': the markdown alt text */
  alt?: string;
}

const parseCache = new Map<string, MathSegment[]>();
const MAX_CACHE_SIZE = 2000;

/**
 * Pure parsing function that splits text into plain text, inline math, and block math segments.
 * Supports:
 * - $$...$$ (display block)
 * - \[...\] (display block)
 * - \(...\) (inline)
 * - $...$ (inline with currency protection)
 * - \$ (escaped dollar sign)
 */
export function parseMathSegments(text: string): MathSegment[] {
  if (!text) return [];

  if (parseCache.has(text)) {
    return parseCache.get(text)!;
  }

  const segments: MathSegment[] = [];
  let i = 0;
  const len = text.length;
  let textBuffer = '';

  const flushText = () => {
    if (textBuffer) {
      segments.push({ type: 'text', content: textBuffer });
      textBuffer = '';
    }
  };

  while (i < len) {
    // 0. Markdown image: ![alt](url)
    if (text[i] === '!' && i + 1 < len && text[i + 1] === '[') {
      const altEnd = text.indexOf(']', i + 2);
      if (altEnd !== -1 && altEnd + 1 < len && text[altEnd + 1] === '(') {
        const urlEnd = text.indexOf(')', altEnd + 2);
        if (urlEnd !== -1) {
          const alt = text.slice(i + 2, altEnd);
          const url = text.slice(altEnd + 2, urlEnd);
          flushText();
          segments.push({ type: 'image', content: url, alt });
          i = urlEnd + 1;
          continue;
        }
      }
    }

    // 1. Escaped dollar sign: \$
    if (text[i] === '\\' && i + 1 < len && text[i + 1] === '$') {
      textBuffer += '$';
      i += 2;
      continue;
    }

    // 2. Display block: $$...$$
    if (text.startsWith('$$', i)) {
      const endIdx = text.indexOf('$$', i + 2);
      if (endIdx !== -1) {
        flushText();
        segments.push({
          type: 'block-math',
          content: text.slice(i + 2, endIdx).trim()
        });
        i = endIdx + 2;
        continue;
      }
    }

    // 3. Display block: \[...\]
    if (text.startsWith('\\[', i)) {
      const endIdx = text.indexOf('\\]', i + 2);
      if (endIdx !== -1) {
        flushText();
        segments.push({
          type: 'block-math',
          content: text.slice(i + 2, endIdx).trim()
        });
        i = endIdx + 2;
        continue;
      }
    }

    // 4. Inline math: \(...\)
    if (text.startsWith('\\(', i)) {
      const endIdx = text.indexOf('\\)', i + 2);
      if (endIdx !== -1) {
        flushText();
        segments.push({
          type: 'inline-math',
          content: text.slice(i + 2, endIdx).trim()
        });
        i = endIdx + 2;
        continue;
      }
    }

    // 5. Inline math: $...$ with currency protection
    if (text[i] === '$') {
      // Check if it's a valid math opener:
      // - Must not be followed by whitespace or another $
      // - Must have a closing $ on the same line
      // - Closing $ must not be preceded by whitespace or \
      const nextChar = i + 1 < len ? text[i + 1] : '';
      const isOpenerCandidate = nextChar && !/\s|\$/.test(nextChar);

      if (isOpenerCandidate) {
        // Find closing $ on same line
        let closeIdx = -1;
        for (let j = i + 1; j < len; j++) {
          if (text[j] === '\n') {
            break; // must be on same line
          }
          if (text[j] === '$' && text[j - 1] !== '\\') {
            // Check character before closing $
            if (!/\s/.test(text[j - 1])) {
              closeIdx = j;
              break;
            }
          }
        }

        if (closeIdx !== -1) {
          flushText();
          segments.push({
            type: 'inline-math',
            content: text.slice(i + 1, closeIdx)
          });
          i = closeIdx + 1;
          continue;
        }
      }
      // If not a valid math delimiter, treat as literal character (e.g. currency $5)
      textBuffer += text[i];
      i++;
      continue;
    }

    // Regular character
    textBuffer += text[i];
    i++;
  }

  flushText();

  if (parseCache.size >= MAX_CACHE_SIZE) {
    parseCache.clear();
  }
  parseCache.set(text, segments);

  return segments;
}
