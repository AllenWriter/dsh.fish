import { retiredCategoryTarget } from '@dsh-fish/backend/domain/artifact/category.js'
import { localizedPath, splitLocalePath } from '@/shared/config/i18n'

/**
 * Where a retired `/category/<id>` URL should 301.
 *
 * Canonical browse ids stay put. An alias from the previous hub taxonomy, or
 * from Oh-My-DSH, is folded onto its live slug before the router sees it —
 * otherwise `isCategory` would 404 the old bookmark. Unknown ids return
 * undefined so they still 404.
 */
export function retiredCategoryRedirect(pathname: string, search = ''): string | undefined {
  const { locale, path } = splitLocalePath(pathname)
  const match = /^\/category\/([\w-]+)(\.md)?$/.exec(path)
  if (match === null) return undefined
  const target = retiredCategoryTarget(match[1]!)
  if (target === undefined) return undefined
  return `${localizedPath(locale, `/category/${target}${match[2] ?? ''}`)}${search}`
}
