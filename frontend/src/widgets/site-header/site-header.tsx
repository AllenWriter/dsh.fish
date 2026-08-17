import { useNavigate } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT } from '@/shared/lib/ease'
import { CommandPalette } from '@/shared/ui/motion/command-palette'
import { IconSwap } from '@/shared/ui/icon-swap'
import { LocaleLink, LocaleNavLink, useLocalePath } from '@/shared/ui/locale-link'
import { AccountMenu } from '@/features/account-menu'
import { LocaleSwitcher } from '@/features/locale-switcher'
import { useT } from '@/shared/config/i18n'
import { writeThemeCookie } from '@/shared/lib/theme'
import { cn } from '@/shared/lib/utils'
import {
  BrowseIcon,
  CloseIcon,
  DarkThemeIcon,
  DashboardIcon,
  DocsIcon,
  LightThemeIcon,
  MenuIcon,
  SearchIcon,
  SubmitIcon,
  type Icon,
} from '@/shared/ui/icon'

/**
 * The three destinations, each with the mark it keeps everywhere else: the same
 * glyph identifies a destination in the bar, in the mobile sheet, in the command
 * palette and in the footer, which is what lets a reader learn it once.
 */
const NAV: readonly { to: string; key: string; icon: Icon }[] = [
  { to: '/browse', key: 'nav.browse', icon: BrowseIcon },
  { to: '/docs', key: 'nav.docs', icon: DocsIcon },
  { to: '/submit', key: 'nav.submit', icon: SubmitIcon },
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
        group: t('nav.browse'),
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
    // `t` and `localePath` are both derived from the request's language, so the
    // palette's labels and destinations change together when it does.
    [navigate, localePath, t],
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <LocaleLink to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <img
            src="/icons/whale-brand.png"
            alt=""
            width="24"
            height="24"
            className="size-6 object-contain"
            aria-hidden
          />
          {t('app.name')}
        </LocaleLink>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((entry) => (
            <LocaleNavLink
              key={entry.to}
              to={entry.to}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {/* The current destination fills its mark. Colour already says
                  which link is active; the fill says it a second way, for a
                  reader who cannot see the first. */}
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
          onClick={() => setPaletteOpen(true)}
          className="press ml-auto hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground hover:border-border-strong sm:flex"
        >
          <SearchIcon className="size-4" weight="bold" />
          {t('nav.search')}
          <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
            &#8984;K
          </kbd>
        </button>

        <LocaleSwitcher className="ml-auto sm:ml-0" />

        <ThemeToggle />

        <AccountMenu />

        <button
          type="button"
          aria-label={t('nav.menu')}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="press hit-area grid size-9 place-items-center rounded-lg border border-border md:hidden"
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

      {/* Grows out of the bar it belongs to rather than appearing beside it. */}
      <AnimatePresence initial={false}>
      {mobileOpen ? (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="overflow-hidden border-t border-border bg-background px-6 md:hidden"
        >
          {/* Destinations only. Account actions stay in the avatar menu, which
              is in the bar at every width. */}
          <div className="py-3">
          {NAV.map((entry) => (
            <LocaleNavLink
              key={entry.to}
              to={entry.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-2.5 text-sm font-medium',
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
          </div>
        </motion.nav>
      ) : null}
      </AnimatePresence>

      <CommandPalette items={commands} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  )
}

/**
 * Theme switch. Reads and writes the same `localStorage` key the inline script
 * in `root.tsx` consults before first paint, so the two never disagree.
 */
function ThemeToggle({ className }: { className?: string }) {
  const t = useT()
  // Initialised from what is actually painted, which covers all three cases:
  // an explicit class from the server, or the system preference when there is
  // no cookie yet.
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
        // Both classes are managed so an explicit light choice can override a
        // dark OS setting, which a lone `.dark` toggle cannot express.
        const root = document.documentElement
        root.classList.toggle('dark', next)
        root.classList.toggle('light', !next)
        writeThemeCookie(next ? 'dark' : 'light')
      }}
      className={cn(
        'press hit-area grid size-9 place-items-center rounded-lg border border-border hover:border-border-strong',
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
