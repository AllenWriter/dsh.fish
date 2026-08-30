import { useNavigate } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT } from '@/shared/lib/ease'
import { IconSwap } from '@/shared/ui/icon-swap'
import { LocaleLink, LocaleNavLink, useLocalePath } from '@/shared/ui/locale-link'
import { AccountMenu } from '@/features/account-menu'
import { CatalogSearchPalette } from '@/features/catalog-search'
import { LocaleSwitcher } from '@/features/locale-switcher'
import { useT } from '@/shared/config/i18n'
import { HUB_REPO_URL } from '@/shared/config/site'
import { writeThemeCookie } from '@/shared/lib/theme'
import { cn } from '@/shared/lib/utils'
import {
  BrowseIcon,
  CloseIcon,
  DarkThemeIcon,
  DashboardIcon,
  DocsIcon,
  BlogIcon,
  GithubIcon,
  LightThemeIcon,
  MenuIcon,
  SearchIcon,
  type Icon,
} from '@/shared/ui/icon'

/**
 * Primary destinations first; Browse is the leftover catalog, so it is last
 * and visually quieter. Submit and plugin taxonomy stay off this bar.
 */
const NAV: readonly { to: string; key: string; icon: Icon; secondary?: boolean }[] = [
  { to: '/blog', key: 'nav.blog', icon: BlogIcon },
  { to: '/docs', key: 'nav.docs', icon: DocsIcon },
  { to: '/browse', key: 'nav.browse', icon: BrowseIcon, secondary: true },
]

const SOCIAL: readonly { href: string; key: string; icon: Icon }[] = [
  { href: HUB_REPO_URL, key: 'nav.github', icon: GithubIcon },
]

export function SiteHeader() {
  const t = useT()
  const navigate = useNavigate()
  const localePath = useLocalePath()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const commands = useMemo(
    () => [
      ...NAV.map((entry) => ({
        id: entry.to,
        label: t(entry.key),
        group: t('nav.blog'),
        icon: entry.icon,
        onSelect: () => navigate(localePath(entry.to)),
      })),
      {
        id: 'dashboard',
        label: t('nav.dashboard'),
        group: t('nav.dashboard'),
        icon: DashboardIcon,
        onSelect: () => navigate(localePath('/dashboard')),
      },
    ],
    [navigate, localePath, t],
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <LocaleLink to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <img
            src="/icons/whale-brand.png"
            alt=""
            width="24"
            height="24"
            className="size-6 object-contain"
            aria-hidden
          />
          <span className="hidden sm:inline">{t('app.name')}</span>
        </LocaleLink>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((entry) => (
            <LocaleNavLink
              key={entry.to}
              to={entry.to}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                  entry.secondary ? 'font-normal' : 'font-medium',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <entry.icon className="size-4" weight={isActive ? 'fill' : 'bold'} />
                  {t(entry.key)}
                </>
              )}
            </LocaleNavLink>
          ))}
        </nav>

        <button
          type="button"
          aria-label={t('nav.search')}
          onClick={() => setPaletteOpen(true)}
          className="press ml-auto grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:border-border-strong lg:hidden"
        >
          <SearchIcon className="size-4" weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="press ml-auto hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground hover:border-border-strong lg:flex"
        >
          <SearchIcon className="size-4" weight="bold" />
          {t('nav.search')}
          <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
            &#8984;K
          </kbd>
        </button>

        {SOCIAL.map((entry) => (
          <a
            key={entry.href}
            href={entry.href}
            aria-label={t(entry.key)}
            rel="noreferrer noopener"
            target="_blank"
            className="press hit-area hidden size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground lg:grid"
          >
            <entry.icon className="size-4" weight="bold" />
          </a>
        ))}

        <LocaleSwitcher />

        <ThemeToggle />

        <AccountMenu />

        <button
          type="button"
          aria-label={t('nav.menu')}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="press hit-area grid size-9 shrink-0 place-items-center rounded-lg border border-border md:hidden"
        >
          <IconSwap swapKey={mobileOpen ? 'close' : 'menu'}>
            {mobileOpen ? (
              <CloseIcon className="size-4" weight="bold" />
            ) : (
              <MenuIcon className="size-4" weight="bold" />
            )}
          </IconSwap>
        </button>
      </div>

      <AnimatePresence initial={false}>
      {mobileOpen ? (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="overflow-hidden border-t border-border bg-background px-6 md:hidden"
        >
          <div className="py-3">
          {NAV.map((entry) => (
            <LocaleNavLink
              key={entry.to}
              to={entry.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-2.5 text-sm',
                  entry.secondary ? 'font-normal' : 'font-medium',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <entry.icon className="size-4" weight={isActive ? 'fill' : 'bold'} />
                  {t(entry.key)}
                </>
              )}
            </LocaleNavLink>
          ))}
          {SOCIAL.map((entry) => (
            <a
              key={entry.href}
              href={entry.href}
              rel="noreferrer noopener"
              target="_blank"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-muted-foreground"
            >
              <entry.icon className="size-4" weight="bold" />
              {t(entry.key)}
            </a>
          ))}
          </div>
        </motion.nav>
      ) : null}
      </AnimatePresence>

      <CatalogSearchPalette
        commands={commands}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </header>
  )
}

function ThemeToggle({ className }: { className?: string }) {
  const t = useT()
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    setDark(
      root.classList.contains('dark') ||
        (!root.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches),
    )
  }, [])

  return (
    <button
      type="button"
      aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
      onClick={() => {
        const next = !dark
        setDark(next)
        const root = document.documentElement
        root.classList.toggle('dark', next)
        root.classList.toggle('light', !next)
        writeThemeCookie(next ? 'dark' : 'light')
      }}
      className={cn(
        'press hit-area grid size-9 shrink-0 place-items-center rounded-lg border border-border hover:border-border-strong',
        className,
      )}
    >
      <IconSwap swapKey={dark ? 'sun' : 'moon'}>
        {dark ? (
          <LightThemeIcon className="size-4" weight="bold" />
        ) : (
          <DarkThemeIcon className="size-4" weight="bold" />
        )}
      </IconSwap>
    </button>
  )
}
