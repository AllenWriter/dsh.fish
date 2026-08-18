import { expect, test } from '@playwright/test'

/**
 * The per-artifact share assets, end to end against the seeded dev server.
 *
 * `dsh-postgres-mcp` comes from `backend/scripts/seed-local.sql` with 1290
 * stars, which is what makes the stars badge assertion exact.
 */

const ARTIFACT = 'dsh-postgres-mcp'

test.describe('per-artifact OG image', () => {
  test('serves a 1200x630 PNG', async ({ request }) => {
    const response = await request.get(`/a/${ARTIFACT}/og.png`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
    expect(response.headers()['cache-control']).toContain('public')
    expect(response.headers()['cache-control']).toContain('max-age=3600')

    const body = await response.body()
    // PNG signature, then the IHDR dimensions big-endian at bytes 16–24.
    expect([...body.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(body.readUInt32BE(16)).toBe(1200)
    expect(body.readUInt32BE(20)).toBe(630)
  })

  test('is a 404, not a fallback card, for an unknown artifact', async ({ request }) => {
    const response = await request.get('/a/no-such-artifact/og.png')
    expect(response.status()).toBe(404)
  })
})

test.describe('README badge', () => {
  test('shows the grade and score by default', async ({ request }) => {
    const response = await request.get(`/a/${ARTIFACT}/badge.svg`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/svg+xml')
    expect(response.headers()['cache-control']).toContain('max-age=3600')

    const svg = await response.text()
    expect(svg).toContain('<svg')
    expect(svg).toContain('dsh.fish')
    expect(svg).toMatch(/[SABC] · \d{1,3}/)
  })

  test('shows the compact star count for the stars metric', async ({ request }) => {
    const response = await request.get(`/a/${ARTIFACT}/badge.svg?metric=stars`)
    expect(response.status()).toBe(200)
    const svg = await response.text()
    // 1290 seeded stars render as 1.3k.
    expect(svg).toContain('★ 1.3k')
    expect(svg).not.toContain(' · ')
  })

  test('rejects a metric it does not know', async ({ request }) => {
    const response = await request.get(`/a/${ARTIFACT}/badge.svg?metric=downloads`)
    expect(response.status()).toBe(400)
  })

  test('is a 404 for an unknown artifact', async ({ request }) => {
    const response = await request.get('/a/no-such-artifact/badge.svg')
    expect(response.status()).toBe(404)
  })
})
