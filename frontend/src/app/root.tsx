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
import { readThemeCookie, type ThemePreference } from '@/shared/lib/theme'
import { SiteHeader } from '@/widgets/site-header/site-header'
import { SiteFooter } from '@/widgets/site-footer/site-footer'
import { CommunityToasts, readDismissedToasts } from '@/widgets/community-toasts'
import {
  DEFAULT_LOCALE,
  LocaleProvider,
  resolveLocale,
  translate,
  type Locale,
} from '@/shared/config/i18n'
import { documentLanguage } from '@/shared/lib/seo'
import { HomeIcon, IconDefaults } from '@/shared/ui/icon'
import './styles/app.css'

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
  },
]

/**
 * Theme and language, both resolved on the server.
 *
 * The theme is read from a cookie. An inline script that sets a class on
 * <html> cannot work here: React owns the document element during hydration and
 * reconciles its className away, which both reverts the theme and raises a
 * hydration mismatch. A cookie is the only theme store the server can see, so
 * the class is rendered into the HTML and client and server agree from the
 * first byte — no flash, no mismatch.
 *
 * The language is negotiated per request: an explicit choice in the
 * `dsh_locale` cookie, then `Accept-Language`, then the default. One URL
 * serves every language, so a bookmark or a shared link never strands the
 * reader in a language they did not pick — the request decides, not the path.
 *
 * The dismissed community toasts come from a cookie for the theme's reason
 * again: deciding here is what keeps a toast a reader has already closed out
 * of the markup entirely, rather than rendered and then hidden.
 */
export function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie')
  return {
    theme: readThemeCookie(cookie),
    locale: resolveLocale(request),
    dismissedToasts: readDismissedToasts(cookie),
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>('root')
  const theme: ThemePreference = data?.theme ?? 'system'
  const locale: Locale = data?.locale ?? DEFAULT_LOCALE
  const { lang, dir } = documentLanguage(locale)

  return (
    <html lang={lang} dir={dir} className={theme === 'system' ? undefined : theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen">
        <IconDefaults>
          <LocaleProvider locale={locale}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
            >
              {translate(locale, 'a11y.skipToContent')}
            </a>
            {children}
          </LocaleProvider>
        </IconDefaults>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const data = useRouteLoaderData<typeof loader>('root')

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <SiteHeader />
      <main id="main" className="min-w-0 flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <CommunityToasts dismissed={data?.dismissedToasts ?? []} />
    </div>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const data = useRouteLoaderData<typeof loader>('root')
  const locale: Locale = data?.locale ?? DEFAULT_LOCALE
  const isNotFound = isRouteErrorResponse(error) && error.status === 404
  const title = isNotFound ? translate(locale, 'notFound.title') : translate(locale, 'common.error')
  const body = isNotFound ? translate(locale, 'notFound.body') : translate(locale, 'common.error')

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <a
        href="/"
        className="press inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        <HomeIcon className="size-4" weight="bold" />
        {translate(locale, 'notFound.home')}
      </a>
    </div>
  )
}
