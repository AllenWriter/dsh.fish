import { useLocation } from 'react-router'
import { Check } from 'lucide-react'
import { LOCALES, localizedPath, splitLocalePath, useLocale } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'

/**
 * Every language of the page the reader is on, as real anchors.
 *
 * Each option is named in its own language — a switcher that offers "German"
 * to someone who only reads German is unusable. Plain anchors, not client-side
 * links: switching language re-renders the whole document on the server, which
 * is the only way the `lang` attribute, the canonical URL and the copy change
 * together. The query string rides along, so a reader who switches mid-search
 * keeps their search.
 */
export function LocaleLinks({
  className,
  itemClassName,
}: {
  className?: string
  itemClassName?: string
}) {
  const active = useLocale()
  const location = useLocation()
  const { path } = splitLocalePath(location.pathname)

  return (
    <ul className={className}>
      {LOCALES.map((locale) => (
        <li key={locale.code}>
          <a
            href={`${localizedPath(locale.code, path)}${location.search}`}
            hrefLang={locale.tag}
            lang={locale.tag}
            aria-current={locale.code === active ? 'true' : undefined}
            className={cn('flex items-center gap-2', itemClassName)}
          >
            <span className="flex-1 truncate">{locale.nativeName}</span>
            {locale.code === active ? (
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  )
}
