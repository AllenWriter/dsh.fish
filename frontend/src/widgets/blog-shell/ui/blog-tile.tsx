import { ArrowUpRight } from 'lucide-react'
import { LocaleLink } from '@/shared/ui/locale-link'
import { localeDefinition, useLocale } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'
import type { BlogPostCard } from '../model/types'

function formatNewsroomDate(
  iso: string,
  locale: ReturnType<typeof useLocale>,
): string {
  return new Intl.DateTimeFormat(localeDefinition(locale).tag, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(iso))
    .toUpperCase()
}

export function BlogTile({
  post,
  eager = false,
  className,
}: {
  post: BlogPostCard
  eager?: boolean
  className?: string
}) {
  const locale = useLocale()

  return (
    <LocaleLink to={post.url} className={cn('group block', className)}>
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <img
          src={post.cover}
          alt=""
          width={1200}
          height={2000}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          className="aspect-[4/3] w-full object-cover object-center transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium tracking-wide text-foreground">
          {post.seriesTitle}
        </span>
        <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        <time dateTime={post.date}>{formatNewsroomDate(post.date, locale)}</time>
      </p>
      <h2 className="mt-1 text-base font-semibold tracking-tight text-balance">
        {post.title}
      </h2>
    </LocaleLink>
  )
}
