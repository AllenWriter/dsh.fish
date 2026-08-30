/**
 * Blog content source.
 *
 * Same Worker constraints as product docs: the generated collection is
 * build-time compiled MDX. Never `getText('raw')`. Nothing outside this page
 * slice imports Fumadocs except the documented sitemap exception.
 */
import { blog } from 'collections/server'
import { defineI18n } from 'fumadocs-core/i18n'
import { loader } from 'fumadocs-core/source'
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server'
import { DEFAULT_LOCALE, LOCALE_CODES, type Locale } from '@/shared/config/i18n'
import type { BlogTocItem } from '@/widgets/blog-shell'
import { BLOG_SERIES, isBlogSeries, type BlogSeries } from './series'
import { blogLocales } from './raw'

const blogI18n = defineI18n({
  languages: [...LOCALE_CODES],
  defaultLanguage: DEFAULT_LOCALE,
  parser: 'dot',
  fallbackLanguage: DEFAULT_LOCALE,
  hideLocale: 'default-locale',
})

export const source = loader({
  baseUrl: '/blog',
  // `defineCollections` yields a page array, unlike `defineDocs` which
  // returns an object with `.toFumadocsSource()`. Empty meta: a blog has
  // no sidebar `meta.json`. Extended zod fields are generated as `unknown`;
  // `readBlogPage` checks them at the boundary.
  source: toFumadocsSource(blog as never, []),
  i18n: blogI18n,
  url: (slugs) => (slugs.length === 0 ? '/blog' : `/blog/${slugs.join('/')}`),
})

export { blog }

interface CompiledTocItem {
  readonly title: unknown
  readonly url: string
  readonly depth: number
}

export interface BlogCompiledData {
  readonly title: string
  readonly description: string
  readonly author: string
  readonly date: string | Date
  readonly series: BlogSeries
  readonly cover: string
  readonly toc: readonly CompiledTocItem[]
}

/**
 * Frontmatter plus compiled TOC. Fumadocs types the extra schema fields as
 * `unknown`; missing values are a content bug, not a silent default.
 */
export function readBlogPage(page: {
  url: string
  data: unknown
}): BlogCompiledData {
  const data = page.data as Record<string, unknown>
  if (typeof data.title !== 'string' || data.title.trim() === '') {
    throw new Error(`Blog post ${page.url} is missing a title`)
  }
  if (typeof data.description !== 'string' || data.description.trim() === '') {
    throw new Error(`Blog post ${page.url} is missing a description`)
  }
  if (typeof data.author !== 'string' || data.author.trim() === '') {
    throw new Error(`Blog post ${page.url} is missing an author`)
  }
  if (typeof data.series !== 'string' || !isBlogSeries(data.series)) {
    throw new Error(
      `Blog post ${page.url} has unknown series ${String(data.series)}`,
    )
  }
  const date = data.date
  if (typeof date !== 'string' && !(date instanceof Date)) {
    throw new Error(`Blog post ${page.url} is missing a date`)
  }
  if (!Array.isArray(data.toc)) {
    throw new Error(`Blog post ${page.url} has no table of contents`)
  }
  if (
    typeof data.cover !== 'string' ||
    !data.cover.startsWith('/blog/covers/')
  ) {
    throw new Error(`Blog post ${page.url} has an invalid cover`)
  }
  return {
    title: data.title,
    description: data.description.trim(),
    author: data.author,
    date,
    series: data.series,
    cover: data.cover,
    toc: data.toc as CompiledTocItem[],
  }
}

function nodeText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number')
    return String(value)
  if (Array.isArray(value)) return value.map(nodeText).join('')
  if (value && typeof value === 'object' && 'props' in value) {
    const element = value as { props?: { children?: unknown } }
    return nodeText(element.props?.children)
  }
  return ''
}

export function slugsFromSplat(splat: string | undefined): string[] {
  if (splat === undefined || splat === '') return []
  return splat.split('/').filter((part) => part.length > 0)
}

export function tocFromCompiled(data: BlogCompiledData): BlogTocItem[] {
  return data.toc.map((item) => ({
    title: nodeText(item.title),
    url: item.url,
    depth: item.depth,
  }))
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

function summaryFromPage(
  page: NonNullable<ReturnType<typeof source.getPages>[number]>,
): BlogPostSummary {
  const data = readBlogPage(page)
  return {
    url: page.url,
    slugs: page.slugs,
    title: data.title,
    description: data.description,
    author: data.author,
    date: postDateIso(data.date),
    series: data.series,
    cover: data.cover,
  }
}

export function listBlogPosts(
  locale: Locale,
  series?: BlogSeries,
): readonly BlogPostSummary[] {
  return source
    .getPages(locale)
    .map(summaryFromPage)
    .filter((post) => series === undefined || post.series === series)
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function blogPostPaths(): readonly string[] {
  return [
    ...new Set(source.getPages(DEFAULT_LOCALE).map((page) => page.url)),
  ].sort((a, b) => a.localeCompare(b))
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
