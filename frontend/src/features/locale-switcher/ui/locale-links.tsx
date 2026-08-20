import { useLocation } from 'react-router'
import { ConfirmIcon } from '@/shared/ui/icon'
import { LOCALES, useLocale, writeLocaleCookie } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'

/**
 * Every language the current page can be negotiated into, as real anchors.
 *
 * Each option is named in its own language — a switcher that offers "German"
 * to someone who only reads German is unusable. Choosing one records the
 * choice in the `dsh_locale` cookie and reloads the same URL: the path stays
 * bare, the next render is negotiated from the cookie. A plain anchor, not a
 * client-side link, because the whole document — `lang`, copy, README — is
 * rendered on the server.
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

  return (
    <ul className={className}>
      {LOCALES.map((locale) => (
        <li key={locale.code}>
          <a
            href={`${location.pathname}${location.search}`}
            hrefLang={locale.tag}
            lang={locale.tag}
            aria-current={locale.code === active ? 'true' : undefined}
            onClick={() => writeLocaleCookie(locale.code)}
            className={cn('flex items-center gap-2', itemClassName)}
          >
            <span className="flex-1 truncate">{locale.nativeName}</span>
            {locale.code === active ? (
              <ConfirmIcon className="size-3.5 shrink-0 text-primary" weight="bold" />
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  )
}
