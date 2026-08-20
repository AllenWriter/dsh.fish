/**
 * Public API of the product-docs page slice for other pages.
 *
 * Markdown negotiation needs the bundled source text, which does not import
 * Fumadocs. The sitemap reads `docsSitemapPaths` from `./source` directly
 * because that list is generated from the MDX tree — see architecture.md.
 */
export { productDocsMarkdown, supportsProductDocsMarkdown } from './raw'
