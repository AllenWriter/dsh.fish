import { defineConfig, defineDocs } from 'fumadocs-mdx/config'

export const docs = defineDocs({
  dir: 'content/docs',
})

export default defineConfig({
  // Match the catalog readme: plain mono fences, compiled at build time.
  mdxOptions: {
    rehypeCodeOptions: false,
    remarkCodeTabOptions: false,
  },
})
