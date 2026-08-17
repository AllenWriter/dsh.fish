import type { Route } from './+types/pages-sitemap'
import { hubContext } from '@/shared/api/hub-context'
import { ARTIFACT_KINDS, CATEGORIES } from '@/entities/artifact/model/types'
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
export function loader({ context }: Route.LoaderArgs) {
  const { baseUrl } = context.get(hubContext).container.config

  const urls: SitemapUrl[] = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/browse', changeFrequency: 'daily', priority: 0.9 },
    ...ARTIFACT_KINDS.map((kind) => ({
      path: `/kind/${kind}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...CATEGORIES.map((category) => ({
      path: `/category/${category.id}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    { path: '/docs', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/submit', changeFrequency: 'monthly', priority: 0.5 },
  ]

  return xmlResponse(urlSetXml(baseUrl, urls))
}
