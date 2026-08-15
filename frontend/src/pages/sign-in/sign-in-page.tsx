import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Github } from 'lucide-react'
import type { Route } from './+types/sign-in-page'
import { authClient } from '@/shared/api/auth-client'
import { t } from '@/shared/config/messages'

export function meta(): Route.MetaDescriptors {
  return [{ title: `${t('auth.signInTitle')} — ${t('app.name')}` }, { name: 'robots', content: 'noindex' }]
}

export default function SignInPage() {
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
        className="press mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background"
      >
        <Github className="size-4" aria-hidden />
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
          <p role="alert" className="text-sm text-destructive">
            {t('auth.failed')}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="press h-11 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
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

      <Link to="/" className="mt-8 text-xs text-muted-foreground hover:text-foreground">
        {t('notFound.home')}
      </Link>
    </div>
  )
}
