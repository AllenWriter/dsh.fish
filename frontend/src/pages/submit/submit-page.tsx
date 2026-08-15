import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EASE_OUT } from '@/shared/lib/ease'
import type { Route } from './+types/submit-page'
import { ARTIFACT_KINDS } from '@dsh-fish/backend/domain/artifact/artifact-kind.js'
import { kindLabelKey } from '@/entities/artifact/model/types'
import { useSession } from '@/shared/api/auth-client'
import { t } from '@/shared/config/messages'

export function meta(): Route.MetaDescriptors {
  return [{ title: `${t('submit.title')} — ${t('app.name')}` }]
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
  const { data: session, isPending } = useSession()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()

  if (isPending) return <Frame>{t('common.loading')}</Frame>

  if (!session?.user) {
    return (
      <Frame>
        <p className="text-muted-foreground">{t('submit.signInRequired')}</p>
        <Link
          to="/sign-in?redirect=%2Fsubmit"
          className="press mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
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
          <select
            name="kind"
            required
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none"
          >
            {ARTIFACT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(kindLabelKey(kind))}
              </option>
            ))}
          </select>
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
          className="press h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
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
          {outcome.kind === 'approved' ? (
            <>
              <p className="font-medium text-primary">
                {t('submit.approved')}
              </p>
              <Link to={`/a/${outcome.artifactId}`} className="mt-1 inline-block text-primary underline">
                {outcome.artifactId}
              </Link>
            </>
          ) : outcome.kind === 'pending' ? (
            <p>{t('submit.pending')}</p>
          ) : (
            <p className="text-destructive">{outcome.message}</p>
          )}
        </motion.div>
      ) : null}
      </AnimatePresence>
    </Frame>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <h1 className="text-2xl font-semibold tracking-tight">{t('submit.title')}</h1>
      {children}
    </div>
  )
}
