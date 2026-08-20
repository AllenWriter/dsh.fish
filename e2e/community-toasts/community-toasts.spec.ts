import { expect, test, type Page } from '@playwright/test'
import { E2E_ORIGIN } from '../lib/origin'

/**
 * The site-wide community toasts, in a browser.
 *
 * The unit test proves the cookie can be read back. What only a browser can
 * show is the part the cookie exists for: that a dismissal survives a reload
 * because the loader never offered the toast again, not because the client
 * hid it; that the three destinations are real links with the right target;
 * and that a reader who asked for reduced motion is never moved.
 *
 * The stack is deliberately late — it waits for the page to have itself for a
 * moment — so every test here waits for the first row rather than for load.
 */

// The one live region on the page. Matching on `aria-live` rather than the
// tag keeps this off any ordered list a page happens to label.
const STACK = 'ol[aria-live="polite"]'
const ROW = `${STACK} li`

async function openWithStack(page: Page, path = '/'): Promise<void> {
  await page.goto(path, { waitUntil: 'load' })
  await expect(page.locator(ROW).first()).toBeVisible()
  // The last row's entrance is staggered behind the first; wait for all three
  // rather than racing the cascade.
  await expect(page.locator(ROW)).toHaveCount(3)
}

/** The negotiated-language path: an explicit choice lives in the cookie. */
async function openWithStackInJapanese(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: 'dsh_locale', value: 'ja', url: E2E_ORIGIN },
  ])
  await openWithStack(page)
}

test.describe('the community stack', () => {
  test('offers three destinations, each a real link', async ({ page }) => {
    await openWithStack(page)

    const links = page.locator(`${ROW} a`)
    await expect(links).toHaveCount(3)

    await expect(links.nth(0)).toHaveAttribute('href', 'https://discord.gg/PwZDHH4mv3')
    await expect(links.nth(1)).toHaveAttribute('href', 'https://x.com/stv_lynn')
    await expect(links.nth(2)).toHaveAttribute(
      'href',
      'https://github.com/stvlynn/dsh.fish/issues',
    )

    // Every destination is off this site: each opens in its own tab, and none
    // hands the opener over.
    for (const index of [0, 1, 2]) {
      await expect(links.nth(index)).toHaveAttribute('target', '_blank')
      await expect(links.nth(index)).toHaveAttribute('rel', /noopener/)
    }
  })

  test('names its region and every dismiss control', async ({ page }) => {
    await openWithStack(page)

    await expect(page.locator(STACK)).toHaveAttribute('aria-live', 'polite')
    const dismiss = page.getByRole('button', { name: 'Dismiss' })
    await expect(dismiss).toHaveCount(3)
  })

  test('follows the reader to another page without replaying', async ({ page }) => {
    await openWithStack(page)
    await page.getByRole('link', { name: 'Browse', exact: true }).first().click()
    await expect(page).toHaveURL(/\/browse$/)
    await expect(page.locator(ROW)).toHaveCount(3)
  })

  test('speaks the language the reader negotiated', async ({ page }) => {
    await openWithStackInJapanese(page)
    await expect(page.locator(STACK)).toHaveAttribute('aria-label', 'コミュニティ')
    await expect(page.locator(`${ROW} a`).nth(0)).toHaveText('Discord に参加')
  })
})

test.describe('dismissal', () => {
  test('retires one toast, then all of them, and remembers', async ({ page, context }) => {
    await openWithStack(page)

    await page.locator(ROW).first().getByRole('button').click()
    await expect(page.locator(ROW)).toHaveCount(2)

    const afterOne = (await context.cookies()).find((cookie) => cookie.name === 'community')
    expect(afterOne?.value).toBe('discord')

    await page.locator(ROW).first().getByRole('button').click()
    await page.locator(ROW).first().getByRole('button').click()
    await expect(page.locator(ROW)).toHaveCount(0)

    const afterAll = (await context.cookies()).find((cookie) => cookie.name === 'community')
    expect(afterAll?.value).toBe('discord.x.feedback')
  })

  test('survives a reload as a smaller stack, not as a hidden one', async ({ page, context }) => {
    await context.addCookies([{ name: 'community', value: 'discord', url: E2E_ORIGIN }])

    await page.goto('/', { waitUntil: 'load' })
    await expect(page.locator(ROW)).toHaveCount(2)
    // The retired one is gone, and the two that remain kept their order.
    await expect(page.locator(`${ROW} a`).nth(0)).toHaveAttribute('href', 'https://x.com/stv_lynn')
    await expect(page.locator(`${ROW} a`).nth(1)).toHaveAttribute(
      'href',
      'https://github.com/stvlynn/dsh.fish/issues',
    )
  })

  test('leaves nothing behind once every toast is retired', async ({ page, context }) => {
    await context.addCookies([{ name: 'community', value: 'discord.x.feedback', url: E2E_ORIGIN }])
    await page.goto('/', { waitUntil: 'load' })
    // Long enough that the reveal delay would have fired if there were a stack.
    await page.waitForTimeout(1500)
    await expect(page.locator(STACK)).toHaveCount(0)
  })
})

test.describe('reduced motion', () => {
  test('fades the stack in and never moves it', async ({ page }) => {
    // Emulated on the page rather than declared as a fixture, so the
    // preference is asserted to be in force before anything is read from it.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openWithStack(page)
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    ).toBe(true)

    // Sampled across the whole entrance: displacement at any point would be
    // motion a reader asked not to be shown. An identity matrix counts as
    // still — the animation library may write one — anything else does not.
    for (let sample = 0; sample < 6; sample += 1) {
      const transforms = await page
        .locator(ROW)
        .evaluateAll((rows) => rows.map((row) => getComputedStyle(row).transform))
      const moved = transforms.filter(
        (transform) => transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)',
      )
      expect(moved, `sample ${sample}: a row was displaced`).toEqual([])
      await page.waitForTimeout(80)
    }

    await expect(page.locator(ROW).first()).toHaveCSS('opacity', '1')
  })
})
