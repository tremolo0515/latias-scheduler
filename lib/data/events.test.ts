import { describe, it, expect } from "vitest"
import { buildEventDays, getEventById, EVENTS, type PokeSleepEvent } from "./events"

const baseEvent: PokeSleepEvent = {
  id: "test-event",
  name: "テストイベント",
  shortName: "テスト",
  startDate: new Date(2026, 8, 14, 4, 0, 0),   // 2026/9/14(月)
  endDate: new Date(2026, 8, 28, 3, 59, 0),
  calendarEvents: [],
  umouPrices: {
    okouW1: [], okouW2: [], sableW1: [], sableW2: [],
    sableFreeCount: 0, mainIncenseId: "x", mainSableId: "y",
  },
  specialDays: { specialDayIndices: new Set() },
  itemIds: [],
  mainIncenseId: "x",
}

describe("buildEventDays", () => {
  it("17日分（本体14日+イベント後2日+持ち越し1日）を生成する", () => {
    const days = buildEventDays(baseEvent)
    expect(days).toHaveLength(17)
  })

  it("dayIndex 0が開始日と一致する", () => {
    const days = buildEventDays(baseEvent)
    expect(days[0]).toMatchObject({ date: 14, dayOfWeek: "月", dayIndex: 0 })
  })

  it("dayIndex 13までが本体14日間で、14日目以降はイベント後扱いになる", () => {
    const days = buildEventDays(baseEvent)
    expect(days[13].isPostEvent).toBe(false)
    expect(days[13].isCarryoverDay).toBe(false)
    expect(days[14].isPostEvent).toBe(true)
    expect(days[15].isPostEvent).toBe(true)
  })

  it("dayIndex 16のみ持ち越し専用日になる", () => {
    const days = buildEventDays(baseEvent)
    expect(days[16].isCarryoverDay).toBe(true)
    expect(days[16].date).toBe(30)  // 9/14 + 16日 = 9/30
    expect(days.filter(d => d.isCarryoverDay)).toHaveLength(1)
  })

  it("土日を正しくisWeekendとして判定する", () => {
    const days = buildEventDays(baseEvent)
    // 9/14(月)始まりなので dayIndex 5=土, 6=日
    expect(days[5]).toMatchObject({ dayOfWeek: "土", isWeekend: true })
    expect(days[6]).toMatchObject({ dayOfWeek: "日", isWeekend: true })
    expect(days[0].isWeekend).toBe(false)
  })
})

describe("getEventById", () => {
  it("実在するIDでイベントを取得できる", () => {
    const found = getEventById("mewtwo-2026-09")
    expect(found?.name).toBe("秘境リサーチ！ミュウツーをおいかけて")
  })

  it("存在しないIDはundefinedを返す", () => {
    expect(getEventById("nonexistent")).toBeUndefined()
  })
})

describe("EVENTS", () => {
  it("全イベントのidが一意である", () => {
    const ids = EVENTS.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
