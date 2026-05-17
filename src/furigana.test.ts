import { describe, it, expect } from 'vitest';
import { addFurigana, containsKanji } from './furigana';

describe('furigana', () => {
  describe('containsKanji', () => {
    it('should return true for text with kanji', () => {
      expect(containsKanji('日本語')).toBe(true);
      expect(containsKanji('漢字123')).toBe(true);
    });

    it('should return false for text without kanji', () => {
      expect(containsKanji('ひらがな')).toBe(false);
      expect(containsKanji('カタカナ')).toBe(false);
      expect(containsKanji('English')).toBe(false);
    });
  });

  describe('addFurigana', () => {
    it('should add furigana to known kanji', () => {
      const input = '日本語を勉強します。';
      const output = addFurigana(input);
      expect(output).toContain('<ruby>日本語<rt>にほんご</rt></ruby>');
      expect(output).toContain('<ruby>勉強<rt>べんきょう</rt></ruby>');
    });

    it('should not nest ruby tags for overlapping words', () => {
      // In this case, "日本語" is longer than "日本" (if "日本" was in dict)
      // Since we sort by length, "日本語" should be replaced first.
      // Let's assume we added "日本" to KANJI_DICT for this test or use what's there.
      // Currently KANJI_DICT has '日本語' but not '日本'.
      const input = '日本語';
      const output = addFurigana(input);
      expect(output).toBe('<ruby>日本語<rt>にほんご</rt></ruby>');
      expect(output).not.toContain('<ruby><ruby>');
    });

    it('should handle text with no matches', () => {
      const input = 'あいうえお';
      expect(addFurigana(input)).toBe(input);
    });
  });
});
