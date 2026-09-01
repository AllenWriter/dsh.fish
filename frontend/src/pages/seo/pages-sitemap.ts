import type { Route } from './+types/pages-sitemap'
import { hubContext } from '@/shared/api/hub-context'
import { docsSitemapEntries } from '@/pages/docs/source'
import { blogSitemapEntries } from '@/pages/blog/source'
import { urlSetXml, xmlResponse, type SitemapUrl } from './xml'

/**
 * Every public page of the personal site that is not a leftover catalog URL.
 *
 * Plugin kind/category/topic landings and `/browse` stay off this file so
 * crawlers do not keep indexing the old registry.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const { container } = context.get(hubContext)
  const { baseUrl } = container.config

  const urls: SitemapUrl[] = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    ...docsSitemapEntries().map(({ path, locales }) => ({
      path,
      locales,
      changeFrequency: 'monthly' as const,
      priority: path === '/docs' ? 0.8 : 0.55,
    })),
    ...blogSitemapEntries().map(({ path, locales }) => ({
      path,
      locales,
      changeFrequency: path === '/blog' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '/blog' ? 0.9 : path.split('/').length === 3 ? 0.7 : 0.65,
    })),
  ]

  return xmlResponse(urlSetXml(baseUrl, urls))
}
