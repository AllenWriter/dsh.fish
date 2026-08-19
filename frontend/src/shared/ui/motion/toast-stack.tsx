// beui.dev/components/motion/animated-toast-stack — vendored from the beui
// registry. Import aliases are remapped onto this project's FSD shared layer,
// lucide glyphs onto `shared/ui/icon`, and the surface onto the semantic
// tokens (`bg-card`, `border-border`, `text-muted-foreground`).
//
// Deliberate deviations from the registry component:
//
// 1. No status vocabulary. beui's toast carries neutral/info/loading/success/
//    error, each with its own hue and an icon that morphs between them. This
//    product's palette is one accent and no status hues
//    (`docs/frontend/ui-patterns.md`), and nothing here reports progress, so
//    the status machinery — and the emerald/destructive classes that came
//    with it — is gone rather than left in as unreachable options.
// 2. No timers. Every toast here stays until it is dismissed, so the
//    registry's duration bookkeeping (and the `useAnimatedToastStack` hook
//    that owned it) has no job. The caller owns the list.
// 3. The action is a link, not a button. Every action this product puts in a
//    toast navigates somewhere, and a real anchor is what gives it a middle
//    click, a context menu, and the right role.
// 4. The stack is a deck, not a list. Collapsed, it shows the front toast in
//    full with the rest peeking out above it; a hover or focus anywhere on
//    the stack fans it open, and it folds again when the pointer leaves. The
//    registry renders every toast at full size, which for a permanent stack
//    is a third of the viewport spent on invitations.
// 5. A toast is a single line: the mark, the title, then the action and the
//    dismiss control grouped on the right — one glance, one row.
//
// The motion keeps the registry's character — spring entrance, exit toward
// the edge it can be swiped off — but the physics come from
// `shared/lib/ease`, so this surface settles like every other panel in the
// app.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from '@/shared/lib/ease'
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

/** How much of each toast behind the front one sticks out of the deck, in px. */
const PEEK = 16

/** Each row behind the front one is this much smaller than the row over it. */
const SCALE_STEP = 0.05

/** Row spacing when the deck is fanned open, in px. */
const GAP = 8

/** Row height assumed until the row has measured itself, in px. */
const FALLBACK_HEIGHT = 64

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
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [heights, setHeights] = useState<Readonly<Record<string, number>>>({})

  const expanded = hovered || focused

  const measure = useCallback((id: string, height: number) => {
    setHeights((current) => (current[id] === height ? current : { ...current, [id]: height }))
  }, [])

  // Each row's offset from the edge the deck is anchored to. Collapsed, a row
  // peeks out by its index times PEEK; fanned open, it clears every row in
  // front of it plus the gap between them.
  const heightOf = (id: Id) => heights[id] ?? FALLBACK_HEIGHT
  const fanOffset = (index: number) =>
    -toasts.slice(0, index).reduce((y, toast) => y + heightOf(toast.id) + GAP, 0)
  const front = toasts[0]
  const stackHeight = expanded
    ? toasts.reduce((y, toast) => y + heightOf(toast.id), 0) + GAP * Math.max(toasts.length - 1, 0)
    : front === undefined
      ? 0
      : heightOf(front.id) + PEEK * (toasts.length - 1)

  return (
    // The region is sized to the deck itself — collapsed or fanned — so it
    // can own the pointer: hovering anywhere on the visible stack opens it,
    // and an empty stack covers nothing.
    <motion.ol
      aria-label={labels.region}
      aria-live="polite"
      initial={false}
      animate={{ height: stackHeight }}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
      className={cn('fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm', className)}
    >
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <ToastRow
            key={toast.id}
            toast={toast}
            delay={index * stagger}
            reduce={reduce}
            y={expanded ? fanOffset(index) : -index * PEEK}
            scale={expanded ? 1 : 1 - index * SCALE_STEP}
            zIndex={toasts.length - index}
            dismissLabel={labels.dismiss}
            onMeasure={measure}
            onDismiss={() => onDismiss(toast.id)}
            onAction={() => onAction(toast.id)}
          />
        ))}
      </AnimatePresence>
    </motion.ol>
  )
}

function ToastRow<Id extends string>({
  toast,
  delay,
  reduce,
  y,
  scale,
  zIndex,
  dismissLabel,
  onMeasure,
  onDismiss,
  onAction,
}: {
  toast: ToastItem<Id>
  delay: number
  reduce: boolean
  /** Deck position: distance from the anchor edge, in px. */
  y: number
  /** Deck depth: rows behind the front one shrink. */
  scale: number
  zIndex: number
  dismissLabel: string
  onMeasure: (id: Id, height: number) => void
  onDismiss: () => void
  onAction: () => void
}) {
  const { action } = toast

  // The row measures its own card: the deck's fan offsets are sums of every
  // row in front, and a title that wraps to a second line changes them all.
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const report = () => onMeasure(toast.id, card.offsetHeight)
    report()
    const observer = new ResizeObserver(report)
    observer.observe(card)
    return () => observer.disconnect()
  }, [toast.id, onMeasure])

  // Reduced motion keeps the fade — it is what says the toast is new — and
  // drops every transform on the row itself, the swipe included. The deck's
  // own positioning is layout, not motion, so it stays but lands instantly.
  const enter = reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96, filter: 'blur(8px)' }
  const settled = reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
  const leave = reduce
    ? { opacity: 0, transition: EXIT_TRANSITION }
    : { opacity: 0, x: 24, scale: 0.96, filter: 'blur(6px)', transition: EXIT_TRANSITION }

  return (
    // Entrance, exit and the swipe ride on the row; the deck's offset rides
    // on the wrapper inside it. Splitting them is what keeps the entrance
    // cascade's delay off the fan — without it, opening the deck would wait
    // out a delay meant for the first frame.
    <motion.li
      initial={enter}
      animate={{ ...settled, transition: { ...(reduce ? {} : SPRING_PANEL), delay } }}
      exit={leave}
      drag={reduce ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      // Resistance to the left, where there is nothing to dismiss toward; an
      // easy ride to the right, which is the way it leaves.
      dragElastic={{ left: 0.04, right: 0.6, top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
          onDismiss()
        }
      }}
      className="absolute inset-x-0 bottom-0"
      style={{ zIndex }}
    >
      <motion.div
        initial={false}
        animate={{ y, scale }}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        style={{ transformOrigin: 'bottom center' }}
      >
        {/* One step above the popover's elevation, because this layer is the
            only one that floats over content the reader did not summon. The
            surface stays translucent and blurred — the registry's finish —
            so the page it covers keeps it grounded in place rather than
            reading as a dialog that escaped its modal. */}
        <div
          ref={cardRef}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl"
        >
          <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
            {toast.icon}
          </span>

          {/* Balanced, not pretty: one or two lines, so evening the lines out
              beats protecting a last-line orphan. */}
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
    </motion.li>
  )
}
