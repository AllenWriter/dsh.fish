import type { Route } from './+types/sitemap-index'
import { hubContext } from '@/shared/api/hub-context'
import { sitemapIndexXml, xmlResponse } from './xml'

/**
 * `/sitemap.xml` — an index, not a list of URLs.
 *
 * The catalog is unbounded and every artifact URL is emitted once per language,
 * so the flat form would outgrow the 50 MB per-file limit at a few thousand
 * artifacts. An index costs one extra fetch and never has to be restructured
 * later. The static pages get their own file so a crawler re-reading the
 * catalog does not re-read them, and vice versa.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const { container } = context.get(hubContext)
  const { baseUrl } = container.config

  const { pageCount } = await container.useCases.listSitemapEntries.execute(0)

  return xmlResponse(
    sitemapIndexXml([
      { loc: `${baseUrl}/sitemaps/pages.xml` },
      ...Array.from({ length: pageCount }, (_, index) => ({
        loc: `${baseUrl}/sitemaps/artifacts/${index}`,
      })),
    ]),
  )
}
