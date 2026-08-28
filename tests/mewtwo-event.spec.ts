import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => localStorage.removeItem(k))
  })
  await page.reload()
  await page.waitForTimeout(500)
})

test.describe('ミュウツーイベント', () => {
  test('初期表示がミュウツーイベントになっている', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('秘境リサーチ！ミュウツーをおいかけて')
  })

  test('ヘッダーの期間表示が9/14〜9/27になっている', async ({ page }) => {
    await expect(page.locator('header')).toContainText('9/14(月)')
    await expect(page.locator('header')).toContainText('9/27(日)')
  })

  test('交換所の見出しが「いでんし交換所」で🧬アイコンを使う', async ({ page }) => {
    const heading = page.locator('text=いでんし交換所')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText('🧬')
    await expect(page.locator('text=うもう交換所')).toHaveCount(0)
  })

  test('交換所にミュウツーのおこう・ミュウツーサブレの行が表示される', async ({ page }) => {
    await expect(page.locator('text=ミュウツーのおこう×1').first()).toBeVisible()
    await expect(page.locator('text=ミュウツーサブレ×1').first()).toBeVisible()
  })

  test('交換所の単価表示に🧬が使われ🪶は使われない', async ({ page }) => {
    await expect(page.locator('text=🧬').first()).toBeVisible()
    await expect(page.locator('text=🪶')).toHaveCount(0)
  })

  test('バッグにミュウツーのおこう・ミュウツーサブレが並ぶ', async ({ page }) => {
    await expect(page.locator('img[alt="ミュウツーのおこう"]').first()).toBeVisible()
    await expect(page.locator('img[alt="ミュウツーサブレ"]').first()).toBeVisible()
  })

  test('前のイベント（ラティオス）に切り替えると「うもう交換所」表示に戻る', async ({ page }) => {
    await page.locator('button[aria-label="前のイベント"]').click()
    await expect(page.locator('h1')).toHaveText('ラティオスとこころのしずく')
    await expect(page.locator('text=うもう交換所')).toBeVisible()
    await expect(page.locator('text=いでんし交換所')).toHaveCount(0)
  })
})
