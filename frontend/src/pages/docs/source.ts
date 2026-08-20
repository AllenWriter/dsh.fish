/**
 * Product-docs content source.
 *
 * `defineDocs` is a build-time macro: Vite rewrites it to static imports of
 * the compiled MDX. The Worker never reads `content/docs` from disk and never
 * `eval`s compiled output. Do not call `getText('raw')` here — that API hits
 * the filesystem, which production does not have.
 *
 * Nothing outside this page slice imports Fumadocs.
 */
import { defineDocs } from 'fumadocs-mdx/macro'
import { loader } from 'fumadocs-core/source'
import { isArtifactKind, type ArtifactKind } from '@/entities/artifact/model/types'
import type { DocsNavNode, DocsSeparatorKey, DocsTocItem } from '@/widgets/docs-shell'

const docs = defineDocs({
  dir: 'content/docs',
})

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
})

export { docs }

const SEPARATOR_TITLE_KEY = {
  publish: 'docs.nav.publish',
  install: 'docs.nav.install',
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
export function docsNav(): DocsNavNode[] {
  const nodes: DocsNavNode[] = []

  function walk(children: readonly { type?: string; name?: unknown; url?: string; children?: readonly unknown[] }[]) {
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

  walk(source.getPageTree().children)
  return nodes
}

/** Indexable `/docs…` paths, including the section home. Used by the pages sitemap. */
export function docsSitemapPaths(): readonly string[] {
  const urls = source.getPages().map((page) => page.url)
  if (!urls.includes('/docs')) {
    throw new Error('Product docs source has no /docs index page')
  }
  return [...urls].sort((a, b) => a.localeCompare(b))
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
