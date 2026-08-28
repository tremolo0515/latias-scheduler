import { getIncenseById } from "@/lib/data/items"

/** おこう系effectType（スロット受付判定用） */
const INCENSE_EFFECT_TYPES = new Set(["energy", "exp", "shard", "pokemon-exp", "chance", "pokemon"])

export function isIncenseItem(id: string) {
  const item = getIncenseById(id)
  return item ? INCENSE_EFFECT_TYPES.has(item.effectType) : false
}

/**
 * 1日のスロット構成
 * - slot1/slot2:     1回目睡眠のおこう専用（2個）
 * - slot3/slot4:     2回目睡眠のおこう専用（分割睡眠ONの日のみ表示）
 * - splitSleep:      分割睡眠フラグ（日ごと）
 * - sableSlot:       メインおこう配置時のみ出現 / マスターサブレ or サブレ専用
 * - carryoverSlot:   最終日のみ / メインおこう持ち越し専用
 */
export interface DaySlots {
  slot1: string | null
  slot2: string | null
  slot3: string | null           // 2回目睡眠スロット（分割睡眠時）
  slot4: string | null           // 2回目睡眠スロット（分割睡眠時）
  splitSleep: boolean            // 分割睡眠フラグ
  sableSlot: string | null       // 1回目睡眠: マスターサブレ or サブレ（排他）
  sableCount: number             // 1回目睡眠: サブレの使用個数
  sableSlot2: string | null      // 2回目睡眠: マスターサブレ or サブレ（排他）
  sableCount2: number            // 2回目睡眠: サブレの使用個数
  carryoverSlot: string | null   // 最終日のみ / メインおこう持ち越し専用
  carryoverSlot2: string | null  // 最終日のみ / sableIncenseIds のおこう持ち越し専用
}

export const EMPTY_SLOTS = (): DaySlots => ({ slot1: null, slot2: null, slot3: null, slot4: null, splitSleep: false, sableSlot: null, sableCount: 1, sableSlot2: null, sableCount2: 1, carryoverSlot: null, carryoverSlot2: null })

/** localStorageキーをイベントIDから生成 */
export function lsKey(eventId: string, suffix: string) {
  return `${eventId}-${suffix}`
}
