"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { IncenseMaster } from "@/lib/data/items"

// ─── InventoryTile（在庫D&Dパレット用アイコンタイル） ────────────
// - remaining=0 のとき非表示（呼び出し元でフィルタ）
// - remaining=1 のとき画像のみ
// - remaining>=2 のとき右下に ×N バッジ
// - 在庫追加時に wiggle アニメーション

export function InventoryTile({
  incense, remaining, canDrag, isDragging, isTapSelected, isOverflow,
  onDragStart, onDragEnd, onTap,
}: {
  incense: IncenseMaster
  remaining: number
  canDrag: boolean
  isDragging: boolean
  isTapSelected: boolean
  isOverflow: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onTap: () => void
}) {
  // マウント時に wiggle を1回再生（key変更 = 再マウントで自動トリガー）
  const [wiggling, setWiggling] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setWiggling(false), 450)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-tap-item
      onClick={onTap}
      title={isOverflow ? `${incense.name}（${Math.abs(remaining)}個足りません）` : `${incense.name}（残${remaining}）`}
      className={cn(
        "relative w-11 h-11 flex items-center justify-center rounded-xl select-none transition-all",
        isOverflow ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        !isOverflow && isDragging && "scale-90",
        isTapSelected && "ring-2 ring-blue-400 scale-95",
        wiggling && !isOverflow && "animate-wiggle",
      )}
      style={{ opacity: isOverflow ? 0.35 : isDragging ? 0.6 : 1 }}
    >
      <img
        src={incense.imageUrl}
        alt={incense.name}
        width={40}
        height={40}
        className="w-10 h-10 object-contain drop-shadow-sm"
        draggable={false}
      />
      {/* ×N テキスト（2個以上のとき） */}
      {remaining >= 2 && (
        <span className="absolute bottom-0 right-0 text-xs font-black text-gray-900 leading-none" style={{ filter: "drop-shadow(0 0 2px white) drop-shadow(0 0 2px white) drop-shadow(0 0 2px white)" }}>
          ×{remaining}
        </span>
      )}
      {/* 在庫オーバー警告バッジ */}
      {isOverflow && (
        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[11px] font-black leading-none" style={{ background: "#ef4444", color: "#fff", boxShadow: "0 0 0 1.5px white" }}>!</span>
      )}
    </div>
  )
}
