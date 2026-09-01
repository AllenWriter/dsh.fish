import type { Route } from './+types/sitemap-index'
import { hubContext } from '@/shared/api/hub-context'
import { sitemapIndexXml, xmlResponse } from './xml'

/**
 * `/sitemap.xml` — an index.
 *
 * Artifact sitemaps belonged to the plugin catalog. This origin now points
 * crawlers at the static pages file only.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const { baseUrl } = context.get(hubContext).container.config
  return xmlResponse(sitemapIndexXml([{ loc: `${baseUrl}/sitemaps/pages.xml` }]))
}
