/**
 * Long-sentence splitter.
 * Breaks down long Japanese text into readable shorter units.
 * Designed to run AFTER kanji-replace and BEFORE furigana-auto so that
 * length judgement reflects the simplified text and furigana can be
 * applied independently to each line.
 */

export interface SplitOptions {
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 60;
const SENTENCE_DELIMS = ['。', '．', '！', '？', '!', '?'];
const COMMA_DELIMS = ['、', '，'];
// Connective particles that often mark a semantic break. We split after them.
const CONNECTIVE_SUFFIXES = ['ので、', 'のに、', 'けれど、', 'けれども、', 'だが、', 'たり、', 'して、', 'して', 'が、', 'し、', 'て、'];

function trimLine(s: string): string {
  return s.replace(/^[\s　]+|[\s　]+$/g, '');
}

/**
 * Splits a string by the given delimiter characters, keeping each delimiter at
 * the end of the preceding segment. Empty segments are removed.
 */
function splitKeepDelim(text: string, delims: string[]): string[] {
  const result: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if (delims.includes(ch)) {
      result.push(buf);
      buf = '';
    }
  }
  if (buf) result.push(buf);
  return result.filter((s) => s.length > 0);
}

/**
 * Tries to split a sentence at connective particles. Returns multiple parts
 * if a match is found, otherwise returns [text].
 */
function splitAtConnective(text: string): string[] {
  for (const suffix of CONNECTIVE_SUFFIXES) {
    const idx = text.indexOf(suffix);
    if (idx >= 0 && idx + suffix.length < text.length) {
      const head = text.slice(0, idx + suffix.length);
      const tail = text.slice(idx + suffix.length);
      // Recurse on the tail so chains of connectives split too.
      return [head, ...splitAtConnective(tail)];
    }
  }
  return [text];
}

/**
 * Hard-wraps a segment that is still too long. Tries to break at any
 * remaining punctuation or whitespace; otherwise breaks at maxChars exactly.
 */
function hardWrap(text: string, maxChars: number): string[] {
  const result: string[] = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    // Look for the last reasonable break point within maxChars.
    let cut = -1;
    for (let i = Math.min(maxChars, remaining.length - 1); i > 0; i--) {
      const ch = remaining[i];
      if (
        SENTENCE_DELIMS.includes(ch) ||
        COMMA_DELIMS.includes(ch) ||
        ch === ' ' ||
        ch === '　'
      ) {
        cut = i + 1;
        break;
      }
    }
    if (cut <= 0) cut = maxChars;
    result.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining.length > 0) result.push(remaining);
  return result;
}

/**
 * Returns true if any sub-sentence in the text exceeds maxChars.
 */
export function needsSplit(text: string, opts?: SplitOptions): boolean {
  const maxChars = opts?.maxChars ?? DEFAULT_MAX_CHARS;
  if (!text) return false;
  if (text.length <= maxChars && !/[。．！？!?]/.test(text)) return false;
  const sentences = splitKeepDelim(text, SENTENCE_DELIMS);
  for (const s of sentences) {
    if (s.length > maxChars) return true;
  }
  // Multi-sentence text benefits from line-per-sentence rendering too.
  return sentences.length > 1;
}

/**
 * Splits a long sentence into smaller readable units.
 * Algorithm:
 *   1. Split by sentence-ending punctuation.
 *   2. For each sentence above the threshold, split at commas.
 *   3. If still too long, split at connective particles.
 *   4. If still too long, hard-wrap at the threshold.
 */
export function splitLongSentence(text: string, opts?: SplitOptions): string[] {
  const maxChars = opts?.maxChars ?? DEFAULT_MAX_CHARS;
  if (!text) return [];

  const lines: string[] = [];
  const sentences = splitKeepDelim(text, SENTENCE_DELIMS);

  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      lines.push(sentence);
      continue;
    }

    // Try comma split first.
    const commaParts = splitKeepDelim(sentence, COMMA_DELIMS);
    const merged: string[] = [];
    let buf = '';
    for (const part of commaParts) {
      if ((buf + part).length <= maxChars) {
        buf += part;
      } else {
        if (buf) merged.push(buf);
        buf = part;
      }
    }
    if (buf) merged.push(buf);

    for (const piece of merged) {
      if (piece.length <= maxChars) {
        lines.push(piece);
        continue;
      }
      // Try connective particle splits.
      const connectiveParts = splitAtConnective(piece);
      if (connectiveParts.length > 1 && connectiveParts.every((p) => p.length <= maxChars)) {
        lines.push(...connectiveParts);
        continue;
      }
      // Hard wrap remaining over-long piece.
      lines.push(...hardWrap(piece, maxChars));
    }
  }

  return lines.map(trimLine).filter((s) => s.length > 0);
}
