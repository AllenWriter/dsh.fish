/**
 * Public API of the blog page slice for other pages.
 *
 * Listings and locale tables come from the generated frontmatter manifest.
 * Post bodies are read one file at a time (ASSETS in the Worker, disk in tests).
 */
export {
  blogListingEntries,
  blogMarkdown,
  blogPostMarkdown,
  blogPostMarkdownPaths,
  supportsBlogMarkdown,
} from './raw'
export {
  BLOG_SERIES,
  blogSeriesNav,
  isBlogSeries,
  seriesDescriptionKey,
  seriesTitleKey,
} from './series'
export type { BlogSeries } from './series'
