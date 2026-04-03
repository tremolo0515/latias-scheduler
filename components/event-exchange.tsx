"use client"

import { useState } from "react"
import { ShoppingBag, CheckCircle2, Circle, Star, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Priority = "high" | "medium" | "low"
type Category = "candy" | "ingredient" | "shard" | "energy" | "deco" | "other"

interface ExchangeItem {
  id: string
  name: string
  icon: string
  category: Category
  cost: number
  costUnit: string
  stock: number | null   // null = 無制限
  priority: Priority
  obtained: boolean
  note?: string
  targetQuantity: number
  obtainedQuantity: number
}

const CATEGORY_LABELS: Record<Category, { label: string; color: string }> = {
  candy:      { label: "アメ",    color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  ingredient: { label: "食材",    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  shard:      { label: "かけら",  color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  energy:     { label: "げんき",  color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  deco:       { label: "デコ",    color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  other:      { label: "その他",  color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
}

const PRIORITY_LABELS: Record<Priority, { label: string; color: string; stars: number }> = {
  high:   { label: "最優先",  color: "text-red-400",    stars: 3 },
  medium: { label: "優先",    color: "text-amber-400",  stars: 2 },
  low:    { label: "余裕で",  color: "text-slate-400",  stars: 1 },
}

const initialItems: ExchangeItem[] = [
  {
    id: "1",
    name: "タイプレス飴S",
    icon: "🍬",
    category: "candy",
    cost: 800,
    costUnit: "イベントメダル",
    stock: 5,
    priority: "high",
    obtained: false,
    note: "馬効果と合わせると効率2倍。最優先で交換",
    targetQuantity: 5,
    obtainedQuantity: 2,
  },
  {
    id: "2",
    name: "タイプレス飴M",
    icon: "🍬",
    category: "candy",
    cost: 2000,
    costUnit: "イベントメダル",
    stock: 3,
    priority: "high",
    obtained: false,
    note: "在庫3個。全取り推奨",
    targetQuantity: 3,
    obtainedQuantity: 1,
  },
  {
    id: "3",
    name: "おこうクラシック",
    icon: "🕯️",
    category: "other",
    cost: 500,
    costUnit: "イベントメダル",
    stock: null,
    priority: "medium",
    obtained: false,
    note: "毎日使うなら交換しておくと楽",
    targetQuantity: 7,
    obtainedQuantity: 3,
  },
  {
    id: "4",
    name: "げんきチャージS",
    icon: "⚡",
    category: "energy",
    cost: 300,
    costUnit: "イベントメダル",
    stock: null,
    priority: "medium",
    obtained: false,
    targetQuantity: 5,
    obtainedQuantity: 5,
  },
  {
    id: "5",
    name: "春のベッドデコ",
    icon: "🌸",
    category: "deco",
    cost: 3000,
    costUnit: "イベントメダル",
    stock: 1,
    priority: "low",
    obtained: true,
    note: "限定デコ。余裕があれば",
    targetQuantity: 1,
    obtainedQuantity: 1,
  },
  {
    id: "6",
    name: "ゆめのかけら×100",
    icon: "💎",
    category: "shard",
    cost: 400,
    costUnit: "イベントメダル",
    stock: null,
    priority: "low",
    obtained: false,
    targetQuantity: 10,
    obtainedQuantity: 4,
  },
]

export function EventExchange() {
  const [items, setItems] = useState<ExchangeItem[]>(initialItems)
  const [filter, setFilter] = useState<"all" | "remaining" | "done">("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredItems = items.filter((item) => {
    if (filter === "remaining") return item.obtainedQuantity < item.targetQuantity
    if (filter === "done") return item.obtainedQuantity >= item.targetQuantity
    return true
  })

  const totalDone = items.filter((i) => i.obtainedQuantity >= i.targetQuantity).length
  const totalCost = items.reduce((sum, i) => sum + i.cost * i.targetQuantity, 0)
  const spentCost = items.reduce((sum, i) => sum + i.cost * i.obtainedQuantity, 0)

  function incrementObtained(id: string) {
    setItems(items.map((i) =>
      i.id === id && i.obtainedQuantity < i.targetQuantity
        ? { ...i, obtainedQuantity: i.obtainedQuantity + 1 }
        : i
    ))
  }

  function decrementObtained(id: string) {
    setItems(items.map((i) =>
      i.id === id && i.obtainedQuantity > 0
        ? { ...i, obtainedQuantity: i.obtainedQuantity - 1 }
        : i
    ))
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold">イベント交換一覧</h1>
        </div>
        <p className="text-xs text-slate-400">春のコロコロイベント｜4/6 〜 4/19</p>
      </div>

      {/* 進捗サマリー */}
      <div className="mx-4 mb-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400">交換進捗</span>
          <span className="text-xs font-medium text-white">{totalDone} / {items.length} 完了</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${(totalDone / items.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-400">
            使用済み <span className="text-white font-medium">{spentCost.toLocaleString()}</span> メダル
          </span>
          <span className="text-xs text-slate-400">
            目標合計 <span className="text-white font-medium">{totalCost.toLocaleString()}</span> メダル
          </span>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 px-4 mb-4">
        {(["all", "remaining", "done"] as const).map((f) => (
          <button
            key={f}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filter === f
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
            )}
            onClick={() => setFilter(f)}
          >
            {{ all: "すべて", remaining: "未入手", done: "完了" }[f]}
          </button>
        ))}
      </div>

      {/* 交換アイテム一覧 */}
      <div className="px-4 space-y-3">
        {filteredItems
          .sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 }
            return order[a.priority] - order[b.priority]
          })
          .map((item) => {
            const isDone = item.obtainedQuantity >= item.targetQuantity
            const catInfo = CATEGORY_LABELS[item.category]
            const priInfo = PRIORITY_LABELS[item.priority]
            const isExpanded = expandedId === item.id

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border overflow-hidden",
                  isDone
                    ? "bg-slate-800/30 border-slate-700/30 opacity-60"
                    : "bg-slate-800/60 border-slate-700/50"
                )}
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* 完了アイコン */}
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500" />
                    )}
                  </div>

                  <span className="text-2xl shrink-0">{item.icon}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-medium text-sm", isDone && "line-through text-slate-400")}>
                        {item.name}
                      </span>
                      <Badge className={cn("text-xs border", catInfo.color)}>{catInfo.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {item.cost.toLocaleString()} {item.costUnit}
                        {item.stock !== null && (
                          <span className="ml-1 text-amber-400">（在庫{item.stock}個）</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 優先度 + 進捗 */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-3 h-3",
                            i < priInfo.stars ? priInfo.color : "text-slate-600"
                          )}
                          fill={i < priInfo.stars ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">
                      {item.obtainedQuantity}/{item.targetQuantity}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 border-t border-slate-700/50 space-y-2">
                    {/* 進捗バー */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">入手進捗</span>
                        <span className="text-white">{item.obtainedQuantity} / {item.targetQuantity} 個</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isDone ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${Math.min((item.obtainedQuantity / item.targetQuantity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {item.note && (
                      <p className="text-xs text-slate-400 bg-slate-700/40 rounded-lg px-3 py-2">
                        💡 {item.note}
                      </p>
                    )}

                    {/* カウンター */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">入手数を更新</span>
                      <div className="flex items-center gap-2">
                        <button
                          className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white font-bold hover:bg-slate-600 disabled:opacity-30"
                          onClick={() => decrementObtained(item.id)}
                          disabled={item.obtainedQuantity === 0}
                        >−</button>
                        <span className="text-sm font-bold w-5 text-center">{item.obtainedQuantity}</span>
                        <button
                          className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white font-bold hover:bg-slate-600 disabled:opacity-30"
                          onClick={() => incrementObtained(item.id)}
                          disabled={isDone}
                        >＋</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
