import type { Route } from './+types/kind-page'
import { hubContext } from '@/shared/api/hub-context'
import { CatalogGrid } from '@/widgets/catalog-grid/catalog-grid'
import { CatalogPagination } from '@/widgets/catalog-pagination/catalog-pagination'
import {
  isArtifactKind,
  kindDescriptionKey,
  kindPluralKey,
  type ArtifactKind,
} from '@/entities/artifact/model/types'
import { KindIcon } from '@/entities/artifact/ui/kind-icon'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { breadcrumbLd, collectionLd, errorMeta, pageMeta } from '@/shared/lib/seo'

const PAGE_SIZE = 24

/**
 * One artifact type, at a path a search engine will rank.
 *
 * "MCP servers for DeepSeek Harness" is a phrase people type; `/browse?kind=`
 * is not a page an engine is willing to treat as the answer to it. The listing
 * is the same one the browse page renders — the difference is that this URL is
 * a stable, linked, canonical document about one topic, so it can accumulate
 * the authority a query string never will.
 */
export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale, kind, results, offset } = loaderData
  const kindName = translate(locale, kindPluralKey(kind))
  const heading = translate(locale, 'collection.kind.title', { kind: kindName })

  return pageMeta({
    origin,
    locale,
    path: `/kind/${kind}`,
    title: `${heading} — ${translate(locale, 'app.name')}`,
    description: translate(locale, 'collection.kind.description', {
      kind: kindName,
      count: results.total,
    }),
    // Page two of a listing is a real page, but it is not the page anyone
    // should land on for the term — the first page is, and it is canonical.
    index: offset === 0,
    jsonLd:
      offset > 0
        ? []
        : [
            breadcrumbLd(origin, locale, [
              { name: translate(locale, 'app.name'), path: '/' },
              { name: translate(locale, 'browse.title'), path: '/browse' },
              { name: kindName, path: `/kind/${kind}` },
            ]),
            collectionLd(origin, locale, {
              path: `/kind/${kind}`,
              name: heading,
              description: translate(locale, kindDescriptionKey(kind)),
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
  const raw = params.kind

  // An unknown type is a 404, not an empty listing: serving a page for every
  // string anyone appends to `/kind/` is how a catalog grows thousands of
  // indexable empty pages.
  if (!isArtifactKind(raw)) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }
  const kind = raw as ArtifactKind

  const { container } = context.get(hubContext)
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get('offset') ?? 0) || 0)

  const results = await container.useCases.searchArtifacts.execute({
    locale,
    kinds: [kind],
    sort: 'popular',
    limit: PAGE_SIZE,
    offset,
  })

  return { results, kind, locale, offset, origin: container.config.baseUrl }
}

export default function KindPage({ loaderData }: Route.ComponentProps) {
  const { results, kind } = loaderData
  const t = useT()
  const kindName = t(kindPluralKey(kind))

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        {/* The kind's mark at heading scale. It is the same glyph the chip on
            every row below carries, which is what makes the listing read as one
            collection rather than a filtered pile. */}
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <KindIcon kind={kind} className="size-7 shrink-0 text-muted-foreground" />
          {t('collection.kind.title', { kind: kindName })}
        </h1>
        <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {t(kindDescriptionKey(kind))}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="tabular-nums">{results.total}</span> {t('browse.resultCount')}
        </p>
      </header>

      <CatalogGrid artifacts={results.items} />
      <CatalogPagination
        basePath={`/kind/${kind}`}
        total={results.total}
        limit={results.limit}
        offset={results.offset}
      />
    </div>
  )
}
