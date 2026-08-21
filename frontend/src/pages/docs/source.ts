/**
 * Product-docs content source.
 *
 * The generated server collection contains build-time compiled MDX metadata.
 * The Worker never reads `content/docs` from disk and never `eval`s output.
 * Do not call `getText('raw')` here — that API hits the filesystem, which
 * production does not have.
 *
 * Nothing outside this page slice imports Fumadocs.
 */
import { docs } from 'collections/server'
import { defineI18n } from 'fumadocs-core/i18n'
import { loader } from 'fumadocs-core/source'
import { isArtifactKind, type ArtifactKind } from '@/entities/artifact/model/types'
import { DEFAULT_LOCALE, LOCALE_CODES, type Locale } from '@/shared/config/i18n'
import type { DocsNavNode, DocsSeparatorKey, DocsTocItem } from '@/widgets/docs-shell'
import { productDocsLocales } from './raw'

const docsI18n = defineI18n({
  languages: [...LOCALE_CODES],
  defaultLanguage: DEFAULT_LOCALE,
  parser: 'dot',
  fallbackLanguage: DEFAULT_LOCALE,
  hideLocale: 'default-locale',
})

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
  // React Router owns locale prefixes for the whole site. Keeping Fumadocs
  // URLs locale-neutral lets LocaleLink add the prefix exactly once.
  url: (slugs) => (slugs.length === 0 ? '/docs' : `/docs/${slugs.join('/')}`),
})

export { docs }

const SEPARATOR_TITLE_KEY = {
  start: 'docs.nav.start',
  develop: 'docs.nav.develop',
  publish: 'docs.nav.publish',
  plugins: 'docs.nav.plugins',
  use: 'docs.nav.use',
  reference: 'docs.nav.reference',
} as const satisfies Record<string, DocsSeparatorKey>

function nodeText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(nodeText).join('')
  if (value && typeof value === 'object' && 'props' in value) {
    const element = value as { props?: { children?: unknown } }
    return nodeText(element.props?.children)
  }
  return ''
}

function kindFromUrl(url: string): ArtifactKind | undefined {
  const match = /^\/docs\/publish\/([\w-]+)$/.exec(url)
  const slug = match?.[1]
  return slug !== undefined && isArtifactKind(slug) ? slug : undefined
}

/**
 * Sidebar model derived from the Fumadocs page tree.
 *
 * Folders are flattened: the `meta.json` separators (`---publish---` etc.) are
 * the section headings, and those headings are i18n keys rather than copy.
 */
export function docsNav(locale: Locale): DocsNavNode[] {
  const nodes: DocsNavNode[] = []

  function walk(
    children: readonly {
      type?: string
      name?: unknown
      url?: string
      children?: readonly unknown[]
    }[],
  ) {
    for (const node of children) {
      if (node.type === 'separator') {
        const raw = nodeText(node.name)
        const titleKey = SEPARATOR_TITLE_KEY[raw as keyof typeof SEPARATOR_TITLE_KEY]
        if (titleKey !== undefined) nodes.push({ type: 'separator', titleKey })
        continue
      }
      if (node.type === 'folder' && Array.isArray(node.children)) {
        walk(node.children as typeof children)
        continue
      }
      if (node.type === 'page' && typeof node.url === 'string') {
        nodes.push({
          type: 'page',
          url: node.url,
          title: nodeText(node.name),
          ...(kindFromUrl(node.url) === undefined ? {} : { kind: kindFromUrl(node.url) }),
        })
      }
    }
  }

  walk(source.getPageTree(locale).children)
  return nodes
}

/** Indexable `/docs…` paths, including the section home. Used by the pages sitemap. */
export function docsSitemapPaths(): readonly string[] {
  const urls = source.getPages(DEFAULT_LOCALE).map((page) => page.url)
  if (!urls.includes('/docs')) {
    throw new Error('Product docs source has no /docs index page')
  }
  return [...urls].sort((a, b) => a.localeCompare(b))
}

/** Sitemap entries only advertise translations that exist as physical MDX files. */
export function docsSitemapEntries(): readonly {
  path: string
  locales: readonly Locale[]
}[] {
  return docsSitemapPaths().map((path) => ({
    path,
    locales: productDocsLocales(path),
  }))
}

export function slugsFromSplat(splat: string | undefined): string[] {
  if (splat === undefined || splat === '') return []
  return splat.split('/').filter((part) => part.length > 0)
}

export function tocFromPage(page: NonNullable<ReturnType<typeof source.getPage>>): DocsTocItem[] {
  return page.data.toc.map((item) => ({
    title: nodeText(item.title),
    url: item.url,
    depth: item.depth,
  }))
}
