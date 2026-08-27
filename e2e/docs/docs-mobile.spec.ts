import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { E2E_ORIGIN } from '../lib/origin'

const SHOTS = resolve(process.env.E2E_SCREENSHOTS ?? 'test-results/screenshots')

test.beforeAll(() => {
  mkdirSync(SHOTS, { recursive: true })
})

async function openQuiet(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page
    .context()
    .addCookies([{ name: 'community', value: 'discord.x.feedback', url: E2E_ORIGIN }])
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('article h1')).toBeVisible()
  await expect(page.locator('header a[href*="sign-in"]')).toBeVisible({
    timeout: 20_000,
  })
}

test.describe('product docs on a phone', () => {
  test('the menu is a sheet, not a second site chrome', async ({ page }) => {
    await openQuiet(page, '/docs')
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'DeepSeek Harness and dsh.fish',
      }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Documentation menu' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Documentation menu' })).toHaveCount(0)
    await page.screenshot({
      path: resolve(SHOTS, 'docs-home-mobile.png'),
      fullPage: true,
      animations: 'disabled',
    })

    await page.getByRole('button', { name: 'Documentation menu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Documentation menu' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Bundles' })).toBeVisible()
    await expect(dialog.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)
    await page.screenshot({
      path: resolve(SHOTS, 'docs-menu-mobile.png'),
      animations: 'disabled',
    })

    await dialog.getByRole('link', { name: 'CLI' }).click()
    await expect(page).toHaveURL(/\/docs\/cli$/)
    await expect(page.getByRole('heading', { level: 1, name: 'CLI' })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Documentation menu' })).toBeHidden()
    await page.screenshot({
      path: resolve(SHOTS, 'docs-cli-mobile.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
})
