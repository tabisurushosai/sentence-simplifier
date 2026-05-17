# T022: long-split — 設計

## 目的
ウェブページ上の長い文章を、読み手の負担を減らすために、意味のある小さな単位（短文）に分割して表示する。
不登校児・発達特性児・感覚過敏のあるユーザにとって、長文は集中の阻害要因になりやすい。

## 制約
- 外部API使用禁止
- オフライン動作
- 個人情報送信なし
- 既存レイアウト崩しを最小化（block 化は最小限）
- `furigana-auto` / `kanji-replace` と共存できること

## 構成
1.  **Content Script (`src/content.ts`)**
    - 既存のテキストノード走査と同じ枠組みに統合。
    - `chrome.storage.local` の `longSplitEnabled` 設定を監視。
    - 実行順序: kanji-replace → long-split → furigana-auto。
      - long-split を中段に置く理由: 置換語が短くなった文章に対して分割すると過剰分割を避けられ、furigana は分割後の各行に独立に振れる。

2.  **Logic (`src/splitter.ts`)** - 新規作成
    - 文字列を「読みやすい単位」に分割する純粋関数。
    - エントリポイント:
      - `splitLongSentence(text: string, opts?: SplitOptions): string[]`
      - `needsSplit(text: string, opts?: SplitOptions): boolean`
    - 分割アルゴリズム（軽量・辞書非依存）:
      1. まず句点（`。`, `．`, `！`, `？`, `!`, `?`）で 1 次分割。
      2. 各文の長さが閾値（既定 60 文字）以下ならそのまま採用。
      3. 閾値超過の文は、読点（`、`, `，`）→ 接続助詞前（`が、`/`ので、`/`けれど`/`し、`/`て、`/`たり、`）の順で 2 次分割を試みる。
      4. それでも長い場合は、最大長を超えない位置（句読点優先、なければ全角スペース等）でハードラップ。
      5. 各単位末尾の連続空白は trim。
    - 出力は HTML 由来の改行表現に変換するための「行配列」。

3.  **Storage (`src/storage.ts`)**
    - `longSplitEnabled: boolean` を追加（既定 `false`）。
    - `longSplitMaxChars: number` を追加（既定 `60`、将来 options 画面で調整可能）。

## 処理フロー
1.  ページロード時に `storage.get(['enabled', 'longSplitEnabled', 'longSplitMaxChars'])` を確認。
2.  有効であれば、テキストノードに対して `needsSplit` を判定。
3.  必要なら `splitLongSentence` で行配列を生成。
4.  行配列を `<span class="ss-line">…</span><br>` の連続として innerHTML に反映（既存の `data-ss-processed` span に統合）。
5.  既存の `MutationObserver` 経由で動的コンテンツも処理。

## HTML 出力イメージ
入力:
```
今日は朝から雨が降っていたので、傘を持って出かけたが、途中で晴れてしまい、結局荷物になってしまった。
```
出力:
```html
<span class="ss-line">今日は朝から雨が降っていたので、</span><br>
<span class="ss-line">傘を持って出かけたが、</span><br>
<span class="ss-line">途中で晴れてしまい、</span><br>
<span class="ss-line">結局荷物になってしまった。</span>
```

## 課題
- 引用文・コードブロック・テーブル内では分割しない（親タグで除外）。
- リンクテキストや見出し（H1-H6）は基本的に分割対象外（短いことが多く分割するとレイアウト破壊）。
- 句点を含まない外国語混じり文は閾値ヒットでハードラップに落ちる。意味境界の精度はベストエフォート。
- `kanji-replace` で長さが変動するため、長さ判定は置換後に行う。

## テスト計画 (T024)
- `splitLongSentence` 単体テスト: 句点分割、読点分割、ハードラップ、短文非分割、空文字、句読点のみ。
- `content.ts` 統合: kanji-replace → long-split → furigana の順で適用されること。
- パフォーマンス: 1ページ 5000 文字程度で目視確認（自動テスト化はしない）。
