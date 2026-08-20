import { absoluteUrl } from '@/shared/lib/seo'

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
  /** Unlocalized path. One entry per path: language is negotiated per request. */
  readonly path: string
  readonly lastModified?: string
  readonly changeFrequency?: 'daily' | 'weekly' | 'monthly'
  readonly priority?: number
}

/**
 * One `<urlset>` covering every path once.
 *
 * One URL serves every language through content negotiation, so there is a
 * single `<loc>` per path and no `xhtml:link` alternate set — `hreflang`
 * exists to point at distinct per-language URLs, and there are none.
 */
export function urlSetXml(origin: string, urls: readonly SitemapUrl[]): string {
  const body = urls.map((url) => urlEntry(origin, url)).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

function urlEntry(origin: string, url: SitemapUrl): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(absoluteUrl(origin, url.path))}</loc>`,
    ...(url.lastModified === undefined ? [] : [`    <lastmod>${url.lastModified}</lastmod>`]),
    ...(url.changeFrequency === undefined
      ? []
      : [`    <changefreq>${url.changeFrequency}</changefreq>`]),
    ...(url.priority === undefined ? [] : [`    <priority>${url.priority.toFixed(1)}</priority>`]),
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
