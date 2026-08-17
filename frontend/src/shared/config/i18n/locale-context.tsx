import { createContext, useContext, useMemo } from 'react'
import { DEFAULT_LOCALE, type Locale } from './locales'
import { translatorFor, type Translator } from './translate'

/**
 * The request's language, handed down the tree.
 *
 * Context rather than a module-level variable: the server renders many requests
 * per isolate, and one reader's language must never be visible to another's
 * render. The provider sits in the `app` layer, which is the only place that
 * knows what the request asked for.
 */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

/** `const t = useT()` — then `t('nav.browse')` or `t('browse.searchTitle', { query })`. */
export function useT(): Translator {
  const locale = useLocale()
  return useMemo(() => translatorFor(locale), [locale])
}
