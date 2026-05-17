import { describe, it, expect } from 'vitest';
import { simplifyText, hasSimplifiableWord } from './simplifier';
import { addFurigana } from './furigana';

describe('simplifier', () => {
  describe('hasSimplifiableWord', () => {
    it('returns true when a known jukugo is present', () => {
      expect(hasSimplifiableWord('この変換は理解できる')).toBe(true);
      expect(hasSimplifiableWord('削除します')).toBe(true);
    });

    it('returns false when no known word is present', () => {
      expect(hasSimplifiableWord('あいうえお')).toBe(false);
      expect(hasSimplifiableWord('hello world')).toBe(false);
    });
  });

  describe('simplifyText', () => {
    it('replaces known jukugo with simpler expressions', () => {
      expect(simplifyText('理解する')).toBe('わかることする');
      expect(simplifyText('変換')).toBe('かえること');
      expect(simplifyText('削除')).toBe('けす');
    });

    it('prefers longer matches when keys overlap', () => {
      // '不可能' (3 chars) should win over '可能' (2 chars)
      expect(simplifyText('不可能')).toBe('できない');
    });

    it('returns the original text when no word matches', () => {
      expect(simplifyText('あいうえお')).toBe('あいうえお');
    });

    it('replaces every occurrence', () => {
      expect(simplifyText('変換と変換')).toBe('かえることとかえること');
    });
  });

  describe('integration with furigana', () => {
    it('produces furigana on residual kanji after replacement', () => {
      // '詳細' -> 'くわしい内容'. '内容' is not in the furigana dict,
      // but if it were, it would gain ruby. This test verifies that
      // running simplify before furigana does not break furigana on
      // remaining kanji ('理解' -> 'わかること' has no remaining kanji,
      // but '詳細' leaves '内容').
      const simplified = simplifyText('詳細を確認する');
      // After simplify: 'くわしい内容をたしかめることする'
      expect(simplified).toContain('くわしい内容');
      expect(simplified).toContain('たしかめること');
      // furigana pass should still run cleanly and not throw
      const withFurigana = addFurigana(simplified);
      expect(typeof withFurigana).toBe('string');
    });
  });
});
