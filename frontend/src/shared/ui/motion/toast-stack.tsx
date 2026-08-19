// beui.dev/components/motion/animated-toast-stack — vendored from the beui
// registry. Import aliases are remapped onto this project's FSD shared layer,
// lucide glyphs onto `shared/ui/icon`, and the surface onto the semantic
// tokens (`bg-card`, `border-border`, `text-muted-foreground`).
//
// Three deliberate reductions on top of the registry component:
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
//
// The motion keeps the registry's character — spring entrance, `layout`
// reflow when one leaves, exit toward the edge it can be swiped off — but the
// physics come from `shared/lib/ease`, so this surface settles like every
// other panel in the app.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
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
   * Every item is in the DOM from the first frame, so nothing reflows while
   * it plays.
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

  return (
    <ol
      aria-label={labels.region}
      aria-live="polite"
      className={cn(
        // Anchored to the corner the toasts also exit toward, and transparent
        // to the pointer so an empty stack never covers the page under it.
        'pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2',
        className,
      )}
    >
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <ToastRow
            key={toast.id}
            toast={toast}
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

function ToastRow({
  toast,
  delay,
  reduce,
  dismissLabel,
  onDismiss,
  onAction,
}: {
  toast: ToastItem
  delay: number
  reduce: boolean
  dismissLabel: string
  onDismiss: () => void
  onAction: () => void
}) {
  const { action } = toast

  // Reduced motion keeps the fade — it is what says the toast is new — and
  // drops every transform, the swipe included.
  const enter = reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96, filter: 'blur(8px)' }
  const settled = reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
  const leave = reduce
    ? { opacity: 0, transition: EXIT_TRANSITION }
    : { opacity: 0, x: 24, scale: 0.96, filter: 'blur(6px)', transition: EXIT_TRANSITION }

  return (
    <motion.li
      // Reflow when a sibling leaves is motion too, so it goes with the rest
      // of it: `layout` measures and animates position independently of the
      // variants below, and left on it would slide a row a reader asked to
      // keep still.
      layout={!reduce}
      initial={enter}
      // The cascade delay rides on the entrance alone. Left at the top level
      // it would be inherited by the reflow below, so dismissing the first
      // toast would leave the rest hanging before they closed the gap.
      animate={{ ...settled, transition: { ...SPRING_PANEL, delay } }}
      exit={leave}
      transition={{ layout: SPRING_LAYOUT }}
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
      className="pointer-events-auto"
    >
      {/* One step above the popover's elevation, because this layer is the
          only one that floats over content the reader did not summon: on a
          page of cards, the popover's shadow leaves it reading as one more
          card. Opaque rather than translucent — a toast sits over arbitrary
          content and has to stay readable on it. */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-xl">
        <span className="mt-px grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          {toast.icon}
        </span>

        <div className="min-w-0 flex-1">
          {/* Balanced, not pretty: these are one or two lines, so evening the
              lines out beats protecting a last-line orphan. */}
          <p className="text-balance text-sm font-medium leading-5 text-foreground">{toast.title}</p>
          <a
            href={action.href}
            {...(action.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            onClick={onAction}
            className="press mt-2 inline-flex h-8 items-center rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground"
          >
            {action.label}
          </a>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="press hit-area grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <CloseIcon className="size-3.5" weight="bold" />
        </button>
      </div>
    </motion.li>
  )
}
