import type { Route } from './+types/docs-page'
import { hubContext } from '@/shared/api/hub-context'
import { requireLocale, translate } from '@/shared/config/i18n'
import { breadcrumbLd, errorMeta, pageMeta } from '@/shared/lib/seo'
import { DocsShell } from '@/widgets/docs-shell'
import { DocsMarkdown } from './body'
import { productDocsLocales, productDocsMarkdown } from './raw'
import { assetsDocsMdxReader } from './read-mdx'
import { docsNav, docsPage, docsPathFromSlugs, slugsFromSplat } from './source'
import { tocFromDocsMarkdown } from './toc'

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

/**
 * One document per request.
 *
 * Titles, descriptions, locales and the sidebar come from the generated
 * manifest; the body is the one Markdown file this URL needs, read from the
 * ASSETS binding. Nothing here compiles or bundles article text.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const path = docsPathFromSlugs(slugsFromSplat(params['*']))
  const page = docsPage(path, locale)
  if (page === undefined) throw new Response(null, { status: 404, statusText: 'Not Found' })

  const { container, env } = context.get(hubContext)
  const markdown = await productDocsMarkdown(path, locale, assetsDocsMdxReader(env.ASSETS))
  if (markdown === undefined) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }

  return {
    locale,
    origin: container.config.baseUrl,
    path,
    title: page.title,
    description: page.description.trim() || translate(locale, 'seo.docs.description'),
    availableLocales: productDocsLocales(path),
    nav: docsNav(locale),
    toc: tocFromDocsMarkdown(markdown),
    markdown,
  }
}

export default function DocsPage({ loaderData }: Route.ComponentProps) {
  const { path, title, nav, toc, markdown } = loaderData

  return (
    <DocsShell nav={nav} toc={toc} currentUrl={path}>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <div className="mt-8">
        <DocsMarkdown markdown={markdown} />
      </div>
    </DocsShell>
  )
}
