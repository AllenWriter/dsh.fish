import {
  defineCollections,
  defineConfig,
  defineDocs,
} from 'fumadocs-mdx/config'
import { pageSchema } from 'fumadocs-core/source/schema'
import { z } from 'zod'

export const docs = defineDocs({
  dir: 'content/docs',
})

/**
 * Editorial posts. Separate from `docs`: a blog is a dated collection with
 * series, not a sidebar of guides. Schema follows the official Fumadocs blog
 * collection (author + date) plus a closed series set.
 */
export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: pageSchema.extend({
    author: z.string().min(1),
    date: z.union([z.string(), z.date()]),
    series: z.enum(['harness', 'deepseek', 'changelog', 'notes']),
    description: z.string().min(1),
    cover: z.string().startsWith('/blog/covers/'),
  }),
})

export default defineConfig({
  // Match the catalog readme: plain mono fences, compiled at build time.
  mdxOptions: {
    rehypeCodeOptions: false,
    remarkCodeTabOptions: false,
  },
})
