import { expect, test, type Page } from '@playwright/test'
import { E2E_ORIGIN } from '../lib/origin'

const GITHUB = '/a/dsh-postgres-mcp'
const NPM = '/a/dsh-turtle-ui'
const ASK = '**/api/v1/artifacts/*/ask'
const QUERY_ID = 'what-is-this-plugin_11111111-2222-3333-4444-555555555555'

function sseBody(extraDelta = 'It exposes Postgres as tools.'): string {
  return [
    'event: file',
    'data: {"repo":"acme/postgres-mcp","path":"src/index.ts"}',
    '',
    'event: delta',
    `data: ${JSON.stringify({ text: extraDelta })}`,
    '',
    'event: cite',
    'data: {"repo":"acme/postgres-mcp","path":"src/index.ts","start":1,"end":20}',
    '',
    'event: done',
    'data: {}',
    '',
  ].join('\n')
}

async function mockAsk(page: Page, handler: (post: { question: string; queryId?: string }) => { status: number; body: string; queryId?: string; contentType?: string }) {
  await page.route(ASK, async (route) => {
    const post = (route.request().postDataJSON() ?? {}) as { question: string; queryId?: string }
    const result = handler(post)
    await route.fulfill({
      status: result.status,
      contentType: result.contentType ?? (result.status === 200 ? 'text/event-stream' : 'application/json'),
      headers:
        result.status === 200
          ? { 'x-ask-query-id': result.queryId ?? QUERY_ID, 'cache-control': 'no-store' }
          : {},
      body: result.body,
    })
  })
}

function askPanel(page: Page) {
  return page.locator('[role="dialog"][aria-modal="true"]').filter({
    has: page.getByLabel('Ask about this repository…'),
  })
}

async function openAsk(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ask this project' }).click({ force: true })
  await expect(page.getByLabel('Ask about this repository…')).toBeVisible()
}

test.describe('artifact ask', () => {
  test.beforeEach(async ({ context }) => {
    // The community stack sits in the same corner as the ask drawer and
    // intercepts clicks. Retire it the way a returning reader would.
    await context.addCookies([{ name: 'community', value: 'discord.x.feedback', url: E2E_ORIGIN }])
  })

  test('shows the rail control on GitHub plugins and not on npm', async ({ page }) => {
    await page.goto(GITHUB, { waitUntil: 'load' })
    await expect(page.getByRole('button', { name: 'Ask this project' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Install', level: 2 })).toBeVisible()

    await page.goto(NPM, { waitUntil: 'load' })
    await expect(page.getByRole('button', { name: 'Ask this project' })).toHaveCount(0)
  })

  test('streams an answer, cites a path, and links DeepWiki', async ({ page }) => {
    const posts: Array<{ question: string; queryId?: string }> = []
    await mockAsk(page, (post) => {
      posts.push(post)
      return { status: 200, body: sseBody() }
    })

    await page.goto(GITHUB, { waitUntil: 'load' })
    await openAsk(page)
    const composer = page.getByLabel('Ask about this repository…')
    await expect(composer).toBeVisible()
    await composer.fill('What is this plugin?')
    await page.getByRole('button', { name: 'Send prompt' }).click()

    await expect(page.getByText('Reading src/index.ts')).toBeVisible()
    await expect(page.getByText('It exposes Postgres as tools.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on DeepWiki' })).toHaveAttribute(
      'href',
      `https://deepwiki.com/search/${QUERY_ID}`,
    )
    expect(posts[0]?.queryId).toBeUndefined()

    await composer.fill('And the license?')
    await page.getByRole('button', { name: 'Send prompt' }).click()
    await expect.poll(() => posts.length).toBe(2)
    expect(posts[1]?.queryId).toBe(QUERY_ID)
  })

  test('shows rate-limit copy and re-enables send', async ({ page }) => {
    await mockAsk(page, () => ({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'RATE_LIMITED', message: 'Too many questions from this network.' },
      }),
    }))
    await page.goto(GITHUB, { waitUntil: 'load' })
    await openAsk(page)
    await page.getByLabel('Ask about this repository…').fill('What is this plugin?')
    await page.getByRole('button', { name: 'Send prompt' }).click()
    await expect(page.getByRole('alert')).toContainText('Too many questions right now')
    await expect(page.getByRole('button', { name: 'Send prompt' })).toBeEnabled()
  })

  test('uses a drawer at 1280 and a bottom sheet below lg', async ({ page }) => {
    await page.goto(GITHUB, { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: 'Install', level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'README badge' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible()

    await openAsk(page)
    const dialog = askPanel(page)
    await expect(dialog).toBeVisible()
    const viewport = page.viewportSize()
    const isDesktop = (viewport?.width ?? 0) >= 1024
    const tag = await dialog.evaluate((node) => node.tagName.toLowerCase())
    if (isDesktop) {
      expect(tag).toBe('aside')
    } else {
      expect(tag).not.toBe('aside')
    }
  })

  test('drops script tags from a streamed delta', async ({ page }) => {
    await mockAsk(page, () => ({
      status: 200,
      body: sseBody('Safe <script>alert(1)</script> text'),
    }))
    await page.goto(GITHUB, { waitUntil: 'load' })
    await openAsk(page)
    await page.getByLabel('Ask about this repository…').fill('Inject?')
    await page.getByRole('button', { name: 'Send prompt' }).click()
    await expect(page.getByText('Safe')).toBeVisible()
    await expect(askPanel(page).locator('script')).toHaveCount(0)
  })

  test('does not translate the panel when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(GITHUB, { waitUntil: 'load' })
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    ).toBe(true)
    await openAsk(page)
    const panel = askPanel(page)
    await expect(panel).toBeVisible()
    for (let sample = 0; sample < 6; sample += 1) {
      const transform = await panel.evaluate((node) => getComputedStyle(node).transform)
      expect(
        transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)',
        `sample ${sample}: panel was displaced (${transform})`,
      ).toBe(true)
      await page.waitForTimeout(80)
    }
  })
})
