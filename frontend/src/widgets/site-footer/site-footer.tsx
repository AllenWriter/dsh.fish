import { useT } from '@/shared/config/i18n'
import { HUB_REPO_URL } from '@/shared/config/site'
import { LocaleLink } from '@/shared/ui/locale-link'
import {
  BrowseIcon,
  DocsIcon,
  BlogIcon,
  GithubIcon,
  type Icon,
} from '@/shared/ui/icon'
import { cn } from '@/shared/lib/utils'

const NAV: readonly { to: string; key: string; icon: Icon; secondary?: boolean }[] = [
  { to: '/blog', key: 'nav.blog', icon: BlogIcon },
  { to: '/docs', key: 'nav.docs', icon: DocsIcon },
  { to: '/browse', key: 'nav.browse', icon: BrowseIcon, secondary: true },
]

/**
 * Compact identity footer for a personal blog + docs site.
 *
 * Plugin kind/topic/category landings stay off this graph on purpose: they
 * are catalog pages, not the public IA. Browse remains as a secondary door.
 */
export function SiteFooter() {
  const t = useT()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <nav aria-label={t('app.name')} className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {NAV.map((entry) => (
            <FooterLink key={entry.to} to={entry.to} secondary={entry.secondary}>
              <entry.icon className="size-4 shrink-0" />
              {t(entry.key)}
            </FooterLink>
          ))}
          <a
            href={HUB_REPO_URL}
            className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            rel="noreferrer noopener"
            target="_blank"
          >
            <GithubIcon className="size-4 shrink-0" />
            {t('nav.github')}
          </a>
        </nav>

        <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">
          {t('app.author')}
        </p>
      </div>
    </footer>
  )
}

function FooterLink({
  to,
  secondary,
  children,
}: {
  to: string
  secondary?: boolean
  children: React.ReactNode
}) {
  return (
    <LocaleLink
      to={to}
      className={cn(
        'inline-flex min-h-9 items-center gap-2 text-sm transition-colors hover:text-foreground',
        secondary ? 'text-muted-foreground/80' : 'text-muted-foreground',
      )}
    >
      {children}
    </LocaleLink>
  )
}
