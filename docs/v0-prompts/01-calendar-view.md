# v0.dev プロンプト：カレンダービュー

## 貼り付けるプロンプト

---

Create a Pokemon Sleep event calendar view component using React and Tailwind CSS.

## Overview
A 14-day event planner for the Pokemon Sleep mobile game. The event runs from Monday April 6, 2026 to Sunday April 19, 2026.

## Layout
- Page title at the top: "🌙 ラティアスリサーチ" with event period "4/6(月) 〜 4/19(日) 残り14日"
- Display a 2-row × 7-column grid (Week 1: Apr 6–12, Week 2: Apr 13–19)
- Each row represents one week, labeled "第1週" and "第2週"

## Day Cell Design
Each day cell must contain:
1. **Header**: Day number (e.g. "6") + day of week label (月/火/水/木/金/土/日)
2. **Recommended items area**: 1–2 small pill badges showing item names and quantity (e.g. "🍃 ハーブ ×2", "⚡ でんき ×1")
3. **Note field**: A short placeholder text line for user memo (e.g. "メモを追加...")
4. **Completion checkbox**: Small checkbox in the bottom-right corner. Checked days show a subtle green overlay.

## Color Coding
- Weekdays (月〜金): white background with soft blue border
- Saturday (土): soft blue background (#EFF6FF)
- Sunday (日): soft pink/red background (#FFF1F2)
- Today (April 6): highlighted with a deeper blue border and "今日" badge
- Completed days: light green overlay with a checkmark

## Sample Data to Display
Use this mock data to populate the calendar:

**Week 1 (Apr 6–12)**
- Apr 6 (Mon): items=["ゆめのかけら×3"], note="初日！アメ温存"
- Apr 7 (Tue): items=["タイプレス飴×1"], note=""
- Apr 8 (Wed): items=[], note="平日は節約"
- Apr 9 (Thu): items=["ゆめのかけら×3"], note=""
- Apr 10 (Fri): items=["げんきチャージ×2"], note="週末前に準備"
- Apr 11 (Sat): items=["タイプレス飴×2", "ゆめのかけら×5"], note="土曜ボーナス狙い", completed=true
- Apr 12 (Sun): items=["タイプレス飴×2", "ゆめのかけら×5"], note="日曜ボーナス狙い"

**Week 2 (Apr 13–19)**
- Apr 13 (Mon): items=["げんきチャージ×1"], note=""
- Apr 14 (Tue): items=[], note=""
- Apr 15 (Wed): items=["ゆめのかけら×3"], note=""
- Apr 16 (Thu): items=[], note=""
- Apr 17 (Fri): items=["タイプレス飴×1"], note="ラストスパート準備"
- Apr 18 (Sat): items=["タイプレス飴×3", "ゆめのかけら×5"], note="最終週末！全力"
- Apr 19 (Sun): items=["タイプレス飴×3", "ゆめのかけら×5"], note="最終日！使い切る"

## Event Effects Banner
Below the title, show a horizontal scrollable row of effect badges:
- "✨ 睡眠EXP 2倍"
- "🍖 食材ボーナス +50%"
- "💎 ゆめのかけら 1.5倍"
- "🐴 馬効果: タイプレス飴 2倍（土日限定）"

Each badge should be a rounded pill with icon, colored by type (purple for multiplier, green for item bonus, yellow for shard, orange for special).

## Bottom Action Bar
Fixed at the bottom:
- Left: "← 前のイベント" button (ghost)
- Center: "📅 今日へジャンプ" button (primary, blue)
- Right: "次のイベント →" button (ghost)

## Style
- Overall theme: dark navy background (#0F172A) with card-style white day cells
- Rounded corners on all cards
- Subtle star/moon decorations in the header area
- Japanese text throughout
- Font: system font, clean and readable on mobile
- Responsive: on mobile, show one week per row stacked vertically

---

## 補足メモ（v0.dev に渡さない。実装時の参考用）

- セルクリックで編集モーダルを開く予定
- アイテムバッジは在庫データから自動生成（Phase 2 以降に連動）
- 完了チェックは IndexedDB の DayPlan.isCompleted に保存
