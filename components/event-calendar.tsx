"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { INCENSE_MASTERS, getIncenseById, type IncenseMaster } from "@/lib/data/items"

// ─── 型定義 ────────────────────────────────────────────────

/** おこう系effectType（スロット受付判定用） */
const INCENSE_EFFECT_TYPES = new Set(["energy", "exp", "shard", "pokemon-exp", "chance", "pokemon"])

function isIncenseItem(id: string) {
  const item = getIncenseById(id)
  return item ? INCENSE_EFFECT_TYPES.has(item.effectType) : false
}

/**
 * 1日のスロット構成
 * - slot1/slot2: おこう専用（2個）
 * - mondaySlot:  月曜日のみ / ホイッスル・キャンプチケット専用
 * - sableSlot:   ラティアスのおこう配置時のみ出現 / マスターサブレ専用
 */
interface DaySlots {
  slot1: string | null
  slot2: string | null
  mondaySlot: string | null      // おてつだいホイッスル専用
  mondayWhistleCount: number     // ホイッスルの使用個数（複数可）
  campSlot: string | null        // いいキャンプチケット専用
  sableSlot: string | null       // マスターサブレ or ラティアスサブレ（排他）
  sableCount: number             // ラティアスサブレの使用個数（複数可）
}

interface DayInfo {
  date: number
  dayOfWeek: "月" | "火" | "水" | "木" | "金" | "土" | "日"
  dayIndex: number  // 0〜13
  isToday: boolean
  isWeekend: boolean
  isFriday: boolean
  isEarlyWeek: boolean  // 月〜水
  isLate: boolean       // 8日目以降
}

// ─── 定数 ──────────────────────────────────────────────────

const EVENT_DAYS: DayInfo[] = [
  { date: 6,  dayOfWeek: "月", dayIndex: 0,  isToday: true,  isWeekend: false, isFriday: false, isEarlyWeek: true,  isLate: false },
  { date: 7,  dayOfWeek: "火", dayIndex: 1,  isToday: false, isWeekend: false, isFriday: false, isEarlyWeek: true,  isLate: false },
  { date: 8,  dayOfWeek: "水", dayIndex: 2,  isToday: false, isWeekend: false, isFriday: false, isEarlyWeek: true,  isLate: false },
  { date: 9,  dayOfWeek: "木", dayIndex: 3,  isToday: false, isWeekend: false, isFriday: false, isEarlyWeek: false, isLate: false },
  { date: 10, dayOfWeek: "金", dayIndex: 4,  isToday: false, isWeekend: false, isFriday: true,  isEarlyWeek: false, isLate: false },
  { date: 11, dayOfWeek: "土", dayIndex: 5,  isToday: false, isWeekend: true,  isFriday: false, isEarlyWeek: false, isLate: false },
  { date: 12, dayOfWeek: "日", dayIndex: 6,  isToday: false, isWeekend: true,  isFriday: false, isEarlyWeek: false, isLate: false },
  { date: 13, dayOfWeek: "月", dayIndex: 7,  isToday: false, isWeekend: false, isFriday: false, isEarlyWeek: true,  isLate: true  },
  { date: 14, dayOfWeek: "火", dayIndex: 8,  isToday: false, isWeekend: false, isFriday: false, isEarlyWeek: true,  isLate: true  },
  { date: 15, dayOfWeek: "水", dayIndex: 9,  isToday: false, isWeekend: false, isFriday: false, isEarlyWeek: true,  isLate: true  },
  { date: 16, dayOfWeek: "木", dayIndex: 10, isToday: false, isWeekend: false, isFriday: false, isEarlyWeek: false, isLate: true  },
  { date: 17, dayOfWeek: "金", dayIndex: 11, isToday: false, isWeekend: false, isFriday: true,  isEarlyWeek: false, isLate: true  },
  { date: 18, dayOfWeek: "土", dayIndex: 12, isToday: false, isWeekend: true,  isFriday: false, isEarlyWeek: false, isLate: true  },
  { date: 19, dayOfWeek: "日", dayIndex: 13, isToday: false, isWeekend: true,  isFriday: false, isEarlyWeek: false, isLate: true  },
]

// ─── カレンダーイベントバー定義 ────────────────────────────

interface CalendarEvent {
  id: string
  name: string
  /** グリッド列 start（1始まり） */
  colStart: number
  /** 何列分スパンするか */
  colSpan: number
  /** 属する週（0 = 第1週, 1 = 第2週） */
  week: number
  barColor: string
  textColor: string
  effects: { label: string; note?: string }[]
}

const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "latias-w1",
    name: "ラティアスリサーチ（第1週）",
    colStart: 1, colSpan: 7, week: 0,
    barColor: "bg-red-700/70 hover:bg-red-700/80",
    textColor: "text-blue-100",
    effects: [
      { label: "他の睡眠タイプのポケモン出現" },
      { label: "ピックアップポケモン出現確率UP" },
      { label: "スキルとくい強化", note: "食材+1,メインスキル確率1.25倍,最大所持数+8,メインスキルレベル+2" },
    ],
  },
  {
    id: "latias-w2",
    name: "ラティアスリサーチ（第2週）",
    colStart: 1, colSpan: 7, week: 1,
    barColor: "bg-red-700/70 hover:bg-red-700/80",
    textColor: "text-indigo-100",
    effects: [
      { label: "他の睡眠タイプのポケモン出現" },
      { label: "ピックアップポケモン出現確率UP" },
      { label: "スキルとくい強化", note: "食材+1,きのみ+1,メインスキル確率1.25倍,最大所持数+15,メインスキルレベル+5" },
      { label: "一定エナジーからカビゴン育成開始" },
      { label: "ねむけパワー1.5倍(4/19)"},
    ],
  },
  {
    id: "newmoon",
    name: "ニュームーンデー",
    colStart: 4, colSpan: 3, week: 1,  // 4/16(木)〜4/18(土)
    barColor: "bg-indigo-700/70 hover:bg-indigo-600/80",
    textColor: "text-indigo-100",
    effects: [
      { label: "幻のポケモン出現" },
      { label: "満腹になりづらい", },
      { label: "色違い出現確率UP" },
    ],
  },
]

const EMPTY_SLOTS = (): DaySlots => ({ slot1: null, slot2: null, mondaySlot: null, mondayWhistleCount: 1, campSlot: null, sableSlot: null, sableCount: 1 })

// ─── 提案ロジック ──────────────────────────────────────────

/** ニュームーンデーの dayIndex（4/16木・4/17金・4/18土） */
const NEWMOON_DAYS = new Set([10, 11, 12])

/**
 * 週末から平日へ降順に並べた全14日
 * 土日 → 金 → 木 → 水 → 火 → 月 の順（同曜日は第2週→第1週）
 */
const DAYS_WEEKEND_FIRST: DayInfo[] = (() => {
  const order = ["日", "土", "金", "木", "水", "火", "月"]
  return [...EVENT_DAYS].sort((a, b) => {
    const ai = order.indexOf(a.dayOfWeek)
    const bi = order.indexOf(b.dayOfWeek)
    if (ai !== bi) return ai - bi
    return b.dayIndex - a.dayIndex  // 同曜日は後半（第2週）優先
  })
})()

/** おこうスロット（slot1/slot2）に空きがあれば配置して true を返す */
function placeIncense(plan: Record<number, DaySlots>, dayIndex: number, id: string): boolean {
  const s = plan[dayIndex]
  if (!s.slot1 && s.slot2 !== id) { s.slot1 = id; return true }
  if (!s.slot2 && s.slot1 !== id) { s.slot2 = id; return true }
  return false
}

function generatePlan(
  inventory: Record<string, number>
): Record<number, DaySlots> {
  const plan: Record<number, DaySlots> = {}
  EVENT_DAYS.forEach(d => { plan[d.dayIndex] = EMPTY_SLOTS() })

  const rem = { ...inventory }

  // ① いいキャンプチケット（月曜固定・上限2枚）
  const campDays = [0, 7]  // dayIndex: 4/6(月), 4/13(月)
  for (const di of campDays) {
    if ((rem["good-camp"] ?? 0) <= 0) break
    plan[di].campSlot = "good-camp"
    rem["good-camp"]--
  }

  // ② ラティアスのおこう（ニュームーンデー3日目優先 → 週末から順に詰めて配置）
  const latiasOrder: DayInfo[] = [
    ...EVENT_DAYS.filter(d => NEWMOON_DAYS.has(d.dayIndex)).sort((a, b) => b.dayIndex - a.dayIndex),
    ...DAYS_WEEKEND_FIRST.filter(d => !NEWMOON_DAYS.has(d.dayIndex)),
  ]
  const latiasSeen = new Set<number>()
  for (const day of latiasOrder) {
    if ((rem["latias"] ?? 0) <= 0) break
    if (latiasSeen.has(day.dayIndex)) continue
    latiasSeen.add(day.dayIndex)
    const s = plan[day.dayIndex]
    if (s.slot1 === "pokemon" || s.slot2 === "pokemon") continue
    if (placeIncense(plan, day.dayIndex, "latias")) rem["latias"]--
  }

  // ③ なかよしのおこう（ラティアス配置日を週末から逆算して優先配置）
  for (const day of DAYS_WEEKEND_FIRST) {
    if ((rem["nakayoshi"] ?? 0) <= 0) break
    const s = plan[day.dayIndex]
    const hasLatias = s.slot1 === "latias" || s.slot2 === "latias"
    if (!hasLatias) continue
    if (placeIncense(plan, day.dayIndex, "nakayoshi")) rem["nakayoshi"]--
  }

  // ④ こううんのおこう
  //    優先順: ニュームーンデー → 週末 → ラティアス配置日でなかよしが入らなかった日（代替）
  const kouunOrder: DayInfo[] = [
    // ニュームーンデー（dayIndex昇順）
    ...EVENT_DAYS.filter(d => NEWMOON_DAYS.has(d.dayIndex)),
    // 週末（NEWMOON除く）
    ...DAYS_WEEKEND_FIRST.filter(d => d.isWeekend && !NEWMOON_DAYS.has(d.dayIndex)),
    // ラティアス配置日でなかよしが入っていない平日のみ代替（週末はなかよし優先のため除外）
    ...EVENT_DAYS.filter(d => {
      const s = plan[d.dayIndex]
      const hasLatias = s.slot1 === "latias" || s.slot2 === "latias"
      const hasNakayoshi = s.slot1 === "nakayoshi" || s.slot2 === "nakayoshi"
      return hasLatias && !hasNakayoshi && !d.isWeekend
    }),
    // 残り平日
    ...DAYS_WEEKEND_FIRST.filter(d => !d.isWeekend && !NEWMOON_DAYS.has(d.dayIndex)),
  ]
  const kouunSeen = new Set<number>()
  for (const day of kouunOrder) {
    if ((rem["kouun"] ?? 0) <= 0) break
    if (kouunSeen.has(day.dayIndex)) continue
    kouunSeen.add(day.dayIndex)
    if (placeIncense(plan, day.dayIndex, "kouun")) rem["kouun"]--
  }

  // ⑤ マスターサブレ（ラティアス配置日の最初の1日のみ）
  if ((rem["master-sable"] ?? 0) > 0) {
    const firstLatiasDay = EVENT_DAYS.find(d => {
      const s = plan[d.dayIndex]
      return s.slot1 === "latias" || s.slot2 === "latias"
    })
    if (firstLatiasDay) {
      plan[firstLatiasDay.dayIndex].sableSlot = "master-sable"
      rem["master-sable"]--
    }
  }

  // ⑥ ポケモンのおこう（ラティアスが入っていない日に週末から詰めて配置）
  for (const day of DAYS_WEEKEND_FIRST) {
    if ((rem["pokemon"] ?? 0) <= 0) break
    const s = plan[day.dayIndex]
    if (s.slot1 === "latias" || s.slot2 === "latias") continue  // ラティアスの日は除外
    if (placeIncense(plan, day.dayIndex, "pokemon")) rem["pokemon"]--
  }

  return plan
}

// ─── メインコンポーネント ──────────────────────────────────

const LS_INVENTORY = "latias-inventory"
const LS_SLOTS = "latias-slots"
const LS_MEMO = "latias-memo"

export function EventCalendar() {
  // 在庫数（incense id → 個数）
  const [inventory, setInventory] = useState<Record<string, number>>(
    () => Object.fromEntries(INCENSE_MASTERS.map(i => [i.id, 0]))
  )
  // 1日2スロット
  const [daySlots, setDaySlots] = useState<Record<number, DaySlots>>(
    () => Object.fromEntries(EVENT_DAYS.map(d => [d.dayIndex, EMPTY_SLOTS()]))
  )

  // mount後にlocalStorageから復元（SSRと初期値を一致させてhydration errorを防ぐ）
  useEffect(() => {
    try {
      const inv = localStorage.getItem(LS_INVENTORY)
      if (inv) setInventory(prev => ({ ...prev, ...JSON.parse(inv) }))
    } catch {}
    try {
      const slots = localStorage.getItem(LS_SLOTS)
      if (slots) {
        const parsed = JSON.parse(slots)
        setDaySlots(prev => Object.fromEntries(
          EVENT_DAYS.map(d => [d.dayIndex, { ...prev[d.dayIndex], ...parsed[d.dayIndex] }])
        ))
      }
    } catch {}
  }, [])

  const [memo, setMemo] = useState("")

  // mount後にメモ復元
  useEffect(() => {
    try {
      const m = localStorage.getItem(LS_MEMO)
      if (m !== null) setMemo(m)
    } catch {}
  }, [])

  // 変更のたびにlocalStorageへ保存
  useEffect(() => { localStorage.setItem(LS_INVENTORY, JSON.stringify(inventory)) }, [inventory])
  useEffect(() => { localStorage.setItem(LS_SLOTS, JSON.stringify(daySlots)) }, [daySlots])
  useEffect(() => { localStorage.setItem(LS_MEMO, memo) }, [memo])

const [dragId, setDragId] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<{ dayIndex: number; slot: keyof DaySlots } | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)
  const [isSuggested, setIsSuggested] = useState(false)
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

  // 在庫の配置済み合計（全スロット集計）
  function usedCount(id: string): number {
    return Object.values(daySlots).reduce((sum, s) => {
      return sum
        + (s.slot1 === id ? 1 : 0)
        + (s.slot2 === id ? 1 : 0)
        + (s.mondaySlot === id ? (id === "help-whistle" ? s.mondayWhistleCount : 1) : 0)
        + (s.campSlot === id ? 1 : 0)
        + (s.sableSlot === id ? (id === "latias-sable" ? s.sableCount : 1) : 0)
    }, 0)
  }

  // 提案
  function handleSuggest() {
    setDaySlots(generatePlan(inventory))
    setIsSuggested(true)
  }

  function clearPlan() {
    setDaySlots(Object.fromEntries(EVENT_DAYS.map(d => [d.dayIndex, EMPTY_SLOTS()])))
    setIsSuggested(false)
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
    if (slot === "mondaySlot" && dragId !== "help-whistle") return
    if (slot === "campSlot"   && dragId !== "good-camp")    return
    if (slot === "sableSlot"  && dragId !== "master-sable" && dragId !== "latias-sable") return

    // 在庫チェック（スロットからの移動は使用数-1で判定）
    const effectiveUsed = dragSource ? usedCount(dragId) - 1 : usedCount(dragId)
    if (effectiveUsed >= (inventory[dragId] ?? 0)) return

    setDaySlots(prev => {
      let next = { ...prev, [dayIndex]: { ...prev[dayIndex], [slot]: dragId } }
      // 移動元スロットをクリア
      if (dragSource) {
        next = { ...next, [dragSource.dayIndex]: { ...next[dragSource.dayIndex], [dragSource.slot]: null } }
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
    if (slot === "mondaySlot" && id !== "help-whistle") return
    if (slot === "campSlot"   && id !== "good-camp")    return
    if (slot === "sableSlot"  && id !== "master-sable" && id !== "latias-sable") return

    const effectiveUsed = tapSource ? usedCount(id) - 1 : usedCount(id)
    if (effectiveUsed >= (inventory[id] ?? 0)) return

    setDaySlots(prev => {
      let next = { ...prev, [dayIndex]: { ...prev[dayIndex], [slot]: id } }
      if (tapSource) {
        next = { ...next, [tapSource.dayIndex]: { ...next[tapSource.dayIndex], [tapSource.slot]: null } }
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
    setDaySlots(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [slot]: null,
        ...(slot === "mondaySlot" ? { mondayWhistleCount: 1 } : {}),
        ...(slot === "sableSlot" ? { sableCount: 1 } : {}),
      },
    }))
  }

  function changeSableCount(dayIndex: number, value: number) {
    setDaySlots(prev => {
      const s = prev[dayIndex]
      if (s.sableSlot !== "latias-sable") return prev
      const otherUsed = Object.entries(prev)
        .filter(([di]) => Number(di) !== dayIndex)
        .reduce((sum, [, ds]) => sum + (ds.sableSlot === "latias-sable" ? ds.sableCount : 0), 0)
      const max = (inventory["latias-sable"] ?? 0) - otherUsed
      const newCount = Math.max(1, Math.min(max, value))
      return { ...prev, [dayIndex]: { ...s, sableCount: newCount } }
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

  const week1 = EVENT_DAYS.slice(0, 7)
  const week2 = EVENT_DAYS.slice(7, 14)

  return (
    <>
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-6" onClick={(e) => {
      if (tapSelectedId && !(e.target as HTMLElement).closest("[data-tap-item]")) { setTapSelectedId(null); setTapSource(null) }
    }}>
      <div className="mx-auto" style={{ maxWidth: "calc(7 * 9rem + 2rem)" }}>

      {/* ── ヘッダー ── */}
      <header className="px-4 pt-4 pb-3 text-center">
        <h1 className="text-lg font-bold text-gray-800 mb-0.5">ラティアスリサーチ スケジューラー</h1>
        <p className="text-xs text-gray-500">
          4/6(月) 〜 4/19(日)
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">残り14日</span>
        </p>
      </header>

      {/* ── おこう在庫エリア ── */}
      <section className="px-4 mb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">在庫を入力</span>
            <span className="ml-2 text-gray-400">→ 提案ボタンで配置 → タップでカスタマイズ</span>
          </p>
          <button
            onClick={() => setInventory(Object.fromEntries(INCENSE_MASTERS.map(i => [i.id, 0])))}
            className="text-[10px] text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 rounded px-2 py-0.5 transition-colors whitespace-nowrap"
          >
            在庫をリセット
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {INCENSE_MASTERS.map(incense => {
            const qty = inventory[incense.id] ?? 0
            const used = usedCount(incense.id)
            const canDrag = qty > 0 && used < qty
            return (
              <div
                key={incense.id}
                draggable={canDrag}
                onDragStart={(e) => {
                  setDragId(incense.id)
                  // ドラッグ中に表示するカスタム画像を設定
                  const img = new Image()
                  img.src = incense.imageUrl
                  img.width = 48
                  img.height = 48
                  e.dataTransfer.setDragImage(img, 24, 24)
                }}
                onDragEnd={() => { setDragId(null); setDragSource(null) }}
                data-tap-item
                onClick={() => {
                  if (!canDrag) return
                  setTapSelectedId(prev => prev === incense.id ? null : incense.id)
                }}
                className={cn(
                  "flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border shrink-0 select-none transition-all w-18",
                  canDrag
                    ? "bg-white border-gray-300 cursor-grab active:cursor-grabbing hover:border-blue-400 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-50 cursor-default",
                  dragId === incense.id && "border-blue-400 scale-95 opacity-80",
                  tapSelectedId === incense.id && "border-blue-500 ring-2 ring-blue-300 scale-95"
                )}
              >
                {/* アイテム画像 */}
                <img
                  src={incense.imageUrl}
                  alt={incense.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                  draggable={false}
                />
                <span className="text-[8px] text-gray-600 leading-tight w-full text-center line-clamp-2">
                  {incense.name}
                </span>
                {/* 個数セレクト */}
                <select
                  value={qty}
                  onChange={(e) => setInventory(prev => ({ ...prev, [incense.id]: Number(e.target.value) }))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-xs font-bold text-center text-gray-800 bg-gray-50 border border-gray-200 rounded py-0.5 focus:outline-none focus:border-blue-400"
                  style={{ textAlignLast: "center" }}
                >
                  {Array.from({ length: (incense.id === "good-camp" ? 2 : 99) + 1 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <span className={cn("text-[8px] text-blue-500", used === 0 && "invisible")}>配置:{used}</span>

              </div>
            )
          })}
          </div>
      </section>

      {/* ── ボタンエリア ── */}
      <div className="px-4 mb-2 flex gap-2">
        <button
          onClick={handleSuggest}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-b from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">おすすめ使用日提案</span>
        </button>
        <button
          onClick={clearPlan}
          className={cn(
            "flex items-center px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 shadow-sm transition-colors whitespace-nowrap",
            !isSuggested && "invisible pointer-events-none"
          )}
        >
          <span className="text-xs font-semibold">クリア</span>
        </button>
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
                  const img = new Image(); img.src = getIncenseById(itemId)?.imageUrl ?? ""
                  e.dataTransfer.setDragImage(img, 20, 20)
                }}
                onTapFromSlot={(slot, itemId) => onTapFromSlot(day.dayIndex, slot, itemId)}
                onWhistleCountChange={(value) => changeMondayWhistleCount(day.dayIndex, value)}
                whistleMax={(() => {
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.mondaySlot === "help-whistle" ? ds.mondayWhistleCount : 0), 0)
                  return Math.max(1, (inventory["help-whistle"] ?? 0) - otherUsed)
                })()}
                onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
                sableMax={(() => {
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === "latias-sable" ? ds.sableCount : 0), 0)
                  return Math.max(1, (inventory["latias-sable"] ?? 0) - otherUsed)
                })()}
              />
            ))}
          </div>
          <EventBarsOverlay week={0} activeTooltipId={activeTooltip?.id ?? null} onBarClick={(id, x, y) => setActiveTooltip(prev => prev?.id === id ? null : { id, x, y })} />
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
                const img = new Image(); img.src = getIncenseById(itemId)?.imageUrl ?? ""
                e.dataTransfer.setDragImage(img, 20, 20)
              }}
              onWhistleCountChange={(value) => changeMondayWhistleCount(day.dayIndex, value)}
              whistleMax={(() => {
                const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.mondaySlot === "help-whistle" ? ds.mondayWhistleCount : 0), 0)
                return Math.max(1, (inventory["help-whistle"] ?? 0) - otherUsed)
              })()}
              onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
              sableMax={(() => {
                const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === "latias-sable" ? ds.sableCount : 0), 0)
                return Math.max(1, (inventory["latias-sable"] ?? 0) - otherUsed)
              })()}
            />
          ))}
        </div>
          <EventBarsOverlay week={1} activeTooltipId={activeTooltip?.id ?? null} onBarClick={(id, x, y) => setActiveTooltip(prev => prev?.id === id ? null : { id, x, y })} />
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
          const ev = CALENDAR_EVENTS.find(e => e.id === activeTooltip.id)
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
}

/** 汎用アイテムスロット */
function ItemSlot({
  itemId, isOver, isTapTarget, isTapSelected, hasTapSelected, label, bgImageUrls, monday = false, onDrop, onTap, onTapItem, onClear, onDragFromSlot,
}: {
  itemId: string | null
  isOver: boolean
  isTapTarget?: boolean
  isTapSelected?: boolean
  hasTapSelected?: boolean
  label?: string
  bgImageUrls?: string[]
  monday?: boolean
  onDrop: () => void
  onTap: () => void
  onTapItem?: () => void
  onClear: () => void
  onDragFromSlot?: (e: React.DragEvent) => void
}) {
  const [localOver, setLocalOver] = useState(false)
  const item = itemId ? getIncenseById(itemId) : null

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded border transition-all w-10 h-10 shrink-0",
        item
          ? isTapSelected
            ? "bg-blue-100 border-blue-400 ring-2 ring-blue-300"
            : itemId === "latias"
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
      {/* 空スロット時の薄い背景画像（複数ある場合は左右に並べる） */}
      {!item && bgImageUrls && bgImageUrls.length > 0 && (
        <div className="absolute inset-0 flex">
          {bgImageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="flex-1 object-contain p-0.5 opacity-20"
              draggable={false}
            />
          ))}
        </div>
      )}

      {item ? (
        <>
          <img
            src={item.imageUrl} alt={item.name}
            className={cn("w-full h-full object-contain p-0.5", onDragFromSlot && "cursor-grab active:cursor-grabbing")}
            draggable={!!onDragFromSlot}
            onDragStart={onDragFromSlot}
          />
          <button onClick={(e) => { e.stopPropagation(); onClear() }} className="absolute -top-2 -right-2 z-20 w-4 h-4 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-500 text-xs">
            <X className="w-1.5 h-1.5" />
          </button>
        </>
      ) : label ? (
        <span className={cn("relative text-[7px] leading-tight text-center px-0.5", localOver ? "text-blue-500" : monday ? "text-amber-500" : "text-gray-400")}>{localOver ? "↓" : label}</span>
      ) : (
        <span className={cn("relative text-[8px]", localOver ? "text-blue-500" : "text-gray-400")}>{localOver ? "↓" : ""}</span>
      )}
    </div>
  )
}

function DayCell({
  day, slots, isDragOver, dragId, tapSelectedId,
  onDragOver, onDragLeave,
  onDropSlot, onTapSlot, onTapFromSlot, onClearSlot, onDragFromSlot, onWhistleCountChange, whistleMax, onSableCountChange, sableMax,
}: DayCellProps) {
  const isSat = day.dayOfWeek === "土"
  const isSun = day.dayOfWeek === "日"
  const isMonday = day.dayOfWeek === "月"
  const hasLatias = slots.slot1 === "latias" || slots.slot2 === "latias"

  // ドラッグ中のアイテムがこのスロットに入れるかどうか
  const dragIsIncense = dragId ? isIncenseItem(dragId) : false

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border p-1 transition-all duration-150",
        day.isToday && "border-blue-500 bg-blue-50",
        !day.isToday && isSat && "border-sky-300 bg-sky-50",
        !day.isToday && isSun && "border-rose-300 bg-rose-50",
        !day.isToday && !isSat && !isSun && "border-gray-200 bg-white",
        isDragOver && "border-blue-400 bg-blue-50 scale-[1.02]",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* 日付 */}
      <div className="flex items-center justify-between mb-1">
        <span className={cn("text-xs font-bold", isSun && "text-rose-500", isSat && "text-sky-600", !isSat && !isSun && "text-gray-700")}>
          {day.date}
        </span>
        {day.isToday && <span className="text-[8px] px-1 py-0.5 bg-blue-500 text-white rounded font-bold">今日</span>}
      </div>

      {/* イベントバー用の予約スペース（EventBarsOverlay がここに重なる） */}
      <div className="h-14 shrink-0" />

      {/* スロット */}
      <div className="flex flex-col gap-0.5">
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
            {/* サブレスロット（ラティアス配置時のみ・マスターサブレorラティアスサブレ排他） */}
            {hasLatias && (
              <div className="flex flex-col items-center gap-0.5">
                <ItemSlot
                  itemId={slots.sableSlot}
                  isOver={isDragOver && (dragId === "master-sable" || dragId === "latias-sable") && !slots.sableSlot}
                  isTapTarget={(tapSelectedId === "master-sable" || tapSelectedId === "latias-sable") && !slots.sableSlot}
                  isTapSelected={tapSelectedId === slots.sableSlot && !!slots.sableSlot}
                  hasTapSelected={!!tapSelectedId}
                  bgImageUrls={["/img/poke_sable.png"]}
                  onDrop={() => onDropSlot("sableSlot")} onTap={() => onTapSlot("sableSlot")} onTapItem={slots.sableSlot ? () => onTapFromSlot("sableSlot", slots.sableSlot!) : undefined} onClear={() => onClearSlot("sableSlot")}
                  onDragFromSlot={slots.sableSlot ? (e) => onDragFromSlot("sableSlot", slots.sableSlot!, e) : undefined}
                />
                <select
                  value={slots.sableCount}
                  onChange={(e) => onSableCountChange(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className={cn("w-10 text-[9px] font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded py-0.5 focus:outline-none focus:border-blue-400", slots.sableSlot !== "latias-sable" && "invisible")}
                  style={{ textAlignLast: "center" }}
                >
                  {Array.from({ length: sableMax }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 月曜専用スロット */}
          {isMonday && (
            <div className="flex gap-0.5">
              <div className="flex flex-col items-center gap-0.5">
                <ItemSlot
                  itemId={slots.mondaySlot}
                  isOver={isDragOver && dragId === "help-whistle" && !slots.mondaySlot}
                  isTapTarget={tapSelectedId === "help-whistle" && !slots.mondaySlot}
                  isTapSelected={tapSelectedId === slots.mondaySlot && !!slots.mondaySlot}
                  hasTapSelected={!!tapSelectedId}
                  monday
                  bgImageUrls={[getIncenseById("help-whistle")?.imageUrl ?? ""]}
                  onDrop={() => onDropSlot("mondaySlot")} onTap={() => onTapSlot("mondaySlot")} onTapItem={slots.mondaySlot ? () => onTapFromSlot("mondaySlot", slots.mondaySlot!) : undefined} onClear={() => onClearSlot("mondaySlot")}
                  onDragFromSlot={slots.mondaySlot ? (e) => onDragFromSlot("mondaySlot", slots.mondaySlot!, e) : undefined}
                />
                <select
                  value={slots.mondayWhistleCount}
                  onChange={(e) => onWhistleCountChange(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className={cn("w-10 text-[9px] font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded py-0.5 focus:outline-none focus:border-blue-400", slots.mondaySlot !== "help-whistle" && "invisible")}
                  style={{ textAlignLast: "center" }}
                >
                  {Array.from({ length: whistleMax }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
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
      </div>
    </div>
  )
}

// ─── EventBarsOverlay（カレンダーセルに重ねて表示） ───────────

function EventBarsOverlay({
  week,
  activeTooltipId,
  onBarClick,
}: {
  week: number
  activeTooltipId: string | null
  onBarClick: (id: string, x: number, y: number) => void
}) {
  const events = CALENDAR_EVENTS.filter(e => e.week === week)
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
