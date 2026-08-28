"use client"

import { cn } from "@/lib/utils"
import { getIncenseById } from "@/lib/data/items"
import type { DayInfo } from "@/lib/types/calendar"
import type { DaySlots } from "./types"

// ─── CalendarOverview（全体表示モーダル用） ───────────────────

export function CalendarOverview({
  eventDays,
  daySlots,
  todayDayIndex,
}: {
  eventDays: DayInfo[]
  daySlots: Record<number, DaySlots>
  todayDayIndex: number
}) {
  const weeks = [
    eventDays.slice(0, 7),
    eventDays.slice(7, 14),
    eventDays.slice(14),
  ]
  const dowLabels = ["月", "火", "水", "木", "金", "土", "日"]

  return (
    <div className="select-none">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {dowLabels.map((d, i) => (
          <div key={d} className={cn(
            "text-center text-[9px] font-bold py-0.5",
            i === 5 && "text-sky-500",
            i === 6 && "text-rose-400",
            i < 5 && "text-gray-400",
          )}>{d}</div>
        ))}
      </div>

      {/* 週ごとのグリッド */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-0.5 mb-0.5">
          {week.map(day => {
            const slots = daySlots[day.dayIndex]
            const isToday = day.dayIndex === todayDayIndex
            const isPost = day.isPostEvent || day.isCarryoverDay
            const isSat = day.dayOfWeek === "土"
            const isSun = day.dayOfWeek === "日"

            // 表示順: [slot1, slot2, sableSlot], [slot3, slot4, sableSlot2] の2行×3列
            const slotGrid: (string | null)[] = [
              slots.slot1 ?? null,
              slots.slot2 ?? null,
              slots.sableSlot ?? null,
              slots.splitSleep ? (slots.slot3 ?? null) : null,
              slots.splitSleep ? (slots.slot4 ?? null) : null,
              slots.splitSleep ? (slots.sableSlot2 ?? null) : null,
            ]
            const hasAny = slotGrid.some(Boolean)

            return (
              <div
                key={day.dayIndex}
                className={cn(
                  "rounded border p-0.5 flex flex-col items-center gap-0.5",
                  isToday && "border-blue-400 bg-blue-50",
                  !isToday && isPost && "border-gray-100 bg-gray-50",
                  !isToday && !isPost && isSat && "border-sky-200 bg-sky-50",
                  !isToday && !isPost && isSun && "border-rose-200 bg-rose-50",
                  !isToday && !isPost && !isSat && !isSun && "border-gray-200 bg-white",
                )}
              >
                <span className={cn(
                  "text-[8px] font-bold leading-none",
                  isToday && "text-blue-600",
                  !isToday && isPost && "text-gray-300",
                  !isToday && !isPost && isSat && "text-sky-500",
                  !isToday && !isPost && isSun && "text-rose-400",
                  !isToday && !isPost && !isSat && !isSun && "text-gray-500",
                )}>{day.date}</span>
                <div className="grid grid-cols-3 gap-px">
                  {hasAny ? slotGrid.map((id, i) => {
                    const item = id ? getIncenseById(id) : null
                    return item ? (
                      <img key={i} src={item.imageUrl} alt={item.name} className="w-4 h-4 object-contain" />
                    ) : (
                      <div key={i} className="w-4 h-4" />
                    )
                  }) : (
                    <div className="col-span-3 flex justify-center">
                      <div className="w-3 h-3 rounded-full bg-gray-100" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
