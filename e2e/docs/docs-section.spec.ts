import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { E2E_ORIGIN } from '../lib/origin'

/**
 * Product docs as a Fumadocs section.
 *
 * Functional claims a crawler or an agent would notice: one URL per guide,
 * live scoring, markdown negotiation, search JSON not under `/api/`, Japanese
 * chrome around English MDX. Screenshots of the first fold are written for a
 * human to look at — they are not visual baselines.
 */

const SHOTS = resolve('/opt/cursor/artifacts/screenshots')

test.beforeAll(() => {
  mkdirSync(SHOTS, { recursive: true })
})

async function quietChrome(page: Page, theme: 'light' | 'dark' = 'light'): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.context().addCookies([
    { name: 'community', value: 'discord.x.feedback', url: E2E_ORIGIN },
    { name: 'theme', value: theme, url: E2E_ORIGIN },
  ])
}

async function openDocs(page: Page, path: string, theme: 'light' | 'dark' = 'light'): Promise<void> {
  await quietChrome(page, theme)
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('article h1')).toBeVisible()
  // Account slot is blank until the session resolves; the href is locale-stable.
  await expect(page.locator('header a[href*="sign-in"]')).toBeVisible({ timeout: 20_000 })
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: resolve(SHOTS, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}

test.describe('product docs on a desktop', () => {
  test('the section home has a sidebar, one h1, and the probe table', async ({ page }) => {
    await openDocs(page, '/docs')

    const menu = page.getByRole('navigation', { name: 'Documentation menu' })
    await expect(menu).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Publishing to dsh.fish' })).toBeVisible()
    await expect(page.locator('article h1')).toHaveCount(1)
    await expect(menu.getByRole('link', { name: 'Hook bridges' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'CLI' })).toBeVisible()
    await expect(page.locator('article table')).toContainText('SKILL.md')
    await shot(page, 'docs-home-light')
  })

  test('a nested guide has a TOC and copyable fences', async ({ page }) => {
    await openDocs(page, '/docs/cli')

    await expect(page.getByRole('heading', { level: 1, name: 'CLI' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Install an artifact' })).toBeVisible()
    await expect(page.locator('article pre').first()).toContainText('npx @dsh-fish/cli add')
    await expect(page.locator('article').getByRole('button', { name: 'Copy' }).first()).toBeVisible()
    await shot(page, 'docs-cli-light')
  })

  test('hook bridges and scoring are their own documents', async ({ page }) => {
    await openDocs(page, '/docs/publish/hook-bridge')
    await expect(page.getByRole('heading', { level: 1, name: 'Hook bridges' })).toBeVisible()
    await expect(page.locator('article pre').first()).toContainText('"kind": "hook-bridge"')
    await shot(page, 'docs-hook-bridge-light')

    await page.getByRole('navigation', { name: 'Documentation menu' }).getByRole('link', { name: 'How the score works' }).click()
    await expect(page).toHaveURL(/\/docs\/scoring$/)
    await expect(page.getByRole('heading', { level: 1, name: 'How the score works' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Three dimensions, blended by weight' })).toBeVisible()
    await expect(page.locator('article').getByText(/score = round\(/)).toBeVisible()
    await expect(page.locator('article .tabular-nums').first()).toBeVisible()
    await shot(page, 'docs-scoring-light')
  })

  test('sidebar search filters the tree without a round trip', async ({ page }) => {
    await openDocs(page, '/docs')
    const menu = page.getByRole('navigation', { name: 'Documentation menu' })
    await page.getByRole('searchbox', { name: 'Search docs' }).fill('hook')
    await expect(menu.getByRole('link', { name: 'Hook bridges' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'CLI' })).toHaveCount(0)
    await expect(page.getByText('No matching pages')).toHaveCount(0)
    await shot(page, 'docs-search-filter-light')
  })

  test('Japanese chrome wraps the English MDX', async ({ page }) => {
    await openDocs(page, '/ja/docs')
    await expect(page.getByRole('navigation', { name: 'ドキュメントメニュー' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Publishing to dsh.fish' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'ドキュメントを検索' })).toBeVisible()
    await shot(page, 'docs-home-ja')
  })

  test('dark theme keeps the same structure', async ({ page }) => {
    await openDocs(page, '/docs', 'dark')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('heading', { level: 1, name: 'Publishing to dsh.fish' })).toBeVisible()
    await shot(page, 'docs-home-dark')
  })

  test('search JSON lives under /docs/search, not /api/search', async ({ request }) => {
    const found = await request.get('/docs/search?q=cli')
    expect(found.ok()).toBeTruthy()
    const body = (await found.json()) as { hits: { url: string; title: string }[] }
    expect(body.hits.some((hit) => hit.url === '/docs/cli')).toBe(true)

    const api = await request.get('/api/search')
    expect(api.status()).toBeGreaterThanOrEqual(400)
  })

  test('agents can fetch a guide as markdown', async ({ request }) => {
    const response = await request.get('/docs/cli', { headers: { accept: 'text/markdown' } })
    expect(response.ok()).toBeTruthy()
    expect(response.headers()['content-type']).toContain('text/markdown')
    expect(await response.text()).toContain('npx @dsh-fish/cli')
  })
})
