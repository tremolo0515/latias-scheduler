"use client"

import { cn } from "@/lib/utils"
import { getIncenseById } from "@/lib/data/items"
import type { DayInfo } from "@/lib/types/calendar"
import { isIncenseItem, type DaySlots } from "./types"
import { ItemSlot } from "./ItemSlot"
import { LockToggleButton, SplitSleepToggle, DayMemoTextarea } from "./SharedControls"

// ─── DayCell（PC用グリッドセル） ──────────────────────────────

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
  onSableCountChange: (value: number) => void
  sableMax: number
  onSableCountChange2: (value: number) => void
  sableMax2: number
  todayDayIndex: number
  onToggleSplitSleep: () => void
  mainIncenseId: string
  mainSableId: string
  sableIncenseSet: Set<string>
  sableIncenseIds: string[]
  dayMemo: string
  onDayMemoChange: (value: string) => void
  isLocked: boolean
  onToggleLock: () => void
}

export function DayCell({
  day, slots, isDragOver, dragId, tapSelectedId,
  onDragOver, onDragLeave,
  onDropSlot, onTapSlot, onTapFromSlot, onClearSlot, onDragFromSlot, onSableCountChange, sableMax, onSableCountChange2, sableMax2, todayDayIndex, onToggleSplitSleep,
  mainIncenseId, mainSableId, sableIncenseSet, sableIncenseIds,
  dayMemo, onDayMemoChange,
  isLocked, onToggleLock,
}: DayCellProps) {
  const isSat = day.dayOfWeek === "土"
  const isSun = day.dayOfWeek === "日"
  const isPost = day.isPostEvent || day.isCarryoverDay
  const dragIsIncense = dragId ? isIncenseItem(dragId) : false

  // 持ち越し専用日（木）: 持ち越しスロットとメモのみ表示
  if (day.isCarryoverDay) {
    return (
      <div
        className={cn(
          "relative flex flex-col h-full rounded-lg border p-1 transition-all duration-150",
          day.dayIndex === todayDayIndex ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50/60",
          isDragOver && "border-blue-400 bg-blue-50 scale-[1.02]",
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <span className="text-sm font-bold text-gray-400">{day.date}</span>
            <span className="ml-1 text-[9px] text-gray-300">({day.dayOfWeek})</span>
          </div>
          <LockToggleButton isLocked={isLocked} onToggle={onToggleLock} />
        </div>
        <div className="flex gap-0.5 mb-1">
          {sableIncenseSet.size > 1 && (
            <ItemSlot
              itemId={slots.carryoverSlot2}
              isOver={isDragOver && sableIncenseSet.has(dragId!) && dragId !== mainIncenseId && !slots.carryoverSlot2}
              isTapTarget={!!tapSelectedId && sableIncenseSet.has(tapSelectedId) && tapSelectedId !== mainIncenseId && !slots.carryoverSlot2}
              isTapSelected={tapSelectedId === slots.carryoverSlot2 && !!slots.carryoverSlot2}
              hasTapSelected={!!tapSelectedId}
              label={"持越し"}
              bgImageUrls={sableIncenseIds.map((id: string) => getIncenseById(id)?.imageUrl ?? "").filter(Boolean)}
              onDrop={() => onDropSlot("carryoverSlot2")}
              onTap={() => onTapSlot("carryoverSlot2")}
              onTapItem={slots.carryoverSlot2 ? () => onTapFromSlot("carryoverSlot2", slots.carryoverSlot2!) : undefined}
              onClear={() => onClearSlot("carryoverSlot2")}
              onDragFromSlot={slots.carryoverSlot2 ? (e) => onDragFromSlot("carryoverSlot2", slots.carryoverSlot2!, e) : undefined}
              isLocked={isLocked}
            />
          )}
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
            isLocked={isLocked}
          />
        </div>
        <DayMemoTextarea value={dayMemo} onChange={onDayMemoChange} className="mt-auto text-gray-500" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-lg border p-1 transition-all duration-150",
        day.dayIndex === todayDayIndex && "border-blue-500 bg-blue-50",
        day.dayIndex !== todayDayIndex && isPost && "border-gray-200 bg-gray-100/70",
        day.dayIndex !== todayDayIndex && !isPost && isSat && "border-sky-300 bg-sky-50",
        day.dayIndex !== todayDayIndex && !isPost && isSun && "border-rose-300 bg-rose-50",
        day.dayIndex !== todayDayIndex && !isPost && !isSat && !isSun && "border-gray-200 bg-white",
        isDragOver && "border-blue-400 bg-blue-50 scale-[1.02]",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* 日付 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className={cn("text-sm font-bold", isSun && !isPost && "text-rose-500", isSat && !isPost && "text-sky-600", (!isSat && !isSun || isPost) && "text-gray-400")}>
            {day.date}
          </span>
          <SplitSleepToggle checked={slots.splitSleep} onToggle={onToggleSplitSleep} />
        </div>
        <LockToggleButton isLocked={isLocked} onToggle={onToggleLock} />
      </div>

      {/* イベントバー用の予約スペース（EventBarsOverlay がここに重なる・イベント後は不要） */}
      {!isPost && <div className="h-14 shrink-0" />}

      {/* スロット */}
      <div className="flex-1 flex flex-col gap-0.5 w-full">
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
              isLocked={isLocked}
            />
            <ItemSlot
              itemId={slots.slot2} isOver={isDragOver && dragIsIncense && !!slots.slot1 && !slots.slot2}
              isTapTarget={!!tapSelectedId && !!slots.slot1 && !slots.slot2}
              isTapSelected={tapSelectedId === slots.slot2 && !!slots.slot2}
              hasTapSelected={!!tapSelectedId}
              bgImageUrls={["/img/okou_normal.png"]}
              onDrop={() => onDropSlot("slot2")} onTap={() => onTapSlot("slot2")} onTapItem={slots.slot2 ? () => onTapFromSlot("slot2", slots.slot2!) : undefined} onClear={() => onClearSlot("slot2")}
              onDragFromSlot={slots.slot2 ? (e) => onDragFromSlot("slot2", slots.slot2!, e) : undefined}
              isLocked={isLocked}
            />
            {/* サブレスロット（常時表示） */}
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
              isLocked={isLocked}
            />
          </div>

          {/* 分割睡眠 2回目スロット（常にレンダリング・OFF時は非表示で高さ確保） */}
          <div className="flex gap-0.5" style={slots.splitSleep ? undefined : { visibility: "hidden", pointerEvents: "none" }}>
            <ItemSlot
              itemId={slots.slot3} isOver={isDragOver && dragIsIncense && !slots.slot3}
              isTapTarget={!!tapSelectedId && !slots.slot3}
              isTapSelected={tapSelectedId === slots.slot3 && !!slots.slot3}
              hasTapSelected={!!tapSelectedId}
              bgImageUrls={["/img/okou_normal.png"]}
              onDrop={() => onDropSlot("slot3")} onTap={() => onTapSlot("slot3")} onTapItem={slots.slot3 ? () => onTapFromSlot("slot3", slots.slot3!) : undefined} onClear={() => onClearSlot("slot3")}
              onDragFromSlot={slots.slot3 ? (e) => onDragFromSlot("slot3", slots.slot3!, e) : undefined}
              isLocked={isLocked}
            />
            <ItemSlot
              itemId={slots.slot4} isOver={isDragOver && dragIsIncense && !!slots.slot3 && !slots.slot4}
              isTapTarget={!!tapSelectedId && !!slots.slot3 && !slots.slot4}
              isTapSelected={tapSelectedId === slots.slot4 && !!slots.slot4}
              hasTapSelected={!!tapSelectedId}
              bgImageUrls={["/img/okou_normal.png"]}
              onDrop={() => onDropSlot("slot4")} onTap={() => onTapSlot("slot4")} onTapItem={slots.slot4 ? () => onTapFromSlot("slot4", slots.slot4!) : undefined} onClear={() => onClearSlot("slot4")}
              onDragFromSlot={slots.slot4 ? (e) => onDragFromSlot("slot4", slots.slot4!, e) : undefined}
              isLocked={isLocked}
            />
            {/* 2回目睡眠用サブレスロット（常時表示・分割睡眠時） */}
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
              isLocked={isLocked}
            />
          </div>

      </div>

      {/* 日付メモ（スロットコンテナ外・セル下端に密着） */}
      <DayMemoTextarea value={dayMemo} onChange={onDayMemoChange} className="mt-1 text-gray-600" />
    </div>
  )
}
