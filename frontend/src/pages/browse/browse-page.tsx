import { redirect } from 'react-router'
import type { Route } from './+types/browse-page'
import { localizedPath, requireLocale } from '@/shared/config/i18n'

/**
 * `/browse` used to be a plugin catalog, then a post filter. Both were
 * redundant with `/blog`. Old links fold onto the writing index.
 */
export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale)
  throw redirect(localizedPath(locale, '/blog'))
}

export default function BrowsePage(_props: Route.ComponentProps) {
  return null
}
