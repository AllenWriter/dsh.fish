import type { Route } from './+types/home-page'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { errorMeta, organizationLd, pageMeta, websiteLd } from '@/shared/lib/seo'
import { BlogPostList } from '@/widgets/blog-shell'
import { blogPostCards } from '@/pages/blog/source'
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
 * shown as a dense grid of square cards. Catalog rails live on `/browse`.
 */
export function loader({ context, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const origin = context.get(hubContext).container.config.baseUrl
  return {
    locale,
    origin,
    posts: blogPostCards(locale),
  }
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData
  const t = useT()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight">{t('app.author')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('app.tagline')}</p>
      </header>
      <BlogPostList posts={posts} variant="home" />
    </section>
  )
}
