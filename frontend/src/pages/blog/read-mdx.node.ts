import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BlogAssets } from './read-mdx'
import type { BlogMdxReader } from './read-mdx'

/**
 * Node-only reader for Vitest. Production code must not import this module —
 * the Worker has no filesystem and must not pull `node:fs` into the bundle.
 */
export const diskBlogMdxReader: BlogMdxReader = async (relativePath) => {
  try {
    return await readFile(join(process.cwd(), 'content/blog', relativePath), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

export function diskBlogAssets(): BlogAssets {
  return {
    fetch: async (input: string) => {
      const pathname = new URL(input, 'https://assets.local').pathname
      const mdxPrefix = '/blog/mdx/'
      if (pathname.startsWith(mdxPrefix)) {
        const body = await diskBlogMdxReader(pathname.slice(mdxPrefix.length))
        if (body === undefined) return new Response(null, { status: 404 })
        return new Response(body, {
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      }

      // WeChat high-fidelity HTML + images live under public/blog/wechat/
      if (pathname.startsWith('/blog/wechat/') && pathname.endsWith('.html')) {
        try {
          const body = await readFile(join(process.cwd(), 'public', pathname.slice(1)), 'utf8')
          return new Response(body, {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return new Response(null, { status: 404 })
          }
          throw error
        }
      }

      return new Response(null, { status: 404 })
    },
  }
}
