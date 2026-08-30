import { LocaleLink } from '@/shared/ui/locale-link'
import { Avatar } from '@/shared/ui/avatar'
import { useT } from '@/shared/config/i18n'
import type { BlogPostCard } from '../model/types'
import { BlogTile } from './blog-tile'

export function BlogArticle({
  title,
  description,
  author,
  date,
  formattedDate,
  readingMinutes,
  cover,
  seriesId,
  seriesTitle,
  related,
  children,
}: {
  title: string
  description: string
  author: string
  date: string
  formattedDate: string
  readingMinutes: number
  cover: string
  seriesId: string
  seriesTitle: string
  related: readonly BlogPostCard[]
  children: React.ReactNode
}) {
  const t = useT()
  const authorName = t('blog.authorShort')

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
      <nav
        aria-label={t('blog.breadcrumb')}
        className="text-sm text-muted-foreground"
      >
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <LocaleLink to="/blog" className="hover:text-foreground">
              {t('blog.title')}
            </LocaleLink>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <LocaleLink
              to={`/blog/${seriesId}`}
              className="hover:text-foreground"
            >
              {seriesTitle}
            </LocaleLink>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>

      <header className="mt-8">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-lg text-pretty text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Avatar name={author} size="sm" />
          <span className="font-medium text-foreground">{author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={date}>{formattedDate}</time>
          <span aria-hidden="true">·</span>
          <span>{t('blog.readTime', { minutes: readingMinutes })}</span>
        </div>
        <img
          src={cover}
          alt=""
          width={1200}
          height={2000}
          fetchPriority="high"
          className="mt-8 aspect-[4/3] w-full rounded-2xl border border-border bg-muted object-cover"
        />
      </header>

      <div className="mt-8 text-[15px] leading-7 text-foreground/90 [&_p]:[overflow-wrap:anywhere] [&_li]:[overflow-wrap:anywhere]">
        {children}
      </div>

      <aside className="mt-12 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('blog.writtenBy')}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <Avatar name={authorName} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">{authorName}</p>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              {t('blog.authorBio')}
            </p>
          </div>
        </div>
      </aside>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('blog.related')}
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((post) => (
              <li key={post.url}>
                <BlogTile post={post} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
