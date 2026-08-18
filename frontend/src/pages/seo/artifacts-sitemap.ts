import type { Route } from './+types/artifacts-sitemap'
import { hubContext } from '@/shared/api/hub-context'
import { urlSetXml, xmlResponse } from './xml'

/**
 * One page of indexed plugins, in every language.
 *
 * This is the file that does the work: a plugin page has no inbound links from
 * anywhere else on the web until someone finds it, so the sitemap is how it
 * gets discovered at all. `lastmod` is the artifact's own `updatedAt`, which
 * means a crawler re-reads exactly the rows the hourly sweep changed
 * instead of the whole catalog.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const { container } = context.get(hubContext)

  const pageNumber = Number(params.page)
  if (!Number.isInteger(pageNumber) || pageNumber < 0) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }

  const { items, pageCount } = await container.useCases.listSitemapEntries.execute(pageNumber)

  // Past the end is a 404, not an empty document: an index that outlived its
  // catalog should fail visibly in a crawl report rather than quietly serve
  // valid, empty files forever.
  if (pageNumber >= pageCount) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }

  return xmlResponse(
    urlSetXml(
      container.config.baseUrl,
      items.map((entry) => ({
        path: `/a/${entry.id}`,
        lastModified: entry.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ),
  )
}
