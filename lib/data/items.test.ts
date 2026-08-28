import { describe, it, expect } from "vitest"
import { getIncenseById, INCENSE_MASTERS } from "./items"

describe("getIncenseById", () => {
  it("実在するIDでアイテムを取得できる", () => {
    const item = getIncenseById("mewtwo")
    expect(item?.name).toBe("ミュウツーのおこう")
  })

  it("存在しないIDはundefinedを返す", () => {
    expect(getIncenseById("nonexistent")).toBeUndefined()
  })
})

describe("INCENSE_MASTERS", () => {
  it("全アイテムのidが一意である", () => {
    const ids = INCENSE_MASTERS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("全アイテムがimageUrlを持つ（画像パス欠落の防止）", () => {
    for (const item of INCENSE_MASTERS) {
      expect(item.imageUrl, `${item.id} の imageUrl`).toMatch(/^\/img\//)
    }
  })
})
