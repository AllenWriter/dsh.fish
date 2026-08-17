import { ARTIFACT_KINDS, CATEGORIES, kindPluralKey } from '@/entities/artifact/model/types'
import { useT } from '@/shared/config/i18n'
import { HARNESS_REPO_URL } from '@/shared/config/site'
import { LocaleLink } from '@/shared/ui/locale-link'

const NAV = [
  { to: '/browse', key: 'nav.browse' },
  { to: '/docs', key: 'nav.docs' },
  { to: '/submit', key: 'nav.submit' },
] as const

/**
 * The footer, and the site's internal link graph.
 *
 * Every type and every category gets a real link to its own indexable path.
 * Without this the collection pages are reachable only from a query-string
 * filter, which is to say reachable by a reader and effectively not by a
 * crawler: a page nothing links to is a page nothing ranks. Eighteen links in a
 * footer is unremarkable for a directory, and it is the cheapest way to make
 * every landing page one hop from every other page on the site.
 */
export function SiteFooter() {
  const t = useT()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-label={t('browse.kind')}>
            <h2 className="text-sm font-medium text-foreground">{t('browse.kind')}</h2>
            <ul className="mt-3 space-y-1.5">
              {ARTIFACT_KINDS.map((kind) => (
                <li key={kind}>
                  <FooterLink to={`/kind/${kind}`}>{t(kindPluralKey(kind))}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('browse.category')} className="lg:col-span-2">
            <h2 className="text-sm font-medium text-foreground">{t('browse.category')}</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <FooterLink to={`/category/${category.id}`}>{t(category.labelKey)}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('app.name')}>
            <h2 className="text-sm font-medium text-foreground">{t('app.name')}</h2>
            <ul className="mt-3 space-y-1.5">
              {NAV.map((entry) => (
                <li key={entry.to}>
                  <FooterLink to={entry.to}>{t(entry.key)}</FooterLink>
                </li>
              ))}
              <li>
                <a
                  href={HARNESS_REPO_URL}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {t('nav.harness')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
          {t('app.tagline')}
        </p>
      </div>
    </footer>
  )
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <LocaleLink
      to={to}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </LocaleLink>
  )
}
