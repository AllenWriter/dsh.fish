import { useEffect, useState, type ReactNode } from 'react'
import { LocaleLink } from '@/shared/ui/locale-link'
import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'
import { HelpfulIcon, NextPageIcon, PreviousPageIcon, UnhelpfulIcon } from '@/shared/ui/icon'
import type { DocsNavNode } from '../model/types'

type PageLink = { readonly url: string; readonly title: string }
type Vote = 'up' | 'down'

function pagesInOrder(nav: readonly DocsNavNode[]): PageLink[] {
  return nav.flatMap((node) => (node.type === 'page' ? [{ url: node.url, title: node.title }] : []))
}

function adjacent(nav: readonly DocsNavNode[], currentUrl: string): {
  prev: PageLink | undefined
  next: PageLink | undefined
} {
  const pages = pagesInOrder(nav)
  const index = pages.findIndex((page) => page.url === currentUrl)
  if (index < 0) return { prev: undefined, next: undefined }
  return { prev: pages[index - 1], next: pages[index + 1] }
}

function feedbackKey(url: string): string {
  return `dsh.docs.feedback:${url}`
}

export function DocsPager({
  nav,
  currentUrl,
}: {
  nav: readonly DocsNavNode[]
  currentUrl: string
}) {
  const { prev, next } = adjacent(nav, currentUrl)
  return (
    <div className="mt-auto border-t border-border/40 pt-10 pb-2">
      <DocsFeedback url={currentUrl} />
      {prev || next ? (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {prev ? (
            <PagerCard direction="prev" page={prev} />
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? <PagerCard direction="next" page={next} /> : null}
        </div>
      ) : null}
    </div>
  )
}

function PagerCard({
  direction,
  page,
}: {
  direction: 'prev' | 'next'
  page: PageLink
}) {
  const t = useT()
  const isNext = direction === 'next'
  return (
    <LocaleLink
      to={page.url}
      className={cn(
        'press flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3 transition-colors hover:border-border-strong hover:bg-muted/40',
        isNext && 'items-end text-right',
      )}
    >
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        {isNext ? null : <PreviousPageIcon className="size-3.5" weight="bold" />}
        {t(isNext ? 'docs.pager.next' : 'docs.pager.previous')}
        {isNext ? <NextPageIcon className="size-3.5" weight="bold" /> : null}
      </span>
      <span className="line-clamp-1 text-sm font-medium tracking-tight">{page.title}</span>
    </LocaleLink>
  )
}

function DocsFeedback({ url }: { url: string }) {
  const t = useT()
  const [vote, setVote] = useState<Vote | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(feedbackKey(url))
      setVote(stored === 'up' || stored === 'down' ? stored : null)
    } catch {
      setVote(null)
    }
  }, [url])

  function choose(next: Vote) {
    const value = vote === next ? null : next
    setVote(value)
    try {
      const key = feedbackKey(url)
      if (value) window.localStorage.setItem(key, value)
      else window.localStorage.removeItem(key)
    } catch {
      // Private mode: the choice still shows for this visit.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted-foreground">{t('docs.feedback.prompt')}</p>
      <div className="flex items-center gap-2">
        <VoteButton
          pressed={vote === 'up'}
          label={t('docs.feedback.yes')}
          onClick={() => choose('up')}
        >
          <HelpfulIcon className="size-4" weight={vote === 'up' ? 'fill' : 'bold'} />
        </VoteButton>
        <VoteButton
          pressed={vote === 'down'}
          label={t('docs.feedback.no')}
          onClick={() => choose('down')}
        >
          <UnhelpfulIcon className="size-4" weight={vote === 'down' ? 'fill' : 'bold'} />
        </VoteButton>
      </div>
      {vote ? (
        <p className="text-sm text-muted-foreground">{t('docs.feedback.thanks')}</p>
      ) : null}
    </div>
  )
}

function VoteButton({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'press inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
        pressed
          ? 'border-border-strong bg-muted font-medium text-foreground'
          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
      )}
    >
      {children}
      {label}
    </button>
  )
}
