"use client"

import { useState } from "react"
import { Sparkles, Moon, Star, X } from "lucide-react"
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
  mondaySlot: string | null   // おてつだいホイッスル専用
  campSlot: string | null     // いいキャンプチケット専用
  sableSlot: string | null
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
  effects: { icon: string; label: string; note?: string }[]
}

const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "latias-w1",
    name: "🔵 ラティアスリサーチ（第1週）",
    colStart: 1, colSpan: 7, week: 0,
    barColor: "bg-blue-700/70 hover:bg-blue-600/80",
    textColor: "text-blue-100",
    effects: [
      { icon: "🌀", label: "他の睡眠タイプのポケモン出現" },
      { icon: "🎁", label: "イベントアイテム獲得", note: "1日1回" },
      { icon: "⬆️", label: "ピックアップポケモン出現確率UP" },
      { icon: "🍖", label: "通常おてつだいの食材+1個", note: "スキルとくいのポケモン" },
      { icon: "⚡", label: "メインスキル発生確率 1.25倍" },
      { icon: "📦", label: "最大所持数+8" },
      { icon: "🔼", label: "メインスキルのレベル+2" },
    ],
  },
  {
    id: "latias-w2",
    name: "🔵 ラティアスリサーチ（第2週）",
    colStart: 1, colSpan: 7, week: 1,
    barColor: "bg-indigo-700/70 hover:bg-indigo-600/80",
    textColor: "text-indigo-100",
    effects: [
      { icon: "🌀", label: "他の睡眠タイプのポケモン出現" },
      { icon: "🎁", label: "イベントアイテム獲得", note: "1日1回" },
      { icon: "⬆️", label: "ピックアップポケモン出現確率UP" },
      { icon: "🍖", label: "通常おてつだいの食材+1個", note: "スキルとくいのポケモン" },
      { icon: "🍒", label: "通常おてつだいのきのみ+1個" },
      { icon: "⚡", label: "メインスキル発生確率 1.25倍" },
      { icon: "📦", label: "最大所持数+15" },
      { icon: "🔼", label: "メインスキルのレベル+5" },
      { icon: "🌱", label: "一定エナジーからカビゴン育成開始", note: "大きいカビゴン" },
      { icon: "💤", label: "ねむけパワー 1.5倍", note: "4/19のみ" },
    ],
  },
  {
    id: "newmoon",
    name: "🌑 ニュームーンデー",
    colStart: 4, colSpan: 3, week: 1,  // 4/16(木)〜4/18(土)
    barColor: "bg-indigo-700/70 hover:bg-indigo-600/80",
    textColor: "text-indigo-100",
    effects: [
      { icon: "🌑", label: "幻のポケモン出現", note: "新月の日のみ" },
      { icon: "🍬", label: "おやつ満腹になりづらい", note: "1日1回目のみ" },
      { icon: "✨", label: "色違い出現確率UP" },
      { icon: "💫", label: "FP+3", note: "新月以外の日" },
    ],
  },
]

const EMPTY_SLOTS = (): DaySlots => ({ slot1: null, slot2: null, mondaySlot: null, campSlot: null, sableSlot: null })

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

  // ② ラティアスのおこう（ニュームーンデー優先 → 週末から順に詰めて配置）
  const latiasOrder: DayInfo[] = [
    ...EVENT_DAYS.filter(d => NEWMOON_DAYS.has(d.dayIndex)),
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

export function EventCalendar() {
  // 在庫数（incense id → 個数）
  const [inventory, setInventory] = useState<Record<string, number>>(
    () => Object.fromEntries(INCENSE_MASTERS.map(i => [i.id, 0]))
  )
  // 1日2スロット
  const [daySlots, setDaySlots] = useState<Record<number, DaySlots>>(
    () => Object.fromEntries(EVENT_DAYS.map(d => [d.dayIndex, EMPTY_SLOTS()]))
  )
const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)
  const [isSuggested, setIsSuggested] = useState(false)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)

  // 在庫の配置済み合計（全スロット集計）
  function usedCount(id: string): number {
    return Object.values(daySlots).reduce((sum, s) => {
      return sum
        + (s.slot1 === id ? 1 : 0)
        + (s.slot2 === id ? 1 : 0)
        + (s.mondaySlot === id ? 1 : 0)
        + (s.campSlot === id ? 1 : 0)
        + (s.sableSlot === id ? 1 : 0)
    }, 0)
  }

  function changeQty(id: string, delta: number) {
    setInventory(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))
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
    const slots = daySlots[dayIndex]

    // スロット種別ごとのバリデーション
    if (slot === "slot1" || slot === "slot2") {
      if (!isIncenseItem(dragId)) return                         // おこう以外は拒否
      const other = slot === "slot1" ? slots.slot2 : slots.slot1
      if (other === dragId) return                               // 同一おこう重複禁止
      // ポケモンのおこう ↔ ラティアスのおこう は同時使用不可
      const POKEMON_LATIAS = new Set(["pokemon", "latias"])
      if (POKEMON_LATIAS.has(dragId) && other && POKEMON_LATIAS.has(other)) return
    }
    if (slot === "mondaySlot") {
      if (dragId !== "help-whistle") return                     // ホイッスルのみ
    }
    if (slot === "campSlot") {
      if (dragId !== "good-camp") return                        // キャンプチケットのみ
    }
    if (slot === "sableSlot") {
      if (dragId !== "master-sable") return                      // マスターサブレのみ
    }

    // 在庫チェック
    if (usedCount(dragId) >= (inventory[dragId] ?? 0)) return

    setDaySlots(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [slot]: dragId },
    }))
    setDragId(null)
    setDragOverDay(null)
  }

  function clearSlot(dayIndex: number, slot: keyof DaySlots) {
    setDaySlots(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [slot]: null },
    }))
  }

  const week1 = EVENT_DAYS.slice(0, 7)
  const week2 = EVENT_DAYS.slice(7, 14)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-6">

      {/* ── ヘッダー ── */}
      <header className="relative overflow-hidden px-4 pt-6 pb-3 text-center">
        <div className="absolute top-3 left-6 text-amber-400/50"><Star className="w-3 h-3 fill-current" /></div>
        <div className="absolute top-5 right-10 text-amber-400/30"><Star className="w-2 h-2 fill-current" /></div>
        <div className="absolute top-4 right-1/3 text-slate-500/40"><Moon className="w-4 h-4" /></div>
        <h1 className="text-xl font-bold flex items-center justify-center gap-2 mb-1">
          🔵 ラティアスリサーチ
        </h1>
        <p className="text-xs text-gray-500">
          4/6(月) 〜 4/19(日)
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
            残り14日
          </span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">イベントバーをタップすると効果を確認できます</p>
      </header>

      {/* ── おこう在庫エリア ── */}
      <section className="px-3 mb-3">
        <p className="text-xs text-gray-500 mb-2">
          <span className="font-medium text-gray-700">在庫を入力</span>
          <span className="ml-2 text-gray-400">→ カレンダーのスロットにドラッグ&ドロップで配置</span>
        </p>
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
                onDragEnd={() => setDragId(null)}
                className={cn(
                  "flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border shrink-0 select-none transition-all w-18",
                  canDrag
                    ? "bg-white border-gray-300 cursor-grab active:cursor-grabbing hover:border-blue-400 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-50 cursor-default",
                  dragId === incense.id && "border-blue-400 scale-95 opacity-80"
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
                {/* ステッパー */}
                <div className="flex items-center gap-1">
                  <button
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 text-[10px] leading-none"
                    onClick={() => changeQty(incense.id, -1)}
                  >▼</button>
                  <span className="text-sm font-bold tabular-nums text-gray-800 w-4 text-center">{qty}</span>
                  <button
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 text-[10px] leading-none"
                    onClick={() => changeQty(incense.id, 1)}
                  >▲</button>
                </div>
                {used > 0 && (
                  <span className="text-[8px] text-blue-500">配置:{used}</span>
                )}

              </div>
            )
          })}
        </div>
      </section>

      {/* ── 提案ボタン ── */}
      <div className="px-3 mb-4 flex gap-2">
        <button
          onClick={handleSuggest}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-sm font-semibold shadow-lg shadow-blue-900/40 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          効率的な使用プランを提案
        </button>
        {isSuggested && (
          <button
            onClick={clearPlan}
            className="px-3 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-xs text-gray-600 transition-all"
          >
            クリア
          </button>
        )}
      </div>

      {/* ── カレンダーグリッド ── */}
      <main className="px-2">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
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
          <div className="grid grid-cols-7 gap-1">
            {week1.map(day => (
              <DayCell
                key={day.date}
                day={day}
                slots={daySlots[day.dayIndex]}
                isDragOver={dragOverDay === day.dayIndex}
                dragId={dragId}
                onDragOver={(e) => { e.preventDefault(); setDragOverDay(day.dayIndex) }}
                onDragLeave={() => setDragOverDay(null)}
                onDropSlot={(slot) => onDropSlot(day.dayIndex, slot)}
                onClearSlot={(slot) => clearSlot(day.dayIndex, slot)}
              />
            ))}
          </div>
          <EventBarsOverlay week={0} activeEventId={activeEventId} onToggle={setActiveEventId} />
        </div>

        {/* Week 2（バーをオーバーレイ） */}
        <div className="relative">
        <div className="grid grid-cols-7 gap-1">
          {week2.map(day => (
            <DayCell
              key={day.date}
              day={day}
              slots={daySlots[day.dayIndex]}
              isDragOver={dragOverDay === day.dayIndex}
              dragId={dragId}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(day.dayIndex) }}
              onDragLeave={() => setDragOverDay(null)}
              onDropSlot={(slot) => onDropSlot(day.dayIndex, slot)}
              onClearSlot={(slot) => clearSlot(day.dayIndex, slot)}
            />
          ))}
        </div>
          <EventBarsOverlay week={1} activeEventId={activeEventId} onToggle={setActiveEventId} />
        </div>
      </main>
    </div>
  )
}

// ─── DayCell ──────────────────────────────────────────────

interface DayCellProps {
  day: DayInfo
  slots: DaySlots
  isDragOver: boolean
  dragId: string | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDropSlot: (slot: keyof DaySlots) => void
  onClearSlot: (slot: keyof DaySlots) => void
}

/** 汎用アイテムスロット */
function ItemSlot({
  itemId, isOver, dragId, size = "md", label, bgImageUrls, monday = false, onDrop, onClear,
}: {
  itemId: string | null
  isOver: boolean
  dragId: string | null
  size?: "md" | "sm"
  label?: string
  /** 空スロット時に薄く表示する背景画像URL（複数可） */
  bgImageUrls?: string[]
  /** 月曜専用スロットのスタイルを適用するか */
  monday?: boolean
  onDrop: () => void
  onClear: () => void
}) {
  const item = itemId ? getIncenseById(itemId) : null
  const dim = size === "sm" ? "w-17 h-17" : "w-24 h-24"

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded border transition-all shrink-0",
        dim,
        item
          ? "bg-gray-100 border-gray-300"
          : isOver
            ? "border-blue-400 bg-blue-50 border-dashed"
            : monday
              ? "border-amber-300 border-dashed bg-amber-50"
              : "border-gray-300 border-dashed bg-gray-100",
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
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
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-0.5" draggable={false} />
          <button onClick={onClear} className="absolute -top-1 -right-1 z-20 w-3 h-3 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-500">
            <X className="w-1.5 h-1.5" />
          </button>
        </>
      ) : label ? (
        <span className={cn("relative text-[7px] leading-tight text-center px-0.5", isOver ? "text-blue-500" : monday ? "text-amber-500" : "text-gray-400")}>{isOver ? "↓" : label}</span>
      ) : (
        <span className={cn("relative text-[8px]", isOver ? "text-blue-500" : "text-gray-400")}>{isOver ? "↓" : dragId ? "▾" : ""}</span>
      )}
    </div>
  )
}

function DayCell({
  day, slots, isDragOver, dragId,
  onDragOver, onDragLeave,
  onDropSlot, onClearSlot,
}: DayCellProps) {
  const isSat = day.dayOfWeek === "土"
  const isSun = day.dayOfWeek === "日"
  const isMonday = day.dayOfWeek === "月"
  const hasLatias = slots.slot1 === "latias" || slots.slot2 === "latias"

  // ドラッグ中のアイテムがこのスロットに入れるかどうか
  const dragIsIncense = dragId ? isIncenseItem(dragId) : false
  const dragIsSable   = dragId === "master-sable"

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border p-1 transition-all duration-150",
        "min-h-24 sm:min-h-28",
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

      {/* スロット列 + メモ（横並び） */}
      <div className="flex gap-1 flex-1">
        {/* 左: スロット縦積み */}
        <div className="flex flex-col gap-0.5 shrink-0">
          {/* おこうスロット */}
          <div className="flex gap-0.5">
            <ItemSlot
              itemId={slots.slot1} isOver={isDragOver && dragIsIncense && !slots.slot1}
              dragId={dragIsIncense ? dragId : null}
              size="sm"
              bgImageUrls={["/img/okou_normal.png"]}
              onDrop={() => onDropSlot("slot1")} onClear={() => onClearSlot("slot1")}
            />
            <ItemSlot
              itemId={slots.slot2} isOver={isDragOver && dragIsIncense && !!slots.slot1 && !slots.slot2}
              dragId={dragIsIncense ? dragId : null}
              size="sm"
              bgImageUrls={["/img/okou_normal.png"]}
              onDrop={() => onDropSlot("slot2")} onClear={() => onClearSlot("slot2")}
            />
            {/* マスターサブレスロット（ラティアス配置時のみ） */}
            {hasLatias && (
              <ItemSlot
                itemId={slots.sableSlot} isOver={isDragOver && dragIsSable && !slots.sableSlot}
                dragId={dragIsSable ? dragId : null}
                size="sm" label="サブレ"
                bgImageUrls={[getIncenseById("master-sable")?.imageUrl ?? ""]}
                onDrop={() => onDropSlot("sableSlot")} onClear={() => onClearSlot("sableSlot")}
              />
            )}
          </div>

          {/* 月曜専用スロット */}
          {isMonday && (
            <div className="flex gap-0.5">
              <ItemSlot
                itemId={slots.mondaySlot}
                isOver={isDragOver && dragId === "help-whistle" && !slots.mondaySlot}
                dragId={dragId === "help-whistle" ? dragId : null}
                size="sm" monday
                bgImageUrls={[getIncenseById("help-whistle")?.imageUrl ?? ""]}
                onDrop={() => onDropSlot("mondaySlot")} onClear={() => onClearSlot("mondaySlot")}
              />
              <ItemSlot
                itemId={slots.campSlot}
                isOver={isDragOver && dragId === "good-camp" && !slots.campSlot}
                dragId={dragId === "good-camp" ? dragId : null}
                size="sm" monday
                bgImageUrls={[getIncenseById("good-camp")?.imageUrl ?? ""]}
                onDrop={() => onDropSlot("campSlot")} onClear={() => onClearSlot("campSlot")}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── EventBarsOverlay（カレンダーセルに重ねて表示） ───────────

function EventBarsOverlay({
  week,
  activeEventId,
  onToggle,
}: {
  week: number
  activeEventId: string | null
  onToggle: (id: string | null) => void
}) {
  const events = CALENDAR_EVENTS.filter(e => e.week === week)
  if (events.length === 0) return null

  return (
    // pointer-events-none で下のセルの操作を妨げない
    <div className="absolute inset-0 pointer-events-none z-10">
      {events.map((ev, idx) => (
        // 各バーを top から積み重ねる（1本 = 20px）
        <div
          key={ev.id}
          className="absolute inset-x-0 grid grid-cols-7 gap-1 pointer-events-none"
          style={{ top: `${24 + idx * 22}px` }}
        >
          {/* colStart 前のスペーサー */}
          {ev.colStart > 1 && (
            <div style={{ gridColumn: `span ${ev.colStart - 1}` }} />
          )}

          {/* バー本体 */}
          <div
            style={{ gridColumn: `span ${ev.colSpan}` }}
            className="relative pointer-events-auto"
          >
            <button
              onClick={() => onToggle(activeEventId === ev.id ? null : ev.id)}
              className={cn(
                "w-full h-5 px-1.5 rounded text-[8px] font-semibold truncate transition-all text-left leading-5",
                ev.barColor, ev.textColor,
              )}
            >
              {ev.name}
            </button>

            {/* ツールチップ */}
            {activeEventId === ev.id && (
              <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-xl bg-white border border-gray-200 shadow-xl shadow-black/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800">{ev.name}</span>
                  <button onClick={() => onToggle(null)} className="text-gray-400 hover:text-gray-700">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {ev.effects.map((ef, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-sm leading-none mt-0.5">{ef.icon}</span>
                      <div>
                        <span className="text-[10px] text-gray-700 font-medium">{ef.label}</span>
                        {ef.note && (
                          <span className="ml-1 text-[9px] text-gray-400">({ef.note})</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
