import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EASE_OUT, SPRING_PANEL, SPRING_TAB } from '@/shared/lib/ease'
import { cn } from '@/shared/lib/utils'
import { LocaleNavLink } from '@/shared/ui/locale-link'
import { useT } from '@/shared/config/i18n'
import { CloseIcon, MenuIcon } from '@/shared/ui/icon'
import type { DocsNavNode, DocsTocItem } from '../model/types'
import { DocsToc } from './docs-toc'
import { DocsPager } from './docs-pager'

/**
 * Mintlify-style docs chrome: sticky sidebar + article + on-this-page.
 * Search lives in the site header only — not a second box in this column.
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
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const previousOverflow = document.body.style.overflow
    const menuButton = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      menuButton?.focus()
    }
  }, [menuOpen])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      <aside className="relative hidden w-64 shrink-0 border-r border-border/30 lg:block">
        <div className="docs-scroll sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-5 py-8">
          <DocsNav nav={nav} currentUrl={currentUrl} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-6 py-10 lg:px-12 lg:py-12">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-6 lg:hidden">
              <button
                ref={menuButtonRef}
                type="button"
                className="press inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
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
                  <div
                    className="absolute inset-0 bg-foreground/20"
                    aria-hidden="true"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    ref={dialogRef}
                    id="docs-mobile-nav"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('docs.menu')}
                    className="docs-scroll absolute inset-y-0 left-0 flex w-[min(20rem,90vw)] flex-col gap-4 overflow-y-auto border-r border-border bg-background p-5"
                    initial={reduce ? false : { transform: 'translateX(-100%)' }}
                    animate={{ transform: 'translateX(0%)' }}
                    exit={reduce ? undefined : { transform: 'translateX(-100%)' }}
                    transition={reduce ? { duration: 0.12, ease: EASE_OUT } : SPRING_PANEL}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t('nav.docs')}</p>
                      <button
                        ref={closeButtonRef}
                        type="button"
                        className="press hit-area grid size-10 place-items-center rounded-lg border border-border"
                        aria-label={t('community.dismiss')}
                        onClick={() => setMenuOpen(false)}
                      >
                        <CloseIcon className="size-4" weight="bold" />
                      </button>
                    </div>
                    <DocsNav
                      nav={nav}
                      currentUrl={currentUrl}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <article className="flex min-w-0 max-w-3xl flex-1 flex-col text-[15px] leading-7 text-foreground/90 [&_p]:[overflow-wrap:anywhere] [&_li]:[overflow-wrap:anywhere]">
              <div className="min-w-0">{children}</div>
              <DocsPager nav={nav} currentUrl={currentUrl} />
            </article>
          </div>

          <DocsToc toc={toc} />
        </div>
      </div>
    </div>
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
  const reduce = useReducedMotion()
  const activePillId = useId()
  if (nav.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('docs.search.empty')}</p>
  }

  return (
    <nav aria-label={t('docs.menu')} className="flex flex-col">
      {nav.map((node, index) => {
        if (node.type === 'separator') {
          return (
            <p
              key={`sep-${node.titleKey}-${index}`}
              className="mt-6 mb-2 px-2 text-sm font-semibold tracking-wide text-foreground first:mt-0"
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
              'relative isolate rounded-md px-2 py-1.5 text-[13px] leading-snug transition-[color,background-color,transform] duration-150',
              active
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:translate-x-0.5 hover:bg-muted/50 hover:text-foreground',
            )}
          >
            {active ? (
              <motion.span
                layoutId={activePillId}
                className="absolute inset-0 -z-10 rounded-md bg-muted"
                transition={reduce ? { duration: 0 } : SPRING_TAB}
              />
            ) : null}
            {node.title}
          </LocaleNavLink>
        )
      })}
    </nav>
  )
}
