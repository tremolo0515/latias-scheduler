"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { INCENSE_MASTERS, getIncenseById, type IncenseMaster } from "@/lib/data/items"
import { EVENTS, buildEventDays, type PokeSleepEvent, type UmouPriceTable } from "@/lib/data/events"
import type { DayInfo } from "@/lib/types/calendar"

// ─── 型定義 ────────────────────────────────────────────────

/** おこう系effectType（スロット受付判定用） */
const INCENSE_EFFECT_TYPES = new Set(["energy", "exp", "shard", "pokemon-exp", "chance", "pokemon"])

function isIncenseItem(id: string) {
  const item = getIncenseById(id)
  return item ? INCENSE_EFFECT_TYPES.has(item.effectType) : false
}

/**
 * 1日のスロット構成
 * - slot1/slot2:     1回目睡眠のおこう専用（2個）
 * - slot3/slot4:     2回目睡眠のおこう専用（分割睡眠ONの日のみ表示）
 * - splitSleep:      分割睡眠フラグ（日ごと）
 * - mondaySlot:      月曜日のみ / ホイッスル・キャンプチケット専用
 * - sableSlot:       ラティアスのおこう配置時のみ出現 / マスターサブレ専用
 * - carryoverSlot:   最終日（4/19）のみ / ラティアスのおこう持ち越し専用
 */
interface DaySlots {
  slot1: string | null
  slot2: string | null
  slot3: string | null           // 2回目睡眠スロット（分割睡眠時）
  slot4: string | null           // 2回目睡眠スロット（分割睡眠時）
  splitSleep: boolean            // 分割睡眠フラグ
  mondaySlot: string | null      // おてつだいホイッスル専用
  mondayWhistleCount: number     // ホイッスルの使用個数（複数可）
  campSlot: string | null        // いいキャンプチケット専用
  sableSlot: string | null       // 1回目睡眠: マスターサブレ or ラティアスサブレ（排他）
  sableCount: number             // 1回目睡眠: ラティアスサブレの使用個数
  sableSlot2: string | null      // 2回目睡眠: マスターサブレ or ラティアスサブレ（排他）
  sableCount2: number            // 2回目睡眠: ラティアスサブレの使用個数
  carryoverSlot: string | null   // 最終日のみ / ラティアスのおこう持ち越し専用
}

const EMPTY_SLOTS = (): DaySlots => ({ slot1: null, slot2: null, slot3: null, slot4: null, splitSleep: false, mondaySlot: null, mondayWhistleCount: 1, campSlot: null, sableSlot: null, sableCount: 1, sableSlot2: null, sableCount2: 1, carryoverSlot: null })

// ─── うもう必要数計算 ─────────────────────────────────────────
/**
 * おこう n 個 + サブレ m 個を最小うもうで入手するためのコストを返す。
 * イベント定義の UmouPriceTable を使用（汎用版）。
 */
function calcUmou(
  nOkouW1: number, nOkouW2: number,
  nSableW1: number, nSableW2: number,
  prices: UmouPriceTable
): number {
  let cost = 0

  // ── おこう ──
  const okouW1Stock: [number, number][] = prices.okouW1.map(([s, p]) => [s, p])
  let rem = nOkouW1
  for (const lot of okouW1Stock) {
    const buy = Math.min(rem, lot[0])
    cost += buy * lot[1]
    lot[0] -= buy
    rem -= buy
    if (rem <= 0) break
  }
  if (nOkouW2 > 0) {
    const w2Available = ([...prices.okouW2.map(([s, p]) => [s, p] as [number, number])].concat(
      okouW1Stock.filter(([s]) => s > 0)
    )).sort((a, b) => a[1] - b[1])
    rem = nOkouW2
    for (const [stock, price] of w2Available) {
      const buy = Math.min(rem, stock)
      cost += buy * price
      rem -= buy
      if (rem <= 0) break
    }
  }

  // ── サブレ ──
  const free = prices.sableFreeCount
  const sableW1Paid = nSableW1 >= free ? nSableW1 - free : 0
  const sableW2Paid = nSableW1 >= free ? nSableW2 : Math.max(0, nSableW2 - (free - nSableW1))

  const sableW1Stock: [number, number][] = prices.sableW1.map(([s, p]) => [s, p])
  rem = sableW1Paid
  for (const lot of sableW1Stock) {
    const buy = Math.min(rem, lot[0])
    cost += buy * lot[1]
    lot[0] -= buy
    rem -= buy
    if (rem <= 0) break
  }
  if (sableW2Paid > 0) {
    const w2SableAvailable = ([...prices.sableW2.map(([s, p]) => [s, p] as [number, number])].concat(
      sableW1Stock.filter(([s]) => s > 0)
    )).sort((a, b) => a[1] - b[1])
    rem = sableW2Paid
    for (const [stock, price] of w2SableAvailable) {
      const buy = Math.min(rem, stock)
      cost += buy * price
      rem -= buy
      if (rem <= 0) break
    }
  }

  return cost
}

// ─── 提案ロジック（一時的に無効化 — 復活させる際はコメントを外す）─────────────────
// ボタンを復活させる場合:
//   1. 下記コメントを解除
//   2. handleSuggest() のコメントを解除
//   3. ボタンエリアに <Sparkles> ボタンを追加（import { Sparkles } from "lucide-react" も戻す）

/*
function placeIncense(plan: Record<number, DaySlots>, dayIndex: number, id: string): boolean {
  const s = plan[dayIndex]
  if (!s.slot1 && s.slot2 !== id) { s.slot1 = id; return true }
  if (!s.slot2 && s.slot1 !== id) { s.slot2 = id; return true }
  return false
}

function generatePlan(
  inventory: Record<string, number>,
  eventDays: DayInfo[],
  event: PokeSleepEvent
): Record<number, DaySlots> {
  const specialDays = event.specialDays.specialDayIndices
  const mainId = event.mainIncenseId

  const plan: Record<number, DaySlots> = {}
  eventDays.forEach(d => { plan[d.dayIndex] = EMPTY_SLOTS() })

  const rem = { ...inventory }

  // 週末優先ソート済み配列（各 generatePlan 呼び出しごとに生成）
  const orderDow = ["日", "土", "金", "木", "水", "火", "月"]
  const daysWeekendFirst: DayInfo[] = [...eventDays].sort((a, b) => {
    const ai = orderDow.indexOf(a.dayOfWeek)
    const bi = orderDow.indexOf(b.dayOfWeek)
    if (ai !== bi) return ai - bi
    return b.dayIndex - a.dayIndex
  })

  // ① いいキャンプチケット（月曜固定・上限2枚）
  for (const di of event.specialDays.campDayIndices) {
    if ((rem["good-camp"] ?? 0) <= 0) break
    plan[di].campSlot = "good-camp"
    rem["good-camp"]--
  }

  // ② メインおこう（特別な日優先 → 週末から順に配置）
  const mainOrder: DayInfo[] = [
    ...eventDays.filter(d => specialDays.has(d.dayIndex)).sort((a, b) => b.dayIndex - a.dayIndex),
    ...daysWeekendFirst.filter(d => !specialDays.has(d.dayIndex)),
  ]
  const mainSeen = new Set<number>()
  for (const day of mainOrder) {
    if ((rem[mainId] ?? 0) <= 0) break
    if (mainSeen.has(day.dayIndex)) continue
    mainSeen.add(day.dayIndex)
    const s = plan[day.dayIndex]
    if (s.slot1 === "pokemon" || s.slot2 === "pokemon") continue
    if (placeIncense(plan, day.dayIndex, mainId)) rem[mainId]--
  }

  // ③ なかよしのおこう（メインおこう配置日を週末から逆算して優先配置）
  for (const day of daysWeekendFirst) {
    if ((rem["nakayoshi"] ?? 0) <= 0) break
    const s = plan[day.dayIndex]
    const hasMain = s.slot1 === mainId || s.slot2 === mainId
    if (!hasMain) continue
    if (placeIncense(plan, day.dayIndex, "nakayoshi")) rem["nakayoshi"]--
  }

  // ④ こううんのおこう（特別な日 → 週末 → メイン配置でなかよしが入らなかった日 → 残り平日）
  const kouunOrder: DayInfo[] = [
    ...eventDays.filter(d => specialDays.has(d.dayIndex)),
    ...daysWeekendFirst.filter(d => d.isWeekend && !specialDays.has(d.dayIndex)),
    ...eventDays.filter(d => {
      const s = plan[d.dayIndex]
      const hasMain = s.slot1 === mainId || s.slot2 === mainId
      const hasNakayoshi = s.slot1 === "nakayoshi" || s.slot2 === "nakayoshi"
      return hasMain && !hasNakayoshi && !d.isWeekend
    }),
    ...daysWeekendFirst.filter(d => !d.isWeekend && !specialDays.has(d.dayIndex)),
  ]
  const kouunSeen = new Set<number>()
  for (const day of kouunOrder) {
    if ((rem["kouun"] ?? 0) <= 0) break
    if (kouunSeen.has(day.dayIndex)) continue
    kouunSeen.add(day.dayIndex)
    if (placeIncense(plan, day.dayIndex, "kouun")) rem["kouun"]--
  }

  // ⑤ マスターサブレ（メインおこう配置日の最初の1日のみ）
  if ((rem["master-sable"] ?? 0) > 0) {
    const firstMainDay = eventDays.find(d => {
      const s = plan[d.dayIndex]
      return s.slot1 === mainId || s.slot2 === mainId
    })
    if (firstMainDay) {
      plan[firstMainDay.dayIndex].sableSlot = "master-sable"
      rem["master-sable"]--
    }
  }

  // ⑥ ポケモンのおこう（メインおこうが入っていない日に週末から配置）
  for (const day of daysWeekendFirst) {
    if ((rem["pokemon"] ?? 0) <= 0) break
    const s = plan[day.dayIndex]
    if (s.slot1 === mainId || s.slot2 === mainId) continue
    if (placeIncense(plan, day.dayIndex, "pokemon")) rem["pokemon"]--
  }

  return plan
}
*/

// ─── メインコンポーネント ──────────────────────────────────

/** localStorageキーをイベントIDから生成 */
function lsKey(eventId: string, suffix: string) {
  return `${eventId}-${suffix}`
}

export function EventCalendar() {
  // ── イベント切り替え ──
  const [eventIndex, setEventIndex] = useState(EVENTS.length - 1)
  const currentEvent: PokeSleepEvent = EVENTS[eventIndex]
  const eventDays: DayInfo[] = buildEventDays(currentEvent)
  const eventItems = INCENSE_MASTERS.filter(i => currentEvent.itemIds.includes(i.id))

  // ── 在庫数（incense id → 個数）──
  const [inventory, setInventory] = useState<Record<string, number>>(
    () => Object.fromEntries(INCENSE_MASTERS.map(i => [i.id, 0]))
  )
  // ── 1日2スロット ──
  const [daySlots, setDaySlots] = useState<Record<number, DaySlots>>(
    () => Object.fromEntries(eventDays.map(d => [d.dayIndex, EMPTY_SLOTS()]))
  )

  // mount後 or イベント切り替え時にlocalStorageから復元
  useEffect(() => {
    const id = currentEvent.id
    try {
      const inv = localStorage.getItem(lsKey(id, "inventory"))
      setInventory(Object.fromEntries(INCENSE_MASTERS.map(i => [i.id, 0])))
      if (inv) setInventory(prev => ({ ...prev, ...JSON.parse(inv) }))
    } catch {}
    try {
      const slots = localStorage.getItem(lsKey(id, "slots"))
      const empty = Object.fromEntries(eventDays.map(d => [d.dayIndex, EMPTY_SLOTS()]))
      if (slots) {
        const parsed = JSON.parse(slots)
        setDaySlots(Object.fromEntries(
          eventDays.map(d => [d.dayIndex, { ...empty[d.dayIndex], ...parsed[d.dayIndex] }])
        ))
      } else {
        setDaySlots(empty)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent.id])

  const [memo, setMemo] = useState("")

  // mount後にメモ復元
  useEffect(() => {
    try {
      const m = localStorage.getItem(lsKey(currentEvent.id, "memo"))
      setMemo(m ?? "")
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent.id])

  // 変更のたびにlocalStorageへ保存
  useEffect(() => {
    localStorage.setItem(lsKey(currentEvent.id, "inventory"), JSON.stringify(inventory))
  }, [inventory, currentEvent.id])
  useEffect(() => {
    localStorage.setItem(lsKey(currentEvent.id, "slots"), JSON.stringify(daySlots))
  }, [daySlots, currentEvent.id])
  useEffect(() => {
    localStorage.setItem(lsKey(currentEvent.id, "memo"), memo)
  }, [memo, currentEvent.id])

const [dragId, setDragId] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<{ dayIndex: number; slot: keyof DaySlots } | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)

  const [activeTooltip, setActiveTooltip] = useState<{ id: string; x: number; y: number } | null>(null)
  const [tapSelectedId, setTapSelectedId] = useState<string | null>(null)
  const [tapSource, setTapSource] = useState<{ dayIndex: number; slot: keyof DaySlots } | null>(null)

  // ピンチズーム
  const [calScale, setCalScale] = useState(1)
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)
  const calRef = useRef<HTMLDivElement>(null)

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { startDist: Math.hypot(dx, dy), startScale: calScale }
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2 || !pinchRef.current) return
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const next = Math.min(2.5, Math.max(0.4, pinchRef.current.startScale * (dist / pinchRef.current.startDist)))
    setCalScale(next)
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null
  }

  // うもう計算: dayIndex 0..D までの累積必要うもう数
  const umouCumulative: Record<number, number> = (() => {
    const result: Record<number, number> = {}
    let nOkouW1 = 0, nOkouW2 = 0
    let nSableW1 = 0, nSableW2 = 0
    const mainId = currentEvent.umouPrices.mainIncenseId
    const sableId = currentEvent.umouPrices.mainSableId
    for (const day of eventDays) {
      const s = daySlots[day.dayIndex]
      if (!s) continue
      const okouCount = (s.slot1 === mainId ? 1 : 0) + (s.slot2 === mainId ? 1 : 0) + (s.slot3 === mainId ? 1 : 0) + (s.slot4 === mainId ? 1 : 0) + (s.carryoverSlot === mainId ? 1 : 0)
      const sableCount = (s.sableSlot === sableId ? s.sableCount : 0) + (s.sableSlot2 === sableId ? s.sableCount2 : 0)
      if (day.dayIndex < 7) { nOkouW1 += okouCount; nSableW1 += sableCount }
      else                  { nOkouW2 += okouCount; nSableW2 += sableCount }
      result[day.dayIndex] = calcUmou(nOkouW1, nOkouW2, nSableW1, nSableW2, currentEvent.umouPrices)
    }
    return result
  })()

  const totalUmou = umouCumulative[13] ?? 0

  // 今日の dayIndex（イベント期間外なら -1）
  const todayDayIndex = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const found = eventDays.find(d => {
      const dd = new Date(currentEvent.startDate)
      dd.setDate(dd.getDate() + d.dayIndex)
      dd.setHours(0, 0, 0, 0)
      return dd.getTime() === today.getTime()
    })
    return found ? found.dayIndex : -1
  })()
  // 残り日数（今日含む）
  const remainingDays = todayDayIndex >= 0 ? 14 - todayDayIndex : 0

  // 在庫の配置済み合計（全スロット集計）
  const mainSableId = currentEvent.umouPrices.mainSableId
  function usedCount(id: string): number {
    return Object.values(daySlots).reduce((sum, s) => {
      return sum
        + (s.slot1 === id ? 1 : 0)
        + (s.slot2 === id ? 1 : 0)
        + (s.slot3 === id ? 1 : 0)
        + (s.slot4 === id ? 1 : 0)
        + (s.mondaySlot === id ? (id === "help-whistle" ? s.mondayWhistleCount : 1) : 0)
        + (s.campSlot === id ? 1 : 0)
        + (s.sableSlot === id ? (id === mainSableId ? s.sableCount : 1) : 0)
        + (s.sableSlot2 === id ? (id === mainSableId ? s.sableCount2 : 1) : 0)
        + (s.carryoverSlot === id ? 1 : 0)
    }, 0)
  }

  // 提案（ボタンは一時的に非表示 — 復活させる際はここのコメントを外してボタンJSXを戻す）
  // function handleSuggest() {
  //   setDaySlots(generatePlan(inventory, eventDays, currentEvent))
  // }

  function clearPlan() {
    setDaySlots(Object.fromEntries(eventDays.map(d => [d.dayIndex, EMPTY_SLOTS()])))
  }

  // D&D: スロットにドロップ
  function onDropSlot(dayIndex: number, slot: keyof DaySlots) {
    if (!dragId) return

    // 同じスロットへのドロップは無視
    if (dragSource && dragSource.dayIndex === dayIndex && dragSource.slot === slot) {
      setDragId(null); setDragSource(null); setDragOverDay(null); return
    }

    const slots = daySlots[dayIndex]

    // スロット種別ごとのバリデーション
    if (slot === "slot1" || slot === "slot2") {
      if (!isIncenseItem(dragId)) return
      const other = slot === "slot1" ? slots.slot2 : slots.slot1
      if (other === dragId) return
      const POKEMON_LATIAS = new Set(["pokemon", "latias"])
      if (POKEMON_LATIAS.has(dragId) && other && POKEMON_LATIAS.has(other)) return
    }
    if (slot === "slot3" || slot === "slot4") {
      if (!isIncenseItem(dragId)) return
      if (!slots.splitSleep) return
      const other = slot === "slot3" ? slots.slot4 : slots.slot3
      if (other === dragId) return
      const POKEMON_LATIAS = new Set(["pokemon", "latias"])
      if (POKEMON_LATIAS.has(dragId) && other && POKEMON_LATIAS.has(other)) return
    }
    const curMainId = currentEvent.mainIncenseId
    const curSableId = currentEvent.umouPrices.mainSableId
    if (slot === "mondaySlot"    && dragId !== "help-whistle") return
    if (slot === "campSlot"      && dragId !== "good-camp")    return
    if (slot === "sableSlot"     && dragId !== "master-sable" && dragId !== curSableId) return
    if (slot === "sableSlot2"    && dragId !== "master-sable" && dragId !== curSableId) return
    if (slot === "carryoverSlot" && dragId !== curMainId) return
    if (slot === "carryoverSlot" && dayIndex !== 13) return

    // 在庫チェック（スロットからの移動は使用数-1で判定）
    const effectiveUsed = dragSource ? usedCount(dragId) - 1 : usedCount(dragId)
    if (effectiveUsed >= (inventory[dragId] ?? 0)) return

    setDaySlots(prev => {
      let next = { ...prev, [dayIndex]: { ...prev[dayIndex], [slot]: dragId } }
      // latias が全スロットから消えた場合、sableSlot を強制クリア
      if (slot === "slot1" || slot === "slot2" || slot === "slot3" || slot === "slot4") {
        const day = next[dayIndex]
        if (day.slot1 !== "latias" && day.slot2 !== "latias" && day.sableSlot) {
          next = { ...next, [dayIndex]: { ...next[dayIndex], sableSlot: null, sableCount: 1 } }
        }
        if (day.slot3 !== "latias" && day.slot4 !== "latias" && day.sableSlot2) {
          next = { ...next, [dayIndex]: { ...next[dayIndex], sableSlot2: null, sableCount2: 1 } }
        }
      }
      // 移動元スロットをクリア
      if (dragSource) {
        const srcDay = next[dragSource.dayIndex]
        let srcUpdate: Partial<DaySlots> = { [dragSource.slot]: null }
        if (dragSource.slot === "slot1" || dragSource.slot === "slot2" || dragSource.slot === "slot3" || dragSource.slot === "slot4") {
          const afterSrc = { ...srcDay, [dragSource.slot]: null }
          if (afterSrc.slot1 !== "latias" && afterSrc.slot2 !== "latias" && srcDay.sableSlot) {
            srcUpdate = { ...srcUpdate, sableSlot: null, sableCount: 1 }
          }
          if (afterSrc.slot3 !== "latias" && afterSrc.slot4 !== "latias" && srcDay.sableSlot2) {
            srcUpdate = { ...srcUpdate, sableSlot2: null, sableCount2: 1 }
          }
        }
        next = { ...next, [dragSource.dayIndex]: { ...srcDay, ...srcUpdate } }
      }
      return next
    })
    setDragId(null)
    setDragSource(null)
    setDragOverDay(null)
  }

  // タップ選択 → スロットにタップで配置
  function onTapSlot(dayIndex: number, slot: keyof DaySlots) {
    if (!tapSelectedId) return
    const id = tapSelectedId
    const slots = daySlots[dayIndex]

    // 同じスロットをタップしたらキャンセル
    if (tapSource && tapSource.dayIndex === dayIndex && tapSource.slot === slot) {
      setTapSelectedId(null); setTapSource(null); return
    }

    const targetItem = slots[slot as keyof DaySlots] as string | null

    // ターゲットスロットにアイテムがある場合はスワップ（移動元がある場合のみ）
    if (targetItem && tapSource) {
      const POKEMON_LATIAS = new Set(["pokemon", "latias"])
      // ターゲット日の制約チェック（idを置いた後のもう一方のスロット）
      if (slot === "slot1" || slot === "slot2") {
        const otherOnTarget = slot === "slot1" ? slots.slot2 : slots.slot1
        if (otherOnTarget && otherOnTarget === id) return // 同じおこう重複
        if (POKEMON_LATIAS.has(id) && otherOnTarget && POKEMON_LATIAS.has(otherOnTarget)) return
      }
      // 移動元日の制約チェック（targetItemを置いた後のもう一方のスロット）
      if (tapSource.slot === "slot1" || tapSource.slot === "slot2") {
        const sourceSlots = daySlots[tapSource.dayIndex]
        const otherOnSource = tapSource.slot === "slot1" ? sourceSlots.slot2 : sourceSlots.slot1
        // 移動元のもう一方は id が抜けた後なので元のままで比較
        const effectiveOther = otherOnSource === id ? null : otherOnSource
        if (effectiveOther && effectiveOther === targetItem) return // 同じおこう重複
        if (POKEMON_LATIAS.has(targetItem) && effectiveOther && POKEMON_LATIAS.has(effectiveOther)) return
      }
      setDaySlots(prev => ({
        ...prev,
        [dayIndex]: { ...prev[dayIndex], [slot]: id },
        [tapSource.dayIndex]: { ...prev[tapSource.dayIndex], [tapSource.slot]: targetItem },
      }))
      setTapSelectedId(null); setTapSource(null); return
    }

    if (slot === "slot1" || slot === "slot2") {
      if (!isIncenseItem(id)) return
      const other = slot === "slot1" ? slots.slot2 : slots.slot1
      if (other === id) return
      const POKEMON_LATIAS = new Set(["pokemon", "latias"])
      if (POKEMON_LATIAS.has(id) && other && POKEMON_LATIAS.has(other)) return
    }
    if (slot === "slot3" || slot === "slot4") {
      if (!isIncenseItem(id)) return
      if (!slots.splitSleep) return
      const other = slot === "slot3" ? slots.slot4 : slots.slot3
      if (other === id) return
      const POKEMON_LATIAS = new Set(["pokemon", "latias"])
      if (POKEMON_LATIAS.has(id) && other && POKEMON_LATIAS.has(other)) return
    }
    if (slot === "mondaySlot"    && id !== "help-whistle") return
    if (slot === "campSlot"      && id !== "good-camp")    return
    if (slot === "sableSlot"     && id !== "master-sable" && id !== "latias-sable") return
    if (slot === "sableSlot2"    && id !== "master-sable" && id !== "latias-sable") return
    if (slot === "carryoverSlot" && id !== "latias") return
    if (slot === "carryoverSlot" && dayIndex !== 13) return

    const effectiveUsed = tapSource ? usedCount(id) - 1 : usedCount(id)
    if (effectiveUsed >= (inventory[id] ?? 0)) return

    setDaySlots(prev => {
      let next = { ...prev, [dayIndex]: { ...prev[dayIndex], [slot]: id } }
      if (slot === "slot1" || slot === "slot2" || slot === "slot3" || slot === "slot4") {
        const day = next[dayIndex]
        if (day.slot1 !== "latias" && day.slot2 !== "latias" && day.sableSlot) {
          next = { ...next, [dayIndex]: { ...next[dayIndex], sableSlot: null, sableCount: 1 } }
        }
        if (day.slot3 !== "latias" && day.slot4 !== "latias" && day.sableSlot2) {
          next = { ...next, [dayIndex]: { ...next[dayIndex], sableSlot2: null, sableCount2: 1 } }
        }
      }
      if (tapSource) {
        const srcDay = next[tapSource.dayIndex]
        let srcUpdate: Partial<DaySlots> = { [tapSource.slot]: null }
        if (tapSource.slot === "slot1" || tapSource.slot === "slot2" || tapSource.slot === "slot3" || tapSource.slot === "slot4") {
          const afterSrc = { ...srcDay, [tapSource.slot]: null }
          if (afterSrc.slot1 !== "latias" && afterSrc.slot2 !== "latias" && srcDay.sableSlot) {
            srcUpdate = { ...srcUpdate, sableSlot: null, sableCount: 1 }
          }
          if (afterSrc.slot3 !== "latias" && afterSrc.slot4 !== "latias" && srcDay.sableSlot2) {
            srcUpdate = { ...srcUpdate, sableSlot2: null, sableCount2: 1 }
          }
        }
        next = { ...next, [tapSource.dayIndex]: { ...srcDay, ...srcUpdate } }
      }
      return next
    })
    setTapSelectedId(null)
    setTapSource(null)
  }

  function onTapFromSlot(dayIndex: number, slot: keyof DaySlots, itemId: string) {
    setTapSelectedId(itemId)
    setTapSource({ dayIndex, slot })
  }

  function clearSlot(dayIndex: number, slot: keyof DaySlots) {
    setDaySlots(prev => {
      const day = prev[dayIndex]
      // slot1/slot2 から latias を外してもう一方にもなければ sableSlot をクリア
      const clearing1 = (slot === "slot1" && day.slot1 === "latias") || (slot === "slot2" && day.slot2 === "latias")
      const remaining1 = (slot !== "slot1" && day.slot1 === "latias") || (slot !== "slot2" && day.slot2 === "latias")
      const shouldClearSable1 = clearing1 && !remaining1
      // slot3/slot4 から latias を外してもう一方にもなければ sableSlot2 をクリア
      const clearing2 = (slot === "slot3" && day.slot3 === "latias") || (slot === "slot4" && day.slot4 === "latias")
      const remaining2 = (slot !== "slot3" && day.slot3 === "latias") || (slot !== "slot4" && day.slot4 === "latias")
      const shouldClearSable2 = clearing2 && !remaining2
      return {
        ...prev,
        [dayIndex]: {
          ...day,
          [slot]: null,
          ...(slot === "mondaySlot" ? { mondayWhistleCount: 1 } : {}),
          ...(slot === "sableSlot" ? { sableCount: 1 } : {}),
          ...(slot === "sableSlot2" ? { sableCount2: 1 } : {}),
          ...(shouldClearSable1 ? { sableSlot: null, sableCount: 1 } : {}),
          ...(shouldClearSable2 ? { sableSlot2: null, sableCount2: 1 } : {}),
        },
      }
    })
  }

  function changeSableCount(dayIndex: number, value: number) {
    setDaySlots(prev => {
      const s = prev[dayIndex]
      if (s.sableSlot !== "latias-sable") return prev
      const otherUsed = Object.entries(prev)
        .filter(([di]) => Number(di) !== dayIndex)
        .reduce((sum, [, ds]) => sum + (ds.sableSlot === "latias-sable" ? ds.sableCount : 0) + (ds.sableSlot2 === "latias-sable" ? ds.sableCount2 : 0), 0)
      const selfOther = s.sableSlot2 === "latias-sable" ? s.sableCount2 : 0
      const max = (inventory["latias-sable"] ?? 0) - otherUsed - selfOther
      const newCount = Math.max(1, Math.min(max, value))
      return { ...prev, [dayIndex]: { ...s, sableCount: newCount } }
    })
  }

  function changeSableCount2(dayIndex: number, value: number) {
    setDaySlots(prev => {
      const s = prev[dayIndex]
      if (s.sableSlot2 !== "latias-sable") return prev
      const otherUsed = Object.entries(prev)
        .filter(([di]) => Number(di) !== dayIndex)
        .reduce((sum, [, ds]) => sum + (ds.sableSlot === "latias-sable" ? ds.sableCount : 0) + (ds.sableSlot2 === "latias-sable" ? ds.sableCount2 : 0), 0)
      const selfOther = s.sableSlot === "latias-sable" ? s.sableCount : 0
      const max = (inventory["latias-sable"] ?? 0) - otherUsed - selfOther
      const newCount = Math.max(1, Math.min(max, value))
      return { ...prev, [dayIndex]: { ...s, sableCount2: newCount } }
    })
  }

  function changeMondayWhistleCount(dayIndex: number, delta: number) {
    setDaySlots(prev => {
      const s = prev[dayIndex]
      if (s.mondaySlot !== "help-whistle") return prev
      const otherUsed = Object.entries(prev)
        .filter(([di]) => Number(di) !== dayIndex)
        .reduce((sum, [, ds]) => sum + (ds.mondaySlot === "help-whistle" ? ds.mondayWhistleCount : 0), 0)
      const max = (inventory["help-whistle"] ?? 0) - otherUsed
      const newCount = Math.max(1, Math.min(max, delta))
      return { ...prev, [dayIndex]: { ...s, mondayWhistleCount: newCount } }
    })
  }

  const week1 = eventDays.slice(0, 7)
  const week2 = eventDays.slice(7, 14)

  return (
    <>
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-6" onClick={(e) => {
      if (tapSelectedId && !(e.target as HTMLElement).closest("[data-tap-item]")) { setTapSelectedId(null); setTapSource(null) }
    }}>
      <div className="mx-auto" style={{ maxWidth: "calc(7 * 9rem + 2rem)" }}>

      {/* ── ヘッダー ── */}
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          {/* 前のイベントへ */}
          <button
            onClick={() => setEventIndex(i => Math.max(0, i - 1))}
            disabled={eventIndex === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
            aria-label="前のイベント"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* イベント名 + 期間 */}
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 truncate">{currentEvent.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentEvent.startDate.getMonth() + 1}/{currentEvent.startDate.getDate()}(月)
              {" 〜 "}
              {currentEvent.endDate.getMonth() + 1}/{currentEvent.endDate.getDate() - 1}(日)
              {remainingDays > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">残り{remainingDays}日</span>
              )}
            </p>
            {/* イベントインジケーター */}
            <div className="flex justify-center gap-1 mt-1.5">
              {EVENTS.map((ev, i) => (
                <button
                  key={ev.id}
                  onClick={() => setEventIndex(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === eventIndex ? "bg-blue-500 w-3" : "bg-gray-300 hover:bg-gray-400"
                  )}
                  aria-label={ev.shortName}
                />
              ))}
            </div>
          </div>

          {/* 次のイベントへ */}
          <button
            onClick={() => setEventIndex(i => Math.min(EVENTS.length - 1, i + 1))}
            disabled={eventIndex === EVENTS.length - 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
            aria-label="次のイベント"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── 在庫エリア（左: 交換所プレースホルダ / 右: 在庫） ── */}
      <section className="px-4 mb-2">
        <div className="flex gap-3">

          {/* ── 左: 交換所（プレースホルダ） ── */}
          <div className="flex flex-col gap-2 w-44 shrink-0">
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 flex flex-col gap-1 opacity-50">
              <p className="text-[10px] font-semibold text-gray-500">🪶 うもう交換所</p>
              <p className="text-[9px] text-gray-400">Coming soon</p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 flex flex-col gap-1 opacity-50">
              <p className="text-[10px] font-semibold text-gray-500">💎 ダイヤ交換所</p>
              <p className="text-[9px] text-gray-400">Coming soon</p>
            </div>
          </div>

          {/* ── 右: 在庫 ── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-gray-500">
                <span className="font-medium text-gray-700">在庫入力</span>
                <span className="ml-1.5 text-gray-400">→ タップ or ドラッグで配置</span>
              </p>
              <button
                onClick={() => setInventory(prev => ({ ...prev, ...Object.fromEntries(eventItems.map(i => [i.id, 0])) }))}
                className="text-[9px] text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 rounded px-1.5 py-0.5 transition-colors whitespace-nowrap"
              >
                リセット
              </button>
            </div>

            {/* 2列: おこう列 ｜ その他アイテム列 */}
            <div className="flex gap-2">
              {/* おこう列 */}
              <div className="flex-1 flex flex-col gap-1">
                <p className="text-[9px] font-semibold text-gray-400 mb-0.5">おこう</p>
                {eventItems.filter(i => ["energy","exp","shard","pokemon-exp","chance","pokemon"].includes(i.effectType)).map(incense => {
                  const qty = inventory[incense.id] ?? 0
                  const used = usedCount(incense.id)
                  const canDrag = qty > 0 && used < qty
                  return (
                    <InventoryRow
                      key={incense.id}
                      incense={incense}
                      qty={qty}
                      used={used}
                      canDrag={canDrag}
                      isDragging={dragId === incense.id}
                      isTapSelected={tapSelectedId === incense.id}
                      onDragStart={(e) => {
                        setDragId(incense.id)
                        const imgEl = (e.currentTarget as HTMLElement).querySelector('img')
                        if (imgEl) e.dataTransfer.setDragImage(imgEl, 16, 16)
                      }}
                      onDragEnd={() => { setDragId(null); setDragSource(null) }}
                      onTap={() => { if (canDrag) setTapSelectedId(prev => prev === incense.id ? null : incense.id) }}
                      onQtyChange={(v) => setInventory(prev => ({ ...prev, [incense.id]: v }))}
                    />
                  )
                })}
              </div>

              {/* その他アイテム列 */}
              <div className="flex-1 flex flex-col gap-1">
                <p className="text-[9px] font-semibold text-gray-400 mb-0.5">その他</p>
                {eventItems.filter(i => ["camp","treat","whistle"].includes(i.effectType)).map(incense => {
                  const qty = inventory[incense.id] ?? 0
                  const used = usedCount(incense.id)
                  const canDrag = qty > 0 && used < qty
                  return (
                    <InventoryRow
                      key={incense.id}
                      incense={incense}
                      qty={qty}
                      used={used}
                      canDrag={canDrag}
                      isDragging={dragId === incense.id}
                      isTapSelected={tapSelectedId === incense.id}
                      onDragStart={(e) => {
                        setDragId(incense.id)
                        const imgEl = (e.currentTarget as HTMLElement).querySelector('img')
                        if (imgEl) e.dataTransfer.setDragImage(imgEl, 16, 16)
                      }}
                      onDragEnd={() => { setDragId(null); setDragSource(null) }}
                      onTap={() => { if (canDrag) setTapSelectedId(prev => prev === incense.id ? null : incense.id) }}
                      onQtyChange={(v) => setInventory(prev => ({ ...prev, [incense.id]: v }))}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ボタンエリア ── */}
      {/* TODO: おすすめ使用日提案ボタンは一時的に非表示（handleSuggest / generatePlan は保持） */}
      <div className="px-4 mb-2 flex items-center gap-2">
        <button
          onClick={clearPlan}
          className="flex items-center px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 shadow-sm transition-colors whitespace-nowrap"
        >
          <span className="text-xs font-semibold">クリア</span>
        </button>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200">
            <span className="text-sm">🪶</span>
            <span className="text-xs text-purple-700 font-medium">合計必要うもう数</span>
            <span className="text-sm font-bold text-purple-800">{totalUmou.toLocaleString()}</span>
          </div>
      </div>

      {/* ── カレンダーグリッド ── */}
      <main
        className="overflow-x-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={calRef}
          className="min-w-max origin-top-left"
          style={{ transform: `scale(${calScale})`, transformOrigin: "top left" }}
        >
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-1" style={{ gridTemplateColumns: "repeat(7, 9rem)" }}>
          {["月", "火", "水", "木", "金", "土", "日"].map((d, i) => (
            <div key={d} className={cn(
              "text-center text-[10px] sm:text-xs font-bold py-1",
              i === 5 && "text-sky-600",
              i === 6 && "text-rose-500",
              i < 5 && "text-gray-500",
            )}>
              {d}
            </div>
          ))}
        </div>

        {/* Week 1（バーをオーバーレイ） */}
        <div className="relative mb-1">
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 9rem)" }}>
            {week1.map(day => (
              <DayCell
                key={day.date}
                day={day}
                slots={daySlots[day.dayIndex]}
                isDragOver={dragOverDay === day.dayIndex}
                dragId={dragId}
                tapSelectedId={tapSelectedId}
                onDragOver={(e) => { e.preventDefault(); setDragOverDay(day.dayIndex) }}
                onDragLeave={() => setDragOverDay(null)}
                onDropSlot={(slot) => onDropSlot(day.dayIndex, slot)}
                onTapSlot={(slot) => onTapSlot(day.dayIndex, slot)}
                onClearSlot={(slot) => clearSlot(day.dayIndex, slot)}
                onDragFromSlot={(slot, itemId, e) => {
                  setDragId(itemId)
                  setDragSource({ dayIndex: day.dayIndex, slot })
                  // e.target はスロット内の<img>要素（既ロード済み）
                  e.dataTransfer.setDragImage(e.target as Element, 20, 20)
                }}
                onTapFromSlot={(slot, itemId) => onTapFromSlot(day.dayIndex, slot, itemId)}
                onWhistleCountChange={(value) => changeMondayWhistleCount(day.dayIndex, value)}
                whistleMax={(() => {
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.mondaySlot === "help-whistle" ? ds.mondayWhistleCount : 0), 0)
                  return Math.max(1, (inventory["help-whistle"] ?? 0) - otherUsed)
                })()}
                onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
                sableMax={(() => {
                  const sid = currentEvent.umouPrices.mainSableId
                  const s = daySlots[day.dayIndex]
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                  return Math.max(1, (inventory[sid] ?? 0) - otherUsed - (s.sableSlot2 === sid ? s.sableCount2 : 0))
                })()}
                onSableCountChange2={(value) => changeSableCount2(day.dayIndex, value)}
                sableMax2={(() => {
                  const sid = currentEvent.umouPrices.mainSableId
                  const s = daySlots[day.dayIndex]
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                  return Math.max(1, (inventory[sid] ?? 0) - otherUsed - (s.sableSlot === sid ? s.sableCount : 0))
                })()}
                cumulativeUmou={umouCumulative[day.dayIndex] ?? 0}
                todayDayIndex={todayDayIndex}
                onToggleSplitSleep={() => setDaySlots(prev => ({
                  ...prev,
                  [day.dayIndex]: { ...prev[day.dayIndex], splitSleep: !prev[day.dayIndex].splitSleep, slot3: null, slot4: null }
                }))}
                mainIncenseId={currentEvent.mainIncenseId}
                mainSableId={currentEvent.umouPrices.mainSableId}
              />
            ))}
          </div>
          <EventBarsOverlay week={0} calendarEvents={currentEvent.calendarEvents} activeTooltipId={activeTooltip?.id ?? null} onBarClick={(id, x, y) => setActiveTooltip(prev => prev?.id === id ? null : { id, x, y })} />
        </div>

        {/* Week 2（バーをオーバーレイ） */}
        <div className="relative">
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 9rem)" }}>
          {week2.map(day => (
            <DayCell
              key={day.date}
              day={day}
              slots={daySlots[day.dayIndex]}
              isDragOver={dragOverDay === day.dayIndex}
              dragId={dragId}
              tapSelectedId={tapSelectedId}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(day.dayIndex) }}
              onDragLeave={() => setDragOverDay(null)}
              onDropSlot={(slot) => onDropSlot(day.dayIndex, slot)}
              onTapSlot={(slot) => onTapSlot(day.dayIndex, slot)}
              onTapFromSlot={(slot, itemId) => onTapFromSlot(day.dayIndex, slot, itemId)}
              onClearSlot={(slot) => clearSlot(day.dayIndex, slot)}
              onDragFromSlot={(slot, itemId, e) => {
                setDragId(itemId)
                setDragSource({ dayIndex: day.dayIndex, slot })
                e.dataTransfer.setDragImage(e.target as Element, 20, 20)
              }}
              onWhistleCountChange={(value) => changeMondayWhistleCount(day.dayIndex, value)}
              whistleMax={(() => {
                const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.mondaySlot === "help-whistle" ? ds.mondayWhistleCount : 0), 0)
                return Math.max(1, (inventory["help-whistle"] ?? 0) - otherUsed)
              })()}
              onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
              sableMax={(() => {
                const sid = currentEvent.umouPrices.mainSableId
                const s = daySlots[day.dayIndex]
                const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                return Math.max(1, (inventory[sid] ?? 0) - otherUsed - (s.sableSlot2 === sid ? s.sableCount2 : 0))
              })()}
              onSableCountChange2={(value) => changeSableCount2(day.dayIndex, value)}
              sableMax2={(() => {
                const sid = currentEvent.umouPrices.mainSableId
                const s = daySlots[day.dayIndex]
                const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                return Math.max(1, (inventory[sid] ?? 0) - otherUsed - (s.sableSlot === sid ? s.sableCount : 0))
              })()}
              cumulativeUmou={umouCumulative[day.dayIndex] ?? 0}
              todayDayIndex={todayDayIndex}
              onToggleSplitSleep={() => setDaySlots(prev => ({
                ...prev,
                [day.dayIndex]: { ...prev[day.dayIndex], splitSleep: !prev[day.dayIndex].splitSleep, slot3: null, slot4: null }
              }))}
              mainIncenseId={currentEvent.mainIncenseId}
              mainSableId={currentEvent.umouPrices.mainSableId}
            />
          ))}
        </div>
          <EventBarsOverlay week={1} calendarEvents={currentEvent.calendarEvents} activeTooltipId={activeTooltip?.id ?? null} onBarClick={(id, x, y) => setActiveTooltip(prev => prev?.id === id ? null : { id, x, y })} />
        </div>

        {/* ── メモエリア ── */}
        <div className="mt-2 pb-6">
          <p className="text-xs text-gray-500 mb-2"><span className="font-medium text-gray-700">メモ</span></p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="自由にメモできます"
            className="w-full min-h-40 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder-gray-300 resize-y focus:outline-none focus:border-blue-400 leading-relaxed"
          />
        </div>
        </div>
      </main>

      </div>
    </div>

    {/* ── イベントツールチップ（portal） ── */}
    {activeTooltip && typeof document !== "undefined" && createPortal(
      <div
        style={{ position: "fixed", left: activeTooltip.x, top: activeTooltip.y + 4, zIndex: 9999 }}
        className="w-92 rounded-xl bg-white border border-gray-200 shadow-xl shadow-black/10 p-3"
      >
        {(() => {
          const ev = currentEvent.calendarEvents.find(e => e.id === activeTooltip.id)
          if (!ev) return null
          return (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800">{ev.name}</span>
                <button onClick={() => setActiveTooltip(null)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <ul className="space-y-1.5">
                {ev.effects.map((ef, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-700">
                    <span className="shrink-0 text-gray-400 mt-px">▶</span>
                    <span>{ef.label}{ef.note && <span className="ml-1 text-gray-400">({ef.note})</span>}</span>
                  </li>
                ))}
              </ul>
            </>
          )
        })()}
      </div>,
      document.body
    )}
    </>
  )
}

// ─── InventoryRow（在庫エリア用コンパクト行） ────────────────

function InventoryRow({
  incense, qty, used, canDrag, isDragging, isTapSelected,
  onDragStart, onDragEnd, onTap, onQtyChange,
}: {
  incense: IncenseMaster
  qty: number
  used: number
  canDrag: boolean
  isDragging: boolean
  isTapSelected: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onTap: () => void
  onQtyChange: (v: number) => void
}) {
  const max = incense.maxStock ?? (incense.id === "good-camp" ? 2 : 99)
  return (
    <div
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-tap-item
      onClick={onTap}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-lg border select-none transition-all",
        canDrag
          ? "bg-white border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-300 shadow-sm"
          : "bg-gray-50 border-gray-100 opacity-50 cursor-default",
        isDragging && "border-blue-400 scale-95 opacity-80",
        isTapSelected && "border-blue-500 ring-2 ring-blue-300 scale-95",
      )}
    >
      <img
        src={incense.imageUrl}
        alt={incense.name}
        width={28}
        height={28}
        className="w-7 h-7 object-contain shrink-0"
        draggable={false}
      />
      <span className="text-[9px] text-gray-600 leading-tight flex-1 min-w-0 line-clamp-2">
        {incense.name}
      </span>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <select
          value={qty}
          onChange={(e) => onQtyChange(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          className="w-10 text-xs font-bold text-center text-gray-800 bg-gray-50 border border-gray-200 rounded py-0 focus:outline-none focus:border-blue-400"
          style={{ textAlignLast: "center" }}
        >
          {Array.from({ length: max + 1 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <span className={cn("text-[8px] text-blue-500", used === 0 && "invisible")}>
          配置:{used}
        </span>
      </div>
    </div>
  )
}

// ─── DayCell ──────────────────────────────────────────────

interface DayCellProps {
  day: DayInfo
  slots: DaySlots
  isDragOver: boolean
  dragId: string | null
  tapSelectedId: string | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDropSlot: (slot: keyof DaySlots) => void
  onTapSlot: (slot: keyof DaySlots) => void
  onTapFromSlot: (slot: keyof DaySlots, itemId: string) => void
  onClearSlot: (slot: keyof DaySlots) => void
  onDragFromSlot: (slot: keyof DaySlots, itemId: string, e: React.DragEvent) => void
  onWhistleCountChange: (value: number) => void
  whistleMax: number
  onSableCountChange: (value: number) => void
  sableMax: number
  onSableCountChange2: (value: number) => void
  sableMax2: number
  cumulativeUmou: number
  todayDayIndex: number
  onToggleSplitSleep: () => void
  mainIncenseId: string
  mainSableId: string
}

/** 汎用アイテムスロット */
function ItemSlot({
  itemId, isOver, isTapTarget, isTapSelected, hasTapSelected, label, bgImageUrls, monday = false,
  count, maxCount, onCountChange,
  onDrop, onTap, onTapItem, onClear, onDragFromSlot,
}: {
  itemId: string | null
  isOver: boolean
  isTapTarget?: boolean
  isTapSelected?: boolean
  hasTapSelected?: boolean
  label?: string
  bgImageUrls?: string[]
  monday?: boolean
  count?: number
  maxCount?: number
  onCountChange?: (value: number) => void
  onDrop: () => void
  onTap: () => void
  onTapItem?: () => void
  onClear: () => void
  onDragFromSlot?: (e: React.DragEvent) => void
}) {
  const [localOver, setLocalOver] = useState(false)
  const item = itemId ? getIncenseById(itemId) : null
  const showCounter = !!item && count !== undefined && onCountChange !== undefined

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded border transition-all w-10 shrink-0",
        showCounter ? "h-12" : "h-10",
        item
          ? isTapSelected
            ? "bg-blue-100 border-blue-400 ring-2 ring-blue-300"
            : itemId === "latias" || itemId === "latias-sable"
              ? "bg-purple-50 border-purple-300 shadow-[0_0_6px_1px_rgba(168,85,247,0.25)]"
              : "bg-gray-100 border-gray-300"
          : localOver || isTapTarget
            ? "border-blue-400 bg-blue-50 border-dashed"
            : isOver
              ? "border-blue-300 bg-blue-50/50 border-dashed"
              : monday
                ? "border-amber-300 border-dashed bg-amber-50"
                : "border-gray-300 border-dashed bg-gray-100",
      )}
      onDragOver={(e) => { e.preventDefault(); setLocalOver(true) }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setLocalOver(false)
      }}
      onDrop={() => { setLocalOver(false); onDrop() }}
      onClick={() => { if (item) { if (hasTapSelected) onTap(); else onTapItem?.() } else onTap() }}
    >
      {/* 空スロット時の薄い背景画像 */}
      {!item && bgImageUrls && bgImageUrls.length > 0 && (
        <div className="absolute inset-0 flex">
          {bgImageUrls.map((url, i) => (
            <img key={i} src={url} alt="" className="flex-1 object-contain p-0.5 opacity-20" draggable={false} />
          ))}
        </div>
      )}

      {item ? (
        <>
          <img
            src={item.imageUrl} alt={item.name}
            className={cn(
              "object-contain p-0.5",
              showCounter ? "w-full h-7" : "w-full h-full",
              onDragFromSlot && "cursor-grab active:cursor-grabbing"
            )}
            draggable={!!onDragFromSlot}
            onDragStart={onDragFromSlot}
          />
          {/* 個数カウンター（スロット内下部） */}
          {showCounter && (
            <div className="flex items-center w-full px-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onCountChange!(Math.max(1, count! - 1))}
                className="w-3.5 h-3.5 flex items-center justify-center text-[10px] text-gray-400 hover:text-red-400 leading-none"
              >−</button>
              <span className="flex-1 text-center text-[8px] font-bold text-gray-600">{count}</span>
              <button
                onClick={() => onCountChange!(Math.min(maxCount ?? 99, count! + 1))}
                className="w-3.5 h-3.5 flex items-center justify-center text-[10px] text-gray-400 hover:text-blue-400 leading-none"
              >+</button>
            </div>
          )}
          {/* 削除ボタン（右上角） */}
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center text-[10px] text-gray-400 hover:text-red-400 leading-none"
          >−</button>
        </>
      ) : label ? (
        <span className={cn("relative text-[7px] leading-tight text-center px-0.5 whitespace-pre-line", localOver ? "text-blue-500" : monday ? "text-amber-500" : "text-gray-300")}>{localOver ? "↓" : label}</span>
      ) : (
        <span className={cn("relative text-[8px]", localOver ? "text-blue-500" : "text-gray-400")}>{localOver ? "↓" : ""}</span>
      )}
    </div>
  )
}

function DayCell({
  day, slots, isDragOver, dragId, tapSelectedId,
  onDragOver, onDragLeave,
  onDropSlot, onTapSlot, onTapFromSlot, onClearSlot, onDragFromSlot, onWhistleCountChange, whistleMax, onSableCountChange, sableMax, onSableCountChange2, sableMax2, cumulativeUmou, todayDayIndex, onToggleSplitSleep,
  mainIncenseId, mainSableId,
}: DayCellProps) {
  const isSat = day.dayOfWeek === "土"
  const isSun = day.dayOfWeek === "日"
  const isMonday = day.dayOfWeek === "月"
  // ドラッグ中のアイテムがこのスロットに入れるかどうか
  const dragIsIncense = dragId ? isIncenseItem(dragId) : false

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border p-1 transition-all duration-150",
        day.dayIndex === todayDayIndex && "border-blue-500 bg-blue-50",
        day.dayIndex !== todayDayIndex && isSat && "border-sky-300 bg-sky-50",
        day.dayIndex !== todayDayIndex && isSun && "border-rose-300 bg-rose-50",
        day.dayIndex !== todayDayIndex && !isSat && !isSun && "border-gray-200 bg-white",
        isDragOver && "border-blue-400 bg-blue-50 scale-[1.02]",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* 日付 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className={cn("text-xs font-bold", isSun && "text-rose-500", isSat && "text-sky-600", !isSat && !isSun && "text-gray-700")}>
            {day.date}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSplitSleep() }}
            className="flex items-center gap-0.5"
            title="分割睡眠"
          >
            <span className={cn("text-[7px] font-medium", slots.splitSleep ? "text-blue-500" : "text-gray-400")}>分割睡眠</span>
            <span className={cn(
              "relative w-6 h-3.5 rounded-full transition-colors duration-200 shrink-0",
              slots.splitSleep ? "bg-blue-500" : "bg-gray-400"
            )}>
              <span className={cn(
                "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all duration-200",
                slots.splitSleep ? "left-3" : "left-0.5"
              )} />
            </span>
          </button>
        </div>
        {cumulativeUmou > 0 && <span className="text-[8px] text-purple-600 font-semibold">累計🪶: {cumulativeUmou}</span>}
      </div>

      {/* イベントバー用の予約スペース（EventBarsOverlay がここに重なる） */}
      <div className="h-14 shrink-0" />

      {/* スロット */}
      <div className="flex flex-col gap-0.5 w-full">
          {/* おこうスロット */}
          <div className="flex gap-0.5">
            <ItemSlot
              itemId={slots.slot1} isOver={isDragOver && dragIsIncense && !slots.slot1}
              isTapTarget={!!tapSelectedId && !slots.slot1}
              isTapSelected={tapSelectedId === slots.slot1 && !!slots.slot1}
              hasTapSelected={!!tapSelectedId}
              bgImageUrls={["/img/okou_normal.png"]}
              onDrop={() => onDropSlot("slot1")} onTap={() => onTapSlot("slot1")} onTapItem={slots.slot1 ? () => onTapFromSlot("slot1", slots.slot1!) : undefined} onClear={() => onClearSlot("slot1")}
              onDragFromSlot={slots.slot1 ? (e) => onDragFromSlot("slot1", slots.slot1!, e) : undefined}
            />
            <ItemSlot
              itemId={slots.slot2} isOver={isDragOver && dragIsIncense && !!slots.slot1 && !slots.slot2}
              isTapTarget={!!tapSelectedId && !!slots.slot1 && !slots.slot2}
              isTapSelected={tapSelectedId === slots.slot2 && !!slots.slot2}
              hasTapSelected={!!tapSelectedId}
              bgImageUrls={["/img/okou_normal.png"]}
              onDrop={() => onDropSlot("slot2")} onTap={() => onTapSlot("slot2")} onTapItem={slots.slot2 ? () => onTapFromSlot("slot2", slots.slot2!) : undefined} onClear={() => onClearSlot("slot2")}
              onDragFromSlot={slots.slot2 ? (e) => onDragFromSlot("slot2", slots.slot2!, e) : undefined}
            />
            {/* サブレスロット（メインおこう配置時のみ・マスターサブレorサブレ排他） */}
            {(slots.slot1 === mainIncenseId || slots.slot2 === mainIncenseId) && (
              <ItemSlot
                itemId={slots.sableSlot}
                isOver={isDragOver && (dragId === "master-sable" || dragId === mainSableId) && !slots.sableSlot}
                isTapTarget={(tapSelectedId === "master-sable" || tapSelectedId === mainSableId) && !slots.sableSlot}
                isTapSelected={tapSelectedId === slots.sableSlot && !!slots.sableSlot}
                hasTapSelected={!!tapSelectedId}
                bgImageUrls={["/img/poke_sable.png"]}
                count={slots.sableSlot === mainSableId ? slots.sableCount : undefined}
                maxCount={sableMax}
                onCountChange={slots.sableSlot === mainSableId ? onSableCountChange : undefined}
                onDrop={() => onDropSlot("sableSlot")} onTap={() => onTapSlot("sableSlot")} onTapItem={slots.sableSlot ? () => onTapFromSlot("sableSlot", slots.sableSlot!) : undefined} onClear={() => onClearSlot("sableSlot")}
                onDragFromSlot={slots.sableSlot ? (e) => onDragFromSlot("sableSlot", slots.sableSlot!, e) : undefined}
              />
            )}
          </div>

          {/* 分割睡眠 2回目スロット */}
          {slots.splitSleep && (
            <div className="flex gap-0.5">
              <ItemSlot
                itemId={slots.slot3} isOver={isDragOver && dragIsIncense && !slots.slot3}
                isTapTarget={!!tapSelectedId && !slots.slot3}
                isTapSelected={tapSelectedId === slots.slot3 && !!slots.slot3}
                hasTapSelected={!!tapSelectedId}
                bgImageUrls={["/img/okou_normal.png"]}
                onDrop={() => onDropSlot("slot3")} onTap={() => onTapSlot("slot3")} onTapItem={slots.slot3 ? () => onTapFromSlot("slot3", slots.slot3!) : undefined} onClear={() => onClearSlot("slot3")}
                onDragFromSlot={slots.slot3 ? (e) => onDragFromSlot("slot3", slots.slot3!, e) : undefined}
              />
              <ItemSlot
                itemId={slots.slot4} isOver={isDragOver && dragIsIncense && !!slots.slot3 && !slots.slot4}
                isTapTarget={!!tapSelectedId && !!slots.slot3 && !slots.slot4}
                isTapSelected={tapSelectedId === slots.slot4 && !!slots.slot4}
                hasTapSelected={!!tapSelectedId}
                bgImageUrls={["/img/okou_normal.png"]}
                onDrop={() => onDropSlot("slot4")} onTap={() => onTapSlot("slot4")} onTapItem={slots.slot4 ? () => onTapFromSlot("slot4", slots.slot4!) : undefined} onClear={() => onClearSlot("slot4")}
                onDragFromSlot={slots.slot4 ? (e) => onDragFromSlot("slot4", slots.slot4!, e) : undefined}
              />
              {/* 2回目睡眠用サブレスロット（slot3/slot4 にメインおこうがある場合） */}
              {(slots.slot3 === mainIncenseId || slots.slot4 === mainIncenseId) && (
                <ItemSlot
                  itemId={slots.sableSlot2}
                  isOver={isDragOver && (dragId === "master-sable" || dragId === mainSableId) && !slots.sableSlot2}
                  isTapTarget={(tapSelectedId === "master-sable" || tapSelectedId === mainSableId) && !slots.sableSlot2}
                  isTapSelected={tapSelectedId === slots.sableSlot2 && !!slots.sableSlot2}
                  hasTapSelected={!!tapSelectedId}
                  bgImageUrls={["/img/poke_sable.png"]}
                  count={slots.sableSlot2 === mainSableId ? slots.sableCount2 : undefined}
                  maxCount={sableMax2}
                  onCountChange={slots.sableSlot2 === mainSableId ? onSableCountChange2 : undefined}
                  onDrop={() => onDropSlot("sableSlot2")} onTap={() => onTapSlot("sableSlot2")} onTapItem={slots.sableSlot2 ? () => onTapFromSlot("sableSlot2", slots.sableSlot2!) : undefined} onClear={() => onClearSlot("sableSlot2")}
                  onDragFromSlot={slots.sableSlot2 ? (e) => onDragFromSlot("sableSlot2", slots.sableSlot2!, e) : undefined}
                />
              )}
            </div>
          )}

          {/* 月曜専用スロット */}
          {isMonday && (
            <div className="flex gap-0.5">
              <ItemSlot
                itemId={slots.mondaySlot}
                isOver={isDragOver && dragId === "help-whistle" && !slots.mondaySlot}
                isTapTarget={tapSelectedId === "help-whistle" && !slots.mondaySlot}
                isTapSelected={tapSelectedId === slots.mondaySlot && !!slots.mondaySlot}
                hasTapSelected={!!tapSelectedId}
                monday
                bgImageUrls={[getIncenseById("help-whistle")?.imageUrl ?? ""]}
                count={slots.mondaySlot === "help-whistle" ? slots.mondayWhistleCount : undefined}
                maxCount={whistleMax}
                onCountChange={slots.mondaySlot === "help-whistle" ? onWhistleCountChange : undefined}
                onDrop={() => onDropSlot("mondaySlot")} onTap={() => onTapSlot("mondaySlot")} onTapItem={slots.mondaySlot ? () => onTapFromSlot("mondaySlot", slots.mondaySlot!) : undefined} onClear={() => onClearSlot("mondaySlot")}
                onDragFromSlot={slots.mondaySlot ? (e) => onDragFromSlot("mondaySlot", slots.mondaySlot!, e) : undefined}
              />
              <ItemSlot
                itemId={slots.campSlot}
                isOver={isDragOver && dragId === "good-camp" && !slots.campSlot}
                isTapTarget={tapSelectedId === "good-camp" && !slots.campSlot}
                isTapSelected={tapSelectedId === slots.campSlot && !!slots.campSlot}
                hasTapSelected={!!tapSelectedId}
                monday
                bgImageUrls={[getIncenseById("good-camp")?.imageUrl ?? ""]}
                onDrop={() => onDropSlot("campSlot")} onTap={() => onTapSlot("campSlot")} onTapItem={slots.campSlot ? () => onTapFromSlot("campSlot", slots.campSlot!) : undefined} onClear={() => onClearSlot("campSlot")}
                onDragFromSlot={slots.campSlot ? (e) => onDragFromSlot("campSlot", slots.campSlot!, e) : undefined}
              />
            </div>
          )}

          {/* 持ち越しスロット（最終日 4/19 のみ） */}
          {day.dayIndex === 13 && (
            <div className="flex">
              <div className="ml-auto">
                <ItemSlot
                  itemId={slots.carryoverSlot}
                  isOver={isDragOver && dragId === mainIncenseId && !slots.carryoverSlot}
                  isTapTarget={tapSelectedId === mainIncenseId && !slots.carryoverSlot}
                  isTapSelected={tapSelectedId === slots.carryoverSlot && !!slots.carryoverSlot}
                  hasTapSelected={!!tapSelectedId}
                  label={"持越し"}
                  bgImageUrls={[getIncenseById(mainIncenseId)?.imageUrl ?? ""]}
                  onDrop={() => onDropSlot("carryoverSlot")}
                  onTap={() => onTapSlot("carryoverSlot")}
                  onTapItem={slots.carryoverSlot ? () => onTapFromSlot("carryoverSlot", slots.carryoverSlot!) : undefined}
                  onClear={() => onClearSlot("carryoverSlot")}
                  onDragFromSlot={slots.carryoverSlot ? (e) => onDragFromSlot("carryoverSlot", slots.carryoverSlot!, e) : undefined}
                />
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

// ─── EventBarsOverlay（カレンダーセルに重ねて表示） ───────────

function EventBarsOverlay({
  week,
  calendarEvents,
  activeTooltipId,
  onBarClick,
}: {
  week: number
  calendarEvents: PokeSleepEvent["calendarEvents"]
  activeTooltipId: string | null
  onBarClick: (id: string, x: number, y: number) => void
}) {
  const events = calendarEvents.filter((e: PokeSleepEvent["calendarEvents"][number]) => e.week === week)
  if (events.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {events.map((ev, idx) => (
        <div
          key={ev.id}
          className="absolute inset-x-0 grid gap-1 pointer-events-none"
          style={{ top: `${24 + idx * 22}px`, gridTemplateColumns: "repeat(7, 9rem)" }}
        >
          {ev.colStart > 1 && (
            <div style={{ gridColumn: `span ${ev.colStart - 1}` }} />
          )}
          <div
            style={{ gridColumn: `span ${ev.colSpan}` }}
            className="pointer-events-auto"
          >
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                onBarClick(ev.id, rect.left, rect.bottom)
              }}
              className={cn(
                "w-full h-5 px-1.5 rounded text-[8px] font-semibold transition-all text-left leading-5 flex items-center gap-1",
                ev.barColor, ev.textColor,
                activeTooltipId === ev.id && "ring-1 ring-white/50",
              )}
            >
              <span className="shrink-0 opacity-70 text-[9px]">ⓘ</span>
              <span className="truncate">{ev.name}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
