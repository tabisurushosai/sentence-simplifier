# T025: readability-score — 設計

## 目的
現在表示しているウェブページの「読みやすさスコア」を 0–100 で算出し、
ポップアップに可視化する。スコアが低い（=難しい）ページでは
ユーザに `kanji-replace` / `long-split` / `furigana-auto` の利用を促す動線にもつなげる。

不登校児・発達特性児・感覚過敏のあるユーザにとっては「このページは今の自分に読めるか」を
事前に直感できるサインが、読書体験への踏み出しを後押しする。

## 制約
- 外部 API 使用禁止 (完全オフライン)
- 個人情報の収集・外部送信なし
- 辞書ファイルや巨大データの同梱なし (軽量ヒューリスティック)
- chrome.storage.local のみ使用
- content_script が DOM をスキャンする際の追加権限要らず
- 既存機能 (furigana / kanji-replace / long-split) と独立に動作

## 構成
1. **Logic (`src/readability.ts`)** - 新規作成
   - 純粋関数として実装。DOM 非依存にして単体テスト容易に。
   - エントリポイント:
     - `calcReadability(text: string): ReadabilityResult`
     - `ReadabilityResult { score: number; level: 'easy' | 'normal' | 'hard'; metrics: ReadabilityMetrics }`
     - `ReadabilityMetrics { charCount: number; sentenceCount: number; avgSentenceLen: number; kanjiRatio: number; longSentenceRatio: number }`
   - スコアリング（軽量ヒューリスティック・辞書非依存）:
     1. `charCount`: 全角扱いの文字数（空白除外）。
     2. `sentenceCount`: 句点 (`。．！？!?`) で区切った文の数。0 のときは 1 として扱う。
     3. `avgSentenceLen`: `charCount / sentenceCount`。
     4. `kanjiRatio`: 漢字（`\p{Script=Han}`）の文字数 / `charCount`。
     5. `longSentenceRatio`: 60 文字超の文の割合。
   - スコア式（100 が読みやすい）:
     - `score = 100 - (kanjiRatio*100*0.5) - (avgSentenceLen 過剰分*0.8) - (longSentenceRatio*100*0.4)`
       - 漢字率 30% 超 / 平均 50 文字超 / 長文比 20% 超でそれぞれペナルティを増やす。
     - クリップして `0 <= score <= 100` の整数に丸める。
   - `level`:
     - `score >= 70` → `easy`
     - `40 <= score < 70` → `normal`
     - `score < 40` → `hard`

2. **Content Script (`src/content.ts`)**
   - スコア算出のためにページ本文を集める用途を追加。
   - メッセージ受信: `{ type: 'getReadability' }` → `document.body.innerText` から計算して返す。
   - 既存の MutationObserver / 走査ロジックには影響を与えない。

3. **Popup (`src/popup.ts` / `popup.html` / `popup.css`)**
   - 「このページの読みやすさ」エリアを追加。
   - 起動時に active tab に `chrome.tabs.sendMessage` でスコアを要求。
   - スコアバー (0-100) を level に応じて色分け表示。
     - easy: 緑 / normal: 黄 / hard: 赤
   - 詳細メトリクス（漢字率・平均文長・長文比率）はトグルで開閉。
     - 詳細統計は Premium ゲート対象（無料ではスコアと level のみ表示）。

4. **i18n (`_locales/*/messages.json`)**
   - `readability_title`, `readability_easy`, `readability_normal`, `readability_hard`
   - `readability_details_kanji`, `readability_details_avg_len`, `readability_details_long_ratio`
   - `readability_premium_hint`（無料ユーザ向け詳細隠し用）

## 処理フロー
1. ユーザがツールバーアイコンをクリック → popup 起動。
2. popup.ts が active tab に `{ type: 'getReadability' }` を送る。
3. content.ts が本文テキストを取得し、`calcReadability` で計算して返信。
4. popup.ts がスコアバーとラベルを描画。
5. ユーザが「詳細」を開くと metrics を表示（Premium 限定）。

## エッジケース
- 本文がほぼ空（lt 20 文字）→ `level: 'easy'`、`score: 100` を返してバーをグレーアウト。
- 句点が一切ない長文 → `sentenceCount = 1`、`avgSentenceLen = charCount` で扱い、ペナルティが効く。
- 英語のみページ → 漢字率 0%、長文比はそのまま計算（英語向け最適化は将来）。
- iframe や Shadow DOM の中身は対象外（content.ts の既存ポリシーに合わせる）。

## テスト計画 (T027)
- `calcReadability` 単体:
  - 空文字 → `score=100, level='easy'`
  - 短いひらがな主体テキスト → `easy`
  - 漢字密度 50% / 平均 80 文字 → `hard`
  - 中程度（漢字 20% / 平均 35 文字） → `normal`
- popup/content の往復はモックで通信形をテスト（DOM 操作は手動確認）。

## 将来拡張
- ページ単位の履歴を `chrome.storage.local` に保存し、Premium で推移グラフを提供。
- 段落単位のホバー表示（ハイライトしたパラグラフのみスコア）。
- 学齢 (小1〜小6) 換算ラベルを `level` に加える。
