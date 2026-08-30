import type { Route } from './+types/pages-sitemap'
import { hubContext } from '@/shared/api/hub-context'
import { ARTIFACT_KINDS, CATEGORIES, TOPICS } from '@/entities/artifact/model/types'
import { docsSitemapEntries } from '@/pages/docs/source'
import { blogSitemapEntries } from '@/pages/blog/source'
import { urlSetXml, xmlResponse, type SitemapUrl } from './xml'

/**
 * Every page of the site that is not an artifact.
 *
 * The collection pages are the point of this file. `/kind/<kind>` and
 * `/category/<category>` are generated from the taxonomy rather than listed by
 * hand, so a kind added to the domain appears in the sitemap in the same commit
 * that adds it — there is no second list to forget.
 *
 * Priorities are relative, and only inside this file: they tell a crawler which
 * of *our* pages to prefer when it cannot fetch them all, and mean nothing
 * across sites.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const { container } = context.get(hubContext)
  const { baseUrl } = container.config
  const facets = await container.useCases.listCatalogFacets.execute()
  const visibleKinds = new Set(facets.kinds.filter((item) => item.count > 0).map((item) => item.kind))
  const visibleCategories = new Set(
    facets.categories.filter((item) => item.count > 0).map((item) => item.id),
  )
  const visibleTopics = new Set(facets.topics.filter((item) => item.count >= 3).map((item) => item.id))

  const urls: SitemapUrl[] = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/browse', changeFrequency: 'daily', priority: 0.9 },
    ...ARTIFACT_KINDS.filter((kind) => visibleKinds.has(kind)).map((kind) => ({
      path: `/kind/${kind}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...CATEGORIES.filter((category) => visibleCategories.has(category.id)).map((category) => ({
      path: `/category/${category.id}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...TOPICS.filter((topic) => visibleTopics.has(topic.id)).map((topic) => ({
      path: `/for/${topic.id}`,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    })),
    ...docsSitemapEntries().map(({ path, locales }) => ({
      path,
      locales,
      changeFrequency: 'monthly' as const,
      priority: path === '/docs' ? 0.6 : 0.55,
    })),
    ...blogSitemapEntries().map(({ path, locales }) => ({
      path,
      locales,
      changeFrequency: path === '/blog' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '/blog' ? 0.6 : path.split('/').length === 3 ? 0.55 : 0.5,
    })),
    { path: '/submit', changeFrequency: 'monthly', priority: 0.5 },
  ]

  return xmlResponse(urlSetXml(baseUrl, urls))
}
