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
};

/**
 * Adds furigana to a string of text using <ruby> tags.
 */
export function addFurigana(text: string): string {
  let result = text;
  
  // Sort keys by length descending to match longest phrases first
  const keys = Object.keys(KANJI_DICT).sort((a, b) => b.length - a.length);
  
  for (const kanji of keys) {
    const reading = KANJI_DICT[kanji];
    // Simple escape for regex (though not strictly necessary for these keys)
    const escapedKanji = kanji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKanji, 'g');
    
    // We use a placeholder to avoid nesting ruby tags if we were to do multiple passes
    // But since we are doing it once per phrase, it's simpler.
    // However, to be safe, we should only replace if not already part of a ruby tag.
    // Since we are working on raw text nodes, this is less of an issue.
    result = result.replace(regex, `<ruby>${kanji}<rt>${reading}</rt></ruby>`);
  }
  
  return result;
}

/**
 * Checks if a string contains any kanji.
 */
export function containsKanji(text: string): boolean {
  return /[\u4E00-\u9FAF]/.test(text);
}
