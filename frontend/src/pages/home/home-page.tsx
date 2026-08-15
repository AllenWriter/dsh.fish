import { Form, Link } from 'react-router'
import { ArrowRight, Search } from 'lucide-react'
import type { Route } from './+types/home-page'
import { hubContext } from '@/shared/api/hub-context'
import { CatalogGrid } from '@/widgets/catalog-grid/catalog-grid'
import { t } from '@/shared/config/messages'
import { compactNumber } from '@/shared/lib/format'

export function meta(): Route.MetaDescriptors {
  return [
    { title: `${t('app.name')} — ${t('app.tagline')}` },
    { name: 'description', content: t('app.description') },
  ]
}

/**
 * Server-side data for the landing page.
 *
 * Three reads in parallel rather than in sequence: D1 round trips dominate the
 * response, so serializing them would triple the page's time to first byte for
 * no reason.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const { container } = context.get(hubContext)
  const { searchArtifacts, listCatalogFacets } = container.useCases

  const [trending, recentPool, facets] = await Promise.all([
    searchArtifacts.execute({ sort: 'popular', limit: 6 }),
    // Over-fetch, then subtract what the first rail already shows. Two rails
    // listing the same artifacts is the same page twice.
    searchArtifacts.execute({ sort: 'recent', limit: 12 }),
    listCatalogFacets.execute(),
  ])

  const shown = new Set(trending.items.map((item) => item.id))
  const recent = recentPool.items.filter((item) => !shown.has(item.id)).slice(0, 3)

  return { trending, recent, facets }
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { trending, recent, facets } = loaderData
  const total = facets.kinds.reduce((sum, facet) => sum + facet.count, 0)

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        {/* A single soft wash, not a full-bleed gradient: it gives the hero
            depth without turning the page into a marketing landing. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            {t('home.heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t('home.heroSubtitle')}
          </p>

          <Form action="/browse" method="get" className="mx-auto mt-8 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                aria-label={t('nav.search')}
                placeholder={t('home.searchPlaceholder')}
                className="h-12 w-full rounded-lg border border-border bg-card pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-border-strong"
              />
            </div>
            <button
              type="submit"
              className="press h-12 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground"
            >
              {t('home.searchAction')}
            </button>
          </Form>

          <p className="mt-7 text-sm text-muted-foreground">
            {compactNumber(total)} {t('home.statsArtifacts')}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {facets.kinds.map((facet) => (
              <Link
                key={facet.kind}
                to={`/browse?kind=${facet.kind}`}
                title={t(facet.descriptionKey)}
                className="press inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border-strong hover:text-foreground"
              >
                {t(facet.labelKey)}
                <span className="tabular-nums opacity-60">{facet.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-6 py-16">
        <Rail title={t('home.trending')} to="/browse?sort=popular" linkKey="home.browseAll">
          <CatalogGrid artifacts={trending.items} />
        </Rail>

        {recent.length > 0 ? (
          <Rail title={t('home.recentlyUpdated')} to="/browse?sort=recent" linkKey="home.seeRecent">
            <CatalogGrid artifacts={recent} />
          </Rail>
        ) : null}
      </div>
    </>
  )
}

function Rail({
  title,
  to,
  linkKey,
  children,
}: {
  title: string
  to: string
  linkKey: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t(linkKey)}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  )
}
