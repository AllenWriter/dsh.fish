export const BLOG_SERIES = ['harness', 'deepseek', 'changelog', 'notes'] as const

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
