import type { Route } from './+types/category-page'
import { hubContext } from '@/shared/api/hub-context'
import { CatalogGrid } from '@/widgets/catalog-grid/catalog-grid'
import { CatalogPagination } from '@/widgets/catalog-pagination/catalog-pagination'
import { CATEGORIES, isCategory } from '@/entities/artifact/model/types'
import { CategoryIcon } from '@/entities/artifact/ui/category-icon'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { breadcrumbLd, collectionLd, errorMeta, pageMeta } from '@/shared/lib/seo'

const PAGE_SIZE = 24

/** The message key for a category id, from the taxonomy that owns it. */
function categoryLabelKey(id: string): string {
  return CATEGORIES.find((entry) => entry.id === id)?.labelKey ?? `category.${id}`
}

/**
 * One category, at a path a search engine will rank.
 *
 * The counterpart to `/kind/<kind>`: kind answers "how does this install",
 * category answers "what is it for" — and "what is it for" is the axis people
 * search along.
 */
export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale, category, results, offset } = loaderData
  const name = translate(locale, categoryLabelKey(category))
  const heading = translate(locale, 'collection.category.title', { category: name })

  return pageMeta({
    origin,
    locale,
    path: `/category/${category}`,
    title: `${heading} — ${translate(locale, 'app.name')}`,
    description: translate(locale, 'collection.category.description', {
      category: name,
      count: results.total,
    }),
    index: offset === 0,
    jsonLd:
      offset > 0
        ? []
        : [
            breadcrumbLd(origin, locale, [
              { name: translate(locale, 'app.name'), path: '/' },
              { name: translate(locale, 'browse.title'), path: '/browse' },
              { name, path: `/category/${category}` },
            ]),
            collectionLd(origin, locale, {
              path: `/category/${category}`,
              name: heading,
              description: translate(locale, 'collection.category.description', {
                category: name,
                count: results.total,
              }),
              items: results.items.map((item) => ({
                name: item.displayName,
                path: `/a/${item.id}`,
              })),
            }),
          ],
  })
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const category = params.category

  if (!isCategory(category)) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }

  const { container } = context.get(hubContext)
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get('offset') ?? 0) || 0)

  const results = await container.useCases.searchArtifacts.execute({
    categories: [category],
    sort: 'popular',
    limit: PAGE_SIZE,
    offset,
  })

  return { results, category, locale, offset, origin: container.config.baseUrl }
}

export default function CategoryPage({ loaderData }: Route.ComponentProps) {
  const { results, category } = loaderData
  const t = useT()
  const name = t(categoryLabelKey(category))

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <CategoryIcon id={category} className="size-7 shrink-0 text-muted-foreground" />
          {t('collection.category.title', { category: name })}
        </h1>
        <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {t('collection.category.description', { category: name, count: results.total })}
        </p>
      </header>

      <CatalogGrid artifacts={results.items} />
      <CatalogPagination
        basePath={`/category/${category}`}
        total={results.total}
        limit={results.limit}
        offset={results.offset}
      />
    </div>
  )
}
