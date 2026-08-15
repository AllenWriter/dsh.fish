import { Link } from 'react-router'
import { t } from '@/shared/config/messages'

const HARNESS_REPO = 'https://github.com/deepseek-ai/deepseek-harness'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p className="flex-1">{t('app.tagline')}</p>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/browse" className="transition-colors hover:text-foreground">
            {t('nav.browse')}
          </Link>
          <Link to="/docs" className="transition-colors hover:text-foreground">
            {t('nav.docs')}
          </Link>
          <Link to="/submit" className="transition-colors hover:text-foreground">
            {t('nav.submit')}
          </Link>
          <a
            href={HARNESS_REPO}
            className="transition-colors hover:text-foreground"
            rel="noreferrer noopener"
            target="_blank"
          >
            DeepSeek Harness
          </a>
        </nav>
      </div>
    </footer>
  )
}
