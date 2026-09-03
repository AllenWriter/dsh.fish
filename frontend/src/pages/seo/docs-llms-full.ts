import type { Route } from './+types/docs-llms-full'
import { hubContext } from '@/shared/api/hub-context'
import { productDocsMarkdown, productDocsPaths } from '@/pages/docs'
import { assetsDocsMdxReader } from '@/pages/docs/read-mdx'
import { docsLlmsFull, llmsTxtResponse } from './llms'

/**
 * `/docs/llms-full.txt` — every default-language product guide concatenated.
 *
 * A community convention (Mintlify, GitBook, Cloudflare docs), not part of
 * the llms.txt spec. The plugin catalog is not dumped: that is the snapshot.
 * Bodies come from the ASSETS binding, one file per guide, so this route
 * reads the same documents the HTML pages render.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const readText = assetsDocsMdxReader(context.get(hubContext).env.ASSETS)
  const pages = await Promise.all(
    productDocsPaths().map(async (path) => {
      const markdown = await productDocsMarkdown(path, undefined, readText)
      if (markdown === undefined) {
        throw new Error(`Product docs source has no markdown for ${path}`)
      }
      return { path, markdown }
    }),
  )
  return llmsTxtResponse(docsLlmsFull(pages))
}
