import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import type { ArtifactDetail } from '@/entities/artifact/model/types'
import { AskArtifactPanel } from '@/features/ask-artifact'
import { useT } from '@/shared/config/i18n'
import { EASE_OUT_CSS } from '@/shared/lib/ease'
import { cn } from '@/shared/lib/utils'
import { AskPanelClosedIcon, AskPanelOpenIcon } from '@/shared/ui/icon'
import { IconSwap } from '@/shared/ui/icon-swap'
import { Button } from '@/shared/ui/motion/button'
import { BottomSheet } from '@/shared/ui/motion/bottom-sheet'

const LG_QUERY = '(min-width: 1024px)'
/** Same width OpenTrade's agent column uses — the inner pane stays this wide
 *  while the outer clip animates from zero, so the transcript does not reflow. */
const ASK_PANEL_WIDTH = 380

/**
 * Ask layout on a plugin page.
 *
 * Desktop matches OpenTrade's agent column: the page is the centre surface,
 * the thread is a sibling that grows from zero width, and there is no overlay.
 * Opening it rounds the page's right edge (the two corners that meet the
 * column) and drops a shadow there. The page stays sharp — no backdrop blur.
 *
 * The toggle sits in the page's own top edge because a collapsed column has
 * no surface to put a control on. Mobile still uses the beUI bottom sheet.
 */
export function ArtifactAsk({
  artifactId,
  ask,
  children,
}: {
  artifactId: string
  ask: ArtifactDetail['ask']
  children: ReactNode
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const desktop = useMinWidthLg()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open || !desktop) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, desktop])

  if (!ask.available) return children

  const thread = (
    <AskArtifactPanel artifactId={artifactId} className="flex min-h-0 flex-1 flex-col" />
  )

  return (
    <div className="lg:flex lg:min-h-0">
      <div
        className={cn(
          'relative min-w-0 flex-1 bg-background',
          'transition-[border-radius,box-shadow] duration-200',
          desktop && open
            ? 'rounded-r-2xl shadow-[var(--shadow-column)] lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto'
            : null,
        )}
        style={{ transitionTimingFunction: EASE_OUT_CSS }}
      >
        <AskTopBar
          open={open}
          pinBelowSiteHeader={!(desktop && open)}
          onToggle={() => setOpen((current) => !current)}
        />
        {children}
      </div>

      <AskColumn
        open={desktop && open}
        onClose={() => setOpen(false)}
        title={t('ask.title')}
        reduceMotion={Boolean(reduce)}
      >
        {desktop ? thread : null}
      </AskColumn>

      <BottomSheet
        open={!desktop && open}
        onOpenChange={setOpen}
        title={t('ask.title')}
        snapPoints={[0.72, 0.94]}
        className="bg-card"
        backdropClassName="bg-background/50"
      >
        {desktop ? null : thread}
      </BottomSheet>
    </div>
  )
}

function AskTopBar({
  open,
  pinBelowSiteHeader,
  onToggle,
}: {
  open: boolean
  pinBelowSiteHeader: boolean
  onToggle: () => void
}) {
  const t = useT()
  const label = open ? t('ask.collapse') : t('ask.open')

  return (
    <div className={cn('sticky z-10 h-0', pinBelowSiteHeader ? 'top-16' : 'top-0')}>
      <div className="flex justify-end px-3 pt-3 sm:px-6">
        <Button
          type="button"
          variant={open ? 'secondary' : 'ghost'}
          size="icon"
          aria-expanded={open}
          aria-controls="ask-panel"
          aria-label={label}
          onClick={onToggle}
        >
          <IconSwap swapKey={open ? 'open' : 'closed'}>
            {open ? (
              <AskPanelOpenIcon className="size-4" weight="bold" />
            ) : (
              <AskPanelClosedIcon className="size-4" weight="bold" />
            )}
          </IconSwap>
        </Button>
      </div>
    </div>
  )
}

function AskColumn({
  open,
  onClose,
  title,
  reduceMotion,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  reduceMotion: boolean
  children: ReactNode
}) {
  const t = useT()

  return (
    <aside
      id="ask-panel"
      aria-hidden={!open}
      aria-label={title}
      className={cn(
        'hidden shrink-0 overflow-hidden lg:block',
        'lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]',
      )}
      style={
        {
          width: open ? ASK_PANEL_WIDTH : 0,
          transition: reduceMotion ? 'none' : `width 200ms ${EASE_OUT_CSS}`,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          'flex h-full flex-col',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          width: ASK_PANEL_WIDTH,
          transition: reduceMotion ? 'none' : `opacity 150ms ${EASE_OUT_CSS}`,
        }}
        inert={!open}
      >
        <header className="flex h-12 shrink-0 items-center gap-1 px-3 ps-4">
          <h2 className="me-auto text-sm font-semibold tracking-tight">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('ask.collapse')}
            onClick={onClose}
          >
            <AskPanelOpenIcon className="size-4" weight="bold" />
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">{children}</div>
      </div>
    </aside>
  )
}

function useMinWidthLg(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(LG_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(LG_QUERY)
    const sync = () => setMatches(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return matches
}
