import { useT } from '@/shared/config/i18n'
import { CONTACT_EMAIL, CONTACT_WECHAT } from '@/shared/config/site'
import { LocaleLink } from '@/shared/ui/locale-link'

const SITE_LINKS = [
  { to: '/', key: 'footer.home' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/docs', key: 'nav.docs' },
] as const

const WRITE_LINKS = [
  { to: '/blog/podcast', key: 'blog.series.podcast' },
  { to: '/blog/tech', key: 'blog.series.tech' },
  { to: '/blog/life', key: 'blog.series.life' },
  { to: '/blog/finance', key: 'blog.series.finance' },
  { to: '/blog/travel', key: 'blog.series.travel' },
] as const

const NOTE_LINKS = [
  { to: '/docs', key: 'nav.docs' },
  { to: '/docs/dify-plugin-agent', key: 'footer.doc.agent' },
  { to: '/docs/dify-video-plugin', key: 'footer.doc.video' },
  { to: '/docs/dify-docs-engineering', key: 'footer.doc.engineering' },
] as const

/**
 * Compact sitemap + RSS. Email collection stays off until a mailer is wired.
 */
export function SiteFooter() {
  const t = useT()

  return (
    <footer className="w-full border-t border-border px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          <FooterColumn title={t('footer.col.site')}>
            {SITE_LINKS.map((entry) => (
              <li key={`${entry.key}:${entry.to}`}>
                <LocaleLink
                  to={entry.to}
                  className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(entry.key)}
                </LocaleLink>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title={t('footer.col.write')}>
            {WRITE_LINKS.map((entry) => (
              <li key={entry.to}>
                <LocaleLink
                  to={entry.to}
                  className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(entry.key)}
                </LocaleLink>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title={t('footer.col.notes')}>
            {NOTE_LINKS.map((entry) => (
              <li key={entry.to}>
                <LocaleLink
                  to={entry.to}
                  className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(entry.key)}
                </LocaleLink>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title={t('footer.col.connect')}>
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('connect.email')}
              </a>
            </li>
            <li className="text-[15px] text-muted-foreground">
              <span className="block">{t('connect.wechat')}</span>
              <span className="font-mono text-xs">{CONTACT_WECHAT}</span>
            </li>
            <li>
              <LocaleLink
                to="/blog/feed.xml"
                className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('footer.rss')}
              </LocaleLink>
            </li>
          </FooterColumn>
        </div>

        <RssCard />
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="min-w-0">
      <h3 className="mb-4 inline-flex rounded-md bg-muted px-2 py-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="space-y-3">{children}</ul>
    </nav>
  )
}

function RssCard() {
  const t = useT()

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('footer.news.title')}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('footer.news.body')}</p>
      <LocaleLink
        to="/blog/feed.xml"
        className="press mt-5 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90"
      >
        {t('footer.news.subscribe')}
      </LocaleLink>
    </div>
  )
}
