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

export function productDocsMarkdown(unlocalizedPath: string): string | undefined {
  const relative = fileForPath(unlocalizedPath)
  if (relative === undefined) return undefined
  const suffix = `/content/docs/${relative}`
  const key = Object.keys(RAW).find((candidate) => candidate.endsWith(suffix) || candidate.endsWith(relative))
  return key === undefined ? undefined : RAW[key]
}

export function supportsProductDocsMarkdown(unlocalizedPath: string): boolean {
  return productDocsMarkdown(unlocalizedPath) !== undefined
}
