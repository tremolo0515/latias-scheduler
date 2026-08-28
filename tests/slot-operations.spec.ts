import { test, expect, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

// Week1 の日付セル（index 0〜6）を取得するヘルパー
function dayCells(page: Page) {
  return page
    .locator('main.hidden')
    .first()
    .locator('.relative')
    .first()
    .locator('.grid > div')
}

// 「その他どうぐ」パネル（かいふくのおこう等、交換所と重複しないアイテムのみ含む）
function otherPanel(page: Page) {
  return page.locator('p', { hasText: 'その他どうぐ' }).locator('xpath=../..')
}

// その他どうぐの在庫を +ボタンで増やす
async function addOtherStock(page: Page, itemName: string, times = 1) {
  const row = otherPanel(page).locator(`img[alt="${itemName}"]`).locator('xpath=..')
  for (let i = 0; i < times; i++) {
    await row.locator('button', { hasText: '＋' }).click()
  }
}

// バッグ内の指定アイテムのタイル
function bagItem(page: Page, itemName: string) {
  return page.locator('[data-tap-item]').filter({ has: page.locator(`img[alt="${itemName}"]`) })
}

// バッグのアイテムをタップ選択して指定セルの最初の空スロットに配置する
async function placeNamed(page: Page, itemName: string, cellIndex: number) {
  await bagItem(page, itemName).click()
  const cell = dayCells(page).nth(cellIndex)
  await cell.locator('.border-dashed').first().click()
}

// 指定セル内で、指定アイテムが配置されているスロット要素（ItemSlot のルート div）
function placedSlot(page: Page, cellIndex: number, itemName: string) {
  return dayCells(page).nth(cellIndex).locator(`img[alt="${itemName}"]`).locator('xpath=..')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => localStorage.removeItem(k))
  })
  await page.reload()
  await page.waitForTimeout(500)
})

test.describe('スロットへの配置・削除操作', () => {
  test('在庫を追加するとバッグにアイテムが表示される', async ({ page }) => {
    await addOtherStock(page, 'かいふくのおこう', 1)
    await expect(bagItem(page, 'かいふくのおこう')).toBeVisible()
  })

  test('バッグのアイテムをタップするとスロットに配置できる', async ({ page }) => {
    await addOtherStock(page, 'かいふくのおこう', 1)
    await placeNamed(page, 'かいふくのおこう', 0)
    await expect(placedSlot(page, 0, 'かいふくのおこう')).toBeVisible()
  })

  test('配置したアイテムを−ボタンで削除するとスロットが空になりバッグに戻る', async ({ page }) => {
    await addOtherStock(page, 'かいふくのおこう', 1)
    await placeNamed(page, 'かいふくのおこう', 0)

    // 在庫を使い切っているのでバッグから消えている
    await expect(bagItem(page, 'かいふくのおこう')).toHaveCount(0)

    // スロットの−ボタンで削除
    await placedSlot(page, 0, 'かいふくのおこう').locator('button').click()

    // スロットが空になる
    await expect(placedSlot(page, 0, 'かいふくのおこう')).toHaveCount(0)
    // バッグに戻る
    await expect(bagItem(page, 'かいふくのおこう')).toBeVisible()
  })

  test('在庫を使い切るとバッグからアイテムが消え、それ以上配置できない', async ({ page }) => {
    await addOtherStock(page, 'かいふくのおこう', 1)
    await placeNamed(page, 'かいふくのおこう', 0)

    // 在庫1個を使い切ったのでバッグから消える
    await expect(bagItem(page, 'かいふくのおこう')).toHaveCount(0)

    // 別のセルにも配置できない（バッグにタイルが無いので何も起きない）
    const cell1 = dayCells(page).nth(1)
    await expect(cell1.locator('img[alt]:not([alt=""])')).toHaveCount(0)
  })

  test('同じ日の別スロットに同じアイテムを重複配置できない', async ({ page }) => {
    await addOtherStock(page, 'かいふくのおこう', 2)
    await placeNamed(page, 'かいふくのおこう', 0)

    // slot1が埋まったので、次の.border-dashedはslot2
    const cell = dayCells(page).nth(0)
    await bagItem(page, 'かいふくのおこう').click()
    await cell.locator('.border-dashed').first().click()

    // slot2には配置されず、同じ日には1個だけのまま
    await expect(cell.locator('img[alt="かいふくのおこう"]')).toHaveCount(1)
    // 在庫はまだ1個残っているのでバッグに残っている
    await expect(bagItem(page, 'かいふくのおこう')).toBeVisible()
  })

  test('配置済みアイテムをタップして別の日の空きスロットへ移動できる', async ({ page }) => {
    await addOtherStock(page, 'かいふくのおこう', 1)
    await placeNamed(page, 'かいふくのおこう', 0)

    // 配置済みアイテムをタップして選択
    await placedSlot(page, 0, 'かいふくのおこう').locator('img').click()

    // 別の日（index 1）の空きスロットをクリック
    const cell1 = dayCells(page).nth(1)
    await cell1.locator('.border-dashed').first().click()

    // 移動元（day0）は空になる
    await expect(placedSlot(page, 0, 'かいふくのおこう')).toHaveCount(0)
    // 移動先（day1）に配置される
    await expect(placedSlot(page, 1, 'かいふくのおこう')).toBeVisible()
  })

  test('ロック中の日にはタップ配置できない', async ({ page }) => {
    await addOtherStock(page, 'かいふくのおこう', 1)
    const cell = dayCells(page).nth(0)
    await cell.locator('button[title="ロック"]').click()

    await bagItem(page, 'かいふくのおこう').click()
    await cell.locator('.border-dashed').first().click()

    await expect(placedSlot(page, 0, 'かいふくのおこう')).toHaveCount(0)
    // 在庫は消費されずバッグに残る
    await expect(bagItem(page, 'かいふくのおこう')).toBeVisible()
  })
})
