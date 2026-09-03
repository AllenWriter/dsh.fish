import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DocsAssets, DocsMdxReader } from './read-mdx'

/**
 * Node-only reader for Vitest. Production code must not import this module —
 * the Worker has no filesystem and must not pull `node:fs` into the bundle.
 */
export const diskDocsMdxReader: DocsMdxReader = async (relativePath) => {
  try {
    return await readFile(join(process.cwd(), 'content/docs', relativePath), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

export function diskDocsAssets(): DocsAssets {
  return {
    fetch: async (input: string) => {
      const pathname = new URL(input, 'https://assets.local').pathname
      const prefix = '/docs/mdx/'
      if (!pathname.startsWith(prefix)) {
        return new Response(null, { status: 404 })
      }
      const body = await diskDocsMdxReader(pathname.slice(prefix.length))
      if (body === undefined) return new Response(null, { status: 404 })
      return new Response(body, {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    },
  }
}
