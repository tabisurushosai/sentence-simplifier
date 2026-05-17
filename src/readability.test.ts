import { describe, it, expect } from 'vitest';
import { calcReadability } from './readability';

describe('readability', () => {
  describe('calcReadability', () => {
    it('returns easy/100 for empty text', () => {
      const r = calcReadability('');
      expect(r.score).toBe(100);
      expect(r.level).toBe('easy');
      expect(r.metrics.charCount).toBe(0);
    });

    it('returns easy/100 for very short text (under MIN_MEASURABLE_CHARS)', () => {
      const r = calcReadability('短い文。');
      expect(r.score).toBe(100);
      expect(r.level).toBe('easy');
    });

    it('treats whitespace as non-counted characters', () => {
      const r = calcReadability('   \n\t  ');
      expect(r.metrics.charCount).toBe(0);
      expect(r.score).toBe(100);
    });

    it('scores plain hiragana text as easy (high score)', () => {
      const text = 'これはとてもやさしいぶんしょうです。'.repeat(3);
      const r = calcReadability(text);
      expect(r.score).toBeGreaterThanOrEqual(70);
      expect(r.level).toBe('easy');
    });

    it('penalizes heavy kanji density', () => {
      const easy = 'これはやさしいぶんしょうです。'.repeat(5);
      const hard = '複雑難解高度専門用語頻出文書類型例示。'.repeat(5);
      const easyR = calcReadability(easy);
      const hardR = calcReadability(hard);
      expect(hardR.score).toBeLessThan(easyR.score);
      expect(hardR.metrics.kanjiRatio).toBeGreaterThan(easyR.metrics.kanjiRatio);
    });

    it('penalizes long average sentence length', () => {
      const short = 'これはみじかいぶん。'.repeat(10);
      const long = 'これはとてもながいぶんしょうでありなかなかおわらないぶんしょうとしてつづいていきます'.repeat(3) + '。';
      const shortR = calcReadability(short);
      const longR = calcReadability(long);
      expect(longR.score).toBeLessThan(shortR.score);
      expect(longR.metrics.avgSentenceLen).toBeGreaterThan(shortR.metrics.avgSentenceLen);
    });

    it('detects long sentences via longSentenceRatio', () => {
      const text = 'あ'.repeat(80) + '。';
      const r = calcReadability(text);
      expect(r.metrics.longSentenceRatio).toBeGreaterThan(0);
      expect(r.metrics.sentenceCount).toBe(1);
    });

    it('splits on multiple sentence delimiters (。．！？!?)', () => {
      const text = 'ぶんいち。ぶんに．ぶんさん！ぶんよん？ぶんご!ぶんろく?';
      const r = calcReadability(text);
      expect(r.metrics.sentenceCount).toBe(6);
    });

    it('keeps score within 0-100 range', () => {
      const allKanji = '漢'.repeat(200) + '。';
      const r = calcReadability(allKanji);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });

    it('assigns level "hard" for very low scores', () => {
      const text = '複雑難解高度専門用語頻出'.repeat(20);
      const r = calcReadability(text);
      expect(r.level).toBe('hard');
      expect(r.score).toBeLessThan(40);
    });

    it('assigns level "normal" for mid-range scores', () => {
      // Mixed kanji and kana, moderate length.
      const text = ('今日は学校に行きました。友達と話して楽しかったです。'.repeat(3));
      const r = calcReadability(text);
      expect(['easy', 'normal']).toContain(r.level);
    });

    it('rounds kanjiRatio to 3 decimals', () => {
      const text = '漢字とかな文字をまぜたぶんしょう。'.repeat(5);
      const r = calcReadability(text);
      // 1000x value should be an integer (within floating-point tolerance).
      expect(Math.abs(r.metrics.kanjiRatio * 1000 - Math.round(r.metrics.kanjiRatio * 1000))).toBeLessThan(1e-9);
    });

    it('rounds avgSentenceLen to 1 decimal', () => {
      const text = 'あいうえおかきくけこさしすせそ。'.repeat(3);
      const r = calcReadability(text);
      expect(Math.abs(r.metrics.avgSentenceLen * 10 - Math.round(r.metrics.avgSentenceLen * 10))).toBeLessThan(1e-9);
    });

    it('counts kanjiRatio as 0 for pure hiragana', () => {
      const text = 'これはひらがなだけのぶんしょうです。'.repeat(3);
      const r = calcReadability(text);
      expect(r.metrics.kanjiRatio).toBe(0);
    });

    it('handles null/undefined gracefully via empty fallback', () => {
      const r = calcReadability(undefined as unknown as string);
      expect(r.score).toBe(100);
      expect(r.metrics.charCount).toBe(0);
    });

    it('returns sentenceCount=1 for measurable text with no terminator', () => {
      const text = 'あ'.repeat(30);
      const r = calcReadability(text);
      expect(r.metrics.sentenceCount).toBe(1);
    });
  });
});
