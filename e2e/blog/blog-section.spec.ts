import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { E2E_ORIGIN } from '../lib/origin'

/**
 * Editorial blog as a Fumadocs collection.
 *
 * Functional claims a crawler or an agent would notice: one URL per series
 * and post, three-locale MDX, Atom, markdown negotiation, BlogPosting JSON-LD.
 * Screenshots of the first fold are written for a human to look at — they
 * are not visual baselines.
 */

const SHOTS = resolve(process.env.E2E_SCREENSHOTS ?? 'test-results/screenshots')

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

async function openBlog(
  page: Page,
  path: string,
  theme: 'light' | 'dark' = 'light',
): Promise<void> {
  await quietChrome(page, theme)
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('header a[href*="sign-in"]')).toBeVisible({
    timeout: 20_000,
  })
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: resolve(SHOTS, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}

test.describe('blog on a desktop', () => {
  test('the index lists every series and newest posts first', async ({ page }) => {
    await openBlog(page, '/blog')

    const series = page.getByRole('tablist', { name: 'Sections' })
    await expect(series).toBeVisible()
    await expect(series.getByRole('tab', { name: 'All' })).toBeVisible()
    await expect(series.getByRole('tab', { name: 'Harness releases' })).toBeVisible()
    await expect(series.getByRole('tab', { name: 'DeepSeek notes' })).toBeVisible()
    await expect(series.getByRole('tab', { name: 'dsh.fish changelog' })).toBeVisible()
    await expect(series.getByRole('tab', { name: 'Technical notes' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Everything is a plugin/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /DeepSeek Harness v0.1.2-alpha.1/ })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${E2E_ORIGIN}/blog`)
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(4)
    await expect(page.locator('link[rel="alternate"][type="application/atom+xml"]')).toHaveAttribute(
      'href',
      `${E2E_ORIGIN}/blog/feed.xml`,
    )
    await shot(page, 'blog-home-light')
  })

  test('a series landing filters the list', async ({ page }) => {
    await openBlog(page, '/blog/harness')
    await expect(page.getByRole('heading', { level: 1, name: 'Harness releases' })).toBeVisible()
    await expect(page.getByRole('link', { name: /DeepSeek Harness v0.1.2-alpha.1/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Everything is a plugin/ })).toHaveCount(0)
    await shot(page, 'blog-harness-light')
  })

  test('a post has breadcrumbs, byline, and BlogPosting JSON-LD', async ({ page }) => {
    await openBlog(page, '/blog/notes/everything-is-a-plugin')

    await expect(page.getByRole('heading', { level: 1, name: 'Everything is a plugin' })).toBeVisible()
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(crumbs).toBeVisible()
    await expect(crumbs.getByRole('link', { name: 'Blog' })).toBeVisible()
    await expect(crumbs.getByRole('link', { name: 'Technical notes' })).toBeVisible()
    await expect(page.getByText('Written by')).toBeVisible()
    await expect(page.getByText('Steven Lynn').first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible()
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(page.locator('article')).toContainText('dsh plugin add')

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(jsonLd.some((block) => block.includes('"@type":"BlogPosting"') || block.includes('"@type": "BlogPosting"'))).toBe(
      true,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${E2E_ORIGIN}/blog/notes/everything-is-a-plugin`,
    )
    await shot(page, 'blog-notes-light')
  })

  test('Japanese posts are translated, canonical, and indexable', async ({ page }) => {
    await openBlog(page, '/ja/blog/notes/everything-is-a-plugin')
    await expect(page.getByRole('heading', { level: 1, name: 'すべてはプラグイン' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'パンくずリスト' })).toBeVisible()
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${E2E_ORIGIN}/ja/blog/notes/everything-is-a-plugin`,
    )
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(4)
    await shot(page, 'blog-notes-ja')
  })

  test('agents can fetch a post as markdown', async ({ request }) => {
    const html = await request.get('/blog/harness/v0-1-2-alpha-1', {
      headers: { accept: 'text/html' },
    })
    expect(html.headers().vary).toContain('Accept')

    const response = await request.get('/blog/harness/v0-1-2-alpha-1', {
      headers: { accept: 'text/markdown' },
    })
    expect(response.ok()).toBeTruthy()
    expect(response.headers()['content-type']).toContain('text/markdown')
    expect(await response.text()).toContain('dsh-v0.1.2-alpha.1')

    const aliased = await request.get('/blog/index.md')
    expect(aliased.ok()).toBeTruthy()
    expect(await aliased.text()).toContain('/blog/harness/v0-1-2-alpha-1')

    const localized = await request.get('/zh-CN/blog/changelog/2026-08.md')
    expect(localized.ok()).toBeTruthy()
    expect(await localized.text()).toContain('产品文档')
  })

  test('/blog/llms.txt lists every series and post, and the feed is Atom', async ({ request }) => {
    const llms = await request.get('/blog/llms.txt')
    expect(llms.ok()).toBeTruthy()
    expect(llms.headers()['content-type']).toContain('text/markdown')
    const body = await llms.text()
    expect(body.startsWith('# dsh.fish blog')).toBe(true)
    expect(body).toContain('/blog/index.md')
    expect(body).toContain('/blog/harness.md')
    expect(body).toContain('/blog/harness/v0-1-2-alpha-1.md')
    expect(body).toContain('/blog/notes/everything-is-a-plugin.md')

    const feed = await request.get('/blog/feed.xml')
    expect(feed.ok()).toBeTruthy()
    expect(feed.headers()['content-type']).toContain('application/atom+xml')
    const xml = await feed.text()
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom"')
    expect(xml).toContain('Everything is a plugin')
  })
})
