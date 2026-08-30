import { expect, test } from '@playwright/test'

/**
 * Community toasts were plugin-hub chrome (Discord, catalog feed, plugin
 * nominations). The default reader experience is a personal blog + docs site,
 * so the stack is not mounted.
 */
const STACK = 'ol[aria-live="polite"]'

test.describe('the community stack', () => {
  test('is not offered on the default chrome', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForTimeout(1200)
    await expect(page.locator(STACK)).toHaveCount(0)
  })
})
