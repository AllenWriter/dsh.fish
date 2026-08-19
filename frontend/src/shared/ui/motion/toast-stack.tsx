// Two beui components, joined. The card, its dismissal, the swipe and the
// spring exit come from beui.dev/components/motion/animated-toast-stack; the
// layered geometry — one grid cell, a per-depth rise, a per-depth shrink and a
// descending z-order — comes from beui.dev/components/blocks/notification-stack.
//
// Neither registry component does this on its own: the toast stack lays its
// toasts out as a list, and the notification stack is a summary that fans open
// on hover and collapses again, not a deck that is dealt down one card at a
// time. What is wanted here is the deck, so the geometry was lifted and the
// hover/expand machinery (four gesture hooks and a text-swap) was not.
//
// Import aliases are remapped onto this project's FSD shared layer, lucide
// glyphs onto `shared/ui/icon`, and the surfaces onto the semantic tokens.
// Three further reductions on beui's toast:
//
// 1. No status vocabulary. beui's toast carries neutral/info/loading/success/
//    error, each with its own hue. This product's palette is one accent and no
//    status hues (`docs/frontend/ui-patterns.md`), and nothing here reports
//    progress, so the status machinery is gone rather than left in as
//    unreachable options.
// 2. No timers. Every toast stays until it is dismissed. The caller owns the
//    list, so the registry's duration bookkeeping has no job.
// 3. The action is a link, not a button. Every action this product puts in a
//    toast navigates somewhere, and a real anchor is what gives it a middle
//    click, a context menu, and the right role.
//
// Physics come from `shared/lib/ease`, so this surface settles like every
// other panel in the app.

import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { EASE_OUT, SPRING_LAYOUT } from '@/shared/lib/ease'
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
  /**
   * The mark in the leading slot: a glyph in a tinted disc, or a portrait.
   * Sized by the caller to the 28px slot.
   */
  leading: ReactNode
  title: string
  action: ToastAction
}

export interface ToastStackProps<Id extends string = string> {
  /** Front of the deck first. Only the front card is readable. */
  toasts: readonly ToastItem<Id>[]
  /** The close control or a swipe. The toast should leave the deck. */
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
  /** Accessible name of the live region, and of the dismiss control. */
  labels: { region: string; dismiss: string }
  className?: string
}

/** How far each card behind the front one rises, in px. */
const PEEK = 12

/** How much narrower each card behind the front one is drawn. */
const SHRINK = 0.045

/**
 * How many cards are drawn at all.
 *
 * Past the third the slivers are a few pixels apart and read as one thick
 * edge, so a deeper card is carried in state and simply not painted.
 */
const DEPTH = 3

/** Rightward pointer travel, in px, that dismisses the front card on release. */
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

/**
 * Reduced motion: the deck is still layered — the offsets below are a
 * position, not an animation — but nothing travels between seats. Position
 * lands instantly and only opacity is given time, which is what says a card
 * is new without moving anything.
 */
const REDUCED_TRANSITION = { duration: 0, opacity: { duration: 0.2, ease: EASE_OUT } } as const

export function ToastStack<Id extends string>({
  toasts,
  onDismiss,
  onAction,
  labels,
  className,
}: ToastStackProps<Id>) {
  // Asked once here rather than once per card: the preference is a property of
  // the reader, not of a toast, and the stack is where the motion policy for
  // every card it holds belongs.
  const reduce = useReducedMotion() ?? false
  const painted = toasts.slice(0, DEPTH)

  return (
    <ol
      aria-label={labels.region}
      aria-live="polite"
      className={cn(
        // One grid cell holds every card, so the deck is exactly as tall as
        // the card at its front and the ones behind stretch to match. Anchored
        // to the corner the front card also exits toward, and transparent to
        // the pointer so an empty deck never covers the page under it.
        'pointer-events-none fixed bottom-4 right-4 z-50 grid w-[calc(100vw-2rem)] max-w-sm',
        className,
      )}
    >
      <AnimatePresence>
        {painted.map((toast, depth) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            depth={depth}
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

function ToastCard({
  toast,
  depth,
  reduce,
  dismissLabel,
  onDismiss,
  onAction,
}: {
  toast: ToastItem
  /** 0 is the front card; everything behind it is a blank sliver. */
  depth: number
  reduce: boolean
  dismissLabel: string
  onDismiss: () => void
  onAction: () => void
}) {
  const front = depth === 0

  // A card being dealt away keeps its copy — watching it leave is the point of
  // the exit — but it is no longer anyone's to act on. Without this there are
  // two dismiss controls and two links for as long as the exit runs, and both
  // a keyboard and a screen reader can reach the one that is leaving.
  const present = useIsPresent()
  const live = front && present
  const { action } = toast

  // Where this card sits in the deck. A card moves through these seats as the
  // ones in front of it are dealt away, and that is the whole animation:
  // nothing is repositioned, its depth simply changes.
  const seat = { y: -depth * PEEK, scale: 1 - depth * SHRINK }

  // Reduced motion starts each card already in its seat, so the deck is
  // layered from the first frame and only its opacity is animated.
  const enter = reduce
    ? { opacity: 0, ...seat }
    : { opacity: 0, y: 20, scale: 0.96, filter: 'blur(8px)' }
  const settled = reduce ? { opacity: 1, ...seat } : { opacity: 1, ...seat, filter: 'blur(0px)' }
  const leave = reduce
    ? { opacity: 0, transition: EXIT_TRANSITION }
    : { opacity: 0, x: 24, scale: 0.96, filter: 'blur(6px)', transition: EXIT_TRANSITION }

  return (
    <motion.li
      // Every card in the same cell, bottom edges together, so a card that
      // rises does it out of the top of the deck and the front one never moves.
      className={cn('col-start-1 row-start-1', live ? 'pointer-events-auto' : 'pointer-events-none')}
      style={{ zIndex: DEPTH - depth, transformOrigin: 'center bottom' }}
      // The cards behind carry no text, no controls and no name: the deck
      // shows one toast at a time, and a reader — with eyes or with a screen
      // reader — is offered exactly the one they can act on.
      aria-hidden={live ? undefined : true}
      inert={!live}
      initial={enter}
      animate={settled}
      exit={leave}
      // One spring for the arrival and for every seat a card is promoted
      // through afterwards. The glide between seats is the motion this
      // surface repeats, so it is the glide token that sets the character —
      // and a single transition is what keeps a card that is dismissed
      // mid-entrance from fighting two of them.
      transition={reduce ? REDUCED_TRANSITION : SPRING_LAYOUT}
      drag={live && !reduce ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      // Resistance to the left, where there is nothing to dismiss toward; an
      // easy ride to the right, which is the way it leaves.
      dragElastic={{ left: 0.04, right: 0.6, top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
          onDismiss()
        }
      }}
    >
      {/* One step above the popover's elevation, because this layer is the
          only one that floats over content the reader did not summon: on a
          page of cards, the popover's shadow leaves it reading as one more
          card. Opaque rather than translucent — a toast sits over arbitrary
          content and has to stay readable on it. */}
      <div className="flex h-full items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xl">
        {front ? (
          <>
            <span className="grid size-7 shrink-0 place-items-center">{toast.leading}</span>

            <p className="min-w-0 flex-1 text-pretty text-sm font-medium leading-5 text-foreground">
              {toast.title}
            </p>

            <a
              href={action.href}
              {...(action.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              onClick={onAction}
              className="press inline-flex h-8 shrink-0 items-center rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground"
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
          </>
        ) : null}
      </div>
    </motion.li>
  )
}
