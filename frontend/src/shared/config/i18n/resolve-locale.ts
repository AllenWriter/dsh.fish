import { DEFAULT_LOCALE, negotiateLocale, readLocaleCookie, type Locale } from './locales'

/**
 * The request's language.
 *
 * One URL serves every language, so the language has to come from the request
 * itself. An explicit choice stored in the `dsh_locale` cookie wins over
 * `Accept-Language` — a click is a decision, a browser setting is a guess —
 * and anything we cannot match falls back to the default language.
 *
 * This runs once per request and the result travels in loader data and React
 * context; no module-level "current locale" exists, because one Worker
 * isolate serves many requests concurrently.
 */
export function resolveLocale(request: Request): Locale {
  return (
    readLocaleCookie(request.headers.get('cookie')) ??
    negotiateLocale(request.headers.get('accept-language')) ??
    DEFAULT_LOCALE
  )
}
