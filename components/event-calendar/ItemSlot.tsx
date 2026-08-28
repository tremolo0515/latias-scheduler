"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { getIncenseById } from "@/lib/data/items"

/** 汎用アイテムスロット */
export function ItemSlot({
  itemId, isOver, isTapTarget, isTapSelected, hasTapSelected, label, bgImageUrls, monday = false,
  count, maxCount, onCountChange,
  onDrop, onTap, onTapItem, onClear, onDragFromSlot,
  isLocked = false,
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
  isLocked?: boolean
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
            : (item?.id !== "pokemon" && (item?.effectType === "pokemon" || item?.effectType === "treat"))
              ? isLocked ? "bg-purple-50 border-red-200" : "bg-purple-50 border-purple-300 shadow-[0_0_6px_1px_rgba(168,85,247,0.25)]"
              : isLocked ? "bg-gray-100 border-red-200" : "bg-gray-100 border-gray-300"
          : localOver || isTapTarget
            ? "border-blue-400 bg-blue-50 border-dashed"
            : isOver
              ? "border-blue-300 bg-blue-50/50 border-dashed"
              : isLocked
                ? "border-red-200 border-dashed bg-gray-100"
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
              onDragFromSlot && "cursor-grab active:cursor-grabbing",
              isLocked && "opacity-50",
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
              <span className="flex-1 text-center text-[9px] font-bold text-gray-600">{count}</span>
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
        <span className={cn("relative text-[9px] leading-tight text-center px-0.5 whitespace-pre-line", localOver ? "text-blue-500" : monday ? "text-amber-500" : "text-gray-300")}>{localOver ? "↓" : label}</span>
      ) : (
        <span className={cn("relative text-[8px]", localOver ? "text-blue-500" : "text-gray-400")}>{localOver ? "↓" : ""}</span>
      )}
    </div>
  )
}
