import {
  DEFAULT_LOCALE,
  LOCALE_CODES,
  translate,
  type Locale,
} from '@/shared/config/i18n'
import {
  blogManifestPosts,
  findBlogPost,
  localeCopy,
  localizedMdxFile,
} from './manifest'
import type { BlogMdxReader } from './read-mdx'
import {
  BLOG_SERIES,
  isBlogSeries,
  seriesDescriptionKey,
  seriesTitleKey,
  type BlogSeries,
} from './series'

function fileForPath(path: string): string | undefined {
  if (!path.startsWith('/blog/')) return undefined
  const rest = path.slice('/blog/'.length)
  const parts = rest.split('/').filter((part) => part.length > 0)
  if (parts.length !== 2) return undefined
  if (!isBlogSeries(parts[0]!)) return undefined
  return `${parts[0]}/${parts[1]}.mdx`
}

/**
 * Unlocalized `/blog/{series}/{slug}` paths that have a default-language file.
 */
export function blogPostMarkdownPaths(): readonly string[] {
  return blogManifestPosts.map((post) => post.url)
}

export async function blogPostMarkdown(
  unlocalizedPath: string,
  locale: Locale = DEFAULT_LOCALE,
  readText?: BlogMdxReader,
): Promise<string | undefined> {
  if (readText === undefined) return undefined
  const relative = fileForPath(unlocalizedPath)
  if (relative === undefined) return undefined
  return (
    (await readText(localizedMdxFile(relative, locale))) ??
    (await readText(relative))
  )
}

export function supportsBlogMarkdown(unlocalizedPath: string): boolean {
  if (unlocalizedPath === '/blog') return true
  if (unlocalizedPath.startsWith('/blog/')) {
    const rest = unlocalizedPath.slice('/blog/'.length)
    if (isBlogSeries(rest)) return true
  }
  return findBlogPost(unlocalizedPath) !== undefined
}

function listingLocales(): readonly Locale[] {
  return LOCALE_CODES
}

/** Locales with a physical translation for this page; English fallback is not counted. */
export function blogLocales(unlocalizedPath: string): readonly Locale[] {
  if (unlocalizedPath === '/blog') return listingLocales()
  const rest = unlocalizedPath.startsWith('/blog/')
    ? unlocalizedPath.slice('/blog/'.length)
    : ''
  if (isBlogSeries(rest)) return listingLocales()
  const post = findBlogPost(unlocalizedPath)
  if (post === undefined) return []
  return LOCALE_CODES.filter((locale) => post.locales[locale] !== undefined)
}

export function blogSeriesFromPath(unlocalizedPath: string): BlogSeries | undefined {
  if (!unlocalizedPath.startsWith('/blog/')) return undefined
  const rest = unlocalizedPath.slice('/blog/'.length)
  const first = rest.split('/')[0]
  return first !== undefined && isBlogSeries(first) ? first : undefined
}

export function blogListingEntries(
  locale: Locale,
  series?: BlogSeries,
): readonly {
  path: string
  title: string
  description: string
  date: string
}[] {
  const entries = []
  for (const post of blogManifestPosts) {
    if (series !== undefined && post.series !== series) continue
    const copy = localeCopy(post, locale)
    entries.push({
      path: post.url,
      title: copy.title,
      description: copy.description,
      date: copy.date,
    })
  }
  return entries.sort((left, right) => right.date.localeCompare(left.date))
}

/**
 * Markdown for a blog URL: the raw MDX of a post, or a generated listing for
 * `/blog` and `/blog/{series}`.
 *
 * Post bodies are read one file at a time. Listings use the frontmatter
 * manifest and do not need a reader.
 */
export async function blogMarkdown(
  unlocalizedPath: string,
  locale: Locale = DEFAULT_LOCALE,
  readText?: BlogMdxReader,
): Promise<string | undefined> {
  const post = await blogPostMarkdown(unlocalizedPath, locale, readText)
  if (post !== undefined) return post
  if (
    unlocalizedPath !== '/blog' &&
    !BLOG_SERIES.some((series) => unlocalizedPath === `/blog/${series}`)
  ) {
    return undefined
  }

  const series =
    unlocalizedPath === '/blog' ? undefined : blogSeriesFromPath(unlocalizedPath)
  const title =
    series === undefined
      ? translate(locale, 'blog.title')
      : translate(locale, seriesTitleKey(series))
  const description =
    series === undefined
      ? translate(locale, 'seo.blog.description')
      : translate(locale, seriesDescriptionKey(series))
  const entries = blogListingEntries(locale, series)
  const lines = [
    '---',
    `title: ${title}`,
    `description: ${description}`,
    '---',
    '',
    `# ${title}`,
    '',
    description,
    '',
    ...entries.flatMap((entry) => [
      `- [${entry.title}](${entry.path}) — ${entry.date}${entry.description === '' ? '' : `. ${entry.description}`}`,
    ]),
    '',
  ]
  return lines.join('\n')
}
