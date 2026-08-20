import { isRetiredLocale, matchLocale } from './locales'

/**
 * URL strategy: one document, one URL, with the language negotiated per
 * request (an explicit cookie choice, then `Accept-Language`) rather than
 * carried in the path. Every URL that still bears a language prefix — from
 * the prefixed era, active or retired — is folded onto the bare path of the
 * same page with a 301, permanently, so a crawler that ever saw the old form
 * drops it and keeps the link's weight.
 *
 * Returns `undefined` when the URL is already prefix-free. A path whose first
 * segment is not a language at all is left alone: that is a page path, and
 * whether it exists is the router's question, not this function's.
 */
export function canonicalLocaleRedirect(pathname: string, search = ''): string | undefined {
  const [, head = '', ...rest] = pathname.split('/')
  if (matchLocale(head) === undefined && !isRetiredLocale(head)) return undefined
  return `${normalize(`/${rest.join('/')}`)}${search}`
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
