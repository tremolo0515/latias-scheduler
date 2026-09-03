"use client"

import { useState, useEffect, useRef, Fragment } from "react"
import { createPortal } from "react-dom"
import { X, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { INCENSE_MASTERS, getIncenseById } from "@/lib/data/items"
import { EVENTS, buildEventDays, type PokeSleepEvent, type ExchangeShopEntry } from "@/lib/data/events"
import type { DayInfo } from "@/lib/types/calendar"
import { isIncenseItem, EMPTY_SLOTS, lsKey, type DaySlots } from "./types"
import { InventoryTile } from "./InventoryTile"
import { DayCell } from "./DayCell"
import { DayRow } from "./DayRow"
import { EventBarsOverlay } from "./EventBarsOverlay"
import { CalendarOverview } from "./CalendarOverview"

export function EventCalendar() {
  // ── イベント切り替え ──
  const [eventIndex, setEventIndex] = useState(EVENTS.length - 1)
  const currentEvent: PokeSleepEvent = EVENTS[eventIndex]
  const eventDays: DayInfo[] = buildEventDays(currentEvent)
  // サブレスロットを出現させるおこうIDセット（mainIncenseId + sableIncenseIds）
  const sableIncenseSet = new Set([currentEvent.mainIncenseId, ...(currentEvent.sableIncenseIds ?? [])])
  const eventItems = INCENSE_MASTERS.filter(i => currentEvent.itemIds.includes(i.id))
  const currencyName = currentEvent.currencyName ?? "うもう"
  const currencyIcon = currentEvent.currencyIcon ?? "🪶"

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

  // 持込アイテム（運営配布等）: inventory と完全独立
  const [carryIn, setCarryIn] = useState<Record<string, number>>(() =>
    Object.fromEntries((currentEvent.carryInItems ?? []).map(ci => [ci.itemId, 0]))
  )
  useEffect(() => {
    try {
      const saved = localStorage.getItem(lsKey(currentEvent.id, "carryIn"))
      const empty = Object.fromEntries((currentEvent.carryInItems ?? []).map(ci => [ci.itemId, 0]))
      setCarryIn(saved ? { ...empty, ...JSON.parse(saved) } : empty)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent.id])
  useEffect(() => {
    localStorage.setItem(lsKey(currentEvent.id, "carryIn"), JSON.stringify(carryIn))
  }, [carryIn, currentEvent.id])

  const [lockedDays, setLockedDays] = useState<Set<number>>(new Set())

  useEffect(() => {
    try {
      const saved = localStorage.getItem(lsKey(currentEvent.id, "lockedDays"))
      setLockedDays(saved ? new Set(JSON.parse(saved)) : new Set())
    } catch {}
  }, [currentEvent.id])
  useEffect(() => {
    localStorage.setItem(lsKey(currentEvent.id, "lockedDays"), JSON.stringify([...lockedDays]))
  }, [lockedDays, currentEvent.id])

  function toggleLock(dayIndex: number) {
    setLockedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayIndex)) next.delete(dayIndex)
      else next.add(dayIndex)
      return next
    })
  }

  const [memo, setMemo] = useState("")
  const [dayMemos, setDayMemos] = useState<Record<number, string>>(
    () => Object.fromEntries(eventDays.map(d => [d.dayIndex, ""]))
  )

  // mount後にメモ復元
  useEffect(() => {
    try {
      const m = localStorage.getItem(lsKey(currentEvent.id, "memo"))
      setMemo(m ?? "")
    } catch {}
    try {
      const dm = localStorage.getItem(lsKey(currentEvent.id, "dayMemos"))
      const empty = Object.fromEntries(eventDays.map(d => [d.dayIndex, ""]))
      setDayMemos(dm ? { ...empty, ...JSON.parse(dm) } : empty)
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
  useEffect(() => {
    localStorage.setItem(lsKey(currentEvent.id, "dayMemos"), JSON.stringify(dayMemos))
  }, [dayMemos, currentEvent.id])

  // ── 交換所: 各エントリの交換済み回数 (key: `weekIdx-entryIdx`) ──
  const [shopCounts, setShopCounts] = useState<Record<string, number>>({})
  // イベント切替時にlocalStorageから復元
  useEffect(() => {
    try {
      const s = localStorage.getItem(lsKey(currentEvent.id, "shop"))
      setShopCounts(s ? JSON.parse(s) : {})
    } catch { setShopCounts({}) }
  }, [currentEvent.id])
  useEffect(() => {
    localStorage.setItem(lsKey(currentEvent.id, "shop"), JSON.stringify(shopCounts))
  }, [shopCounts, currentEvent.id])

  /** 交換所の個数変更 → 在庫に反映 */
  function handleShopCount(weekIdx: number, entryIdx: number, entry: ExchangeShopEntry, newVal: number) {
    const key = `${weekIdx}-${entryIdx}`
    const prev = shopCounts[key] ?? 0
    const delta = newVal - prev
    setShopCounts(c => ({ ...c, [key]: newVal }))
    if (entry.itemId && delta !== 0) {
      setInventory(inv => ({
        ...inv,
        [entry.itemId!]: Math.max(0, (inv[entry.itemId!] ?? 0) + delta * entry.itemQty),
      }))
      if (delta > 0) flashItem(entry.itemId)
    }
  }

  // ── 在庫: wiggleアニメーション用カウンター (itemId → increment key) ──
  // key が変わると InventoryTile が再マウントされ、CSS animation が確実に再生される
  const [wiggleKeys, setWiggleKeys] = useState<Record<string, number>>({})
  function flashItem(id: string) {
    setWiggleKeys(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<{ dayIndex: number; slot: keyof DaySlots } | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)

  const [showOverview, setShowOverview] = useState(false)

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


  // 交換所で交換した合計うもう数（スロット配置とは無関係）
  const totalUmou = (currentEvent.umouShop?.weeks ?? []).flatMap((week, wi) =>
    week.entries.map((entry, ei) => (shopCounts[`${wi}-${ei}`] ?? 0) * entry.umouCost)
  ).reduce((a, b) => a + b, 0)

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
  // 残り日数（今日含む・イベント本体14日間のみカウント）
  const remainingDays = todayDayIndex >= 0 && todayDayIndex < 14 ? 14 - todayDayIndex : 0

  // 在庫の配置済み合計（全スロット集計）
  const mainSableId = currentEvent.umouPrices.mainSableId
  function usedCount(id: string): number {
    return Object.values(daySlots).reduce((sum, s) => {
      return sum
        + (s.slot1 === id ? 1 : 0)
        + (s.slot2 === id ? 1 : 0)
        + (s.slot3 === id ? 1 : 0)
        + (s.slot4 === id ? 1 : 0)
        + (s.sableSlot === id ? (id === mainSableId ? s.sableCount : 1) : 0)
        + (s.sableSlot2 === id ? (id === mainSableId ? s.sableCount2 : 1) : 0)
        + (s.carryoverSlot === id ? 1 : 0)
        + (s.carryoverSlot2 === id ? 1 : 0)
    }, 0)
  }

  // inventory + carryIn の合計在庫数
  function totalStock(id: string): number {
    return (inventory[id] ?? 0) + (carryIn[id] ?? 0)
  }

  function clearPlan() {
    setDaySlots(prev => Object.fromEntries(
      eventDays.map(d => [d.dayIndex, lockedDays.has(d.dayIndex) ? prev[d.dayIndex] : EMPTY_SLOTS()])
    ))
  }

  // D&D: スロットにドロップ
  function onDropSlot(dayIndex: number, slot: keyof DaySlots) {
    if (!dragId) return
    if (lockedDays.has(dayIndex)) return

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
      const POKEMON_LATIAS = new Set(["pokemon", ...sableIncenseSet])
      if (POKEMON_LATIAS.has(dragId) && other && POKEMON_LATIAS.has(other)) return
    }
    if (slot === "slot3" || slot === "slot4") {
      if (!isIncenseItem(dragId)) return
      if (!slots.splitSleep) return
      const other = slot === "slot3" ? slots.slot4 : slots.slot3
      if (other === dragId) return
      const POKEMON_LATIAS = new Set(["pokemon", ...sableIncenseSet])
      if (POKEMON_LATIAS.has(dragId) && other && POKEMON_LATIAS.has(other)) return
    }
    const curMainId = currentEvent.mainIncenseId
    const curSableId = currentEvent.umouPrices.mainSableId
    if (slot === "sableSlot"      && dragId !== "master-sable" && dragId !== curSableId) return
    if (slot === "sableSlot2"     && dragId !== "master-sable" && dragId !== curSableId) return
    if (slot === "carryoverSlot"  && dragId !== curMainId) return
    if (slot === "carryoverSlot"  && dayIndex !== 16) return
    if (slot === "carryoverSlot2" && !sableIncenseSet.has(dragId)) return
    if (slot === "carryoverSlot2" && dragId === curMainId) return  // mainは carryoverSlot へ
    if (slot === "carryoverSlot2" && dayIndex !== 16) return

    // 在庫チェック（スロットからの移動は使用数-1で判定）
    const effectiveUsed = dragSource ? usedCount(dragId) - 1 : usedCount(dragId)
    if (effectiveUsed >= totalStock(dragId)) return

    setDaySlots(prev => {
      let next = { ...prev, [dayIndex]: { ...prev[dayIndex], [slot]: dragId } }
      // 移動元スロットをクリア
      if (dragSource) {
        const srcDay = next[dragSource.dayIndex]
        const srcUpdate: Partial<DaySlots> = { [dragSource.slot]: null }
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
    if (lockedDays.has(dayIndex)) return
    const id = tapSelectedId
    const slots = daySlots[dayIndex]

    // 同じスロットをタップしたらキャンセル
    if (tapSource && tapSource.dayIndex === dayIndex && tapSource.slot === slot) {
      setTapSelectedId(null); setTapSource(null); return
    }

    const targetItem = slots[slot as keyof DaySlots] as string | null

    // ターゲットスロットにアイテムがある場合はスワップ（移動元がある場合のみ）
    if (targetItem && tapSource) {
      const POKEMON_LATIAS = new Set(["pokemon", ...sableIncenseSet])
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
      const POKEMON_LATIAS = new Set(["pokemon", ...sableIncenseSet])
      if (POKEMON_LATIAS.has(id) && other && POKEMON_LATIAS.has(other)) return
    }
    if (slot === "slot3" || slot === "slot4") {
      if (!isIncenseItem(id)) return
      if (!slots.splitSleep) return
      const other = slot === "slot3" ? slots.slot4 : slots.slot3
      if (other === id) return
      const POKEMON_LATIAS = new Set(["pokemon", ...sableIncenseSet])
      if (POKEMON_LATIAS.has(id) && other && POKEMON_LATIAS.has(other)) return
    }
    const curMainId = currentEvent.mainIncenseId
    const curSableId = currentEvent.umouPrices.mainSableId
    if (slot === "sableSlot"      && id !== "master-sable" && id !== curSableId) return
    if (slot === "sableSlot2"     && id !== "master-sable" && id !== curSableId) return
    if (slot === "carryoverSlot"  && id !== curMainId) return
    if (slot === "carryoverSlot"  && dayIndex !== 16) return
    if (slot === "carryoverSlot2" && !sableIncenseSet.has(id)) return
    if (slot === "carryoverSlot2" && id === curMainId) return  // mainは carryoverSlot へ
    if (slot === "carryoverSlot2" && dayIndex !== 16) return

    const effectiveUsed = tapSource ? usedCount(id) - 1 : usedCount(id)
    if (effectiveUsed >= totalStock(id)) return

    setDaySlots(prev => {
      let next = { ...prev, [dayIndex]: { ...prev[dayIndex], [slot]: id } }
      if (tapSource) {
        const srcDay = next[tapSource.dayIndex]
        const srcUpdate: Partial<DaySlots> = { [tapSource.slot]: null }
        next = { ...next, [tapSource.dayIndex]: { ...srcDay, ...srcUpdate } }
      }
      return next
    })
    setTapSelectedId(null)
    setTapSource(null)
  }

  function onTapFromSlot(dayIndex: number, slot: keyof DaySlots, itemId: string) {
    if (lockedDays.has(dayIndex)) return
    setTapSelectedId(itemId)
    setTapSource({ dayIndex, slot })
  }

  // D&D: バッグエリアにドロップ → スロットからアイテムを除去
  function onDropToBag() {
    if (!dragSource) { setDragId(null); setDragSource(null); setDragOverDay(null); return }
    const { dayIndex, slot } = dragSource
    const sid = currentEvent.umouPrices.mainSableId
    const s = daySlots[dayIndex]
    // 複数配置スロットで count ≥ 2 の場合は -1、それ以外は clearSlot
    if (slot === "sableSlot" && s.sableSlot === sid && s.sableCount >= 2) {
      setDaySlots(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], sableCount: prev[dayIndex].sableCount - 1 } }))
    } else if (slot === "sableSlot2" && s.sableSlot2 === sid && s.sableCount2 >= 2) {
      setDaySlots(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], sableCount2: prev[dayIndex].sableCount2 - 1 } }))
    } else {
      clearSlot(dayIndex, slot)
    }
    setDragId(null); setDragSource(null); setDragOverDay(null)
  }

  function clearSlot(dayIndex: number, slot: keyof DaySlots) {
    if (lockedDays.has(dayIndex)) return
    setDaySlots(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [slot]: null,
        ...(slot === "sableSlot" ? { sableCount: 1 } : {}),
        ...(slot === "sableSlot2" ? { sableCount2: 1 } : {}),
      },
    }))
  }

  function changeSableCount(dayIndex: number, value: number) {
    if (lockedDays.has(dayIndex)) return
    const sid = currentEvent.umouPrices.mainSableId
    setDaySlots(prev => {
      const s = prev[dayIndex]
      if (s.sableSlot !== sid) return prev
      const otherUsed = Object.entries(prev)
        .filter(([di]) => Number(di) !== dayIndex)
        .reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
      const selfOther = s.sableSlot2 === sid ? s.sableCount2 : 0
      const max = totalStock(sid) - otherUsed - selfOther
      const newCount = Math.max(1, Math.min(max, value))
      return { ...prev, [dayIndex]: { ...s, sableCount: newCount } }
    })
  }

  function changeSableCount2(dayIndex: number, value: number) {
    if (lockedDays.has(dayIndex)) return
    const sid = currentEvent.umouPrices.mainSableId
    setDaySlots(prev => {
      const s = prev[dayIndex]
      if (s.sableSlot2 !== sid) return prev
      const otherUsed = Object.entries(prev)
        .filter(([di]) => Number(di) !== dayIndex)
        .reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
      const selfOther = s.sableSlot === sid ? s.sableCount : 0
      const max = totalStock(sid) - otherUsed - selfOther
      const newCount = Math.max(1, Math.min(max, value))
      return { ...prev, [dayIndex]: { ...s, sableCount2: newCount } }
    })
  }

  const week1 = eventDays.slice(0, 7)
  const week2 = eventDays.slice(7, 14)
  const week3 = eventDays.slice(14, 17)  // イベント後: 月〜火(おこう設置可) + 水(持ち越しのみ)
  // イベント後の行にバー（グッドスリープデー等）があるか。行の高さを揃えるため全セルに渡す
  const week3HasBars = currentEvent.calendarEvents.some(ev => ev.week === 2)

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

      {/* ── 在庫エリア ── */}
      <section className="mb-2 flex flex-col gap-1.5">

        {/* 上段: うもう交換所 + その他 を1枚のカードに統合（スマホでは縦並び） */}
        <div className="flex flex-col md:flex-row rounded-xl border border-gray-200 bg-white overflow-hidden">

          {/* うもう交換所 */}
          <div className="flex-1 min-w-0 p-2 border-b md:border-b-0 md:border-r border-black/6">
            {currentEvent.umouShop ? (<>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-purple-700">{currencyIcon} {currencyName}交換所</p>
                  {currentEvent.umouShop.provisional && (
                    // TODO: 公式発表の確定ラインナップに更新したら、この仮バッジとumouShop.provisional指定を削除する
                    <span
                      className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 py-0.5 leading-none"
                      title="ラインナップ・価格は未発表のため、過去イベント同等の値で仮置きしています"
                    >
                      仮
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs font-bold text-purple-800">{totalUmou.toLocaleString()}</span>
                    <span className="text-[10px] text-purple-500">{currencyIcon}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (!window.confirm(`${currencyName}交換所をリセットしますか？\n交換済み数と在庫への加算分がすべて消えます。`)) return
                      // shopCounts をリセット → 在庫から交換所加算分を差し引く
                      const shop = currentEvent.umouShop!
                      setInventory(inv => {
                        const next = { ...inv }
                        shop.weeks.forEach((week, wi) => {
                          week.entries.forEach((entry, ei) => {
                            const val = shopCounts[`${wi}-${ei}`] ?? 0
                            if (entry.itemId && val > 0) {
                              next[entry.itemId] = Math.max(0, (next[entry.itemId] ?? 0) - val * entry.itemQty)
                            }
                          })
                        })
                        return next
                      })
                      setShopCounts({})
                    }}
                    className="text-[9px] text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 rounded px-1.5 py-0.5 transition-colors whitespace-nowrap"
                  >リセット</button>
                </div>
              </div>
              {(() => {
                // 全週のエントリをフラット化して displayOrder でソート
                const allEntries = currentEvent.umouShop.weeks.flatMap((week, wi) =>
                  week.entries.map((entry, ei) => ({ entry, wi, ei }))
                ).sort((a, b) => {
                  const oa = a.entry.displayOrder ?? 999
                  const ob = b.entry.displayOrder ?? 999
                  return oa - ob
                })
                // アイテムIDが変わる境界を検出して区切りを入れる
                let prevItemId: string | null | undefined = undefined
                return (
                  <div className="grid items-center" style={{ gridTemplateColumns: "1.25rem auto auto 1fr 1.25rem auto 1.25rem", rowGap: "3px", columnGap: "10px" }}>
                    {allEntries.map(({ entry, wi, ei }) => {
                      const key = `${wi}-${ei}`
                      const val = shopCounts[key] ?? 0
                      const item = entry.itemId ? getIncenseById(entry.itemId) : null
                      const showDivider = prevItemId !== undefined && prevItemId !== entry.itemId
                      prevItemId = entry.itemId
                      const weekSuffix = entry.discounted ? (wi === 0 ? "割引1週目" : "割引2週目") : null
                      return (<Fragment key={key}>
                        {showDivider && <div className="col-span-7 h-px bg-gray-100 my-0.5" />}
                        {item
                          ? <img src={item.imageUrl} alt={item.name} width={20} height={20} className="w-5 h-5 object-contain" />
                          : <span />
                        }
                        <span className="text-[13px] text-gray-600 leading-tight whitespace-nowrap" title={entry.label}>{entry.label}</span>
                        <span className="text-[13px] text-purple-400 whitespace-nowrap">{entry.umouCost}{currencyIcon}{weekSuffix && <span className="text-gray-400 text-[11px]">（{weekSuffix}）</span>}</span>
                        <span />
                        <button onClick={() => handleShopCount(wi, ei, entry, Math.max(0, val - 1))}
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 text-[13px] font-bold leading-none">－</button>
                        <span className="text-[13px] font-bold text-gray-800 text-center">{val}<span className="text-gray-400 font-bold">/{entry.maxCount}</span></span>
                        <button onClick={() => handleShopCount(wi, ei, entry, Math.min(entry.maxCount, val + 1))}
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 text-[13px] font-bold leading-none">＋</button>
                      </Fragment>)
                    })}
                  </div>
                )
              })()}
            </>) : (
              <p className="text-[9px] text-gray-400">データなし</p>
            )}
          </div>

          {/* その他アイテム */}
          <div className="flex-1 min-w-0 p-2">
            {(() => {
              const shopItemIds = new Set(
                (currentEvent.umouShop?.weeks ?? []).flatMap(w => w.entries.map(e => e.itemId)).filter(Boolean)
              )
              const otherItems = eventItems.filter(i => !shopItemIds.has(i.id))
              // 持込アイテム（交換所に載っているが別枠でその他に表示するもの）
              const carryInItems = (currentEvent.carryInItems ?? []).map(ci => ({
                item: getIncenseById(ci.itemId)!,
                max: ci.max,
                label: ci.label ?? "持込",
              })).filter(ci => ci.item)
              const allOtherIds = [
                ...carryInItems.map(ci => ci.item.id),
                ...otherItems.map(i => i.id),
              ]
              return (<>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-600">その他どうぐ</p>
                  <button
                    onClick={() => {
                      if (!window.confirm("その他どうぐをリセットしますか？\n全アイテムの在庫が0になります。")) return
                      setInventory(prev => {
                        const next = { ...prev }
                        allOtherIds.forEach(id => { next[id] = 0 })
                        return next
                      })
                    }}
                    className="text-[9px] text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 rounded px-1.5 py-0.5 transition-colors whitespace-nowrap"
                  >リセット</button>
                </div>
                {/* 持込アイテム（うもう合計に影響しない） */}
                {carryInItems.map(({ item, max, label }) => {
                  const qty = carryIn[item.id] ?? 0
                  return (
                    <div key={`carryin-${item.id}`} className="flex items-center gap-1 py-0.5">
                      <img src={item.imageUrl} alt={item.name} width={20} height={20} className="w-5 h-5 object-contain shrink-0" />
                      <span className="text-[13px] text-gray-600 flex-1 leading-tight line-clamp-1 min-w-0">{item.name}<span className="text-[10px] text-gray-400 ml-0.5">（{label}）</span></span>
                      <button onClick={() => setCarryIn(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 text-[13px] font-bold leading-none shrink-0">－</button>
                      <span className="text-[13px] font-bold text-gray-800 w-5 text-center shrink-0">{qty}</span>
                      <button onClick={() => { setCarryIn(prev => ({ ...prev, [item.id]: Math.min(max, qty + 1) })); flashItem(item.id) }}
                        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 text-[13px] font-bold leading-none shrink-0">＋</button>
                    </div>
                  )
                })}
                {/* 通常のその他アイテム */}
                {otherItems.map(item => {
                  const qty = inventory[item.id] ?? 0
                  const max = item.maxStock ?? 14
                  return (
                    <div key={item.id} className="flex items-center gap-1 py-0.5">
                      <img src={item.imageUrl} alt={item.name} width={20} height={20} className="w-5 h-5 object-contain shrink-0" />
                      <span className="text-[13px] text-gray-600 flex-1 leading-tight line-clamp-1 min-w-0">{item.name}</span>
                      <button onClick={() => setInventory(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 text-[13px] font-bold leading-none shrink-0">－</button>
                      <span className="text-[13px] font-bold text-gray-800 w-5 text-center shrink-0">{qty}</span>
                      <button onClick={() => { setInventory(prev => ({ ...prev, [item.id]: Math.min(max, qty + 1) })); flashItem(item.id) }}
                        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 text-[13px] font-bold leading-none shrink-0">＋</button>
                    </div>
                  )
                })}
              </>)
            })()}
          </div>
        </div>

      </section>

      {/* ── バッグ（スロットからのD&Dドロップ先） ── */}
      {/* section の外に出すことで sticky が flex コンテナに阻まれない */}
      <div
        className={cn(
          "px-3 py-2 transition-colors mx-4 mb-2 rounded-xl border",
          "sticky top-2 z-20",
          "md:static",
          dragSource ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-gray-50/95",
        )}
        onDragOver={(e) => { if (dragSource) e.preventDefault() }}
        onDrop={() => onDropToBag()}
      >
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] font-medium text-gray-500">バッグ <span className="text-gray-400">— タップ or ドラッグで配置</span></p>
          <button
            onClick={() => { if (window.confirm("ロックされていないスロットを空にしますか？")) clearPlan() }}
            className="text-[9px] text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 rounded px-1.5 py-0.5 transition-colors whitespace-nowrap"
          >
            バッグに戻す
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {eventItems.map(incense => {
            const qty = totalStock(incense.id)
            const used = usedCount(incense.id)
            const remaining = qty - used
            const isOverflow = used > qty
            const canDrag = remaining > 0
            if (remaining <= 0 && !isOverflow) return null
            return (
              <InventoryTile
                key={`${incense.id}-${wiggleKeys[incense.id] ?? 0}-${isOverflow ? "ov" : ""}`}
                incense={incense}
                remaining={Math.max(0, remaining)}
                canDrag={canDrag}
                isDragging={dragId === incense.id}
                isTapSelected={tapSelectedId === incense.id}
                isOverflow={isOverflow}
                onDragStart={(e) => {
                  setDragId(incense.id)
                  const imgEl = (e.currentTarget as HTMLElement).querySelector('img')
                  if (imgEl) e.dataTransfer.setDragImage(imgEl, 16, 16)
                }}
                onDragEnd={() => { setDragId(null); setDragSource(null) }}
                onTap={() => { if (canDrag) setTapSelectedId(prev => prev === incense.id ? null : incense.id) }}
              />
            )
          })}
        </div>
      </div>


      {/* ── カレンダーグリッド ── */}
      {/* ── カレンダー: デスクトップ（7列グリッド） ── */}
      <main
        className="hidden md:block overflow-x-auto"
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
                  if (lockedDays.has(day.dayIndex)) return
                  setDragId(itemId)
                  setDragSource({ dayIndex: day.dayIndex, slot })
                  e.dataTransfer.setDragImage(e.target as Element, 20, 20)
                }}
                onTapFromSlot={(slot, itemId) => onTapFromSlot(day.dayIndex, slot, itemId)}
                onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
                sableMax={(() => {
                  const sid = currentEvent.umouPrices.mainSableId
                  const s = daySlots[day.dayIndex]
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                  return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot2 === sid ? s.sableCount2 : 0))
                })()}
                onSableCountChange2={(value) => changeSableCount2(day.dayIndex, value)}
                sableMax2={(() => {
                  const sid = currentEvent.umouPrices.mainSableId
                  const s = daySlots[day.dayIndex]
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                  return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot === sid ? s.sableCount : 0))
                })()}
                todayDayIndex={todayDayIndex}
                onToggleSplitSleep={() => setDaySlots(prev => ({
                  ...prev,
                  [day.dayIndex]: { ...prev[day.dayIndex], splitSleep: !prev[day.dayIndex].splitSleep, slot3: null, slot4: null }
                }))}
                mainIncenseId={currentEvent.mainIncenseId}
                mainSableId={currentEvent.umouPrices.mainSableId}
                sableIncenseSet={sableIncenseSet}
                sableIncenseIds={currentEvent.sableIncenseIds ?? []}
                dayMemo={dayMemos[day.dayIndex] ?? ""}
                onDayMemoChange={(v) => setDayMemos(prev => ({ ...prev, [day.dayIndex]: v }))}
                isLocked={lockedDays.has(day.dayIndex)}
                onToggleLock={() => toggleLock(day.dayIndex)}
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
                  if (lockedDays.has(day.dayIndex)) return
                  setDragId(itemId)
                  setDragSource({ dayIndex: day.dayIndex, slot })
                  e.dataTransfer.setDragImage(e.target as Element, 20, 20)
                }}
                onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
                sableMax={(() => {
                  const sid = currentEvent.umouPrices.mainSableId
                  const s = daySlots[day.dayIndex]
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                  return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot2 === sid ? s.sableCount2 : 0))
                })()}
                onSableCountChange2={(value) => changeSableCount2(day.dayIndex, value)}
                sableMax2={(() => {
                  const sid = currentEvent.umouPrices.mainSableId
                  const s = daySlots[day.dayIndex]
                  const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                  return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot === sid ? s.sableCount : 0))
                })()}
                todayDayIndex={todayDayIndex}
                onToggleSplitSleep={() => setDaySlots(prev => ({
                  ...prev,
                  [day.dayIndex]: { ...prev[day.dayIndex], splitSleep: !prev[day.dayIndex].splitSleep, slot3: null, slot4: null }
                }))}
                mainIncenseId={currentEvent.mainIncenseId}
                mainSableId={currentEvent.umouPrices.mainSableId}
                sableIncenseSet={sableIncenseSet}
                sableIncenseIds={currentEvent.sableIncenseIds ?? []}
                dayMemo={dayMemos[day.dayIndex] ?? ""}
                onDayMemoChange={(v) => setDayMemos(prev => ({ ...prev, [day.dayIndex]: v }))}
                isLocked={lockedDays.has(day.dayIndex)}
                onToggleLock={() => toggleLock(day.dayIndex)}
              />
            ))}
          </div>
          <EventBarsOverlay week={1} calendarEvents={currentEvent.calendarEvents} activeTooltipId={activeTooltip?.id ?? null} onBarClick={(id, x, y) => setActiveTooltip(prev => prev?.id === id ? null : { id, x, y })} />
        </div>

        {/* Week 3（イベント後: 月〜木）。イベント期間をまたぐバー（グッドスリープデー等）をオーバーレイ */}
        <div className="relative mt-1">
        <div className="grid gap-1 items-stretch" style={{ gridTemplateColumns: "repeat(7, 9rem)" }}>
          {week3.map(day => (
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
              hasEventBar={week3HasBars}
              onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
              sableMax={(() => {
                const sid = currentEvent.umouPrices.mainSableId
                const s = daySlots[day.dayIndex]
                const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot2 === sid ? s.sableCount2 : 0))
              })()}
              onSableCountChange2={(value) => changeSableCount2(day.dayIndex, value)}
              sableMax2={(() => {
                const sid = currentEvent.umouPrices.mainSableId
                const s = daySlots[day.dayIndex]
                const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot === sid ? s.sableCount : 0))
              })()}
              todayDayIndex={todayDayIndex}
              onToggleSplitSleep={() => setDaySlots(prev => ({
                ...prev,
                [day.dayIndex]: { ...prev[day.dayIndex], splitSleep: !prev[day.dayIndex].splitSleep, slot3: null, slot4: null }
              }))}
              mainIncenseId={currentEvent.mainIncenseId}
              mainSableId={currentEvent.umouPrices.mainSableId}
              sableIncenseSet={sableIncenseSet}
              sableIncenseIds={currentEvent.sableIncenseIds ?? []}
              dayMemo={dayMemos[day.dayIndex] ?? ""}
              onDayMemoChange={(v) => setDayMemos(prev => ({ ...prev, [day.dayIndex]: v }))}
              isLocked={lockedDays.has(day.dayIndex)}
              onToggleLock={() => toggleLock(day.dayIndex)}
            />
          ))}
        </div>
          <EventBarsOverlay week={2} calendarEvents={currentEvent.calendarEvents} activeTooltipId={activeTooltip?.id ?? null} onBarClick={(id, x, y) => setActiveTooltip(prev => prev?.id === id ? null : { id, x, y })} />
        </div>

        {/* ── メモエリア（デスクトップ） ── */}
        <div className="mt-2 pb-6">
          <p className="text-xs text-gray-500 mb-2"><span className="font-medium text-gray-700">全体メモ</span></p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="自由にメモできます"
            className="w-full min-h-40 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder-gray-300 resize-y focus:outline-none focus:border-blue-400 leading-relaxed"
          />
        </div>
        </div>
      </main>

      {/* ── カレンダー: スマホ（縦リスト） ── */}
      <main className="block md:hidden px-3">
        {[
          { label: "第1週", days: week1, weekIdx: 0 },
          { label: "第2週", days: week2, weekIdx: 1 },
          { label: "イベント後", days: week3, weekIdx: 2 },
        ].map(({ label, days, weekIdx }) => {
          // この週に表示するイベントバー
          const weekBars = currentEvent.calendarEvents.filter(ev => ev.week === weekIdx)
          return (
          <section key={label} className="mb-3">
            {/* 週ラベル + イベントバッジ */}
            <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">{label}</h2>
              {weekBars.map(ev => {
                // 全日（colSpan=7）かどうか
                const isFullWeek = ev.colSpan === 7
                // 部分バーの場合、該当する日付を取得
                const dateLabel = isFullWeek ? null : (() => {
                  const startDayIndex = weekIdx * 7 + (ev.colStart - 1)
                  const endDayIndex   = startDayIndex + ev.colSpan - 1
                  const startDay = eventDays[startDayIndex]
                  const endDay   = eventDays[endDayIndex]
                  if (!startDay) return null
                  return startDay.date === endDay?.date
                    ? `${startDay.date}日`
                    : `${startDay.date}〜${endDay?.date}日`
                })()
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setActiveTooltip(prev => prev?.id === ev.id ? null : { id: ev.id, x: rect.left, y: rect.bottom })
                    }}
                    className={cn(
                      "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold leading-none transition-all",
                      ev.barColor, ev.textColor,
                      activeTooltip?.id === ev.id && "ring-1 ring-white/60",
                    )}
                  >
                    <span className="opacity-70">ⓘ</span>
                    <span>{ev.name}</span>
                    {dateLabel && <span className="opacity-80 ml-0.5">({dateLabel})</span>}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-1.5">
              {days.map(day => (
                <DayRow
                  key={day.date}
                  day={day}
                  slots={daySlots[day.dayIndex]}
                  isDragOver={false}
                  dragId={null}
                  tapSelectedId={tapSelectedId}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => {}}
                  onDropSlot={(slot) => onDropSlot(day.dayIndex, slot)}
                  onTapSlot={(slot) => onTapSlot(day.dayIndex, slot)}
                  onTapFromSlot={(slot, itemId) => onTapFromSlot(day.dayIndex, slot, itemId)}
                  onClearSlot={(slot) => clearSlot(day.dayIndex, slot)}
                  onDragFromSlot={() => {}}
                  onSableCountChange={(value) => changeSableCount(day.dayIndex, value)}
                  sableMax={(() => {
                    const sid = currentEvent.umouPrices.mainSableId
                    const s = daySlots[day.dayIndex]
                    const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                    return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot2 === sid ? s.sableCount2 : 0))
                  })()}
                  onSableCountChange2={(value) => changeSableCount2(day.dayIndex, value)}
                  sableMax2={(() => {
                    const sid = currentEvent.umouPrices.mainSableId
                    const s = daySlots[day.dayIndex]
                    const otherUsed = Object.entries(daySlots).filter(([di]) => Number(di) !== day.dayIndex).reduce((sum, [, ds]) => sum + (ds.sableSlot === sid ? ds.sableCount : 0) + (ds.sableSlot2 === sid ? ds.sableCount2 : 0), 0)
                    return Math.max(1, totalStock(sid) - otherUsed - (s.sableSlot === sid ? s.sableCount : 0))
                  })()}
                  todayDayIndex={todayDayIndex}
                  onToggleSplitSleep={() => setDaySlots(prev => ({
                    ...prev,
                    [day.dayIndex]: { ...prev[day.dayIndex], splitSleep: !prev[day.dayIndex].splitSleep, slot3: null, slot4: null }
                  }))}
                  mainIncenseId={currentEvent.mainIncenseId}
                  mainSableId={currentEvent.umouPrices.mainSableId}
                  sableIncenseSet={sableIncenseSet}
                  sableIncenseIds={currentEvent.sableIncenseIds ?? []}
                  dayMemo={dayMemos[day.dayIndex] ?? ""}
                  onDayMemoChange={(v) => setDayMemos(prev => ({ ...prev, [day.dayIndex]: v }))}
                  isLocked={lockedDays.has(day.dayIndex)}
                  onToggleLock={() => toggleLock(day.dayIndex)}
                />
              ))}
            </div>
          </section>
          )
        })}

        {/* ── メモエリア（スマホ） ── */}
        <div className="mt-2 pb-8">
          <p className="text-xs text-gray-500 mb-2"><span className="font-medium text-gray-700">全体メモ</span></p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="自由にメモできます"
            className="w-full min-h-40 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder-gray-300 resize-y focus:outline-none focus:border-blue-400 leading-relaxed"
          />
        </div>
      </main>

      </div>
    </div>

    {/* ── 全体表示フロートボタン（スマホのみ） ── */}
    <button
      onClick={() => setShowOverview(true)}
      className="md:hidden fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-white/90 border border-gray-200 text-gray-500 shadow-md flex items-center justify-center active:scale-95 transition-transform"
      aria-label="全体表示"
    >
      <CalendarDays className="w-6 h-6" />
    </button>

    {/* ── 全体表示モーダル（portal） ── */}
    {showOverview && typeof document !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 md:hidden"
        onClick={() => setShowOverview(false)}
      >
        <div
          className="relative bg-white rounded-2xl shadow-2xl mx-3 w-full max-w-sm p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* モーダルヘッダー */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">{currentEvent.name}</span>
            <button onClick={() => setShowOverview(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* カレンダー概要 */}
          <CalendarOverview
            eventDays={eventDays}
            daySlots={daySlots}
            todayDayIndex={todayDayIndex}
          />
        </div>
      </div>,
      document.body
    )}

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
