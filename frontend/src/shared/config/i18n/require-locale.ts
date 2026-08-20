import { DEFAULT_LOCALE, isLocale, type Locale } from './locales'

/**
 * Read the `:locale` route parameter, or reject the URL.
 *
 * Every localized route is declared as `:locale?/…`, so the optional first
 * segment matches *any* string — `/nonsense/browse` reaches the browse route
 * with `locale === 'nonsense'`. Serving that would publish an unbounded number
 * of URLs all rendering the same English page, which is duplicate content a
 * crawler will happily index. A 404 is the honest answer, and it is a real one:
 * the loader throws before any data is read.
 *
 * The check is case-sensitive by design. `/ZH-cn/browse` is redirected to the
 * canonical `/zh-CN/browse` at the Worker entry before routing, so anything
 * still holding an off-form prefix here did not come through the front door.
 */
export function requireLocale(raw: string | undefined): Locale {
  if (raw === undefined) return DEFAULT_LOCALE
  if (!isLocale(raw)) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }
  return raw
}
