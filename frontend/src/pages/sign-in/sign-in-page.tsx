import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Route } from './+types/sign-in-page'
import { hubContext } from '@/shared/api/hub-context'
import { authClient } from '@/shared/api/auth-client'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { LocaleLink } from '@/shared/ui/locale-link'
import { errorMeta, pageMeta } from '@/shared/lib/seo'
import { ErrorIcon, GithubIcon, HomeIcon, SignInIcon, SignUpIcon } from '@/shared/ui/icon'
import { IconSwap } from '@/shared/ui/icon-swap'

/**
 * Never indexed: an account page has nothing a search result should lead to.
 * `follow` still applies, so the links out of it are not dead ends.
 */
export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale } = loaderData
  return pageMeta({
    origin,
    locale,
    path: '/sign-in',
    title: `${translate(locale, 'auth.signInTitle')} — ${translate(locale, 'app.name')}`,
    description: translate(locale, 'auth.signInSubtitle'),
    index: false,
  })
}

export function loader({ context, params }: Route.LoaderArgs) {
  return {
    locale: requireLocale(params.locale),
    origin: context.get(hubContext).container.config.baseUrl,
  }
}

export default function SignInPage() {
  const t = useT()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') ?? '/dashboard'
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    setBusy(true)
    setFailed(false)
    try {
      const result =
        mode === 'sign-in'
          ? await authClient.signIn.email({ email, password, callbackURL: redirect })
          : await authClient.signUp.email({ email, password, name: email.split('@')[0] ?? email, callbackURL: redirect })
      if (result.error) setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t('auth.signInTitle')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('auth.signInSubtitle')}</p>

      <button
        type="button"
        onClick={() => void authClient.signIn.social({ provider: 'github', callbackURL: redirect })}
        className="press mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background"
      >
        <GithubIcon className="size-4" weight="fill" />
        {t('auth.withGithub')}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('auth.withEmail')}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium">{t('auth.email')}</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-colors focus:border-border-strong"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t('auth.password')}</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-colors focus:border-border-strong"
          />
        </label>

        {failed ? (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
            <ErrorIcon className="size-4 shrink-0" weight="bold" />
            {t('auth.failed')}
          </p>
        ) : null}

        {/* The mark changes with the mode, so the button says which of the two
            things it will do without the reader re-reading its label. */}
        <button
          type="submit"
          disabled={busy}
          className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <IconSwap swapKey={mode}>
            {mode === 'sign-in' ? (
              <SignInIcon className="size-4" weight="bold" />
            ) : (
              <SignUpIcon className="size-4" weight="bold" />
            )}
          </IconSwap>
          {mode === 'sign-in' ? t('auth.signInTitle') : t('auth.signUp')}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
        className="mt-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === 'sign-in' ? t('auth.signUp') : t('auth.haveAccount')}
      </button>

      <LocaleLink
        to="/"
        className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <HomeIcon className="size-3.5" />
        {t('notFound.home')}
      </LocaleLink>
    </div>
  )
}
