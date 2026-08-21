import type { Route } from './+types/topic-page'
import { hubContext } from '@/shared/api/hub-context'
import { CatalogGrid } from '@/widgets/catalog-grid/catalog-grid'
import { CatalogPagination } from '@/widgets/catalog-pagination/catalog-pagination'
import { isTopic, type TopicId } from '@/entities/artifact/model/types'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { breadcrumbLd, collectionLd, errorMeta, pageMeta } from '@/shared/lib/seo'

const PAGE_SIZE = 24
const MIN_INDEXABLE_RESULTS = 3
const topicLabelKey = (topic: TopicId) => `topic.${topic}.label`

export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale, topic, results, offset } = loaderData
  const name = translate(locale, topicLabelKey(topic))
  const title = translate(locale, 'collection.topic.title', { topic: name })
  const description = translate(locale, 'collection.topic.description', { topic: name })
  const indexable = offset === 0 && results.total >= MIN_INDEXABLE_RESULTS
  return pageMeta({
    origin,
    locale,
    path: `/for/${topic}`,
    title: `${title} — ${translate(locale, 'app.name')}`,
    description,
    index: indexable,
    jsonLd: indexable
      ? [
          breadcrumbLd(origin, locale, [
            { name: translate(locale, 'app.name'), path: '/' },
            { name: translate(locale, 'browse.title'), path: '/browse' },
            { name, path: `/for/${topic}` },
          ]),
          collectionLd(origin, locale, {
            path: `/for/${topic}`,
            name: title,
            description,
            items: results.items.map((item) => ({ name: item.displayName, path: `/a/${item.id}` })),
          }),
        ]
      : [],
  })
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  if (!isTopic(params.topic)) throw new Response(null, { status: 404, statusText: 'Not Found' })
  const topic = params.topic
  const { container } = context.get(hubContext)
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get('offset') ?? 0) || 0)
  const results = await container.useCases.searchArtifacts.execute({
    locale,
    topics: [topic],
    sort: 'popular',
    limit: PAGE_SIZE,
    offset,
  })
  return { results, topic, locale, offset, origin: container.config.baseUrl }
}

export default function TopicPage({ loaderData }: Route.ComponentProps) {
  const { results, topic } = loaderData
  const t = useT()
  const name = t(topicLabelKey(topic))
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('collection.topic.title', { topic: name })}
        </h1>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
          {t('collection.topic.description', { topic: name })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('collection.topic.guidance')}
        </p>
      </header>
      <CatalogGrid artifacts={results.items} />
      <CatalogPagination basePath={`/for/${topic}`} total={results.total} limit={results.limit} offset={results.offset} />
    </div>
  )
}
