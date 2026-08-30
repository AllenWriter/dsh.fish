import { DEFAULT_LOCALE, LOCALE_CODES, translate, type Locale } from '@/shared/config/i18n'
import { BLOG_SERIES, isBlogSeries, seriesDescriptionKey, seriesTitleKey, type BlogSeries } from './series'

/**
 * First-party blog MDX as bundled strings.
 *
 * Same reason as product docs: `getText('raw')` hits the filesystem, which a
 * Worker does not have. Vite inlines these modules at build time.
 */
const RAW = import.meta.glob('../../../content/blog/**/*.mdx', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>

function fileForPath(path: string): string | undefined {
  if (!path.startsWith('/blog/')) return undefined
  const rest = path.slice('/blog/'.length)
  const parts = rest.split('/').filter((part) => part.length > 0)
  if (parts.length !== 2) return undefined
  if (!isBlogSeries(parts[0]!)) return undefined
  return `${parts[0]}/${parts[1]}.mdx`
}

function localizedFile(relative: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return relative
  const extension = relative.lastIndexOf('.')
  return `${relative.slice(0, extension)}.${locale}${relative.slice(extension)}`
}

function rawDocument(relative: string): string | undefined {
  const suffix = `/content/blog/${relative}`
  const key = Object.keys(RAW).find((candidate) => candidate.endsWith(suffix))
  return key === undefined ? undefined : RAW[key]
}

/**
 * Unlocalized `/blog/{series}/{slug}` paths that have a bundled English MDX file.
 */
export function blogPostMarkdownPaths(): readonly string[] {
  const translationSuffixes = LOCALE_CODES.filter((locale) => locale !== DEFAULT_LOCALE).map(
    (locale) => `.${locale}`,
  )
  const paths = new Set<string>()
  for (const key of Object.keys(RAW)) {
    const match = /\/content\/blog\/(.+)\.mdx$/.exec(key)
    if (match === null) continue
    const relative = match[1]!
    if (translationSuffixes.some((suffix) => relative.endsWith(suffix))) continue
    const parts = relative.split('/')
    if (parts.length !== 2 || !isBlogSeries(parts[0]!)) continue
    paths.add(`/blog/${relative}`)
  }
  return [...paths].sort((left, right) => left.localeCompare(right))
}

export function blogPostMarkdown(
  unlocalizedPath: string,
  locale: Locale = DEFAULT_LOCALE,
): string | undefined {
  const relative = fileForPath(unlocalizedPath)
  if (relative === undefined) return undefined
  return rawDocument(localizedFile(relative, locale)) ?? rawDocument(relative)
}

export function supportsBlogMarkdown(unlocalizedPath: string): boolean {
  if (unlocalizedPath === '/blog') return true
  if (unlocalizedPath.startsWith('/blog/')) {
    const rest = unlocalizedPath.slice('/blog/'.length)
    if (isBlogSeries(rest)) return true
  }
  return blogPostMarkdown(unlocalizedPath) !== undefined
}

function listingLocales(): readonly Locale[] {
  return LOCALE_CODES
}

/** Locales with a physical translation for this page; English fallback is not counted. */
export function blogLocales(unlocalizedPath: string): readonly Locale[] {
  if (unlocalizedPath === '/blog') return listingLocales()
  const rest = unlocalizedPath.startsWith('/blog/') ? unlocalizedPath.slice('/blog/'.length) : ''
  if (isBlogSeries(rest)) return listingLocales()
  const relative = fileForPath(unlocalizedPath)
  if (relative === undefined) return []
  return LOCALE_CODES.filter((locale) => rawDocument(localizedFile(relative, locale)) !== undefined)
}

export function blogSeriesFromPath(unlocalizedPath: string): BlogSeries | undefined {
  if (!unlocalizedPath.startsWith('/blog/')) return undefined
  const rest = unlocalizedPath.slice('/blog/'.length)
  const first = rest.split('/')[0]
  return first !== undefined && isBlogSeries(first) ? first : undefined
}

function frontmatterField(source: string, field: string): string {
  const fence = source.match(/^---\n([\s\S]*?)\n---/)
  if (fence === null) return ''
  const match = new RegExp(`^${field}:\\s*(.*)$`, 'm').exec(fence[1]!)
  if (match === null) return ''
  return match[1]!.trim().replace(/^["']|["']$/g, '')
}

function listingEntries(locale: Locale, series?: BlogSeries): readonly {
  path: string
  title: string
  description: string
  date: string
}[] {
  const entries = []
  for (const path of blogPostMarkdownPaths()) {
    const folder = blogSeriesFromPath(path)
    if (series !== undefined && folder !== series) continue
    const source = blogPostMarkdown(path, locale)
    if (source === undefined) continue
    entries.push({
      path,
      title: frontmatterField(source, 'title'),
      description: frontmatterField(source, 'description'),
      date: frontmatterField(source, 'date'),
    })
  }
  return entries.sort((left, right) => right.date.localeCompare(left.date))
}

/**
 * Markdown for a blog URL: the raw MDX of a post, or a generated listing for
 * `/blog` and `/blog/{series}`.
 */
export function blogMarkdown(unlocalizedPath: string, locale: Locale = DEFAULT_LOCALE): string | undefined {
  const post = blogPostMarkdown(unlocalizedPath, locale)
  if (post !== undefined) return post
  if (unlocalizedPath !== '/blog' && !BLOG_SERIES.some((series) => unlocalizedPath === `/blog/${series}`)) {
    return undefined
  }

  const series = unlocalizedPath === '/blog' ? undefined : blogSeriesFromPath(unlocalizedPath)
  const title =
    series === undefined
      ? translate(locale, 'blog.title')
      : translate(locale, seriesTitleKey(series))
  const description =
    series === undefined
      ? translate(locale, 'seo.blog.description')
      : translate(locale, seriesDescriptionKey(series))
  const entries = listingEntries(locale, series)
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
