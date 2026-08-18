import { LOCALE_CODES, type Locale } from '@/shared/config/i18n'
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
  readonly lastModified?: string
  readonly changeFrequency?: 'daily' | 'weekly' | 'monthly'
  readonly priority?: number
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
    .flatMap((url) => LOCALE_CODES.map((locale) => urlEntry(origin, locale, url)))
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`
}

function urlEntry(origin: string, locale: Locale, url: SitemapUrl): string {
  const alternates = [
    ...LOCALE_CODES.map(
      (code) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflangFor(code)}" href="${escapeXml(absoluteUrl(origin, code, url.path))}"/>`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(origin, 'en', url.path))}"/>`,
  ].join('\n')

  return [
    '  <url>',
    `    <loc>${escapeXml(absoluteUrl(origin, locale, url.path))}</loc>`,
    ...(url.lastModified === undefined ? [] : [`    <lastmod>${url.lastModified}</lastmod>`]),
    ...(url.changeFrequency === undefined
      ? []
      : [`    <changefreq>${url.changeFrequency}</changefreq>`]),
    ...(url.priority === undefined ? [] : [`    <priority>${url.priority.toFixed(1)}</priority>`]),
    alternates,
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
          : [`    <lastmod>${entry.lastModified}</lastmod>`]),
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
 * Cached at the edge for an hour.
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
