import { Link, NavLink, useNavigate } from 'react-router'
import { useMemo, useState } from 'react'
import { Fish, Github, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { CommandPalette } from '@/shared/ui/motion/command-palette'
import { useSession, signOut } from '@/shared/api/auth-client'
import { t } from '@/shared/config/messages'
import { cn } from '@/shared/lib/utils'

const NAV = [
  { to: '/browse', key: 'nav.browse' },
  { to: '/docs', key: 'nav.docs' },
  { to: '/submit', key: 'nav.submit' },
] as const

export function SiteHeader() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const commands = useMemo(
    () => [
      ...NAV.map((entry) => ({
        id: entry.to,
        label: t(entry.key),
        group: t('nav.browse'),
        onSelect: () => navigate(entry.to),
      })),
      {
        id: 'dashboard',
        label: t('nav.dashboard'),
        group: t('nav.dashboard'),
        onSelect: () => navigate('/dashboard'),
      },
    ],
    [navigate],
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <Fish className="size-5 text-primary" aria-hidden />
          {t('app.name')}
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((entry) => (
            <NavLink
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
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="press ml-auto hidden h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground hover:border-border-strong sm:flex"
        >
          <Search className="size-4" aria-hidden />
          {t('nav.search')}
          <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
            &#8984;K
          </kbd>
        </button>

        <ThemeToggle className="ml-auto sm:ml-0" />

        {session?.user ? (
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              to="/dashboard"
              className="press rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:border-border-strong"
            >
              {t('nav.dashboard')}
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('nav.signOut')}
            </button>
          </div>
        ) : (
          <Link
            to="/sign-in"
            className="press hidden rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground sm:inline-flex"
          >
            {t('nav.signIn')}
          </Link>
        )}

        <button
          type="button"
          aria-label={t('nav.browse')}
          onClick={() => setMobileOpen((open) => !open)}
          className="press rounded-lg border border-border p-1.5 md:hidden"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-border bg-background px-6 py-3 md:hidden">
          {[...NAV, { to: '/dashboard', key: 'nav.dashboard' } as const].map((entry) => (
            <NavLink
              key={entry.to}
              to={entry.to}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground"
            >
              {t(entry.key)}
            </NavLink>
          ))}
          {session?.user ? null : (
            <Link to="/sign-in" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-primary">
              {t('nav.signIn')}
            </Link>
          )}
        </nav>
      ) : null}

      <CommandPalette items={commands} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  )
}

/**
 * Theme switch. Reads and writes the same `localStorage` key the inline script
 * in `root.tsx` consults before first paint, so the two never disagree.
 */
function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  return (
    <button
      type="button"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const next = !dark
        setDark(next)
        document.documentElement.classList.toggle('dark', next)
        try {
          localStorage.setItem('theme', next ? 'dark' : 'light')
        } catch {
          // A blocked storage API only costs persistence, never the toggle.
        }
      }}
      className={cn('press rounded-lg border border-border p-1.5 hover:border-border-strong', className)}
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  )
}
