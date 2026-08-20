import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EASE_OUT, SPRING_PANEL } from '@/shared/lib/ease'
import { cn } from '@/shared/lib/utils'
import { LocaleNavLink } from '@/shared/ui/locale-link'
import { useT } from '@/shared/config/i18n'
import { KindIcon } from '@/entities/artifact/ui/kind-icon'
import { CloseIcon, MenuIcon, SearchIcon } from '@/shared/ui/icon'
import type { DocsNavNode, DocsTocItem } from '../model/types'

/**
 * In-column docs chrome: sidebar, optional TOC, mobile menu.
 *
 * Lives beside `SiteHeader`, never instead of it. Search here filters this
 * tree; the header palette remains catalog search.
 */
export function DocsShell({
  nav,
  toc,
  currentUrl,
  children,
}: {
  nav: readonly DocsNavNode[]
  toc: readonly DocsTocItem[]
  currentUrl: string
  children: React.ReactNode
}) {
  const t = useT()
  const reduce = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const filtered = useMemo(() => filterNav(nav, query), [nav, query])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      menuButtonRef.current?.focus()
    }
  }, [menuOpen])

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-6 py-10 lg:py-14">
      <aside className="hidden w-56 shrink-0 lg:block">
        <DocsSearch query={query} onQueryChange={setQuery} />
        <DocsNav nav={filtered} currentUrl={currentUrl} />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            className="press inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
            aria-expanded={menuOpen}
            aria-controls="docs-mobile-nav"
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon className="size-4" weight="bold" />
            {t('docs.menu')}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <motion.div
              className="fixed inset-0 z-50 lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-foreground/20"
                aria-label={t('community.dismiss')}
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                id="docs-mobile-nav"
                role="dialog"
                aria-modal="true"
                aria-label={t('docs.menu')}
                className="absolute inset-y-0 left-0 flex w-[min(20rem,90vw)] flex-col gap-4 overflow-y-auto border-r border-border bg-background p-5"
                initial={reduce ? false : { transform: 'translateX(-100%)' }}
                animate={{ transform: 'translateX(0%)' }}
                exit={reduce ? undefined : { transform: 'translateX(-100%)' }}
                transition={reduce ? { duration: 0.12, ease: EASE_OUT } : SPRING_PANEL}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t('nav.docs')}</p>
                  <button
                    type="button"
                    className="press hit-area grid size-10 place-items-center rounded-lg border border-border"
                    aria-label={t('community.dismiss')}
                    onClick={() => setMenuOpen(false)}
                  >
                    <CloseIcon className="size-4" weight="bold" />
                  </button>
                </div>
                <DocsSearch query={query} onQueryChange={setQuery} />
                <DocsNav nav={filtered} currentUrl={currentUrl} onNavigate={() => setMenuOpen(false)} />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <article className="min-w-0 text-[15px] leading-7 text-foreground/90 [&_p]:[overflow-wrap:anywhere] [&_li]:[overflow-wrap:anywhere]">
          {children}
        </article>
      </div>

      {toc.length > 0 ? (
        <nav
          aria-label={t('docs.onThisPage')}
          className="sticky top-24 hidden h-fit w-44 shrink-0 xl:block"
        >
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('docs.onThisPage')}
          </p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {toc.map((item) => (
              <li key={item.url} style={{ paddingInlineStart: Math.max(0, item.depth - 2) * 12 }}>
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

function DocsSearch({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (value: string) => void
}) {
  const t = useT()
  return (
    <label className="relative mb-5 block">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t('docs.search.placeholder')}
        aria-label={t('docs.search.placeholder')}
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-border-strong"
      />
    </label>
  )
}

function DocsNav({
  nav,
  currentUrl,
  onNavigate,
}: {
  nav: readonly DocsNavNode[]
  currentUrl: string
  onNavigate?: () => void
}) {
  const t = useT()
  if (nav.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('docs.search.empty')}</p>
  }

  return (
    <nav aria-label={t('docs.menu')} className="flex flex-col gap-0.5">
      {nav.map((node, index) => {
        if (node.type === 'separator') {
          return (
            <p
              key={`sep-${node.titleKey}-${index}`}
              className="mt-5 mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase first:mt-0"
            >
              {t(node.titleKey)}
            </p>
          )
        }
        const active = node.url === currentUrl
        return (
          <LocaleNavLink
            key={node.url}
            to={node.url}
            onClick={onNavigate}
            className={cn(
              'press flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm',
              active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {node.kind ? (
              <KindIcon kind={node.kind} className="size-4" weight={active ? 'fill' : 'bold'} />
            ) : null}
            {node.title}
          </LocaleNavLink>
        )
      })}
    </nav>
  )
}

function filterNav(nav: readonly DocsNavNode[], query: string): DocsNavNode[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...nav]

  const out: DocsNavNode[] = []
  let pendingSeparator: DocsNavNode | undefined
  for (const node of nav) {
    if (node.type === 'separator') {
      pendingSeparator = node
      continue
    }
    if (node.title.toLowerCase().includes(needle) || (node.kind !== undefined && node.kind.includes(needle))) {
      if (pendingSeparator !== undefined) {
        out.push(pendingSeparator)
        pendingSeparator = undefined
      }
      out.push(node)
    }
  }
  return out
}
