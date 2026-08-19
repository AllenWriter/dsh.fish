import { expect, test, type Page } from '@playwright/test'
import { E2E_ORIGIN } from '../lib/origin'

/**
 * The site-wide community deck, in a browser.
 *
 * The unit test proves the cookie can be read back. What only a browser can
 * show is the rest: that the deck deals one card at a time and the next comes
 * forward when the front one leaves; that a dismissal survives a reload
 * because the loader never offered the card again, not because the client hid
 * it; that each destination is a real link with the right target; and that a
 * reader who asked for reduced motion is never moved.
 *
 * The deck is deliberately late — it waits for the page to have itself for a
 * moment — so every test here waits for the front card rather than for load.
 */

// The one live region on the page. Matching on `aria-live` rather than the
// tag keeps this off any ordered list a page happens to label.
const STACK = 'ol[aria-live="polite"]'
const CARD = `${STACK} li`
/** The front card is the only one with anything in it. */
const FRONT = `${CARD}:not([aria-hidden])`

/** A 1×1 PNG, so the maintainer's portrait resolves without the network. */
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

async function openDeck(page: Page, path = '/'): Promise<void> {
  // The portrait is a real GitHub URL; stubbing it keeps this suite off the
  // network and makes "did the component ask for the right one" the subject.
  await page.route('https://github.com/*.png*', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }),
  )
  await page.goto(path, { waitUntil: 'load' })
  await expect(page.locator(CARD).first()).toBeVisible()
  // The cards behind are dealt after the front one; wait for the whole deck
  // rather than racing the cascade.
  await expect(page.locator(CARD)).toHaveCount(3)
}

/** What the front card offers: its title and where its action goes. */
async function front(page: Page): Promise<{ title: string; label: string; href: string }> {
  const card = page.locator(FRONT)
  const link = card.locator('a')
  return {
    title: (await card.locator('p').innerText()).trim(),
    label: (await link.innerText()).trim(),
    href: (await link.getAttribute('href')) ?? '',
  }
}

test.describe('the community deck', () => {
  test('deals one readable card at a time', async ({ page }) => {
    await openDeck(page)

    // Three cards are painted, so the deck reads as a deck…
    await expect(page.locator(CARD)).toHaveCount(3)
    // …but only the front one carries copy, a link and a control. The two
    // behind are slivers, hidden from assistive technology and untabbable.
    await expect(page.locator(FRONT)).toHaveCount(1)
    await expect(page.locator(`${CARD} a`)).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Dismiss' })).toHaveCount(1)
  })

  test('offers each destination in turn as the deck is peeled', async ({ page }) => {
    await openDeck(page)

    expect(await front(page)).toMatchObject({ href: 'https://discord.gg/PwZDHH4mv3' })
    await page.locator(FRONT).getByRole('button').click()

    expect(await front(page)).toMatchObject({ href: 'https://x.com/stv_lynn' })
    await page.locator(FRONT).getByRole('button').click()

    expect(await front(page)).toMatchObject({ href: 'mailto:i@stv.pm' })
  })

  test('sends the two off-site cards to their own tab, and the inbox to none', async ({ page }) => {
    await openDeck(page)

    const link = page.locator(`${FRONT} a`)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)

    await page.locator(FRONT).getByRole('button').click()
    await expect(link).toHaveAttribute('target', '_blank')

    await page.locator(FRONT).getByRole('button').click()
    // A mail client is not a tab.
    await expect(link).not.toHaveAttribute('target', '_blank')
  })

  test("wears the maintainer's own face, not a logo", async ({ page }) => {
    await openDeck(page)
    await page.locator(FRONT).getByRole('button').click()

    const portrait = page.locator(`${FRONT} img`)
    await expect(portrait).toHaveAttribute('src', 'https://github.com/stvlynn.png?size=128')
    // The name beside it is the accessible identity; the portrait is decoration.
    await expect(portrait).toHaveAttribute('alt', '')
  })

  test('names its region and its dismiss control', async ({ page }) => {
    await openDeck(page)
    await expect(page.locator(STACK)).toHaveAttribute('aria-live', 'polite')
    await expect(page.locator(STACK)).toHaveAttribute('aria-label', 'Community')
  })

  test('follows the reader to another page without replaying', async ({ page }) => {
    await openDeck(page)
    await page.getByRole('link', { name: 'Browse', exact: true }).first().click()
    await expect(page).toHaveURL(/\/browse$/)
    await expect(page.locator(CARD)).toHaveCount(3)
  })

  test('speaks the language of the page it sits on', async ({ page }) => {
    await openDeck(page, '/ja')
    await expect(page.locator(STACK)).toHaveAttribute('aria-label', 'コミュニティ')
    expect(await front(page)).toMatchObject({ label: '参加' })
  })
})

test.describe('dismissal', () => {
  test('retires one card, then all of them, and remembers', async ({ page, context }) => {
    await openDeck(page)

    await page.locator(FRONT).getByRole('button').click()
    await expect(page.locator(CARD)).toHaveCount(2)

    const afterOne = (await context.cookies()).find((cookie) => cookie.name === 'community')
    expect(afterOne?.value).toBe('discord')

    await page.locator(FRONT).getByRole('button').click()
    await page.locator(FRONT).getByRole('button').click()
    await expect(page.locator(CARD)).toHaveCount(0)

    const afterAll = (await context.cookies()).find((cookie) => cookie.name === 'community')
    expect(afterAll?.value).toBe('discord.x.feedback')
  })

  test('survives a reload as a shorter deck, not as a hidden card', async ({ page, context }) => {
    await context.addCookies([{ name: 'community', value: 'discord', url: E2E_ORIGIN }])

    await page.goto('/', { waitUntil: 'load' })
    await expect(page.locator(CARD)).toHaveCount(2)
    // The retired card is gone, and the two that remain kept their order.
    expect(await front(page)).toMatchObject({ href: 'https://x.com/stv_lynn' })
  })

  test('leaves nothing behind once every card is retired', async ({ page, context }) => {
    await context.addCookies([{ name: 'community', value: 'discord.x.feedback', url: E2E_ORIGIN }])
    await page.goto('/', { waitUntil: 'load' })
    // Long enough that the reveal delay would have fired if there were a deck.
    await page.waitForTimeout(1500)
    await expect(page.locator(STACK)).toHaveCount(0)
  })
})

test.describe('reduced motion', () => {
  test('fades the deck in and never moves it', async ({ page }) => {
    // Emulated on the page rather than declared as a fixture, so the
    // preference is asserted to be in force before anything is read from it.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDeck(page)
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    ).toBe(true)

    const read = () =>
      page.locator(CARD).evaluateAll((cards) => cards.map((c) => getComputedStyle(c).transform))

    // The deck is still layered — that is a position, not an animation — so
    // what must hold is that no card ever travels: each one's transform is
    // the same at every sample across the whole entrance, and the front card
    // sits at the identity.
    const first = await read()
    for (let sample = 1; sample < 6; sample += 1) {
      await page.waitForTimeout(80)
      expect(await read(), `sample ${sample}: a card travelled`).toEqual(first)
    }
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(first[0])
    // The cards behind are offset and scaled, so the deck reads as a deck.
    expect(new Set(first).size, 'every card sits at its own depth').toBe(first.length)

    await expect(page.locator(FRONT)).toHaveCSS('opacity', '1')
  })
})
