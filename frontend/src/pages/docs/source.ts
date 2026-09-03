/**
 * Product-docs source.
 *
 * Metadata only: the generated manifest carries titles, descriptions, locale
 * availability and the `meta.json` order, so listings, the sidebar, search,
 * and the sitemap stay synchronous and tiny. Article bodies are static files
 * under `/docs/mdx/` (Worker ASSETS) and are never bundled into the Worker.
 */
import { isArtifactKind, type ArtifactKind } from '@/entities/artifact/model/types'
import type { Locale } from '@/shared/config/i18n'
import type { DocsNavNode, DocsSeparatorKey } from '@/widgets/docs-shell'
import {
  docsLocaleCopy,
  docsManifestNav,
  docsManifestPages,
  findDocsPage,
  type DocsManifestPage,
} from './manifest'
import { productDocsLocales } from './raw'

const SEPARATOR_TITLE_KEY = {
  ai: 'docs.nav.ai',
  'self-hosted': 'docs.nav.selfHosted',
  accounts: 'docs.nav.accounts',
  site: 'docs.nav.site',
  finance: 'docs.nav.finance',
  product: 'docs.nav.product',
} as const satisfies Record<string, DocsSeparatorKey>

function kindFromUrl(url: string): ArtifactKind | undefined {
  const slug = /^\/docs\/publish\/([\w-]+)$/.exec(url)?.[1]
  return slug !== undefined && isArtifactKind(slug) ? slug : undefined
}

/**
 * Sidebar model, in `content/docs/meta.json` order.
 *
 * The `meta.json` separators (`---ai---` etc.) are the section headings, and
 * those headings stay i18n keys rather than copy.
 */
export function docsNav(locale: Locale): DocsNavNode[] {
  const nodes: DocsNavNode[] = []

  for (const node of docsManifestNav) {
    if (node.type === 'separator') {
      const titleKey = SEPARATOR_TITLE_KEY[node.key as keyof typeof SEPARATOR_TITLE_KEY]
      if (titleKey !== undefined) nodes.push({ type: 'separator', titleKey })
      continue
    }
    const page = docsManifestPages.find((candidate) => candidate.slug === node.slug)
    if (page === undefined) {
      throw new Error(`Docs manifest nav references missing page ${node.slug}`)
    }
    const kind = kindFromUrl(page.url)
    nodes.push({
      type: 'page',
      url: page.url,
      title: docsLocaleCopy(page, locale).title,
      ...(kind === undefined ? {} : { kind }),
    })
  }

  return nodes
}

export interface DocsPageSummary extends DocsManifestPage {
  readonly title: string
  readonly description: string
}

/** One page's localized metadata, falling back to the default language. */
export function docsPage(path: string, locale: Locale): DocsPageSummary | undefined {
  const page = findDocsPage(path)
  if (page === undefined) return undefined
  const copy = docsLocaleCopy(page, locale)
  return { ...page, title: copy.title, description: copy.description }
}

/** Search rows: titles and descriptions, in one language, for every guide. */
export function docsSearchEntries(
  locale: Locale,
): readonly { url: string; title: string; description: string }[] {
  return docsManifestPages.map((page) => {
    const copy = docsLocaleCopy(page, locale)
    return { url: page.url, title: copy.title, description: copy.description }
  })
}

/** Indexable `/docs…` paths, including the section home. Used by the pages sitemap. */
export function docsSitemapPaths(): readonly string[] {
  const urls = docsManifestPages.map((page) => page.url)
  if (!urls.includes('/docs')) {
    throw new Error('Product docs source has no /docs index page')
  }
  return [...urls].sort((left, right) => left.localeCompare(right))
}

/** Sitemap entries only advertise translations that exist as physical files. */
export function docsSitemapEntries(): readonly {
  path: string
  locales: readonly Locale[]
}[] {
  return docsSitemapPaths().map((path) => ({ path, locales: productDocsLocales(path) }))
}

export function slugsFromSplat(splat: string | undefined): string[] {
  if (splat === undefined || splat === '') return []
  return splat.split('/').filter((part) => part.length > 0)
}

export function docsPathFromSlugs(slugs: readonly string[]): string {
  return slugs.length === 0 ? '/docs' : `/docs/${slugs.join('/')}`
}
