import { motion, useReducedMotion } from 'motion/react'
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
  const reduce = useReducedMotion()

  return (
    <LocaleLink to={post.url} className={cn('group flex h-full', className)}>
      <motion.div
        whileHover="hover"
        className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-muted"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <motion.img
            src={post.cover}
            alt=""
            width={1200}
            height={2000}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            variants={reduce ? undefined : { hover: { scale: 1.05 } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full object-cover object-center"
          />
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full border border-background/60 bg-background/90 px-2.5 py-1 text-[11px] font-medium tracking-wide text-foreground backdrop-blur">
            {post.seriesTitle}
          </span>
          <motion.span
            variants={reduce ? undefined : { hover: { opacity: 1, y: 0 } }}
            initial={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-background text-foreground shadow-sm"
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </motion.span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
            <time dateTime={post.date}>{formatNewsroomDate(post.date, locale)}</time>
          </p>
          <h2
            title={post.title}
            className="line-clamp-1 text-sm leading-snug font-medium tracking-tight sm:text-base"
          >
            {post.title}
          </h2>
        </div>
      </motion.div>
    </LocaleLink>
  )
}
