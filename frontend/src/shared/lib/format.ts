import { localeDefinition, type Locale } from '@/shared/config/i18n'

/**
 * Compact counts: 1200 -> 1.2k.
 *
 * Deliberately *not* locale-aware, unlike the date below. `Intl.NumberFormat`
 * with `notation: 'compact'` produces "1200" in Japanese, "1,2 k" in German and
 * "1.2K" in English, and the client and the server do not always ship the same
 * ICU data — a mismatch here is a hydration error on every card that shows a
 * star count. The suffixes are conventional in developer tooling in every
 * language this site serves.
 */
export function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}

/**
 * Relative time in whole units, in the reader's language.
 *
 * Rendered on the server and hydrated on the client, so it is computed from a
 * passed-in `now` rather than reading the clock twice and mismatching.
 *
 * `Intl.RelativeTimeFormat` is safe to localise where the compact number is
 * not: it is given a whole number and a unit, and both runtimes resolve the
 * same phrase for them. A locale whose data is missing falls back to English
 * rather than throwing.
 */
export function relativeTime(iso: string, now: number = Date.now(), locale: Locale = 'en'): string {
  const then = new Date(iso).getTime()
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
    [31536000, 'month'],
  ]
  const formatter = new Intl.RelativeTimeFormat(localeDefinition(locale).tag, { numeric: 'auto' })
  let previous = 1
  for (const [limit, unit] of units) {
    if (seconds < limit) return formatter.format(-Math.floor(seconds / previous), unit)
    previous = limit
  }
  return formatter.format(-Math.floor(seconds / 31536000), 'year')
}
