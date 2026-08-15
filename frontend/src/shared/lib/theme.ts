/**
 * Theme preference, stored in a cookie so the server can render it.
 *
 * `system` means "no explicit choice"; the stylesheet then follows
 * `prefers-color-scheme`. An explicit choice emits `light` or `dark` on the
 * document element, which wins over the media query.
 */
export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_COOKIE = 'theme'

export function readThemeCookie(header: string | null): ThemePreference {
  if (!header) return 'system'
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === THEME_COOKIE) {
      const value = rest.join('=')
      if (value === 'light' || value === 'dark') return value
    }
  }
  return 'system'
}

/** One year; a theme choice should outlive a browser restart. */
export function writeThemeCookie(theme: 'light' | 'dark'): void {
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;samesite=lax`
}
