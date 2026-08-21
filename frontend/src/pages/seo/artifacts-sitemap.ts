import type { Route } from './+types/artifacts-sitemap'
import { hubContext } from '@/shared/api/hub-context'
import { artifactSitemapPath, resolveArtifactSitemapPage, urlSetXml, xmlResponse } from './xml'
import { isLocale, type Locale } from '@/shared/config/i18n'

/**
 * One page of indexed plugins, in every language.
 *
 * This is the file that does the work: a plugin page has no inbound links from
 * anywhere else on the web until someone finds it, so the sitemap is how it
 * gets discovered at all. `lastmod` is the artifact's own `updatedAt`, which
 * means a crawler re-reads exactly the rows the hourly sweep changed
 * instead of the whole catalog.
 *
 * The canonical path ends in `.xml` (`/sitemaps/artifacts/0.xml`), matching
 * `pages.xml` and the filename convention Google, Bing and the protocol
 * examples use. The extensionless `/sitemaps/artifacts/0` 301s onto it so a
 * crawler that still holds the previous index loc does not 404.
 *
 * `changefreq` and `priority` are omitted: Google documents that it ignores
 * both, and they inflated a file Search Console already struggled to parse.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const resolved = resolveArtifactSitemapPage(params.page)
  if (resolved.type === 'missing') {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }
  if (resolved.type === 'redirect') {
    return new Response(null, {
      status: 301,
      headers: { location: artifactSitemapPath(resolved.page) },
    })
  }

  const { container } = context.get(hubContext)
  const { items, pageCount } = await container.useCases.listSitemapEntries.execute(resolved.page)

  // Past the end is a 404, not an empty document: an index that outlived its
  // catalog should fail visibly in a crawl report rather than quietly serve
  // valid, empty files forever.
  if (resolved.page >= pageCount) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }

  return xmlResponse(
    urlSetXml(
      container.config.baseUrl,
      items.map((entry) => ({
        path: `/a/${entry.id}`,
        lastModified: entry.updatedAt,
        locales: entry.locales.map((item) => item.locale).filter(isLocale),
        localeLastModified: Object.fromEntries(
          entry.locales
            .filter((item): item is { locale: Locale; updatedAt: string } => isLocale(item.locale))
            .map((item) => [item.locale, item.updatedAt]),
        ),
      })),
    ),
  )
}
