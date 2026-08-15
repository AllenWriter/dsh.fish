import { Form, Link, useSearchParams } from 'react-router'
import type { Route } from './+types/browse-page'
import { hubContext } from '@/shared/api/hub-context'
import { CatalogGrid } from '@/widgets/catalog-grid/catalog-grid'
import { CatalogFilters } from '@/widgets/catalog-filters/catalog-filters'
import { t } from '@/shared/config/messages'

const PAGE_SIZE = 24

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const query = new URLSearchParams(location.search).get('q')
  const title = query ? `${query} — ${t('app.name')}` : `${t('browse.title')} — ${t('app.name')}`
  return [{ title }, { name: 'description', content: t('app.description') }]
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const { container } = context.get(hubContext)

  const [results, facets] = await Promise.all([
    container.useCases.searchArtifacts.execute({
      ...(url.searchParams.get('q') ? { text: url.searchParams.get('q')! } : {}),
      kinds: url.searchParams.getAll('kind'),
      categories: url.searchParams.getAll('category'),
      ...(url.searchParams.get('sort') ? { sort: url.searchParams.get('sort')! } : {}),
      ...(url.searchParams.get('verified') === 'true' ? { verifiedOnly: true } : {}),
      limit: PAGE_SIZE,
      offset: Number(url.searchParams.get('offset') ?? 0),
    }),
    container.useCases.listCatalogFacets.execute(),
  ])

  return { results, facets }
}

export default function BrowsePage({ loaderData }: Route.ComponentProps) {
  const { results, facets } = loaderData
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('browse.title')}</h1>
        <Form method="get" className="mt-4 flex flex-wrap gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            aria-label={t('nav.search')}
            placeholder={t('home.searchPlaceholder')}
            className="h-10 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-border-strong"
          />
          <select
            name="sort"
            defaultValue={params.get('sort') ?? ''}
            aria-label={t('browse.sort')}
            className="h-10 rounded-full border border-border bg-card px-3 text-sm outline-none"
          >
            <option value="">{t('browse.sort.relevance')}</option>
            <option value="popular">{t('browse.sort.popular')}</option>
            <option value="recent">{t('browse.sort.recent')}</option>
            <option value="name">{t('browse.sort.name')}</option>
          </select>
          {/* Filters chosen in the rail must survive a re-search. */}
          {params.getAll('kind').map((kind) => (
            <input key={`kind-${kind}`} type="hidden" name="kind" value={kind} />
          ))}
          {params.getAll('category').map((category) => (
            <input key={`cat-${category}`} type="hidden" name="category" value={category} />
          ))}
          <button
            type="submit"
            className="press h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            {t('nav.search')}
          </button>
        </Form>
      </header>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <CatalogFilters facets={facets} />

        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="tabular-nums">{results.total}</span> {t('browse.resultCount')}
          </p>
          <CatalogGrid artifacts={results.items} />
          <Pagination total={results.total} limit={results.limit} offset={results.offset} />
        </div>
      </div>
    </div>
  )
}

function Pagination({
  total,
  limit,
  offset,
}: {
  total: number
  limit: number
  offset: number
}) {
  const [params] = useSearchParams()
  if (total <= limit) return null

  const build = (nextOffset: number) => {
    const next = new URLSearchParams(params)
    next.set('offset', String(nextOffset))
    return `/browse?${next.toString()}`
  }

  const hasPrevious = offset > 0
  const hasNext = offset + limit < total

  return (
    <nav className="mt-8 flex items-center justify-between text-sm">
      {hasPrevious ? (
        <Link
          to={build(Math.max(0, offset - limit))}
          className="press rounded-full border border-border px-4 py-2 hover:border-border-strong"
        >
          &larr;
        </Link>
      ) : (
        <span />
      )}
      <span className="tabular-nums text-muted-foreground">
        {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
      </span>
      {hasNext ? (
        <Link
          to={build(offset + limit)}
          className="press rounded-full border border-border px-4 py-2 hover:border-border-strong"
        >
          &rarr;
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
