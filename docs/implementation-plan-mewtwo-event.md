# 実装計画：ミュウツーイベント対応（秘境リサーチ！ミュウツーをおいかけて）

> 作成日: 2026-08-28
> 対象イベント: 2026/9/14(月) 4:00 〜 9/28(月) 3:59（最終日 9/27(日)）
> ステータス: **設計完了・実装待ち**（実装は別セッションで行う）

---

## 背景・目的

3イベント目「秘境リサーチ！ミュウツーをおいかけて」に対応する。
マルチイベント基盤（`docs/implementation-plan-multi-event.md`）は構築済みで、
ラティアス（2026/4）・ラティオス（2026/6）の2イベントが `EVENTS` 配列に定義されている。

**基本方針: 過去2イベントと同じ追加手順を踏襲する。**
今回はコード側にほぼ手を入れず、以下の4点で完結する。

1. `lib/data/items.ts` に新アイテム2種を追加
2. `lib/data/events.ts` の `EVENTS` にミュウツーイベントを追加
3. **通貨表記の汎用化**（今回唯一のコード変更。後述）
4. プレースホルダ画像の配置

---

## 現状把握（2026-08-28 調査）

### コードベースの状態

- `components/event-calendar.tsx`（2149行）は **完全データ駆動**。
  イベント固有のハードコード（ラティアス/ラティオス文字列）は残っていない。
- `eventIndex` の初期値は `EVENTS.length - 1` → **配列に追加するだけで新イベントがデフォルト表示になる**。
- localStorage キーは `{eventId}-inventory` 等でイベントごとに自動分離。追加作業不要。
- `buildEventDays()` が開始日から17日分（本体14日 + イベント後月火 + 持ち越し水曜）を自動生成。
- `components/event-exchange.tsx` / `item-inventory.tsx` は **どこからも import されていない v0 残骸**（今回触らない）。

### 唯一のハードコード残り: 「うもう」表記

ミュウツーイベントの資材は「**ミュウツーのいでんし**」であり「うもう」ではない。
`event-calendar.tsx` に以下の4箇所が固定文字列で残っている:

| 行(現在) | 内容 |
|---|---|
| L711 | 見出し `🪶 うもう交換所` |
| L715 | 合計表示の `🪶` アイコン |
| L719 | リセット確認 `うもう交換所をリセットしますか？…` |
| L767 | 各行の単価表示 `{entry.umouCost}🪶` |

### 過去イベント追加時の実績（参照コミット）

| コミット | 内容 |
|---|---|
| `5045206` | マルチイベント化 + ラティオス追加（events.ts / items.ts への追記パターン） |
| `913923e` | 新アイテムの仮画像設定（正式画像入手後に差し替える運用の前例） |
| `8adc193` | 交換所データを開催後に確定値へ更新（推定値→確定値の運用の前例） |

---

## イベント確定情報（wikiwiki / 公式発表より）

出典: [wikiwiki イベントページ](https://wikiwiki.jp/poke_sleep/イベント/秘境リサーチ！ミュウツーをおいかけて) / [公式予告](https://www.pokemonsleep.net/news/343234373533313039383737363533353039/)

- 期間: **9/14(月) 4:00 〜 9/28(月) 3:59**（第1週 9/14〜、第2週 9/21〜）
- 交換所期限: **10/1(木) 3:59**（= 持ち越し水曜 9/30 まで交換可能。既存の17日構造と整合）
- イベント資材: **ミュウツーのいでんし**（睡眠リサーチ1日1回目・ミッション・イベントランク報酬等で獲得）
- 新アイテム:
  - **ミュウツーのおこう** — 必ずミュウツーと出会える。期間後も使用可能（ゲーム内所持上限は1個）
  - **ミュウツーサブレ** — 期間中のみ使用可。1個でフレンドポイント+6。10/4(日) 4:00 にスーパーサブレへ自動変換
  - とてもおおきなマゴのみ — フィールド拾得物であり在庫管理対象外（**非スコープ**）
- 第1週ボーナス: ミュウツー/ミュウ編成でねむけパワー1.1倍、エスパータイプ食材+1・メインスキル確率1.5倍、とてもおおきなマゴのみ最大所持数+8、ピックアップポケモン出現確率UP、ミュウツー満腹低下1日1回
- 第2週ボーナス: ミュウツー編成ねむけパワー1.3倍、エスパータイプ メインスキルレベル+5、とてもおおきなマゴのみ最大所持数+15、一定エナジーからカビゴン育成開始
- SNS非利用者向け配布: いでんし×35を各週（計70）

## 未確定事項と仮置き方針（ユーザー承認済み: 過去と同等で仮置き）

| 項目 | 仮置き内容 | 確定後の対応 |
|---|---|---|
| 交換所ラインナップ・単価・在庫 | **ラティオスイベントと同一構造**（下記コード参照） | 開催日に wiki を再確認し数値を差し替え（`8adc193` の前例） |
| サブレ無料配布数 | `sableFreeCount: 1`（過去2回と同じ） | 同上 |
| ニュームーンデー | **イベント期間内に無し**と仮定（9月新月は9/11頃で期間外）→ `specialDayIndices: new Set()` | グッドスリープデー（満月 9/26頃）等が発表されたらバー追加 |
| ねむけパワー1.5倍デー | W2バーの effects に「ねむけパワー1.5倍(9/27・推定)」として記載 | 日付確定後修正 |
| 画像 | **？マークのプレースホルダPNGを正式パスに配置**（後述） | 正式画像入手後、**同名ファイルを上書きするだけ**で反映 |

---

## データ設計

### 1. `lib/data/items.ts` — 追加アイテム（末尾に追記）

```typescript
  // ─── ミュウツーイベント用アイテム ────────────────────────────
  {
    id: "mewtwo",
    name: "ミュウツーのおこう",
    maxStock: 14,   // 在庫入力上限（ゲーム内所持上限1だが期間中の累計取得数を管理するため）
    icon: "🟣",
    imageUrl: "/img/okou_mewtwo.png",  // TODO: 正式画像入手後に同名で上書き
    effectType: "pokemon",
    effectShort: "ミュウツー出現",
    effectDetail: "ミュウツーが追加枠として出現する。こううんのおこうと組み合わせて大量のゆめのかけらを狙える。イベント期間後も使用可能。",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  {
    id: "mewtwo-sable",
    name: "ミュウツーサブレ",
    maxStock: 14,
    icon: "🍪",
    imageUrl: "/img/mewtwo_sable.png",  // TODO: 正式画像入手後に同名で上書き
    effectType: "treat",
    effectShort: "ミュウツーに使うおやつ（複数可）",
    effectDetail: "ミュウツーのおこうと同時に設置して使用。1個でフレンドポイント+6。マスターサブレと排他的に使用。10/4にスーパーサブレへ自動変換。",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    pairedWith: "mewtwo",
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
```

### 2. `lib/data/events.ts` — 通貨表記フィールドの追加（型変更）

`PokeSleepEvent` に省略可能フィールドを2つ追加。既存2イベントは**変更不要**（デフォルトにフォールバック）。

```typescript
  /** イベント資材の名称（省略時 "うもう"） */
  currencyName?: string
  /** イベント資材の表示アイコン（省略時 "🪶"） */
  currencyIcon?: string
```

### 3. `components/event-calendar.tsx` — 「うもう」4箇所を汎用化

コンポーネント冒頭で解決してから使用:

```typescript
const currencyName = currentEvent.currencyName ?? "うもう"
const currencyIcon = currentEvent.currencyIcon ?? "🪶"
```

- 見出し: `{currencyIcon} {currencyName}交換所`
- 合計・単価表示の `🪶` → `{currencyIcon}`
- リセット確認文言: `` `${currencyName}交換所をリセットしますか？\n…` ``

※ コメント行（L704等）の「うもう交換所」表記は汎用名に直してもよいが必須ではない。

### 4. `lib/data/events.ts` — EVENTS へ追記（末尾に追加）

```typescript
  // ── 秘境リサーチ！ミュウツーをおいかけて 2026/9/14〜9/27 ──
  {
    id: "mewtwo-2026-09",
    name: "秘境リサーチ！ミュウツーをおいかけて",
    shortName: "ミュウツー",
    startDate: new Date(2026, 8, 14, 4, 0, 0),   // 9月14日 04:00
    endDate:   new Date(2026, 8, 28, 3, 59, 0),  // 9月28日 03:59（9/27が最終日）
    currencyName: "いでんし",
    currencyIcon: "🧬",
    calendarEvents: [
      {
        id: "mewtwo-w1",
        name: "秘境リサーチ（第1週）",
        colStart: 1, colSpan: 7, week: 0,
        barColor: "bg-purple-700/70 hover:bg-purple-700/80",
        textColor: "text-purple-100",
        effects: [
          { label: "ピックアップポケモン出現確率UP" },
          { label: "エスパータイプ強化", note: "食材+1, メインスキル確率1.5倍" },
          { label: "とてもおおきなマゴのみ 最大所持数+8" },
          { label: "ミュウツー/ミュウ編成でねむけパワーUP", note: "各1.1倍" },
          { label: "ミュウツーの満腹度低下 1日1回" },
        ],
      },
      {
        id: "mewtwo-w2",
        name: "秘境リサーチ（第2週）",
        colStart: 1, colSpan: 7, week: 1,
        barColor: "bg-purple-700/70 hover:bg-purple-700/80",
        textColor: "text-fuchsia-100",
        effects: [
          { label: "ピックアップポケモン出現確率UP" },
          { label: "エスパータイプ強化", note: "食材+1, メインスキル確率1.5倍, メインスキルレベル+5" },
          { label: "とてもおおきなマゴのみ 最大所持数+15" },
          { label: "ミュウツー編成でねむけパワー1.3倍" },
          { label: "一定エナジーからカビゴン育成開始" },
          { label: "ねむけパワー1.5倍(9/27・推定)" },
        ],
      },
    ],
    umouPrices: {
      // ⚠️ ラティオスイベントと同等の推定値（開催後に確定値へ更新すること）
      okouW1:  [[2, 80], [7, 160]],
      okouW2:  [[2, 70]],
      sableW1: [[2, 60], [10, 120]],
      sableW2: [[2, 50]],
      sableFreeCount: 1,
      mainIncenseId: "mewtwo",
      mainSableId: "mewtwo-sable",
    },
    specialDays: {
      specialDayIndices: new Set(),  // 期間内にニュームーンデー無し（9月新月は9/11頃）
    },
    itemIds: [
      "kaifuku", "shuuchuu", "kouun", "seichou", "nakayoshi", "pokemon",
      "mewtwo", "master-sable", "mewtwo-sable",
    ],
    mainIncenseId: "mewtwo",
    carryInItems: [
      { itemId: "mewtwo-sable", max: 1, label: "配布" },  // 運営配布1個（推定）
    ],
    umouShop: {
      // ⚠️ 未発表のためラティオスイベントの構造・価格で仮置き（開催後に確定値へ更新）
      weeks: [
        {
          label: "第1週",
          entries: [
            { label: "ミュウツーのおこう×1", itemId: "mewtwo",       itemQty: 1, maxCount: 2,  umouCost: 80,  displayOrder: 10, discounted: true },
            { label: "ミュウツーのおこう×1", itemId: "mewtwo",       itemQty: 1, maxCount: 7,  umouCost: 160, displayOrder:  9 },
            { label: "ミュウツーサブレ×1",   itemId: "mewtwo-sable", itemQty: 1, maxCount: 2,  umouCost: 60,  displayOrder: 30, discounted: true },
            { label: "ミュウツーサブレ×1",   itemId: "mewtwo-sable", itemQty: 1, maxCount: 10, umouCost: 120, displayOrder: 29 },
          ],
        },
        {
          label: "第2週（追加）",
          entries: [
            { label: "ミュウツーのおこう×1", itemId: "mewtwo",       itemQty: 1, maxCount: 2, umouCost: 70, displayOrder: 12, discounted: true },
            { label: "ミュウツーサブレ×1",   itemId: "mewtwo-sable", itemQty: 1, maxCount: 2, umouCost: 50, displayOrder: 32, discounted: true },
          ],
        },
      ],
    },
  },
```

設計メモ:

- `sableIncenseIds` は**定義しない**。ラティオス時は「ラティアスのおこう配置日もサブレ可」だったが、
  今回サブレ対象はミュウツーのみ。ラティアス（初回）イベントも未定義で正常動作している前例あり。
- `carryoverSlot`（水曜 9/30）は `mainIncenseId: "mewtwo"` を受け付ける。
  「おこうは期間後も使用可能」なので持ち越しスロットの意味も成立する。
  `carryoverSlot2` は sableIncenseIds 無しのため実質未使用（ラティアスイベントと同挙動）。
- ヘッダー期間表示は `endDate.getDate() - 1` で「9/14(月) 〜 9/27(日)」となる（ラティオスと同じ規約）。

### 5. プレースホルダ画像（ユーザー指示: ？マークで代用、後日中身だけ差し替え）

正式パスで配置する。**後日、同名ファイルを上書きするだけで差し替え完了**になるようにする。

| パス | 内容 |
|---|---|
| `public/img/okou_mewtwo.png` | 「？」マークのプレースホルダPNG（例: 128×128、グレー地に？） |
| `public/img/mewtwo_sable.png` | 同上 |

作成手段は問わない（ImageMagick `magick -size 128x128 -gravity center -pointsize 72 label:? okou_mewtwo.png` 等。
ImageMagick が無ければ既存の `okou_normal.png` / `poke_sable.png` のコピーでも可。
**ファイル名は必ず上記の正式名にする**こと）。

---

## 実装フェーズ（seijitsu-template の作法に従う）

テンプレの鉄則を本リポジトリの実態にマップして適用する:
**テスト先行（赤→緑をgitで追える）・1フェーズ1コミット・完了判定は機械（コマンド実出力）・スコープを増やさない。**

検証コマンド（このリポジトリでの verify 相当）:

```bash
npx tsc --noEmit          # 型検査
npm run build             # ビルド
npx playwright test       # E2E（既存: tests/lock.spec.ts）
```

### Phase 0: 赤テスト作成（テストとスケルトンのみコミット）

`tests/mewtwo-event.spec.ts` を新規作成。既存 `tests/lock.spec.ts` の書式に倣う。

検証観点:
- [ ] 初期表示がミュウツーイベント（`EVENTS` 末尾がデフォルト）でヘッダーに「秘境リサーチ！ミュウツーをおいかけて」
- [ ] 期間表示が「9/14(月) 〜 9/27(日)」
- [ ] 交換所見出しが「🧬 いでんし交換所」、単価表示に 🧬（うもう/🪶 が出ない）
- [ ] 交換所にミュウツーのおこう・ミュウツーサブレの行が表示される
- [ ] バッグにミュウツーのおこう・ミュウツーサブレ・マスターサブレ・汎用おこう6種が並ぶ
- [ ] ← ナビでラティオスイベントに切り替わり、そちらは「🪶 うもう交換所」のまま（後方互換）
- [ ] この時点でテストが**失敗する**ことを確認してコミット（実装差分を混ぜない）

### Phase 1: アイテム追加 + プレースホルダ画像

- [ ] `items.ts` に上記2アイテム追記
- [ ] `public/img/okou_mewtwo.png` / `mewtwo_sable.png` 配置
- [ ] `npx tsc --noEmit` パス

### Phase 2: 通貨表記の汎用化

- [ ] `PokeSleepEvent` に `currencyName` / `currencyIcon` 追加
- [ ] `event-calendar.tsx` の4箇所を置換
- [ ] 既存イベント（ラティアス/ラティオス）の表示が「🪶 うもう交換所」のまま変わらないこと（目視 or テスト）
- [ ] `npx tsc --noEmit` パス

### Phase 3: イベント定義追加

- [ ] `events.ts` の `EVENTS` 末尾に上記オブジェクト追記
- [ ] Phase 0 のテストが**緑になる**
- [ ] `npx playwright test` 全パス（既存 lock.spec.ts の回帰含む）

### Phase 4: 総合検証・コミット

- [ ] `npm run build` 成功
- [ ] `npm run dev` で目視確認: イベント切替3件、在庫入力→バッグ→スロット配置、交換所+−で在庫加算、
      持込（配布サブレ）、ロック、スマホ幅（375px）表示
- [ ] localStorage が `mewtwo-2026-09-*` キーで独立保存されること
- [ ] コミット & push（メッセージ例: `feat: ミュウツーイベント（秘境リサーチ）を追加`）

---

## 開催後の更新タスク（9/14 以降）

1. wiki で交換所の**確定ラインナップ・単価・在庫数**を確認し、`umouShop` / `umouPrices` を更新
   （前例: `8adc193`）。`discounted` / `displayOrder` も実態に合わせる
2. サブレ配布数・持込（`carryInItems`）を実態に合わせる
3. グッドスリープデー等の特殊日が判明したらバー追加（`calendarEvents` / `specialDays`）
4. 「ねむけパワー1.5倍」の日付確定を反映
5. 正式画像を `okou_mewtwo.png` / `mewtwo_sable.png` に上書き

---

## 非スコープ

- とてもおおきなマゴのみ（拾得物。在庫管理対象外）
- ミュウ関連の別イベント（本ツールの対象外）
- 未使用コンポーネント（`event-exchange.tsx` / `item-inventory.tsx`）の削除・整理
- 提案ロジック（`generatePlan`）の復活・ミュウツー対応

---

## 関連ドキュメント

- [マルチイベント対応 実装計画](./implementation-plan-multi-event.md)（基盤設計）
- [開発仕様書](./development-spec.md)
- 出典: [wikiwiki イベントページ](https://wikiwiki.jp/poke_sleep/イベント/秘境リサーチ！ミュウツーをおいかけて) / [公式予告](https://www.pokemonsleep.net/news/343234373533313039383737363533353039/) / [4Gamer 記事](https://www.4gamer.net/games/462/G046207/20260804010/)
