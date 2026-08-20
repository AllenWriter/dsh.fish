import { Link } from 'react-router'
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EASE_OUT } from '@/shared/lib/ease'
import type { Route } from './+types/submit-page'
import { hubContext } from '@/shared/api/hub-context'
import { ARTIFACT_KINDS, kindLabelKey, type ArtifactKind } from '@/entities/artifact/model/types'
import { useSession } from '@/shared/api/auth-client'
import { KindIcon } from '@/entities/artifact/ui/kind-icon'
import { resolveLocale, translate, useT } from '@/shared/config/i18n'
import { breadcrumbLd, errorMeta, pageMeta } from '@/shared/lib/seo'
import {
  ApprovedIcon,
  ErrorIcon,
  ForwardIcon,
  PendingIcon,
  SignInIcon,
  SubmitIcon,
} from '@/shared/ui/icon'

/**
 * Indexable even though the form itself needs an account: "how do I publish a
 * DeepSeek Harness plugin" is a question people search, and this page is the
 * answer to it. Only the form behind it is gated, not the explanation.
 */
export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta()
  const { origin, locale } = loaderData
  return pageMeta({
    origin,
    locale,
    path: '/submit',
    title: `${translate(locale, 'submit.title')} — ${translate(locale, 'app.name')}`,
    description: translate(locale, 'submit.body'),
    jsonLd: [
      breadcrumbLd(origin, locale, [
        { name: translate(locale, 'app.name'), path: '/' },
        { name: translate(locale, 'submit.title'), path: '/submit' },
      ]),
    ],
  })
}

export function loader({ context, request }: Route.LoaderArgs) {
  return {
    locale: resolveLocale(request),
    origin: context.get(hubContext).container.config.baseUrl,
  }
}

type Outcome = { kind: 'approved'; artifactId: string } | { kind: 'pending' } | { kind: 'error'; message: string }

/**
 * Publishing entry point.
 *
 * The form takes a source, not a description: the registry re-reads the real
 * manifest, so a submitter cannot hand-write catalog fields that the crawler
 * would not itself have produced.
 */
export default function SubmitPage() {
  const t = useT()
  const { data: session, isPending } = useSession()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)
  // An `<option>` cannot carry a glyph, so the chosen kind's mark is tracked and
  // drawn inside the field instead. The select stays the source of truth.
  const [kind, setKind] = useState<ArtifactKind>(ARTIFACT_KINDS[0])
  const reduce = useReducedMotion()

  if (isPending) return <Frame>{t('common.loading')}</Frame>

  if (!session?.user) {
    return (
      <Frame>
        <p className="text-muted-foreground">{t('submit.signInRequired')}</p>
        <Link
          to="/sign-in?redirect=%2Fsubmit"
          className="press mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <SignInIcon className="size-4" weight="bold" />
          {t('nav.signIn')}
        </Link>
      </Frame>
    )
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setOutcome(null)
    try {
      const response = await fetch('/api/v1/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: form.get('kind'),
          sourceSpec: form.get('sourceSpec'),
          note: form.get('note') || undefined,
        }),
      })
      const body = (await response.json()) as
        | { status: 'approved' | 'pending'; artifactId?: string }
        | { error: { message: string } }

      if (!response.ok || 'error' in body) {
        setOutcome({
          kind: 'error',
          message: 'error' in body ? body.error.message : t('common.error'),
        })
        return
      }
      setOutcome(
        body.status === 'approved' && body.artifactId
          ? { kind: 'approved', artifactId: body.artifactId }
          : { kind: 'pending' },
      )
    } catch {
      setOutcome({ kind: 'error', message: t('common.error') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('submit.body')}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 text-left">
        <label className="block">
          <span className="text-sm font-medium">{t('submit.kind')}</span>
          <span className="relative mt-1.5 block">
            <KindIcon
              kind={kind}
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              weight="regular"
            />
            <select
              name="kind"
              required
              value={kind}
              onChange={(event) => setKind(event.currentTarget.value as ArtifactKind)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none"
            >
              {ARTIFACT_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(kindLabelKey(option))}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">{t('submit.source')}</span>
          <input
            name="sourceSpec"
            required
            placeholder={t('submit.sourcePlaceholder')}
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3.5 font-mono text-sm outline-none transition-colors focus:border-border-strong"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">{t('submit.note')}</span>
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-border-strong"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <SubmitIcon className="size-4" weight="bold" />
          {t('submit.action')}
        </button>
      </form>

      <AnimatePresence initial={false}>
      {outcome ? (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="mt-6 rounded-xl border border-border bg-card p-4 text-sm"
        >
          {/* Three outcomes, three marks. The glyph is what a reader takes in
              first, so accepted, queued and refused are told apart before the
              sentence beside them is read. */}
          {outcome.kind === 'approved' ? (
            <>
              <p className="flex items-center gap-1.5 font-medium text-primary">
                <ApprovedIcon className="size-4 shrink-0" weight="fill" />
                {t('submit.approved')}
              </p>
              <Link
                to={`/a/${outcome.artifactId}`}
                className="mt-1 inline-flex items-center gap-1.5 text-primary underline"
              >
                {outcome.artifactId}
                <ForwardIcon className="size-3.5 shrink-0" weight="bold" />
              </Link>
            </>
          ) : outcome.kind === 'pending' ? (
            <p className="flex items-center gap-1.5">
              <PendingIcon className="size-4 shrink-0 text-muted-foreground" />
              {t('submit.pending')}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-destructive">
              <ErrorIcon className="size-4 shrink-0" weight="bold" />
              {outcome.message}
            </p>
          )}
        </motion.div>
      ) : null}
      </AnimatePresence>
    </Frame>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  const t = useT()
  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <h1 className="text-2xl font-semibold tracking-tight">{t('submit.title')}</h1>
      {children}
    </div>
  )
}
