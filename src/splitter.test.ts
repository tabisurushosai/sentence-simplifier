import { describe, it, expect } from 'vitest';
import { splitLongSentence, needsSplit } from './splitter';

describe('splitter', () => {
  describe('needsSplit', () => {
    it('returns false for short single-sentence text', () => {
      expect(needsSplit('短い文。')).toBe(false);
      expect(needsSplit('短い')).toBe(false);
      expect(needsSplit('')).toBe(false);
    });

    it('returns true when a sentence exceeds maxChars', () => {
      const long = 'あ'.repeat(80) + '。';
      expect(needsSplit(long)).toBe(true);
    });

    it('returns true when there are multiple sentences', () => {
      expect(needsSplit('一文目。二文目。')).toBe(true);
    });

    it('respects custom maxChars', () => {
      expect(needsSplit('あいうえおかきくけこ', { maxChars: 5 })).toBe(true);
      expect(needsSplit('あいうえお', { maxChars: 10 })).toBe(false);
    });
  });

  describe('splitLongSentence', () => {
    it('returns an empty list for empty input', () => {
      expect(splitLongSentence('')).toEqual([]);
    });

    it('keeps short text intact', () => {
      expect(splitLongSentence('短い文。')).toEqual(['短い文。']);
    });

    it('splits at sentence-ending punctuation', () => {
      const result = splitLongSentence('一文目。二文目。三文目。');
      expect(result).toEqual(['一文目。', '二文目。', '三文目。']);
    });

    it('splits long sentences at commas', () => {
      const part = 'あ'.repeat(30);
      const text = `${part}、${part}、${part}。`;
      const result = splitLongSentence(text, { maxChars: 40 });
      // Every emitted line must be <= maxChars.
      for (const line of result) {
        expect(line.length).toBeLessThanOrEqual(40);
      }
      // The concatenation must reconstruct the input ignoring layout.
      expect(result.join('')).toBe(text);
    });

    it('hard-wraps when no natural break is available', () => {
      const text = 'あ'.repeat(150);
      const result = splitLongSentence(text, { maxChars: 40 });
      expect(result.length).toBeGreaterThan(1);
      for (const line of result) {
        expect(line.length).toBeLessThanOrEqual(40);
      }
    });

    it('splits at connective particles when available', () => {
      const text = 'これはとても長い文章ですので、もう少し短くしたいですが、難しいかもしれません。';
      const result = splitLongSentence(text, { maxChars: 25 });
      expect(result.length).toBeGreaterThan(1);
      for (const line of result) {
        expect(line.length).toBeLessThanOrEqual(25);
      }
    });

    it('trims leading and trailing whitespace from lines', () => {
      const result = splitLongSentence(' 文一。 文二。 ');
      expect(result).toEqual(['文一。', '文二。']);
    });

    it('drops empty segments produced by splitting', () => {
      const result = splitLongSentence('。。');
      for (const line of result) {
        expect(line.length).toBeGreaterThan(0);
      }
    });
  });
});
