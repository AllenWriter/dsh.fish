import type { Route } from './+types/home-page'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { errorMeta, organizationLd, pageMeta, websiteLd } from '@/shared/lib/seo'
import { BlogNewsroom } from '@/widgets/blog-shell'
import { blogPostCards } from '@/pages/blog/source'
import { blogSeriesNav } from '@/pages/blog'
import { hubContext } from '@/shared/api/hub-context'

export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale } = loaderData
  return pageMeta({
    origin,
    locale,
    path: '/',
    title: translate(locale, 'seo.home.title', {
      name: translate(locale, 'app.name'),
      tagline: translate(locale, 'app.tagline'),
    }),
    description: translate(locale, 'app.description'),
    jsonLd: [websiteLd(origin, locale), organizationLd(origin, locale)],
  })
}

/**
 * Server-side data for the landing page.
 *
 * The home page is the writing index: the same blog collection `/blog` uses,
 * shown as a filterable newsroom grid. Series landings live under `/blog`.
 */
export function loader({ context, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const origin = context.get(hubContext).container.config.baseUrl
  return {
    locale,
    origin,
    posts: blogPostCards(locale),
    tabs: blogSeriesNav(locale),
  }
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { posts, tabs } = loaderData
  const t = useT()

  return (
    <BlogNewsroom
      posts={posts}
      tabs={tabs}
      title={t('blog.newsroom.title')}
      subtitle={t('app.tagline')}
    />
  )
}
