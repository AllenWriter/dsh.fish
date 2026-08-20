import { expect, test } from '@playwright/test'
import { KITCHEN_SINK_ARTIFACT_ID } from './lib/kitchen-sink-readme'
import { openPluginReadme } from './lib/open-plugin-readme'

/**
 * The reviews section on a plugin page: server-rendered community ratings from
 * the seed, read-only in the browser (the write path is the dsh harness), with
 * the aggregate republished as JSON-LD for crawlers.
 */

/** A locator scoped to the reviews section of the open page. */
function reviewsSection(page: Parameters<typeof openPluginReadme>[0]) {
  return page.locator('section', { has: page.getByRole('heading', { name: 'Reviews', level: 2 }) })
}

test.describe('artifact reviews', () => {
  test.beforeEach(async ({ page }) => {
    await openPluginReadme(page)
  })

  test('renders the seeded aggregate, distribution and comments', async ({ page }) => {
    const section = reviewsSection(page)

    // Seed: ratings 5, 4, 4, 2 → average 3.8 over 4 ratings.
    await expect(section.getByText('3.8', { exact: true })).toBeVisible()
    await expect(section.getByText('4 ratings')).toBeVisible()
    await expect(section.getByRole('img', { name: '3.8 out of 5' })).toBeVisible()

    // One bar per star value; the seeded counts sit at the end of each row.
    const rows = section.locator('ol li')
    await expect(rows).toHaveCount(5)
    await expect(rows.nth(0).locator('span').last()).toHaveText('1') // 5 ★ × 1
    await expect(rows.nth(1).locator('span').last()).toHaveText('2') // 4 ★ × 2
    await expect(rows.nth(2).locator('span').last()).toHaveText('0') // 3 ★ × 0
    await expect(rows.nth(3).locator('span').last()).toHaveText('1') // 2 ★ × 1
    await expect(rows.nth(4).locator('span').last()).toHaveText('0') // 1 ★ × 0

    // Three comments and one rating-only entry, newest first.
    const items = section.locator('ul li')
    await expect(items).toHaveCount(4)
    await expect(items.nth(0)).toContainText('Turtle Maintainer')
    await expect(items.nth(0)).toContainText('read-only queries against a staging database')
    await expect(section.getByText('Ada Lovelace')).toBeVisible()
    await expect(section.getByText('which side refused')).toBeVisible()
    // Grace Hopper rated without a comment: the row renders, comment text does not.
    await expect(section.getByText('Grace Hopper')).toBeVisible()
  })

  test('is read-only: no form, only a pointer at the harness write path', async ({ page }) => {
    const section = reviewsSection(page)

    await expect(section.locator('form')).toHaveCount(0)
    await expect(section.locator('input, textarea, select, button')).toHaveCount(0)
    await expect(
      section.getByText(`dsh-fish rate ${KITCHEN_SINK_ARTIFACT_ID} <1-5>`),
    ).toBeVisible()
  })

  test('publishes the aggregate as structured data', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    const graph = blocks.flatMap((block) => {
      const parsed = JSON.parse(block) as unknown
      return Array.isArray(parsed) ? parsed : [parsed]
    })
    const software = graph.find(
      (node) => (node as { '@type'?: string })['@type'] === 'SoftwareApplication',
    ) as { aggregateRating?: { ratingValue: number; ratingCount: number } } | undefined

    expect(software?.aggregateRating).toMatchObject({ ratingValue: 3.8, ratingCount: 4 })
  })

  test('serves the same data over the public API, with the rating scale attached', async ({
    page,
  }) => {
    const response = await page.request.get(`/api/v1/artifacts/${KITCHEN_SINK_ARTIFACT_ID}/reviews`)
    expect(response.ok()).toBe(true)

    const body = (await response.json()) as {
      scale: { min: number; max: number }
      summary: { average: number | null; count: number; distribution: number[] }
      items: { author: { name: string }; rating: number; comment?: string }[]
    }
    expect(body.scale).toEqual({ min: 1, max: 5 })
    expect(body.summary).toMatchObject({ average: 3.8, count: 4, distribution: [0, 1, 0, 2, 1] })
    expect(body.items.map((item) => item.author.name)).toContain('Turtle Maintainer')
  })

  test('requires an account for writes', async ({ page }) => {
    const response = await page.request.put(
      `/api/v1/artifacts/${KITCHEN_SINK_ARTIFACT_ID}/reviews/mine`,
      { data: { rating: 5 } },
    )
    expect(response.status()).toBe(401)
  })

  test('shows the empty state on an unrated artifact', async ({ page }) => {
    await page.goto('/a/dsh-turtle-ui', { waitUntil: 'domcontentloaded' })
    const section = reviewsSection(page)
    await expect(section.getByText('No ratings yet.')).toBeVisible()
    await expect(section.getByText('dsh-fish rate dsh-turtle-ui <1-5>')).toBeVisible()
  })

  test('keeps the page from scrolling sideways on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await openPluginReadme(page)
    await reviewsSection(page).waitFor()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
