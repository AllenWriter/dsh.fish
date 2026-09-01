import { describe, expect, it } from 'vitest'
import { LOCALE_CODES } from '@/shared/config/i18n'
import {
  artifactSitemapPath,
  escapeXml,
  resolveArtifactSitemapPage,
  sitemapIndexXml,
  urlSetXml,
  w3cDatetime,
} from './xml'

const ORIGIN = 'https://dsh.fish'

describe('escapeXml', () => {
  it('escapes every character XML cannot carry literally', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
  })

  it('escapes an ampersand in an artifact id, which would void the whole file', () => {
    // Ids come from third-party package names; one bad character must not take
    // the rest of the file down with it.
    const xml = urlSetXml(ORIGIN, [{ path: '/a/a&b' }])
    expect(xml).not.toMatch(/a&b/)
    expect(xml).toContain('/a/a&amp;b')
  })
})

describe('w3cDatetime', () => {
  it('keeps a date-only value', () => {
    expect(w3cDatetime('2026-01-01')).toBe('2026-01-01')
  })

  it('strips the milliseconds Date#toISOString emits', () => {
    expect(w3cDatetime('2026-08-20T07:07:32.946Z')).toBe('2026-08-20T07:07:32Z')
  })

  it('strips fractional seconds before an explicit offset', () => {
    expect(w3cDatetime('2005-02-21T18:00:15.120+00:00')).toBe('2005-02-21T18:00:15+00:00')
  })
})

describe('artifact sitemap paths', () => {
  it('names each page with a .xml suffix', () => {
    expect(artifactSitemapPath(0)).toBe('/sitemaps/artifacts/0.xml')
    expect(artifactSitemapPath(2)).toBe('/sitemaps/artifacts/2.xml')
  })

  it('serves the .xml form, redirects the extensionless form, 404s the rest', () => {
    expect(resolveArtifactSitemapPage('0.xml')).toEqual({
      type: 'xml',
      page: 0,
    })
    expect(resolveArtifactSitemapPage('12.xml')).toEqual({
      type: 'xml',
      page: 12,
    })
    expect(resolveArtifactSitemapPage('0')).toEqual({
      type: 'redirect',
      page: 0,
    })
    expect(resolveArtifactSitemapPage('0.xml.bak')).toEqual({
      type: 'missing',
    })
    expect(resolveArtifactSitemapPage('latest.xml')).toEqual({
      type: 'missing',
    })
    expect(resolveArtifactSitemapPage(undefined)).toEqual({ type: 'missing' })
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
    expect(xml).toContain(`<loc>${ORIGIN}/en/browse</loc>`)
    expect(xml).toContain(`<loc>${ORIGIN}/ja/browse</loc>`)
  })

  it('declares the xhtml namespace the alternates need', () => {
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
  })

  it('emits lastmod as W3C Datetime without fractional seconds', () => {
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00Z</lastmod>')
    expect(xml).not.toContain('00.000Z')
  })

  it('omits optional elements rather than emitting empty ones', () => {
    const bare = urlSetXml(ORIGIN, [{ path: '/docs' }])
    expect(bare).not.toContain('<lastmod>')
    expect(bare).not.toContain('<priority>')
  })

  it('emits an English-only document once without false translation links', () => {
    const englishOnly = urlSetXml(ORIGIN, [{ path: '/docs', locales: ['en'] }])

    expect(englishOnly.match(/<url>/g)).toHaveLength(1)
    expect(englishOnly).toContain(`<loc>${ORIGIN}/en/docs</loc>`)
    expect(englishOnly).not.toContain(`${ORIGIN}/ja/docs`)
    expect(englishOnly).not.toContain('<xhtml:link')
  })

  it('omits x-default when the available locale set has no default-language document', () => {
    const localized = urlSetXml(ORIGIN, [{ path: '/a/example', locales: ['en', 'ja'] }])
    expect(localized).not.toContain('hreflang="x-default"')
  })

  it('uses locale-specific lastmod values', () => {
    const localized = urlSetXml(ORIGIN, [
      {
        path: '/a/example',
        locales: ['en', 'ja'],
        lastModified: '2026-01-01T00:00:00.000Z',
        localeLastModified: { ja: '2026-02-02T00:00:00.000Z' },
      },
    ])
    expect(localized).toContain('<lastmod>2026-01-01T00:00:00Z</lastmod>')
    expect(localized).toContain('<lastmod>2026-02-02T00:00:00Z</lastmod>')
  })
})

describe('sitemapIndexXml', () => {
  it('lists each file once', () => {
    const xml = sitemapIndexXml([
      { loc: `${ORIGIN}/sitemaps/pages.xml` },
      { loc: `${ORIGIN}${artifactSitemapPath(0)}` },
    ])
    expect(xml.match(/<sitemap>/g)).toHaveLength(2)
    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain(`${ORIGIN}/sitemaps/artifacts/0.xml`)
  })
})
