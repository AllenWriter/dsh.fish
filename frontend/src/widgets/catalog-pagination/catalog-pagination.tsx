import { useSearchParams } from 'react-router'
import { useT } from '@/shared/config/i18n'
import { LocaleLink } from '@/shared/ui/locale-link'

/**
 * Page-to-page navigation for any listing.
 *
 * `rel="prev"` / `rel="next"` are no longer used by Google as an indexing
 * signal, but the links themselves still are: a listing whose later pages are
 * reachable only by JavaScript hides everything past its first two dozen rows
 * from a crawler, which in a catalog is most of the catalog. Real anchors with
 * real hrefs is the whole requirement.
 */
export function CatalogPagination({
  basePath,
  total,
  limit,
  offset,
}: {
  /** Unlocalized path the listing lives at, e.g. `/browse` or `/kind/skill`. */
  basePath: string
  total: number
  limit: number
  offset: number
}) {
  const t = useT()
  const [params] = useSearchParams()

  if (total <= limit) return null

  const build = (nextOffset: number) => {
    const next = new URLSearchParams(params)
    // Page one is the bare path: `?offset=0` would be a second URL for the
    // listing that is already canonical without it.
    if (nextOffset === 0) next.delete('offset')
    else next.set('offset', String(nextOffset))
    const query = next.toString()
    return query === '' ? basePath : `${basePath}?${query}`
  }

  const hasPrevious = offset > 0
  const hasNext = offset + limit < total

  return (
    <nav aria-label={t('browse.pagination')} className="mt-8 flex items-center justify-between text-sm">
      {hasPrevious ? (
        <LocaleLink
          to={build(Math.max(0, offset - limit))}
          rel="prev"
          aria-label={t('browse.previous')}
          className="press inline-flex h-10 items-center rounded-lg border border-border px-4 hover:border-border-strong"
        >
          &larr;
        </LocaleLink>
      ) : (
        <span />
      )}
      <span className="tabular-nums text-muted-foreground">
        {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
      </span>
      {hasNext ? (
        <LocaleLink
          to={build(offset + limit)}
          rel="next"
          aria-label={t('browse.next')}
          className="press inline-flex h-10 items-center rounded-lg border border-border px-4 hover:border-border-strong"
        >
          &rarr;
        </LocaleLink>
      ) : (
        <span />
      )}
    </nav>
  )
}
