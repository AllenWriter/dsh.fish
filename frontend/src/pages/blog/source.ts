/**
 * Blog listing source.
 *
 * Article bodies are static files under `/blog/mdx/` (Worker ASSETS). This
 * module imports a frontmatter-only manifest so homepage cards, `/blog`
 * listings, the sitemap, and feeds stay synchronous and tiny.
 */
import { translate, type Locale } from '@/shared/config/i18n'
import type { BlogPostCard } from '@/widgets/blog-shell'
import {
  blogManifestPosts,
  findBlogPost,
  localeCopy,
  type BlogManifestPost,
} from './manifest'
import { blogLocales } from './raw'
import { BLOG_SERIES, seriesTitleKey, type BlogSeries } from './series'

export function slugsFromSplat(splat: string | undefined): string[] {
  if (splat === undefined || splat === '') return []
  return splat.split('/').filter((part) => part.length > 0)
}

export function postDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`)
}

export function postDateIso(value: string | Date): string {
  const date = postDate(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Blog post has an unusable date: ${String(value)}`)
  }
  return date.toISOString()
}

export interface BlogPostSummary {
  readonly url: string
  readonly slugs: readonly string[]
  readonly title: string
  readonly description: string
  readonly author: string
  readonly date: string
  readonly series: BlogSeries
  readonly cover: string
}

function summaryFromPost(post: BlogManifestPost, locale: Locale): BlogPostSummary {
  const copy = localeCopy(post, locale)
  return {
    url: post.url,
    slugs: [post.series, post.slug],
    title: copy.title,
    description: copy.description,
    author: copy.author,
    date: postDateIso(copy.date),
    series: post.series,
    cover: post.cover,
  }
}

export function listBlogPosts(
  locale: Locale,
  series?: BlogSeries,
): readonly BlogPostSummary[] {
  return blogManifestPosts
    .filter((post) => series === undefined || post.series === series)
    .map((post) => summaryFromPost(post, locale))
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function getBlogPost(
  slugs: readonly string[],
  locale: Locale,
): BlogPostSummary | undefined {
  if (slugs.length !== 2) return undefined
  const post = findBlogPost(`/blog/${slugs[0]}/${slugs[1]}`)
  if (post === undefined) return undefined
  return summaryFromPost(post, locale)
}

/** Listing cards for the home grid and `/blog`, from the same manifest. */
export function blogPostCards(
  locale: Locale,
  series?: BlogSeries,
): readonly BlogPostCard[] {
  return listBlogPosts(locale, series).map((post) => ({
    url: post.url,
    title: post.title,
    description: post.description,
    date: post.date,
    seriesId: post.series,
    seriesTitle: translate(locale, seriesTitleKey(post.series)),
    cover: post.cover,
  }))
}

/** Three other posts, same series first, for the article footer. */
export function relatedBlogPostCards(
  locale: Locale,
  currentUrl: string,
  series: BlogSeries,
  limit = 3,
): readonly BlogPostCard[] {
  const rest = blogPostCards(locale).filter((post) => post.url !== currentUrl)
  const same = rest.filter((post) => post.seriesId === series)
  const other = rest.filter((post) => post.seriesId !== series)
  return [...same, ...other].slice(0, limit)
}

export function blogPostPaths(): readonly string[] {
  return [...new Set(blogManifestPosts.map((post) => post.url))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Indexable `/blog…` paths: the index, each series landing, and every post. */
export function blogSitemapPaths(): readonly string[] {
  const paths = new Set<string>(['/blog'])
  for (const series of BLOG_SERIES) {
    paths.add(`/blog/${series}`)
  }
  for (const path of blogPostPaths()) paths.add(path)
  return [...paths].sort((a, b) => a.localeCompare(b))
}

export function blogSitemapEntries(): readonly {
  path: string
  locales: readonly Locale[]
}[] {
  return blogSitemapPaths().map((path) => ({
    path,
    locales: blogLocales(path),
  }))
}
