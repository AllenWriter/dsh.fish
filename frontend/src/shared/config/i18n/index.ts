/**
 * Public API of the i18n slice.
 *
 * Everything language-shaped enters through here: the locale registry, the
 * catalogs, the URL-prefix rules and the React bindings. Nothing outside this
 * directory imports a catalog module directly.
 */
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_CODES,
  LOCALE_COOKIE,
  isLocale,
  localeDefinition,
  matchLocale,
  mdxTranslationSuffixes,
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

export {
  canonicalLocaleRedirect,
  localizedPath,
  preferredLocaleRedirect,
  splitLocalePath,
  type SplitPath,
} from './path'

export { LocaleProvider, useLocale, useT } from './locale-context'

export { requireLocale } from './require-locale'
