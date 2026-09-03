/**
 * The generated product-docs manifest.
 *
 * Frontmatter and nav order only — one small JSON module the Worker may
 * import. Bodies stay in static assets, like the blog's.
 */
import { DEFAULT_LOCALE, type Locale } from '@/shared/config/i18n'
import generated from './manifest.generated.json'

export interface DocsManifestLocale {
  readonly title: string
  readonly description: string
}

export interface DocsManifestPage {
  readonly url: string
  readonly slug: string
  readonly file: string
  readonly locales: Readonly<Partial<Record<Locale, DocsManifestLocale>>>
}

export type DocsManifestNav =
  | { readonly type: 'separator'; readonly key: string }
  | { readonly type: 'page'; readonly slug: string }

interface DocsManifestFile {
  readonly pages: readonly DocsManifestPage[]
  readonly nav: readonly DocsManifestNav[]
}

const file = generated as DocsManifestFile

export const docsManifestPages: readonly DocsManifestPage[] = file.pages.map((page) => {
  if (page.locales[DEFAULT_LOCALE] === undefined) {
    throw new Error(`Docs manifest page ${page.url} is missing ${DEFAULT_LOCALE}`)
  }
  return page
})

export const docsManifestNav: readonly DocsManifestNav[] = file.nav

export function findDocsPage(url: string): DocsManifestPage | undefined {
  return docsManifestPages.find((page) => page.url === url)
}

export function docsLocaleCopy(page: DocsManifestPage, locale: Locale): DocsManifestLocale {
  return page.locales[locale] ?? page.locales[DEFAULT_LOCALE]!
}

export function localizedDocsFile(file: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return file
  const extension = file.lastIndexOf('.')
  return `${file.slice(0, extension)}.${locale}${file.slice(extension)}`
}
