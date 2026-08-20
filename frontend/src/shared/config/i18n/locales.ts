/**
 * The locale registry.
 *
 * One list drives everything language-shaped in the product: the `lang`/`dir`
 * attributes on the document, the `og:locale` a link preview shows, and the
 * switcher in the header. Adding a language means adding one entry here plus
 * one message catalog — nothing else has a list of languages in it.
 *
 * `nativeName` is deliberately not a translated string. A language switcher
 * that renders "German" to a reader who only speaks German is unusable; every
 * option names itself, in itself, which is how a reader finds their own row.
 */
export interface LocaleDefinition {
  /** URL prefix and catalog key. BCP 47, region only where it disambiguates. */
  readonly code: string
  /** Value for `<html lang>`. */
  readonly tag: string
  /** Underscored form Open Graph wants: `zh_CN`, not `zh-CN`. */
  readonly ogLocale: string
  readonly dir: 'ltr' | 'rtl'
  /** How this language names itself, for the switcher. */
  readonly nativeName: string
}

export const LOCALES = [
  { code: 'en', tag: 'en', ogLocale: 'en_US', dir: 'ltr', nativeName: 'English' },
  { code: 'zh-CN', tag: 'zh-Hans', ogLocale: 'zh_CN', dir: 'ltr', nativeName: '简体中文' },
  { code: 'zh-TW', tag: 'zh-Hant', ogLocale: 'zh_TW', dir: 'ltr', nativeName: '繁體中文' },
  { code: 'ja', tag: 'ja', ogLocale: 'ja_JP', dir: 'ltr', nativeName: '日本語' },
  { code: 'ko', tag: 'ko', ogLocale: 'ko_KR', dir: 'ltr', nativeName: '한국어' },
  { code: 'ru', tag: 'ru', ogLocale: 'ru_RU', dir: 'ltr', nativeName: 'Русский' },
] as const satisfies readonly LocaleDefinition[]

export type Locale = (typeof LOCALES)[number]['code']

/**
 * The language served without a URL prefix.
 *
 * English lives at `/browse`, not `/en/browse`. A prefixed duplicate of the
 * default language is the most common way a multilingual site splits its own
 * ranking signal across two URLs, so `/en/*` is redirected to the bare path
 * rather than served.
 */
export const DEFAULT_LOCALE: Locale = 'en'

/**
 * Languages the site once served under a URL prefix and no longer does.
 * A retired prefix folds onto the bare path of the same page (a 301), so
 * existing links and crawlers follow through instead of dying on a 404.
 */
const RETIRED = new Set(['de', 'es', 'fr', 'pt-br'])

/** Case-insensitive match for a language the site no longer serves. */
export function isRetiredLocale(raw: string): boolean {
  return RETIRED.has(raw.toLowerCase())
}

/**
 * Cookie holding an explicit language choice from the switcher. It outranks
 * `Accept-Language`: a browser setting is a guess, a click is a decision.
 */
export const LOCALE_COOKIE = 'dsh_locale'

export function readLocaleCookie(header: string | null): Locale | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === LOCALE_COOKIE) {
      const value = rest.join('=')
      if (isLocale(value)) return value
    }
  }
  return undefined
}

/** One year; a language choice should outlive a browser restart. */
export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`
}

/**
 * The best catalog for an `Accept-Language` header, or `undefined` when the
 * browser asks for nothing we have. Chinese is matched by script: `zh-Hant`
 * and the traditional-script regions get `zh-TW`, everything else Chinese
 * gets `zh-CN`.
 */
export function negotiateLocale(header: string | null): Locale | undefined {
  if (!header) return undefined
  const accepted = header
    .split(',')
    .map((part) => {
      const [tag = '', ...qparts] = part.trim().split(';q=')
      const q = qparts.length === 0 ? 1 : Number(qparts.join(';q='))
      return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 0 }
    })
    .filter((entry) => entry.tag !== '' && entry.tag !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q)

  for (const { tag } of accepted) {
    const match = matchAcceptedTag(tag)
    if (match !== undefined) return match
  }
  return undefined
}

function matchAcceptedTag(tag: string): Locale | undefined {
  const exact = BY_LOWER_CODE.get(tag)
  if (exact) return exact.code as Locale
  if (tag === 'zh' || tag === 'zh-hans' || tag === 'zh-sg' || tag === 'zh-my') return 'zh-CN'
  if (tag === 'zh-hant' || tag === 'zh-tw' || tag === 'zh-hk' || tag === 'zh-mo') return 'zh-TW'
  const base = tag.split('-')[0] ?? ''
  return BY_LOWER_CODE.get(base)?.code as Locale | undefined
}

const BY_CODE = new Map<string, LocaleDefinition>(LOCALES.map((entry) => [entry.code, entry]))

/** Lower-cased index, so `/ZH-cn/browse` resolves rather than 404s. */
const BY_LOWER_CODE = new Map<string, LocaleDefinition>(
  LOCALES.map((entry) => [entry.code.toLowerCase(), entry]),
)

export const LOCALE_CODES: readonly Locale[] = LOCALES.map((entry) => entry.code)

export function isLocale(raw: string): raw is Locale {
  return BY_CODE.has(raw)
}

export function localeDefinition(locale: Locale): LocaleDefinition {
  const found = BY_CODE.get(locale)
  if (!found) {
    // Unreachable through `Locale`, but a cast at a boundary could get here and
    // a silent fallback would hide the bad input rather than surface it.
    throw new Error(`Unknown locale: ${locale}`)
  }
  return found
}

/**
 * Resolve a raw URL segment to a locale.
 *
 * Case-insensitive because links get typed and copied by hand; anything that is
 * not a language returns `undefined` so the caller can treat the segment as a
 * path instead of guessing.
 */
export function matchLocale(raw: string | undefined): Locale | undefined {
  if (raw === undefined || raw === '') return undefined
  return (BY_LOWER_CODE.get(raw.toLowerCase())?.code as Locale) ?? undefined
}
