import { expect, test } from '@playwright/test'
import { awaitHydration, hitArea, markOf } from '../lib/icons.ts'

/**
 * The icon controls a thumb has to hit.
 *
 * One phone rather than the device matrix the readme suite needs: a hit area is
 * CSS pixels and does not change with the viewport, so the thing worth checking
 * here is that a coarse pointer gets the larger target and that the controls only
 * a phone shows — the menu toggle, the mobile navigation sheet — are marked and
 * reachable.
 */

test.describe('the mobile menu toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/browse', { waitUntil: 'domcontentloaded' })
    await awaitHydration(page)
  })

  test('swaps its mark, and reports the state it swapped into', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Menu' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const closed = await markOf(toggle)

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    // The mark is the visible half of the state; `aria-expanded` is the half a
    // screen reader gets. Neither is left to carry it alone.
    await expect.poll(async () => markOf(toggle)).not.toEqual(closed)
  })

  test('gets 44px of thumb', async ({ page }) => {
    const area = await hitArea(page.getByRole('button', { name: 'Menu' }))
    expect(area.width).toBeGreaterThanOrEqual(44)
    expect(area.height).toBeGreaterThanOrEqual(44)
  })

  test('opens a sheet whose destinations are marked and tall enough to tap', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click()

    const sheet = page.locator('nav.overflow-hidden')
    await expect(sheet).toBeVisible()

    const links = sheet.getByRole('link')
    await expect(links).toHaveCount(3)
    for (let index = 0; index < 3; index += 1) {
      const link = links.nth(index)
      await expect(link.locator('svg')).toHaveCount(1)
      const box = await link.boundingBox()
      expect(box, `sheet link ${index}`).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('the rest of the touch surface', () => {
  test('the language and theme controls get 44px too', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await awaitHydration(page)

    for (const name of [/^Language$/, /^Switch to/]) {
      const area = await hitArea(page.getByRole('button', { name }))
      expect(area.width).toBeGreaterThanOrEqual(44)
      expect(area.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('the empty-state actions are marked and tappable', async ({ page }) => {
    await page.goto('/browse?q=zzzznothinghere', { waitUntil: 'domcontentloaded' })

    const panel = page.locator('.border-dashed')
    await expect(panel).toContainText('Nothing matches those filters yet.')

    const actions = panel.getByRole('link')
    await expect(actions).toHaveCount(2)
    for (let index = 0; index < 2; index += 1) {
      await expect(actions.nth(index).locator('svg')).toHaveCount(1)
      const box = await actions.nth(index).boundingBox()
      expect(box, `action ${index}`).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('a kind chip keeps its mark clear of its label at phone width', async ({ page }) => {
    await page.goto('/browse', { waitUntil: 'domcontentloaded' })

    const chip = page.getByRole('article').first().locator('span').filter({ hasText: /\w/ }).first()
    const glyph = chip.locator('svg')
    await expect(glyph).toBeVisible()

    const chipBox = await chip.boundingBox()
    const glyphBox = await glyph.boundingBox()
    expect(chipBox).not.toBeNull()
    expect(glyphBox).not.toBeNull()
    // The gap the chip declares, so the 12px label never touches the mark.
    expect(glyphBox!.x + glyphBox!.width).toBeLessThan(chipBox!.x + chipBox!.width - 4)
  })
})
