import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const preview = path.join(here, 'og-card-preview.html')
const shots = '/opt/cursor/artifacts/screenshots'

async function openPreview(page: Page, theme: 'light' | 'dark') {
  await page.goto(`file://${preview}`)
  if (theme === 'dark') {
    await page.evaluate(() => document.documentElement.classList.add('dark'))
  }
}

test.describe('catalog card Social preview', () => {
  test('keeps title contrast while the OG image stays a texture', async ({ page }) => {
    await openPreview(page, 'light')

    const title = page.locator('[data-card="generated"] .title')
    const img = page.locator('[data-card="generated"] .artifact-og img')

    await expect(title).toBeVisible()
    await expect(img).toBeVisible()

    const imgStyles = await img.evaluate((el) => {
      const style = getComputedStyle(el)
      return { opacity: Number(style.opacity), filter: style.filter }
    })
    expect(imgStyles.opacity).toBeGreaterThan(0.3)
    expect(imgStyles.opacity).toBeLessThan(0.55)
    expect(imgStyles.filter).toContain('blur')

    const titleColor = await title.evaluate((el) => getComputedStyle(el).color)
    const oklch = titleColor.match(/oklch\(\s*([0-9.]+)/)
    expect(oklch?.[1]).toBeDefined()
    // Light-theme ink stays dark enough to read on the washed preview.
    expect(Number(oklch?.[1])).toBeLessThan(0.35)
  })

  test('captures light and dark treatments', async ({ page }) => {
    await mkdir(shots, { recursive: true })

    await openPreview(page, 'light')
    await page.screenshot({
      path: path.join(shots, 'artifact-card-og-light.png'),
      fullPage: true,
    })
    await page.locator('[data-card="generated"]').screenshot({
      path: path.join(shots, 'artifact-card-og-generated-light.png'),
    })
    await page.locator('[data-card="custom"]').screenshot({
      path: path.join(shots, 'artifact-card-og-custom-light.png'),
    })

    await openPreview(page, 'dark')
    await page.screenshot({
      path: path.join(shots, 'artifact-card-og-dark.png'),
      fullPage: true,
    })
    await page.locator('[data-card="generated"]').screenshot({
      path: path.join(shots, 'artifact-card-og-generated-dark.png'),
    })
  })
})
