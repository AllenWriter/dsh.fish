import { Link } from 'react-router'
import { ARTIFACT_KINDS, CATEGORIES, kindPluralKey } from '@/entities/artifact/model/types'
import { KindIcon } from '@/entities/artifact/ui/kind-icon'
import { CategoryIcon } from '@/entities/artifact/ui/category-icon'
import { useT } from '@/shared/config/i18n'
import { HARNESS_REPO_URL, HUB_DISCORD_URL, HUB_REPO_URL } from '@/shared/config/site'
import {
  BrowseIcon,
  DiscordIcon,
  DocsIcon,
  ExternalLinkIcon,
  GithubIcon,
  SubmitIcon,
  type Icon,
} from '@/shared/ui/icon'

/** The same three destinations, and the same three marks, as the header bar. */
const NAV: readonly { to: string; key: string; icon: Icon }[] = [
  { to: '/browse', key: 'nav.browse', icon: BrowseIcon },
  { to: '/docs', key: 'nav.docs', icon: DocsIcon },
  { to: '/submit', key: 'nav.submit', icon: SubmitIcon },
]

/**
 * Everything this footer points to that is not part of the site.
 *
 * The two brand marks carry the destination on their own, so they are the label
 * as much as the text is; the harness keeps the generic outbound mark because
 * there is no mark that means "the project this hub serves".
 */
const EXTERNAL: readonly { href: string; key: string; icon: Icon }[] = [
  { href: HUB_REPO_URL, key: 'nav.github', icon: GithubIcon },
  { href: HUB_DISCORD_URL, key: 'nav.discord', icon: DiscordIcon },
  { href: HARNESS_REPO_URL, key: 'nav.harness', icon: ExternalLinkIcon },
]

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
                  <FooterLink to={`/kind/${kind}`}>
                    <KindIcon kind={kind} className="size-4 shrink-0" weight="regular" />
                    {t(kindPluralKey(kind))}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('browse.category')} className="lg:col-span-2">
            <h2 className="text-sm font-medium text-foreground">{t('browse.category')}</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <FooterLink to={`/category/${category.id}`}>
                    <CategoryIcon id={category.id} className="size-4 shrink-0" />
                    {t(category.labelKey)}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('app.name')}>
            <h2 className="text-sm font-medium text-foreground">{t('app.name')}</h2>
            <ul className="mt-3 space-y-1.5">
              {NAV.map((entry) => (
                <li key={entry.to}>
                  <FooterLink to={entry.to}>
                    <entry.icon className="size-4 shrink-0" />
                    {t(entry.key)}
                  </FooterLink>
                </li>
              ))}
              {EXTERNAL.map((entry) => (
                <li key={entry.href}>
                  <a
                    href={entry.href}
                    className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <entry.icon className="size-4 shrink-0" />
                    {t(entry.key)}
                  </a>
                </li>
              ))}
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

/**
 * One footer destination.
 *
 * `min-h-9` rather than a bare line of text: eighteen links stacked at their
 * line height give a thumb nothing to aim at, and the taller row is also what
 * gives each glyph room to sit beside its label.
 */
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  )
}
