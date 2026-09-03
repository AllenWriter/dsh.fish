import { DEFAULT_LOCALE, LOCALE_CODES, type Locale } from '@/shared/config/i18n'
import { docsManifestPages, findDocsPage, localizedDocsFile } from './manifest'
import type { DocsMdxReader } from './read-mdx'

/**
 * First-party docs Markdown, one file at a time.
 *
 * `Accept: text/markdown`, the `.md` aliases and `/docs/llms-full.txt` serve
 * the same documents the HTML pages render. The reader is the ASSETS binding
 * in the Worker and the filesystem in tests — the source text is never
 * bundled into the Worker script.
 */
export function productDocsPaths(): readonly string[] {
  return [...docsManifestPages.map((page) => page.url)].sort((left, right) =>
    left.localeCompare(right),
  )
}

export async function productDocsMarkdown(
  unlocalizedPath: string,
  locale: Locale = DEFAULT_LOCALE,
  readText?: DocsMdxReader,
): Promise<string | undefined> {
  if (readText === undefined) return undefined
  const page = findDocsPage(unlocalizedPath)
  if (page === undefined) return undefined
  return (await readText(localizedDocsFile(page.file, locale))) ?? (await readText(page.file))
}

export function supportsProductDocsMarkdown(unlocalizedPath: string): boolean {
  return findDocsPage(unlocalizedPath) !== undefined
}

/** Locales with a physical translation for this page; a fallback is not counted. */
export function productDocsLocales(unlocalizedPath: string): readonly Locale[] {
  const page = findDocsPage(unlocalizedPath)
  if (page === undefined) return []
  return LOCALE_CODES.filter((locale) => page.locales[locale] !== undefined)
}
