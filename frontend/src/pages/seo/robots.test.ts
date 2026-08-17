import { describe, expect, it } from 'vitest'
import { robotsText } from './robots'

describe('robotsText', () => {
  const body = robotsText('https://dsh.fish')

  it('blocks machine-only API routes and advertises the sitemap', () => {
    expect(body).toContain('Disallow: /api/')
    expect(body).toContain('Sitemap: https://dsh.fish/sitemap.xml')
  })

  it('lets crawlers read noindex on account pages', () => {
    expect(body).not.toContain('Disallow: /dashboard')
    expect(body).not.toContain('Disallow: /device')
    expect(body).not.toContain('Disallow: /sign-in')
    expect(body).not.toContain('Disallow: /*/')
  })
})
