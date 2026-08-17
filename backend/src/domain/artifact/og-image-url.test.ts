import { describe, expect, it } from 'vitest'
import { generatedOgImageUrl, ogImageUrl, tryOgImageUrl } from './og-image-url.js'

describe('ogImageUrl', () => {
  it('accepts an uploaded GitHub Social preview', () => {
    const url =
      'https://repository-images.githubusercontent.com/70107786/4602445c-10a2-4903-a360-c96d70531f67'
    expect(ogImageUrl(url)).toBe(url)
  })

  it('accepts GitHub\'s generated Open Graph card', () => {
    expect(ogImageUrl('https://opengraph.githubassets.com/preview/acme/plugin')).toBe(
      'https://opengraph.githubassets.com/preview/acme/plugin',
    )
  })

  it('rejects an owner avatar, which is not a Social preview', () => {
    expect(tryOgImageUrl('https://avatars.githubusercontent.com/u/1?v=4')).toBeUndefined()
  })

  it('rejects a non-https URL', () => {
    expect(tryOgImageUrl('http://repository-images.githubusercontent.com/1/x')).toBeUndefined()
  })

  it('rejects an arbitrary image host', () => {
    expect(tryOgImageUrl('https://example.com/hero.png')).toBeUndefined()
  })
})

describe('generatedOgImageUrl', () => {
  it('points at GitHub\'s generated card with a cache-busting key', () => {
    expect(generatedOgImageUrl('acme', 'plugin', 'abc1234')).toBe(
      'https://opengraph.githubassets.com/abc1234/acme/plugin',
    )
  })

  it('falls back to a stable key when the cache token is not a path segment', () => {
    expect(generatedOgImageUrl('acme', 'plugin', '../x')).toBe(
      'https://opengraph.githubassets.com/preview/acme/plugin',
    )
  })
})
