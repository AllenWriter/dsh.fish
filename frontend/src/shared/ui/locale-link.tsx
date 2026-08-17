import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router'
import { localizedPath, useLocale } from '@/shared/config/i18n'

/**
 * Internal links that keep the reader in their language.
 *
 * A plain `<Link to="/browse">` on a Japanese page navigates to the English
 * browse page — the reader's language silently ends at the first click, and a
 * crawler following the same link finds a Japanese page whose every outbound
 * link leaves the Japanese cluster. Prefixing at the link is the only place the
 * rule holds for both.
 *
 * `to` is a plain path string on purpose: the prefix has to be applied to the
 * pathname and to nothing else, and an object `To` would need the same handling
 * spread across three fields.
 */
export function LocaleLink({ to, ...props }: Omit<LinkProps, 'to'> & { to: string }) {
  return <Link to={useLocalePath()(to)} {...props} />
}

export function LocaleNavLink({ to, ...props }: Omit<NavLinkProps, 'to'> & { to: string }) {
  return <NavLink to={useLocalePath()(to)} {...props} />
}

/**
 * The prefixing function itself, for the places a component cannot be used —
 * a `<Form action>`, a programmatic `navigate`, an `<a href>` built from a
 * query string.
 */
export function useLocalePath(): (path: string) => string {
  const locale = useLocale()
  return (path) => localizedPath(locale, path)
}
