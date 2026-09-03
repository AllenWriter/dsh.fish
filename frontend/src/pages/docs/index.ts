/**
 * Public API of the product-docs page slice for other pages.
 *
 * Markdown negotiation reads source text through the ASSETS binding, so a
 * body is never bundled into the Worker. The sitemap and `/docs/llms.txt`
 * read `docsSitemapEntries` / `docsNav` from `./source`, which is generated
 * from the Markdown tree — see architecture.md.
 */
export { productDocsMarkdown, productDocsPaths, supportsProductDocsMarkdown } from './raw'
