export type DocsMdxReader = (relativePath: string) => Promise<string | undefined>

/** Minimal ASSETS surface. Avoids DOM vs Cloudflare `Fetcher` conflicts. */
export type DocsAssets = {
  fetch(input: string): Promise<Response>
}

const ASSETS_ORIGIN = 'https://assets.local'

function assertSafeRelative(relativePath: string): string {
  if (
    relativePath.includes('..') ||
    relativePath.includes('\\') ||
    relativePath.startsWith('/') ||
    !/^[A-Za-z0-9._-]+\.mdx$/.test(relativePath)
  ) {
    throw new Error(`Unsafe docs MDX path: ${relativePath}`)
  }
  return relativePath
}

/**
 * Read one product-docs file from the Worker ASSETS binding.
 *
 * Bodies are static files under `/docs/mdx/{slug}.mdx`, copied from
 * `content/docs` at build. They must not be inlined into the Worker script.
 */
export function assetsDocsMdxReader(assets: DocsAssets): DocsMdxReader {
  return async (relativePath) => {
    const safe = assertSafeRelative(relativePath)
    const response = await assets.fetch(`${ASSETS_ORIGIN}/docs/mdx/${safe}`)
    if (!response.ok) return undefined
    return response.text()
  }
}
