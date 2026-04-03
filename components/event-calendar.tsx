"use client"

import { useState, useRef } from "react"
import { Check, Sparkles, Moon, Star, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── 型定義 ────────────────────────────────────────────────

type EffectType = "candy" | "exp" | "shard" | "energy" | "other"

interface InventoryItem {
  id: string
  name: string
  icon: string
  effectType: EffectType
  quantity: number
  /** 土日優先（馬効果対象） */
  preferWeekend: boolean
  /** イベント後半（8日目〜）に集中 */
  preferLate: boolean
  /** 週末前日（金）に使う */
  preferFriday: boolean
  /** 毎日均等に使う */
  spreadEvenly: boolean
}

interface PlacedItem {
  itemId: string
  quantity: number
}

interface DayInfo {
  date: number   // 6〜19
  dayOfWeek: "月" | "火" | "水" | "木" | "金" | "土" | "日"
  dayIndex: number  // 0〜13
  isToday: boolean
  isWeekend: boolean
  isFriday: boolean
  isLate: boolean   // 8日目以降
}

// ─── 定数 ──────────────────────────────────────────────────

const EVENT_DAYS: DayInfo[] = [
  { date: 6,  dayOfWeek: "月", dayIndex: 0,  isToday: true,  isWeekend: false, isFriday: false, isLate: false },
  { date: 7,  dayOfWeek: "火", dayIndex: 1,  isToday: false, isWeekend: false, isFriday: false, isLate: false },
  { date: 8,  dayOfWeek: "水", dayIndex: 2,  isToday: false, isWeekend: false, isFriday: false, isLate: false },
  { date: 9,  dayOfWeek: "木", dayIndex: 3,  isToday: false, isWeekend: false, isFriday: false, isLate: false },
  { date: 10, dayOfWeek: "金", dayIndex: 4,  isToday: false, isWeekend: false, isFriday: true,  isLate: false },
  { date: 11, dayOfWeek: "土", dayIndex: 5,  isToday: false, isWeekend: true,  isFriday: false, isLate: false },
  { date: 12, dayOfWeek: "日", dayIndex: 6,  isToday: false, isWeekend: true,  isFriday: false, isLate: false },
  { date: 13, dayOfWeek: "月", dayIndex: 7,  isToday: false, isWeekend: false, isFriday: false, isLate: true  },
  { date: 14, dayOfWeek: "火", dayIndex: 8,  isToday: false, isWeekend: false, isFriday: false, isLate: true  },
  { date: 15, dayOfWeek: "水", dayIndex: 9,  isToday: false, isWeekend: false, isFriday: false, isLate: true  },
  { date: 16, dayOfWeek: "木", dayIndex: 10, isToday: false, isWeekend: false, isFriday: false, isLate: true  },
  { date: 17, dayOfWeek: "金", dayIndex: 11, isToday: false, isWeekend: false, isFriday: true,  isLate: true  },
  { date: 18, dayOfWeek: "土", dayIndex: 12, isToday: false, isWeekend: true,  isFriday: false, isLate: true  },
  { date: 19, dayOfWeek: "日", dayIndex: 13, isToday: false, isWeekend: true,  isFriday: false, isLate: true  },
]

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "candy",  name: "タイプレス飴", icon: "🍬", effectType: "candy",  quantity: 12, preferWeekend: true,  preferLate: false, preferFriday: false, spreadEvenly: false },
  { id: "shard",  name: "ゆめのかけら", icon: "💎", effectType: "shard",  quantity: 20, preferWeekend: false, preferLate: true,  preferFriday: false, spreadEvenly: false },
  { id: "energy", name: "げんきチャージS", icon: "⚡", effectType: "energy", quantity: 5,  preferWeekend: false, preferLate: false, preferFriday: true,  spreadEvenly: false },
  { id: "exp",    name: "おこうクラシック", icon: "🕯️", effectType: "exp",   quantity: 7,  preferWeekend: false, preferLate: false, preferFriday: false, spreadEvenly: true  },
]

const EVENT_EFFECTS = [
  { icon: "✨", label: "睡眠EXP 2倍",         color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { icon: "🍖", label: "食材ボーナス +50%",    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { icon: "💎", label: "ゆめのかけら 1.5倍",  color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { icon: "🐴", label: "馬効果: タイプレス飴 2倍（土日）", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
]

// ─── 提案ロジック ──────────────────────────────────────────

function generatePlan(
  inventory: InventoryItem[]
): Record<number, PlacedItem[]> {
  // dayIndex → PlacedItem[]
  const plan: Record<number, PlacedItem[]> = {}
  EVENT_DAYS.forEach(d => { plan[d.dayIndex] = [] })

  const weekendDays = EVENT_DAYS.filter(d => d.isWeekend)
  const fridayDays  = EVENT_DAYS.filter(d => d.isFriday)
  const lateDays    = EVENT_DAYS.filter(d => d.isLate)
  const allDays     = EVENT_DAYS

  for (const item of inventory) {
    if (item.quantity === 0) continue
    let remaining = item.quantity

    let targets: DayInfo[]
    if (item.preferWeekend) targets = weekendDays
    else if (item.preferFriday) targets = fridayDays
    else if (item.preferLate) targets = lateDays
    else targets = allDays

    if (targets.length === 0) targets = allDays

    // ラウンドロビンで割り当て
    let i = 0
    while (remaining > 0) {
      const day = targets[i % targets.length]
      const existing = plan[day.dayIndex].find(p => p.itemId === item.id)
      if (existing) {
        existing.quantity++
      } else {
        plan[day.dayIndex].push({ itemId: item.id, quantity: 1 })
      }
      remaining--
      i++
    }
  }

  return plan
}

// ─── メインコンポーネント ──────────────────────────────────

export function EventCalendar() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY)
  const [dayPlans, setDayPlans] = useState<Record<number, PlacedItem[]>>(() => {
    const init: Record<number, PlacedItem[]> = {}
    EVENT_DAYS.forEach(d => { init[d.dayIndex] = [] })
    return init
  })
  const [completed, setCompleted] = useState<Record<number, boolean>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)
  const [isSuggested, setIsSuggested] = useState(false)
  const noteInputRef = useRef<HTMLInputElement>(null)

  // 在庫の消費済み合計
  function usedCount(itemId: string): number {
    return Object.values(dayPlans).reduce((sum, placed) => {
      const found = placed.find(p => p.itemId === itemId)
      return sum + (found?.quantity ?? 0)
    }, 0)
  }

  // 在庫ステッパー
  function changeQty(itemId: string, delta: number) {
    setInventory(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ))
  }

  // 提案ボタン
  function handleSuggest() {
    const plan = generatePlan(inventory)
    setDayPlans(plan)
    setIsSuggested(true)
  }

  function clearPlan() {
    const empty: Record<number, PlacedItem[]> = {}
    EVENT_DAYS.forEach(d => { empty[d.dayIndex] = [] })
    setDayPlans(empty)
    setIsSuggested(false)
  }

  // D&D handlers
  function onDragStart(itemId: string) {
    setDragItemId(itemId)
  }

  function onDrop(dayIndex: number) {
    if (!dragItemId) return
    const item = inventory.find(i => i.id === dragItemId)
    if (!item) return
    const alreadyUsed = usedCount(dragItemId)
    if (alreadyUsed >= item.quantity) return  // 在庫切れ

    setDayPlans(prev => {
      const dayItems = [...(prev[dayIndex] ?? [])]
      const existing = dayItems.find(p => p.itemId === dragItemId)
      if (existing) {
        existing.quantity++
        return { ...prev, [dayIndex]: dayItems }
      }
      return { ...prev, [dayIndex]: [...dayItems, { itemId: dragItemId, quantity: 1 }] }
    })
    setDragItemId(null)
    setDragOverDay(null)
  }

  function removePlaced(dayIndex: number, itemId: string) {
    setDayPlans(prev => ({
      ...prev,
      [dayIndex]: (prev[dayIndex] ?? []).filter(p => p.itemId !== itemId),
    }))
  }

  function changePlacedQty(dayIndex: number, itemId: string, delta: number) {
    setDayPlans(prev => {
      const dayItems = [...(prev[dayIndex] ?? [])]
      const existing = dayItems.find(p => p.itemId === itemId)
      if (!existing) return prev
      const next = existing.quantity + delta
      if (next <= 0) {
        return { ...prev, [dayIndex]: dayItems.filter(p => p.itemId !== itemId) }
      }
      existing.quantity = next
      return { ...prev, [dayIndex]: dayItems }
    })
  }

  const week1 = EVENT_DAYS.slice(0, 7)
  const week2 = EVENT_DAYS.slice(7, 14)

  return (
    <div className="min-h-screen bg-[#0F172A] text-white pb-6">

      {/* ── ヘッダー ── */}
      <header className="relative overflow-hidden px-4 pt-6 pb-3 text-center">
        <div className="absolute top-3 left-6 text-amber-400/50"><Star className="w-3 h-3 fill-current" /></div>
        <div className="absolute top-6 right-10 text-amber-400/30"><Star className="w-2 h-2 fill-current" /></div>
        <div className="absolute top-4 right-1/3 text-slate-500/40"><Moon className="w-4 h-4" /></div>
        <h1 className="text-xl font-bold flex items-center justify-center gap-2 mb-1">
          🌙 春のコロコロイベント
        </h1>
        <p className="text-xs text-slate-400">
          4/6(月) 〜 4/19(日)
          <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
            残り{14 - Object.values(completed).filter(Boolean).length}日
          </span>
        </p>
        {/* 効果バナー */}
        <div className="flex gap-2 overflow-x-auto pb-1 mt-3 scrollbar-hide justify-start">
          {EVENT_EFFECTS.map((e, i) => (
            <span key={i} className={cn("inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-full border whitespace-nowrap shrink-0", e.color)}>
              {e.icon} {e.label}
            </span>
          ))}
        </div>
      </header>

      {/* ── アイテム在庫エリア ── */}
      <section className="px-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">在庫アイテム</span>
          <span className="text-[10px] text-slate-500">（カレンダーにドラッグ&ドロップで配置）</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {inventory.map(item => {
            const used = usedCount(item.id)
            const remaining = item.quantity - used
            const isEmpty = remaining <= 0
            return (
              <div
                key={item.id}
                draggable={!isEmpty}
                onDragStart={() => onDragStart(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border shrink-0 select-none transition-all",
                  "min-w-19",
                  isEmpty
                    ? "bg-slate-800/30 border-slate-700/30 opacity-40 cursor-not-allowed"
                    : "bg-slate-800/80 border-slate-600/60 cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:bg-slate-700/80"
                )}
              >
                {/* アイコン */}
                <span className="text-2xl leading-none">{item.icon}</span>
                {/* 名前 */}
                <span className="text-[9px] text-slate-300 text-center leading-tight whitespace-nowrap">{item.name}</span>
                {/* ステッパー */}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    className="w-5 h-4 flex items-center justify-center text-slate-400 hover:text-white text-xs leading-none"
                    onClick={() => changeQty(item.id, 1)}
                  >▲</button>
                  <span className={cn("text-sm font-bold tabular-nums", isEmpty ? "text-slate-500" : "text-white")}>
                    {item.quantity}
                  </span>
                  <button
                    className="w-5 h-4 flex items-center justify-center text-slate-400 hover:text-white text-xs leading-none"
                    onClick={() => changeQty(item.id, -1)}
                  >▼</button>
                </div>
                {/* 消費済み表示 */}
                {used > 0 && (
                  <span className="text-[9px] text-blue-400 font-medium">配置: {used}</span>
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
          効率的な消費プランを提案
        </button>
        {isSuggested && (
          <button
            onClick={clearPlan}
            className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-all"
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
              i === 5 && "text-blue-400",
              i === 6 && "text-rose-400",
              i < 5 && "text-slate-400",
            )}>
              {d}
            </div>
          ))}
        </div>

        {/* Week 1 */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {week1.map(day => (
            <DayCell
              key={day.date}
              day={day}
              placed={dayPlans[day.dayIndex] ?? []}
              inventory={inventory}
              completed={!!completed[day.dayIndex]}
              note={notes[day.dayIndex] ?? ""}
              isEditingNote={editingNote === day.dayIndex}
              isDragOver={dragOverDay === day.dayIndex}
              noteInputRef={editingNote === day.dayIndex ? noteInputRef : null}
              onToggleComplete={() => setCompleted(p => ({ ...p, [day.dayIndex]: !p[day.dayIndex] }))}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(day.dayIndex) }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={() => onDrop(day.dayIndex)}
              onRemovePlaced={(itemId) => removePlaced(day.dayIndex, itemId)}
              onChangePlacedQty={(itemId, delta) => changePlacedQty(day.dayIndex, itemId, delta)}
              onClickNote={() => setEditingNote(editingNote === day.dayIndex ? null : day.dayIndex)}
              onNoteChange={(v) => setNotes(p => ({ ...p, [day.dayIndex]: v }))}
              onNoteBlur={() => setEditingNote(null)}
            />
          ))}
        </div>

        {/* Week 2 */}
        <div className="grid grid-cols-7 gap-1">
          {week2.map(day => (
            <DayCell
              key={day.date}
              day={day}
              placed={dayPlans[day.dayIndex] ?? []}
              inventory={inventory}
              completed={!!completed[day.dayIndex]}
              note={notes[day.dayIndex] ?? ""}
              isEditingNote={editingNote === day.dayIndex}
              isDragOver={dragOverDay === day.dayIndex}
              noteInputRef={editingNote === day.dayIndex ? noteInputRef : null}
              onToggleComplete={() => setCompleted(p => ({ ...p, [day.dayIndex]: !p[day.dayIndex] }))}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(day.dayIndex) }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={() => onDrop(day.dayIndex)}
              onRemovePlaced={(itemId) => removePlaced(day.dayIndex, itemId)}
              onChangePlacedQty={(itemId, delta) => changePlacedQty(day.dayIndex, itemId, delta)}
              onClickNote={() => setEditingNote(editingNote === day.dayIndex ? null : day.dayIndex)}
              onNoteChange={(v) => setNotes(p => ({ ...p, [day.dayIndex]: v }))}
              onNoteBlur={() => setEditingNote(null)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

// ─── DayCell ──────────────────────────────────────────────

interface DayCellProps {
  day: DayInfo
  placed: PlacedItem[]
  inventory: InventoryItem[]
  completed: boolean
  note: string
  isEditingNote: boolean
  isDragOver: boolean
  noteInputRef: React.RefObject<HTMLInputElement> | null
  onToggleComplete: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: () => void
  onRemovePlaced: (itemId: string) => void
  onChangePlacedQty: (itemId: string, delta: number) => void
  onClickNote: () => void
  onNoteChange: (v: string) => void
  onNoteBlur: () => void
}

function DayCell({
  day, placed, inventory, completed, note,
  isEditingNote, isDragOver, noteInputRef,
  onToggleComplete, onDragOver, onDragLeave, onDrop,
  onRemovePlaced, onChangePlacedQty,
  onClickNote, onNoteChange, onNoteBlur,
}: DayCellProps) {
  const isSat = day.dayOfWeek === "土"
  const isSun = day.dayOfWeek === "日"

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border min-h-27.5 sm:min-h-32.5 p-1.5 transition-all duration-150",
        day.isToday && "border-blue-500 bg-blue-950/40",
        !day.isToday && isSat && "border-blue-700/50 bg-blue-950/20",
        !day.isToday && isSun && "border-rose-700/50 bg-rose-950/20",
        !day.isToday && !isSat && !isSun && "border-slate-700/50 bg-slate-800/40",
        completed && "opacity-60",
        isDragOver && "border-blue-400 bg-blue-900/30 scale-[1.02] shadow-lg shadow-blue-900/30",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 日付 */}
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-xs sm:text-sm font-bold",
          isSun && "text-rose-400",
          isSat && "text-blue-400",
          !isSat && !isSun && "text-slate-300",
        )}>
          {day.date}
        </span>
        {day.isToday && (
          <span className="text-[8px] px-1 py-0.5 bg-blue-500 text-white rounded font-bold">今日</span>
        )}
      </div>

      {/* 配置アイテム */}
      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
        {placed.length === 0 && (
          <span className="text-[9px] text-slate-600 italic">ドロップ</span>
        )}
        {placed.map(p => {
          const item = inventory.find(i => i.id === p.itemId)
          if (!item) return null
          return (
            <div key={p.itemId} className="flex items-center gap-0.5 group">
              <span className="text-xs leading-none">{item.icon}</span>
              <div className="flex items-center gap-0.5">
                <button
                  className="text-[9px] text-slate-500 hover:text-white leading-none px-0.5"
                  onClick={() => onChangePlacedQty(p.itemId, -1)}
                >－</button>
                <span className="text-[10px] font-semibold text-slate-200 tabular-nums">{p.quantity}</span>
                <button
                  className="text-[9px] text-slate-500 hover:text-white leading-none px-0.5"
                  onClick={() => onChangePlacedQty(p.itemId, 1)}
                >＋</button>
              </div>
              <button
                className="ml-auto opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity"
                onClick={() => onRemovePlaced(p.itemId)}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* メモ */}
      {isEditingNote ? (
        <input
          ref={noteInputRef}
          autoFocus
          className="w-full text-[9px] bg-slate-700 border border-slate-500 rounded px-1 py-0.5 text-slate-200 outline-none mt-0.5"
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
        />
      ) : (
        <div
          className="text-[9px] text-slate-500 truncate mt-0.5 cursor-pointer hover:text-slate-400"
          onClick={onClickNote}
        >
          {note || "メモ..."}
        </div>
      )}

      {/* 完了チェック */}
      <button
        onClick={onToggleComplete}
        className={cn(
          "absolute bottom-1 right-1 w-4 h-4 rounded border flex items-center justify-center transition-all",
          completed ? "bg-emerald-500 border-emerald-500" : "border-slate-600 hover:border-emerald-400"
        )}
      >
        {completed && <Check className="w-2.5 h-2.5 text-white" />}
      </button>
    </div>
  )
}
