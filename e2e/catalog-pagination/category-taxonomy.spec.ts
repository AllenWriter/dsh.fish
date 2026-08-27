import { expect, test } from '@playwright/test'
import { CATEGORIES } from '../../backend/src/domain/artifact/category.ts'

/**
 * The live taxonomy through the Worker: retired `/category/*` slugs 301 onto
 * the awesome-dsh-plugin.com ids, unknown ids still 404, and a filter against
 * an alias reaches the same rows as the canonical id.
 */

test.describe('category taxonomy', () => {
  test('retired hub slugs 301 onto the live browse id', async ({ request }) => {
    const coding = await request.get('/category/coding?offset=20', { maxRedirects: 0 })
    expect(coding.status()).toBe(301)
    expect(new URL(coding.headers()['location'] ?? '', 'http://localhost').pathname).toBe(
      '/category/git',
    )
    expect(new URL(coding.headers()['location'] ?? '', 'http://localhost').search).toBe(
      '?offset=20',
    )

    const localized = await request.get('/ja/category/models', { maxRedirects: 0 })
    expect(localized.status()).toBe(301)
    expect(new URL(localized.headers()['location'] ?? '', 'http://localhost').pathname).toBe(
      '/ja/category/model',
    )

    const markdown = await request.get('/category/coding.md', { maxRedirects: 0 })
    expect(markdown.status()).toBe(301)
    expect(new URL(markdown.headers()['location'] ?? '', 'http://localhost').pathname).toBe(
      '/category/git.md',
    )
  })

  test('a canonical id stays, an unknown id 404s', async ({ request }) => {
    const other = await request.get('/category/other', {
      headers: { accept: 'text/html' },
      maxRedirects: 0,
    })
    expect(other.status()).toBe(200)

    const unknown = await request.get('/category/nope', {
      headers: { accept: 'text/html' },
      maxRedirects: 0,
    })
    expect(unknown.status()).toBe(404)
  })

  test('the git collection lists the seeded git rows', async ({ page }) => {
    await page.goto('/category/git', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Git')
    await expect(page.getByRole('heading', { name: 'release-notes' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'reviewer', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'review-stack' })).toBeVisible()
  })

  test('an API alias filter matches the canonical id', async ({ request }) => {
    const aliased = await request.get('/api/v1/artifacts?category=coding&limit=100')
    expect(aliased.ok()).toBe(true)
    const aliasedBody = (await aliased.json()) as { items: { id: string }[] }

    const canonical = await request.get('/api/v1/artifacts?category=git&limit=100')
    expect(canonical.ok()).toBe(true)
    const canonicalBody = (await canonical.json()) as { items: { id: string }[] }

    expect(aliasedBody.items.map((item) => item.id).sort()).toEqual(
      canonicalBody.items.map((item) => item.id).sort(),
    )
    expect(canonicalBody.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(['acme-release-notes', 'reviewer-preset', 'dsh-review-stack']),
    )
  })

  test('facets list every browse id, none of the retired aliases', async ({ request }) => {
    const response = await request.get('/api/v1/facets')
    expect(response.ok()).toBe(true)
    const body = (await response.json()) as { categories: { id: string }[] }
    expect(body.categories.map((entry) => entry.id)).toEqual(CATEGORIES.map((entry) => entry.id))
    expect(body.categories.map((entry) => entry.id)).not.toContain('coding')
    expect(body.categories.map((entry) => entry.id)).not.toContain('models')
  })
})
