import type { Route } from './+types/docs-page'
import browserCollections from 'collections/browser'
import { hubContext } from '@/shared/api/hub-context'
import { requireLocale, translate } from '@/shared/config/i18n'
import { breadcrumbLd, errorMeta, pageMeta } from '@/shared/lib/seo'
import { DocsShell } from '@/widgets/docs-shell'
import { ScoringModel } from '@/widgets/docs-scoring'
import { docsMdxComponents } from './mdx'
import { productDocsLocales } from './raw'
import { docsNav, slugsFromSplat, source, tocFromPage } from './source'

const docsContent = browserCollections.docs.createClientLoader<{
  scoring: Route.ComponentProps['loaderData']['scoring']
}>({
  component: ({ default: Mdx }, { scoring }) => (
    <Mdx
      components={docsMdxComponents({
        ScoringModel: () => <ScoringModel scoring={scoring} />,
      })}
    />
  ),
})

export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale, path, title, description, availableLocales } = loaderData
  return pageMeta({
    origin,
    locale,
    path,
    title: `${title} — ${translate(locale, 'app.name')}`,
    description,
    index: availableLocales.includes(locale),
    availableLocales,
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
  const page = source.getPage(slugs, locale)
  if (!page) throw new Response(null, { status: 404, statusText: 'Not Found' })

  const origin = context.get(hubContext).container.config.baseUrl
  const description = page.data.description?.trim() || translate(locale, 'seo.docs.description')
  const availableLocales = productDocsLocales(page.url)

  return {
    locale,
    origin,
    slugs,
    path: page.url,
    contentPath: page.path,
    title: page.data.title,
    description,
    availableLocales,
    nav: docsNav(locale),
    toc: tocFromPage(page),
    scoring: context.get(hubContext).container.useCases.describeScoring.execute(),
  }
}

export default function DocsPage({ loaderData }: Route.ComponentProps) {
  const { contentPath, path, title, nav, toc, scoring } = loaderData

  return (
    <DocsShell nav={nav} toc={toc} currentUrl={path}>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <div className="mt-8">{docsContent.useContent(contentPath, { scoring })}</div>
    </DocsShell>
  )
}
