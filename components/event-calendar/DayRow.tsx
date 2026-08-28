"use client"

import { cn } from "@/lib/utils"
import { getIncenseById } from "@/lib/data/items"
import type { DayInfo } from "@/lib/types/calendar"
import { isIncenseItem, type DaySlots } from "./types"
import { ItemSlot } from "./ItemSlot"
import { LockToggleButton, SplitSleepToggle, DayMemoTextarea } from "./SharedControls"

// ─── DayRow（スマホ縦リスト用） ───────────────────────────────

interface DayRowProps {
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

export function DayRow({
  day, slots, isDragOver, dragId, tapSelectedId,
  onDragOver, onDragLeave,
  onDropSlot, onTapSlot, onTapFromSlot, onClearSlot,
  onSableCountChange, sableMax, onSableCountChange2, sableMax2,
  todayDayIndex, onToggleSplitSleep,
  mainIncenseId, mainSableId, sableIncenseSet, sableIncenseIds,
  dayMemo, onDayMemoChange,
  isLocked, onToggleLock,
}: DayRowProps) {
  const isSat = day.dayOfWeek === "土"
  const isSun = day.dayOfWeek === "日"
  const isToday = day.dayIndex === todayDayIndex
  const isPost = day.isPostEvent || day.isCarryoverDay
  const dragIsIncense = dragId ? isIncenseItem(dragId) : false

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-150 overflow-hidden",
        isToday   && "border-blue-500 shadow-sm shadow-blue-200",
        !isToday && isPost && "border-gray-200 bg-gray-100/70",
        !isToday && !isPost && isSat  && "border-sky-200",
        !isToday && !isPost && isSun  && "border-rose-200",
        !isToday && !isPost && !isSat && !isSun && "border-gray-200",
        isDragOver && "border-blue-400 shadow-sm shadow-blue-200",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* ── ヘッダー行 ── */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2",
        isToday   && "bg-blue-50",
        !isToday && isPost && "bg-gray-100/70",
        !isToday && !isPost && isSat  && "bg-sky-50",
        !isToday && !isPost && isSun  && "bg-rose-50",
        !isToday && !isPost && !isSat && !isSun && "bg-white",
        isDragOver && "bg-blue-50",
      )}>
        {/* 日付 */}
        <div className="flex items-center gap-1.5 shrink-0 w-16">
          <span className={cn(
            "text-sm font-bold tabular-nums",
            isToday  && "text-blue-600",
            !isToday && isPost && "text-gray-400",
            !isToday && !isPost && isSun && "text-rose-500",
            !isToday && !isPost && isSat && "text-sky-600",
            !isToday && !isPost && !isSat && !isSun && "text-gray-800",
          )}>
            {day.date}
          </span>
          <span className={cn(
            "text-xs font-medium",
            isSun && "text-rose-400",
            isSat && "text-sky-500",
            !isSat && !isSun && "text-gray-400",
          )}>({day.dayOfWeek})</span>
        </div>

        {/* 右側: 分割睡眠トグル + ロックボタン */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <SplitSleepToggle checked={slots.splitSleep} onToggle={onToggleSplitSleep} size="md" />
          <LockToggleButton isLocked={isLocked} onToggle={onToggleLock} size="md" />
        </div>
      </div>

      {/* ── スロット行（持ち越し専用日は非表示） ── */}
      <div className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2",
        day.isCarryoverDay && "hidden",
        isToday   && "bg-blue-50/40",
        !isToday && isSat  && "bg-sky-50/40",
        !isToday && isSun  && "bg-rose-50/40",
        !isToday && !isSat && !isSun && "bg-white",
        isDragOver && "bg-blue-50/60",
      )}>
        {/* おこうスロット（1回目） + サブレスロット */}
        <div className="flex items-center gap-0.5">
          <ItemSlot
            itemId={slots.slot1} isOver={isDragOver && dragIsIncense && !slots.slot1}
            isTapTarget={!!tapSelectedId && !slots.slot1}
            isTapSelected={tapSelectedId === slots.slot1 && !!slots.slot1}
            hasTapSelected={!!tapSelectedId}
            bgImageUrls={["/img/okou_normal.png"]}
            onDrop={() => onDropSlot("slot1")} onTap={() => onTapSlot("slot1")}
            onTapItem={slots.slot1 ? () => onTapFromSlot("slot1", slots.slot1!) : undefined}
            onClear={() => onClearSlot("slot1")}
            isLocked={isLocked}
          />
          <ItemSlot
            itemId={slots.slot2} isOver={isDragOver && dragIsIncense && !!slots.slot1 && !slots.slot2}
            isTapTarget={!!tapSelectedId && !!slots.slot1 && !slots.slot2}
            isTapSelected={tapSelectedId === slots.slot2 && !!slots.slot2}
            hasTapSelected={!!tapSelectedId}
            bgImageUrls={["/img/okou_normal.png"]}
            onDrop={() => onDropSlot("slot2")} onTap={() => onTapSlot("slot2")}
            onTapItem={slots.slot2 ? () => onTapFromSlot("slot2", slots.slot2!) : undefined}
            onClear={() => onClearSlot("slot2")}
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
            onDrop={() => onDropSlot("sableSlot")} onTap={() => onTapSlot("sableSlot")}
            onTapItem={slots.sableSlot ? () => onTapFromSlot("sableSlot", slots.sableSlot!) : undefined}
            onClear={() => onClearSlot("sableSlot")}
            isLocked={isLocked}
          />
        </div>

        {/* 分割睡眠 2回目スロット（OFF時も高さ確保） */}
        <div className="flex items-center gap-0.5" style={slots.splitSleep ? undefined : { visibility: "hidden", pointerEvents: "none" }}>
          <span className="text-[8px] text-gray-300 mr-0.5">2回目</span>
          <ItemSlot
            itemId={slots.slot3} isOver={isDragOver && dragIsIncense && !slots.slot3}
            isTapTarget={!!tapSelectedId && !slots.slot3}
            isTapSelected={tapSelectedId === slots.slot3 && !!slots.slot3}
            hasTapSelected={!!tapSelectedId}
            bgImageUrls={["/img/okou_normal.png"]}
            onDrop={() => onDropSlot("slot3")} onTap={() => onTapSlot("slot3")}
            onTapItem={slots.slot3 ? () => onTapFromSlot("slot3", slots.slot3!) : undefined}
            onClear={() => onClearSlot("slot3")}
            isLocked={isLocked}
          />
          <ItemSlot
            itemId={slots.slot4} isOver={isDragOver && dragIsIncense && !!slots.slot3 && !slots.slot4}
            isTapTarget={!!tapSelectedId && !!slots.slot3 && !slots.slot4}
            isTapSelected={tapSelectedId === slots.slot4 && !!slots.slot4}
            hasTapSelected={!!tapSelectedId}
            bgImageUrls={["/img/okou_normal.png"]}
            onDrop={() => onDropSlot("slot4")} onTap={() => onTapSlot("slot4")}
            onTapItem={slots.slot4 ? () => onTapFromSlot("slot4", slots.slot4!) : undefined}
            onClear={() => onClearSlot("slot4")}
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
            onDrop={() => onDropSlot("sableSlot2")} onTap={() => onTapSlot("sableSlot2")}
            onTapItem={slots.sableSlot2 ? () => onTapFromSlot("sableSlot2", slots.sableSlot2!) : undefined}
            onClear={() => onClearSlot("sableSlot2")}
            isLocked={isLocked}
          />
        </div>

      </div>

      {/* 日付メモ（持ち越しスロットの後・常に最下部） */}
      <div className={cn(
        "px-3 pb-2",
        isToday   && "bg-blue-50/40",
        !isToday && isSat  && "bg-sky-50/40",
        !isToday && isSun  && "bg-rose-50/40",
        !isToday && !isSat && !isSun && "bg-white",
      )}>
        {day.dayIndex === 16 && (
          <div className="flex gap-0.5 mb-1" style={{ transform: "scale(0.75)", transformOrigin: "left top" }}>
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
              isLocked={isLocked}
            />
          </div>
        )}
        <DayMemoTextarea value={dayMemo} onChange={onDayMemoChange} className="text-gray-600" />
      </div>
    </div>
  )
}
