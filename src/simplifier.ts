/**
 * Dictionary-based kanji/jukugo simplifier.
 * Replaces difficult Japanese compound words with simpler expressions.
 * Designed to run BEFORE furigana-auto so that any remaining kanji in the
 * replacement still gets furigana applied.
 */

const SIMPLIFY_DICT: Record<string, string> = {
  '理解': 'わかること',
  '変換': 'かえること',
  '学習': 'まなぶこと',
  '詳細': 'くわしい内容',
  '使用': 'つかうこと',
  '購入': 'かうこと',
  '販売': 'うること',
  '提供': 'あたえること',
  '実行': 'おこなうこと',
  '確認': 'たしかめること',
  '可能': 'できる',
  '不可能': 'できない',
  '必要': 'いること',
  '不要': 'いらない',
  '困難': 'むずかしい',
  '容易': 'かんたん',
  '開始': 'はじめる',
  '終了': 'おわる',
  '完了': 'おわった',
  '中止': 'やめる',
  '取得': 'もらう',
  '送信': 'おくる',
  '受信': 'うけとる',
  '削除': 'けす',
  '追加': 'たす',
  '編集': 'なおす',
  '保存': 'ためる',
};

/**
 * Replaces difficult words in the text with simpler ones based on the dictionary.
 * Longer keys are processed first to avoid partial matches.
 */
export function simplifyText(text: string): string {
  let result = text;
  const keys = Object.keys(SIMPLIFY_DICT).sort((a, b) => b.length - a.length);

  for (const word of keys) {
    const replacement = SIMPLIFY_DICT[word];
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    result = result.replace(regex, replacement);
  }

  return result;
}

/**
 * Returns true if the text contains any word that the simplifier knows about.
 */
export function hasSimplifiableWord(text: string): boolean {
  for (const word of Object.keys(SIMPLIFY_DICT)) {
    if (text.includes(word)) return true;
  }
  return false;
}
