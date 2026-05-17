# T019: kanji-replace — 設計

## 目的
ウェブページ上の難しい熟語を、より平易な表現（簡単な言葉やひらがな）に置換する。

## 制約
- 外部API使用禁止
- オフライン動作
- 個人情報送信なし

## 構成
1.  **Content Script (`src/content.ts`)**
    - `furigana-auto` と同様にテキストノードを走査。
    - `simplifier.ts` のロジックを呼び出し、テキスト内の熟語を置換。
    - `chrome.storage.local` の `kanjiReplaceEnabled` 設定を監視。

2.  **Logic (`src/simplifier.ts`)** - 新規作成
    - 難しい熟語を簡単な言葉に変換するコアロジック。
    - 「難しい熟語: 簡単な言葉」のペアを持つ辞書ベースの置換。
    - 置換後の文字列に漢字が含まれる場合、`furigana-auto` が後続で処理することを考慮。

3.  **Storage (`src/storage.ts`)**
    - `kanjiReplaceEnabled` フラグで機能を管理。

## 処理フロー
1.  ページロード時またはDOM更新時に `storage.get(['enabled', 'kanjiReplaceEnabled'])` を確認。
2.  有効であれば、テキストノード内の対象熟語を辞書に基づいて置換。
3.  置換処理は `furigana-auto` の前に行う（置換後の言葉にもふりがなを振るため）。
4.  置換後のテキストは、元のテキストノードまたは新規 `span` で反映。

## 辞書案 (例)
- `理解` -> `わかる`
- `変換` -> `かえる`
- `学習` -> `まなぶ`
- `詳細` -> `くわしい内容`

## 課題
- 文脈による適切な置換（「変換」がすべて「かえる」で良いか等）。
- 誤置換による意味の変質。
- 他の機能（furigana-auto, long-split）との実行順序の制御。
