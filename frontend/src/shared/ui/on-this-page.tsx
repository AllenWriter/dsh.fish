import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/shared/lib/utils'
import { SPRING_TAB } from '@/shared/lib/ease'
import { useT } from '@/shared/config/i18n'

export interface OnThisPageItem {
  readonly title: string
  readonly url: string
  readonly depth: number
}

const HEADER_OFFSET = 96

function anchorId(url: string): string {
  return decodeURIComponent(url.replace(/^#/, ''))
}

function sameAnchor(a: string, b: string): boolean {
  return anchorId(a) === anchorId(b)
}

function headingActive(items: readonly OnThisPageItem[]): string {
  if (items.length === 0) return ''
  const doc = document.documentElement
  const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 80
  if (atBottom) return items[items.length - 1]!.url

  let current = items[0]!.url
  for (const item of items) {
    const node = document.getElementById(anchorId(item.url))
    if (!node) continue
    if (node.getBoundingClientRect().top - HEADER_OFFSET <= 1) current = item.url
  }
  return current
}

/**
 * On-this-page rail. Active item is the last heading that has crossed the
 * sticky header — not whichever heading occupies the most pixels, which
 * left the last section stuck on the one above it.
 */
export function OnThisPage({ items }: { items: readonly OnThisPageItem[] }) {
  const t = useT()
  const reduce = useReducedMotion()
  const markerId = useId()
  const navRef = useRef<HTMLElement>(null)
  const lockUntil = useRef(0)
  const [active, setActive] = useState(items[0]?.url ?? '')

  useEffect(() => {
    if (items.length === 0) return

    const sync = () => {
      if (Date.now() < lockUntil.current) return
      setActive(headingActive(items))
    }

    const hash = window.location.hash
    const hashed = items.find((item) => sameAnchor(item.url, hash))
    if (hashed) {
      const node = document.getElementById(anchorId(hashed.url))
      if (node) {
        lockUntil.current = Date.now() + 800
        setActive(hashed.url)
        node.scrollIntoView({ block: 'start' })
      } else {
        sync()
      }
    } else {
      sync()
    }
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [items])

  useEffect(() => {
    const current = navRef.current?.querySelector('[data-toc-current="true"]')
    current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function goTo(item: OnThisPageItem, event: MouseEvent<HTMLAnchorElement>) {
    const node = document.getElementById(anchorId(item.url))
    if (!node) return
    event.preventDefault()
    lockUntil.current = Date.now() + 800
    setActive(item.url)
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${anchorId(item.url)}`)
  }

  if (items.length === 0) return null

  return (
    <nav
      ref={navRef}
      aria-label={t('docs.onThisPage')}
      className="docs-scroll sticky top-24 hidden max-h-[calc(100vh-8rem)] w-56 shrink-0 overflow-y-auto xl:block"
    >
      <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground">
        {t('docs.onThisPage')}
      </p>
      <ol className="mt-3 border-l border-border/40 text-[13px] leading-6">
        {items.map((item) => {
          const current = sameAnchor(item.url, active)
          return (
            <li key={`${item.url}:${item.title}`}>
              <a
                href={item.url}
                data-toc-current={current ? 'true' : undefined}
                onClick={(event) => goTo(item, event)}
                className={cn(
                  'relative block py-1.5 transition-colors duration-150',
                  current
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                style={{ paddingInlineStart: 14 + Math.max(0, item.depth - 2) * 12 }}
              >
                {current ? (
                  <motion.span
                    layoutId={markerId}
                    aria-hidden="true"
                    className="absolute top-1.5 bottom-1.5 -left-px w-px rounded-full bg-primary"
                    transition={reduce ? { duration: 0 } : SPRING_TAB}
                  />
                ) : null}
                {item.title}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
