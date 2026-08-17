import { useEffect, useState } from 'react'
import type { Route } from './+types/dashboard-page'
import { hubContext } from '@/shared/api/hub-context'
import { CatalogGrid } from '@/widgets/catalog-grid/catalog-grid'
import { useSession } from '@/shared/api/auth-client'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { LocaleLink } from '@/shared/ui/locale-link'
import { errorMeta, pageMeta } from '@/shared/lib/seo'
import { Avatar } from '@/shared/ui/avatar'

/** Someone else's dashboard is not a search result. */
export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
  const { origin, locale } = loaderData
  return pageMeta({
    origin,
    locale,
    path: '/dashboard',
    title: `${translate(locale, 'dashboard.title')} — ${translate(locale, 'app.name')}`,
    description: translate(locale, 'dashboard.mySubmissions'),
    index: false,
  })
}

interface SubmissionRow {
  id: string
  kind: string
  status: 'pending' | 'approved' | 'rejected'
  artifactId: string | null
  createdAt: string
}

const STATUS_KEY: Record<SubmissionRow['status'], string> = {
  pending: 'dashboard.status.pending',
  approved: 'dashboard.status.approved',
  rejected: 'dashboard.status.rejected',
}

export function loader({ context, params }: Route.LoaderArgs) {
  return {
    locale: requireLocale(params.locale),
    origin: context.get(hubContext).container.config.baseUrl,
  }
}

export default function DashboardPage() {
  const t = useT()
  const { data: session, isPending } = useSession()
  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null)

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    void fetch('/api/v1/submissions/mine')
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body) => {
        if (!cancelled) setSubmissions((body as { items: SubmissionRow[] }).items)
      })
      .catch(() => {
        if (!cancelled) setSubmissions([])
      })
    return () => {
      cancelled = true
    }
  }, [session?.user])

  if (isPending) return <Frame>{t('common.loading')}</Frame>

  if (!session?.user) {
    return (
      <Frame>
        <LocaleLink
          to="/sign-in?redirect=%2Fdashboard"
          className="press inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {t('nav.signIn')}
        </LocaleLink>
      </Frame>
    )
  }

  return (
    <Frame identity={{ name: session.user.name || session.user.email, image: session.user.image }}>
      <section className="mt-8">
        <h2 className="text-base font-semibold tracking-tight">
          {t('dashboard.mySubmissions')}
        </h2>
        {submissions === null ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : submissions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('dashboard.noSubmissions')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {submissions.map((submission) => (
              <li key={submission.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                <span className="flex-1 truncate font-medium">
                  {submission.artifactId ? (
                    <LocaleLink to={`/a/${submission.artifactId}`} className="hover:underline">
                      {submission.artifactId}
                    </LocaleLink>
                  ) : (
                    submission.id.slice(0, 8)
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{t(STATUS_KEY[submission.status])}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Frame>
  )
}

interface Identity {
  name: string
  image?: string | null
}

/** The page shell. Signed in, the title carries the account it is showing. */
function Frame({ identity, children }: { identity?: Identity; children: React.ReactNode }) {
  const t = useT()
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex items-center gap-4">
        {identity ? <Avatar src={identity.image} name={identity.name} size="lg" /> : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
          {identity ? (
            <p className="truncate text-sm text-muted-foreground">{identity.name}</p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  )
}
