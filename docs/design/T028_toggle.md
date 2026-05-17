# T028: toggle — 設計

## 目的
ユーザが「いま、この瞬間に」やさしい文章機能をすばやく ON/OFF できるしくみ。
不登校児・発達特性児・感覚過敏のあるユーザは、ページ全体の見た目変化が
集中を妨げることがあるため、「一押しで素の表示に戻れる」ことが
心理的安全に直結する。

複数の小機能 (furigana-auto / kanji-replace / long-split / readability-score)
を個別に切り替えるオプションは options.html にあるが、
toggle 機能は次の 3 階層を統合的に扱う:

1. **マスタートグル** — popup の大きなスイッチで全機能を一括 ON/OFF。
2. **機能別トグル** — options で個別 ON/OFF (既存)。
3. **ページ別一時オフ** — 現在開いているタブだけ一時的に無効化 (新規)。

## 制約
- 完全オフライン (外部送信なし)。
- chrome.storage.local のみ使用。sync 禁止。
- host_permissions の追加禁止。content_script は既存範囲のみ。
- service_worker は短時間処理。長期 keep-alive 禁止。
- トグル変更時、すでに DOM 書き換えた箇所は次回ページ更新 (reload) で元に戻れば可。
  既存実装は MutationObserver の停止のみ行い、書き換え済み span は残るが、
  リロードでクリアされる前提とする (許容)。

## 状態の責務 (storage キー)
| キー | 既定値 | 用途 | 保存場所 |
| --- | --- | --- | --- |
| `enabled` | `true` | マスタートグル (全機能) | chrome.storage.local |
| `furiganaEnabled` | `true` | 機能別 (ふりがな) | chrome.storage.local |
| `kanjiReplaceEnabled` | `true` | 機能別 (熟語変換) | chrome.storage.local |
| `longSplitEnabled` | `true` | 機能別 (長文分割) | chrome.storage.local |
| `readabilityScoreEnabled` | `true` | 機能別 (スコア) | chrome.storage.local |
| `disabledHosts` | `[]` | ページ別一時オフ (ホスト名配列) | chrome.storage.local |

`enabled === false` がすべてに優先する (マスター OFF なら他フラグは無視)。
`disabledHosts` に現在ページの host が含まれていれば、その tab の content
スクリプトは「マスター OFF」と同じ挙動になる。

## 構成
1. **popup.ts / popup.html**
   - 既存のマスタートグル (`#toggle-simplifier`) は維持。
   - 新規: 「このサイトでは無効にする」チェックボックス (`#toggle-site-disabled`)。
     - 起動時に `chrome.tabs.query({active:true, currentWindow:true})` で
       現在の host を取り出し、`disabledHosts.includes(host)` で初期状態決定。
     - 変更時、host を `disabledHosts` に追加/削除して storage.set。
   - マスター OFF の間はサイト別チェックを disabled (見た目薄く) に。

2. **content.ts**
   - 既存 `init()` の冒頭で:
     ```ts
     const host = location.hostname;
     const { enabled, disabledHosts = [] } = await storage.get(['enabled', 'disabledHosts']);
     const masterOn = enabled && !disabledHosts.includes(host);
     ```
   - `masterOn` で furigana/kanji/longSplit のアクティブ判定を一括ゲート。
   - 既存 `chrome.storage.onChanged` リスナで `disabledHosts` 変更も
     `init()` 再実行のトリガに加える。

3. **storage.ts**
   - `StorageData` に `disabledHosts: string[]` を追加。既定 `[]`。
   - `get` のフォールバック既定値マップも更新。

4. **i18n (`_locales/*/messages.json`)**
   - `popup_disable_on_site`: 「このサイトでは無効にする」 / "Disable on this site"
   - `popup_master_off_hint`: マスター OFF 時の説明 (省略可)。

5. **キーボードショートカット (オプション)**
   - manifest.json の `commands` に `_execute_action` をデフォルトで残し、
     ショートカット (例: Alt+Shift+S) で popup を開く動線を案内のみ。
     新規 commands の追加は今回スコープ外 (V3 のショートカット権限は最小限)。

## 処理フロー
### マスタートグル
1. popup でチェック変更 → `storage.set({ enabled })`.
2. すべてのタブの content_script が `chrome.storage.onChanged` を受け取る。
3. `init()` が再実行され、`enabled=false` なら observer 停止。

### サイト別一時オフ
1. popup で「このサイトでは無効にする」を ON.
2. 現在 tab の host を `disabledHosts` 配列に push (重複排除).
3. content_script が onChanged を検知 → `init()` 再実行 → 該当 host なら OFF.
4. 他サイトには影響しない (host 配列なので tab 間で分離)。

## エッジケース
- file:// や chrome:// の特殊ページ → `tabs.query` の url が undefined になり得る。
  popup 側で `URL` パース失敗時はサイト別トグルを disabled にする。
- 同一サイトの www あり/なし は別 host として扱う (将来 eTLD+1 統一は要検討)。
- `disabledHosts` 配列の上限は未設定 (将来 1000 件超なら清掃ロジック追加)。
- 既に DOM 書き換え済みのページは現セッションでは元に戻らない (リロードで解消)。
  仕様コメントを popup に小さく表示することは将来追加。

## テスト計画 (T030)
- storage.get/set の挙動確認: `disabledHosts` の add/remove。
- popup 起動時、現 tab host が `disabledHosts` に含まれるかでチェック状態が変わる。
- content.ts の `init()` が `enabled=false` または host が無効リスト時に
  observer を起動しないこと (mock test)。
- マスターと機能別が両方 ON、サイト別だけ OFF のとき、対象 tab で walk が走らない。

## 将来拡張
- ワンクリックで一時的にすべて元に戻す (現セッションのみ) ボタン。
- 学校/家庭用プロファイル切り替え (子供別)。
- eTLD+1 ベースのドメイン正規化。
