/**
 * Readability scoring for Japanese text.
 * Pure functions; no DOM access. Designed to be cheap enough to run on
 * the full body innerText every time the popup opens.
 */

export type ReadabilityLevel = 'easy' | 'normal' | 'hard';

export interface ReadabilityMetrics {
  charCount: number;
  sentenceCount: number;
  avgSentenceLen: number;
  kanjiRatio: number;
  longSentenceRatio: number;
}

export interface ReadabilityResult {
  score: number;
  level: ReadabilityLevel;
  metrics: ReadabilityMetrics;
}

const SENTENCE_DELIM_RE = /[。．！？!?]/;
const KANJI_RE = /\p{Script=Han}/u;
const WHITESPACE_RE = /\s/;
const LONG_SENTENCE_THRESHOLD = 60;
const MIN_MEASURABLE_CHARS = 20;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function countChars(text: string): { total: number; kanji: number } {
  let total = 0;
  let kanji = 0;
  for (const ch of text) {
    if (WHITESPACE_RE.test(ch)) continue;
    total++;
    if (KANJI_RE.test(ch)) kanji++;
  }
  return { total, kanji };
}

/**
 * Splits text into sentence-sized chunks using Japanese/Western terminators.
 * Empty trailing fragments are dropped so the count reflects real sentences.
 */
function splitSentences(text: string): string[] {
  const result: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if (SENTENCE_DELIM_RE.test(ch)) {
      result.push(buf);
      buf = '';
    }
  }
  if (buf.trim().length > 0) result.push(buf);
  return result.map((s) => s.trim()).filter((s) => s.length > 0);
}

function levelFromScore(score: number): ReadabilityLevel {
  if (score >= 70) return 'easy';
  if (score >= 40) return 'normal';
  return 'hard';
}

/**
 * Computes a 0-100 readability score (higher = easier).
 * Returns easy/100 for very short or empty input so the UI can grey out
 * the bar instead of showing a misleading low score.
 */
export function calcReadability(text: string): ReadabilityResult {
  const { total: charCount, kanji: kanjiCount } = countChars(text || '');

  if (charCount < MIN_MEASURABLE_CHARS) {
    return {
      score: 100,
      level: 'easy',
      metrics: {
        charCount,
        sentenceCount: 0,
        avgSentenceLen: 0,
        kanjiRatio: 0,
        longSentenceRatio: 0,
      },
    };
  }

  const sentences = splitSentences(text);
  const sentenceCount = sentences.length === 0 ? 1 : sentences.length;
  const avgSentenceLen = charCount / sentenceCount;

  let longSentenceCount = 0;
  for (const s of sentences) {
    const len = countChars(s).total;
    if (len > LONG_SENTENCE_THRESHOLD) longSentenceCount++;
  }
  const longSentenceRatio = sentences.length === 0 ? 0 : longSentenceCount / sentences.length;
  const kanjiRatio = charCount === 0 ? 0 : kanjiCount / charCount;

  // Penalty model: each factor contributes a non-negative penalty, summed.
  // - kanji: linear in ratio; ~50 max at 100% kanji.
  // - sentence length: only the excess above 30 chars matters.
  // - long-sentence ratio: linear; ~40 max at 100% long sentences.
  const kanjiPenalty = kanjiRatio * 100 * 0.5;
  const sentenceLenPenalty = Math.max(0, avgSentenceLen - 30) * 0.8;
  const longSentencePenalty = longSentenceRatio * 100 * 0.4;

  const raw = 100 - kanjiPenalty - sentenceLenPenalty - longSentencePenalty;
  const score = Math.round(clamp(raw, 0, 100));

  return {
    score,
    level: levelFromScore(score),
    metrics: {
      charCount,
      sentenceCount,
      avgSentenceLen: Math.round(avgSentenceLen * 10) / 10,
      kanjiRatio: Math.round(kanjiRatio * 1000) / 1000,
      longSentenceRatio: Math.round(longSentenceRatio * 1000) / 1000,
    },
  };
}
