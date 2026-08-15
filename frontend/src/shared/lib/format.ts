/** Compact counts: 1200 -> 1.2k. Locale-independent so SSR and client agree. */
export function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}

/**
 * Relative time in whole units.
 *
 * Rendered on the server and hydrated on the client, so it is computed from a
 * passed-in `now` rather than reading the clock twice and mismatching.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
    [31536000, 'month'],
  ]
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  let previous = 1
  for (const [limit, unit] of units) {
    if (seconds < limit) return formatter.format(-Math.floor(seconds / previous), unit)
    previous = limit
  }
  return formatter.format(-Math.floor(seconds / 31536000), 'year')
}
