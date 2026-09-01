import { redirect } from 'react-router'
import type { Route } from './+types/feed'
import { localizedPath, requireLocale } from '@/shared/config/i18n'

/**
 * `/feed.xml` used to list plugins. The public feed is now the blog Atom.
 */
export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  throw redirect(localizedPath(locale, '/blog/feed.xml'))
}
