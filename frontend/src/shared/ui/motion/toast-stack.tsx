// beui.dev — the deck mechanics are vendored from blocks/notification-stack
// (grid stacking, `layout="position"` reflow, and the hover/tap/dismiss
// gesture hooks in `shared/lib/hooks`), the toast features from
// motion/animated-toast-stack (spring entrance, swipe dismissal, live
// region). The surface finish is the registry's: translucent, blurred,
// rounded-2xl.
//
// Why not the registry components as shipped:
//
// - notification-stack renders the whole stack as one <button> with inert
//   card content and a single "view all" action. These toasts carry a real
//   anchor and a dismiss control each, and interactive elements nested in a
//   button are not valid HTML — so the shell here is a list, and the gesture
//   hooks are vendored to keep its pointer model: a resting pointer's hover
//   expands, a tap expands, and an outside tap or Escape collapses.
// - animated-toast-stack is a flat list. A permanent stack rendered that way
//   is a third of the viewport spent on invitations, so collapsed the deck
//   shows the front toast in full with the rest peeking out above it.
//
// The reductions on the registry's toast are kept: no status vocabulary
// (this palette has no status hues), no timers (the caller owns the list),
// and the action is an anchor rather than a button, since every destination
// it offers is a URL.
//
// The motion keeps the registry's character — spring entrance, exit toward
// the edge it can be swiped off — with physics from `shared/lib/ease`, so
// this surface settles like every other panel in the app.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { EASE_OUT, SPRING_PANEL } from '@/shared/lib/ease'
import { useDismiss } from '@/shared/lib/hooks/use-dismiss'
import { useHoverGesture } from '@/shared/lib/hooks/use-hover-gesture'
import { useTapGesture } from '@/shared/lib/hooks/use-tap-gesture'
import { cn } from '@/shared/lib/utils'
import { CloseIcon } from '@/shared/ui/icon'

/** Where the action takes the reader. `external` opens it in a new tab. */
export interface ToastAction {
  label: string
  href: string
  external: boolean
}

export interface ToastItem<Id extends string = string> {
  id: Id
  /** The mark that identifies the destination, in the leading slot. */
  icon: ReactNode
  title: string
  action: ToastAction
}

export interface ToastStackProps<Id extends string = string> {
  /** Front toast first — it is the one the collapsed deck shows in full. */
  toasts: readonly ToastItem<Id>[]
  /** The close control or a swipe. The toast should leave the list. */
  onDismiss: (id: Id) => void
  /**
   * The action link was activated.
   *
   * Separate from `onDismiss` on purpose: removing the anchor while the
   * browser is still dispatching its click cancels the navigation, so a
   * caller that wants to retire an acted-on toast records it here and lets it
   * disappear on the next visit instead.
   */
  onAction: (id: Id) => void
  /** Accessible name of the live region, and of every dismiss control. */
  labels: { region: string; dismiss: string }
  /**
   * Seconds between one toast's entrance and the next.
   *
   * A short cascade reads as a stack arriving rather than a block appearing.
   */
  stagger?: number
  className?: string
}

/** Rightward pointer travel, in px, that dismisses on release. */
const SWIPE_DISTANCE = 72

/**
 * Rightward flick speed, in px/s, that dismisses regardless of distance.
 *
 * Sonner's threshold. Demanding the full distance makes a quick flick feel
 * ignored, which is the one thing a swipe must never do.
 */
const SWIPE_VELOCITY = 110

/** Exit is faster than entrance: the system answering, not the reader deciding. */
const EXIT_TRANSITION = { duration: 0.18, ease: EASE_OUT } as const

/** The deck's reflow easing — the registry's card transition. */
const CARD_TRANSITION = { duration: 0.32, ease: EASE_OUT } as const

/** How much of each toast behind the front one sticks out of the deck, in px. */
const PEEK = 16

/** Each row behind the front one is this much smaller than the row over it. */
const SCALE_STEP = 0.05

export function ToastStack<Id extends string>({
  toasts,
  onDismiss,
  onAction,
  labels,
  stagger = 0.07,
  className,
}: ToastStackProps<Id>) {
  // Asked once here rather than once per row: the preference is a property of
  // the reader, not of a toast, and the stack is where the motion policy for
  // every row it holds belongs.
  const reduce = useReducedMotion() ?? false
  const rootRef = useRef<HTMLOListElement>(null)
  const hasFocus = useRef(false)
  const hover = useHoverGesture()
  // What the last gesture on the stack was, and whether it was already
  // expanded when that gesture started. A click reports neither.
  const tap = useTapGesture<boolean>()
  const [expanded, setExpanded] = useState(false)
  // Set by the tap that expands the stack, and the reason the outside-tap
  // dismisser exists at all — a hovering pointer has its own way out.
  const [tapExpanded, setTapExpanded] = useState(false)

  const collapse = useCallback(() => {
    setTapExpanded(false)
    setExpanded(false)
  }, [])

  // A pointer leaving the stack is what collapses it, and a finger never
  // leaves: the tap that lands somewhere else stands in for it.
  useDismiss(tapExpanded && expanded, collapse, rootRef)

  return (
    // The grid is what stacks the deck: collapsed, every row claims the same
    // cell and the offsets below decide what peeks out; fanned open, each row
    // takes its own track and `layout="position"` glides it there. No row is
    // ever measured by hand — the grid knows the heights.
    <ol
      ref={rootRef}
      aria-label={labels.region}
      aria-live="polite"
      // A tap reports as a hover on its way past — enter, leave, then click —
      // so an unfiltered hover path expands, collapses and expands again in
      // the space of one tap, springs and all. The tap has its own route
      // through the click handler.
      onPointerEnter={(event) => {
        if (hover.enter(event)) setExpanded(true)
      }}
      onPointerLeave={(event) => {
        if (hover.leave(event) && !hasFocus.current) collapse()
      }}
      onPointerDown={(event) => tap.start(event, expanded)}
      // The platform can take the gesture away mid-press — a scroll, a system
      // swipe — and no click follows it.
      onPointerCancel={tap.drop}
      onClick={(event) => {
        const gesture = tap.take()
        // A link or a control answers its own click; the stack only reads
        // taps that land on the deck itself.
        if ((event.target as Element).closest('a, button')) return
        // Read from where the gesture started, not from now: a browser that
        // focuses the stack on contact expands it mid-tap, and the first tap
        // would then collapse the deck it was meant to open.
        const wasExpanded = gesture ? gesture.state : expanded
        if (!wasExpanded) {
          setExpanded(true)
          if (gesture && gesture.pointerType !== 'mouse') setTapExpanded(true)
          return
        }
        collapse()
      }}
      onFocus={() => {
        hasFocus.current = true
        setExpanded(true)
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        hasFocus.current = false
        collapse()
      }}
      onKeyDown={(event) => {
        // A key press is the start of a keyboard activation, never part of a
        // tap: whatever a taken-away gesture left behind must not be read as
        // one.
        tap.drop()
        if (event.key !== 'Escape') return
        event.preventDefault()
        collapse()
      }}
      className={cn(
        'fixed bottom-4 right-4 z-50 grid w-[calc(100vw-2rem)] max-w-sm items-end gap-2',
        className,
      )}
    >
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <ToastRow
            key={toast.id}
            toast={toast}
            index={index}
            count={toasts.length}
            expanded={expanded}
            delay={index * stagger}
            reduce={reduce}
            dismissLabel={labels.dismiss}
            onDismiss={() => onDismiss(toast.id)}
            onAction={() => onAction(toast.id)}
          />
        ))}
      </AnimatePresence>
    </ol>
  )
}

function ToastRow<Id extends string>({
  toast,
  index,
  count,
  expanded,
  delay,
  reduce,
  dismissLabel,
  onDismiss,
  onAction,
}: {
  toast: ToastItem<Id>
  index: number
  count: number
  expanded: boolean
  delay: number
  reduce: boolean
  dismissLabel: string
  onDismiss: () => void
  onAction: () => void
}) {
  const { action } = toast

  // Reduced motion keeps the fade — it is what says the toast is new — and
  // drops every transform on the row itself, the swipe included. The deck's
  // own positioning is layout, not motion, so it stays but lands instantly.
  const enter = reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96, filter: 'blur(8px)' }
  const settled = reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
  const leave = reduce
    ? { opacity: 0, transition: EXIT_TRANSITION }
    : { opacity: 0, x: 24, scale: 0.96, filter: 'blur(6px)', transition: EXIT_TRANSITION }

  return (
    // Three layers, three jobs: the grid cell owns the deck's reflow and the
    // exit, the wrapper inside it owns the collapsed peek, and the innermost
    // one owns the entrance cascade and the swipe. Splitting them is what
    // keeps the entrance delay off the fan and the swipe off the grid.
    <motion.li
      layout={!reduce ? 'position' : false}
      initial={false}
      exit={leave}
      className={cn('col-start-1', !expanded && index > 0 && 'pointer-events-none')}
      style={{ zIndex: count - index, gridRow: expanded ? index + 1 : 1 }}
    >
      <motion.div
        initial={false}
        animate={{ y: expanded ? 0 : -index * PEEK, scale: expanded ? 1 : 1 - index * SCALE_STEP }}
        transition={reduce ? { duration: 0 } : CARD_TRANSITION}
        style={{ transformOrigin: 'bottom center' }}
      >
        <motion.div
          initial={enter}
          animate={{ ...settled, transition: { ...(reduce ? {} : SPRING_PANEL), delay } }}
          drag={reduce ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          // Resistance to the left, where there is nothing to dismiss toward;
          // an easy ride to the right, which is the way it leaves.
          dragElastic={{ left: 0.04, right: 0.6, top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
              onDismiss()
            }
          }}
        >
          {/* One step above the popover's elevation, because this layer is
              the only one that floats over content the reader did not summon.
              The surface stays translucent and blurred — the registry's
              finish — so the page it covers keeps it grounded in place rather
              than reading as a dialog that escaped its modal. */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
            <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
              {toast.icon}
            </span>

            {/* Balanced, not pretty: one or two lines, so evening the lines
                out beats protecting a last-line orphan. */}
            <p className="min-w-0 flex-1 text-balance text-sm font-medium leading-5 text-foreground">
              {toast.title}
            </p>

            <a
              href={action.href}
              {...(action.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              onClick={onAction}
              className="press inline-flex h-7 shrink-0 items-center rounded-full bg-primary/[0.06] px-3 text-xs font-medium whitespace-nowrap text-foreground transition-colors hover:bg-primary/[0.1]"
            >
              {action.label}
            </a>

            <button
              type="button"
              onClick={onDismiss}
              aria-label={dismissLabel}
              className="press hit-area grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <CloseIcon className="size-3.5" weight="bold" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.li>
  )
}
