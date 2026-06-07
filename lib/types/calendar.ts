// ─── カレンダー共通型定義 ──────────────────────────────────

export interface DayInfo {
  /** 日付（月の日数） */
  date: number
  dayOfWeek: "月" | "火" | "水" | "木" | "金" | "土" | "日"
  /** 0〜17（イベント開始日からの通し番号） */
  dayIndex: number
  isToday: boolean
  isWeekend: boolean
  isFriday: boolean
  /** 月〜水 */
  isEarlyWeek: boolean
  /** 8日目以降（第2週） */
  isLate: boolean
  /** イベント終了後（14〜16日目: 月〜水、おこう設置可） */
  isPostEvent: boolean
  /** 持ち越しのみ表示する日（17日目: 木） */
  isCarryoverDay: boolean
}
