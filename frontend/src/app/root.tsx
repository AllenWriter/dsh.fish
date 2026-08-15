import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router'
import type { Route } from '../+types/root'
import { THEME_COOKIE, readThemeCookie, type ThemePreference } from '@/shared/lib/theme'
import { SiteHeader } from '@/widgets/site-header/site-header'
import { SiteFooter } from '@/widgets/site-footer/site-footer'
import { t } from '@/shared/config/messages'
import './styles/app.css'

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
  },
]

/**
 * The theme is read on the server from a cookie.
 *
 * An inline script that sets a class on <html> cannot work here: React owns the
 * document element during hydration and reconciles its className away, which
 * both reverts the theme and raises a hydration mismatch. A cookie is the only
 * theme store the server can see, so the class is rendered into the HTML and
 * client and server agree from the first byte — no flash, no mismatch. With no
 * cookie set, no class is emitted and the stylesheet follows the system
 * preference.
 */
export function loader({ request }: Route.LoaderArgs) {
  return { theme: readThemeCookie(request.headers.get('cookie')) }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>('root')
  const theme: ThemePreference = data?.theme ?? 'system'

  return (
    <html lang="en" className={theme === 'system' ? undefined : theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404
  const title = isNotFound ? t('notFound.title') : t('common.error')
  const body = isNotFound ? t('notFound.body') : t('common.error')

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <a
        href="/"
        className="press rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        {t('notFound.home')}
      </a>
    </div>
  )
}
