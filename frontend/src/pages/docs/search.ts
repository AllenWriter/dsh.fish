import type { Route } from './+types/search'
import { requireLocale } from '@/shared/config/i18n'
import { source } from './source'

/**
 * Docs search index. Not under `/api/` — that prefix is Hono.
 *
 * Returns titles and descriptions only. Full-text over eleven pages is a
 * client filter of this payload; Orama/Shiki never enter the Worker bundle.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  requireLocale(params.locale)
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const pages = source.getPages().map((page) => ({
    url: page.url,
    title: page.data.title,
    description: page.data.description ?? '',
  }))
  const hits =
    query === ''
      ? pages
      : pages.filter(
          (page) =>
            page.title.toLowerCase().includes(query) || page.description.toLowerCase().includes(query),
        )

  return Response.json({ hits })
}
