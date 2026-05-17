/**
 * Simple furigana logic using a dictionary-based approach.
 * In a real-world scenario, this might use a more sophisticated 
 * morphological analyzer or a larger dictionary.
 */

const KANJI_DICT: Record<string, string> = {
  '日本語': 'にほんご',
  '学習': 'がくしゅう',
  '簡単': 'かんたん',
  '難しい': 'むずかしい',
  '文章': 'ぶんしょう',
  '漢字': 'かんじ',
  '表示': 'ひょうじ',
  '機能': 'きのう',
  '自動': 'じどう',
  '設定': 'せってい',
  '勉強': 'べんきょう',
  '理解': 'りかい',
  '変換': 'へんかん',
  '分割': 'ぶんかつ',
  '読込': 'よみこみ',
};

/**
 * Adds furigana to a string of text using <ruby> tags.
 * Prevents nested ruby tags by using a placeholder replacement strategy.
 */
export function addFurigana(text: string): string {
  let result = text;
  const placeholders: string[] = [];
  
  // Sort keys by length descending to match longest phrases first
  const keys = Object.keys(KANJI_DICT).sort((a, b) => b.length - a.length);
  
  for (const kanji of keys) {
    const reading = KANJI_DICT[kanji];
    const escapedKanji = kanji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKanji, 'g');
    
    result = result.replace(regex, (match) => {
      const placeholder = `__RUBY_PLACEHOLDER_${placeholders.length}__`;
      placeholders.push(`<ruby>${match}<rt>${reading}</rt></ruby>`);
      return placeholder;
    });
  }
  
  // Replace placeholders back with actual ruby tags
  placeholders.forEach((ruby, index) => {
    result = result.replace(`__RUBY_PLACEHOLDER_${index}__`, ruby);
  });
  
  return result;
}

/**
 * Checks if a string contains any kanji.
 */
export function containsKanji(text: string): boolean {
  return /[\u4E00-\u9FAF]/.test(text);
}
