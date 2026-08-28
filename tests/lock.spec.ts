import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

// Week1 の日付セル（index 0〜6）を取得するヘルパー
function dayCells(page: Parameters<typeof test>[1] extends infer T ? T : never) {
  return page
    .locator('main.hidden')
    .first()
    .locator('.relative')
    .first()
    .locator('.grid > div')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => localStorage.removeItem(k))
  })
  await page.reload()
  await page.waitForTimeout(500)
})

// 在庫を1個追加してバッグにアイテムを出す
async function addStock(page: Parameters<typeof test>[1] extends infer T ? T : never) {
  await page.locator('button', { hasText: '＋' }).first().click()
  await page.waitForSelector('[data-tap-item]')
}

// バッグのアイテムをタップ選択して指定セルの最初の空スロットに配置する
async function placeItem(
  page: Parameters<typeof test>[1] extends infer T ? T : never,
  cellIndex: number
) {
  const bagItem = page.locator('[data-tap-item]').first()
  await bagItem.click()
  const cell = dayCells(page).nth(cellIndex)
  await cell.locator('.border-dashed').first().click()
}

test.describe('ロック機能', () => {
  test('ロックボタンをクリックするとロック状態になる', async ({ page }) => {
    const cell = dayCells(page).nth(0)
    await cell.locator('button[title="ロック"]').click()
    await expect(cell.locator('button[title="ロック解除"]')).toBeVisible()
  })

  test('ロック解除ボタンをクリックすると非ロック状態に戻る', async ({ page }) => {
    const cell = dayCells(page).nth(0)
    await cell.locator('button[title="ロック"]').click()
    await cell.locator('button[title="ロック解除"]').click()
    await expect(cell.locator('button[title="ロック"]')).toBeVisible()
  })

  test('非ロック時はスロットにアイテムを配置できる', async ({ page }) => {
    await addStock(page)
    const cell = dayCells(page).nth(0)
    const emptySlot = cell.locator('.border-dashed').first()
    await page.locator('[data-tap-item]').first().click()
    await emptySlot.click()
    await expect(cell.locator('img[alt]:not([alt=""])').first()).toBeVisible()
  })

  test('ロック中はバッグからスロットへの配置がブロックされる', async ({ page }) => {
    await addStock(page)
    const cell = dayCells(page).nth(0)

    // ロック
    await cell.locator('button[title="ロック"]').click()

    // タップ選択してスロットをクリック
    await page.locator('[data-tap-item]').first().click()
    const emptySlot = cell.locator('.border-dashed').first()
    await emptySlot.click()

    // スロットにアイテム画像が出ていないこと
    await expect(cell.locator('img[alt]:not([alt=""])')).toHaveCount(0)
  })

  test('ロック中は配置済みアイテムの削除（−ボタン）がブロックされる', async ({ page }) => {
    await addStock(page)
    // 未ロック状態でアイテムを配置
    await placeItem(page, 0)

    const cell = dayCells(page).nth(0)
    // アイテムが配置されたことを確認
    await expect(cell.locator('img[alt]:not([alt=""])').first()).toBeVisible()

    // ロック
    await cell.locator('button[title="ロック"]').click()

    // スロット内の−ボタン（削除ボタン）をクリック
    await cell.locator('.border-red-200 button').first().click()

    // アイテムがまだ残っていること
    await expect(cell.locator('img[alt]:not([alt=""])').first()).toBeVisible()
  })

  test('ロック中は「全てバッグに戻す」でロック日のスロットが維持される', async ({ page }) => {
    await addStock(page)
    await placeItem(page, 0)

    const cell = dayCells(page).nth(0)
    await expect(cell.locator('img[alt]:not([alt=""])').first()).toBeVisible()

    // ロック
    await cell.locator('button[title="ロック"]').click()

    // 全てバッグに戻す
    page.once('dialog', d => d.accept())
    await page.locator('button', { hasText: 'バッグに戻す' }).click()

    // ロック日のアイテムは残っていること
    await expect(cell.locator('img[alt]:not([alt=""])').first()).toBeVisible()
  })

  test('ロック解除後は再びアイテムを配置できる', async ({ page }) => {
    await addStock(page)
    const cell = dayCells(page).nth(0)

    // ロック → 解除
    await cell.locator('button[title="ロック"]').click()
    await cell.locator('button[title="ロック解除"]').click()

    // 配置できること
    await page.locator('[data-tap-item]').first().click()
    await cell.locator('.border-dashed').first().click()
    await expect(cell.locator('img[alt]:not([alt=""])').first()).toBeVisible()
  })

  test('ロックは隣の日付セルに影響を与えない', async ({ page }) => {
    await addStock(page)
    await addStock(page)

    // 0日目をロック
    const cell0 = dayCells(page).nth(0)
    await cell0.locator('button[title="ロック"]').click()

    // 1日目（非ロック）にアイテムを配置できること
    const cell1 = dayCells(page).nth(1)
    await page.locator('[data-tap-item]').first().click()
    await cell1.locator('.border-dashed').first().click()
    await expect(cell1.locator('img[alt]:not([alt=""])').first()).toBeVisible()

    // 0日目は空のまま
    await expect(cell0.locator('img[alt]:not([alt=""])')).toHaveCount(0)
  })

  test('「全てバッグに戻す」は非ロック日のスロットをクリアする', async ({ page }) => {
    await addStock(page)
    await addStock(page)

    // 0日目と1日目にアイテムを配置
    await placeItem(page, 0)
    await addStock(page)
    await placeItem(page, 1)

    // 1日目だけロック
    const cell1 = dayCells(page).nth(1)
    await cell1.locator('button[title="ロック"]').click()

    // 全てバッグに戻す
    page.once('dialog', d => d.accept())
    await page.locator('button', { hasText: 'バッグに戻す' }).click()

    // 0日目（非ロック）はクリアされている
    const cell0 = dayCells(page).nth(0)
    await expect(cell0.locator('img[alt]:not([alt=""])')).toHaveCount(0)

    // 1日目（ロック）はアイテムが残っている
    await expect(cell1.locator('img[alt]:not([alt=""])').first()).toBeVisible()
  })
})
