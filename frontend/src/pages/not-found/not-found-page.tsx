import { Link } from 'react-router'
import type { Route } from './+types/not-found-page'
import { t } from '@/shared/config/messages'

export function meta(): Route.MetaDescriptors {
  return [{ title: t('notFound.title') }, { name: 'robots', content: 'noindex' }]
}

/** Catch-all. Returns a real 404 so crawlers do not index a soft error page. */
export function loader() {
  throw new Response(null, { status: 404, statusText: 'Not Found' })
}

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t('notFound.title')}</h1>
      <p className="text-muted-foreground">{t('notFound.body')}</p>
      <Link
        to="/"
        className="press rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        {t('notFound.home')}
      </Link>
    </div>
  )
}
