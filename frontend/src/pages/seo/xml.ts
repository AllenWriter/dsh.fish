import { DEFAULT_LOCALE, LOCALE_CODES, type Locale } from '@/shared/config/i18n'
import { absoluteUrl, hreflangFor } from '@/shared/lib/seo'

/**
 * Sitemap serialisation.
 *
 * Written by hand rather than through a library: the documents are two element
 * types deep, a Worker should not ship an XML builder to emit them, and the one
 * thing that actually matters — escaping — is five characters wide.
 */

/**
 * The five characters XML cannot carry literally.
 *
 * Artifact ids reach a URL here, and an id is derived from a third party's
 * package name. An unescaped `&` in one of them does not produce a slightly
 * wrong sitemap; it produces a document the crawler rejects whole, taking every
 * other URL in the file with it.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface SitemapUrl {
  /** Unlocalized path. One entry is emitted per language, cross-linked. */
  readonly path: string
  /**
   * Page modification time. Callers may pass `Date#toISOString()`; emission
   * goes through `w3cDatetime` so the XML matches sitemaps.org.
   */
  readonly lastModified?: string
  readonly changeFrequency?: 'daily' | 'weekly' | 'monthly'
  readonly priority?: number
  /** Locales with distinct content. Defaults to every supported locale. */
  readonly locales?: readonly Locale[]
  /** Locale-specific freshness, used by generated translation pages. */
  readonly localeLastModified?: Partial<Record<Locale, string>>
}

/**
 * W3C Datetime as sitemaps.org and Google document it.
 *
 * Date-only (`YYYY-MM-DD`) is valid. If a time is present it must include a
 * timezone. Fractional seconds are legal W3C but Google Search Console has
 * rejected `Date#toISOString()` values (`…32.946Z`) as an unreadable sitemap,
 * so they are stripped. Google's own examples are `2005-02-21` and
 * `2005-02-21T18:00:15+00:00`.
 */
export function w3cDatetime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return value.replace(/\.\d+(?=Z|[+-]\d{2}:\d{2}$)/, '')
}

/** Canonical path of one artifact sitemap page. Always ends in `.xml`. */
export function artifactSitemapPath(page: number): string {
  return `/sitemaps/artifacts/${page}.xml`
}

/**
 * `/sitemaps/artifacts/:page` captures both `0.xml` (the file to serve) and
 * the extensionless `0` Google already fetched from the previous index.
 */
export function resolveArtifactSitemapPage(
  raw: string | undefined,
): { type: 'xml'; page: number } | { type: 'redirect'; page: number } | { type: 'missing' } {
  if (raw === undefined || raw === '') return { type: 'missing' }
  const xml = /^(\d+)\.xml$/.exec(raw)
  if (xml) return { type: 'xml', page: Number(xml[1]) }
  const bare = /^(\d+)$/.exec(raw)
  if (bare) return { type: 'redirect', page: Number(bare[1]) }
  return { type: 'missing' }
}

/**
 * One `<urlset>` covering every language of every path.
 *
 * Each language gets its own `<url>` entry, and each entry lists the full
 * `xhtml:link` alternate set — the sitemap form of `hreflang`. Both forms are
 * emitted (here and in the page head) because they are read at different times:
 * the head only after a page is fetched, the sitemap before anything is.
 */
export function urlSetXml(origin: string, urls: readonly SitemapUrl[]): string {
  const body = urls
    .flatMap((url) => (url.locales ?? LOCALE_CODES).map((locale) => urlEntry(origin, locale, url)))
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`
}

function urlEntry(origin: string, locale: Locale, url: SitemapUrl): string {
  const locales = url.locales ?? LOCALE_CODES
  const alternates =
    locales.length > 1
      ? [
          ...locales.map(
            (code) =>
              `    <xhtml:link rel="alternate" hreflang="${hreflangFor(code)}" href="${escapeXml(absoluteUrl(origin, code, url.path))}"/>`,
          ),
          ...(locales.includes(DEFAULT_LOCALE)
            ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(origin, DEFAULT_LOCALE, url.path))}"/>`]
            : []),
        ].join('\n')
      : undefined

  return [
    '  <url>',
    `    <loc>${escapeXml(absoluteUrl(origin, locale, url.path))}</loc>`,
    ...((url.localeLastModified?.[locale] ?? url.lastModified) === undefined
      ? []
      : [`    <lastmod>${w3cDatetime(url.localeLastModified?.[locale] ?? url.lastModified!)}</lastmod>`]),
    ...(url.changeFrequency === undefined
      ? []
      : [`    <changefreq>${url.changeFrequency}</changefreq>`]),
    ...(url.priority === undefined ? [] : [`    <priority>${url.priority.toFixed(1)}</priority>`]),
    ...(alternates === undefined ? [] : [alternates]),
    '  </url>',
  ].join('\n')
}

/** A `<sitemapindex>`, which is what `/sitemap.xml` itself is. */
export function sitemapIndexXml(
  entries: readonly { loc: string; lastModified?: string }[],
): string {
  const body = entries
    .map((entry) =>
      [
        '  <sitemap>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        ...(entry.lastModified === undefined
          ? []
          : [`    <lastmod>${w3cDatetime(entry.lastModified)}</lastmod>`]),
        '  </sitemap>',
      ].join('\n'),
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`
}

/**
 * Cached at the edge for an hour via the Cache API in the Worker entry
 * (`workers/edge-cache.ts`); without a cacheable file extension the CDN
 * default would not store these URLs.
 *
 * The catalog re-crawls every hour, so an hour-old sitemap is never more
 * than one sweep behind, and a crawler pulling every file in the index does not
 * cost one D1 read per file per fetch.
 */
export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
