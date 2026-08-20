import type { Route } from './+types/docs-page'
import { hubContext } from '@/shared/api/hub-context'
import { requireLocale, translate } from '@/shared/config/i18n'
import { breadcrumbLd, errorMeta, pageMeta } from '@/shared/lib/seo'
import { DocsShell } from '@/widgets/docs-shell'
import { ScoringModel } from '@/widgets/docs-scoring'
import { docsMdxComponents } from './mdx'
import { docsNav, slugsFromSplat, source, tocFromPage } from './source'

export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale, path, title, description } = loaderData
  return pageMeta({
    origin,
    locale,
    path,
    title: `${title} — ${translate(locale, 'app.name')}`,
    description,
    type: 'article',
    jsonLd: [
      breadcrumbLd(origin, locale, [
        { name: translate(locale, 'app.name'), path: '/' },
        { name: translate(locale, 'nav.docs'), path: '/docs' },
        ...(path === '/docs' ? [] : [{ name: title, path }]),
      ]),
    ],
  })
}

export function loader({ context, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const slugs = slugsFromSplat(params['*'])
  const page = source.getPage(slugs)
  if (!page) throw new Response(null, { status: 404, statusText: 'Not Found' })

  const origin = context.get(hubContext).container.config.baseUrl
  const description = page.data.description?.trim() || translate(locale, 'seo.docs.description')

  return {
    locale,
    origin,
    slugs,
    path: page.url,
    title: page.data.title,
    description,
    nav: docsNav(),
    toc: tocFromPage(page),
    scoring: context.get(hubContext).container.useCases.describeScoring.execute(),
  }
}

export default function DocsPage({ loaderData }: Route.ComponentProps) {
  const { slugs, path, title, nav, toc, scoring } = loaderData
  const page = source.getPage(slugs)
  if (!page) throw new Error(`unknown docs page: ${path}`)

  const Mdx = page.data.body

  return (
    <DocsShell nav={nav} toc={toc} currentUrl={path}>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <div className="mt-8">
        <Mdx
          components={docsMdxComponents({
            ScoringModel: () => <ScoringModel scoring={scoring} />,
          })}
        />
      </div>
    </DocsShell>
  )
}
