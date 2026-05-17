# T016: furigana-auto — 設計

## 目的
ウェブページ上の難しい漢字に対して自動的にふりがな（ルビ）を振る。

## 制約
- 外部API使用禁止
- オフライン動作
- 個人情報送信なし

## 構成
1.  **Content Script (`src/content.ts`)**
    - ページのDOMをトラバースし、テキストノードを抽出。
    - 抽出したテキストを解析し、漢字を特定。
    - 漢字を `<ruby>` タグでラップし、ふりがなを追加。
    - `MutationObserver` を使用して、動的に追加されたコンテンツにも対応。
    - `chrome.storage.local` の `furiganaEnabled` 設定を監視し、オン/オフを切り替え。

2.  **Logic (`src/furigana.ts`)** - 新規作成
    - 漢字から読みを取得するコアロジック。
    - 初期段階では、簡易的な「漢字-読み」辞書ベースの置換またはパターンマッチングを採用。
    - 高度な形態素解析（Kuromoji.js等）はライブラリサイズが大きいため、軽量な手法を検討。

3.  **Storage (`src/storage.ts`)**
    - `furiganaEnabled` フラグで機能を管理。

## 処理フロー
1.  ページロード時に `storage.get(['enabled', 'furiganaEnabled'])` を実行。
2.  有効であれば、`document.body` のテキストノードを再帰的に走査。
3.  テキスト内の漢字を検出し、辞書またはルールに基づいて読みを決定。
4.  テキストノードを `<span><ruby>漢字<rt>かんじ</rt></ruby></span>` のようなHTML構造に置換。
5.  `MutationObserver` でDOMの変化を検知し、新規要素にも同様の処理を適用。

## 課題
- 同音異義語の判定（文脈依存の読み）。
- 辞書のサイズとパフォーマンス。
- 既存のレイアウトへの影響。
