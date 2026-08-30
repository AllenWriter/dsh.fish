/**
 * Public API of the blog page slice for other pages.
 *
 * Markdown negotiation needs the bundled source text, which does not import
 * Fumadocs. The sitemap and `/blog/llms.txt` read listing helpers from
 * `./source` directly because those lists are generated from the MDX tree —
 * see architecture.md.
 */
export { blogListingEntries, blogMarkdown, blogPostMarkdown, blogPostMarkdownPaths, supportsBlogMarkdown } from './raw'
export { BLOG_SERIES, isBlogSeries, seriesDescriptionKey, seriesTitleKey } from './series'
export type { BlogSeries } from './series'
