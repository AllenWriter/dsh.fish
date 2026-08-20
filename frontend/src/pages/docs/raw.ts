import { DEFAULT_LOCALE, LOCALE_CODES, type Locale } from '@/shared/config/i18n'

/**
 * First-party MDX as bundled strings.
 *
 * `getText('raw')` on a Fumadocs entry reads the filesystem, which a Worker
 * does not have. Vite inlines these modules at build time so `Accept:
 * text/markdown` can serve the same documents the HTML pages render.
 */
const RAW = import.meta.glob('../../../content/docs/**/*.mdx', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>

function fileForPath(path: string): string | undefined {
  if (path === '/docs' || path === '/docs/') return 'index.mdx'
  if (!path.startsWith('/docs/')) return undefined
  if (path === '/docs/search') return undefined
  return `${path.slice('/docs/'.length)}.mdx`
}

function localizedFile(relative: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return relative
  const extension = relative.lastIndexOf('.')
  return `${relative.slice(0, extension)}.${locale}${relative.slice(extension)}`
}

function rawDocument(relative: string): string | undefined {
  const suffix = `/content/docs/${relative}`
  const key = Object.keys(RAW).find((candidate) => candidate.endsWith(suffix))
  return key === undefined ? undefined : RAW[key]
}

export function productDocsMarkdown(
  unlocalizedPath: string,
  locale: Locale = DEFAULT_LOCALE,
): string | undefined {
  const relative = fileForPath(unlocalizedPath)
  if (relative === undefined) return undefined
  return rawDocument(localizedFile(relative, locale)) ?? rawDocument(relative)
}

export function supportsProductDocsMarkdown(unlocalizedPath: string): boolean {
  return productDocsMarkdown(unlocalizedPath) !== undefined
}

/** Locales with a physical translation for this page; English fallback is not counted. */
export function productDocsLocales(unlocalizedPath: string): readonly Locale[] {
  const relative = fileForPath(unlocalizedPath)
  if (relative === undefined) return []
  return LOCALE_CODES.filter((locale) => rawDocument(localizedFile(relative, locale)) !== undefined)
}
