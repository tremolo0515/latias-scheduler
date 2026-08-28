// ─── イベント定義マスタ ────────────────────────────────────
// 各ポケモンスリープイベントの定義をここに追加する。
// event-calendar.tsx はこのデータを元に動的に構成される。

import type { DayInfo } from "@/lib/types/calendar"

export interface UmouPriceTable {
  /** おこう週1在庫: [数量, 単価][] */
  okouW1: [number, number][]
  /** おこう週2追加在庫: [数量, 単価][] */
  okouW2: [number, number][]
  /** サブレ週1在庫: [数量, 単価][] */
  sableW1: [number, number][]
  /** サブレ週2追加在庫: [数量, 単価][] */
  sableW2: [number, number][]
  /** 無料配布サブレ枚数 */
  sableFreeCount: number
  /** メインおこうのアイテムID */
  mainIncenseId: string
  /** メインサブレのアイテムID（複数枚使用可能なもの） */
  mainSableId: string
}

// ─── うもう交換所 ─────────────────────────────────────────

/** 交換所の1行定義 */
export interface ExchangeShopEntry {
  /** 交換品の表示名 */
  label: string
  /** 在庫に加算するアイテムID（null = 在庫管理対象外） */
  itemId: string | null
  /** 1回の交換で加算する個数 */
  itemQty: number
  /** 交換可能回数 */
  maxCount: number
  /** 必要うもう（1回あたり） */
  umouCost: number
  /** 表示順（小さいほど上）。省略時は定義順 */
  displayOrder?: number
  /** 割引アイテム（週ラベルを付記する） */
  discounted?: boolean
}

/** 週ごとの交換所 */
export interface ExchangeShopWeek {
  label: string  // "第1週" | "第2週" など
  entries: ExchangeShopEntry[]
}

/** イベントに紐づくうもう交換所定義 */
export interface UmouExchangeShop {
  weeks: ExchangeShopWeek[]
}

export interface SpecialDayConfig {
  /** 新月デーなど特別なdayIndexの集合 */
  specialDayIndices: Set<number>
  /** 特別な日のラベル */
  specialDayLabel?: string
}

export interface EventBarDef {
  id: string
  name: string
  /** 表示する列（1始まり、月曜=1） */
  colStart: number
  /** 何列スパンするか */
  colSpan: number
  /** 属する週（0=第1週, 1=第2週） */
  week: number
  barColor: string
  textColor: string
  effects: { label: string; note?: string }[]
}

export interface PokeSleepEvent {
  /** ユニークID（localStorageキーに使用） */
  id: string
  /** 画面表示名 */
  name: string
  /** 短縮名（ヘッダーナビ用） */
  shortName: string
  /** イベント開始日（Date） */
  startDate: Date
  /** イベント終了日（Date）- 最終日の日付 */
  endDate: Date
  /** カレンダーに表示するバー定義 */
  calendarEvents: EventBarDef[]
  /** うもう計算テーブル */
  umouPrices: UmouPriceTable
  /** 特別な日の設定 */
  specialDays: SpecialDayConfig
  /** このイベントで使用するアイテムID一覧（在庫管理対象） */
  itemIds: string[]
  /** このイベントのメインおこうID（配置優先度最上位） */
  mainIncenseId: string
  /** サブレスロットを出現させるおこうID一覧（mainIncenseId以外に追加がある場合） */
  sableIncenseIds?: string[]
  /** 持込アイテム定義（交換所とは別に「その他」欄に表示・うもう合計に影響しない） */
  carryInItems?: { itemId: string; max: number; label?: string }[]
  /** うもう交換所定義（省略時は非表示） */
  umouShop?: UmouExchangeShop
  /** イベント資材の名称（省略時 "うもう"） */
  currencyName?: string
  /** イベント資材の表示アイコン（省略時 "🪶"） */
  currencyIcon?: string
}

// ─── buildEventDays ────────────────────────────────────────
/**
 * イベント定義から DayInfo[] を動的生成する。
 * 開始日から14日間（2週間）を生成。
 */
export function buildEventDays(event: PokeSleepEvent): DayInfo[] {
  const days: DayInfo[] = []
  const DOW = ["日", "月", "火", "水", "木", "金", "土"] as const
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 14日間のイベント本体 + 2日（月〜火・おこう設置可） + 1日（水・持ち越しのみ） = 17日
  for (let i = 0; i < 17; i++) {
    const d = new Date(event.startDate)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)

    const dow = DOW[d.getDay()]
    const isToday = d.getTime() === today.getTime()
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const isFriday = d.getDay() === 5
    const isEarlyWeek = d.getDay() >= 1 && d.getDay() <= 3
    const isLate = i >= 7
    const isPostEvent = i >= 14 && i <= 15   // 15〜16日目（月〜火）
    const isCarryoverDay = i === 16           // 17日目（水）

    days.push({
      date: d.getDate(),
      dayOfWeek: dow as DayInfo["dayOfWeek"],
      dayIndex: i,
      isToday,
      isWeekend,
      isFriday,
      isEarlyWeek,
      isLate,
      isPostEvent,
      isCarryoverDay,
    })
  }
  return days
}

// ─── EVENTS 配列 ──────────────────────────────────────────
// 新しいイベントはここに追加する。古いものも残しておくことで
// 過去データの参照が可能。

export const EVENTS: PokeSleepEvent[] = [
  // ── ラティアスリサーチ 2026/4/6〜4/19 ──
  {
    id: "latias-2026-04",
    name: "ラティアスリサーチ",
    shortName: "ラティアス",
    startDate: new Date(2026, 3, 6, 4, 0, 0),   // 4月6日 04:00
    endDate:   new Date(2026, 3, 19, 3, 59, 0),  // 4月19日 03:59
    calendarEvents: [
      {
        id: "latias-w1",
        name: "ラティアスリサーチ（第1週）",
        colStart: 1, colSpan: 7, week: 0,
        barColor: "bg-red-700/70 hover:bg-red-700/80",
        textColor: "text-blue-100",
        effects: [
          { label: "他の睡眠タイプのポケモン出現" },
          { label: "ピックアップポケモン出現確率UP" },
          { label: "スキルとくい強化", note: "食材+1,メインスキル確率1.25倍,最大所持数+8,メインスキルレベル+2" },
        ],
      },
      {
        id: "latias-w2",
        name: "ラティアスリサーチ（第2週）",
        colStart: 1, colSpan: 7, week: 1,
        barColor: "bg-red-700/70 hover:bg-red-700/80",
        textColor: "text-indigo-100",
        effects: [
          { label: "他の睡眠タイプのポケモン出現" },
          { label: "ピックアップポケモン出現確率UP" },
          { label: "スキルとくい強化", note: "食材+1,きのみ+1,メインスキル確率1.25倍,最大所持数+15,メインスキルレベル+5" },
          { label: "一定エナジーからカビゴン育成開始" },
          { label: "ねむけパワー1.5倍(4/19)"},
        ],
      },
      {
        id: "newmoon",
        name: "ニュームーンデー",
        colStart: 4, colSpan: 3, week: 1,  // 4/16(木)〜4/18(土)
        barColor: "bg-indigo-700/70 hover:bg-indigo-600/80",
        textColor: "text-indigo-100",
        effects: [
          { label: "幻のポケモン出現" },
          { label: "満腹になりづらい" },
          { label: "色違い出現確率UP" },
        ],
      },
    ],
    umouPrices: {
      okouW1:  [[2, 80], [7, 160]],
      okouW2:  [[2, 70]],
      sableW1: [[2, 60], [10, 120]],
      sableW2: [[2, 50]],
      sableFreeCount: 1,
      mainIncenseId: "latias",
      mainSableId: "latias-sable",
    },
    specialDays: {
      specialDayIndices: new Set([10, 11, 12]),  // 4/16(木)〜4/18(土) ニュームーン
      specialDayLabel: "ニュームーンデー",
    },
    itemIds: [
      "kaifuku", "shuuchuu", "kouun", "seichou", "nakayoshi", "pokemon",
      "latias", "master-sable", "latias-sable",
    ],
    mainIncenseId: "latias",
    umouShop: {
      weeks: [
        {
          label: "第1週",
          entries: [
            { label: "ラティアスのおこう×1", itemId: "latias",       itemQty: 1, maxCount: 2,  umouCost: 80  },
            { label: "ラティアスのおこう×1", itemId: "latias",       itemQty: 1, maxCount: 7,  umouCost: 160 },
            { label: "ラティアスサブレ×1",   itemId: "latias-sable", itemQty: 1, maxCount: 2,  umouCost: 60  },
            { label: "ラティアスサブレ×1",   itemId: "latias-sable", itemQty: 1, maxCount: 10, umouCost: 120 },
          ],
        },
        {
          label: "第2週（追加）",
          entries: [
            { label: "ラティアスのおこう×1", itemId: "latias",       itemQty: 1, maxCount: 2, umouCost: 70 },
            { label: "ラティアスサブレ×1",   itemId: "latias-sable", itemQty: 1, maxCount: 2, umouCost: 50 },
          ],
        },
      ],
    },
  },

  // ── ラティオスとこころのしずく 2026/6/8〜6/21 ──
  {
    id: "latios-2026-06",
    name: "ラティオスとこころのしずく",
    shortName: "ラティオス",
    startDate: new Date(2026, 5, 8, 4, 0, 0),   // 6月8日 04:00
    endDate:   new Date(2026, 5, 22, 3, 59, 0),  // 6月22日 03:59（6/21が最終日）
    calendarEvents: [
      {
        id: "latios-w1",
        name: "ラティオスとこころのしずく（第1週）",
        colStart: 1, colSpan: 7, week: 0,
        barColor: "bg-blue-700/70 hover:bg-blue-700/80",
        textColor: "text-blue-100",
        effects: [
          { label: "他の睡眠タイプのポケモン出現" },
          { label: "ドラゴンタイプのポケモン出現確率UP" },
          { label: "ドラゴン食材+1・メインスキル確率1.5倍" },
          { label: "ヤチェのみ固定（今週のカビゴンの好きなきのみ）" },
          { label: "ラティアス/ラティオス編成でねむけパワーUP", note: "1体1.1倍, 2体1.3倍" },
          { label: "ドラゴン メインスキルレベル+2" },
        ],
      },
      {
        id: "latios-w2",
        name: "ラティオスとこころのしずく（第2週）",
        colStart: 1, colSpan: 7, week: 1,
        barColor: "bg-blue-700/70 hover:bg-blue-700/80",
        textColor: "text-cyan-100",
        effects: [
          { label: "他の睡眠タイプのポケモン出現" },
          { label: "ドラゴンタイプのポケモン出現確率UP" },
          { label: "ドラゴン食材+1・メインスキル確率1.5倍" },
          { label: "ヤチェのみ固定（今週のカビゴンの好きなきのみ）" },
          { label: "ラティアス/ラティオス編成でねむけパワーUP", note: "1体1.1倍, 2体1.3倍" },
          { label: "ドラゴン メインスキルレベル+5" },
          { label: "一定エナジーからカビゴン育成開始" },
          { label: "ねむけパワー1.5倍(6/22)" },
        ],
      },
      {
        // 6/14(日)=dayIndex6 → 第1週7列目
        id: "newmoon-latios-w1",
        name: "ニュームーンデー",
        colStart: 7, colSpan: 1, week: 0,
        barColor: "bg-indigo-700/70 hover:bg-indigo-600/80",
        textColor: "text-indigo-100",
        effects: [
          { label: "幻のポケモン出現" },
          { label: "満腹になりづらい" },
          { label: "色違い出現確率UP" },
        ],
      },
      {
        // 6/15(月)=dayIndex7, 6/16(火)=dayIndex8 → 第2週1〜2列目
        id: "newmoon-latios-w2",
        name: "ニュームーンデー",
        colStart: 1, colSpan: 2, week: 1,
        barColor: "bg-indigo-700/70 hover:bg-indigo-600/80",
        textColor: "text-indigo-100",
        effects: [
          { label: "幻のポケモン出現" },
          { label: "満腹になりづらい" },
          { label: "色違い出現確率UP" },
        ],
      },
    ],
    umouPrices: {
      // ラティオスのうもう交換レート（ラティアスと同様と推定）
      okouW1:  [[2, 80], [7, 160]],
      okouW2:  [[2, 70]],
      sableW1: [[2, 60], [10, 120]],
      sableW2: [[2, 50]],
      sableFreeCount: 1,
      mainIncenseId: "latios",
      mainSableId: "latios-sable",
    },
    specialDays: {
      specialDayIndices: new Set([6, 7, 8]),  // 6/14(日)〜6/16(火) ニュームーン
      specialDayLabel: "ニュームーンデー",
    },
    itemIds: [
      "kaifuku", "shuuchuu", "kouun", "seichou", "nakayoshi", "pokemon",
      "latios", "latias", "master-sable", "latios-sable",
    ],
    mainIncenseId: "latios",
    sableIncenseIds: ["latias"],  // ラティアスのおこうを置いた日もサブレスロット出現
    carryInItems: [
      { itemId: "latios-sable", max: 1, label: "配布" },  // 運営配布1個
      { itemId: "latias", max: 2 },  // バッグ持込1個 + お詫び配布1個
    ],
    umouShop: {
      weeks: [
        {
          label: "第1週",
          entries: [
            { label: "ラティオスのおこう×1",        itemId: "latios",       itemQty: 1, maxCount: 2,  umouCost: 80,  displayOrder: 10, discounted: true },
            { label: "ラティオスのおこう×1",        itemId: "latios",       itemQty: 1, maxCount: 7,  umouCost: 160, displayOrder:  9 },
            { label: "ラティアスのおこう×1",         itemId: "latias",       itemQty: 1, maxCount: 2,  umouCost: 80,  displayOrder: 20, discounted: true },
            { label: "ラティアスのおこう×1",         itemId: "latias",       itemQty: 1, maxCount: 3,  umouCost: 160, displayOrder: 19 },
            { label: "ラティアス/ラティオスサブレ×1", itemId: "latios-sable", itemQty: 1, maxCount: 2,  umouCost: 60,  displayOrder: 30, discounted: true },
            { label: "ラティアス/ラティオスサブレ×1", itemId: "latios-sable", itemQty: 1, maxCount: 10, umouCost: 120, displayOrder: 29 },
          ],
        },
        {
          label: "第2週（追加）",
          entries: [
            { label: "ラティオスのおこう×1",        itemId: "latios",       itemQty: 1, maxCount: 2, umouCost: 70, displayOrder: 12, discounted: true },
            { label: "ラティアス/ラティオスサブレ×1", itemId: "latios-sable", itemQty: 1, maxCount: 2, umouCost: 50, displayOrder: 32, discounted: true },
            { label: "ラティアスのおこう×1",         itemId: "latias",       itemQty: 1, maxCount: 1, umouCost: 70, displayOrder: 22, discounted: true },
          ],
        },
      ],
    },
  },

  // ── 秘境リサーチ！ミュウツーをおいかけて 2026/9/14〜9/27 ──
  {
    id: "mewtwo-2026-09",
    name: "秘境リサーチ！ミュウツーをおいかけて",
    shortName: "ミュウツー",
    startDate: new Date(2026, 8, 14, 4, 0, 0),   // 9月14日 04:00
    endDate:   new Date(2026, 8, 28, 3, 59, 0),  // 9月28日 03:59（9/27が最終日）
    currencyName: "いでんし",
    currencyIcon: "🧬",
    calendarEvents: [
      {
        id: "mewtwo-w1",
        name: "秘境リサーチ（第1週）",
        colStart: 1, colSpan: 7, week: 0,
        barColor: "bg-purple-700/70 hover:bg-purple-700/80",
        textColor: "text-purple-100",
        effects: [
          { label: "ピックアップポケモン出現確率UP" },
          { label: "エスパータイプ強化", note: "食材+1, メインスキル確率1.5倍" },
          { label: "とてもおおきなマゴのみ 最大所持数+8" },
          { label: "ミュウツー/ミュウ編成でねむけパワーUP", note: "各1.1倍" },
          { label: "ミュウツーの満腹度低下 1日1回" },
        ],
      },
      {
        id: "mewtwo-w2",
        name: "秘境リサーチ（第2週）",
        colStart: 1, colSpan: 7, week: 1,
        barColor: "bg-purple-700/70 hover:bg-purple-700/80",
        textColor: "text-fuchsia-100",
        effects: [
          { label: "ピックアップポケモン出現確率UP" },
          { label: "エスパータイプ強化", note: "食材+1, メインスキル確率1.5倍, メインスキルレベル+5" },
          { label: "とてもおおきなマゴのみ 最大所持数+15" },
          { label: "ミュウツー編成でねむけパワー1.3倍" },
          { label: "一定エナジーからカビゴン育成開始" },
          { label: "ねむけパワー1.5倍(9/27・推定)" },
        ],
      },
    ],
    umouPrices: {
      // ⚠️ ラティオスイベントと同等の推定値（開催後に確定値へ更新すること）
      okouW1:  [[2, 80], [7, 160]],
      okouW2:  [[2, 70]],
      sableW1: [[2, 60], [10, 120]],
      sableW2: [[2, 50]],
      sableFreeCount: 1,
      mainIncenseId: "mewtwo",
      mainSableId: "mewtwo-sable",
    },
    specialDays: {
      specialDayIndices: new Set(),  // 期間内にニュームーンデー無し（9月新月は9/11頃）
    },
    itemIds: [
      "kaifuku", "shuuchuu", "kouun", "seichou", "nakayoshi", "pokemon",
      "mewtwo", "master-sable", "mewtwo-sable",
    ],
    mainIncenseId: "mewtwo",
    carryInItems: [
      { itemId: "mewtwo-sable", max: 1, label: "配布" },  // 運営配布1個（推定）
    ],
    umouShop: {
      // ⚠️ 未発表のためラティオスイベントの構造・価格で仮置き（開催後に確定値へ更新）
      weeks: [
        {
          label: "第1週",
          entries: [
            { label: "ミュウツーのおこう×1", itemId: "mewtwo",       itemQty: 1, maxCount: 2,  umouCost: 80,  displayOrder: 10, discounted: true },
            { label: "ミュウツーのおこう×1", itemId: "mewtwo",       itemQty: 1, maxCount: 7,  umouCost: 160, displayOrder:  9 },
            { label: "ミュウツーサブレ×1",   itemId: "mewtwo-sable", itemQty: 1, maxCount: 2,  umouCost: 60,  displayOrder: 30, discounted: true },
            { label: "ミュウツーサブレ×1",   itemId: "mewtwo-sable", itemQty: 1, maxCount: 10, umouCost: 120, displayOrder: 29 },
          ],
        },
        {
          label: "第2週（追加）",
          entries: [
            { label: "ミュウツーのおこう×1", itemId: "mewtwo",       itemQty: 1, maxCount: 2, umouCost: 70, displayOrder: 12, discounted: true },
            { label: "ミュウツーサブレ×1",   itemId: "mewtwo-sable", itemQty: 1, maxCount: 2, umouCost: 50, displayOrder: 32, discounted: true },
          ],
        },
      ],
    },
  },
]

/** IDでイベントを検索 */
export function getEventById(id: string): PokeSleepEvent | undefined {
  return EVENTS.find(e => e.id === id)
}
