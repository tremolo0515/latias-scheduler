# スマホ対応設計書

作成: 2026-05-30  
対象ブランチ: `feature/mobile-responsive`（新規）

---

## 1. 目的・方針

### 基本方針

- **ブレークポイント `< 768px`（md未満）でスマホ表示に切り替える**
- 既存コンポーネント（`DayCell`、各セクション）は **維持**。スマホ時は別レイアウトに切り替える
- デスクトップ表示は一切変更しない
- Tailwind の `md:` プレフィックスで制御（CSS media query ベース、JSによるwidth検知不要）

### 対象外

- タブレット横向き（768px以上として扱う）
- ピンチズーム（スマホ表示では不要になる）

---

## 2. 変更対象コンポーネント別設計

### 2-1. ヘッダー（イベントタイトル・ナビ）

変更なし。現状でも縦幅が小さくスマホでも問題ない。

---

### 2-2. うもう交換所 ＋ その他どうぐ（上段セクション）

#### 現状（デスクトップ）

```
┌─────────────────────────────┬──────────────────────────┐
│ うもう交換所                │ その他どうぐ             │
│ （横に並ぶ flex-row）        │                          │
└─────────────────────────────┴──────────────────────────┘
```

#### スマホ表示

```
┌──────────────────────────────┐
│ うもう交換所                  │
└──────────────────────────────┘
┌──────────────────────────────┐
│ その他どうぐ                  │
└──────────────────────────────┘
```

#### 実装方法

現在の外側コンテナ:

```tsx
<section className="mb-2 flex flex-col gap-1.5">
  <div className="... flex gap-2">   ← ここを変更
    <div className="flex-1 ...">     ← うもう交換所
    <div className="flex-1 ...">     ← その他どうぐ
```

変更後:

```tsx
<div className="flex flex-col md:flex-row gap-2">
```

これだけで完結。各 `<div className="flex-1">` は幅制約が外れ縦並びになる。

---

### 2-3. バッグエリア

変更なし。現状の `flex-wrap` で自然に折り返すため問題なし。

---

### 2-4. カレンダー

#### 現状（デスクトップ）

- `grid grid-cols-7`（各列 9rem 固定）
- `overflow-x-auto` ＋ ピンチズームで対応

#### スマホ表示：縦リストに切り替え

`feature/list-ui-redesign` ブランチの `DayRow` コンポーネントをそのまま流用する。

```
┌──────────────────────────────┐
│ 8(月) ラティオスとこころのしずく(第1週) │
│  [スロット1][スロット2] [サブレ]       │
├──────────────────────────────┤
│ 9(火)                        │
│  [スロット1][スロット2]              │
...
```

#### 実装方法（条件分岐レンダリング）

```tsx
{/* デスクトップ: 7列グリッド */}
<div className="hidden md:block">
  <div className="grid grid-cols-7 ...">
    {/* 既存 DayCell */}
  </div>
</div>

{/* スマホ: 縦リスト */}
<div className="block md:hidden">
  {weeks.map(...)}
    {days.map(day => <DayRow ... />)}
</div>
```

`DayRow` は `feature/list-ui-redesign` からそのままポートする（mainブランチに存在しないため移植が必要）。

#### DayRow の移植スコープ

feature/list-ui-redesign から取得するもの:
- `DayRow` コンポーネント本体
- `ItemSlot` コンポーネント（DayRow内で使用）
- `barsForDay()` ヘルパー関数（ただし現mainの `CALENDAR_EVENTS` 構造に合わせて調整）
- `colInWeek()` ヘルパー関数

取得しないもの（mainで既に別実装あり）:
- `DayCellProps` / `DayCell`（デスクトップ用として残す）
- `onWhistleCountChange` / `whistleMax`（whistle削除済み）

#### DayRowProps の差異吸収

feature/list-ui-redesign は旧仕様のため以下の差異がある:

| 旧（list-ui-redesign） | 新（main対応後）|
|---|---|
| `onWhistleCountChange`, `whistleMax` | 削除（whistle廃止済み）|
| `sableMax` / `sableMax2` | `mainSableId` を `currentEvent.umouPrices.mainSableId` から参照 |
| `CALENDAR_EVENTS` 参照 | `currentEvent.calendarEvents` を参照するよう修正 |
| `latias` / `latias-sable` ハードコード | `sableIncenseSet` 参照に変更 |
| `carryoverSlot2` なし | 追加（mainのDaySlots仕様に合わせる） |

---

## 3. ブレークポイント選択の根拠

| px | 代表端末 | 採用 |
|---|---|---|
| 640px（sm） | iPhone SE（375px）〜 小型タブレット | 小さすぎ、一部タブレットが巻き込まれる |
| **768px（md）** | **iPad縦（768px）が境界線** | **◎ 採用** |
| 1024px（lg） | iPad横含む | 広すぎ |

`md`（768px）未満をスマホ向けとすることで、iPad縦はデスクトップ表示になるが許容範囲。

---

## 4. 実装ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `components/event-calendar.tsx` | ① 上段セクション `flex-col md:flex-row` 化<br>② カレンダー条件分岐（`hidden md:block` / `block md:hidden`）<br>③ `DayRow` / `ItemSlot` / ヘルパー関数を追加 |
| `docs/mobile-responsive-design.md` | 本ドキュメント |

その他ファイルの変更なし。

---

## 5. 実装フェーズ

### Phase 1: 上段セクションの縦並び化（小規模・リスク低）

`flex flex-col md:flex-row` に変更するだけ。30分以内。

### Phase 2: DayRow の移植・調整

`feature/list-ui-redesign` から `DayRow` / `ItemSlot` をコピーし、mainの仕様差異（上表）を修正。  
`carryoverSlot2`、`sableIncenseSet` 参照、`calendarEvents` 動的参照が主な作業。

### Phase 3: カレンダー条件分岐の組み込み

`hidden md:block` / `block md:hidden` でデスクトップ/スマホを切り替え。  
ピンチズーム関連コード（`calScale`、`pinchRef`、タッチハンドラ）はスマホ表示時に不要になるが、デスクトップ側で残存するので削除不要。

---

## 6. 未検討事項・リスク

| 項目 | 内容 |
|---|---|
| D&D on スマホ | ブラウザのネイティブ drag API はスマホ非対応。タップ選択（tapSelectedId）は動作するが、D&Dは効かない。許容するかポインターイベント対応するかは別途判断 |
| バッグエリアのタップ選択 | スマホでもタップ選択→スロットタップの流れは動作するはず。要確認 |
| うもう交換所の横幅 | スマホ幅（375px）でグリッド列が詰まる可能性あり。`gridTemplateColumns` の調整が必要かも |
| `calendarEvents` の `barsForDay` | 現mainは `currentEvent.calendarEvents` を使う。`barsForDay` にイベントを渡す引数追加が必要 |
