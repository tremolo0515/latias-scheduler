"use client"

import { Lock, LockOpen } from "lucide-react"
import { cn } from "@/lib/utils"

/** ロック切替ボタン（DayCell/DayRowで共通） */
export function LockToggleButton({ isLocked, onToggle, size = "sm" }: { isLocked: boolean; onToggle: () => void; size?: "sm" | "md" }) {
  const iconClass = size === "md" ? "w-3.5 h-3.5" : "w-3 h-3"
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      title={isLocked ? "ロック解除" : "ロック"}
      className={cn("p-0.5 rounded transition-colors", isLocked ? "text-red-300 hover:text-red-400" : "text-gray-200 hover:text-gray-400")}
    >
      {isLocked ? <Lock className={iconClass} /> : <LockOpen className={iconClass} />}
    </button>
  )
}

/** 分割睡眠トグル（DayCell/DayRowで共通） */
export function SplitSleepToggle({ checked, onToggle, size = "sm" }: { checked: boolean; onToggle: () => void; size?: "sm" | "md" }) {
  const isMd = size === "md"
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={cn("flex items-center", isMd ? "gap-1" : "gap-0.5")}
      title="分割睡眠"
    >
      <span className={cn("text-[9px] font-medium", isMd && "whitespace-nowrap", checked ? "text-blue-500" : "text-gray-400")}>分割睡眠</span>
      <span className={cn(
        "relative rounded-full transition-colors duration-200 shrink-0",
        isMd ? "w-7 h-4" : "w-6 h-3.5",
        checked ? "bg-blue-500" : (isMd ? "bg-gray-300" : "bg-gray-400"),
      )}>
        <span className={cn(
          "absolute top-0.5 rounded-full bg-white shadow transition-all duration-200",
          isMd ? "w-3 h-3" : "w-2.5 h-2.5",
          checked ? (isMd ? "left-3.5" : "left-3") : "left-0.5",
        )} />
      </span>
    </button>
  )
}

/** 日付メモ欄（DayCell/DayRowで共通・呼び出し側で余白/文字色のみ上書き） */
export function DayMemoTextarea({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder="メモ..."
      rows={2}
      className={cn("w-full rounded border border-gray-100 bg-transparent px-1 py-0.5 text-[10px] placeholder-gray-300 resize-none focus:outline-none focus:border-gray-300 leading-relaxed", className)}
    />
  )
}
