"use client"

import { cn } from "@/lib/utils"
import type { PokeSleepEvent } from "@/lib/data/events"

// ─── EventBarsOverlay（カレンダーセルに重ねて表示） ───────────

export function EventBarsOverlay({
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
                "w-full h-5 px-1.5 rounded text-[10px] font-semibold transition-all text-left leading-5 flex items-center gap-1",
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
