import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LocaleLink } from '@/shared/ui/locale-link'
import { useT } from '@/shared/config/i18n'
import { SPRING_LAYOUT, SPRING_TAB } from '@/shared/lib/ease'
import { cn } from '@/shared/lib/utils'
import {
  ALL_SERIES,
  NEWSROOM_PAGE_SIZE,
  filterNewsroomPosts,
  paginateNewsroomPosts,
} from '../model/newsroom'
import type { BlogPostCard, BlogSeriesNavItem } from '../model/types'
import { BlogTile } from './blog-tile'

export function BlogNewsroom({
  posts,
  tabs,
  title,
  subtitle,
  activeSeries = ALL_SERIES,
  tabMode = 'client',
}: {
  posts: readonly BlogPostCard[]
  tabs: readonly BlogSeriesNavItem[]
  title: string
  subtitle?: string
  activeSeries?: string
  tabMode?: 'client' | 'links'
}) {
  const t = useT()
  const reduce = useReducedMotion()
  const underlineId = useId()
  const [selected, setSelected] = useState(activeSeries)
  const [shown, setShown] = useState(NEWSROOM_PAGE_SIZE)
  const seriesId = tabMode === 'links' ? activeSeries : selected
  const filtered = filterNewsroomPosts(posts, seriesId)
  const visible = paginateNewsroomPosts(posts, seriesId, shown)
  const canLoadMore =
    filtered.length >= NEWSROOM_PAGE_SIZE && visible.length < filtered.length

  function selectSeries(id: string) {
    setSelected(id)
    setShown(NEWSROOM_PAGE_SIZE)
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 lg:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
          {t('blog.newsroom.kicker')}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-pretty text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>

      <nav className="mt-10 flex justify-center border-b border-border sm:mt-12">
        <div
          role="tablist"
          aria-label={t('blog.newsroom.tabs')}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10"
        >
          {tabs.map((tab) => {
            const active = tab.id === seriesId
            const className = cn(
              'relative isolate cursor-pointer pb-3 text-sm transition-colors sm:text-base',
              active
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )
            const indicator = active ? (
              <motion.span
                layoutId={underlineId}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground"
                transition={reduce ? { duration: 0 } : SPRING_TAB}
              />
            ) : null
            if (tabMode === 'links') {
              return (
                <LocaleLink
                  key={tab.id}
                  to={tab.href}
                  role="tab"
                  aria-selected={active}
                  className={className}
                >
                  {tab.title}
                  {indicator}
                </LocaleLink>
              )
            }
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectSeries(tab.id)}
                className={className}
              >
                {tab.title}
                {indicator}
              </button>
            )
          })}
        </div>
      </nav>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          {t('blog.empty')}
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((post, index) => (
              <motion.li
                key={post.url}
                layout
                initial={{ opacity: 0, y: reduce ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
                transition={{
                  ...(reduce ? { duration: 0 } : SPRING_LAYOUT),
                  delay: reduce ? 0 : (index % 4) * 0.03,
                }}
              >
                <BlogTile post={post} eager={index < 4} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {canLoadMore ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((count) => count + NEWSROOM_PAGE_SIZE)}
            className="press rounded-full border border-border px-5 py-2 text-sm font-medium hover:border-border-strong"
          >
            {t('blog.loadMore')}
          </button>
        </div>
      ) : null}
    </section>
  )
}
