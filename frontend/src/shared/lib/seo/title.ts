import { TITLE_MAX } from '@/shared/config/site'
import { translate, type Locale } from '@/shared/config/i18n'
import { clampDescription } from './url'

/**
 * Search-result title for a plugin page.
 *
 * The package name stays first so a navigational query still matches. The
 * summary is what a stranger actually reads: kind labels ("Bundle", "번들")
 * and a trailing site name occupied the only words a result had without
 * saying what the plugin does, and Google already prints the sitename on
 * its own line.
 */
export function artifactSearchTitle(locale: Locale, name: string, summary: string): string {
  return clampDescription(
    translate(locale, 'seo.artifact.title', { name, summary }),
    TITLE_MAX,
  )
}
