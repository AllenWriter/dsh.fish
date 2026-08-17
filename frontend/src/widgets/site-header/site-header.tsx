import { useNavigate } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Fish, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { EASE_OUT } from '@/shared/lib/ease'
import { CommandPalette } from '@/shared/ui/motion/command-palette'
import { LocaleLink, LocaleNavLink, useLocalePath } from '@/shared/ui/locale-link'
import { AccountMenu } from '@/features/account-menu'
import { LocaleSwitcher } from '@/features/locale-switcher'
import { useT } from '@/shared/config/i18n'
import { writeThemeCookie } from '@/shared/lib/theme'
import { cn } from '@/shared/lib/utils'

const NAV = [
  { to: '/browse', key: 'nav.browse' },
  { to: '/docs', key: 'nav.docs' },
  { to: '/submit', key: 'nav.submit' },
] as const

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
        onSelect: () => navigate(localePath(entry.to)),
      })),
      {
        id: 'dashboard',
        label: t('nav.dashboard'),
        group: t('nav.dashboard'),
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
          <Fish className="size-5 text-primary" aria-hidden />
          {t('app.name')}
        </LocaleLink>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((entry) => (
            <LocaleNavLink
              key={entry.to}
              to={entry.to}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {t(entry.key)}
            </LocaleNavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="press ml-auto hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground hover:border-border-strong sm:flex"
        >
          <Search className="size-4" aria-hidden />
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
          onClick={() => setMobileOpen((open) => !open)}
          className="press rounded-lg border border-border p-1.5 md:hidden"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
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
              className="block py-2 text-sm font-medium text-muted-foreground"
            >
              {t(entry.key)}
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
  const reduce = useReducedMotion()
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
        'press grid size-9 place-items-center rounded-lg border border-border hover:border-border-strong',
        className,
      )}
    >
      {/* Same crossfade as the copy control, so every icon that swaps state in
          this product moves the same way. */}
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={dark ? 'sun' : 'moon'}
          initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          transition={reduce ? { duration: 0.12 } : { type: 'spring', duration: 0.3, bounce: 0 }}
          className="grid place-items-center"
        >
          {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
