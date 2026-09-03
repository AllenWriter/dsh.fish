export type BlogMdxReader = (relativePath: string) => Promise<string | undefined>

/** Minimal ASSETS surface. Avoids DOM vs Cloudflare `Fetcher` conflicts. */
export type BlogAssets = {
  fetch(input: string): Promise<Response>
}

const ASSETS_ORIGIN = 'https://assets.local'

function assertSafeRelative(relativePath: string): string {
  if (
    relativePath.includes('..') ||
    relativePath.includes('\\') ||
    relativePath.startsWith('/') ||
    !/^[a-z]+\/[A-Za-z0-9._-]+\.mdx$/.test(relativePath)
  ) {
    throw new Error(`Unsafe blog MDX path: ${relativePath}`)
  }
  return relativePath
}

/**
 * Read one blog MDX file from the Worker ASSETS binding.
 *
 * Bodies are static files under `/blog/mdx/{series}/{file}.mdx`, copied from
 * `content/blog` at build. They must not be inlined into the Worker script.
 */
export function assetsBlogMdxReader(assets: BlogAssets): BlogMdxReader {
  return async (relativePath) => {
    const safe = assertSafeRelative(relativePath)
    const response = await assets.fetch(`${ASSETS_ORIGIN}/blog/mdx/${safe}`)
    if (!response.ok) return undefined
    return response.text()
  }
}
