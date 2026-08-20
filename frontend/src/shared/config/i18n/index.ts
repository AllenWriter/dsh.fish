/**
 * Public API of the i18n slice.
 *
 * Everything language-shaped enters through here: the locale registry, the
 * catalogs, the request-locale negotiation and the React bindings. Nothing
 * outside this directory imports a catalog module directly.
 */
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_CODES,
  LOCALE_COOKIE,
  isLocale,
  localeDefinition,
  matchLocale,
  negotiateLocale,
  readLocaleCookie,
  writeLocaleCookie,
  type Locale,
  type LocaleDefinition,
} from './locales'

export {
  CATALOGS,
  translate,
  translatorFor,
  type Catalog,
  type MessageKey,
  type MessageParams,
  type Translator,
} from './translate'

export { canonicalLocaleRedirect } from './path'

export { resolveLocale } from './resolve-locale'

export { LocaleProvider, useLocale, useT } from './locale-context'
