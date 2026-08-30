import { DEFAULT_LOCALE, type Locale } from './locales'
import { en, ja, zhCN, type Catalog, type MessageKey } from './messages'

/** Every catalog, keyed by the same codes the locale registry uses. */
export const CATALOGS: Readonly<Record<Locale, Catalog>> = Object.freeze({
  en,
  'zh-CN': zhCN,
  ja,
})

export type { Catalog, MessageKey }

export type MessageParams = Readonly<Record<string, string | number>>

/** `{name}` placeholders. Anything else in the string is left alone. */
const PLACEHOLDER = /\{(\w+)\}/g

/**
 * Resolve a key in one language.
 *
 * A key with no translation falls back to English rather than rendering the raw
 * key: a half-translated page is a worse result for a reader than an English
 * sentence, and the catalog parity test already fails the build on a real gap,
 * so this path only ever runs for a key invented at a boundary. An unknown key
 * still returns itself, which is loud in review.
 *
 * No module-scoped "current locale" exists on purpose. One Worker isolate
 * serves many requests concurrently, so ambient locale state would let one
 * reader's language leak into another reader's response.
 */
export function translate(locale: Locale, key: string, params?: MessageParams): string {
  const catalog = CATALOGS[locale] as Record<string, string> | undefined
  const fallback = CATALOGS[DEFAULT_LOCALE] as Record<string, string>
  const template = catalog?.[key] ?? fallback[key] ?? key
  if (params === undefined) return template
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** The bound form components use: `t(key, params?)` for one fixed locale. */
export type Translator = (key: string, params?: MessageParams) => string

export function translatorFor(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params)
}
