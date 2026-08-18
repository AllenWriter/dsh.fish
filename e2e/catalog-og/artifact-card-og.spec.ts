import { mkdirSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const catalogOg = `${process.cwd()}/e2e/catalog-og`
const stylesheet = `${process.cwd()}/frontend/src/app/styles/app.css`
// Review artifacts, not assertions: `OG_SHOTS_DIR` points the hosted runner at
// its artifact mount, and everywhere else the captures land in the gitignored
// Playwright output tree.
const shots = process.env.OG_SHOTS_DIR ?? `${process.cwd()}/test-results/catalog-og`

/**
 * The product's own tokens, lifted out of `app.css` and rewritten onto the
 * selectors this fixture uses.
 *
 * The fixture used to restate the palette inline, which is how it ended up
 * asserting contrast against a set of colours the product had already left behind.
 * Reading the stylesheet means a palette change cannot pass this suite by being
 * invisible to it. Only the `:root` and `:root.dark` blocks are taken: the
 * `prefers-color-scheme` copy is the same palette, and this fixture switches theme
 * by adding a class.
 */
function designTokens(): string {
  const css = readFileSync(stylesheet, 'utf8')
  const block = (from: string, to: string) => {
    const body = css.slice(css.indexOf(from) + from.length, css.indexOf(to))
    return body.slice(0, body.lastIndexOf('}'))
  }
  return [
    `:root {${block(':root {', ':root.dark {')}}`,
    `html.dark {${block(':root.dark {', '@media (prefers-color-scheme: dark)')}}`,
  ].join('\n')
}

async function openPreview(page: Page, theme: 'light' | 'dark') {
  const html = readFileSync(`${catalogOg}/og-card-preview.html`, 'utf8').replace(
    '/* {{TOKENS}} */',
    designTokens(),
  )
  await page.route('**/og-card-preview.html', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }),
  )
  await page.route('**/fixtures/custom-og.png', (route) =>
    route.fulfill({
      contentType: 'image/png',
      path: `${catalogOg}/fixtures/custom-og.png`,
    }),
  )
  await page.route('**/fixtures/generated-og.png', (route) =>
    route.fulfill({
      contentType: 'image/png',
      path: `${catalogOg}/fixtures/generated-og.png`,
    }),
  )
  await page.goto('/og-card-preview.html')
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
    mkdirSync(shots, { recursive: true })
    await openPreview(page, 'light')
    await page.screenshot({
      path: `${shots}/artifact-card-og-light.png`,
      fullPage: true,
    })
    await page.locator('[data-card="generated"]').screenshot({
      path: `${shots}/artifact-card-og-generated-light.png`,
    })
    await page.locator('[data-card="custom"]').screenshot({
      path: `${shots}/artifact-card-og-custom-light.png`,
    })

    await openPreview(page, 'dark')
    await page.screenshot({
      path: `${shots}/artifact-card-og-dark.png`,
      fullPage: true,
    })
    await page.locator('[data-card="generated"]').screenshot({
      path: `${shots}/artifact-card-og-generated-dark.png`,
    })
  })
})
