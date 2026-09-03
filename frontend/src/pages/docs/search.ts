import type { Route } from './+types/search'
import { requireLocale } from '@/shared/config/i18n'
import { docsSearchEntries } from './source'

/**
 * Docs search index. Not under `/api/` — that prefix is Hono.
 *
 * Returns titles and descriptions from the generated manifest. Full-text over
 * this many pages is a client filter of that payload; no search engine and no
 * highlighter enter the Worker bundle.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const pages = docsSearchEntries(locale)
  const hits =
    query === ''
      ? pages
      : pages.filter(
          (page) =>
            page.title.toLowerCase().includes(query) ||
            page.description.toLowerCase().includes(query),
        )

  return Response.json({ hits })
}
