import { translate, type Locale } from '@/shared/config/i18n'
import type { BlogSeriesNavItem } from '@/widgets/blog-shell'

export const BLOG_SERIES = ['tech', 'life', 'finance', 'travel'] as const

export type BlogSeries = (typeof BLOG_SERIES)[number]

const SERIES_SET = new Set<string>(BLOG_SERIES)

export function isBlogSeries(value: string): value is BlogSeries {
  return SERIES_SET.has(value)
}

export function seriesTitleKey(series: BlogSeries): `blog.series.${BlogSeries}` {
  return `blog.series.${series}`
}

export function seriesDescriptionKey(
  series: BlogSeries,
): `blog.series.${BlogSeries}.description` {
  return `blog.series.${series}.description`
}

/** All + the four tags, for newsroom tabs on home and listing pages. */
export function blogSeriesNav(locale: Locale): readonly BlogSeriesNavItem[] {
  return [
    { id: 'all', href: '/blog', title: translate(locale, 'blog.allPosts') },
    ...BLOG_SERIES.map((series) => ({
      id: series,
      href: `/blog/${series}`,
      title: translate(locale, seriesTitleKey(series)),
    })),
  ]
}
