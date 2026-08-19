import { DEFAULT_LOCALE, matchLocale, isRetiredLocale, type Locale } from './locales'

/**
 * URL strategy: one path prefix per language, and none for the default one.
 *
 * `/browse` is English, `/ja/browse` is Japanese. Sub-directories rather than
 * sub-domains or a `?lang=` parameter, because a directory inherits the origin's
 * authority, needs no extra DNS or certificate, and — unlike a query parameter —
 * is unambiguously a separate document to a crawler.
 */
export interface SplitPath {
  readonly locale: Locale
  /** The path with any locale prefix removed. Always starts with `/`. */
  readonly path: string
  /** Whether the URL actually carried a prefix, as opposed to defaulting. */
  readonly prefixed: boolean
}

export function splitLocalePath(pathname: string): SplitPath {
  const [, head = '', ...rest] = pathname.split('/')
  const locale = matchLocale(head)
  if (locale === undefined) {
    return { locale: DEFAULT_LOCALE, path: normalize(pathname), prefixed: false }
  }
  return { locale, path: normalize(`/${rest.join('/')}`), prefixed: true }
}

/**
 * Prefix an unlocalized path for one language.
 *
 * The default language is served bare, so this is the identity there. Query and
 * hash are preserved: filter links carry their whole query through a language
 * switch, which is what a reader who switches mid-search expects.
 */
export function localizedPath(locale: Locale, path: string): string {
  const normalized = normalize(path)
  if (locale === DEFAULT_LOCALE) return normalized
  const [pathOnly = '/', suffix = ''] = splitSuffix(normalized)
  const prefixed = pathOnly === '/' ? `/${locale}` : `/${locale}${pathOnly}`
  return `${prefixed}${suffix}`
}

/**
 * Where a URL whose language prefix is not in canonical form should be sent.
 *
 * Two cases, one rule — one document, one URL:
 *
 * - `/en/browse` duplicates `/browse`, which is the most common way a
 *   multilingual site splits its own ranking signal between two URLs.
 * - `/ZH-cn/browse` is the same document as `/zh-CN/browse` to a router that
 *   matches languages case-insensitively, and a different one to a crawler.
 * - `/de/browse` names a retired language; it folds onto `/browse`, the
 *   default-language URL of the same page, so old links keep working.
 *
 * Returns `undefined` when the URL is already canonical. A path whose first
 * segment is not a language at all is left alone: that is a page path, and
 * whether it exists is the router's question, not this function's.
 */
export function canonicalLocaleRedirect(pathname: string, search = ''): string | undefined {
  const [, head = '', ...rest] = pathname.split('/')
  if (isRetiredLocale(head)) {
    return `${normalize(`/${rest.join('/')}`)}${search}`
  }
  const locale = matchLocale(head)
  if (locale === undefined) return undefined
  if (locale !== DEFAULT_LOCALE && head === locale) return undefined
  const { path } = splitLocalePath(pathname)
  return `${localizedPath(locale, path)}${search}`
}

/** Strip a trailing slash so `/browse/` and `/browse` produce one canonical URL. */
function normalize(path: string): string {
  const withLeading = path.startsWith('/') ? path : `/${path}`
  const [pathOnly = '/', suffix = ''] = splitSuffix(withLeading)
  if (pathOnly === '/') return `/${suffix}`
  return `${pathOnly.replace(/\/+$/, '')}${suffix}`
}

/** Split `/a/b?c=d#e` into its path and everything a router should not touch. */
function splitSuffix(value: string): [string, string] {
  const cut = value.search(/[?#]/)
  return cut === -1 ? [value, ''] : [value.slice(0, cut), value.slice(cut)]
}
