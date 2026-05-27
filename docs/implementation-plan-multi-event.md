# 実装計画：イベント多重対応 + UIリデザイン

> 作成日: 2026-05-27

---

## 背景・目的

現在のツールは「ラティアスリサーチ（4/6〜4/19）」1イベントのみをハードコードで対応している。  
次のイベント以降も継続利用できるよう、以下の2点を実装する。

1. **イベント多重対応** — 画面上部の左右ナビで複数イベントを切り替え
2. **UIリデザイン** — 現在のカレンダー形式（7列グリッド）を維持しつつ、崩れにくく見やすく改善する

### 決定事項

| 項目 | 決定内容 |
|------|---------|
| イベント管理方式 | コード内固定定義（次イベント追加時はコードに追記） |
| 在庫スコープ | イベントごとに独立（localStorageキーをイベントIDで分離） |
| カレンダーレイアウト | **7列グリッド形式を維持**（縦リスト案は取りやめ） |
| 表示切り替え | UIにボタンを設けてグリッド↔リストを切り替え可能にする方向で検討 |
| うもう計算 | 維持（イベント定義に単価テーブルを持たせる） |

### ブランチ状況

| ブランチ | 内容 | 状態 |
|----------|------|------|
| `main` | 現在の安定版 | — |
| `feature/list-ui-redesign` | 縦リスト形式の実験実装 | **保留**（採用取りやめ） |

---

## 現状の課題

| 課題 | 箇所 |
|------|------|
| `EVENT_DAYS` が4月6〜19日固定 | `event-calendar.tsx` L57〜72 |
| `CALENDAR_EVENTS`（バー）がラティアスリサーチ固定 | L90〜129 |
| `NEWMOON_DAYS`（dayIndex 10,11,12）が固定 | L215 |
| 提案ロジックの月曜キャンプ日（`[0, 7]`）が固定 | L248 |
| ヘッダーのタイトル・期間がハードコード | L712〜719 |
| localStorage key が `"latias-*"` 固定 | L329〜331 |
| うもう計算の在庫・単価が固定 | L152〜210 |
| `event-calendar.tsx` が約1370行の巨大単一ファイル | — |
| イベントバーを `position: absolute` で重ねており崩れやすい | L1336〜1369 |
| モバイルではピンチズームで対応（根本解決ではない） | L384〜405 |

---

## Phase 0: 事前確認済み情報

### 利用可能な shadcn/ui コンポーネント

| コンポーネント | パス | 主なProps |
|---|---|---|
| `Card`, `CardHeader`, `CardContent` | `components/ui/card.tsx` | `React.ComponentProps<'div'>` |
| `Badge` | `components/ui/badge.tsx` | `variant: default \| secondary \| destructive \| outline` |
| `Separator` | `components/ui/separator.tsx` | `orientation: horizontal \| vertical` |
| `ScrollArea` | `components/ui/scroll-area.tsx` | Radix UI ScrollArea props |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `components/ui/tabs.tsx` | Radix UI Tabs props |

### Tailwind CSS v4 カスタム変数（Pokemon Sleep テーマ）

```css
--saturday-bg:   oklch(0.95 0.03 250)   /* 土曜背景 */
--sunday-bg:     oklch(0.95 0.05 15)    /* 日曜背景 */
--completed-bg:  oklch(0.92 0.08 145)   /* 完了日背景 */
--today-border:  oklch(0.55 0.2 250)    /* 今日のボーダー */
--card:          oklch(0.98 0 0)        /* カード背景 */
```

### localStorage キー（移行前後）

```
旧: "latias-inventory", "latias-slots", "latias-memo"
新: "{eventId}-inventory", "{eventId}-slots", "{eventId}-memo"
   例: "latias-2026-04-inventory"
```

### 維持すべき関数シグネチャ（変更前）

```typescript
function calcUmou(nOkouW1: number, nOkouW2: number, nSableW1: number, nSableW2: number): number
function generatePlan(inventory: Record<string, number>): Record<number, DaySlots>
```

---

## Phase 1: イベント定義データ層の構築

### 作成ファイル: `lib/data/events.ts`

**定義すべき型：**

```typescript
// うもう単価テーブル（週ごとの仕入れ構造）
interface UmouPriceTable {
  okouW1:    [number, number][]   // [在庫数, 単価][]
  okouW2New: [number, number][]
  sableW1:   [number, number][]
  sableW2New:[number, number][]
}

// イベント内の特殊日定義（提案ロジックへ渡す）
interface SpecialDayConfig {
  priorityDayIndices: number[]  // 最優先配置dayIndex群（例: ニュームーンデー）
  campMondays: number[]         // キャンプチケット配置日のdayIndex（例: [0, 7]）
}

// カレンダーイベントバー
interface EventBarDef {
  id: string
  name: string
  colStart: number   // 1始まり（週の何列目から開始）
  colSpan: number
  week: number       // 0 = 第1週, 1 = 第2週
  barColor: string
  textColor: string
  effects: { label: string; note?: string }[]
}

// イベント全体定義
interface PokeSleepEvent {
  id: string
  title: string           // 画面タイトル
  year: number
  month: number           // 開始月（1-indexed）
  startDate: number       // 開始日
  totalDays: number       // イベント日数（通常14）
  bars: EventBarDef[]
  specialDays: SpecialDayConfig
  umouPrices: UmouPriceTable
  hasCarryover: boolean   // 最終日に持ち越しスロットを表示するか
}
```

**`buildEventDays(event: PokeSleepEvent): DayInfo[]` の実装：**

- `new Date(event.year, event.month - 1, event.startDate)` で開始日取得
- `dayIndex 0..totalDays-1` を順にループして日付・曜日を計算
- ⚠️ タイムゾーンずれ防止のため UTC 固定で計算すること

**`EVENTS` 配列の定義（現在のラティアスリサーチを移植）：**

```typescript
export const EVENTS: PokeSleepEvent[] = [
  {
    id: "latias-2026-04",
    title: "ラティアスリサーチ スケジューラー",
    year: 2026, month: 4, startDate: 6, totalDays: 14,
    bars: [
      // 現在の CALENDAR_EVENTS をそのまま移植
    ],
    specialDays: {
      priorityDayIndices: [10, 11, 12],  // ニュームーンデー (4/16〜4/18)
      campMondays: [0, 7],
    },
    umouPrices: {
      okouW1:    [[2, 80], [7, 160]],
      okouW2New: [[2, 70]],
      sableW1:   [[2, 60], [10, 120]],
      sableW2New:[[2, 50]],
    },
    hasCarryover: true,
  },
  // 次のイベントはここに追加
]
```

### 確認チェックリスト
- [ ] `buildEventDays(EVENTS[0])` の出力が旧 `EVENT_DAYS` と一致（date, dayOfWeek, isWeekend 等）
- [ ] `npx tsc --noEmit` エラーなし

### アンチパターン
- `Set<number>` を型フィールドに使わない → JSON 非対応。`number[]` で定義して利用側で `new Set()` にする
- `new Date()` にロケール依存の計算をしない → UTCベースで統一

---

## Phase 2: generatePlan と calcUmou のパラメータ化

### 作成・更新ファイル
- `lib/umou-calc.ts`（`calcUmou` を切り出し）
- `lib/calendar-utils.ts`（`generatePlan`, `buildEventDays`, `barsForDay` 等）

**`calcUmou` の新シグネチャ：**

```typescript
export function calcUmou(
  nOkouW1: number, nOkouW2: number,
  nSableW1: number, nSableW2: number,
  prices: UmouPriceTable
): number
```

内部の `okouW1Stock`, `sableW1Stock` 等をすべて `prices` から参照するよう変更。

**`generatePlan` の新シグネチャ：**

```typescript
export function generatePlan(
  inventory: Record<string, number>,
  eventDays: DayInfo[],
  specialDays: SpecialDayConfig
): Record<number, DaySlots>
```

内部の `NEWMOON_DAYS`, `campDays`, `EVENT_DAYS`, `DAYS_WEEKEND_FIRST` をすべてパラメータから生成するよう変更。

### 確認チェックリスト
- [ ] 同じ inventory 入力に対して変更前後で `generatePlan` の出力が一致する
- [ ] `calcUmou` の出力が変更前と一致する
- [ ] `npx tsc --noEmit` エラーなし

---

## Phase 3: EventCalendar コンポーネントのイベント切り替え対応

### 更新ファイル: `components/event-calendar.tsx`（または分割後の `index.tsx`）

**追加する state：**

```typescript
const [eventIndex, setEventIndex] = useState(0)
const currentEvent = EVENTS[eventIndex]
const eventDays = buildEventDays(currentEvent)
```

**localStorage key の動的化：**

```typescript
const LS_INVENTORY = `${currentEvent.id}-inventory`
const LS_SLOTS     = `${currentEvent.id}-slots`
const LS_MEMO      = `${currentEvent.id}-memo`
```

`useEffect` の依存配列に `currentEvent.id` を追加し、イベント切り替え時にデータを読み直す。

**ヘッダーへのナビゲーション追加：**

```tsx
<header className="flex items-center justify-between px-4 pt-4">
  <button
    onClick={() => setEventIndex(i => Math.max(0, i - 1))}
    disabled={eventIndex === 0}
  >
    ← 前
  </button>
  <div className="text-center">
    <h1>{currentEvent.title}</h1>
    <p>{formatEventPeriod(currentEvent)} {残りN日バッジ}</p>
  </div>
  <button
    onClick={() => setEventIndex(i => Math.min(EVENTS.length - 1, i + 1))}
    disabled={eventIndex === EVENTS.length - 1}
  >
    次 →
  </button>
</header>
```

**`todayDayIndex` の計算を `currentEvent` ベースに変更：**

```typescript
const todayDayIndex = (() => {
  const now = new Date()
  if (now.getMonth() + 1 !== currentEvent.month) return -1
  const found = eventDays.find(d => d.date === now.getDate())
  return found ? found.dayIndex : -1
})()
```

**既存ユーザーデータの移行処理（初回マウント時に一度だけ）：**

```typescript
function migrateOldData(newEventId: string) {
  if (localStorage.getItem(`${newEventId}-inventory`)) return  // 移行済み
  const oldInv = localStorage.getItem("latias-inventory")
  if (oldInv) {
    localStorage.setItem(`${newEventId}-inventory`, oldInv)
    localStorage.removeItem("latias-inventory")
  }
  // "latias-slots", "latias-memo" も同様
}
```

### 確認チェックリスト
- [ ] イベント切り替え後、在庫・スロット・メモが独立して保持される
- [ ] ブラウザリロード後もデータが復元される
- [ ] 旧データが `latias-2026-04` に自動移行される
- [ ] `npx tsc --noEmit` エラーなし

---

## Phase 4: カレンダーUIの改善

> ⚠️ 縦1列リスト形式への変更は**取りやめ**。7列グリッド形式を維持する。

### 方針

- `feature/list-ui-redesign` ブランチの縦リスト実装は保留（参考用に残置）
- グリッド形式のまま以下の問題を改善する

### 改善内容

**1. イベントバーの安定化**

現在の `position: absolute` オーバーレイ（`EventBarsOverlay`）は高さのずれで崩れやすい。  
→ グリッド内に固定高さの予約エリアを設けて安定させる、もしくは別の手法を検討。

**2. モバイル対応**

現在はピンチズームで対応しているが根本解決ではない。  
→ 表示切り替えボタン（グリッド↔リスト）を設置し、ユーザーが選べるようにする。

```tsx
// 将来的な実装イメージ
const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
// localStorage に保存して次回も維持
```

**3. ピンチズームコードの削除**

`calScale` / `pinchRef` / `handleTouchStart/Move/End` は削除対象。

### 確認チェックリスト
- [ ] PC（1024px以上）でグリッド表示が崩れない
- [ ] モバイル（375px）で横スクロールが許容範囲内
- [ ] イベントバーが正しい位置に表示される
- [ ] ピンチズームコードが削除されている

---

## Phase 5: うもう累計表示のリデザイン対応

### 更新内容

- `umouCumulative` の計算を `calcUmou(..., currentEvent.umouPrices)` に変更
- 表示位置: `DayCell` の右端（現状維持、または微調整）

### 確認チェックリスト
- [ ] ラティアスのおこうを配置すると累計うもうが更新される
- [ ] W2の安い在庫が優先される計算が正しい
- [ ] `npx tsc --noEmit` エラーなし

---

## Phase 6: ファイル分割とコードクリーンアップ

### 目標ファイル構成

```
components/
  event-calendar/
    index.tsx           ← メインコンポーネント（state管理のみ）
    EventHeader.tsx     ← ヘッダー + イベントナビゲーション
    InventoryBar.tsx    ← 在庫入力エリア（在庫カード横スクロール）
    DayCell.tsx         ← グリッド1セル（現行 DayCell をそのまま分離）
    ItemSlot.tsx        ← アイテムスロット（そのまま移植）
    TooltipPortal.tsx   ← イベント効果ツールチップ（portal）
lib/
  data/
    events.ts           ← PokeSleepEvent型定義 + EVENTS[]
    items.ts            ← そのまま（変更なし）
  calendar-utils.ts     ← buildEventDays, generatePlan
  umou-calc.ts          ← calcUmou（UmouPriceTable対応版）
```

### 確認チェックリスト
- [ ] `npx tsc --noEmit` エラーなし
- [ ] `npm run dev` で起動確認
- [ ] 全機能動作確認（在庫入力→提案→スロット配置→D&D→タップ→分割睡眠→うもう計算）

---

## Phase 7: ブランチ作成・ビルド確認・マージ

```bash
git checkout -b feature/multi-event-support
# Phase 1〜6 を実装
npm run build
```

### 確認チェックリスト
- [ ] `npm run build` 成功
- [ ] PC・モバイル両方で全機能動作
- [ ] イベント切り替えで在庫・スロット・メモが独立して保存・復元される
- [ ] 旧データ（`latias-*`）が `latias-2026-04-*` に自動移行される
- [ ] Vercel プレビューデプロイで実機確認

---

## 次のイベントを追加する手順

新しいイベントが来たら `lib/data/events.ts` の `EVENTS` 配列に追記するだけでよい。

```typescript
EVENTS.push({
  id: "next-event-2026-05",
  title: "○○リサーチ スケジューラー",
  year: 2026, month: 5, startDate: 12, totalDays: 14,
  bars: [
    {
      id: "main-w1",
      name: "○○リサーチ（第1週）",
      colStart: 1, colSpan: 7, week: 0,
      barColor: "bg-green-700/70",
      textColor: "text-green-100",
      effects: [{ label: "..." }],
    },
  ],
  specialDays: {
    priorityDayIndices: [],  // 特殊日なければ空
    campMondays: [0, 7],
  },
  umouPrices: {
    okouW1:    [[2, 80], [7, 160]],
    okouW2New: [[2, 70]],
    sableW1:   [[2, 60], [10, 120]],
    sableW2New:[[2, 50]],
  },
  hasCarryover: true,
})
```

---

## 関連ドキュメント

- [開発仕様書](./development-spec.md)
- [アイテム使用提案ロジック](./suggest-logic.md)
- [v0.dev カレンダービュープロンプト](./v0-prompts/01-calendar-view.md)
