import { LocaleLink, LocaleNavLink } from '@/shared/ui/locale-link'
import { localeDefinition, useLocale, useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'
import type {
  BlogPostCard,
  BlogSeriesNavItem,
  BlogTocItem,
} from '../model/types'

function formatPostDate(
  iso: string,
  locale: ReturnType<typeof useLocale>,
): string {
  return new Intl.DateTimeFormat(localeDefinition(locale).tag, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function BlogShell({
  seriesNav,
  currentSeries,
  toc,
  children,
}: {
  seriesNav: readonly BlogSeriesNavItem[]
  currentSeries?: string
  toc?: readonly BlogTocItem[]
  children: React.ReactNode
}) {
  const t = useT()
  const items = toc ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-6 py-10 lg:py-14">
      <div className="min-w-0 flex-1">
        <nav
          aria-label={t('blog.seriesNav')}
          className="mb-8 flex flex-wrap gap-1"
        >
          {seriesNav.map((item) => {
            const active =
              item.id === 'all'
                ? currentSeries === undefined
                : item.id === currentSeries
            return (
              <LocaleNavLink
                key={item.id}
                to={item.href}
                className={cn(
                  'press inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium',
                  active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.title}
              </LocaleNavLink>
            )
          })}
        </nav>
        <article className="min-w-0 text-[15px] leading-7 text-foreground/90 [&_p]:[overflow-wrap:anywhere] [&_li]:[overflow-wrap:anywhere]">
          {children}
        </article>
      </div>

      {items.length > 0 ? (
        <nav
          aria-label={t('docs.onThisPage')}
          className="sticky top-24 hidden h-fit w-44 shrink-0 xl:block"
        >
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('docs.onThisPage')}
          </p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {items.map((item) => (
              <li
                key={item.url}
                style={{ paddingInlineStart: Math.max(0, item.depth - 2) * 12 }}
              >
                <a
                  href={item.url}
                  className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </div>
  )
}

export function BlogPostList({
  posts,
  variant = 'index',
}: {
  posts: readonly BlogPostCard[]
  variant?: 'home' | 'index'
}) {
  const t = useT()
  const locale = useLocale()
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('blog.empty')}</p>
  }

  const home = variant === 'home'

  return (
    <ul
      className={cn(
        'grid',
        home
          ? 'grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4'
          : 'grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3',
      )}
    >
      {posts.map((post, index) => (
        <li key={post.url}>
          <LocaleLink to={post.url} className="group block">
            <div className="overflow-hidden rounded-lg border border-border bg-muted">
              <img
                src={post.cover}
                alt=""
                width={1200}
                height={2000}
                loading={index < (home ? 8 : 4) ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                className="aspect-square w-full object-cover object-center transition-opacity duration-150 group-hover:opacity-90"
              />
            </div>
            {home ? null : (
              <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <time dateTime={post.date}>
                  {formatPostDate(post.date, locale)}
                </time>
                <span aria-hidden="true"> · </span>
                {post.seriesTitle}
              </p>
            )}
            <h2
              className={cn(
                'font-semibold tracking-tight text-balance group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-[3px]',
                home ? 'mt-2 text-sm leading-snug' : 'mt-1.5 text-base',
              )}
            >
              {post.title}
            </h2>
          </LocaleLink>
        </li>
      ))}
    </ul>
  )
}
