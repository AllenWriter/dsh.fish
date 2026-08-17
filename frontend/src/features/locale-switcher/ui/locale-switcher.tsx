import { useState } from 'react'
import { LanguageIcon } from '@/shared/ui/icon'
import { useT } from '@/shared/config/i18n'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/motion/popover'
import { cn } from '@/shared/lib/utils'
import { LocaleLinks } from './locale-links'

/**
 * Switching language without leaving the page you are on.
 *
 * The panel is portal-rendered on open, so its links are not in the server's
 * HTML. Language discovery for crawlers is the `hreflang` set in the head and
 * the sitemap `xhtml:link` alternates — this control is for the reader.
 *
 * It is also why the site never auto-redirects on `Accept-Language`: a reader
 * who lands in the wrong language fixes it in one click, so there is no reason
 * to guess for them — and guessing would serve a crawler, which sends no
 * language preference, whichever language happened to be first in the header.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen} side="bottom" align="end" sideOffset={12}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label={t('nav.language')}
          className={cn(
            'press hit-area grid size-9 place-items-center rounded-lg border border-border hover:border-border-strong',
            className,
          )}
        >
          <LanguageIcon className="size-4" weight="bold" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2">
        <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">
          {t('nav.language')}
        </p>
        <LocaleLinks
          itemClassName="rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
        />
      </PopoverContent>
    </Popover>
  )
}
