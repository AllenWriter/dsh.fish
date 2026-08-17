import { describe, expect, it } from 'vitest'
import { LOCALE_CODES } from '@/shared/config/i18n'
import { escapeXml, sitemapIndexXml, urlSetXml } from './xml'

const ORIGIN = 'https://dsh.fish'

describe('escapeXml', () => {
  it('escapes every character XML cannot carry literally', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
  })

  it('escapes an ampersand in an artifact id, which would void the whole file', () => {
    // Ids come from third-party package names; one bad character must not take
    // the other 4,999 URLs in the file down with it.
    const xml = urlSetXml(ORIGIN, [{ path: '/a/a&b' }])
    expect(xml).not.toMatch(/a&b/)
    expect(xml).toContain('/a/a&amp;b')
  })
})

describe('urlSetXml', () => {
  const xml = urlSetXml(ORIGIN, [{ path: '/browse', lastModified: '2026-01-01T00:00:00.000Z' }])

  it('emits one url entry per language', () => {
    expect(xml.match(/<url>/g)).toHaveLength(LOCALE_CODES.length)
  })

  it('gives every entry the full alternate set, including x-default', () => {
    const alternates = xml.match(/<xhtml:link /g) ?? []
    expect(alternates).toHaveLength(LOCALE_CODES.length * (LOCALE_CODES.length + 1))
    expect(xml.match(/hreflang="x-default"/g)).toHaveLength(LOCALE_CODES.length)
  })

  it('serves the default language unprefixed and the rest under their code', () => {
    expect(xml).toContain(`<loc>${ORIGIN}/browse</loc>`)
    expect(xml).toContain(`<loc>${ORIGIN}/ja/browse</loc>`)
  })

  it('declares the xhtml namespace the alternates need', () => {
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
  })

  it('carries lastmod through', () => {
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>')
  })

  it('omits optional elements rather than emitting empty ones', () => {
    const bare = urlSetXml(ORIGIN, [{ path: '/docs' }])
    expect(bare).not.toContain('<lastmod>')
    expect(bare).not.toContain('<priority>')
  })
})

describe('sitemapIndexXml', () => {
  it('lists each file once', () => {
    const xml = sitemapIndexXml([
      { loc: `${ORIGIN}/sitemaps/pages.xml` },
      { loc: `${ORIGIN}/sitemaps/artifacts/0` },
    ])
    expect(xml.match(/<sitemap>/g)).toHaveLength(2)
    expect(xml).toContain('<sitemapindex')
  })
})
