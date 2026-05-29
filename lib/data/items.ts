// ─── アイテムマスタ（固定リスト）────────────────────────────
// おこう6種 + ラティアスのおこう + その他アイテム。
// おこうは1日最大2個まで使用可能。同じ効果のおこうは同時使用不可。

export type EffectType =
  | "energy"       // げんき回復系
  | "exp"          // リサーチEXP系
  | "shard"        // ゆめのかけら系
  | "pokemon-exp"  // ポケモンEXP系
  | "chance"       // チャンス確定系
  | "pokemon"      // ポケモン出現系
  | "treat"        // おやつ系（おこうと別枠）

export interface IncenseMaster {
  id: string
  name: string
  icon: string
  /** Wiki から取得したアイテム画像URL */
  imageUrl: string
  effectType: EffectType
  /** カード・バッジ用の短い効果説明 */
  effectShort: string
  /** 詳細説明 */
  effectDetail: string
  /** バッジカラー（Tailwind クラス） */
  color: string
  /** 同時使用推奨アイテムのID（マスターサブレ → ラティアスのおこう） */
  pairedWith?: string
  /** 在庫入力の上限（未指定時は99） */
  maxStock?: number
  // ── 提案ルール ──
  preferWeekend: boolean   // 土日優先
  preferLate: boolean      // イベント後半優先
  preferEarlyWeek: boolean // 週初め（月〜水）優先
  spreadEvenly: boolean    // 毎日均等
}

export const INCENSE_MASTERS: IncenseMaster[] = [
  {
    id: "kaifuku",
    name: "かいふくのおこう",
    icon: "💚",
    imageUrl: "/img/okou_kaifuku.png",
    effectType: "energy",
    effectShort: "げんき回復 2倍",
    effectDetail: "睡眠リサーチでおてつだいポケモンのげんき回復量が2倍になる。",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    maxStock: 14,
    preferWeekend: false,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: true,
  },
  {
    id: "shuuchuu",
    name: "しゅうちゅうのおこう",
    icon: "📘",
    imageUrl: "/img/okou_shuuchuu.png",
    effectType: "exp",
    effectShort: "リサーチEXP 2倍",
    effectDetail: "睡眠リサーチでもらえるリサーチEXPが2倍になる。週末の高エナジー時に使うと効率的。",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    maxStock: 14,
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  {
    id: "kouun",
    name: "こううんのおこう",
    icon: "💎",
    imageUrl: "/img/okou_kouun.png",
    effectType: "shard",
    effectShort: "ゆめのかけら 2倍",
    effectDetail: "睡眠リサーチでもらえるゆめのかけらが2倍になる。高エナジー時（週末）に使うほど獲得量大。",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    maxStock: 14,
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  {
    id: "seichou",
    name: "せいちょうのおこう",
    icon: "⭐",
    imageUrl: "/img/okou_seichou.png",
    effectType: "pokemon-exp",
    effectShort: "ポケモンEXP 2倍",
    effectDetail: "睡眠リサーチでおてつだいポケモンがもらえるEXPが2倍になる。イベントEXPボーナスと乗算。",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    maxStock: 14,
    preferWeekend: false,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: true,
  },
  {
    id: "nakayoshi",
    name: "なかよしのおこう",
    icon: "🩷",
    imageUrl: "/img/okou_nakayoshi.png",
    effectType: "chance",
    effectShort: "1匹チャンス確定",
    effectDetail: "おやつタイムでポケモンが1匹確定でチャンス状態になる。週初めのエナジーが低い時に狙いやすい。",
    color: "bg-pink-500/20 text-pink-300 border-pink-500/40",
    maxStock: 14,
    preferWeekend: false,
    preferLate: false,
    preferEarlyWeek: true,
    spreadEvenly: false,
  },
  {
    id: "pokemon",
    name: "ポケモンのおこう",
    icon: "🟣",
    imageUrl: "/img/okou_pokemon.png",
    effectType: "pokemon",
    effectShort: "特定ポケモン出現",
    effectDetail: "指定したポケモンが追加枠として出現する。しゅうちゅう・こううんと組み合わせると効果的。",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    maxStock: 14,
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  {
    id: "latias",
    name: "ラティアスのおこう",
    maxStock: 2,
    icon: "🟣",
    imageUrl: "/img/okou_latias.png",
    effectType: "pokemon",
    effectShort: "ラティアス出現",
    effectDetail: "ラティアスが追加枠として出現する。こううんのおこうと組み合わせて大量のゆめのかけらを狙える。",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  {
    id: "master-sable",
    name: "マスターサブレ",
    icon: "🍪",
    imageUrl: "/img/master_sable.png",
    effectType: "treat",
    maxStock: 14,
    effectShort: "ラティアスに使うおやつ",
    effectDetail: "ラティアスのおこうと同時に設置して使用。おやつタイムでラティアスに与えることでなかよし度を上げる。",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    pairedWith: "latias",
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  {
    id: "latias-sable",
    name: "ラティアスサブレ",
    maxStock: 14,
    icon: "🍪",
    imageUrl: "/img/latias_sable.png",
    effectType: "treat",
    effectShort: "ラティアスに使うおやつ（複数可）",
    effectDetail: "ラティアスのおこうと同時に設置して使用。マスターサブレと排他的に使用。個数を指定できる。",
    color: "bg-red-500/20 text-red-300 border-red-500/40",
    pairedWith: "latias",
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  // ─── ラティオスイベント用アイテム ────────────────────────────
  {
    id: "latios",
    name: "ラティオスのおこう",
    maxStock: 14,
    icon: "🔵",
    imageUrl: "/img/okou_latios.png", 
    effectType: "pokemon",
    effectShort: "ラティオス出現",
    effectDetail: "ラティオスが追加枠として出現する。こううんのおこうと組み合わせて大量のゆめのかけらを狙える。",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
  {
    id: "latios-sable",
    name: "ラティアス/ラティオスサブレ",
    maxStock: 14,
    icon: "🍪",
    imageUrl: "/img/dragon_sable.png",
    effectType: "treat",
    effectShort: "ラティオスに使うおやつ（複数可）",
    effectDetail: "ラティオスのおこうと同時に設置して使用。マスターサブレと排他的に使用。個数を指定できる。",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    pairedWith: "latios",
    preferWeekend: true,
    preferLate: false,
    preferEarlyWeek: false,
    spreadEvenly: false,
  },
]

export function getIncenseById(id: string): IncenseMaster | undefined {
  return INCENSE_MASTERS.find(i => i.id === id)
}
