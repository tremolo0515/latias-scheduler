"use client"

import { useState } from "react"
import { Plus, Trash2, Package, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Item {
  id: string
  name: string
  quantity: number
  effectType: "exp" | "shard" | "energy" | "ingredient" | "candy" | "other"
  effectValue: string
  suggestion?: string
  bestDay?: string
}

const EFFECT_TYPE_LABELS: Record<Item["effectType"], { label: string; icon: string; color: string }> = {
  exp:        { label: "EXP系",    icon: "✨", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  shard:      { label: "かけら系",  icon: "💎", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  energy:     { label: "げんき系",  icon: "⚡", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  ingredient: { label: "食材系",    icon: "🍖", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  candy:      { label: "アメ系",    icon: "🍬", color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  other:      { label: "その他",    icon: "📦", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
}

const initialItems: Item[] = [
  {
    id: "1",
    name: "タイプレス飴",
    quantity: 12,
    effectType: "candy",
    effectValue: "好きなポケモンに使える",
    suggestion: "土日の馬効果2倍中に使うと効率最大",
    bestDay: "土・日",
  },
  {
    id: "2",
    name: "ゆめのかけら",
    quantity: 24,
    effectType: "shard",
    effectValue: "1.5倍イベント中",
    suggestion: "イベント後半（残り7日以内）にまとめて使用推奨",
    bestDay: "毎日少しずつ",
  },
  {
    id: "3",
    name: "げんきチャージS",
    quantity: 5,
    effectType: "energy",
    effectValue: "げんき+18",
    suggestion: "週末の連続プレイ前日（金曜）に使用推奨",
    bestDay: "金曜",
  },
  {
    id: "4",
    name: "おこうクラシック",
    quantity: 3,
    effectType: "exp",
    effectValue: "睡眠EXP 1.5倍（1時間）",
    suggestion: "睡眠EXP2倍イベント中は重複で3倍相当。毎日使い切る",
    bestDay: "毎日",
  },
]

export function ItemInventory() {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    quantity: "",
    effectType: "other" as Item["effectType"],
    effectValue: "",
  })

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  function handleAdd() {
    if (!form.name || !form.quantity) return
    const newItem: Item = {
      id: Date.now().toString(),
      name: form.name,
      quantity: Number(form.quantity),
      effectType: form.effectType,
      effectValue: form.effectValue,
    }
    setItems([...items, newItem])
    setForm({ name: "", quantity: "", effectType: "other", effectValue: "" })
    setShowForm(false)
  }

  function handleDelete(id: string) {
    setItems(items.filter((i) => i.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold">アイテム在庫</h1>
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs">
            合計 {totalItems} 個
          </Badge>
        </div>
        <p className="text-xs text-slate-400">持っているアイテムを登録すると、使用タイミングを提案します</p>
      </div>

      {/* 提案サマリー */}
      <div className="mx-4 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">今週の使用提案</span>
        </div>
        <ul className="space-y-1">
          <li className="text-xs text-slate-300">🍬 タイプレス飴 → <span className="text-amber-300 font-medium">土・日に各2個</span>（馬効果2倍中）</li>
          <li className="text-xs text-slate-300">✨ おこうクラシック → <span className="text-amber-300 font-medium">毎晩1個</span>（EXP重複狙い）</li>
          <li className="text-xs text-slate-300">⚡ げんきチャージS → <span className="text-amber-300 font-medium">金曜夜に1個</span>（週末前）</li>
        </ul>
      </div>

      {/* アイテム一覧 */}
      <div className="px-4 space-y-3">
        {items.map((item) => {
          const typeInfo = EFFECT_TYPE_LABELS[item.effectType]
          const isExpanded = expandedId === item.id
          return (
            <div
              key={item.id}
              className="rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden"
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <span className="text-2xl">{typeInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.name}</span>
                    <Badge className={cn("text-xs border", typeInfo.color)}>{typeInfo.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{item.effectValue}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg font-bold text-white">×{item.quantity}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-700/50 pt-2 space-y-2">
                  {item.suggestion && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                      <p className="text-xs text-amber-300">
                        💡 <span className="font-medium">提案：</span>{item.suggestion}
                      </p>
                      {item.bestDay && (
                        <p className="text-xs text-slate-400 mt-1">
                          ベストタイミング：<span className="text-white font-medium">{item.bestDay}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white font-bold text-sm hover:bg-slate-600"
                        onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i))}
                      >−</button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white font-bold text-sm hover:bg-slate-600"
                        onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                      >＋</button>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                      削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="mx-4 mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 space-y-3">
          <h3 className="text-sm font-medium text-slate-200">新しいアイテムを追加</h3>
          <input
            className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
            placeholder="アイテム名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              type="number"
              className="w-24 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
              placeholder="個数"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <select
              className="flex-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              value={form.effectType}
              onChange={(e) => setForm({ ...form, effectType: e.target.value as Item["effectType"] })}
            >
              {Object.entries(EFFECT_TYPE_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
          <input
            className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
            placeholder="効果の説明（任意）"
            value={form.effectValue}
            onChange={(e) => setForm({ ...form, effectValue: e.target.value })}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm"
              onClick={handleAdd}
            >
              追加する
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
              onClick={() => setShowForm(false)}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {/* FAB */}
      {!showForm && (
        <div className="fixed bottom-20 right-4">
          <button
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-900/50"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
