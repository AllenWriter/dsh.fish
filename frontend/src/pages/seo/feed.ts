import type { Route } from './+types/feed'
import { hubContext } from '@/shared/api/hub-context'
import {
  DEFAULT_LOCALE,
  localeDefinition,
  requireLocale,
  translate,
} from '@/shared/config/i18n'
import { absoluteUrl } from '@/shared/lib/seo'
import { atomFeedXml, atomResponse, FEED_ENTRY_COUNT } from './atom'

/**
 * `/feed.xml`, and one per language at `/<locale>/feed.xml`.
 *
 * A feed is how a reader's aggregator — and a competitor-watching crawler —
 * learns the catalog changed without re-fetching the sitemap set. It lists the
 * most recently updated public (non-deprecated) artifacts, which is exactly
 * what `sort: 'recent'` returns; deprecated rows stay out of it the same way
 * they stay out of the sitemap.
 *
 * The title and subtitle come from the locale catalogs, so a feed reader
 * subscribed to `/ja/feed.xml` shows a Japanese channel name. The artifacts
 * themselves are not translated — entry ids deliberately point at the one
 * canonical URL per artifact, shared by every language's feed.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const { container } = context.get(hubContext)
  const { baseUrl } = container.config

  const { items } = await container.useCases.searchArtifacts.execute({
    sort: 'recent',
    limit: FEED_ENTRY_COUNT,
  })

  const updatedAt =
    items.map((item) => item.updatedAt).sort().at(-1) ?? new Date().toISOString()

  return atomResponse(
    atomFeedXml({
      selfUrl: absoluteUrl(baseUrl, locale, '/feed.xml'),
      alternateUrl: absoluteUrl(baseUrl, locale, '/'),
      title: translate(locale, 'feed.title'),
      subtitle: translate(locale, 'feed.description'),
      lang: localeDefinition(locale).tag,
      authorName: translate(locale, 'app.name'),
      updatedAt,
      entries: items.map((item) => ({
        id: absoluteUrl(baseUrl, DEFAULT_LOCALE, `/a/${item.id}`),
        url: absoluteUrl(baseUrl, locale, `/a/${item.id}`),
        title: item.displayName,
        ...(item.summary === '' ? {} : { summary: item.summary }),
        updatedAt: item.updatedAt,
      })),
    }),
  )
}
