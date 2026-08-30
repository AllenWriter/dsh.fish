import type { Route } from './+types/blog-page'
import browserCollections from 'collections/browser'
import { hubContext } from '@/shared/api/hub-context'
import {
  localeDefinition,
  requireLocale,
  translate,
  type Locale,
} from '@/shared/config/i18n'
import {
  blogPostingLd,
  breadcrumbLd,
  collectionLd,
  errorMeta,
  pageMeta,
} from '@/shared/lib/seo'
import { BlogArticle, BlogNewsroom } from '@/widgets/blog-shell'
import { blogMdxComponents } from './mdx'
import { blogLocales, blogPostMarkdown } from './raw'
import { readingMinutesFromMarkdown } from './reading-time'
import {
  blogSeriesNav,
  isBlogSeries,
  seriesDescriptionKey,
  seriesTitleKey,
} from './series'
import {
  blogPostCards,
  postDateIso,
  readBlogPage,
  relatedBlogPostCards,
  slugsFromSplat,
  source,
} from './source'

const blogContent = browserCollections.blog.createClientLoader({
  component: ({ default: Mdx }) => <Mdx components={blogMdxComponents()} />,
})

function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeDefinition(locale).tag, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function meta({
  loaderData,
  params,
}: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const {
    origin,
    locale,
    path,
    title,
    description,
    availableLocales,
    jsonLd,
    type,
  } = loaderData
  return pageMeta({
    origin,
    locale,
    path,
    title: `${title} — ${translate(locale, 'app.name')}`,
    description,
    index: availableLocales.includes(locale),
    availableLocales,
    type,
    jsonLd,
  })
}

export function loader({ context, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  const slugs = slugsFromSplat(params['*'])
  const origin = context.get(hubContext).container.config.baseUrl
  const nav = blogSeriesNav(locale)

  if (slugs.length === 0) {
    const posts = blogPostCards(locale)
    const title = translate(locale, 'blog.title')
    const description = translate(locale, 'seo.blog.description')
    const path = '/blog'
    return {
      kind: 'listing' as const,
      locale,
      origin,
      path,
      title,
      description,
      availableLocales: blogLocales(path),
      currentSeries: undefined,
      nav,
      posts,
      type: 'website' as const,
      jsonLd: [
        breadcrumbLd(origin, locale, [
          { name: translate(locale, 'app.name'), path: '/' },
          { name: title, path },
        ]),
        collectionLd(origin, locale, {
          path,
          name: title,
          description,
          items: posts.map((post) => ({ name: post.title, path: post.url })),
        }),
      ],
    }
  }

  if (slugs.length === 1 && isBlogSeries(slugs[0]!)) {
    const series = slugs[0]
    const posts = blogPostCards(locale, series)
    const title = translate(locale, seriesTitleKey(series))
    const description = translate(locale, seriesDescriptionKey(series))
    const path = `/blog/${series}`
    return {
      kind: 'listing' as const,
      locale,
      origin,
      path,
      title,
      description,
      availableLocales: blogLocales(path),
      currentSeries: series,
      nav,
      posts,
      type: 'website' as const,
      jsonLd: [
        breadcrumbLd(origin, locale, [
          { name: translate(locale, 'app.name'), path: '/' },
          { name: translate(locale, 'blog.title'), path: '/blog' },
          { name: title, path },
        ]),
        collectionLd(origin, locale, {
          path,
          name: title,
          description,
          items: posts.map((post) => ({ name: post.title, path: post.url })),
        }),
      ],
    }
  }

  const page = source.getPage(slugs, locale)
  if (!page) throw new Response(null, { status: 404, statusText: 'Not Found' })

  const data = readBlogPage(page)
  const date = postDateIso(data.date)
  const availableLocales = blogLocales(page.url)
  const markdown = blogPostMarkdown(page.url, locale) ?? ''

  return {
    kind: 'post' as const,
    locale,
    origin,
    path: page.url,
    contentPath: page.path,
    title: data.title,
    description: data.description,
    author: data.author,
    date,
    series: data.series,
    cover: data.cover,
    seriesTitle: translate(locale, seriesTitleKey(data.series)),
    formattedDate: formatDate(date, locale),
    readingMinutes: readingMinutesFromMarkdown(markdown),
    related: relatedBlogPostCards(locale, page.url, data.series),
    availableLocales,
    type: 'article' as const,
    jsonLd: [
      breadcrumbLd(origin, locale, [
        { name: translate(locale, 'app.name'), path: '/' },
        { name: translate(locale, 'blog.title'), path: '/blog' },
        {
          name: translate(locale, seriesTitleKey(data.series)),
          path: `/blog/${data.series}`,
        },
        { name: data.title, path: page.url },
      ]),
      blogPostingLd(origin, locale, {
        path: page.url,
        title: data.title,
        description: data.description,
        datePublished: date,
        author: data.author,
      }),
    ],
  }
}

export default function BlogPage({ loaderData }: Route.ComponentProps) {
  if (loaderData.kind === 'listing') {
    const { nav, currentSeries, title, description, posts } = loaderData
    return (
      <BlogNewsroom
        posts={posts}
        tabs={nav}
        title={title}
        subtitle={description}
        activeSeries={currentSeries ?? 'all'}
        tabMode="links"
      />
    )
  }

  const {
    contentPath,
    title,
    description,
    author,
    formattedDate,
    date,
    series,
    seriesTitle,
    cover,
    readingMinutes,
    related,
  } = loaderData

  return (
    <BlogArticle
      title={title}
      description={description}
      author={author}
      date={date}
      formattedDate={formattedDate}
      readingMinutes={readingMinutes}
      cover={cover}
      seriesId={series}
      seriesTitle={seriesTitle}
      related={related}
    >
      {blogContent.useContent(contentPath)}
    </BlogArticle>
  )
}
